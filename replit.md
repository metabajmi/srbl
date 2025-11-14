# Saudi Personal Data Protection Compliance Tool

## Overview

This is a comprehensive web application that helps organizations achieve compliance with Saudi Arabia's Personal Data Protection Law (PDPL). The platform combines AI-powered website scanning with four additional compliance tools:

1. **Website Compliance Scanner**: AI-powered analysis that scans websites, identifies compliance violations, and generates detailed reports with remediation guidance
2. **Privacy Policy Generator**: AI-powered tool to create PDPL-compliant privacy policies tailored to your organization
3. **Terms & Conditions Generator**: Create comprehensive, legally-sound terms and conditions for websites and services
4. **Consent Management Platform**: Track, manage, and audit user consent records with full compliance documentation
5. **Internal Compliance Management**: Organize and track internal compliance tasks, audits, and reviews

The application is designed with an Arabic-first approach, featuring RTL (right-to-left) support and professional legal/compliance interface styling. All features integrate seamlessly with OpenAI's GPT models for intelligent document generation and compliance analysis.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool and development server.

**UI Framework**: The application uses shadcn/ui components (Radix UI primitives) with Tailwind CSS for styling. This provides a modern, accessible component library with extensive customization options through CSS variables.

**Design System**: Implements a hybrid approach between Fluent Design and Material Design principles, optimized for legal/compliance contexts. The design emphasizes:
- Clean, professional interfaces with information-dense layouts
- Arabic-first typography using Cairo font family
- RTL (right-to-left) layout support
- Consistent spacing system (4px, 8px, 16px, 24px, 32px, 48px)
- Color-coded severity indicators (critical/warning/suggestion)
- Card-based layouts for displaying compliance findings

**State Management**: Uses TanStack Query (React Query) for server state management, providing efficient data fetching, caching, and synchronization.

**Routing**: Implements wouter for lightweight client-side routing with the following pages:
- Home page showcasing all available tools and initiating scans
- Scan results page for viewing detailed compliance analysis
- Privacy Policy Generator page for creating AI-powered privacy policies
- Terms & Conditions Generator page for generating terms documents
- Consent Management page for tracking and managing user consents
- Internal Compliance page for organizing compliance tasks and audits

**Navigation**: Uses shadcn Sidebar component with collapsible navigation structure, organized into "Main Navigation" (scans) and "Tools" (generators, consent, compliance) sections.

**Form Handling**: Uses react-hook-form with Zod for validation and @hookform/resolvers for integration.

### Backend Architecture

**Server Framework**: Express.js running on Node.js with TypeScript support via tsx in development.

**API Design**: RESTful API architecture with endpoints for:
- Creating and managing compliance scans
- Retrieving scan results and issues
- Generating compliance reports

**AI Integration**: Uses OpenAI's GPT-3.5-turbo model for multiple intelligent features:
- **Website Analysis**: Analyzes HTML content for PDPL compliance, identifies violations across categories, references specific articles from Saudi regulations, provides remediation guidance
- **Privacy Policy Generation**: Creates comprehensive, PDPL-compliant privacy policies following the official SDAIA template with 12 detailed sections covering all regulatory requirements:
  * **Complete Form Fields**: All fields from the official SDAIA template including company info, contact details, data types, collection methods, usage details, disclosure details, third-party categories, storage location, security measures, DPO information, and last updated date
  * **12-Section Structure (Official SDAIA Template)**: 
    1. Introduction & Privacy Commitment
    2. How is your personal data collected and what is the purpose? (Direct & indirect collection with specific purposes)
    3. How do we use your personal data? (Detailed usage explanation with legal basis)
    4. How do we disclose your personal data? (Third parties, purpose, and safeguards)
    5. Legal grounds for collecting and processing your personal data (Consent, contract, legal obligation, legitimate interest, etc.)
    6. How do we store your personal data? (Location, duration, security measures)
    7. Your rights regarding personal data processing (6 specific rights):
       - Right to know (awareness of collection, processing, storage, and disclosure methods)
       - Right to access your personal data (request to view and understand usage)
       - Right to obtain your personal data (get a readable copy)
       - Right to correct your personal data (fix inaccurate or incomplete data)
       - Right to delete your personal data (request deletion in certain circumstances)
       - Right to withdraw consent (revoke consent at any time)
    8. Data Protection Officer information (Full contact details and role)
    9. How to file a complaint or objection? (Steps, channels, response time)
    10. SDAIA contact details (Address in Riyadh, sdaia.gov.sa, dgp.sdaia.gov.sa)
    11. Policy updates (How users are notified, last update date)
    12. Final contact information
  * **Smart Validation**: Handles nullable fields gracefully with preprocessing to prevent invalid dates and fallback values ('غير محدد') for empty optional fields
  * **Type Safety**: Fully typed PolicyDocumentData interface with proper validation using Zod schemas
- **Terms & Conditions Generation**: Generates comprehensive terms documents tailored to service type and business requirements
- **Compliance Analysis**: Evaluates internal compliance posture and provides improvement recommendations

**Content Fetching**: Implements secure website content retrieval with:
- URL validation to prevent SSRF attacks
- Protocol restrictions (HTTP/HTTPS only)
- Internal IP blocking
- 30-second timeout protection

### Data Storage Solutions

**ORM**: Drizzle ORM for type-safe database operations with PostgreSQL dialect support.

**Database Schema**: Designed with eight main tables:
- `compliance_scans`: Stores scan metadata, status, scores, and analysis results (includes timestamps, error messages)
- `compliance_issues`: Stores individual violations found during scans (cascade delete on scan removal)
- `reports`: Stores generated compliance reports (cascade delete on scan removal)
- `remediation_templates`: Stores reusable remediation guidance templates
- `policy_documents`: Stores AI-generated privacy policies with full content and metadata (version tracking, status)
- `terms_documents`: Stores AI-generated terms & conditions documents with versioning support
- `consent_records`: Tracks user consent records with timestamps, IP addresses, and consent scope details
- `compliance_tasks`: Manages internal compliance tasks with status tracking, assignments, and due dates

**Current Implementation**: Phase 2 completed - Fully migrated to persistent PostgreSQL storage using DatabaseStorage class with Drizzle ORM. Previous in-memory storage replaced with production-ready database implementation.

**Database Relations**: Properly configured with foreign key constraints:
- `compliance_issues` → `compliance_scans` (Many-to-One with cascade delete)
- `reports` → `compliance_scans` (Many-to-One with cascade delete)
- `compliance_issues` → `remediation_templates` (Many-to-One optional reference)

**Session Management**: Configured to use connect-pg-simple for PostgreSQL-backed session storage.

### External Dependencies

**AI Service**: 
- OpenAI API (GPT-5 model) for compliance analysis and report generation
- Requires OPENAI_API_KEY environment variable

**Database**: 
- PostgreSQL via Neon serverless driver (@neondatabase/serverless)
- Requires DATABASE_URL environment variable
- Drizzle Kit for schema management and migrations

**UI Component Libraries**:
- Radix UI primitives for accessible components
- Tailwind CSS for utility-first styling
- Lucide React for icons
- Embla Carousel for carousel functionality
- date-fns for date manipulation

**Development Tools**:
- Vite plugins for Replit integration (runtime error overlay, cartographer, dev banner)
- TypeScript for type safety
- PostCSS with Autoprefixer for CSS processing

**Build & Runtime**:
- esbuild for server-side bundling in production
- ESM module system throughout the application