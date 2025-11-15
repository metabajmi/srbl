# Saudi Personal Data Protection Compliance Tool

## Overview
This project is a comprehensive web application designed to help organizations comply with Saudi Arabia's Personal Data Protection Law (PDPL). It features AI-powered tools for website scanning, generating privacy policies and terms & conditions, managing consent, and internal compliance. The application boasts an Arabic-first design with RTL support and professional legal/compliance styling, utilizing OpenAI's GPT models for intelligent document generation and compliance analysis. The project aims to provide a robust solution for PDPL adherence, offering significant market potential for organizations operating within or interacting with Saudi Arabian data subjects.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend is built with React and TypeScript using Vite, featuring shadcn/ui components (Radix UI primitives) and Tailwind CSS. It adheres to a hybrid Fluent Design and Material Design aesthetic, optimized for legal contexts with Arabic-first typography (Cairo font) and RTL support. State management is handled by TanStack Query, client-side routing by wouter, and form handling by react-hook-form with Zod validation. Key features include a professional Cookie Banner with granular consent management, a Consent Management Platform (CMP) Dashboard for CRUD operations on settings and scripts, and a Preferences Center for users to manage their consent.

### Backend
The backend utilizes Express.js on Node.js, implementing a RESTful API. It integrates with OpenAI's GPT-4o for AI capabilities such as website analysis for PDPL violations, comprehensive privacy policy generation based on SDAIA templates, terms & conditions generation, and internal compliance analysis. Secure content fetching is ensured through URL validation, protocol restrictions, and IP blocking. The backend also supports full CRUD operations for internal compliance modules like ROPA, DSAR Management, and DPIA, with robust Zod validation and security enhancements for data integrity.

### Data Storage
PostgreSQL serves as the primary database, managed with Drizzle ORM for type-safe operations. The schema includes tables for compliance scans, issues, reports, remediation templates, policy/terms documents, consent records, and internal compliance tasks (ROPA, DSAR, DPIA), with appropriate relationships and cascade delete configurations. Session management is handled by `connect-pg-simple`.

### UI/UX Decisions
The application prioritizes an Arabic-first design with full RTL support. It uses professional legal/compliance styling with a hybrid Fluent Design and Material Design aesthetic. Typography uses the Cairo font. UI components are designed for clarity and ease of use, with features like professional cookie banners, clear consent management dialogs, and a preferences center that offers transparency and user control. Downloaded documents are securely generated as professionally formatted HTML files with Cairo font, RTL layout, and responsive design, ensuring XSS protection and print-readiness.

## External Dependencies

-   **AI Service**: OpenAI API (GPT-4o model)
-   **Database**: PostgreSQL (`@neondatabase/serverless` driver)
-   **UI Component Libraries**: Radix UI, Tailwind CSS, Lucide React, Embla Carousel, date-fns
-   **Development Tools**: Vite, TypeScript, PostCSS with Autoprefixer
-   **Build & Runtime**: esbuild, ESM