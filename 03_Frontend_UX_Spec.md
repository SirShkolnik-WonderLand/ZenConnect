Here’s **File 3 of 3**. Paste into your repo as:

`/docs/03_Frontend_UX_Spec.md`

---

# ZenConnect MVP — Frontend UX Spec (File 3 of 3)

**Goal:** A simple, fast **Admin Dashboard** that lets staff upload JaneApp CSVs, resolve unknown services, track referrals & rewards, and review immutable audit logs.

Framework assumptions from Files 1–2:

* Next.js 14 (App Router) + TypeScript.
* Component library: shadcn/ui (Button, Card, Input, Table, Dialog, Dropdown, Toast).
* Forms: React Hook Form + Zod resolver.
* Styling: utility classes (Tailwind or equivalent). Keep layout clean, high-contrast, accessible.

---

## 0) Global Layout & Navigation

```
/(app)
  ├─ (auth)/login
  └─ dashboard
      ├─ overview             (default)
      ├─ upload
      ├─ services/unknown
      ├─ referrals
      ├─ tasks
      ├─ audit
      └─ settings
```

### Sidebar (left)

* **Dashboard** (Overview)
* **Upload CSV**
* **Unknown Services**
* **Referrals** (sent & codes)
* **Tasks** (Issue Reward)
* **Audit Logs**
* **Settings** (Admin only)

Footer: “Last upload: <datetime> • Processed: N • Sent: N • Deferred: N”

### Top Bar (right)

* Health badge: DB / Mailchimp
* User menu: Email, Role, “Sign out”

Keyboard shortcuts (desktop):

* `U` = Upload CSV
* `S` = Unknown Services
* `R` = Referrals
* `T` = Tasks
* `A` = Audit Logs
* `?` = Help / keyboard cheatsheet dialog

Accessibility:

* All interactive elements reachable via Tab.
* Live region for toasts (`aria-live="polite"`).
* Buttons include `aria-label` when icon-only.

---

## 1) Auth

### `/login`

**Purpose:** Email/password login; redirects to `/dashboard/overview`.

* **Fields**: Email, Password
* **Validation**:

  * Email format required
  * Password min length (8)
* **Buttons**: “Sign in”
* **Errors**:

  * Invalid credentials → inline field error + toast “Couldn’t sign in. Check email and password.”
* **Security**:

  * On success, httpOnly session cookie set by server route.
* **Copy**:

  * Title: “ZenConnect Admin Login”
  * Subtitle: “Use your clinic-issued account.”

Empty/edge:

* Show “Forgot password? Contact your admin.” (no flow in MVP)

---

## 2) Dashboard / Overview

Route: `/dashboard/overview`

**Top cards (KPIs, 4-up)**

* **New Reviews Sent (7d)**
* **Wellness Emails Sent (7d)**
* **Medical Emails Sent (7d)**
* **Referral Redemptions (30d)**

**Batch summary (last upload)**

* Table with: File Name, Uploaded By, Uploaded At, Rows, Processed, Sent, Deferred, Redeemed
* Primary action: “View Audit” → `/dashboard/audit?batchId=...`

**Empty state (no data yet):**

* Illustration + copy: “Let’s get your first upload processed.”
* Button: “Upload CSV”

---

## 3) Upload CSV

Route: `/dashboard/upload`

**Panel: “Upload JaneApp Appointments CSV”**

* Drag & drop zone (accept `.csv`)
* File picker fallback
* Checkbox: “This CSV includes a ‘Referral Code Used’ column” (checked by default)
* Button: “Process CSV”

**After submit**

* Progress bar (client) while uploading
* On success:

  * Success toast:

    * Title: “Upload processed”
    * Body: “Processed X rows • Sent Y emails • Deferred Z unknown services • Redeemed R referrals.”
  * Inline summary card with same numbers and link “Review Audit”
  * If `deferred > 0`: inline callout: “There are unknown services to classify.” → button “Go to Unknown Services”
* On error:

  * Toast: “Upload failed: <reason>”
  * Inline error callout with hints:

    * “Ensure required columns: Patient Email, Service Name, Appointment Date, Status.”

**Mapping help (collapsible)**

* Shows acceptable header names and how they are normalized (exact mapping from File 2).

---

## 4) Unknown Services Queue

Route: `/dashboard/services/unknown`

**Purpose:** Blocker resolution. No emails are sent for UNKNOWN services until classified.

**Table:**

* Columns:

  * Service Name
  * First Seen (datetime)
  * Examples (count of pending appointments referencing it)
  * Action (Classify)
* Row actions:

  * **Classify** (button) → opens modal

**Modal: “Classify Service”**

* Radio:

  * ( ) Medical — *Sends review-only email (no incentive)*
  * ( ) Wellness — *Includes referral code and reward copy*
* Buttons: “Cancel”, **“Save classification”**
* On save:

  * Success toast: “Service classified as Medical/Wellness.”
  * Prompt (secondary dialog):

    * “Re-process appointments that were deferred because of this service?”

      * Buttons: “Re-process now” / “Not now”
    * If “Re-process now” → calls server to re-run for this service and shows a progress banner.
      On completion: toast “Re-processed N appointments • Sent M emails.”

**Bulk actions (optional, MVP-nice):**

* Checkboxes per row + “Bulk classify as Medical / Wellness”

**Empty state:**

* “No unknown services. You’re up to date!”

---

## 5) Referrals

Route: `/dashboard/referrals`

**Tabs:**

* **Sent Emails (last 30 days)**
* **Referral Codes (owners)**

### A) Sent Emails

* Filters:

  * Date range
  * Classification: All / Medical / Wellness
  * Search (patient email/name)
* Columns:

  * Sent At
  * Patient
  * Service
  * Classification
  * Mailchimp Campaign ID (link to MC)
  * Batch (link to Audit filtered)
* Empty: “No emails sent yet for this range.”

### B) Referral Codes

* Filters:

  * Status: All / Active / Redeemed / Void
  * Search (owner email)
* Columns:

  * Code
  * Owner (patient)
  * Status
  * Created
  * Redeemed At (if any)
  * Redeemed By (new patient)
* Row actions:

  * Copy code (icon button → toast “Copied”)
  * Void (admin only; confirm dialog: “Void this code? This action is permanent.”)
* Empty: “No referral codes yet. Codes are created automatically for Wellness emails.”

---

## 6) Tasks (Issue Reward)

Route: `/dashboard/tasks`

**Purpose:** Operational follow-up to deliver gift/reward once a referral is detected.

**Filters:**

* Status: Open / Completed
* Search: Referrer / New Patient email

**Table (Open)**:

* Columns:

  * Created At
  * Referrer (Owner of code)
  * New Patient (who used it)
  * Code
  * Action
* Row Action:

  * **Mark Complete** → confirm dialog:

    * “Confirm reward has been issued to \[Referrer]? This will complete the task.”
    * Buttons: “Cancel”, **“Mark Complete”**
  * On success: toast “Task completed.”

**Completed tab**

* Same columns + Completed At
* No actions

**Empty states**

* Open: “No pending reward tasks.”
* Completed: “No completed tasks in this range.”

---

## 7) Audit Logs

Route: `/dashboard/audit`

**Filters:**

* Date range
* Batch (select from last 10 uploads)
* Action type (dropdown populated from distinct actions, e.g., `row_error`, `email_sent`, `unknown_service_deferred`, `referral_redeemed`, `batch_summary`, `duplicate_skip`, `skip_non_completed`)
* Search (free text inside payload; server-side LIKE on JSONB text)

**Table:**

* Columns:

  * Time
  * Action
  * Batch
  * Payload (collapsed JSON preview)
  * Expand (button)

**Row expand:**

* Shows pretty-printed JSON payload
* “Copy JSON” button

**Empty state:**

* “No audit logs for current filters.”

---

## 8) Settings (Admin)

Route: `/dashboard/settings`

**Sections:**

1. **Clinic Details**

   * Clinic Name (read-only for MVP or editable)
   * Review URL (required)
   * Referral Reward Copy (e.g., “Give 15%, Get 15%”)
   * Save button

2. **Allowed Email Domain**

   * Domain (e.g., `clinic.com`)
   * Info: “Only staff with this domain can sign in.”
   * Save button

3. **Mailchimp**

   * From Name (text)
   * From Email (text)
   * Reply-To (text)
   * Template IDs (Medical, Wellness) (text/number)
   * Save button
   * “Send test emails” section:

     * Input: Test recipient email
     * Buttons: “Send Medical test”, “Send Wellness test”
     * Toasts on success/failure

4. **Danger Zone** (Admin)

   * Button: “Re-run last batch processing” (disabled if none)
   * Confirm dialog: “Re-run last batch? Idempotency prevents duplicates, but failed sends will retry.”

**Validation & feedback:**

* Save → “Settings updated” toast
* Inline errors next to fields

---

## 9) Component Contracts (props & events)

> Names are suggestions; adapt to your component library.

### `<UploadDropzone onSubmit(files: File[]) />`

* Accepts CSV only.
* Emits files; parent performs POST `/api/uploads`.

### `<CsvSummaryCard stats={{ total, processed, sent, deferred, redeemed }} onViewAudit={() => {}} />`

### `<UnknownServicesTable rows: Array<{id, name, firstSeen, pendingCount}> />`

* `onClassify(serviceId, "MEDICAL"|"WELLNESS")`
* `onBulkClassify(ids[], classification)`

### `<TasksTable rows: Array<{ id, createdAt, referrer, newPatient, code, status }>`

* `onComplete(taskId)`

### `<AuditTable rows: Array<{ id, createdAt, action, payload, batchId }>`

* `onExpand(logId)`
* Copy JSON action

### `<HealthBadge status={{ db: "ok"|"down", mailchimp: "ok"|"degraded"|"down" }} />`

### `<SettingsForm values {...} onSave(updated) onTestEmail(type, toEmail) />`

---

## 10) Toasts & Banners (exact copy)

* **Upload success:**

  * Title: “Upload processed”
  * Body: “Processed {{processed}} / {{total}} rows • Sent {{sent}} • Deferred {{deferred}} • Redeemed {{redeemed}}.”

* **Upload error:**

  * “Upload failed: {{reason}}”

* **Unknown service classified:**

  * “Service classified as {{classification}}.”

* **Re-process started:**

  * Banner: “Re-processing deferred appointments for {{service}}…”

* **Re-process done:**

  * “Re-processed {{count}} appointments • Sent {{sent}} emails.”

* **Task completed:**

  * “Task completed. Reward issued.”

* **Settings saved:**

  * “Settings updated.”

* **Health degraded:**

  * Banner (yellow): “Some services are degraded. Emails may be delayed.”

---

## 11) Empty States (copy)

* **Overview (no data):**
  “No uploads yet. Start by importing your first JaneApp CSV.”
  Button: “Upload CSV”

* **Unknown Services:**
  “All services are classified. Great job!”

* **Referrals (sent emails):**
  “No emails found for this period. Try another date range.”

* **Referral Codes:**
  “No referral codes yet. Codes are created for Wellness emails automatically.”

* **Tasks:**
  “No pending reward tasks.”

* **Audit:**
  “No audit logs match these filters.”

---

## 12) Error & Edge Cases

* **CSV missing required columns**

  * Inline alert listing missing columns
  * Link to “See required columns” (opens mapping help)

* **Duplicate upload**

  * Processed count includes rows but duplicate entries are reported via audit `duplicate_skip`; surface a small note:

    * “Some rows were duplicates and skipped.”

* **Mailchimp error**

  * Show toast: “Failed to send some emails. Check Audit Logs.”
  * In Overview, small red badge “Send failures in last batch” linking to filtered audit.

* **Unknown service flood**

  * If >10 unknown services in one batch, show callout to classify in bulk.

* **Auth session expired**

  * Global handler: redirect to `/login` with toast: “Session expired. Please sign in again.”

---

## 13) Forms & Validation (Zod + RHF)

* All forms submit disabled while pending.
* Server errors mapped to field-level where applicable; otherwise top-level alert.
* On success: optimistic UI where safe, followed by refetch.

---

## 14) Data Fetching Patterns

* Use **Server Components** for page-level data where possible (lists, initial filters).
* Mutations via **Server Actions** or API routes; revalidate via `revalidatePath('/dashboard/...')`.
* Paginate tables (page size 25) with server-side cursor pagination.

---

## 15) Performance

* Avoid client JS on static sections (Server Components).
* Tables: virtualized only if needed (not necessary for MVP scale).
* Debounce search inputs (300ms).

---

## 16) Security & Privacy (UI)

* Never render raw PHI beyond: first name, last name, email, service name, appointment date.
* Mask emails in lists by default on shared screens if you present in demo (toggle to reveal).
* “Copy JSON” in Audit removes secrets if any appear (server already redacts).

---

## 17) Internationalization (future-ready)

* Keep all string copy centralized in `/app/i18n/en.ts`.
* MVP ships English only.

---

## 18) Acceptance Criteria (Frontend)

* **Upload CSV** flow completes with clear success/failure feedback and links to follow-up.
* **Unknown Services** page allows single and (optional) bulk classification with re-process prompt.
* **Referrals** and **Referral Codes** lists are filterable and searchable.
* **Tasks** page supports marking rewards complete with confirmation.
* **Audit Logs** are filterable, expandable, and copyable.
* **Settings** saves and test emails send with clear feedback.
* Health badge reflects `/api/healthz` state.

---

## 19) Microcopy (ready-to-use)

* Buttons:

  * Upload CSV / Process CSV / Classify / Save classification / Re-process now / Mark Complete / Save Settings
* Labels:

  * “Referral Code Used (on new patient booking)”
* Help text:

  * “Only Completed appointments are eligible for follow-up messages.”
  * “Medical services send review-only emails (no incentives).”
  * “Wellness services include a referral code and reward details.”
* Warnings:

  * “Unknown services are deferred until classified.”

---

## 20) QA Checklist (UI)

* [ ] Can’t click “Process CSV” with no file selected.
* [ ] Uploading the same CSV twice does not duplicate emails (idempotency proven via audit).
* [ ] Classifying a service immediately removes it from “Unknown” table.
* [ ] “Re-process now” after classification sends emails for previously deferred items.
* [ ] Tasks can be completed and move to Completed tab.
* [ ] Audit filters work together (date+batch+action+search).
* [ ] Settings changes persist and affect next uploads.
* [ ] Health badge shows “down” state if Mailchimp fails `/ping`.
* [ ] All modals are Esc/Enter accessible and trap focus.

---

## 21) Visual Notes

* Palette for MVP: clinic-friendly, clean blues/grays, high contrast.
* Tables with fixed header + sticky actions on narrow screens.
* Responsive:

  * Mobile: cards > stacked tables; actions in kebab menu.
  * Desktop: full table view.
