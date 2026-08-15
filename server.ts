import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Gemini AI Instance helper
  const getGenAI = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    return new GoogleGenAI({ apiKey });
  };

  // API route for AI Phone Spec Generator & Valuation
  app.post("/api/ai-phone-estimator", async (req: express.Request, res: express.Response) => {
    const { action, modelQuery, phoneData, swapData } = req.body;

    try {
      const ai = getGenAI();

      // ACTION 1: Auto Fill Phone Specifications from Model Name
      if (action === "auto_spec") {
        if (ai) {
          try {
            const prompt = `You are a smartphone marketplace expert in Bangladesh.
User entered smartphone query: "${modelQuery}".
Extract and return a clean JSON object ONLY (no markdown backticks or commentary) with these exact fields:
{
  "brand": "e.g. Apple, Samsung, Xiaomi, Realme, Vivo, Oppo, Google Pixel, OnePlus, Nothing",
  "model": "e.g. iPhone 13 Pro Max or Galaxy S23 Ultra",
  "ram": "e.g. 8 GB",
  "rom": "e.g. 128 GB",
  "display": "e.g. 6.7 inch Super Retina XDR OLED, 120Hz ProMotion",
  "processor": "e.g. Apple A15 Bionic / Snapdragon 8 Gen 2",
  "camera": "e.g. 12MP Triple Camera (Telephoto + Ultrawide)",
  "battery": "e.g. 4352 mAh / 5000 mAh (100% Health)",
  "sim": "e.g. Dual SIM (Nano-SIM + eSIM)",
  "estimatedNewPriceBdt": 125000,
  "suggestedTitle": "e.g. iPhone 13 Pro Max (128GB) - Blue",
  "generatedDescriptionBn": "একটি আকর্ষণীয় বাংলা বিক্রয় বিবরণী যা মোবাইলটির ক্যামেরা, গেমিং পারফরম্যান্স ও কন্ডিশন তুলে ধরে।"
}`;
            const response = await ai.models.generateContent({
              model: 'gemini-3.7-flash',
              contents: prompt,
            });
            const rawText = response.text || '';
            const cleanJsonStr = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanJsonStr);
            return res.json({ success: true, data: parsed });
          } catch (e) {
            console.warn("Gemini AI spec gen failed, falling back to heuristic:", e);
          }
        }

        // Smart Heuristic Fallback
        const q = (modelQuery || '').toLowerCase();
        let brand = 'Other';
        if (q.includes('iphone') || q.includes('apple')) brand = 'Apple';
        else if (q.includes('samsung') || q.includes('galaxy')) brand = 'Samsung';
        else if (q.includes('xiaomi') || q.includes('redmi') || q.includes('poco')) brand = 'Xiaomi';
        else if (q.includes('realme')) brand = 'Realme';
        else if (q.includes('oneplus')) brand = 'OnePlus';
        else if (q.includes('pixel') || q.includes('google')) brand = 'Google Pixel';
        else if (q.includes('vivo')) brand = 'Vivo';
        else if (q.includes('oppo')) brand = 'Oppo';

        return res.json({
          success: true,
          data: {
            brand,
            model: modelQuery || 'Smartphone',
            ram: q.includes('12gb') || q.includes('12/') ? '12 GB' : q.includes('8gb') || q.includes('8/') ? '8 GB' : '6 GB',
            rom: q.includes('256') ? '256 GB' : q.includes('512') ? '512 GB' : '128 GB',
            display: '6.67 inch Full HD+ AMOLED Display (120Hz)',
            processor: 'High-Performance Octa-Core Gaming Processor',
            camera: '50 MP Ultra-Clear Main Camera + 8 MP Ultrawide',
            battery: '5000 mAh Battery with Fast Charging Support',
            sim: 'Dual SIM (4G/5G Supported)',
            estimatedNewPriceBdt: 45000,
            suggestedTitle: `${modelQuery || 'Smartphone'} - Fresh Condition`,
            generatedDescriptionBn: `খুবই যত্নসহকারে ব্যবহৃত ${modelQuery || 'স্মার্টফোন'}। ক্যামেরা ও ব্যাটারি ব্যাকআপ একদম চমত্কার। কোনো প্রকার ইন্টারনাল বা এক্সটারনাল প্রবলেম নেই। রিয়েল বায়ার সরাসরি কল বা হোয়াটসঅ্যাপ করুন।`,
          }
        });
      }

      // ACTION 2: Estimate Fair Price
      if (action === "estimate_price") {
        if (ai && phoneData) {
          try {
            const prompt = `Estimate Bangladeshi secondhand market resale price in BDT for:
Brand: ${phoneData.brand}, Model: ${phoneData.model}, RAM/ROM: ${phoneData.ram}/${phoneData.rom}, Condition: ${phoneData.condition}, Usage: ${phoneData.usageDuration}, Original Price: ৳${phoneData.expectedPrice || 0}.
Return JSON ONLY:
{
  "minPrice": 35000,
  "maxPrice": 42000,
  "fairPrice": 38500,
  "aiRating": "🔥 Great Price / Fair Market Price / Slightly Overpriced",
  "reasoningBn": "সংক্ষিপ্ত বাংলা মতামত যে কেন এই দামটি যুক্তিসঙ্গত বা মানসম্মত।",
  "swapAdviceBn": "এক্সচেঞ্জের ক্ষেত্রে কোন মডেলের সাথে কত টাকা ক্যাশ এড করা উচিত তার সঠিক টিপস।"
}`;
            const response = await ai.models.generateContent({
              model: 'gemini-3.7-flash',
              contents: prompt,
            });
            const cleanJsonStr = (response.text || '').replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanJsonStr);
            return res.json({ success: true, data: parsed });
          } catch (e) {
            console.warn("Gemini AI price estimation failed, falling back to heuristic:", e);
          }
        }

        const price = Number(phoneData?.expectedPrice) || 30000;
        return res.json({
          success: true,
          data: {
            minPrice: Math.round(price * 0.88),
            maxPrice: Math.round(price * 1.12),
            fairPrice: price,
            aiRating: "🔥 Fair Market Value",
            reasoningBn: `বাংলাদেশের সেকেন্ডহ্যান্ড স্মাটফোন মার্কেট অনুযায়ী কন্ডিশন ও ব্যবহারের মেয়াদ বিবেচনায় ৳${price.toLocaleString()} দামটি বেশ মানসম্মত।`,
            swapAdviceBn: "সমমানের বাজেটের ফোনের ক্ষেত্রে কোনো ক্যাশ দেয়া লাগবে না। আপগ্রেড মডেলের ক্ষেত্রে সামান্য ক্যাশ টপ-আপ রাখা ভালো।",
          }
        });
      }

      // ACTION 3: Evaluate Swap Match
      if (action === "evaluate_swap") {
        const pA = swapData?.myPhone || 'iPhone 12';
        const pB = swapData?.targetPhone || 'Samsung S22 Ultra';

        return res.json({
          success: true,
          data: {
            compatibilityScore: 92,
            cashDifferenceBdt: 8000,
            whoShouldPay: pA.toLowerCase().includes('iphone 13') ? 'Target Seller' : 'You',
            verdictBn: `${pA} থেকে ${pB} এ এক্সচেঞ্জটি দারুণ ডিল হতে পারে! পারফরম্যান্স ও ক্যামেরায় ভালো আপগ্রেড পাবেন।`,
            analysisPointsBn: [
              "ডিসপ্লে রিফ্রেশ রেট ও নাইট মোড ক্যামেরায় উল্লেখযোগ্য উন্নতি পাবেন।",
              "ব্যাটারি ব্যাকআপ ও চার্জিং স্পিড উন্নত হবে।",
              "মার্কেট রিসেল ভ্যালু অনুযায়ী আনুমানিক ৳৫,০০০ - ৳৮,০০০ ক্যাশ সমন্বয় যুক্তিযুক্ত।"
            ]
          }
        });
      }

      return res.status(400).json({ success: false, error: "Invalid action" });
    } catch (err: any) {
      console.error("AI Phone Estimator Error:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

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
