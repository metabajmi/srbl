# Saudi Personal Data Protection Compliance Tool

## Overview

This is a comprehensive web application designed to assist organizations in achieving and maintaining compliance with Saudi Arabia's Personal Data Protection Law (PDPL). The platform integrates AI-powered tools for website scanning, privacy policy generation, terms & conditions generation, consent management, and internal compliance management. It features an Arabic-first design with RTL support and professional legal/compliance styling, leveraging OpenAI's GPT models for intelligent document generation and compliance analysis.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

The frontend is built with React and TypeScript using Vite. It utilizes shadcn/ui components (Radix UI primitives) with Tailwind CSS for styling, adhering to a hybrid Fluent Design and Material Design aesthetic optimized for legal contexts, featuring Arabic-first typography (Cairo font) and RTL support. State management is handled by TanStack Query, and client-side routing by wouter. Form handling is managed by react-hook-form with Zod validation.

### Backend

The backend is developed with Express.js on Node.js, supporting a RESTful API architecture. It integrates extensively with OpenAI's GPT-4o model for AI capabilities such as:
- **Website Analysis**: Identifies PDPL compliance violations, references Saudi regulations, and suggests remediation.
- **Privacy Policy Generation**: Creates comprehensive, 12-section PDPL-compliant privacy policies based on the official SDAIA template, including advanced fields and Arabic date formatting.
- **Terms & Conditions Generation**: Produces tailored terms documents.
- **Compliance Analysis**: Provides recommendations for internal compliance.
Secure content fetching includes URL validation, protocol restrictions, and IP blocking.

### Data Storage

The application uses PostgreSQL as its database, with Drizzle ORM for type-safe operations. The schema includes tables for compliance scans, issues, reports, remediation templates, policy documents, terms documents, consent records, and compliance tasks, with appropriate foreign key relationships and cascade delete configurations. Session management is handled by `connect-pg-simple` for PostgreSQL-backed sessions.

## External Dependencies

- **AI Service**: OpenAI API (GPT-4o model) for intelligent content generation and analysis.
- **Database**: PostgreSQL, accessed via `@neondatabase/serverless` driver. Drizzle Kit is used for schema management.
- **UI Component Libraries**: Radix UI, Tailwind CSS, Lucide React, Embla Carousel, date-fns.
- **Development Tools**: Vite, TypeScript, PostCSS with Autoprefixer.
- **Build & Runtime**: esbuild for production bundling, ESM for modules.

## Recent Changes (November 15, 2025)

### Privacy Policy Download Enhancement

**Problem**: Downloaded privacy policies appeared as plain unformatted text files, making them unprofessional and difficult to read. Additionally, there was a critical XSS security vulnerability where user/AI-generated content could inject malicious scripts.

**Solution**: Completely redesigned the download functionality to generate secure, professionally-formatted HTML documents.

**Security Improvements**:
- **XSS Protection**: Implemented HTML escaping for all user-generated and AI-generated content using DOM-based escaping
- **Safe Content Interpolation**: All dynamic fields (company name, dates, content) are sanitized before insertion into HTML
- **Secure Filename Generation**: Special characters in filenames are properly sanitized

**HTML Structure Improvements**:
- **Proper Section Handling**: Parser correctly opens and closes HTML `<div class="section">` elements
- **List Formatting**: Bullet points are converted to proper `<ul><li>` lists instead of headings
- **State Tracking**: Smart parser maintains inSection and inList states to ensure well-formed HTML
- **Heading Detection**: Automatically detects numbered sections (1., 2.) and Arabic subsections (أ), ب))

**Professional Design Features**:
- **Typography**: Cairo font family for beautiful Arabic text rendering
- **RTL Layout**: Complete right-to-left support for Arabic content
- **Color Scheme**: Professional blue gradient header with organized content sections
- **Responsive Design**: Mobile-friendly layout that adapts to all screen sizes
- **Print-Ready**: Optimized CSS for professional printing with proper page breaks
- **File Format**: Changed from `.txt` to `.html` with Arabic filename: `سياسة-الخصوصية-[company]-[date].html`

**User Experience Impact**:
- Documents are now professional and ready for immediate distribution
- Can be opened in any web browser without additional software
- Perfect for printing, emailing, or publishing on company websites
- Maintains professional appearance across all devices
- Secure against XSS attacks from malicious content