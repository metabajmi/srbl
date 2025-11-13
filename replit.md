# Saudi Personal Data Protection Compliance Tool

## Overview

This is a web application that analyzes websites for compliance with Saudi Arabia's Personal Data Protection Law (PDPL). The tool uses AI-powered analysis to scan websites, identify compliance violations, and generate detailed reports with remediation guidance.

The application is designed with an Arabic-first approach, featuring RTL (right-to-left) support and professional legal/compliance interface styling. It provides automated scanning capabilities that check for privacy policy completeness, consent mechanisms, data transparency, user rights implementation, data security measures, third-party data sharing practices, data retention policies, and cookie/tracking compliance.

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

**Routing**: Implements wouter for lightweight client-side routing with two main routes:
- Home page for initiating scans
- Scan results page for viewing analysis

**Form Handling**: Uses react-hook-form with Zod for validation and @hookform/resolvers for integration.

### Backend Architecture

**Server Framework**: Express.js running on Node.js with TypeScript support via tsx in development.

**API Design**: RESTful API architecture with endpoints for:
- Creating and managing compliance scans
- Retrieving scan results and issues
- Generating compliance reports

**AI Integration**: Uses OpenAI's GPT-5 model for intelligent website content analysis. The AI system:
- Analyzes HTML content for PDPL compliance
- Identifies violations across multiple categories (privacy policies, consent, transparency, user rights, data security)
- References specific articles from Saudi data protection regulations
- Provides actionable remediation guidance
- Generates comprehensive compliance reports

**Content Fetching**: Implements secure website content retrieval with:
- URL validation to prevent SSRF attacks
- Protocol restrictions (HTTP/HTTPS only)
- Internal IP blocking
- 30-second timeout protection

### Data Storage Solutions

**ORM**: Drizzle ORM for type-safe database operations with PostgreSQL dialect support.

**Database Schema**: Designed with four main tables:
- `compliance_scans`: Stores scan metadata, status, scores, and analysis results (includes timestamps, error messages)
- `compliance_issues`: Stores individual violations found during scans (cascade delete on scan removal)
- `reports`: Stores generated compliance reports (cascade delete on scan removal)
- `remediation_templates`: Stores reusable remediation guidance templates

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