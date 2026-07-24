import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API route to send login credentials email to user
  app.post("/api/send-user-email", async (req: express.Request, res: express.Response) => {
    const { email, phone, displayName, password, pin } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: "Email address is required" });
    }

    try {
      const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
      const smtpPort = parseInt(process.env.SMTP_PORT || "587");
      const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
      const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

      let transporter: nodemailer.Transporter;

      if (smtpUser && smtpPass) {
        transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });
      } else {
        // Dev test account fallback for testing
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
          host: "smtp.ethereal.email",
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
      }

      const loginId = phone || email;
      const passText = password || pin || "123456";

      const mailOptions = {
        from: '"NIHAD BUSINESS POINT" <noreply@nihadbusinesspoint.com>',
        to: email,
        subject: "Welcome to NIHAD BUSINESS POINT - Your Login Credentials / আপনার লগইন তথ্য",
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
            <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #2563eb;">
              <h2 style="color: #1e3a8a; margin: 0; font-size: 22px; font-weight: 800;">NIHAD BUSINESS POINT</h2>
              <p style="color: #64748b; font-size: 13px; margin-top: 6px; font-weight: 600;">Your Wallet & Utility Account Details / আপনার অ্যাকাউন্ট তথ্য</p>
            </div>
            
            <div style="padding: 24px 0;">
              <p style="font-size: 15px; color: #334155; margin-bottom: 16px;">
                প্রিয় <strong>${displayName || 'গ্রাহক'}</strong>,
              </p>
              <p style="font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 20px;">
                আপনার নামে <strong>NIHAD BUSINESS POINT</strong>-এ একটি নতুন অ্যাকাউন্ট সফলভাবে তৈরি করা হয়েছে। অ্যাপে লগইন করতে নিচের তথ্যগুলো ব্যবহার করুন:
              </p>
              
              <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 18px; margin: 20px 0;">
                <p style="margin: 8px 0; font-size: 14px;">
                  <strong style="color: #475569;">ইউজারনেম / মোবাইল (Login Mobile):</strong><br/>
                  <span style="font-family: monospace; font-size: 17px; color: #2563eb; font-weight: bold;">${loginId}</span>
                </p>
                <p style="margin: 8px 0; font-size: 14px;">
                  <strong style="color: #475569;">ইমেইল (Registered Email):</strong><br/>
                  <span style="font-family: monospace; font-size: 16px; color: #0284c7; font-weight: bold;">${email}</span>
                </p>
                <p style="margin: 8px 0; font-size: 14px;">
                  <strong style="color: #475569;">পিন / পাসওয়ার্ড (PIN / Password):</strong><br/>
                  <span style="font-family: monospace; font-size: 20px; color: #dc2626; font-weight: bold; background: #fee2e2; padding: 2px 8px; border-radius: 6px; display: inline-block; margin-top: 4px;">${passText}</span>
                </p>
              </div>

              <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
                এখনই অ্যাপ খুলে আপনার মোবাইল নম্বর অথবা ইমেইল এবং উপরের পিন/পাসওয়ার্ড দিয়ে লগইন করে সার্ভিস ব্যবহার করা শুরু করুন।
              </p>
              
              <div style="margin-top: 20px; padding: 12px; background-color: #fff1f2; border-left: 4px solid #f43f5e; border-radius: 6px;">
                <p style="font-size: 12px; color: #be123c; margin: 0; font-weight: bold;">
                  ⚠️ আপনার পাসওয়ার্ড ও পিন নম্বর গোপন রাখুন। কারও সাথে এই তথ্য শেয়ার করবেন না।
                </p>
              </div>
            </div>
            
            <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
              &copy; ${new Date().getFullYear()} NIHAD BUSINESS POINT. All rights reserved.
            </div>
          </div>
        `,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log("Email sent successfully: %s", info.messageId);

      const previewUrl = nodemailer.getTestMessageUrl(info);

      return res.json({
        success: true,
        message: "Email sent successfully!",
        previewUrl: previewUrl || null,
      });
    } catch (err: any) {
      console.error("Error sending email:", err);
      return res.status(500).json({ success: false, error: err.message || "Email sending failed" });
    }
  });

  // Vite middleware setup for development / production serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: express.Request, res: express.Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
