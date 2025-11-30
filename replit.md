# Saudi Personal Data Protection Compliance Tool

## Overview
This project is a web application designed to help organizations comply with Saudi Arabia's Personal Data Protection Law (PDPL). It offers AI-powered tools for website scanning, generating privacy policies and terms & conditions, managing consent, and handling internal compliance. The application features an Arabic-first, RTL-supported design, utilizing OpenAI's GPT models for intelligent document generation and compliance analysis. The project aims to provide a robust, AI-driven solution for PDPL adherence for entities interacting with Saudi Arabian data subjects.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The application features an Arabic-first design with full RTL support, combining Fluent Design and Material Design aesthetics. The Cairo font is used for typography. The homepage functions as a unified dashboard displaying all core services directly. UI components are designed for clarity, including professional cookie banners, consent management dialogs, and a preferences center. Downloadable documents are securely generated as professionally formatted, print-ready HTML files with Cairo font and responsive RTL layouts, ensuring XSS protection.

### Frontend
The frontend is built with React and TypeScript using Vite, incorporating shadcn/ui components (Radix UI primitives) and Tailwind CSS. State management uses TanStack Query, client-side routing uses wouter, and form handling uses react-hook-form with Zod validation. It includes a professional Cookie Banner and a Consent Management Platform (CMP) Dashboard.

### Backend
The backend uses Express.js on Node.js, implementing a RESTful API. It integrates with OpenAI's GPT-4o for AI capabilities, such as PDPL violation analysis, privacy policy generation, terms & conditions generation, and internal compliance analysis. Secure content fetching is ensured through URL validation, protocol restrictions, and IP blocking. The backend supports full CRUD operations for internal compliance modules like ROPA, DSAR Management, and DPIA, with Zod validation and security enhancements.

### Data Storage
PostgreSQL serves as the primary database, managed with Drizzle ORM for type-safe operations. The schema includes tables for compliance scans, issues, reports, remediation templates, policy/terms documents, consent records, and internal compliance tasks (ROPA, DSAR, DPIA). Session management is handled by `connect-pg-simple`.

**AI Assistant / RAG Architecture:**
The Smart Customer Assistant utilizes a Retrieval Augmented Generation (RAG) architecture built on PostgreSQL with the pgvector extension for semantic search. Vector embeddings are generated using OpenAI's `text-embedding-3-small` model, supporting both Arabic and English content. The knowledge base stores PDPL articles, FAQs, service guides, and glossary terms with HNSW vector indexes. Chat conversations and messages are tracked with references to retrieved context.

### Technical Implementations & Feature Specifications

**Unified Compliance Workspaces:**
- **Unified Compliance Workspace:** A single page (`/workspace`) integrates Privacy Policy Generator, Terms Generator, Consent Management, and Preferences Center into tab-based navigation with RTL support.
- **Unified Internal Compliance Workspace:** A single page (`/internal-compliance`) integrates ROPA, DSAR, and DPIA tools into tab-based navigation with RTL support.
- **Internal Compliance Module:** Provides full CRUD operations and dedicated pages for ROPA, DSAR, and DPIA, with database schemas and APIs. DSAR includes due date calculation (30 days per PDPL).

**Website Scanner:**
- **Comprehensive Compliance Checking:** Scans for Privacy Policy, Terms & Conditions, Cookie Banner, and Contact Info, with compliance fields in the database schema.
- **PDPL Knowledge Base:** Includes `compliance-requirements.json` with Saudi legal requirements for e-commerce, privacy policy elements (PDPL Article 12), data subject rights (PDPL Article 4), and cookie consent.
- **Hybrid Detection Architecture:** Combines OpenAI intelligence for content analysis with DOM detection (using cheerio) for exact phrase matching, ensuring accurate detection of compliance elements.
- **Deterministic Scoring System:** Starts from a baseline of 100 and deducts points only for missing elements and detected issues (critical, warning, suggestion), providing compliance levels (High ≥70%, Medium 40-69%, Low <40%).
- **Conservative Fallback Scoring:** When AI analysis fails (rate limits, quota), scores are capped at 60% maximum with explicit "Partial Analysis" warning. Each detected element contributes 15% (4 elements × 15% = 60% max). This prevents inflated scores when content quality cannot be verified.
- **Partial Analysis Detection:** Frontend displays orange warning banner when AI analysis was skipped, with clear Arabic messaging about incomplete verification and option to re-scan.
- **Frontend UI:** Displays compliance level badges, findings cards, and error handling with specific Arabic messages.
- **Export Functionality:** Generates PDF/HTML/JSON reports with concurrent request protection, visual feedback, and toast notifications.

**Terms & Conditions Generator:**
Features a hybrid system with a robust backend architecture including junction tables, seed data, SQL aggregation, and OpenAI integration. The generation pipeline produces professionally formatted HTML documents. The frontend provides a 4-section multi-step form for user input, validation, and content preview with download functionality.

**Smart Customer Assistant:**
A RAG-based chatbot with a production-ready backend (8 API endpoints for embeddings, search, chat, conversations, feedback, knowledge) and a frontend chat UI with RTL support, suggested questions, context display, and feedback. The database stores PDPL articles with embeddings and tracks conversations.

**Client Authentication System:**
Includes database tables for users, client policies, and requests, with backend authentication endpoints (register, login, logout, `/me`) using bcrypt and Express-session with a PostgreSQL store. Frontend provides SignUp, Login, and Dashboard pages with RTL support, and secure session management.

**Admin Portal:**
Features a secure admin portal with database tables for admin users (with roles) and audit logs. The backend provides 13 secure admin API endpoints with session-based authentication, role-based access control (requireAuth, requireAdminAuth, requireAdminRole, requireAdminOrLegal), Zod validation, and audit logging. The frontend includes 7 pages (Login, Dashboard, Users, Requests, Policies, Audit Logs, Management) with features like role-based access, audit logging, and statistics.

## External Dependencies

-   **AI Service**: OpenAI API (GPT-4o model)
-   **Database**: PostgreSQL (`@neondatabase/serverless` driver)
-   **UI Component Libraries**: Radix UI, Tailwind CSS, Lucide React, Embla Carousel, date-fns
-   **Development Tools**: Vite, TypeScript, PostCSS with Autoprefixer