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

**AI Integration**: Uses OpenAI's GPT-4o model for multiple intelligent features:
- **Website Analysis**: Analyzes HTML content for PDPL compliance, identifies violations across categories, references specific articles from Saudi regulations, provides remediation guidance
- **Privacy Policy Generation**: Creates comprehensive, PDPL-compliant privacy policies following the official SDAIA template with 12 detailed sections covering all regulatory requirements:
  * **Complete Form Fields**: All fields from the official SDAIA template are now fully integrated in the privacy policy generator:
    - **Basic Company Information**: companyName, websiteUrl, businessType, licenseNumber, responsibleDepartment, address
    - **Contact Information**: contactEmail, contactPhone
    - **Data Collection**: dataTypes (array), dataCollectionMethods, indirectDataSources
    - **Data Usage**: dataUsagePurposes (array), dataUsageDetails
    - **Third Party Sharing**: hasThirdPartySharing, thirdPartyCategories, disclosureDetails
    - **Storage & Security**: storageLocation, retentionPeriod, securityMeasures
    - **Data Protection Officer**: dpoName, dpoEmail, dpoPhone, dpoAddress
    - **Metadata**: lastUpdatedDate (with proper Arabic date formatting)
  * **12-Section Structure (Official SDAIA Template)**: 
    1. **Introduction & Privacy Commitment** - Company introduction with business type, license, and responsible department
    2. **How is your personal data collected and what is the purpose?** - Collection methods (direct & indirect), data types collected, indirect sources
    3. **How do we use your personal data?** - Detailed usage purposes with specific details
    4. **How do we disclose your personal data?** - Third party sharing status, categories, and disclosure details
    5. **Legal grounds for collecting and processing** - Legal basis including consent, contract, legal obligation, legitimate interest, vital interests
    6. **How do we store your personal data?** - Storage location, retention period, comprehensive security measures
    7. **Your rights regarding personal data processing** - 6 specific rights defined by PDPL:
       - Right to know (awareness of collection, processing, storage, and disclosure methods)
       - Right to access your personal data (request to view and understand usage)
       - Right to obtain your personal data (get a readable copy)
       - Right to correct your personal data (fix inaccurate or incomplete data)
       - Right to delete your personal data (request deletion in certain circumstances)
       - Right to withdraw consent (revoke consent at any time)
    8. **Data Protection Officer information** - Full contact details (name, email, phone, address) and role description
    9. **How to file a complaint or objection?** - Complete complaint process with contact channels and 30-day response commitment
    10. **SDAIA contact details** - Full SDAIA information (Address in Riyadh, sdaia.gov.sa, dgp.sdaia.gov.sa)
    11. **Policy updates** - Update notification process with last update date
    12. **Final contact information** - Complete company contact information for inquiries
  * **Smart Validation**: Handles nullable fields gracefully with preprocessing to prevent invalid dates and fallback values ('غير محدد') for empty optional fields
  * **Type Safety**: Fully typed PolicyDocumentData interface with proper validation using Zod schemas
  * **Date Formatting**: Arabic date formatting (e.g., "١٤ نوفمبر ٢٠٢٥") for lastUpdatedDate field
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
- OpenAI API (GPT-4o model) for compliance analysis and report generation
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

## Recent Changes (November 15, 2025)

### Privacy Policy Generator Complete Rebuild

**Problem Addressed**: The privacy policy generator needed to be rebuilt completely to follow a comprehensive PDF-based questionnaire template that aligns with Saudi PDPL requirements, and upgraded to use GPT-4o for higher quality output.

**Changes Implemented**:

1. **Schema Updates** (shared/schema.ts):
   - Completely redesigned PolicyDocument schema with 50+ fields covering all PDPL requirements
   - Organized into logical sections: Entity Information, Data Collection, Data Processing, User Rights, Storage & Security, Cookies & Updates, Complaints
   - Added support for complex arrays: dataCategories, thirdPartyDetails, securityMeasures, cookieTypes
   - All fields properly typed with Zod validation schemas

2. **Frontend Complete Rebuild** (client/src/pages/PrivacyGeneratorPage.tsx):
   - Rebuilt entire form interface from scratch with 3 main sections using Accordion components
   - **Section 1 - Entity Identity**: Company info, contact details, DPO information, sensitive data handling
   - **Section 2 - Data Collection**: Collection methods, data categories with legal basis, third-party sharing, international transfers, user rights exercise methods
   - **Section 3 - Additional Details**: Storage location & retention, security measures, breach notification, cookies, complaints, SDAIA contact
   - Implemented step-by-step navigation between sections
   - Added dynamic field arrays for data categories, third parties, security measures, and cookies
   - Comprehensive form validation using react-hook-form with Zod
   - Auto-polling for policies with "generating" or "pending" status

3. **Backend Updates** (server/routes.ts, server/openai.ts):
   - Updated processPrivacyPolicyGeneration to handle full PolicyDocument with all new fields
   - Completely rewrote generatePrivacyPolicy function with comprehensive Arabic prompt covering all PDPL sections
   - Upgraded all OpenAI API calls from GPT-3.5-turbo to GPT-4o for:
     * Website compliance analysis (analyzeWebsiteCompliance)
     * Compliance report generation (generateComplianceReport)
     * Regulation reference extraction (extractRegulationReferences)
     * Privacy policy generation (generatePrivacyPolicy)
     * Terms & conditions generation (generateTermsAndConditions)
   - Enhanced prompt to generate complete 12-section PDPL-compliant policies

4. **Testing & Validation**:
   - Completed end-to-end testing using Playwright
   - Verified successful policy creation, generation, and status progression
   - Confirmed GPT-4o integration working correctly
   - All frontend-backend integrations validated

**Technical Details**:
- GPT-4o provides significantly better Arabic language generation and legal compliance understanding
- Form handles complex nested data structures (arrays of objects with validation)
- Backend processes generation asynchronously with status updates
- Storage layer properly persists all new fields to PostgreSQL database

**User Experience Impact**:
- Users now have a comprehensive form covering all PDPL requirements
- Step-by-step interface makes complex data entry manageable
- Generated policies are significantly more detailed and compliant with Saudi regulations
- Automatic status updates show generation progress in real-time
- Higher quality AI-generated content using GPT-4o