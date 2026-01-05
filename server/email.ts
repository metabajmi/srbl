import { Resend } from "resend";
import Mailgun from "mailgun.js";
import formData from "form-data";
import { generatePDF, generateDOCX } from "./services/documentExporter";

// Mailgun configuration (recommended for Saudi Arabia)
const mailgun = new Mailgun(formData);
const mg = process.env.MAILGUN_API_KEY 
  ? mailgun.client({ 
      username: 'api', 
      key: process.env.MAILGUN_API_KEY,
      url: process.env.MAILGUN_EU ? "https://api.eu.mailgun.net" : "https://api.mailgun.net"
    }) 
  : null;
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN || "";

// Resend configuration (fallback)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Use verified domain or testing address
const FROM_EMAIL = process.env.EMAIL_FROM || "Sirbal <noreply@sirbal.co>";

// Email provider selection: Mailgun first, then Resend
const useMailgun = !!mg && !!MAILGUN_DOMAIN;

interface PolicyEmailData {
  to: string;
  companyName: string;
  policyContent: string;
  policyId: string;
}

export async function sendPolicyEmail(data: PolicyEmailData): Promise<boolean> {
  const htmlContent = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>سياسة الخصوصية - ${data.companyName}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
        body { 
            font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif; 
            line-height: 1.8; 
            color: #1a1a1a; 
            background: #f8f9fa;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 700px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .header { 
            text-align: center; 
            padding: 40px 30px; 
            background: linear-gradient(135deg, #059669, #10b981); 
            color: white; 
        }
        .header h1 { 
            margin: 0 0 10px 0;
            font-size: 28px;
        }
        .header p {
            margin: 0;
            opacity: 0.9;
        }
        .content { 
            padding: 40px 30px; 
        }
        .success-badge {
            display: inline-block;
            background: #dcfce7;
            color: #166534;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: 600;
            margin-bottom: 20px;
        }
        .info-box {
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .button {
            display: inline-block;
            background: #059669;
            color: white !important;
            text-decoration: none;
            padding: 14px 28px;
            border-radius: 8px;
            font-weight: 600;
            margin-top: 20px;
        }
        .footer { 
            padding: 30px; 
            background: #f8f9fa;
            text-align: center; 
            color: #6b7280;
            font-size: 14px;
        }
        .footer a {
            color: #059669;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>سِرْبَال - Sirbal</h1>
            <p>منصة الامتثال لنظام حماية البيانات الشخصية</p>
        </div>
        <div class="content">
            <div class="success-badge">✓ تم توليد السياسة بنجاح</div>
            
            <h2>مرحباً،</h2>
            <p>تم توليد سياسة الخصوصية الخاصة بـ <strong>${data.companyName}</strong> بنجاح.</p>
            
            <div class="info-box">
                <h3 style="margin-top: 0;">ماذا بعد؟</h3>
                <ul style="margin-bottom: 0;">
                    <li>راجع السياسة وتأكد من صحة المعلومات</li>
                    <li>أضف السياسة لموقعك الإلكتروني</li>
                    <li>تأكد من وجود رابط واضح للسياسة في موقعك الإلكتروني</li>
                </ul>
            </div>
            
            <p>تجد مرفقاً نسخة من سياسة الخصوصية بصيغتي PDF و Word.</p>
        </div>
        <div class="footer">
            <p>هذا البريد مُرسل من منصة سِرْبَال للامتثال لنظام حماية البيانات الشخصية السعودي</p>
            <p>لأي استفسارات، تواصل معنا عبر support@sirbal.co</p>
        </div>
    </div>
</body>
</html>
  `;

  // Generate PDF and DOCX attachments
  let pdfBuffer: Buffer | null = null;
  let docxBuffer: Buffer | null = null;
  
  try {
    console.log("Generating PDF attachment...");
    pdfBuffer = await generatePDF({
      companyName: data.companyName,
      content: data.policyContent,
    });
    console.log("PDF generated, size:", pdfBuffer.length, "bytes");
  } catch (err) {
    console.error("Failed to generate PDF:", err);
  }
  
  try {
    console.log("Generating DOCX attachment...");
    docxBuffer = await generateDOCX({
      companyName: data.companyName,
      content: data.policyContent,
    });
    console.log("DOCX generated, size:", docxBuffer.length, "bytes");
  } catch (err) {
    console.error("Failed to generate DOCX:", err);
  }

  // Build attachments array
  const attachments: Array<{ data: Buffer; filename: string }> = [];
  if (pdfBuffer) {
    attachments.push({
      data: pdfBuffer,
      filename: `سياسة_الخصوصية_${data.companyName}.pdf`,
    });
  }
  if (docxBuffer) {
    attachments.push({
      data: docxBuffer,
      filename: `سياسة_الخصوصية_${data.companyName}.docx`,
    });
  }

  // Try Mailgun first
  if (useMailgun) {
    try {
      const result = await mg!.messages.create(MAILGUN_DOMAIN, {
        from: FROM_EMAIL,
        to: [data.to],
        subject: `سياسة الخصوصية جاهزة - ${data.companyName}`,
        html: htmlContent,
        attachment: attachments.length > 0 ? attachments : undefined,
      });
      console.log("Policy email sent via Mailgun with attachments:", result.id);
      return true;
    } catch (error) {
      console.error("Mailgun error:", error);
    }
  }

  // Fallback to Resend (with base64 attachments)
  if (resend) {
    try {
      const resendAttachments = attachments.map(att => ({
        filename: att.filename,
        content: att.data.toString('base64'),
      }));
      
      const { data: result, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: [data.to],
        subject: `سياسة الخصوصية جاهزة - ${data.companyName}`,
        html: htmlContent,
        attachments: resendAttachments.length > 0 ? resendAttachments : undefined,
      });

      if (error) {
        console.error("Resend error:", error);
        return false;
      }

      console.log("Policy email sent via Resend with attachments:", result?.id);
      return true;
    } catch (error) {
      console.error("Failed to send email:", error);
      return false;
    }
  }

  console.log("No email provider configured, skipping email");
  return false;
}

interface PaymentConfirmationData {
  to: string;
  companyName: string;
  amount: number;
  paymentId: string;
}

export async function sendPaymentConfirmationEmail(data: PaymentConfirmationData): Promise<boolean> {
  const amountSAR = (data.amount / 100).toFixed(2);
  
  const htmlContent = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تأكيد الدفع</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
        body { 
            font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif; 
            line-height: 1.8; 
            color: #1a1a1a; 
            background: #f8f9fa;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .header { 
            text-align: center; 
            padding: 40px 30px; 
            background: linear-gradient(135deg, #059669, #10b981); 
            color: white; 
        }
        .header h1 { 
            margin: 0 0 10px 0;
            font-size: 28px;
        }
        .content { 
            padding: 40px 30px; 
        }
        .success-icon {
            width: 80px;
            height: 80px;
            background: #dcfce7;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
            font-size: 40px;
        }
        .amount-box {
            background: #f0fdf4;
            border: 2px solid #bbf7d0;
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            margin: 20px 0;
        }
        .amount {
            font-size: 32px;
            font-weight: 700;
            color: #059669;
        }
        .details {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
        }
        .details-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e5e7eb;
        }
        .details-row:last-child {
            border-bottom: none;
        }
        .footer { 
            padding: 30px; 
            background: #f8f9fa;
            text-align: center; 
            color: #6b7280;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>سِرْبَال - Sirbal</h1>
        </div>
        <div class="content">
            <div class="success-icon">✓</div>
            <h2 style="text-align: center; margin-bottom: 10px;">تم الدفع بنجاح!</h2>
            <p style="text-align: center; color: #6b7280;">شكراً لك على ثقتك بمنصة سِرْبَال</p>
            
            <div class="amount-box">
                <div>المبلغ المدفوع</div>
                <div class="amount">${amountSAR} ر.س</div>
            </div>
            
            <div class="details">
                <div class="details-row">
                    <span>الجهة</span>
                    <strong>${data.companyName}</strong>
                </div>
                <div class="details-row">
                    <span>رقم العملية</span>
                    <strong dir="ltr">${data.paymentId}</strong>
                </div>
                <div class="details-row">
                    <span>التاريخ</span>
                    <strong>${new Date().toLocaleDateString('ar-SA')}</strong>
                </div>
            </div>
            
            <p style="text-align: center;">جاري تجهيز سياسة الخصوصية الخاصة بك...</p>
        </div>
        <div class="footer">
            <p>هذا البريد مُرسل من منصة سِرْبَال</p>
        </div>
    </div>
</body>
</html>
  `;

  // Try Mailgun first
  if (useMailgun) {
    try {
      const result = await mg!.messages.create(MAILGUN_DOMAIN, {
        from: FROM_EMAIL,
        to: [data.to],
        subject: `تأكيد الدفع - ${amountSAR} ر.س`,
        html: htmlContent,
      });
      console.log("Payment confirmation email sent via Mailgun:", result.id);
      return true;
    } catch (error) {
      console.error("Mailgun error:", error);
    }
  }

  // Fallback to Resend
  if (resend) {
    try {
      const { data: result, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: [data.to],
        subject: `تأكيد الدفع - ${amountSAR} ر.س`,
        html: htmlContent,
      });

      if (error) {
        console.error("Resend error:", error);
        return false;
      }

      console.log("Payment confirmation email sent via Resend:", result?.id);
      return true;
    } catch (error) {
      console.error("Failed to send payment confirmation email:", error);
      return false;
    }
  }

  console.log("No email provider configured, skipping email");
  return false;
}

interface OtpEmailData {
  to: string;
  code: string;
}

export async function sendOtpEmail(data: OtpEmailData): Promise<boolean> {
  const htmlContent = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>رمز التحقق - سِرْبَال</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
        body { 
            font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif; 
            line-height: 1.8; 
            color: #1a1a1a; 
            background: #f8f9fa;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 500px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .header { 
            text-align: center; 
            padding: 30px 20px; 
            background: linear-gradient(135deg, #059669, #10b981); 
            color: white; 
        }
        .header h1 { 
            margin: 0;
            font-size: 24px;
        }
        .content { 
            padding: 40px 30px;
            text-align: center;
        }
        .code-box {
            background: #f0fdf4;
            border: 2px dashed #10b981;
            border-radius: 12px;
            padding: 30px;
            margin: 25px 0;
        }
        .code {
            font-size: 42px;
            font-weight: 700;
            letter-spacing: 12px;
            color: #059669;
            font-family: 'Courier New', monospace;
        }
        .expiry {
            color: #6b7280;
            font-size: 14px;
            margin-top: 15px;
        }
        .warning {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 8px;
            padding: 15px;
            margin-top: 20px;
            font-size: 14px;
            color: #92400e;
        }
        .footer { 
            padding: 20px; 
            background: #f8f9fa;
            text-align: center; 
            color: #6b7280;
            font-size: 13px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>سِرْبَال - Sirbal</h1>
        </div>
        <div class="content">
            <h2 style="margin-top: 0;">رمز التحقق</h2>
            <p>استخدم الرمز التالي لتسجيل الدخول إلى حسابك:</p>
            
            <div class="code-box">
                <div class="code">${data.code}</div>
                <p class="expiry">صالح لمدة 10 دقائق</p>
            </div>
            
            <div class="warning">
                ⚠️ لا تشارك هذا الرمز مع أي شخص. فريق سِرْبَال لن يطلب منك هذا الرمز أبداً.
            </div>
        </div>
        <div class="footer">
            <p>إذا لم تطلب هذا الرمز، يمكنك تجاهل هذا البريد.</p>
        </div>
    </div>
</body>
</html>
  `;

  // Try Mailgun first
  if (useMailgun) {
    try {
      const result = await mg!.messages.create(MAILGUN_DOMAIN, {
        from: FROM_EMAIL,
        to: [data.to],
        subject: `رمز التحقق: ${data.code}`,
        html: htmlContent,
      });
      console.log("OTP email sent via Mailgun:", result.id);
      return true;
    } catch (error) {
      console.error("Mailgun error:", error);
    }
  }

  // Fallback to Resend
  if (resend) {
    try {
      const { data: result, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: [data.to],
        subject: `رمز التحقق: ${data.code}`,
        html: htmlContent,
      });

      if (error) {
        console.error("Resend error:", error);
        return false;
      }

      console.log("OTP email sent via Resend:", result?.id);
      return true;
    } catch (error) {
      console.error("Failed to send OTP email:", error);
      return false;
    }
  }

  // Development mode - log the code clearly and return success for testing
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[OTP CODE] Email: ${data.to}`);
  console.log(`[OTP CODE] Code: ${data.code}`);
  console.log(`[OTP CODE] Valid for 10 minutes`);
  console.log(`${'='.repeat(60)}\n`);
  
  // In development, return true so the flow continues
  // The code is visible in console logs
  return true;
}
