# Saudi Personal Data Protection Compliance Tool

## Overview
This project is a web application designed to assist organizations in complying with Saudi Arabia's Personal Data Protection Law (PDPL). It provides AI-powered tools for website scanning, generating privacy policies and terms & conditions, and managing internal compliance. The application features an Arabic-first, RTL-supported design and leverages OpenAI's GPT models for intelligent document generation and compliance analysis. The primary goal is to offer a robust, AI-driven solution for PDPL adherence for any entity handling data subjects in Saudi Arabia.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The application utilizes an Arabic-first design with full RTL support, blending Fluent Design and Material Design principles. The Cairo font is used for typography, and UI components feature a green color scheme. Downloadable documents are generated as professionally formatted, print-ready HTML files with responsive RTL layouts and XSS protection. The MVP focuses on the public-facing Scanner feature, with other functionalities marked as "Coming Soon" for general users, while remaining accessible for admin testing.

### Technical Implementations
The frontend is built with React, TypeScript, Vite, shadcn/ui components (Radix UI primitives), and Tailwind CSS, using TanStack Query for state management, wouter for routing, and react-hook-form with Zod validation. The backend is an Express.js Node.js application, exposing a RESTful API. It integrates with OpenAI's GPT-4o for AI capabilities like PDPL violation analysis and document generation. Secure content fetching is implemented with URL validation and IP blocking. PostgreSQL is the primary database, managed with Drizzle ORM. Session management uses `connect-pg-simple`.

Key features include:
- **Unified Compliance Workspaces:** Tab-based interfaces for Privacy Policy/Terms Generators and Internal Compliance tools (ROPA, DSAR, DPIA).
- **Website Scanner (Deterministic Rule-Based):**
    - Employs Puppeteer for headless browser operation to extract cookies, scripts, tracking technologies, forms, and third-party services.
    - Handles Single Page Applications (SPAs) by extracting content from the rendered DOM.
    - Utilizes a PDPL Rule Engine with 12+ deterministic rules mapped to specific PDPL articles for compliance evaluation.
    - Generates a compliance score based on Privacy Policy and Terms & Conditions.
    - Provides a comprehensive scan API (`POST /api/comprehensive-scan`) for deep PDPL analysis, including legal page discovery, policy content parsing, cookie banner analysis, gap analysis (tracking vs. disclosures), and a 12-point PDPL mandatory requirements checklist.
    - Supports export functionality for PDF/HTML/JSON reports.
- **Terms & Conditions Generator:** A hybrid system combining backend logic with OpenAI integration and a multi-step frontend form.
- **Smart Customer Assistant:** A RAG-based chatbot leveraging PostgreSQL with `pgvector` for semantic search, using OpenAI's `text-embedding-3-small` model. The knowledge base includes PDPL articles, FAQs, and service guides.
- **Client Authentication System (Passwordless OTP):** Users authenticate via email OTPs. Implements rate limiting and secures session management. Anonymous scans are automatically linked to user accounts upon registration/login.
- **Admin & Client Portal Separation:** Distinct, secure portals with route protection and role-based access control. The client dashboard displays scan results, violations, and generated policies.
- **Payment Integration (Geidea):** Integrated with Geidea payment gateway for processing payments using Mada, Visa, and Mastercard. Uses server-side session creation (`POST /api/geidea/session`) with Basic Auth, Geidea Checkout V2 JS SDK for frontend popup, and server-side callback verification (`POST /api/geidea/callback`). Payment status can also be verified via `POST /api/geidea/verify`.
- **Compliance Requirements Knowledge Base:** A comprehensive internal knowledge base (`server/knowledge/pdpl/compliance-requirements.json`) containing 21 sections of regulatory requirements extracted from 22+ official Saudi regulatory documents, including e-commerce, privacy policy, data minimization, data subject rights, cookie consent, DPO, and cross-border data transfer guidelines, with Arabic/English keywords.

## External Dependencies

-   **AI Service**: OpenAI API (GPT-4o model)
-   **Database**: PostgreSQL (`@neondatabase/serverless` driver)
-   **UI Component Libraries**: Radix UI, Tailwind CSS, Lucide React, Embla Carousel, date-fns