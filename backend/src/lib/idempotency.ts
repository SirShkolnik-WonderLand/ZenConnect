import crypto from "crypto";

export function makeAppointmentKey(appointmentId: string | undefined, dateIso: string, email: string) {
  const raw = `${appointmentId ?? ""}|${dateIso}|${email.toLowerCase()}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
}

