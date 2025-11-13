# Design Guidelines: Saudi Personal Data Protection Compliance Tool

## Design Approach
**System-Based Approach (Fluent Design + Material Design Hybrid)**
- Clean, professional interface suitable for legal/compliance context
- Information-dense layouts with clear hierarchy
- Focus on functionality and usability over decorative elements
- Arabic-first design with proper RTL support

## Core Design Elements

### A. Typography
**Font Family:**
- Primary: 'Cairo', 'Segoe UI', system-ui (supports Arabic beautifully)
- Headings: Cairo Bold (700)
- Body: Cairo Regular (400)
- Emphasis: Cairo SemiBold (600)

**Scale:**
- Hero/Page Title: 32px (bold)
- Section Headers: 24px (semibold)
- Card Titles: 18px (semibold)
- Body Text: 16px (regular)
- Captions/Meta: 14px (regular)

### B. Layout System
**Spacing Units:** Consistent use of 4, 8, 16, 24, 32, 48px
- Component padding: 16px-24px
- Section spacing: 32px-48px
- Container max-width: 1200px

### C. Component Library

**Navigation:**
- Top app bar with logo, title, and action buttons
- Sticky header for context retention
- Clean, minimal navigation

**Input Components:**
- Large, prominent URL input field with search/scan button
- Clear placeholder text in Arabic
- Floating label pattern for form fields
- Input validation with inline feedback

**Data Display:**
- Card-based layout for violations/findings
- Color-coded severity indicators (red=critical, orange=warning, yellow=suggestion)
- Expandable/collapsible sections for detailed findings
- Clear iconography for different violation types
- Reference to specific articles (e.g., "المادة الثانية عشرة")

**Results Display:**
- Summary dashboard with metrics (total violations, by severity)
- Categorized violation list
- Detailed recommendation cards
- Progress indicators during scanning

**Action Components:**
- Primary CTA: Large "فحص الموقع" button (elevated, prominent)
- Secondary actions: Export PDF, print report
- Tertiary: Share, save for later

### D. Animations
**Minimal, purposeful:**
- Smooth page transitions (fade in)
- Loading spinner during scan
- Expand/collapse animations for details (300ms ease)
- No hover effects on cards - keep it simple

## Color Strategy
Not specifying colors as requested - focus on contrast and hierarchy through size, weight, and spacing.

## Images Section
**No hero image required** - this is a utility tool
**Icons only:**
- Violation type icons (lock for privacy, document for policy, shield for security)
- Status icons (checkmark, warning triangle, error circle)
- Use Material Icons or Heroicons via CDN

## Layout Structure

### Landing/Main Page:
1. **Header Section** (48px padding):
   - Logo/title "أداة فحص الامتثال لحماية البيانات"
   - Subtitle explaining purpose

2. **Input Section** (centered, max-width 800px):
   - Large URL input field
   - Prominent scan button
   - Brief instructions (2-3 bullet points)

3. **Features Grid** (3 columns on desktop, 1 on mobile):
   - Auto-detection capability
   - AI-powered analysis
   - PDF export
   - Each with icon, title, brief description

4. **Footer** (minimal):
   - Powered by statement
   - Legal disclaimer
   - Contact information

### Results Page:
1. **Summary Dashboard** (grid, 16px gap):
   - Total violations count (large number)
   - Breakdown by severity (3 cards)
   - Overall compliance score/status

2. **Violations List** (single column, 16px gaps):
   - Category headers with counts
   - Violation cards containing:
     - Severity indicator (border/badge)
     - Violation title
     - Article reference
     - Description
     - Recommendation
     - Expand for technical details

3. **Action Bar** (sticky bottom or top):
   - Export PDF button
   - Print button
   - New scan button

## Arabic-Specific Considerations
- All text RTL aligned
- Proper Arabic typography spacing
- Numbers in Arabic Eastern format when appropriate
- Date/time in Arabic format

## Accessibility
- Clear focus indicators
- Sufficient contrast ratios
- Semantic HTML structure
- ARIA labels in Arabic
- Keyboard navigation support