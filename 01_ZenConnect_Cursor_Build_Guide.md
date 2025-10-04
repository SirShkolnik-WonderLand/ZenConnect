Here’s **File 1 of 3** — a complete Cursor-ready build guide that sets the mission, architecture, security rules, env config, CSV specs, data contracts, and step-by-step tasks. Paste this into your repo as:

`/docs/01_ZenConnect_Cursor_Build_Guide.md`

---

# ZenConnect MVP — Cursor Build Guide (File 1 of 3)

**Goal:** Build a **CSV → Python/Node engine → Mailchimp** referral automation for a clinic using JaneApp exports.
**Phase:** MVP (Referrals + Reviews) with **immutable audit logs** and a **simple Admin Dashboard**.

---

## 0) Non-negotiables (Cursor Rules)

1. **Do not invent data.** Always read from the DB or the uploaded CSV.
2. **Deterministic behavior:** For the same CSV, the engine must be idempotent (no duplicate sends).
3. **Compliance:**

   * Medical vs Wellness: **Only Wellness** flow includes referral incentive.
   * Medical flow = review only, **no rewards**.
   * Treat birthdays and appointment notes as **sensitive**; never write them into outbound payloads.
4. **Audit or it didn’t happen:** Every action (upload, parse, classify, trigger, error) must write to `audit_logs`.
5. **Fail safe:** If a service name is unknown, **do not send**; flag for manual classification.
6. **Secrets:** All credentials come from environment variables. No keys in code.
7. **Testing-first:** Implement unit tests for: CSV validation, deduping, service classification, code generation, Mailchimp payload, idempotent sends.

---

## 1) What we’re building (Scope)

* **Admin Dashboard** (web):

  * Login (email + password; session cookie/JWT).
  * CSV Upload (JaneApp “Appointments” export).
  * “Unknown Services” queue to classify Medical/Wellness.
  * Referral Tasks (issue reward after redemption).
  * Audit Log viewer (searchable).
  * Simple Settings (allowed domains, clinic name, review URL, reward text).
* **Processing Engine** (backend):

  * Validates + parses CSV.
  * Deduplicates appointments already processed.
  * Classifies service (Medical vs Wellness) with human override memory.
  * Generates **unique referral code** for eligible Wellness clients.
  * Sends the right **Mailchimp** template with merge fields.
  * Writes **immutable audit logs**.
* **Referral Redemption Checker** (on next CSV uploads):

  * Detects “Referral Code Used” on new clients.
  * Marks code as redeemed; creates **Task**: “Issue Reward for \[Referrer]”.

---

## 2) High-level Architecture (text diagram)

```
[JaneApp Admin] --exports--> [CSV]
       |
       v (upload)
[Admin Dashboard] ---POST---> [/api/uploads]
                               |
                               v
                        [Processing Engine]
                      (parse -> classify -> idempotency -> code -> mailchimp -> audit)
                               |
                               +--> [PostgreSQL: patients, services, appointments, referral_codes, audit_logs, tasks]
                               |
                               +--> [Mailchimp: campaigns/templates]
```

* **Tech stack**:

  * Frontend: Next.js 14 (App Router, React Server Components), TypeScript.
  * Backend: Next.js API routes (Node/TS) + lightweight Python service for parsing/classification if you prefer (optional; can be pure TS if faster).
  * DB: PostgreSQL + Prisma ORM.
  * Auth: NextAuth or simple email/pass with bcrypt + session cookies.
  * Queue (MVP): in-process job runner (BullMQ optional later).
  * Deployment: Vercel (web) + Render/Neon for Postgres (or Supabase).
  * Email: Mailchimp API 3.0.

---

## 3) Repository Structure

```
zenconnect/
├─ apps/web/                # Next.js 14 app (frontend + API routes)
│  ├─ app/
│  │  ├─ (auth)/login/
│  │  ├─ dashboard/
│  │  │  ├─ upload/
│  │  │  ├─ services/unknown/
│  │  │  ├─ referrals/
│  │  │  ├─ tasks/
│  │  │  └─ audit/
│  │  └─ settings/
│  ├─ components/
│  ├─ lib/                   # validators, csv utils, mailchimp client, auth helpers
│  ├─ pages/api/             # if using pages; else /app/api/ (App Router)
│  ├─ prisma/
│  │  └─ schema.prisma
│  ├─ scripts/
│  │  ├─ seed.ts
│  │  └─ migrate.sh
│  └─ package.json
├─ packages/shared/          # (optional) shared types & utilities
├─ infra/                    # IaC or deployment notes (optional)
└─ docs/
   ├─ 01_ZenConnect_Cursor_Build_Guide.md   # (this file)
   ├─ 02_Data_and_API_Spec.md               # (File 2)
   └─ 03_Frontend_UX_Spec.md                # (File 3)
```

> We’ll keep everything in **TypeScript** for speed. If we decide to use a tiny Python parser/worker, add `apps/worker-python/` later (not required for MVP).

---

## 4) Environment Variables (exact names)

Create `.env.local` (local) and corresponding secrets in your host:

```
# Database
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/zenconnect?schema=public"

# Auth
AUTH_SECRET="random-long-string"
SESSION_COOKIE_NAME="zenconnect_session"

# App
APP_BASE_URL="http://localhost:3000"

# Mailchimp
MAILCHIMP_API_KEY="mc-usX-XXXXXXXXXXXXXXXXXXXXXXXX"
MAILCHIMP_SERVER_PREFIX="usX"            # from key suffix
MAILCHIMP_LIST_ID="xxxxxxxxxx"           # audience/list ID
MAILCHIMP_TEMPLATE_ID_WELLNESS="999999"  # numeric template id
MAILCHIMP_TEMPLATE_ID_MEDICAL="888888"   # numeric template id
MAILCHIMP_FROM_NAME="Lite Mind Body Clinic"
MAILCHIMP_FROM_EMAIL="no-reply@clinic.com"
MAILCHIMP_REPLY_TO="info@clinic.com"

# Business Config
CLINIC_REVIEW_URL="https://g.page/r/XXXX/review"
REFERRAL_REWARD_COPY="Give 15%, Get 15% on your next visit"
ALLOWED_EMAIL_DOMAIN="clinic.com"        # for staff logins
```

---

## 5) CSV Contract (exact)

**Expected columns** in JaneApp export (confirm once in UI, we will map flexibly):

* `AppointmentID` (string|number)
* `Patient First Name`
* `Patient Last Name`
* `Patient Email`
* `Service Name`
* `Appointment Date` (ISO or “YYYY-MM-DD HH\:mm”)
* `Appointment Status` (`Completed`, `No-Show`, etc.)
* `Referral Code Used` (optional; captured on intake for new patients)

**Validation rules:**

* Required: email, service, date, status.
* Only **Completed** appointments are eligible for outbound emails.
* If `Referral Code Used` exists and matches a known, unredeemed code → mark redeemed + create reward Task.

**Idempotency key:** `hash(appointmentId + appointmentDate + patientEmail)`

---

## 6) Medical vs Wellness (seed classification)

Seed a base list; allow admin overrides which persist in DB.

**Medical (NO incentive):**
`chiropractic care, naturopathic medicine, psychotherapy, acupuncture, massage, fertility`

**Wellness (incentive OK):**
`reiki, sound healing, spa rituals, energy healing, nutrition, astrology, education, vip concierge`

> Unknown → goes to **Unknown Services** queue. No send until admin classifies.

---

## 7) Referral Code Strategy (deterministic & unique)

* Format: `ZX-<first3LastNameUpper>-<randomBase36-4>-<check>`

  * Example: `ZX-DOE-7F9K-A`
* `check` = Luhn-mod36 over the string before it (single char).
* Store: code, status (`ACTIVE|REDEEMED|VOID`), owner patient\_id, created\_at, redeemed\_at.

---

## 8) Mailchimp Setup (one-time)

1. Create **Audience/List** for clinic patients (store FNAME, LNAME, EMAIL).
2. Create 2 **templates**:

   * **Wellness\_Template** (ID → `MAILCHIMP_TEMPLATE_ID_WELLNESS`)

     * Contains: review CTA + **referral block**
     * Merge vars: `*|FNAME|*`, `*|SERVICE_NAME|*`, `*|REFERRAL_CODE|*`, `*|REWARD_COPY|*`, `*|REVIEW_URL|*`
   * **Medical\_Template** (ID → `MAILCHIMP_TEMPLATE_ID_MEDICAL`)

     * Contains: review CTA only (no referral)
     * Merge vars: `*|FNAME|*`, `*|SERVICE_NAME|*`, `*|REVIEW_URL|*`
3. In code: upsert contact to audience, then send a campaign using the template + merge fields.

---

## 9) Database (Prisma overview)

> Full schema appears in **File 2**; here’s the shape you’ll implement.

* `User` (admin staff)
* `Patient` (unique by email)
* `Service` (name, classification: `MEDICAL|WELLNESS|UNKNOWN`)
* `Appointment` (external\_id, patient\_id, service\_id, date, status, idempotency\_key, processed\_at)
* `ReferralCode` (code, patient\_id, status, redeemed\_at)
* `Task` (type: `ISSUE_REWARD`, refs to referralCode & newPatient)
* `AuditLog` (timestamp, actor, action, payload JSONB, immutable)

> Add DB unique indexes on email, idempotency\_key, code.

---

## 10) Core Flows (must implement)

### A) Upload CSV

1. **Auth check** (staff only).
2. Parse CSV → validate columns → normalize.
3. For each row with **Completed** status:

   * Upsert `Patient` by email.
   * Upsert `Service` by name (if new → UNKNOWN).
   * Create `Appointment` if not exists (by idempotency\_key).
   * If service UNKNOWN → write `audit_log`, push to Unknown queue, **skip send**.
   * Else classify:

     * If **MEDICAL** → send **Medical** template (review only).
     * If **WELLNESS** → ensure referral code exists & **ACTIVE**, then send **Wellness** template.
   * Write **audit\_logs** for each step (including Mailchimp response id).
4. If `Referral Code Used` present & valid → mark **REDEEMED**, create **ISSUE\_REWARD** task, audit.

### B) Classify Unknown Services

* Admin picks `MEDICAL` or `WELLNESS`.
* Reprocess impacted appointments (offer “Re-run last upload” button).
* Audit every change with `actor=user_id`.

### C) Tasks (Reward issuance)

* Show table: Referrer, New Patient, Code, Created At, Redeemed At, **Action: Mark Complete**.
* On completion → set `Task.status=COMPLETED`, audit.

### D) Audit Log Viewer

* Filter by date range, type, patient email, action, CSV upload id.
* Display JSON payload collapsed; click-to-expand.

---

## 11) Security & Privacy

* **PII/PHI**: Store **only** what’s required: patient name, email, service name, appointment time, statuses, referral codes.
* **No birthdates in outbound mail**; keep birthdays in DB if present but never export or display in Mailchimp payload.
* **RBAC (MVP)**: `ADMIN` & `STAFF` (both can upload; only `ADMIN` can change service classifications).
* **Transport**: HTTPS only; secure cookies; CSRF on form posts.
* **Logging**: No secrets in logs; redact emails in external error trackers.

---

## 12) Local Setup (exact commands)

```bash
# 1) Clone & install
pnpm i   # or npm i

# 2) Prisma
pnpm prisma generate
pnpm prisma migrate dev --name init
pnpm ts-node apps/web/scripts/seed.ts   # seeds services + admin user

# 3) Run dev
pnpm dev   # starts Next.js on 3000

# 4) Login
# use the seeded admin: admin@clinic.com / ChangeMe! (then force password change)
```

> `seed.ts` must:
>
> * create default admin,
> * insert service list with MEDICAL/WELLNESS defaults,
> * insert Settings row with `CLINIC_REVIEW_URL` + `REFERRAL_REWARD_COPY`.

---

## 13) Testing Matrix (must add)

* `csv.spec.ts`: validates header mapping, required cols, mixed date formats.
* `idempotency.spec.ts`: double upload same CSV → 0 additional sends.
* `classification.spec.ts`: known/unknown, override persistence.
* `referral-code.spec.ts`: uniqueness, checksum, format, redemption.
* `mailchimp.spec.ts`: payload structure, merge vars, wellness vs medical branching.
* `audit.spec.ts`: every critical step produces a log with immutable properties.

---

## 14) Observability (MVP)

* Simple `/api/healthz` endpoint returns `{db:'ok', mailchimp:'ok'}`.
* Dashboard footer shows last upload time, count processed, count sent, count deferred.

---

## 15) Deployment Notes

* **DB**: Neon/Supabase/Render Postgres (enable TLS).
* **Web**: Vercel (set env vars).
* **Cron (later)**: Not required for MVP; all work is upload-triggered.
* **Backups**: Daily automated DB backups; store for 30 days.

---

## 16) What’s next (Files 2 & 3)

* **File 2 — Data & API Spec:** Full Prisma schema, types, endpoints, Mailchimp client, validation schemas, and processing pipeline code map.
* **File 3 — Frontend UX Spec:** Screen-by-screen flows, component contracts, form states, table columns, empty states, and accessibility notes.

---

## 17) Acceptance Criteria (ship checklist)

* [ ] Uploading a valid CSV processes **only** Completed appointments and creates one audit record per major step.
* [ ] Unknown services are blocked from sending and appear in the Unknown queue.
* [ ] Medical appointments trigger “review-only” emails; Wellness triggers “review + referral” with unique code.
* [ ] Referral redemptions found in later CSVs create “Issue Reward” tasks.
* [ ] Idempotency prevents duplicates on re-upload.
* [ ] Admin can classify services and re-run pending items.
* [ ] All secrets are env-based; no keys in the repo.
* [ ] Unit tests pass; basic e2e happy-path test succeeds.

---

**Ready for File 2 (Data & API Spec)?**
Say “File 2” and I’ll deliver the full Prisma schema, API routes, request/response bodies, validation, and the processing pipeline in detail.
