import FormData from "form-data";
import Mailgun from "mailgun.js";

async function testEmail() {
  console.log("Testing Mailgun...");
  console.log("MAILGUN_API_KEY:", process.env.MAILGUN_API_KEY ? "SET (hidden)" : "NOT SET");
  console.log("MAILGUN_DOMAIN:", process.env.MAILGUN_DOMAIN || "NOT SET");
  
  if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN) {
    console.log("ERROR: Missing MAILGUN_API_KEY or MAILGUN_DOMAIN");
    process.exit(1);
  }
  
  const mailgun = new Mailgun(FormData);
  const mg = mailgun.client({
    username: "api",
    key: process.env.MAILGUN_API_KEY,
  });
  
  try {
    const data = await mg.messages.create(process.env.MAILGUN_DOMAIN, {
      from: "Sirbal <postmaster@" + process.env.MAILGUN_DOMAIN + ">",
      to: ["m.alajmi2211@gmail.com"],
      subject: "اختبار من سربال - Test from Sirbal",
      text: "مرحباً! هذه رسالة اختبار من منصة سربال. Congratulations, Mailgun is working!",
    });
    console.log("SUCCESS! Email sent:", data);
  } catch (error: any) {
    console.log("ERROR:", error.message || error);
  }
}

testEmail();
