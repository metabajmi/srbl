# Saudi Personal Data Protection Compliance Tool

## Overview
This project is a web application assisting organizations in complying with Saudi Arabia's Personal Data Protection Law (PDPL). It provides AI-powered tools for website scanning, generating privacy policies and terms & conditions, managing consent, and handling internal compliance. The application features an Arabic-first design with RTL support and professional legal/compliance styling, utilizing OpenAI's GPT models for intelligent document generation and compliance analysis. The project aims to be a robust solution for PDPL adherence, targeting organizations interacting with Saudi Arabian data subjects.

## Current Status (Nov 16, 2025)
**Completed & Tested:**
- ✅ Terms & Conditions Generator: Full E2E flow working (form → generation → download)
- ✅ Internal Compliance Module: ROPA, DSAR, DPIA all tested and functional
- ✅ Privacy Generator: Form accessible with 3-section navigation
- ✅ Smart Customer Assistant: Complete RAG-based chatbot with vector search, feedback system, and E2E tested
- ✅ Database schema & backend APIs operational

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

**Admin Portal (Backend Complete - Nov 16, 2025):**
- ✅ Database: 2 tables (adminUsers with roles, auditLogs for activity tracking)
- ✅ Backend: 13 admin API endpoints fully secured:
  - Auth: POST /login, GET /me, POST /logout (session-based)
  - Stats: GET /stats (all admin roles)
  - Users: GET /users, PATCH /users/:id, DELETE /users/:id (admin + legal)
  - Policies: GET /policies (admin + legal)
  - Requests: GET /requests, PATCH /requests/:id (admin + legal)
  - Audit: GET /audit-logs (admin only)
  - Admins: GET /admins, PATCH /admins/:id (admin only)
- ✅ Security Implementation:
  - Express-session with PostgreSQL store
  - Session regeneration on login (prevents session fixation)
  - Four-tier middleware: requireAuth, requireAdminAuth, requireAdminRole, requireAdminOrLegal
  - Zod validation schemas for all update endpoints (strict whitelisting)
  - Audit logging uses session.adminId (no client-supplied IDs)
- ✅ Frontend: 4 admin pages (login, dashboard, users management, requests management)
- ✅ Features: Role-based access (admin/legal/support), audit logging, statistics dashboard
- ⚠️ Missing Pages: Policies management page, Audit logs page, Admin users management page
- ⏳ TODO: Frontend migration to session endpoints, complete remaining admin pages

**Pending Verification:**
- Cookie Consent Management pages
- Home page dashboard  
- Website scanner functionality

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The application features an Arabic-first design with full RTL support, employing a hybrid Fluent Design and Material Design aesthetic. Typography utilizes the Cairo font. UI components are designed for clarity, including professional cookie banners, clear consent management dialogs, and a preferences center. Downloaded documents are securely generated as professionally formatted HTML files with Cairo font, RTL layout, and responsive design, ensuring XSS protection and print-readiness.

### Frontend
The frontend is built with React and TypeScript using Vite, incorporating shadcn/ui components (Radix UI primitives) and Tailwind CSS. State management is handled by TanStack Query, client-side routing by wouter, and form handling by react-hook-form with Zod validation. Key features include a professional Cookie Banner with granular consent management and a Consent Management Platform (CMP) Dashboard.

### Backend
The backend utilizes Express.js on Node.js, implementing a RESTful API. It integrates with OpenAI's GPT-4o for AI capabilities, including website analysis for PDPL violations, privacy policy generation based on SDAIA templates, terms & conditions generation, and internal compliance analysis. Secure content fetching is ensured through URL validation, protocol restrictions, and IP blocking. The backend supports full CRUD operations for internal compliance modules like ROPA, DSAR Management, and DPIA, with Zod validation and security enhancements.

### Data Storage
PostgreSQL serves as the primary database, managed with Drizzle ORM for type-safe operations. The schema includes tables for compliance scans, issues, reports, remediation templates, policy/terms documents, consent records, and internal compliance tasks (ROPA, DSAR, DPIA), with appropriate relationships. Session management is handled by `connect-pg-simple`.

**AI Assistant / RAG Architecture:**
The Smart Customer Assistant uses a Retrieval Augmented Generation (RAG) architecture built on PostgreSQL with pgvector extension for semantic search. Vector embeddings are generated using OpenAI's `text-embedding-3-small` model (1536 dimensions), supporting both Arabic and English content. The knowledge base stores PDPL articles, FAQs, service guides, and glossary terms with HNSW vector indexes for efficient cosine similarity search. Chat conversations and messages are tracked with references to retrieved context, enabling audit trails and feedback collection. This unified database approach eliminates the need for separate vector databases while maintaining performance.

### Technical Implementations & Feature Specifications
The application includes a fully functional Internal Compliance Management module with ROPA, DSAR, and DPIA tools. The ROPA management supports dynamic multi-recipient management and various data types. The DPIA tool handles complex compliance assessments with dynamic fields for data types, identified risks, and mitigation measures.

**Terms & Conditions Generator (Hybrid System - Production Ready):**
Backend architecture complete and verified: junction tables (termsTemplateSections, termsSectionSources), seed data (6 templates × 8 sections, 6 legal sources), storage layer with SQL aggregation, OpenAI integration. Generation pipeline (`processTermsGeneration`) successfully creates 3,300+ character HTML documents with Cairo font, RTL layout, and professional formatting. Frontend UI built with 4-section multi-step form (Company Info → Service Details → Legal Info → Contact), react-hook-form validation, generating/completed states, and HTML content preview with download functionality. Full E2E testing passed: form submission, document generation polling, status transitions, and download functionality all working correctly. Architect confirmed production-readiness with no blocking defects.

## External Dependencies

-   **AI Service**: OpenAI API (GPT-4o model)
-   **Database**: PostgreSQL (`@neondatabase/serverless` driver)
-   **UI Component Libraries**: Radix UI, Tailwind CSS, Lucide React, Embla Carousel, date-fns
-   **Development Tools**: Vite, TypeScript, PostCSS with Autoprefixer