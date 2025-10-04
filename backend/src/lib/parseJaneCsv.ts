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

    const row = {
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

  return CsvPayload.parse({
    meta: { filename },
    rows
  });
}

