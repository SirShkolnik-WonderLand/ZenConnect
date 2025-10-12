# ZenConnect - Clinic Management System

A modern, full-stack clinic management system built with Next.js, Express, and PostgreSQL.

## 🏗️ Architecture

This project follows a 3-tier architecture:

- **Frontend** (`/frontend`): Next.js 15 with React 19, Tailwind CSS, and TypeScript
- **Backend** (`/backend`): Express.js API server with TypeScript
- **Database** (`/database`): PostgreSQL with Prisma ORM

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd ClinicWise
```

2. Install all dependencies:
```bash
npm run install:all
```

3. Set up environment variables:
```bash
# Copy template files and fill in your values
cp .env.template .env
cp frontend/.env.template frontend/.env
cp backend/.env.template backend/.env
cp database/.env.template database/.env
```

4. Set up the database:
```bash
cd database
npm run migrate
npm run seed  # Optional: seed with sample data
```

5. Start the development servers:
```bash
npm run dev
```

This will start:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- Database: PostgreSQL connection

## 📁 Project Structure

```
ClinicWise/
├── frontend/           # Next.js frontend application
│   ├── src/
│   │   ├── app/       # App router pages
│   │   ├── components/ # Reusable UI components
│   │   └── lib/       # Utilities and configurations
│   └── package.json
├── backend/            # Express.js backend API
│   ├── src/
│   │   ├── routes/    # API route handlers
│   │   ├── lib/       # Business logic and utilities
│   │   ├── middleware/ # Express middleware
│   │   └── types/     # TypeScript type definitions
│   └── package.json
├── database/           # Database configuration and migrations
│   ├── prisma/        # Prisma schema and migrations
│   ├── scripts/       # Database scripts and seeders
│   └── package.json
└── docs/              # Project documentation
```

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start all services in development mode
- `npm run build` - Build all services for production
- `npm run lint` - Run linting on all services
- `npm run type-check` - Run TypeScript type checking

### Individual Service Scripts

**Frontend:**
- `cd frontend && npm run dev` - Start frontend dev server
- `cd frontend && npm run build` - Build frontend for production

**Backend:**
- `cd backend && npm run dev` - Start backend dev server with hot reload
- `cd backend && npm run build` - Build backend for production

**Database:**
- `cd database && npm run migrate` - Run database migrations
- `cd database && npm run seed` - Seed database with sample data
- `cd database && npm run studio` - Open Prisma Studio

## 🚀 Deployment

### Render Deployment

This project is configured for deployment on Render using the `render.yaml` configuration.

1. Push your code to GitHub
2. Connect your GitHub repository to Render
3. Render will automatically deploy based on the `render.yaml` configuration

### Manual Deployment

1. Build all services:
```bash
npm run build
```

2. Set production environment variables
3. Deploy each service to your preferred hosting platform

## 🔧 Configuration

### Environment Variables

See the `.env.template` files in each directory for required environment variables.

Key variables:
- `DATABASE_URL`: PostgreSQL connection string
- `NEXT_PUBLIC_API_URL`: Backend API URL for frontend
- `JWT_SECRET`: Secret for JWT token signing
- `NEXTAUTH_SECRET`: NextAuth.js secret

## 📚 Features

- **Authentication**: Secure login/logout system
- **Dashboard**: Overview of clinic operations
- **Task Management**: Track and manage clinic tasks
- **File Upload**: Handle document uploads
- **Referral System**: Manage patient referrals
- **Audit Logging**: Track system activities
- **Service Classification**: Categorize clinic services

## 🧪 Testing

```bash
# Run tests for all services
npm test

# Run tests for specific service
cd frontend && npm test
cd backend && npm test
```

## 📖 Documentation

- [Build Guide](./01_ZenConnect_Cursor_Build_Guide.md)
- [API Specification](./02_Data_and_API_Spec.md)
- [Frontend UX Specification](./03_Frontend_UX_Spec.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## IP & Use Notice — ZenConnect

© 2025–present AliceSolutionsGroup Inc. and SmartStart Hub. All rights reserved.

ZenConnect and all assets in this repository (code, designs, documentation, data models, and prompts) are proprietary intellectual property of AliceSolutionsGroup Inc. and SmartStart Hub, together with the individual IP owner(s) within our group. Unauthorized copying, distribution, sublicensing, or derivative works are prohibited without prior written permission.

**Intended use.** ZenConnect is an internal clinic management and outreach system providing CSV-based appointment processing, referral code automation, Mailchimp email flows, immutable audit logs, and an admin dashboard. Access is restricted to authorized personnel under written agreement.

**Data protection.** Users must comply with applicable privacy and health-information laws. Store only necessary patient data; do not include sensitive fields in outbound payloads; all credentials must be provisioned via environment variables. Audit logs are immutable and required for each critical operation.

**Third-party services.** Mailchimp®, JaneApp®, and any other third-party tools are trademarks of their respective owners. ZenConnect is independent and not affiliated with or endorsed by those parties. Use of their services is subject to their terms and licenses.

**No warranty.** This software and related materials are provided "as is" without warranties of any kind.  
Permissions & inquiries: support@alicesolutionsgroup.com

## 📄 License

This project is private and proprietary.
