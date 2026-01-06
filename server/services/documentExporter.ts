import HTMLtoDOCX from "html-to-docx";
import { getBrowser } from "../scanner/browser";

interface PolicyDocument {
  companyName: string;
  content: string;
}

export async function generatePDF(policy: PolicyDocument): Promise<Buffer> {
  const htmlTemplate = wrapWithPDFTemplate(policy.content, policy.companyName);
  
  console.log('[PDF] Starting PDF generation for:', policy.companyName);
  const startTime = Date.now();
  
  let page = null;
  try {
    // Use existing browser from scanner instead of creating new one
    const browser = await getBrowser();
    page = await browser.newPage();
    
    // Set shorter timeouts
    page.setDefaultNavigationTimeout(25000);
    page.setDefaultTimeout(25000);
    
    // Set viewport for A4
    await page.setViewport({ width: 794, height: 1123 });
    
    // Set content directly (no network fetch needed)
    await page.setContent(htmlTemplate, { 
      waitUntil: 'domcontentloaded',
      timeout: 25000
    });
    
    // Wait for fonts to load
    await page.evaluate(() => document.fonts.ready);
    
    // Small delay for CSS
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm',
      },
      timeout: 20000
    });
    
    const elapsed = Date.now() - startTime;
    console.log(`[PDF] Generated successfully in ${elapsed}ms, size: ${pdfBuffer.length} bytes`);
    
    return Buffer.from(pdfBuffer);
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[PDF] Generation failed after ${elapsed}ms:`, error);
    throw error;
  } finally {
    if (page) {
      try {
        await page.close();
      } catch (e) {
        // Ignore close errors
      }
    }
  }
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

function wrapWithPDFTemplate(content: string, companyName: string): string {
  const today = new Date().toLocaleDateString('ar-SA', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>سياسة الخصوصية - ${companyName}</title>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body { 
            font-family: 'Cairo', 'Segoe UI', sans-serif; 
            line-height: 1.8; 
            color: #1a1a1a; 
            max-width: 900px; 
            margin: 0 auto; 
            padding: 40px 20px;
            direction: rtl;
            text-align: right;
        }
        h1 { 
            color: #16a34a; 
            text-align: center; 
            border-bottom: 3px solid #16a34a; 
            padding-bottom: 20px; 
        }
        h2 { 
            color: #15803d; 
            border-right: 5px solid #22c55e; 
            padding-right: 15px; 
            margin-top: 30px;
            margin-bottom: 15px;
            font-size: 18px;
        }
        .header { 
            text-align: center; 
            margin-bottom: 40px; 
            padding: 30px; 
            background: linear-gradient(135deg, #16a34a, #22c55e); 
            color: white; 
            border-radius: 10px; 
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .header h1 { 
            color: white; 
            border-bottom: none;
            font-size: 28px;
            margin-bottom: 10px;
        }
        .header .company-name {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 5px;
        }
        .header .date {
            font-size: 14px;
            opacity: 0.9;
        }
        .content { 
            background: #fff; 
            padding: 40px; 
            border-radius: 10px;
        }
        .footer { 
            margin-top: 50px; 
            padding-top: 30px; 
            border-top: 2px solid #e5e7eb; 
            text-align: center; 
            color: #6b7280;
            font-size: 13px;
        }
        ul { 
            list-style-type: disc; 
            padding-right: 25px;
            margin-bottom: 15px;
        }
        li { 
            margin-bottom: 8px; 
        }
        p {
            margin-bottom: 12px;
            text-align: justify;
        }
        @media print { 
            body { padding: 20px; } 
            .header { 
                background: linear-gradient(135deg, #16a34a, #22c55e) !important; 
                -webkit-print-color-adjust: exact; 
                print-color-adjust: exact; 
            } 
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>سياسة الخصوصية</h1>
        <div class="company-name">${companyName}</div>
        <div class="date">تاريخ الإصدار: ${today}</div>
    </div>
    <div class="content">${content}</div>
    <div class="footer">
        <p>تم توليدها وفقاً لنظام حماية البيانات الشخصية السعودي (PDPL)</p>
        <p>www.sirbal.co</p>
    </div>
</body>
</html>`;
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
