Here’s **File 2 of 3**. Paste into your repo as:

`/docs/02_Data_and_API_Spec.md`

---

# ZenConnect MVP — Data & API Spec (File 2 of 3)

This file gives you the **Prisma schema**, **DB indexes**, **Zod contracts**, **API routes** (request/response), the **processing pipeline**, and a **Mailchimp client** you can drop in.

---

## 0) Conventions

* **Stack**: Next.js 14 (App Router) with TypeScript, Prisma/PostgreSQL.
* **Validation**: `zod`.
* **Error shape**: `{ ok: false, error: { code: string, message: string } }`.
* **Success shape**: `{ ok: true, data: ... }`.
* **Dates**: store UTC in DB.
* **Idempotency**: SHA-256 over `appointmentId|appointmentDate|patientEmail`.

---

## 1) Prisma Schema (`apps/web/prisma/schema.prisma`)

```prisma
// generator & datasource
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  ADMIN
  STAFF
}

enum ServiceClass {
  MEDICAL
  WELLNESS
  UNKNOWN
}

enum AppointmentStatus {
  COMPLETED
  NO_SHOW
  CANCELLED
  OTHER
}

enum ReferralStatus {
  ACTIVE
  REDEEMED
  VOID
}

enum TaskStatus {
  OPEN
  COMPLETED
}

enum TaskType {
  ISSUE_REWARD
}

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  passwordHash  String
  role          Role     @default(STAFF)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model Settings {
  id                 String   @id @default(cuid())
  clinicName         String
  reviewUrl          String
  referralRewardCopy String
  allowedEmailDomain String
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}

model Patient {
  id         String   @id @default(cuid())
  email      String   @unique
  firstName  String?
  lastName   String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  appointments   Appointment[]
  referralCodes  ReferralCode[]
}

model Service {
  id           String       @id @default(cuid())
  name         String       @unique
  classification ServiceClass @default(UNKNOWN)
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt

  appointments Appointment[]
}

model UploadBatch {
  id         String   @id @default(cuid())
  filename   String
  uploadedBy String   // User.id
  uploadedAt DateTime @default(now())

  appointments Appointment[]
  auditLogs    AuditLog[]
}

model Appointment {
  id              String            @id @default(cuid())
  externalId      String?
  patient         Patient           @relation(fields: [patientId], references: [id])
  patientId       String
  service         Service           @relation(fields: [serviceId], references: [id])
  serviceId       String
  batch           UploadBatch       @relation(fields: [batchId], references: [id])
  batchId         String
  date            DateTime
  status          AppointmentStatus
  idempotencyKey  String
  processedAt     DateTime?
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  @@index([patientId])
  @@index([serviceId])
  @@index([batchId])
  @@unique([idempotencyKey])
}

model ReferralCode {
  id          String         @id @default(cuid())
  code        String         @unique
  owner       Patient        @relation(fields: [ownerId], references: [id])
  ownerId     String
  status      ReferralStatus @default(ACTIVE)
  createdAt   DateTime       @default(now())
  redeemedAt  DateTime?
  // optional: who used it
  redeemedBy  Patient?       @relation("RedeemedBy", fields: [redeemedById], references: [id])
  redeemedById String?
}

model Task {
  id           String     @id @default(cuid())
  type         TaskType
  status       TaskStatus @default(OPEN)
  // reward context
  referralCode ReferralCode? @relation(fields: [referralCodeId], references: [id])
  referralCodeId String?
  referrerId   String? // Patient.id
  newPatientId String? // Patient.id
  createdAt    DateTime  @default(now())
  completedAt  DateTime?
}

model AuditLog {
  id        String   @id @default(cuid())
  batch     UploadBatch? @relation(fields: [batchId], references: [id])
  batchId   String?
  actorId   String?  // User.id or 'system'
  action    String
  payload   Json
  createdAt DateTime @default(now())

  @@index([batchId])
  @@index([createdAt])
}
```

**Notes**

* `UploadBatch` lets you trace which CSV produced which actions.
* `AuditLog.payload` keeps full JSON context; **never** store secrets.
* `Appointment.idempotencyKey` enforces one-time processing.

---

## 2) Seed Script (essentials) — `apps/web/scripts/seed.ts`

* Create initial `Settings`.
* Create admin user.
* Insert base services with classification (from File 1).

*(Omitted here for brevity—you already have the lists; implement with Prisma `upsert`.)*

---

## 3) Zod Schemas (shared contracts) — `apps/web/lib/contracts.ts`

```ts
import { z } from "zod";

export const UploadCsvMeta = z.object({
  filename: z.string().min(1),
});

export const CsvRow = z.object({
  appointmentId: z.string().optional(),    // may be missing
  patientFirstName: z.string().optional(),
  patientLastName: z.string().optional(),
  patientEmail: z.string().email(),
  serviceName: z.string().min(1),
  appointmentDate: z.coerce.date(),        // parseable to Date
  appointmentStatus: z.enum(["Completed", "No-Show", "Cancelled", "Other"]).default("Other"),
  referralCodeUsed: z.string().optional(),
});

export const CsvPayload = z.object({
  meta: UploadCsvMeta,
  rows: z.array(CsvRow).min(1),
});

export type TCsvPayload = z.infer<typeof CsvPayload>;
export type TCsvRow = z.infer<typeof CsvRow>;

export const ClassifyServiceBody = z.object({
  serviceId: z.string().min(1),
  classification: z.enum(["MEDICAL", "WELLNESS"]),
});

export const CompleteTaskBody = z.object({
  taskId: z.string().min(1),
});
```

---

## 4) Utility: Idempotency Key — `apps/web/lib/idempotency.ts`

```ts
import crypto from "crypto";
export function makeAppointmentKey(appointmentId: string | undefined, dateIso: string, email: string) {
  const raw = `${appointmentId ?? ""}|${dateIso}|${email.toLowerCase()}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
}
```

---

## 5) Mailchimp Client — `apps/web/lib/mailchimp.ts`

```ts
import type { Response } from "node-fetch";

const API_KEY = process.env.MAILCHIMP_API_KEY!;
const PREFIX  = process.env.MAILCHIMP_SERVER_PREFIX!;
const LIST_ID = process.env.MAILCHIMP_LIST_ID!;
const FROM_NAME = process.env.MAILCHIMP_FROM_NAME!;
const REPLY_TO = process.env.MAILCHIMP_REPLY_TO!;
const FROM_EMAIL = process.env.MAILCHIMP_FROM_EMAIL!;
const TPL_WELL = process.env.MAILCHIMP_TEMPLATE_ID_WELLNESS!;
const TPL_MED  = process.env.MAILCHIMP_TEMPLATE_ID_MEDICAL!;

const BASE = `https://${PREFIX}.api.mailchimp.com/3.0`;

async function mcFetch(path: string, init: RequestInit) : Promise<Response> {
  const headers = {
    Authorization: `Basic ${Buffer.from(`anystring:${API_KEY}`).toString("base64")}`,
    "Content-Type": "application/json",
  };
  return fetch(`${BASE}${path}`, { ...init, headers: { ...headers, ...(init.headers || {}) }});
}

export async function upsertContact(email: string, merge_fields: Record<string,string>) {
  const subscriberHash = cryptoSubHash(email);
  const res = await mcFetch(`/lists/${LIST_ID}/members/${subscriberHash}`, {
    method: "PUT",
    body: JSON.stringify({
      email_address: email,
      status_if_new: "subscribed",
      merge_fields
    })
  });
  if (!res.ok) throw new Error(`Mailchimp upsert failed: ${res.status} ${await res.text()}`);
}

export async function sendTemplateCampaign(opts: {
  templateId: number | string,
  subject: string,
  toEmail: string,
  merge_vars: Record<string,string>
}) {
  // create campaign
  const createRes = await mcFetch("/campaigns", {
    method: "POST",
    body: JSON.stringify({
      type: "regular",
      recipients: { list_id: LIST_ID, segment_opts: { match: "any", conditions: [] }},
      settings: {
        subject_line: opts.subject,
        title: `zc_${Date.now()}`,
        from_name: FROM_NAME,
        reply_to: REPLY_TO,
        to_name: "*|FNAME|*",
        from_email: FROM_EMAIL
      }
    })
  });
  if (!createRes.ok) throw new Error(`create campaign failed: ${createRes.status} ${await createRes.text()}`);
  const campaign = await createRes.json();

  // set content from template + merge vars
  const contentRes = await mcFetch(`/campaigns/${campaign.id}/content`, {
    method: "PUT",
    body: JSON.stringify({ template: { id: Number(opts.templateId), sections: {} } })
  });
  if (!contentRes.ok) throw new Error(`set content failed: ${contentRes.status} ${await contentRes.text()}`);

  // ensure recipient exists with merge vars
  await upsertContact(opts.toEmail, opts.merge_vars);

  // send
  const sendRes = await mcFetch(`/campaigns/${campaign.id}/actions/send`, { method: "POST" });
  if (!sendRes.ok) throw new Error(`send failed: ${sendRes.status} ${await sendRes.text()}`);

  return campaign.id as string;
}

function cryptoSubHash(email: string): string {
  const crypto = require("crypto");
  return crypto.createHash("md5").update(email.toLowerCase()).digest("hex");
}
```

---

## 6) Processing Pipeline (server utility) — `apps/web/lib/processCsv.ts`

```ts
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
    }
  }

  // Classification branch
  if (service.classification === "UNKNOWN") {
    await log(batchId, "unknown_service_deferred", { serviceName: service.name });
    return { sent: false, deferred: true, redeemed: false };
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
  return { sent: true, deferred: false, redeemed: false };
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
```

---

## 7) API Routes (App Router)

> If you’re using `app/api/*/route.ts`, each route returns JSON.

### 7.1 Auth

* `POST /api/auth/login`

  * **Body**: `{ email: string, password: string }`
  * **200**: `{ ok: true }` (sets httpOnly session cookie)
  * **401**: `{ ok:false, error:{ code:"INVALID_CREDENTIALS", message:"..." } }`

* `POST /api/auth/logout`

  * Clears the session cookie.

*(Implementation detail depends on your auth choice; use bcrypt + iron-session or NextAuth credentials provider.)*

---

### 7.2 Upload CSV

* `POST /api/uploads`

  * **Auth**: STAFF+
  * **Body**: `FormData` with `file`
  * **Flow**:

    1. Parse CSV file → map to `CsvPayload` (server constructs `meta.filename`, `rows`).
    2. Call `processCsv(payload, userId)`.
  * **200**: `{ ok:true, data: { batchId, total, processed, sent, deferred, redeemed } }`
  * **400**: `{ ok:false, error:{ code:"CSV_INVALID", message } }`

**CSV Parser mapping (example headers to fields)**

| Incoming Column    | Mapped Field      |
| ------------------ | ----------------- |
| Appointment ID     | appointmentId     |
| Patient First Name | patientFirstName  |
| Patient Last Name  | patientLastName   |
| Patient Email      | patientEmail      |
| Service            | serviceName       |
| Start Time         | appointmentDate   |
| Status             | appointmentStatus |
| Referral Code Used | referralCodeUsed  |

> Implement a header-normalizer that accepts minor variations.

---

### 7.3 Services (Unknown → classify)

* `GET /api/services/unknown`

  * **Auth**: STAFF+
  * **200**: `{ ok:true, data: Array<{ id, name, createdAt }> }`

* `POST /api/services/classify`

  * **Auth**: ADMIN
  * **Body**: `ClassifyServiceBody`
  * **200**: `{ ok:true }` and audit log `{ action:"service_classified" }`.

---

### 7.4 Tasks

* `GET /api/tasks?status=OPEN|COMPLETED`

  * **Auth**: STAFF+
  * **200**: `{ ok:true, data: Array<{ id, type, createdAt, referralCode, referrer, newPatient }> }`

* `POST /api/tasks/complete`

  * **Auth**: STAFF+
  * **Body**: `CompleteTaskBody`
  * **200**: `{ ok:true }` (sets `completedAt` and `status=COMPLETED`, audit)

---

### 7.5 Audit Logs

* `GET /api/audit?batchId=&from=&to=&action=`

  * **Auth**: ADMIN
  * **200**: `{ ok:true, data: Array<{ id, createdAt, action, payload }> }`

---

### 7.6 Health

* `GET /api/healthz`

  * **200**: `{ ok:true, data:{ db:"ok", mailchimp:"ok" } }`
  * Catch errors & return degraded states.

---

## 8) Example Controller: `/app/api/uploads/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { processCsv } from "@/app/lib/processCsv";
import { getSessionUser } from "@/app/lib/auth";
import { parseJaneCsv } from "@/app/lib/parseJaneCsv";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ ok:false, error:{ code:"UNAUTH", message:"Login required" }}, { status: 401 });

    const fd = await req.formData();
    const file = fd.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ ok:false, error:{ code:"NO_FILE", message:"CSV file required" }}, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { meta, rows } = await parseJaneCsv(buffer, file.name);

    const result = await processCsv({ meta, rows }, user.id);
    return NextResponse.json({ ok:true, data: result });
  } catch (e: any) {
    return NextResponse.json({ ok:false, error:{ code:"UPLOAD_FAIL", message: String(e?.message || e) }}, { status: 400 });
  }
}
```

---

## 9) CSV Parser — `apps/web/lib/parseJaneCsv.ts`

```ts
import { CsvPayload, CsvRow } from "./contracts";
import { parse } from "csv-parse/sync";

const mapHeader = (h: string) => h.trim().toLowerCase()
  .replace(/\s+/g, " ")
  .replace(/[^a-z0-9 ]/g, "")
  .replace(/ +/g, "_");

export async function parseJaneCsv(buf: Buffer, filename: string): Promise<CsvPayload> {
  const recs = parse(buf.toString("utf8"), { columns: true, skip_empty_lines: true }) as Record<string,string>[];
  const rows: any[] = [];

  for (const rec of recs) {
    const norm: Record<string, string> = {};
    for (const k of Object.keys(rec)) norm[mapHeader(k)] = rec[k];

    const row: CsvRow = {
      appointmentId: norm["appointment_id"] || norm["id"] || undefined,
      patientFirstName: norm["patient_first_name"] || norm["first_name"] || undefined,
      patientLastName: norm["patient_last_name"] || norm["last_name"] || undefined,
      patientEmail: norm["patient_email"] || norm["email"],
      serviceName: norm["service"] || norm["service_name"],
      appointmentDate: norm["start_time"] || norm["appointment_date"] || norm["date"],
      appointmentStatus: (norm["status"] || "Other") as any,
      referralCodeUsed: norm["referral_code_used"] || norm["referral_code"]
    };

    rows.push(row);
  }

  return {
    meta: { filename },
    rows
  } as any;
}
```

---

## 10) RBAC Helpers — `apps/web/lib/rbac.ts`

```ts
import { Role } from "@prisma/client";

export function canClassify(role: Role) { return role === "ADMIN"; }
export function canUpload(role: Role) { return role === "ADMIN" || role === "STAFF"; }
export function canViewAudit(role: Role) { return role === "ADMIN"; }
```

---

## 11) Testing Targets (names you can create)

* `__tests__/csv.spec.ts`
* `__tests__/idempotency.spec.ts`
* `__tests__/classification.spec.ts`
* `__tests__/mailchimp.spec.ts`
* `__tests__/referral-code.spec.ts`
* `__tests__/audit.spec.ts`

> Mock `mailchimp.ts` in tests. Use an ephemeral SQLite DB with Prisma or a test Postgres.

---

## 12) Data Lifecycle

1. **Upload** → creates `UploadBatch`.
2. **Row processing** → upserts `Patient`, `Service`; creates `Appointment` (unique on idempotency).
3. **Unknown service** → audit + wait for admin classification.
4. **Mailchimp send** → audit with `mailchimpCampaignId`.
5. **Next uploads** detect `Referral Code Used` → update `ReferralCode`, create `Task`, audit.
6. **Staff completes task** → marks `Task.COMPLETED`, audit.

---

## 13) Failure Modes & Handling

* **CSV with missing columns** → `CSV_INVALID`. Don’t create appointments.
* **Mailchimp outage** → throw & audit `email_send_failed`; appointment stays processed but **no email**?

  * Option: store a `pendingEmail` table; for MVP, just log failure and show a banner “Some sends failed.”
* **Duplicate rows** → skipped by idempotency.
* **Service renamed in CSV** → will create a new `Service` (UNKNOWN) → admin must classify.

---

## 14) Observability

* `audit_logs` queried by batch/time/action.
* `healthz` pings DB and does a lightweight Mailchimp `/ping`.

---

This completes the **data and API spec** with concrete code stubs.
When you’re ready, say **“File 3”** and I’ll deliver the complete **Frontend UX Spec** (screens, components, table columns, states, and UX flows) so Brian can see it click by click.
