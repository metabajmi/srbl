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

### Cookie Banner Component Implementation

**Achievement**: Built a fully functional Cookie Banner with granular consent management, Arabic RTL support, and seamless integration with the CMP backend.

**Features Implemented**:
- **Cookie Banner UI**: Professional, non-intrusive banner displayed at bottom of page with Arabic RTL layout
- **Three Action Buttons**: Accept All, Reject All, and Customize with clear Arabic labels
- **Granular Consent Dialog**: Modal allowing users to customize consent for 4 categories:
  - Necessary cookies (always enabled, non-toggleable)
  - Analytics cookies (optional)
  - Marketing cookies (optional)
  - Performance cookies (optional)
- **Consent Persistence**: User preferences saved to localStorage with 1-year validity
- **Backend Integration**: Automatic consent recording via POST /api/cmp/consent with anonymous user tracking
- **Smart Display Logic**: Banner shown only to new visitors, hidden after consent given

**Technical Implementation**:
- **CookieBanner Component** (`client/src/components/CookieBanner.tsx`): Reusable React component with state management
- **useConsent Hook** (`client/src/hooks/useConsent.ts`): Custom hook managing consent state, localStorage, and API communication
- **Anonymous ID Generation**: Unique identifier created per browser for privacy-preserving audit trail
- **Settings Integration**: Banner text and links loaded from CMP settings with sensible defaults
- **Single Submission Fix**: Eliminated duplicate POST requests in reject-all flow

**Testing**:
- End-to-end tests verified all user flows work correctly
- Accept All: All categories saved as "accepted"
- Reject All: Only necessary saved as "accepted", others as "rejected"
- Customize: User selections properly saved and persisted
- Single POST request per action (no duplicates)
- Banner persistence across page reloads
- localStorage integration working correctly

**User Experience Impact**:
- Fully PDPL-compliant consent collection mechanism
- Arabic-first interface with complete RTL support
- Non-intrusive design that doesn't block content
- Clear options for users to control their privacy
- Persistent consent reduces repeated prompts
- Professional appearance matching compliance platform aesthetic

### CMP Dashboard Implementation

**Achievement**: Built a complete Consent Management Platform (CMP) Dashboard with full CRUD operations, Arabic RTL support, and professional UI.

**Features Implemented**:
- **Settings Management**: Customizable banner title, description, privacy policy URL, and terms URL with full validation
- **Script Management**: Add, edit, and delete scripts with categories (necessary/analytics/marketing/performance), script types (inline/external), and position control
- **Snippet Generation**: Ready-to-use JavaScript snippet for embedding CMP into websites
- **Data Transformation**: Helper functions (booleanToEnabled/enabledToBoolean) ensure consistent conversion between UI boolean values and database "yes"/"no" storage
- **Error Handling**: Comprehensive error handling with destructive toasts showing actual backend error messages
- **Toast Messaging**: Context-aware success/failure toasts using onMutate pattern to capture operation type before state changes

**Technical Implementation**:
- **Form Management**: react-hook-form with Zod validation for robust client-side validation
- **State Management**: TanStack Query for efficient data fetching and caching
- **UI Components**: shadcn/ui components with custom Arabic labels and RTL layout
- **Mutation Pattern**: onMutate context preservation ensures accurate toast messaging even when component state changes
- **Dialog Behavior**: Forms preserve user input on validation failures, preventing data loss

**Testing**:
- End-to-end tests verified all CRUD operations work correctly
- Settings save and load properly
- Scripts can be added, edited, and deleted
- Snippet copy functionality works
- All error states display appropriate feedback

**User Experience Impact**:
- Arabic-first interface with complete RTL support
- Professional legal/compliance aesthetic
- Clear feedback for all user actions
- Persistent forms prevent accidental data loss
- Test-friendly with comprehensive data-testid attributes

### Preferences Center Implementation

**Achievement**: Built a comprehensive Preferences Center allowing users to view, modify, and withdraw their cookie consent at any time, with full Arabic RTL support and professional accessibility-focused design.

**Features Implemented**:
- **Standalone Page**: Dedicated route at `/preferences-center` accessible from sidebar navigation
- **Four Cookie Categories**: Display and manage consent for necessary, analytics, marketing, and performance cookies
- **Visual Icons**: Lucide React icons (Lock, BarChart3, Megaphone, Zap) instead of emoji for accessibility compliance
- **Current Status Card**: Shows when user has existing consent, explaining they can modify or withdraw
- **Category Cards**: Each category displays icon, title, description, and toggle switch (necessary category disabled)
- **Save Functionality**: Updates preferences in localStorage and sends consent to backend via POST /api/cmp/consent
- **Withdraw Consent**: AlertDialog confirmation flow that resets all optional categories and notifies backend via POST /api/cmp/consent/withdraw
- **Metadata Handling Fix**: Extracts only consent categories (necessary/analytics/marketing/performance) from localStorage, preventing timestamp/version from appearing as pseudo-categories in UI

**Technical Implementation**:
- **Component**: `client/src/pages/PreferencesCenterPage.tsx` with complete state management
- **Rehydration Logic**: Properly filters stored metadata (timestamp, version) when loading from localStorage, maintaining clean UI state
- **Form State**: Uses React useState with manual switch handling, no react-hook-form needed for simple toggles
- **Persistence**: Updates both localStorage (client-side) and backend database (server-side audit trail)
- **Anonymous Tracking**: Generates/retrieves anonymous user ID for consent records without requiring authentication

**Testing**:
- End-to-end tests verified all user flows work correctly
- Four categories display correctly (no metadata pollution)
- Toggle switches work with boolean values
- Save functionality persists preferences across page reloads
- Withdraw consent resets optional categories and updates backend
- localStorage correctly stores and retrieves consent with metadata

**User Experience Impact**:
- PDPL-compliant preferences center for transparency and user control
- Arabic-first interface with complete RTL support
- Professional legal aesthetic matching platform design
- Accessible design using semantic icons instead of emoji
- Clear withdrawal flow with confirmation dialog
- Persistent state prevents data loss

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