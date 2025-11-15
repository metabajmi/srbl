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

## Recent Changes (November 15, 2025)

### Internal Compliance Module - COMPLETED ✅

**Achievement**: Fully functional Internal Compliance Management module with ROPA and DSAR tools ready for production use.

**Implementation Details**:
1. **Database Schema**: Complete PostgreSQL schema for ROPA, DSAR, and DPIA with proper relationships and cascade deletes
2. **Backend APIs**: Full CRUD operations for all three tools with Zod validation and security enhancements
3. **Frontend Pages**: 
   - Unified dashboard at `/internal-compliance`
   - ROPA Management at `/internal-compliance/ropa`
   - DSAR Management at `/internal-compliance/dsar`
4. **Security**: Fixed critical vulnerability where PUT endpoints bypassed validation; added dedicated update schemas with `.strict()` mode

**Critical Bug Fix**:
- **Problem**: All create/update/delete mutations failed due to incorrect `apiRequest` usage
- **Root Cause**: Called as `apiRequest(url, {method, body})` instead of correct signature `apiRequest(method, url, data)`
- **Impact**: Complete failure of ROPA and DSAR creation/editing
- **Solution**: Fixed all mutation calls in RopaManagementPage.tsx and DsarManagementPage.tsx
- **Testing**: E2E tests verify both ROPA and DSAR creation work successfully

**Features Verified (E2E Tested)**:
- ✅ ROPA entry creation with department, purpose, legal basis, retention period
- ✅ DSAR request creation with requester info, request type, details
- ✅ Navigation between all compliance pages
- ✅ Status filtering in DSAR (new/in_progress/completed/rejected)
- ✅ Form validation with Arabic error messages
- ✅ Toast notifications on success/error
- ✅ Query cache invalidation after mutations
- ✅ RTL support across all pages
- ✅ Professional Arabic-first interface

**User Impact**:
- Organizations can maintain complete PDPL compliance records
- 30-day DSAR response tracking ensures regulatory compliance
- Export capabilities infrastructure ready (CSV/PDF buttons present)
- All compliance data persisted in PostgreSQL database
- Production-ready for Saudi Arabian organizations

### ROPA Management Enhancement - November 15, 2025 ✅

**Achievement**: Production-ready ROPA form with full support for dataTypes fields and dynamic multi-recipient management.

**Implementation Details**:
1. **Schema Enhancement**: 
   - Added `category` and `isSensitive` fields to dataTypes
   - Supports multiple dataRecipients with name, purpose, location
   - Optional fields handled correctly

2. **useFieldArray Integration**:
   - Dynamic add/remove recipients functionality
   - Preserves all recipient data during edit operations
   - Guards against undefined fields from useFieldArray

3. **Bug Fixes**:
   - Validation refine guards all `.trim()` calls with `?? ""`
   - onSubmit normalizes and preserves all recipient fields
   - No data loss when editing multi-recipient entries
   - No crashes from undefined field access

4. **E2E Testing Results**:
   - ✅ Create ROPA entry with multiple recipients
   - ✅ Edit entry - modify department and remove recipients
   - ✅ Delete entry
   - ✅ All API calls successful (POST, PUT, DELETE)
   - ✅ UI updates correctly with toast notifications

**Technical Details**:
- Form uses react-hook-form with useFieldArray
- Zod validation with refine for cross-field validation
- TanStack Query for API calls and cache management
- Sends `undefined` instead of `[]` for empty arrays (preserves backend behavior)

### DPIA Tool Implementation - November 15, 2025 ✅

**Achievement**: Complete Data Protection Impact Assessment (DPIA) tool with advanced form handling for complex compliance assessments.

**Implementation Details**:
1. **Legal Article Corrections** (Final Update):
   - ROPA: المادة ٣١ من نظام حماية البيانات الشخصية
   - DSAR: المواد ٥ و ٦ و ٧ و ٨ من اللائحة التنفيذية لنظام حماية البيانات الشخصية
   - DPIA: المادة (٢٥) من اللائحة التنفيذية لنظام حماية البيانات الشخصية
   - Updated status from "قريباً" to "متاح" in dashboard

2. **Complex Form Structure**:
   - Project information (name, description, department)
   - Dynamic dataTypes array with useFieldArray (name, category, volume, sensitivity)
   - Data subjects and processing justification
   - Dynamic identifiedRisks array (risk, likelihood, impact, severity)
   - Dynamic mitigationMeasures array (measure, effectiveness, status)
   - Individual impact assessment
   - DPO consultation tracking
   - Final decision and rationale
   - Status workflow (draft/under_review/completed)
   - Overall risk level (low/medium/high/critical)

3. **Critical Bug Fix - Attachments Data Loss**:
   - **Problem**: handleEdit reset attachments to empty array `[]`
   - **Impact**: Existing attachments were wiped on update
   - **Solution**: Preserve existing attachments: `assessment.attachments && Array.isArray(assessment.attachments) ? assessment.attachments : []`
   - **Architect Review**: PASS after fix

4. **E2E Testing Results**:
   - ✅ Create DPIA assessment with all required fields
   - ✅ Edit assessment - modify department
   - ✅ Delete assessment
   - ✅ All API calls successful (POST, PUT, DELETE 200)
   - ✅ Dialog interactions working correctly
   - ✅ Success toast notifications

**Production Features**:
- Full CRUD operations for DPIA assessments
- Three useFieldArray implementations for dynamic arrays
- Comprehensive Zod validation matching backend schema
- Status badges (draft/under_review/completed) with Arabic labels
- Risk level badges (low/medium/high/critical) with color coding
- Data preservation on edit (no data loss)
- TanStack Query cache invalidation
- Professional Arabic RTL interface
- Export infrastructure ready (buttons present)

**User Impact**:
- Organizations can conduct PDPL-compliant DPIAs per المادة (٢٥)
- Track high-risk processing activities systematically
- Document risk mitigation measures
- Maintain audit trail for regulatory compliance
- Complete Internal Compliance Module now fully operational

### Terms & Conditions Template System - November 15, 2025 🚧 IN PROGRESS

**Achievement**: Advanced hybrid T&C generation system using database templates + OpenAI customization, all anchored to Saudi legal sources.

**Architecture Decision**:
- **Hybrid Approach**: Pre-assembled mandatory clauses from database templates with placeholder replacement + OpenAI enhancement
- **Legal Compliance**: All templates extracted from official Saudi legal documents (E-commerce System, ERECS, Telecom regulations, MCI Consumer Rights)
- **Template-Based**: Structured sections with legal citations vs. pure AI generation
- **Business Classification**: ENUM-based system for precise template selection

**Implementation Details**:

1. **Database Schema** (3 new tables):
   - `legal_sources`: Source documents (E-commerce System, ERECS, Telecom Act, etc.)
   - `terms_templates`: Business-type templates (ecommerce_general, telecommunications, digital_services, etc.)
   - `template_sections`: Reusable legal clauses with placeholders ({{company_name}}, {{commercial_registration}}, etc.)
   - Relationships: templates → sections (many-to-many), sections → legal_sources (many-to-many)

2. **Business Type ENUMs**:
   ```typescript
   business_type: ecommerce_general | ecommerce_automotive | ecommerce_fashion | 
                  telecommunications | digital_services | financial_services
   activity_scale: micro | smb | enterprise
   ```

3. **Seed Data Loaded** (via server/seedTermsTemplates.ts):
   - 6 legal sources with article mappings
   - 6 T&C templates for different business types
   - 8 template sections: introduction, merchant info, services, payment, shipping, refund rights, liability, dispute resolution
   - All sections include legal citations (e.g., "نظام التجارة الإلكترونية - المادة ٥, ٦, ٧")

4. **Storage Layer Enhancement** (15 new methods):
   - Legal sources: create, get, list, update, delete
   - Templates: create, get, list, update, delete, getByBusinessType
   - Sections: create, get, list, update, delete

5. **Generation Pipeline** (server/routes.ts processTermsGeneration):
   - Step 1: Fetch template by business type
   - Step 2: Load associated sections with legal citations
   - Step 3: Replace placeholders ({{company_name}}, {{tax_number}}, {{website_url}}, etc.)
   - Step 4: Pass to OpenAI with template sections as examples
   - Step 5: OpenAI customizes based on business specifics while preserving legal compliance

6. **OpenAI Integration** (server/openai.ts):
   - Updated `TermsDocumentData` interface with new fields:
     - `shippingPolicy`, `returnPolicy`, `deliveryTimeframe`
     - `contactPhone`, `commercialRegistration`, `taxNumber`, `licenseNumber`
     - `templateSections`, `templateMetadata` for template-based generation
   - Enhanced `generateTermsAndConditions` prompt:
     - Includes template sections as examples
     - Legal citations preserved in output
     - Placeholder replacement guidance
     - Saudi regulatory compliance instructions

**Technical Features**:
- Template sections support placeholders: {{company_name}}, {{commercial_registration}}, {{email}}, {{phone}}
- Legal basis tracking: Each section links to source articles (e.g., ERECS المادة ١٥)
- Fallback logic: If no template found, uses default sections
- HTML formatting in output with proper RTL structure

**Status**: Backend implementation complete. Pending:
- API endpoints for template listing (/api/terms/templates)
- Frontend form updates for business type/sector/scale selection
- Frontend validation using new ENUMs

**User Impact**:
- Organizations get legally compliant T&C based on actual Saudi regulations
- Template-based approach ensures mandatory clauses are never missed
- AI customization adds business-specific details while maintaining legal accuracy
- Full traceability to legal sources (E-commerce System, Telecom regulations, etc.)
- Reduced generation time and improved consistency vs. pure AI generation