# Payo - Automated Payroll Operations Platform

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D%2018.x-green.svg)](https://nodejs.org/)
[![Database](https://img.shields.io/badge/database-MySQL-blue.svg)](https://www.mysql.com/)
[![ORM](https://img.shields.io/badge/ORM-Prisma-lightblue.svg)](https://www.prisma.io/)
[![Frontend](https://img.shields.io/badge/frontend-Vanilla%20JS%20%2F%20CSS-orange.svg)](#)
[![License: ISC](https://img.shields.io/badge/License-ISC-yellow.svg)](https://opensource.org/licenses/ISC)

Payo is a robust, self-contained, and feature-complete **Automated Payroll Operations Platform** designed to streamline salary processing, verification, payslip generation, and automated email dispatch. The platform provides a modern, high-fidelity visual interface built entirely on a vanilla Single Page Application (SPA) architecture combined with a Node.js Express REST API backed by Prisma ORM and MySQL.

---

## 📖 Table of Contents
1. [Project Overview](#-project-overview)
2. [Key Features](#%EF%B8%8F-key-features)
3. [System Architecture Overview](#-system-architecture-overview)
4. [Technology Stack](#-technology-stack)
5. [Project Folder Structure](#-project-folder-structure)
6. [Environment Variables Setup](#-environment-variables-setup)
7. [Installation & Setup](#-installation--setup)
    - [Database Configuration](#1-database-configuration)
    - [Backend Setup](#2-backend-setup)
    - [Frontend Setup](#3-frontend-setup)
8. [Payroll Processing & Email Dispatch Flow](#-payroll-processing--email-dispatch-flow)
9. [PDF Generation details](#-pdf-generation-details)
10. [Screenshots & Visuals](#-screenshots--visuals)
11. [Deployment Guide](#-deployment-guide)
12. [Troubleshooting & FAQs](#-troubleshooting--faqs)
13. [Author Section](#-author-section)

---

## 🔍 Project Overview

The operational cycle of corporate payroll is highly prone to human error and data mismatches. **Payo** addresses these concerns by decoupling data collection, validation, and finalization through a structured staging architecture. 

Managers upload payroll files (Employees directory and Salary spreadsheets), view validation anomalies in real-time, preview generated financials, and execute payroll finalization with a single click. Upon finalization, the system generates secure PDF statements, queues them for transmission, and dispatches them through SendGrid with built-in delivery logging and failure recovery mechanisms.

---

## ⚡ Key Features

*   **7-Step Guided Payroll Wizard:**
    *   **Step 1:** Employee CSV/XLSX Upload.
    *   **Step 2:** Salary Details CSV/XLSX Upload.
    *   **Step 3:** Automated Schema & Cross-Reference Validation.
    *   **Step 4:** Ledger Preview (Gross, Deductions, and Net Take-home calculation checks).
    *   **Step 5:** Payslips Compilation (generates secure database registry entries).
    *   **Step 6:** Outbound email processing via SendGrid (background batch sending).
    *   **Step 7:** Completed status review with metrics.
*   **Intelligent File Parser:** Native parsing of CSV and Excel (`.xlsx`) files supporting standard corporate spreadsheets.
*   **Dual-Layer Data Validation:** Matches employee lists with salary items, validating emails, structure syntax, avoiding negative salaries, and flagging missing/duplicate entries.
*   **On-the-Fly PDF payslip Builder:** Creates A4 payroll sheets using `pdfkit` featuring clean typographic hierarchies, corporate info panels, earnings/deductions breakdowns, net pay highlights, and signature lines.
*   **Automated Email Dispatcher:** 
    *   Responsive HTML mail template (inline CSS, corporate headers, details summary, and attachment badge).
    *   Secured PDF payslip attached to each individual message.
    *   Addresses employee by name and references current month/year.
*   **Email Queue & Delivery Logging:** Tracks dispatch metrics (queued, sending, delivered, failed) with full retry capabilities for individual or batch dispatch errors.
*   **Indian Rupee (INR) Formatting Support:** Formats payroll figures using the `en-IN` numbering conventions (e.g., `₹4,02,500.00` on the UI and `Rs. 4,02,500.00` on generated PDFs) alongside automatic number-to-words compilation.
*   **Responsive Professional UI:** Sleek modern dashboard featuring dark/glassmorphic accent headers, live operational metrics, an employee directory, a payslips registry, and an interactive side-drawer preview.

---

## 🏗️ System Architecture Overview

The system is decoupled into two primary layers communicating via a REST API:

```mermaid
graph TD
    subgraph Client [Frontend SPA - Port 5173]
        A[UI Views: HTML/CSS] --> B[App Router & Event bindings]
        B --> C[State Manager - state.js]
        C --> D[API Client - apiClient.js]
    end

    subgraph Server [Backend REST API - Express - Port 3000]
        D -->|HTTP Request| E[Express Server]
        E --> F[Router Middleware]
        F --> G[Controllers]
        G --> H[Services Layer]
        H --> I[Prisma Client ORM]
        
        H -->|Upload Parsing| J[csv-parser / xlsx]
        H -->|PDF Generation| K[pdfkit]
        H -->|SendGrid Dispatch| L[sendgrid]
    end

    subgraph Database [Storage Layer]
        I -->|SQL Queries| M[(MySQL Database)]
    end
```

### Staging Data Design Pattern

To prevent corrupting the production database with malformed files, Payo uses a staging database flow:

1.  **Staging Upload:** Uploaded CSV/Excel raw rows are stored as raw JSON payloads inside the `PayrollRunStaging` table linked to the `PayrollRun` entity.
2.  **Staging Validation:** Data validation and calculations are run against these staging tables in memory.
3.  **Finalization Write:** Upon manual validation confirmation, a single transaction (`prisma.$transaction`) executes:
    *   Creating/upserting structural records in `Employee`.
    *   Creating final ledger sheets in `Payslip`.
    *   Creating queued messages in `EmailLog`.
    *   Purging staging tables to clean disk resources.

---

## 🛠️ Technology Stack

### Frontend
*   **HTML5 & CSS3:** Customized design utilizing CSS variables (`variables.css`), structured layout rules (`layout.css`), and micro-animations.
*   **Vanilla JS (ES6+):** Pure JavaScript client-side framework featuring modular ES imports, state-driven subscribers, and reactive views.
*   **Serve Utility:** Serving frontend assets on `http://localhost:5173`.

### Backend
*   **Express.js (v5):** High-performance routing framework using ES modules natively.
*   **Prisma Client:** Type-safe database queries and schema management.
*   **SendGrid:** Secure SendGrid HTTP API integration, HTML bodies, and binary attachments.
*   **PDFKit:** Standard document creation engine.
*   **Multer:** Configured to handle multi-part file uploads safely.
*   **ExcelJS / XLSX / CSV-Parser:** Parsing tools supporting both common flat-files and Excel sheets.

---

## 📂 Project Folder Structure

```
Payo/
├── index.html              # Frontend main entry
├── vite.config.js          # Vite config or asset reference
├── package.json            # Frontend package details
├── src/                    # Frontend source assets
│   ├── js/
│   │   ├── app.js          # Main coordinator, routing configuration
│   │   ├── state.js        # Global state store utilizing subscription patterns
│   │   ├── components/     # Reusable web components
│   │   │   ├── drawer.js   # Side-drawer overlay panel
│   │   │   └── toast.js    # Notification alert overlay
│   │   ├── pages/          # Individual UI page controllers
│   │   │   ├── dashboard.js   # Overview metrics, trends & shortcuts
│   │   │   ├── employees.js   # Employee records directory
│   │   │   ├── payrollRun.js  # 7-step wizard workflow controller
│   │   │   ├── payslips.js    # registry table & interactive preview drawer
│   │   │   ├── emails.js      # Dispatch center log with retry controls
│   │   │   └── settings.js    # Config settings page
│   │   └── services/       # Network API wrappers
│   │       ├── apiClient.js   # Custom fetch interface
│   │       ├── pdfService.js  # Currency layout formats and downloads
│   │       └── ...
│   └── styles/             # Modular CSS stylesheet assets
│       ├── variables.css   # Color palette tokens, fonts, spacing values
│       ├── layout.css      # Header, sidebar, and container layout rules
│       ├── components.css  # Buttons, input fields, badges, custom tables
│       └── pages.css       # Page specific details & drawer transitions
│
└── backend/                # REST API Node.js project root
    ├── server.js           # Server starter file
    ├── package.json        # Node.js backend configuration
    ├── .env.example        # Environment details template
    ├── prisma/
    │   ├── schema.prisma   # Database schema mapping models
    │   └── seed.js         # Initial settings and metadata seeder
    ├── controllers/        # Route controllers handling inputs & errors
    ├── middleware/         # App middleware (Multer upload, Async handlers, Error hooks)
    ├── routes/             # API routing matching REST specs
    ├── services/           # Underlying business logic engines
    │   ├── fileParser.service.js   # CSV/XLSX parser engine
    │   ├── email.service.js        # Mail queues, SendGrid integration, HTML templates
    │   ├── pdf.service.js          # PDF buffer builder coordinator
    │   ├── pdf/
    │   │   └── payslipPdf.generator.js # Layout styling and text drawings via pdfkit
    │   ├── payrollRun.service.js   # Run management service
    │   └── payroll.service.js      # Core calculations, staging, and db transaction
    ├── utils/              # Helper libraries
    └── uploads/            # Temporary file upload repository (Multer destination)
```

---

## 🔒 Environment Variables Setup

Create a `.env` file in the `backend/` directory based on the `.env.example` template:

```env
DATABASE_URL="mysql://root:password@localhost:3306/payo"
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# SendGrid Credentials — Used by the backend (not stored in database for security)
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_SENDER_EMAIL=payroll@payo.co

# Upload configurations
UPLOAD_MAX_SIZE_MB=5
UPLOAD_DIR=./uploads

# Simulation settings
SIMULATE_EMAIL_FAILURE=true
```

---

## Email Delivery Architecture

PAYO uses Twilio SendGrid as its outbound email delivery provider. The sender address is not configurable through the user interface because SendGrid requires sender authentication and verified identity before any email can be dispatched successfully.

To support a production-grade deployment, the application reads the authenticated sender address from the backend deployment environment rather than storing it in application settings. This keeps email infrastructure configuration separate from payroll administration and prevents users from entering addresses that may fail sender authentication.

Why this matters:

- Prevents invalid or unauthorized sender addresses from being used
- Ensures compliance with SendGrid sender authentication requirements
- Supports reliable delivery by preserving the authenticated sending identity
- Keeps UI settings focused on payroll and company configuration rather than email infrastructure

To change the sender address in a deployed environment:

1. Authenticate the new sender identity in SendGrid.
2. Update the deployment environment variable used by the backend.
3. Redeploy the application.

This design decision intentionally keeps email delivery configuration outside the PAYO user interface.

---

## 🚀 Installation & Setup

### Prerequisites
*   **Node.js** (v18.x or above)
*   **MySQL Server** (Running locally or hosted)

---

### 1. Database Configuration
Ensure your MySQL server is running and create an empty database named `payo` (or any name specified in your `DATABASE_URL` string):

```sql
CREATE DATABASE payo;
```

---

### 2. Backend Setup

1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure your environment variables in `.env` as documented above.
4.  Generate the Prisma Client code:
    ```bash
    npm run db:generate
    ```
5.  Execute migrations to create the database tables:
    ```bash
    npm run db:migrate
    ```
6.  Seed the database with default configurations:
    ```bash
    npm run db:seed
    ```
7.  Start the backend server in development mode (supports hot reloading):
    ```bash
    npm run dev
    ```

The API should now be running on `http://localhost:3000`.

---

### 3. Frontend Setup

1.  Navigate to the root directory:
    ```bash
    cd ..
    ```
2.  Install dependencies (installs serving utility):
    ```bash
    npm install
    ```
3.  Start the frontend application:
    ```bash
    npm run dev
    ```

The user interface should now be accessible at `http://localhost:5173`.

---

## 📥 Payroll Processing & Email Dispatch Flow

```
[Upload CSV/XLSX Files] 
       │
       ▼
[Save to Staging (JSON)] 
       │
       ▼
[Run Schema & Ref Checks] ──(Anomalies Found)──► Show Warnings/Errors in UI
       │
  (No Errors)
       ▼
[Calculate & Preview Ledger] 
       │
       ▼
[Finalize Run (Single DB Tx)]
       ├─► Update Run Status to 'completed'
       ├─► Upsert Employee records
       ├─► Save Payslip records 
       ├─► Queue EmailLogs as 'queued'
       └─► Clear Staging Tables
       │
       ▼
[Process Email Queue]
       ├─► Compile PDF payslip Buffer via pdfkit
       ├─► Build HTML body with inline CSS styles
       ├─► Dispatch via SendGrid transport
       └─► Update log state ('delivered' / 'failed')
```

### SendGrid Configuration and Fail-safe Mechanism
*   **SendGrid API:** Sourced securely through your server's `.env` parameters. If running in a development context without a SendGrid API key, the system prints a mock email delivery statement containing recipient metadata to the server stdout logs instead.
*   **Interrupted Send Recovery:** The background dispatcher automatically recovers any stuck tasks flagged as `sending` if they have exceeded five minutes (e.g., due to a server crash or timeout) and resets them to `failed`.
*   **Targeted Retry:** The Email Center page features instant retry actions allowing users to attempt individual redeliveries or dispatch the entire queue of failed records in a single click.

---

## 📄 PDF Generation Details

PDF slips are generated using `pdfkit` on the fly to avoid wasting local storage. Key highlights include:
1.  **Format Constraints:** Standard A4 page layout with matching margins for print.
2.  **Structural Grid:** Left-aligned company branding details (address, tax ID), right-aligned document labels.
3.  **Employee Metadata Card:** Rounded background grid panel summarizing identity data (ID, Role, Name, Dept, Ref code).
4.  **Side-by-Side Ledger Grid:** Decoupled earnings and deductions sections with individual values, sub-totals, and clean line dividers.
5.  **Taking-Home Highlight Box:** Dark slate banner containing the total net payout in standard local currency format accompanied by the written words (e.g. *"Rs. Four Lakh Two Thousand Five Hundred Only"*).
6.  **Signature Area:** Double-signature lines (Employer / Employee) with clear dashed markers.

---

## 📸 Screenshots & Visuals

*Placeholder sections to showcase the application during evaluations:*

### 1. Dashboard UI
*Provide an image showing current statistics counters, active periods, and shortcut links.*
`[Screenshot Placeholder: Dashboard Page]`

### 2. Payroll Run Wizard
*Provide an image showing step 3 or 4: file validations reports showing pass/fail status.*
`[Screenshot Placeholder: Validation step]`

### 3. Interactive Payslips Directory
*Provide an image of the Payslip Registry list showing filter controls and the custom Payslip Drawer preview.*
`[Screenshot Placeholder: Payslips Registry & Preview Drawer]`

### 4. Email Center & Logs
*Provide an image of the email queue displaying status badges (Delivered/Failed) and action buttons.*
`[Screenshot Placeholder: Outbound Email Logs]`

---

## 🌐 Deployment Guide

### Backend Production Build
1.  Ensure `NODE_ENV` is set to `production` in your hosting manager.
2.  Provide database hosting values (e.g., Amazon RDS, DigitalOcean Managed Database) in `DATABASE_URL`.
3.  Expose the environment variables `SENDGRID_API_KEY` and `SENDGRID_SENDER_EMAIL` on the deployment platform.
4.  Start server using `npm start`.

### Frontend Production Build
1.  Ensure backend API URL is configured inside `src/js/services/apiClient.js` pointing to your hosted API.
2.  Build frontend bundle or configure a static host (Vercel, Netlify, AWS S3) to server static files (`index.html`, `src/`).

---

## 🛠️ Troubleshooting & FAQs

#### Q1: Prisma Client fails with schema differences?
Run `npm run db:generate` to regenerate the Prisma client mappings. If making schema modifications, apply them using `npm run db:migrate`.

#### Q2: File uploads fail with large sheets?
Multer is configured to limit files to a maximum size of `5MB`. If uploading larger rosters, modify the limit `UPLOAD_MAX_SIZE_MB` inside the backend environment configurations.

#### Q3: Email dispatcher fails immediately in development?
Set `SIMULATE_EMAIL_FAILURE=false` in your backend `.env` configuration. In development, the system is designed to simulate a connection timeout on Employee `EMP004` (Jenny) to allow testing retry and queuing features.

---

## 👤 Author Section

*   **Project Developer:** Karthik L
*   **GitHub:** [https://github.com/ka-rthik-l](https://github.com/ka-rthik-l)
*   **Role:** Software Engineer Intern / Developer
*   **Submission Date:** May 2026
