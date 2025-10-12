# ZenConnect Client Requirements Summary

## Client Overview
**Client:** Mary Tran Juma - Lite Acupuncture and Energy Healing Center  
**Primary Focus:** Referral program implementation with compliance considerations  
**Secondary Interest:** Website rebrand to "Lite Acupuncture and Energy Healing Center"

## Core Client Requirements

### 1. Immediate Priority: Referral Program
- **Primary Goal:** Simple, compliant referral system for wellness clinic
- **Client Preference:** "Keep it simple for now and focus on getting the referral program up and running"
- **Compliance Needs:** Must handle both wellness services (reward-eligible) and medical services (compliance-restricted)

### 2. Service Classification Requirements
- **Wellness Services:** Spa treatments, relaxation massage, general wellness (can offer rewards)
- **Medical Services:** Acupuncture, medical procedures (Anti-Kickback Statute compliance required)
- **Smart Classification:** System must automatically distinguish between service types

### 3. Technical Integration Needs
- **Current System:** Jane App for practice management
- **Email Platform:** MailChimp for communication
- **Data Flow:** CSV-based workflow (Jane App → System → MailChimp)
- **Compliance:** PIPEDA/HIPAA compliant infrastructure

## MVP Scope & Implementation Plan

### Phase 1: Core Referral System (30 Days)
✅ **In Scope:**
- Secure admin dashboard for CSV uploads
- Jane App appointment report parser
- Intelligent service classification engine
- Dual email templates (wellness vs. medical compliance)
- Referral code generation and tracking
- Manual reward task management
- Complete audit logging

❌ **Out of Scope (Phase 2):**
- Real-time Jane App integration
- Patient-facing portal
- Automated reward payouts
- Advanced analytics dashboard

### Technical Architecture

#### 1. Data Ingestion
- **Manual CSV Upload:** Clinic exports Jane App appointment reports
- **Validation:** System validates format and required fields
- **Processing:** Node.js/TypeScript application processes new appointments

#### 2. Service Classification Engine
```
Wellness Services → Referral Code + Reward Email
Medical Services → Review Request Only (No Rewards)
Unknown Services → Manual Review Required
```

#### 3. Communication Flow
- **MailChimp Integration:** API-driven email triggers
- **Template A (Wellness):** Review request + referral code + reward explanation
- **Template B (Medical):** Review request only (AKS compliant)

#### 4. Referral Tracking
- **Code Generation:** Unique codes per eligible patient
- **Redemption:** Tracked via Jane App custom field
- **Reward Tasks:** Manual gift certificate issuance workflow

### 🛠️ Technology Stack (IMPLEMENTED)

#### Frontend (Next.js 15)
- **Framework**: Next.js 15.5.3 with App Router + Turbopack
- **React**: React 19.1.0 with latest features
- **Styling**: Tailwind CSS 4.x
- **UI Components**: Radix UI + Custom Components
- **State Management**: React Context + Hooks
- **Forms**: React Hook Form + Zod validation
- **Tables**: TanStack Table
- **Notifications**: React Hot Toast
- **Icons**: Lucide React
- **Build Tool**: Turbopack (fastest builds)

#### Backend (Express.js)
- **Framework**: Express.js 4.18.2 with TypeScript 5.x
- **Authentication**: JWT + bcryptjs password hashing
- **Security**: Helmet + CORS + rate limiting
- **File Upload**: Multer 2.0.2 for CSV and document handling
- **CSV Processing**: CSV-Parse + CSV-Parser for Jane App integration
- **Validation**: Zod 4.1.11 for type-safe validation
- **Sessions**: Iron Session for secure sessions
- **API**: RESTful API with comprehensive error handling

#### Database (Prisma ORM)
- **ORM**: Prisma 6.16.2 for type-safe database operations
- **Development**: SQLite (fast, no setup required)
- **Production**: PostgreSQL (scalable, reliable)
- **Schema**: Comprehensive models (User, Task, Service, Referral, Upload, AuditLog)
- **Migrations**: Version-controlled database schema changes
- **Seeding**: Development data with real test accounts
- **Studio**: Prisma Studio for database management

#### Deployment (Render.com)
- **Platform**: Render.com with auto-scaling
- **Architecture**: Monorepo with npm workspaces
- **Environment**: Environment-based configuration
- **SSL**: Automatic HTTPS certificates
- **Monitoring**: Built-in health checks and logging

### Compliance Framework

#### Legal Requirements
- **Anti-Kickback Statute:** No rewards for medical service referrals
- **PIPEDA/HIPAA:** Full data protection compliance
- **Audit Trail:** Immutable logging of all actions

#### Safe Harbor Protections
- **Service Separation:** Clear distinction between medical/wellness
- **Documentation:** Complete compliance audit trail
- **Default Safety:** Unknown services default to medical (no rewards)

### Implementation Timeline

| Week | Focus | Deliverables |
|------|-------|-------------|
| 1 | Foundation | AWS setup, database schema, Jane App CSV format |
| 2 | Core Engine | CSV parser, service classification, code generation |
| 3 | Integration | MailChimp API, admin dashboard, email templates |
| 4 | Launch | Testing, training, live deployment |

### Success Metrics
- **Compliance:** 100% accurate service classification
- **Automation:** 90%+ reduction in manual referral management
- **Adoption:** Daily/weekly CSV upload workflow established
- **Security:** Zero compliance violations or data breaches

## Future Roadmap (Phase 2+)

### Enhanced Features
- Real-time Jane App webhook integration
- Patient-facing referral portal
- Advanced analytics and ROI tracking
- Automated reward distribution
- Multi-location support

### Website Rebrand
- WordPress-based rebuild for better SEO
- "Lite Acupuncture and Energy Healing Center" branding
- Integrated referral program promotion

## Risk Mitigation

### Technical Risks
- **CSV Format Changes:** Flexible parser with error handling
- **Service Misclassification:** Default to medical template for safety
- **Integration Failures:** Robust retry logic and fallback processes

### Compliance Risks
- **Regulatory Violations:** Conservative classification approach
- **Data Breaches:** End-to-end encryption and access controls
- **Audit Requirements:** Complete immutable logging

## Client Communication Strategy
- **Simplicity First:** Focus on core referral functionality
- **Compliance Emphasis:** Highlight legal protections and safe practices
- **Gradual Enhancement:** Phase 2 features based on Phase 1 success
- **Training & Support:** Comprehensive onboarding for CSV workflow

---

**Status:** Ready for MVP development  
**Timeline:** 30-day implementation  
**Next Steps:** Client approval and development kickoff
