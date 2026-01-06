import puppeteer from "puppeteer";
import HTMLtoDOCX from "html-to-docx";

interface PolicyDocument {
  companyName: string;
  content: string;
}

export async function generatePDF(policy: PolicyDocument): Promise<Buffer> {
  const htmlTemplate = wrapWithPDFTemplate(policy.content, policy.companyName);
  
  // Find chromium executable
  const chromiumPath = process.env.CHROMIUM_PATH || '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium';
  
  console.log('[PDF] Starting PDF generation for:', policy.companyName);
  const startTime = Date.now();
  
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: chromiumPath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-web-security',
      '--font-render-hinting=none',
    ],
  });
  
  try {
    const page = await browser.newPage();
    
    // Use domcontentloaded instead of networkidle0 - no external resource waiting
    // This prevents timeout from slow Google Fonts loading
    await page.setContent(htmlTemplate, { 
      waitUntil: 'domcontentloaded',
      timeout: 60000 // 60 second timeout
    });
    
    // Brief wait for CSS to apply
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm',
      },
      timeout: 60000 // 60 second timeout for PDF generation
    });
    
    const elapsed = Date.now() - startTime;
    console.log(`[PDF] Generated successfully in ${elapsed}ms, size: ${pdfBuffer.length} bytes`);
    
    return Buffer.from(pdfBuffer);
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[PDF] Generation failed after ${elapsed}ms:`, error);
    throw error;
  } finally {
    await browser.close();
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
  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>سياسة الخصوصية - ${companyName}</title>
    <style>
        /* Use local system fonts - no external loading for faster PDF generation */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', 'Tahoma', 'Arial', 'Helvetica', sans-serif;
            font-size: 12pt;
            line-height: 1.8;
            color: #1a1a1a;
            direction: rtl;
            text-align: right;
        }
        
        .header {
            text-align: center;
            padding-bottom: 20px;
            border-bottom: 2px solid #059669;
            margin-bottom: 30px;
        }
        
        .header h1 {
            color: #059669;
            font-size: 24pt;
            margin-bottom: 10px;
        }
        
        .header .company {
            font-size: 14pt;
            color: #374151;
        }
        
        .content {
            text-align: justify;
        }
        
        h2 {
            color: #059669;
            font-size: 14pt;
            margin-top: 25px;
            margin-bottom: 15px;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 8px;
        }
        
        h3 {
            color: #1f2937;
            font-size: 12pt;
            margin-top: 20px;
            margin-bottom: 10px;
        }
        
        p {
            margin-bottom: 12px;
            text-align: justify;
        }
        
        ul, ol {
            margin-bottom: 15px;
            padding-right: 25px;
        }
        
        li {
            margin-bottom: 8px;
        }
        
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            font-size: 10pt;
            color: #6b7280;
        }
        
        .badge {
            display: inline-block;
            background: #dcfce7;
            color: #166534;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 10pt;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>سياسة الخصوصية</h1>
        <div class="company">${companyName}</div>
    </div>
    
    <div class="content">
        ${content}
    </div>
    
    <div class="footer">
        <p>تم إنشاء هذه السياسة بواسطة منصة سِرْبَال للامتثال لنظام حماية البيانات الشخصية</p>
        <p>www.sirbal.co</p>
    </div>
</body>
</html>
  `;
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
