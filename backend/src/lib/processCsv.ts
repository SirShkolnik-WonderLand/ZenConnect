import { PrismaClient, ServiceClass, AppointmentStatus } from "@prisma/client";
import { CsvPayload, TCsvRow } from "./contracts";
import { makeAppointmentKey } from "./idempotency";
import { sendTemplateCampaign } from "./mailchimp";

const prisma = new PrismaClient();

export async function processCsv(payload: unknown, userId: string) {
  const parsed = CsvPayload.parse(payload);
  const batch = await prisma.uploadBatch.create({
    data: { filename: parsed.meta.filename, uploadedBy: userId }
  });

  const settings = await prisma.settings.findFirst();
  if (!settings) throw new Error("Settings missing");

  const results = { total: parsed.rows.length, processed: 0, sent: 0, deferred: 0, redeemed: 0 };

  for (const row of parsed.rows) {
    try {
      const ctx = await handleRow(row, batch.id, settings);
      results.processed++;
      results.sent += ctx.sent ? 1 : 0;
      results.deferred += ctx.deferred ? 1 : 0;
      results.redeemed += ctx.redeemed ? 1 : 0;
    } catch (e: any) {
      await prisma.auditLog.create({
        data: { batchId: batch.id, actorId: userId, action: "row_error", payload: { row, error: String(e?.message || e) } }
      });
    }
  }

  await prisma.auditLog.create({
    data: { batchId: batch.id, actorId: userId, action: "batch_summary", payload: results }
  });

  return { batchId: batch.id, ...results };
}

async function handleRow(row: TCsvRow, batchId: string, settings: { reviewUrl: string; referralRewardCopy: string; }) {
  const dateIso = new Date(row.appointmentDate).toISOString();
  const idem = makeAppointmentKey(row.appointmentId, dateIso, row.patientEmail);

  // Skip non-completed
  const status = normalizeStatus(row.appointmentStatus);
  if (status !== "COMPLETED") {
    await log(batchId, "skip_non_completed", { row });
    return { sent: false, deferred: true, redeemed: false };
  }

  // Patient
  const patient = await prisma.patient.upsert({
    where: { email: row.patientEmail.toLowerCase() },
    update: { firstName: row.patientFirstName ?? undefined, lastName: row.patientLastName ?? undefined },
    create: { email: row.patientEmail.toLowerCase(), firstName: row.patientFirstName, lastName: row.patientLastName }
  });

  // Service
  const service = await prisma.service.upsert({
    where: { name: row.serviceName },
    update: {},
    create: { name: row.serviceName, classification: "UNKNOWN" }
  });

  // Appointment (idempotent)
  const already = await prisma.appointment.findUnique({ where: { idempotencyKey: idem } });
  if (already) {
    await log(batchId, "duplicate_skip", { row });
    return { sent: false, deferred: true, redeemed: false };
  }

  const appt = await prisma.appointment.create({
    data: {
      externalId: row.appointmentId,
      patientId: patient.id,
      serviceId: service.id,
      batchId,
      date: new Date(dateIso),
      status: AppointmentStatus.COMPLETED,
      idempotencyKey: idem,
      processedAt: new Date()
    }
  });

  // Referral redemption check (if present)
  let redemptionResult = false;
  if (row.referralCodeUsed) {
    const code = await prisma.referralCode.findUnique({ where: { code: row.referralCodeUsed } });
    if (code && code.status === "ACTIVE") {
      await prisma.referralCode.update({
        where: { id: code.id },
        data: { status: "REDEEMED", redeemedAt: new Date(), redeemedById: patient.id }
      });
      await prisma.task.create({
        data: { type: "ISSUE_REWARD", status: "OPEN", referralCodeId: code.id, referrerId: code.ownerId, newPatientId: patient.id }
      });
      await log(batchId, "referral_redeemed", { code: code.code, referrerId: code.ownerId, newPatientId: patient.id });
      redemptionResult = true;
    }
  }

  // Classification branch
  if (service.classification === "UNKNOWN") {
    await log(batchId, "unknown_service_deferred", { serviceName: service.name });
    return { sent: false, deferred: true, redeemed: redemptionResult };
  }

  const mergeVars = {
    FNAME: patient.firstName ?? "",
    LNAME: patient.lastName ?? "",
    SERVICE_NAME: service.name,
    REVIEW_URL: settings.reviewUrl,
    REWARD_COPY: settings.referralRewardCopy
  };

  let campaignId: string | null = null;

  if (service.classification === "MEDICAL") {
    campaignId = await sendTemplateCampaign({
      templateId: process.env.MAILCHIMP_TEMPLATE_ID_MEDICAL!,
      subject: `Thanks for your visit — quick review?`,
      toEmail: patient.email,
      merge_vars: {
        FNAME: mergeVars.FNAME,
        SERVICE_NAME: mergeVars.SERVICE_NAME,
        REVIEW_URL: mergeVars.REVIEW_URL
      }
    });
  } else {
    // WELLNESS → ensure referral code exists
    let ref = await prisma.referralCode.findFirst({ where: { ownerId: patient.id, status: "ACTIVE" }});
    if (!ref) {
      ref = await prisma.referralCode.create({ data: { ownerId: patient.id, code: generateReferralCode(patient) }});
    }
    campaignId = await sendTemplateCampaign({
      templateId: process.env.MAILCHIMP_TEMPLATE_ID_WELLNESS!,
      subject: `Thank you — your referral code inside`,
      toEmail: patient.email,
      merge_vars: {
        FNAME: mergeVars.FNAME,
        SERVICE_NAME: mergeVars.SERVICE_NAME,
        REFERRAL_CODE: ref.code,
        REWARD_COPY: mergeVars.REWARD_COPY,
        REVIEW_URL: mergeVars.REVIEW_URL
      }
    });
  }

  await log(batchId, "email_sent", { appointmentId: appt.id, mailchimpCampaignId: campaignId, classification: service.classification });
  return { sent: true, deferred: false, redeemed: redemptionResult };
}

function normalizeStatus(s: string | undefined) {
  const v = (s || "").toLowerCase();
  if (v.includes("complete")) return "COMPLETED";
  if (v.includes("no")) return "NO_SHOW";
  if (v.includes("cancel")) return "CANCELLED";
  return "OTHER";
}

function generateReferralCode(patient: { firstName?: string | null; lastName?: string | null; id: string }) {
  const ln3 = (patient.lastName ?? "X").replace(/[^a-z]/gi, "").toUpperCase().slice(0,3).padEnd(3,"X");
  const rnd = Math.random().toString(36).toUpperCase().slice(2,6);
  const base = `ZX-${ln3}-${rnd}`;
  const check = luhn36(base);
  return `${base}-${check}`;
}

function luhn36(s: string) {
  const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const nums = s.replace(/[^0-9A-Z]/g, "").split("").map(ch => alphabet.indexOf(ch));
  let sum = 0, alt = false;
  for (let i = nums.length - 1; i >= 0; i--) {
    let n = nums[i];
    if (alt) { n *= 2; if (n > 35) n = Math.floor(n / 36) + (n % 36); }
    sum += n;
    alt = !alt;
  }
  return alphabet[sum % 36];
}

async function log(batchId: string, action: string, payload: any) {
  await prisma.auditLog.create({ data: { batchId, actorId: null, action, payload }});
}

