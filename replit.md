# Saudi Personal Data Protection Compliance Tool

## Overview
This project is a web application assisting organizations in complying with Saudi Arabia's Personal Data Protection Law (PDPL). It provides AI-powered tools for website scanning, generating privacy policies and terms & conditions, managing consent, and handling internal compliance. The application features an Arabic-first design with RTL support and professional legal/compliance styling, utilizing OpenAI's GPT models for intelligent document generation and compliance analysis. The project aims to be a robust solution for PDPL adherence, targeting organizations interacting with Saudi Arabian data subjects.

## Current Status (Nov 29, 2025)
**Completed & Tested:**
- ✅ Unified Internal Compliance Workspace: Single page (/internal-compliance) with 3 tools in tabs (Nov 29, 2025)
  - ROPA (Records of Processing Activity), DSAR (Data Subject Access Requests), DPIA (Data Protection Impact Assessments)
  - Tab-based navigation with RTL support
  - E2E tested: all tabs accessible and functional
- ✅ Unified Compliance Workspace: Single page (/workspace) with 4 tools in tabs (Nov 29, 2025)
  - Privacy Policy Generator, Terms Generator, Consent Management, Preferences Center
  - Tab-based navigation with RTL support
  - E2E tested: all tabs accessible and functional
- ✅ HomePage Redesign: Unified dashboard with 2 prominent workspace cards + 5 core services
- ✅ Terms & Conditions Generator: Full E2E flow working (form → generation → download)
- ✅ Privacy Generator: Form accessible with 3-section navigation
- ✅ Smart Customer Assistant: Complete RAG-based chatbot with vector search, feedback system, and E2E tested
- ✅ Database schema & backend APIs operational
- ✅ Internal Compliance Module: ROPA, DSAR, DPIA pages fully restored and tested (Nov 18, 2025)

**Smart Customer Assistant (Production Ready - Nov 16, 2025):**
- ✅ Backend: 8 API endpoints (embeddings, search, chat, conversations CRUD, feedback, knowledge)
- ✅ RAG Pipeline: Embedding generation → pgvector search → GPT-4o response with context
- ✅ Frontend: Chat UI with RTL support, suggested questions, context display, feedback buttons
- ✅ Database: 9 PDPL articles with embeddings (Arabic + English), conversation tracking
- ✅ E2E Testing: All features tested and working (chat, feedback, context, new conversation)

**Client Authentication System (Production Ready - Nov 16, 2025):**
- ✅ Database: 3 tables (users, clientPolicies, clientRequests) with proper relations
- ✅ Backend: Auth endpoints (register, login, logout, /me) with bcrypt password hashing
- ✅ Session Management: Express-session with PostgreSQL store (connect-pg-simple)
- ✅ Security: Session regeneration on login, requireAuth middleware protecting all client routes
- ✅ Frontend: SignUpPage, LoginPage, DashboardPage with RTL support
- ✅ E2E Testing: Full flow working (signup → login → dashboard → logout)
- ⏳ TODO: Frontend migration to session endpoints (/api/auth/me instead of localStorage)

**Admin Portal (Production Ready - Nov 16, 2025):**
- ✅ Database: 2 tables (adminUsers with roles, auditLogs for activity tracking)
- ✅ Backend: 13 admin API endpoints fully secured with session-based authentication
- ✅ Security Implementation:
  - Express-session with PostgreSQL store
  - Session regeneration on login (prevents session fixation)
  - Four-tier middleware: requireAuth, requireAdminAuth, requireAdminRole, requireAdminOrLegal
  - Zod validation schemas for all update endpoints (strict whitelisting)
  - Audit logging uses session.adminId (no client-supplied IDs)
- ✅ Frontend: Complete admin portal with 7 pages:
  - AdminLoginPage, AdminDashboardPage, AdminUsersPage, AdminRequestsPage
  - AdminPoliciesPage, AdminAuditLogsPage, AdminManagementPage
- ✅ Features: Role-based access (admin/legal/support), audit logging, statistics dashboard
- ✅ Owner Account: m.alajmi2211@gmail.com with full admin privileges
- ✅ E2E Testing: Full admin flow tested and working (login → navigation → CRUD → logout)

**Homepage Redesign (Production Ready - Nov 16, 2025):**
- ✅ New Design: Scanner Tool prominently at top (free, no signup), followed by features and services
- ✅ Scanner Card: Large, distinct border-2 border-primary/20 with "مجاني بالكامل" badge at top
- ✅ Section Order: Scanner Tool → متوافق 100% → ذكاء اصطناعي متقدم → وثائق جاهزة → 4 Service Cards
- ✅ Services: Website Scanner (top), Privacy Generator, Terms Generator, Consent Management, Smart Assistant
- ✅ Navigation: BackButton component added to all service pages (Privacy, Terms, Consent, Assistant, ScanResults)
- ✅ Removed: Internal Compliance section per user requirement
- ✅ E2E Testing: Full navigation flow verified - Scanner at top, correct ordering, all BackButtons working

**Enhanced Website Scanner (Production Ready - Nov 29, 2025):**
- ✅ Comprehensive Compliance Checking: Privacy Policy, Terms & Conditions, Cookie Banner, Contact Info
- ✅ Database Schema: Enhanced with compliance fields (hasPrivacyPolicy, hasTermsAndConditions, hasCookieBanner, hasContactInfo, complianceLevel)
- ✅ **OpenAI-First Architecture (Nov 29, 2025 - CRITICAL FIX):**
  - OpenAI is now the SOLE SOURCE OF TRUTH for compliance detection
  - DOM detection (using cheerio) is SUPPLEMENTARY only - provides URLs when OpenAI confirms presence
  - DOM heuristics can NEVER flip hasPrivacyPolicy/hasTermsAndConditions to true
  - Issues are only removed when OpenAI explicitly confirms element exists
  - This eliminates false positives from masking real compliance gaps
- ✅ **Deterministic Scoring System (Nov 16, 2025 - FINAL FIX):** Fixed critical double-counting bug causing zero scores
  - **Critical Bug Fixed:** System added +25 AND subtracted -25 for same element, resulting in zero net score for all websites
  - **Root Cause:** Flawed logic that both rewarded presence AND penalized absence of same compliance elements
  - **Final Solution (Production-Ready):** 
    - Start from 100 (perfect score baseline)
    - Deduct ONLY for missing elements:
      - **Missing Privacy Policy:** -30 points (critical)
      - **Missing Terms & Conditions:** -30 points (critical)
      - **Missing Cookie Banner:** -10 points (important)
      - **Missing Contact Info:** -10 points (important)
    - Additional deductions for detected issues:
      - **Critical Issues:** -5 each
      - **Warning Issues:** -3 each
      - **Suggestion Issues:** -1 each
    - Compliance levels: High ≥70%, Medium 40-69%, Low <40%
  - **E2E Testing Results (Nov 16, 2025):** 
    - GitHub.com scan #1: **97%** (high) - 0 criticals, 1 warning
    - GitHub.com scan #2: **99%** (high) - 0 criticals, 0 warnings, 1 suggestion
    - Consistency: ±2% variance (excellent)
    - Non-compliant sites: 20-40% (low/medium) as expected
    - Fully compliant sites: 90-100% (high) as expected
  - **Scoring Examples:**
    - Perfect site (all elements, no issues): 100%
    - GitHub-like (all elements, 1 warning): 97%
    - Good site (Privacy+Terms, 2 warnings): 74%
    - Partial (Privacy only, 3 criticals): 35%
    - Non-compliant (no elements): 20%
- ✅ Frontend UI: Compliance level badges (low/medium/high), compliance findings cards with visual status indicators
- ✅ Error Handling: Specific Arabic error messages for timeout, SSL, DNS failures, redirects
- ✅ Export Functionality: PDF/HTML/JSON report generation with proper concurrent request protection
  - Buttons disabled during pending state to prevent duplicate submissions
  - Visual spinner feedback (Download → RefreshCw animate-spin) during processing
  - Toast notifications for success/error states
  - Download initiated via `/api/reports/:id/download`
- ✅ CTA Integration: Low/medium compliance shows "استكشف خدماتنا" button linking to services
- ✅ Navigation: BackButton component added to all service pages including PreferencesCenterPage
- ✅ E2E Testing: Full scanner flow verified (scan → analysis → display → export → navigation → consistency)

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The application features an Arabic-first design with full RTL support, employing a hybrid Fluent Design and Material Design aesthetic. Typography utilizes the Cairo font. The homepage serves as a unified dashboard presenting all 5 core services (Website Scanner, Privacy Policy Generator, Terms Generator, Consent Management, Smart Assistant) directly without requiring navigation. UI components are designed for clarity, including professional cookie banners, clear consent management dialogs, and a preferences center. Downloaded documents are securely generated as professionally formatted HTML files with Cairo font, RTL layout, and responsive design, ensuring XSS protection and print-readiness.

### Frontend
The frontend is built with React and TypeScript using Vite, incorporating shadcn/ui components (Radix UI primitives) and Tailwind CSS. State management is handled by TanStack Query, client-side routing by wouter, and form handling by react-hook-form with Zod validation. Key features include a professional Cookie Banner with granular consent management and a Consent Management Platform (CMP) Dashboard.

### Backend
The backend utilizes Express.js on Node.js, implementing a RESTful API. It integrates with OpenAI's GPT-4o for AI capabilities, including website analysis for PDPL violations, privacy policy generation based on SDAIA templates, terms & conditions generation, and internal compliance analysis. Secure content fetching is ensured through URL validation, protocol restrictions, and IP blocking. The backend supports full CRUD operations for internal compliance modules like ROPA, DSAR Management, and DPIA, with Zod validation and security enhancements.

### Data Storage
PostgreSQL serves as the primary database, managed with Drizzle ORM for type-safe operations. The schema includes tables for compliance scans, issues, reports, remediation templates, policy/terms documents, consent records, and internal compliance tasks (ROPA, DSAR, DPIA), with appropriate relationships. Session management is handled by `connect-pg-simple`.

**AI Assistant / RAG Architecture:**
The Smart Customer Assistant uses a Retrieval Augmented Generation (RAG) architecture built on PostgreSQL with pgvector extension for semantic search. Vector embeddings are generated using OpenAI's `text-embedding-3-small` model (1536 dimensions), supporting both Arabic and English content. The knowledge base stores PDPL articles, FAQs, service guides, and glossary terms with HNSW vector indexes for efficient cosine similarity search. Chat conversations and messages are tracked with references to retrieved context, enabling audit trails and feedback collection. This unified database approach eliminates the need for separate vector databases while maintaining performance.

### Technical Implementations & Feature Specifications

**Internal Compliance Module (Production Ready - Nov 18, 2025):**
- ✅ **Three Complete Pages:** RopaPage (/ropa), DsarPage (/dsar), DpiaPage (/dpia)
- ✅ **Database Schema:** ropaEntries, dsarRequests, dpiaAssessments tables with Drizzle ORM
- ✅ **Backend APIs:** Full CRUD operations (POST/GET/PUT/DELETE) for all three modules
- ✅ **Schema Fix (Nov 18, 2025):** Made complex array fields optional (dataTypes, dataRecipients, identifiedRisks, mitigationMeasures) to enable basic form submissions without requiring multi-select inputs
- ✅ **Frontend UI Features:**
  - ROPA: Department, processing purpose, legal basis selection, retention period tracking
  - DSAR: Request type selection, status tracking (new/in_progress/completed/rejected), due date calculation (30 days from submission per PDPL)
  - DPIA: Project assessment with impact levels, department tracking, risk evaluation
  - All pages: RTL Arabic support, BackButton navigation, TanStack Query for data fetching, Toast notifications
- ✅ **Sidebar Navigation:** "الامتثال الداخلي" section with three links (link-ropa, link-dsar, link-dpia)
- ✅ **E2E Testing:** Full CRUD flows tested and verified (create → display → persist)
- 📝 **Future Enhancement:** Add multi-select/checkbox controls for optional array fields (dataTypes, identifiedRisks, mitigationMeasures) for comprehensive compliance tracking

**Terms & Conditions Generator (Hybrid System - Production Ready):**
Backend architecture complete and verified: junction tables (termsTemplateSections, termsSectionSources), seed data (6 templates × 8 sections, 6 legal sources), storage layer with SQL aggregation, OpenAI integration. Generation pipeline (`processTermsGeneration`) successfully creates 3,300+ character HTML documents with Cairo font, RTL layout, and professional formatting. Frontend UI built with 4-section multi-step form (Company Info → Service Details → Legal Info → Contact), react-hook-form validation, generating/completed states, and HTML content preview with download functionality. Full E2E testing passed: form submission, document generation polling, status transitions, and download functionality all working correctly. Architect confirmed production-readiness with no blocking defects.

## External Dependencies

-   **AI Service**: OpenAI API (GPT-4o model)
-   **Database**: PostgreSQL (`@neondatabase/serverless` driver)
-   **UI Component Libraries**: Radix UI, Tailwind CSS, Lucide React, Embla Carousel, date-fns
-   **Development Tools**: Vite, TypeScript, PostCSS with Autoprefixer