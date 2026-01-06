import HTMLtoDOCX from "html-to-docx";
import PdfPrinter from "pdfmake";
import htmlToPdfmake from "html-to-pdfmake";
import { JSDOM } from "jsdom";

interface PolicyDocument {
  companyName: string;
  content: string;
}

// Define fonts for pdfmake - use built-in Roboto with Arabic support
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
    const today = new Date().toLocaleDateString('ar-SA', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    // Parse HTML content using JSDOM for htmlToPdfmake
    const { window } = new JSDOM('');
    const htmlContent = htmlToPdfmake(policy.content, { window });

    // Create document definition
    const docDefinition: any = {
      pageSize: 'A4',
      pageMargins: [40, 60, 40, 60],
      
      // Header with green gradient simulation
      header: {
        columns: [
          {
            width: '*',
            stack: [
              { 
                text: 'سياسة الخصوصية', 
                style: 'headerTitle',
                alignment: 'center'
              },
              { 
                text: policy.companyName, 
                style: 'headerCompany',
                alignment: 'center'
              },
              { 
                text: `تاريخ الإصدار: ${today}`, 
                style: 'headerDate',
                alignment: 'center'
              }
            ],
            fillColor: '#16a34a',
            margin: [40, 20, 40, 20]
          }
        ]
      },

      // Footer
      footer: function(currentPage: number, pageCount: number) {
        return {
          columns: [
            {
              text: [
                { text: 'تم توليدها وفقاً لنظام حماية البيانات الشخصية السعودي (PDPL)\n', style: 'footerText' },
                { text: 'www.sirbal.co', style: 'footerLink' }
              ],
              alignment: 'center',
              margin: [0, 20, 0, 0]
            }
          ]
        };
      },

      content: [
        // Green header box
        {
          table: {
            widths: ['*'],
            body: [[
              {
                stack: [
                  { text: 'سياسة الخصوصية', style: 'mainTitle', alignment: 'center' },
                  { text: policy.companyName, style: 'companyName', alignment: 'center' },
                  { text: `تاريخ الإصدار: ${today}`, style: 'dateText', alignment: 'center' }
                ],
                fillColor: '#16a34a',
                margin: [20, 20, 20, 20]
              }
            ]]
          },
          layout: 'noBorders',
          margin: [0, 0, 0, 30]
        },
        // Main content from HTML
        htmlContent
      ],

      styles: {
        mainTitle: {
          fontSize: 24,
          bold: true,
          color: '#ffffff',
          margin: [0, 0, 0, 10]
        },
        companyName: {
          fontSize: 16,
          bold: true,
          color: '#ffffff',
          margin: [0, 0, 0, 5]
        },
        dateText: {
          fontSize: 12,
          color: '#ffffff',
          opacity: 0.9
        },
        headerTitle: {
          fontSize: 20,
          bold: true,
          color: '#ffffff'
        },
        headerCompany: {
          fontSize: 14,
          bold: true,
          color: '#ffffff'
        },
        headerDate: {
          fontSize: 10,
          color: '#ffffff'
        },
        footerText: {
          fontSize: 9,
          color: '#6b7280'
        },
        footerLink: {
          fontSize: 9,
          color: '#16a34a'
        },
        h1: {
          fontSize: 18,
          bold: true,
          color: '#16a34a',
          margin: [0, 20, 0, 10]
        },
        h2: {
          fontSize: 14,
          bold: true,
          color: '#15803d',
          margin: [0, 15, 0, 8]
        },
        h3: {
          fontSize: 12,
          bold: true,
          color: '#166534',
          margin: [0, 10, 0, 5]
        }
      },

      defaultStyle: {
        fontSize: 11,
        lineHeight: 1.5,
        alignment: 'right'
      }
    };

    // Create PDF using pdfmake
    const printer = new PdfPrinter(fonts);
    const pdfDoc = printer.createPdfKitDocument(docDefinition);

    // Collect buffer chunks
    const chunks: Buffer[] = [];
    
    return new Promise((resolve, reject) => {
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

// Helper function to strip HTML tags for plain text
function stripHtmlTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
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
