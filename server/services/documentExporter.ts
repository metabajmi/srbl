import HTMLtoDOCX from "html-to-docx";
import PdfPrinter from "pdfmake";
// @ts-ignore - html-to-pdfmake lacks type definitions
import htmlToPdfmake from "html-to-pdfmake";
import { JSDOM } from "jsdom";
import type { TDocumentDefinitions, Content } from "pdfmake/interfaces";

interface PolicyDocument {
  companyName: string;
  content: string;
}

// Define fonts for pdfmake (using built-in Roboto)
const fonts = {
  Roboto: {
    normal: 'node_modules/pdfmake/build/vfs_fonts.js',
    bold: 'node_modules/pdfmake/build/vfs_fonts.js',
    italics: 'node_modules/pdfmake/build/vfs_fonts.js',
    bolditalics: 'node_modules/pdfmake/build/vfs_fonts.js'
  }
};

export async function generatePDF(policy: PolicyDocument): Promise<Buffer> {
  console.log('[PDF] Starting PDF generation for:', policy.companyName);
  const startTime = Date.now();
  
  try {
    // Create JSDOM window for html-to-pdfmake
    const { window } = new JSDOM('');
    
    // Convert HTML content to pdfmake format
    const htmlContent = `
      <div style="text-align: right; direction: rtl;">
        <h1 style="color: #059669; text-align: center;">سياسة الخصوصية</h1>
        <h2 style="color: #374151; text-align: center;">${policy.companyName}</h2>
        <hr/>
        ${policy.content}
        <hr/>
        <p style="text-align: center; color: #6b7280; font-size: 10pt;">
          تم إنشاء هذه السياسة بواسطة منصة سِرْبَال للامتثال لنظام حماية البيانات الشخصية
        </p>
        <p style="text-align: center; color: #6b7280; font-size: 10pt;">www.sirbal.co</p>
      </div>
    `;
    
    const pdfContent = htmlToPdfmake(htmlContent, { window }) as Content;
    
    // Create document definition
    const docDefinition: TDocumentDefinitions = {
      content: pdfContent,
      defaultStyle: {
        font: 'Roboto',
        fontSize: 11,
        lineHeight: 1.5,
      },
      styles: {
        'html-h1': { fontSize: 20, bold: true, margin: [0, 10, 0, 10] },
        'html-h2': { fontSize: 16, bold: true, margin: [0, 8, 0, 8] },
        'html-h3': { fontSize: 14, bold: true, margin: [0, 6, 0, 6] },
        'html-p': { margin: [0, 4, 0, 4] },
        'html-li': { margin: [0, 2, 0, 2] },
      },
      pageSize: 'A4',
      pageMargins: [40, 40, 40, 40],
    };
    
    // Generate PDF using pdfmake
    const printer = new PdfPrinter(fonts);
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    
    // Collect PDF data into buffer
    const chunks: Buffer[] = [];
    
    return new Promise<Buffer>((resolve, reject) => {
      pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
      pdfDoc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        const elapsed = Date.now() - startTime;
        console.log(`[PDF] Generated successfully in ${elapsed}ms, size: ${pdfBuffer.length} bytes`);
        resolve(pdfBuffer);
      });
      pdfDoc.on('error', (err: Error) => {
        const elapsed = Date.now() - startTime;
        console.error(`[PDF] Generation failed after ${elapsed}ms:`, err);
        reject(err);
      });
      pdfDoc.end();
    });
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[PDF] Generation failed after ${elapsed}ms:`, error);
    throw error;
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
