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

export const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const SettingsUpdateBody = z.object({
  clinicName: z.string().min(1),
  reviewUrl: z.string().url(),
  referralRewardCopy: z.string().min(1),
  allowedEmailDomain: z.string().min(1),
});

// API Response types
export type ApiResponse<T = any> = 
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

export type UploadResult = {
  batchId: string;
  total: number;
  processed: number;
  sent: number;
  deferred: number;
  redeemed: number;
};

export type UnknownService = {
  id: string;
  name: string;
  createdAt: Date;
  pendingCount: number;
};

export type TaskWithDetails = {
  id: string;
  type: string;
  status: string;
  createdAt: Date;
  completedAt?: Date;
  referralCode?: {
    code: string;
    owner: {
      firstName?: string;
      lastName?: string;
      email: string;
    };
  };
  newPatient?: {
    firstName?: string;
    lastName?: string;
    email: string;
  };
};

export type AuditLogEntry = {
  id: string;
  createdAt: Date;
  action: string;
  payload: any;
  batchId?: string;
  actorId?: string;
};

