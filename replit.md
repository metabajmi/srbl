# Saudi Personal Data Protection Compliance Tool

## Overview
This project is a web application assisting organizations in complying with Saudi Arabia's Personal Data Protection Law (PDPL). It provides AI-powered tools for website scanning, generating privacy policies and terms & conditions, managing consent, and handling internal compliance. The application features an Arabic-first design with RTL support and professional legal/compliance styling, utilizing OpenAI's GPT models for intelligent document generation and compliance analysis. The project aims to be a robust solution for PDPL adherence, targeting organizations interacting with Saudi Arabian data subjects.

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

### Technical Implementations & Feature Specifications
The application includes a fully functional Internal Compliance Management module with ROPA, DSAR, and DPIA tools. The ROPA management supports dynamic multi-recipient management and various data types. The DPIA tool handles complex compliance assessments with dynamic fields for data types, identified risks, and mitigation measures.

**Terms & Conditions Generator (Hybrid System):**
Backend architecture complete and verified (tested via curl): junction tables (termsTemplateSections, termsSectionSources), seed data (6 templates × 8 sections, 6 legal sources), storage layer with SQL aggregation, OpenAI integration. Generation pipeline (`processTermsGeneration`) successfully creates 3,300+ character HTML documents with Cairo font, RTL layout, and professional formatting. Frontend UI built with 4-section multi-step form (Company Info → Service Details → Legal Info → Contact), react-hook-form validation, generating/completed states, and HTML content preview with download functionality. Minor state management issue under investigation: mutation response may not properly propagate document ID to polling query, requiring live debugging with user access to browser console.

## External Dependencies

-   **AI Service**: OpenAI API (GPT-4o model)
-   **Database**: PostgreSQL (`@neondatabase/serverless` driver)
-   **UI Component Libraries**: Radix UI, Tailwind CSS, Lucide React, Embla Carousel, date-fns
-   **Development Tools**: Vite, TypeScript, PostCSS with Autoprefixer