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

**Website Scanner (Deterministic Rule-Based):**
- **100% Deterministic Analysis:** Eliminates AI hallucinations by using rule-based evaluation instead of AI for compliance scanning.
- **Puppeteer-Powered Extraction:** Uses headless Chromium browser for runtime JavaScript execution, cookie collection, and network request monitoring.
- **Comprehensive Data Extraction:**
  - Cookies: First-party, third-party, security flags (Secure, HttpOnly, SameSite), categorization (analytics, marketing, necessary)
  - Scripts: Inline and external, async/defer attributes, position (head/body)
  - Tracking Technologies: Detection of 30+ trackers (Google Analytics, Meta Pixel, TikTok, Hotjar, etc.)
  - Forms: Personal data field detection (name, email, phone, ID, financial, health)
  - Third-Party Services: CDN, analytics, payment, advertising, social media detection
  - Security Headers: HTTPS, HSTS, CSP, X-Frame-Options, Referrer-Policy
- **PDPL Rule Engine:** 12+ deterministic rules mapped to specific PDPL articles (Art 4, 5, 6, 12, 17, 19, 29):
  - Privacy Policy presence and accessibility
  - Cookie consent mechanisms
  - Data collection transparency
  - Cross-border data transfer disclosure
  - Security requirements (HTTPS, HSTS, cookie security)
  - Contact information availability
- **Structured Output:** Returns consistent JSON with exact evidence, rule evaluations, and scoring breakdown.
- **Scoring System:** Starts from 100, deducts based on severity (critical: 15pts, warning: 8pts, suggestion: 3pts). Levels: High ≥80%, Medium 50-79%, Low <50%.
- **Modular Architecture:**
  - `server/scanner/browser.ts`: Puppeteer lifecycle management
  - `server/scanner/extractors.ts`: Data extraction functions
  - `server/scanner/pagesDiscovery.ts`: Automatic legal page discovery from footer/nav/sitemap
  - `server/scanner/policyParser.ts`: Policy content parser with PDPL section mapping
  - `server/scanner/cookieBannerAnalyzer.ts`: Deep cookie banner behavior analysis
  - `server/scanner/pdplEvaluator.ts`: Comprehensive PDPL rule evaluation with evidence
  - `server/scanner/comprehensiveScanner.ts`: Main orchestrator for comprehensive scans
  - `server/rules/pdpl-rules.ts`: PDPL rule definitions and evaluators
  - `server/services/complianceAnalyzer.ts`: Orchestration pipeline
- **Comprehensive Scan API:** `POST /api/comprehensive-scan` provides full PDPL analysis with:
  - Automatic discovery of all legal pages (privacy, terms, cookies, refund policies)
  - Deep policy content parsing and PDPL requirement mapping
  - Cookie banner presence and behavior analysis
  - 19+ PDPL rule evaluations with pass/partial/fail results
  - Structured JSON output with evidence pointers and recommendations
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

**Compliance Requirements Knowledge Base (v3.0 - Dec 2025):**
The compliance requirements knowledge base (`server/knowledge/pdpl/compliance-requirements.json`) contains 21 sections of regulatory requirements extracted from 22+ official Saudi regulatory documents:
- **E-Commerce Compliance Checklist:** 20-point self-assessment from Ministry of Commerce (Jan 2022)
- **Privacy Policy Requirements:** 11 mandatory elements from SDAIA Privacy Policy Guideline (Aug 2024)
- **Minimum Data Requirements:** 6 principles + 3 controller obligations from Data Minimization Guideline (Aug 2024)
- **Data Subject Rights:** 5 rights from PDPL Article 4
- **Cookie Consent Requirements:** 4 requirements from PDPL Implementing Regulations
- **Terms & Conditions Requirements:** 8 requirements from E-Commerce Law
- **Cookie Policy Requirements:** 7 requirements from PDPL Article 12
- **Return/Refund Policy Requirements:** 8 requirements from E-Commerce Law Article 13
- **Legal Basis for Processing:** 10 legal bases from PDPL Articles 5, 6, and 10
- **Consumer Rights:** 7 rights from Ministry of Commerce Consumer Guide
- **Data Protection Officer (DPO) Requirements:** 3 mandatory appointment cases, 5 large-scale processing criteria, 6 DPO tasks, 3 documentation requirements from SDAIA DPO Guidelines
- **Cross-Border Data Transfer Requirements:** 3 appropriate safeguards, 5 exemption cases, 6 risk assessment elements from PDPL Article 29 and Transfer Regulations
- **Data Sharing Policy Requirements:** 8 principles, 6 general rules, 3 data retention rules from SDAIA Data Sharing Policy
- **Arabic/English Keywords:** Comprehensive keyword lists for pattern matching including cross-border, DPO, and data sharing terms

## External Dependencies

-   **AI Service**: OpenAI API (GPT-4o model)
-   **Database**: PostgreSQL (`@neondatabase/serverless` driver)
-   **UI Component Libraries**: Radix UI, Tailwind CSS, Lucide React, Embla Carousel, date-fns
-   **Development Tools**: Vite, TypeScript, PostCSS with Autoprefixer