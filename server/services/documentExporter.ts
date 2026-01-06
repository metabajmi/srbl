import HTMLtoDOCX from "html-to-docx";
import PDFDocument from "pdfkit";

interface PolicyDocument {
  companyName: string;
  content: string;
}

// Helper function to strip HTML tags for plain text
function stripHtmlTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<h[1-6][^>]*>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<ul[^>]*>/gi, '\n')
    .replace(/<\/ul>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Extract sections from HTML content
function extractSections(html: string): { title: string; content: string }[] {
  const sections: { title: string; content: string }[] = [];
  
  // Split by h2 tags
  const h2Regex = /<h2[^>]*>(.*?)<\/h2>/gi;
  const parts = html.split(h2Regex);
  
  // First part is intro (before first h2)
  if (parts[0] && parts[0].trim()) {
    const introText = stripHtmlTags(parts[0]).trim();
    if (introText) {
      sections.push({ title: '', content: introText });
    }
  }
  
  // Process h2 sections
  for (let i = 1; i < parts.length; i += 2) {
    const title = stripHtmlTags(parts[i] || '').trim();
    const content = stripHtmlTags(parts[i + 1] || '').trim();
    if (title || content) {
      sections.push({ title, content });
    }
  }
  
  // If no sections found, just use the whole content
  if (sections.length === 0) {
    sections.push({ title: '', content: stripHtmlTags(html) });
  }
  
  return sections;
}

export async function generatePDF(policy: PolicyDocument): Promise<Buffer> {
  console.log('[PDF] Starting PDF generation for:', policy.companyName);
  const startTime = Date.now();
  
  return new Promise((resolve, reject) => {
    try {
      const today = new Date().toLocaleDateString('ar-SA', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });

      // Create PDF document with RTL support
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        info: {
          Title: `سياسة الخصوصية - ${policy.companyName}`,
          Author: 'Sirbal - سِرْبَال',
          Subject: 'سياسة الخصوصية',
        }
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        const elapsed = Date.now() - startTime;
        console.log(`[PDF] Generated successfully in ${elapsed}ms, size: ${pdfBuffer.length} bytes`);
        resolve(pdfBuffer);
      });
      doc.on('error', (err: Error) => {
        const elapsed = Date.now() - startTime;
        console.error(`[PDF] Generation failed after ${elapsed}ms:`, err);
        reject(err);
      });

      // Header with green background
      doc.rect(0, 0, doc.page.width, 120).fill('#16a34a');
      
      // Header text (white on green)
      doc.fillColor('#ffffff')
         .fontSize(24)
         .text('سياسة الخصوصية', 50, 30, { align: 'center', width: doc.page.width - 100 });
      
      doc.fontSize(16)
         .text(policy.companyName, 50, 60, { align: 'center', width: doc.page.width - 100 });
      
      doc.fontSize(11)
         .text(`تاريخ الإصدار: ${today}`, 50, 85, { align: 'center', width: doc.page.width - 100 });

      // Move below header
      doc.y = 140;
      doc.fillColor('#1a1a1a');

      // Extract and render sections
      const sections = extractSections(policy.content);
      
      for (const section of sections) {
        // Check if we need a new page
        if (doc.y > doc.page.height - 100) {
          doc.addPage();
        }

        // Section title (if exists)
        if (section.title) {
          doc.fillColor('#15803d')
             .fontSize(14)
             .text(section.title, { align: 'right' });
          doc.moveDown(0.3);
        }

        // Section content
        if (section.content) {
          doc.fillColor('#1a1a1a')
             .fontSize(11)
             .text(section.content, { align: 'right', lineGap: 4 });
          doc.moveDown(1);
        }
      }

      // Footer
      doc.moveDown(2);
      if (doc.y > doc.page.height - 80) {
        doc.addPage();
      }
      
      // Footer line
      doc.strokeColor('#e5e7eb')
         .lineWidth(1)
         .moveTo(50, doc.y)
         .lineTo(doc.page.width - 50, doc.y)
         .stroke();
      
      doc.moveDown(0.5);
      doc.fillColor('#6b7280')
         .fontSize(9)
         .text('تم توليدها وفقاً لنظام حماية البيانات الشخصية السعودي (PDPL)', { align: 'center' })
         .text('www.sirbal.co', { align: 'center' });

      // Finalize
      doc.end();

    } catch (error) {
      const elapsed = Date.now() - startTime;
      console.error(`[PDF] Generation failed after ${elapsed}ms:`, error);
      reject(error);
    }
  });
}

export async function generateDOCX(policy: PolicyDocument): Promise<Buffer> {
  const htmlTemplate = wrapWithDocxTemplate(policy.content, policy.companyName);
  
  const docxBuffer = await HTMLtoDOCX(htmlTemplate, null, {
    table: { row: { cantSplit: true } },
    footer: true,
    pageNumber: true,
    font: 'Cairo',
    margins: {
      top: 1440,
      right: 1440,
      bottom: 1440,
      left: 1440,
    },
  });
  
  return Buffer.from(docxBuffer as ArrayBuffer);
}

function wrapWithDocxTemplate(content: string, companyName: string): string {
  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>سياسة الخصوصية - ${companyName}</title>
</head>
<body style="font-family: Cairo, Arial, sans-serif; direction: rtl; text-align: right; line-height: 1.8;">
    <h1 style="text-align: center; color: #059669;">سياسة الخصوصية</h1>
    <h2 style="text-align: center; color: #374151;">${companyName}</h2>
    <hr style="margin: 20px 0; border: 1px solid #e5e7eb;">
    
    ${content}
    
    <hr style="margin: 30px 0; border: 1px solid #e5e7eb;">
    <p style="text-align: center; color: #6b7280; font-size: 10pt;">
        تم إنشاء هذه السياسة بواسطة منصة سِرْبَال للامتثال لنظام حماية البيانات الشخصية<br>
        www.sirbal.co
    </p>
</body>
</html>
  `;
}
