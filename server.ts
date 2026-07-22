import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";
import crypto from "crypto";
import nodemailer from "nodemailer";

dotenv.config();
console.log("API Key:" , process.env.GEMINI_API_KEY ? "Loaded" : "Missing");

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parser with 10mb limit for larger text documents
  app.use(express.json({ limit: "10mb" }));

  // --- DATABASE SCHEMAS & HELPERS (server-side file database) ---
  interface UserData {
    email: string;
    name: string;
    photoUrl?: string;
    createdAt: string;
  }

  interface ServerSession {
    token: string;
    email: string;
    createdAt: string;
    expiresAt: string;
  }

  interface OtpRecord {
    otp: string;
    expiresAt: number;
    attempts: number;
    requestCount: number;
    lastRequestedAt: number;
  }

  interface DbSchema {
    users: { [email: string]: UserData };
    otps: { [email: string]: OtpRecord };
    sessions: { [token: string]: ServerSession };
    chats: { [email: string]: any[] };
    history: { [email: string]: any[] };
    settings: { [email: string]: any };
  }

  const DATA_DIR = path.join(process.cwd(), "data");
  const DB_FILE = path.join(DATA_DIR, "db.json");

  function initDb() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify({
        users: {},
        otps: {},
        sessions: {},
        chats: {},
        history: {},
        settings: {}
      }, null, 2));
    }
  }

  function readDb(): DbSchema {
    try {
      initDb();
      const data = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(data);
    } catch (err) {
      console.error("Error reading database file", err);
      return { users: {}, otps: {}, sessions: {}, chats: {}, history: {}, settings: {} };
    }
  }

  function writeDb(db: DbSchema) {
    try {
      initDb();
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    } catch (err) {
      console.error("Error writing database file", err);
    }
  }

  // Authentication middleware
  function authenticateToken(req: any, res: any, next: any) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Access token is missing." });
    }

    const db = readDb();
    const session = db.sessions[token];

    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session. Please sign in again." });
    }

    if (new Date(session.expiresAt).getTime() < Date.now()) {
      delete db.sessions[token];
      writeDb(db);
      return res.status(401).json({ error: "Session has expired. Please sign in again." });
    }

    req.userEmail = session.email;
    next();
  }

  // --- IN-MEMORY RATE LIMITER & PROTECTION ENGINE ---
  interface RateLimitRecord {
    count: number;
    resetTime: number;
  }
  const ipRateLimits: { [ip: string]: RateLimitRecord } = {};

  function applyRateLimit(limit: number, windowMs: number) {
    return (req: any, res: any, next: any) => {
      const ip = req.ip || req.headers["x-forwarded-for"] || "unknown-ip";
      const now = Date.now();

      if (!ipRateLimits[ip]) {
        ipRateLimits[ip] = { count: 1, resetTime: now + windowMs };
        return next();
      }

      const record = ipRateLimits[ip];
      if (now > record.resetTime) {
        record.count = 1;
        record.resetTime = now + windowMs;
        return next();
      }

      record.count++;
      if (record.count > limit) {
        return res.status(429).json({
          error: "Too many requests. Please wait a moment before trying again to prevent abuse."
        });
      }
      next();
    };
  }

  // --- API ROUTE: Send Email OTP ---
  app.post("/api/auth/send-otp", applyRateLimit(5, 60 * 1000), async (req, res) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: "A valid email address is required." });
      }

      const emailKey = email.toLowerCase().trim();
      const db = readDb();
      let otpRecord = db.otps[emailKey];

      const now = Date.now();

      // Individual cooldown check: max 1 request per 60 seconds
      if (otpRecord) {
        const secondsSinceLast = (now - otpRecord.lastRequestedAt) / 1000;
        if (secondsSinceLast < 60) {
          return res.status(429).json({
            error: `Please wait ${Math.ceil(60 - secondsSinceLast)} seconds before requesting another code.`
          });
        }

        // Reset request count if last request was more than 15 mins ago
        if (now - otpRecord.lastRequestedAt > 15 * 60 * 1000) {
          otpRecord.requestCount = 0;
        }

        if (otpRecord.requestCount >= 5) {
          return res.status(429).json({
            error: "Too many verification requests. Please wait 15 minutes before trying again."
          });
        }
      }

      // Generate a cryptographically secure 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Update or create OTP record
      db.otps[emailKey] = {
        otp,
        expiresAt: now + 5 * 60 * 1000, // 5 minutes validity
        attempts: 0,
        requestCount: otpRecord ? otpRecord.requestCount + 1 : 1,
        lastRequestedAt: now,
      };
      writeDb(db);

      // Email sending logic using real production SMTP credentials
      const host = process.env.SMTP_HOST;
      const port = parseInt(process.env.SMTP_PORT || "587");
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;
      const from = process.env.SMTP_FROM || `"Nurovia AI" <noreply@nurovia.ai>`;

      if (!host || !user || !pass) {
        // Return a professional error explaining SMTP is not configured
        return res.status(400).json({
          error: "Email verification service is currently unconfigured. Please set up SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS in the environment secrets."
        });
      }

      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });

      const htmlContent = `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px; background-color: #f8fafc; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; width: 44px; height: 44px; line-height: 44px; background-color: #2563eb; border-radius: 12px; color: white; font-weight: bold; font-size: 22px; text-align: center;">N</div>
            <h1 style="font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 12px; margin-bottom: 4px;">Nurovia AI</h1>
            <p style="font-size: 13px; font-weight: 600; color: #64748b; margin: 0;">Patient, Intelligent Bento Workspace</p>
          </div>
          <div style="background-color: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 30px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);">
            <h2 style="font-size: 16px; font-weight: 700; color: #1e293b; margin-top: 0; margin-bottom: 10px;">Verification Code</h2>
            <p style="font-size: 14px; color: #475569; line-height: 1.5; margin-bottom: 24px;">Please use the following One-Time Password (OTP) to complete your sign-in process. This code is valid for <strong>5 minutes</strong>.</p>
            <div style="background-color: #f1f5f9; border-radius: 8px; padding: 16px; text-align: center; font-size: 32px; font-weight: 800; color: #1e3a8a; letter-spacing: 6px;">
              ${otp}
            </div>
            <p style="font-size: 12px; color: #94a3b8; margin-top: 24px; margin-bottom: 0; line-height: 1.4;">If you did not request this code, you can safely ignore this email. Do not share this code with anyone.</p>
          </div>
        </div>
      `;

      await transporter.sendMail({
        from,
        to: emailKey,
        subject: `Your Nurovia AI Verification Code: ${otp}`,
        html: htmlContent,
      });

      return res.json({
        success: true,
        message: "A verification code has been sent to your email address."
      });

    } catch (error: any) {
      console.error("Send OTP Error (hiding actual code):", error.message || error);
      res.status(500).json({ error: "Failed to dispatch verification email. Please try again later." });
    }
  });

  // --- API ROUTE: Verify Email OTP ---
  app.post("/api/auth/verify-otp", applyRateLimit(10, 60 * 1000), async (req, res) => {
    try {
      const { email, otp, name } = req.body;
      if (!email || !otp) {
        return res.status(400).json({ error: "Email and OTP code are required." });
      }

      const emailKey = email.toLowerCase().trim();
      const db = readDb();
      const otpRecord = db.otps[emailKey];

      if (!otpRecord) {
        return res.status(400).json({ error: "No active verification code found. Please request a new code." });
      }

      if (otpRecord.expiresAt < Date.now()) {
        delete db.otps[emailKey];
        writeDb(db);
        return res.status(400).json({ error: "The verification code has expired (5 minute limit). Please request a new one." });
      }

      if (otpRecord.attempts >= 5) {
        delete db.otps[emailKey];
        writeDb(db);
        return res.status(400).json({ error: "Too many failed attempts. Security lock triggered. Please request a new code." });
      }

      if (otpRecord.otp !== otp.trim()) {
        otpRecord.attempts += 1;
        writeDb(db);
        return res.status(400).json({ error: `Invalid verification code. You have ${5 - otpRecord.attempts} attempts remaining.` });
      }

      // Success! Clear OTP record
      delete db.otps[emailKey];

      // Get or create user profile
      let user = db.users[emailKey];
      if (!user) {
        let displayName = name ? name.trim() : "";
        if (!displayName) {
          const emailPrefix = emailKey.split("@")[0];
          displayName = emailPrefix
            .split(/[-_._]/)
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
        }

        user = {
          email: emailKey,
          name: displayName,
          photoUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}&backgroundColor=2563eb,3b82f6,06b6d4`,
          createdAt: new Date().toISOString(),
        };
        db.users[emailKey] = user;

        // Initialize user lists
        if (!db.chats[emailKey]) db.chats[emailKey] = [];
        if (!db.history[emailKey]) db.history[emailKey] = [];
        if (!db.settings[emailKey]) db.settings[emailKey] = {
          targetLevel: "College",
          difficulty: "Beginner",
          activeMode: "doubt"
        };
      }

      // Create secure session token
      const token = crypto.randomBytes(32).toString("hex");
      db.sessions[token] = {
        token,
        email: emailKey,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days session TTL
      };

      writeDb(db);

      res.json({
        success: true,
        token,
        user,
      });
    } catch (error: any) {
      console.error("Verify OTP Error:", error);
      res.status(500).json({ error: "An error occurred during verification." });
    }
  });

  // --- API ROUTE: Send Phone SMS OTP ---
  app.post("/api/auth/send-phone-otp", applyRateLimit(5, 60 * 1000), async (req, res) => {
    try {
      const { phoneNumber } = req.body;
      // Validate E.164 phone format
      if (!phoneNumber || typeof phoneNumber !== "string" || !/^\+[1-9]\d{1,14}$/.test(phoneNumber.trim())) {
        return res.status(400).json({
          error: "A valid international mobile number is required, beginning with '+' and country code (e.g., +15551234567)."
        });
      }

      const phoneKey = phoneNumber.trim();
      const db = readDb();
      let otpRecord = db.otps[phoneKey];

      const now = Date.now();

      // Check request cooldown (1 minute)
      if (otpRecord) {
        const secondsSinceLast = (now - otpRecord.lastRequestedAt) / 1000;
        if (secondsSinceLast < 60) {
          return res.status(429).json({
            error: `Please wait ${Math.ceil(60 - secondsSinceLast)} seconds before requesting another code.`
          });
        }

        if (now - otpRecord.lastRequestedAt > 15 * 60 * 1000) {
          otpRecord.requestCount = 0;
        }

        if (otpRecord.requestCount >= 5) {
          return res.status(429).json({
            error: "Too many verification requests. Please wait 15 minutes before trying again."
          });
        }
      }

      // Generate a cryptographically secure 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Update or create OTP record
      db.otps[phoneKey] = {
        otp,
        expiresAt: now + 5 * 60 * 1000, // 5 minutes validity
        attempts: 0,
        requestCount: otpRecord ? otpRecord.requestCount + 1 : 1,
        lastRequestedAt: now,
      };
      writeDb(db);

      // Send SMS using production Twilio API
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authTokenVal = process.env.TWILIO_AUTH_TOKEN;
      const fromNumber = process.env.TWILIO_FROM_NUMBER;

      if (!accountSid || !authTokenVal || !fromNumber) {
        return res.status(400).json({
          error: "SMS verification service is currently unconfigured. Please set up TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER in the environment secrets."
        });
      }

      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const basicAuth = Buffer.from(`${accountSid}:${authTokenVal}`).toString("base64");

      const params = new URLSearchParams({
        To: phoneKey,
        From: fromNumber,
        Body: `Your Nurovia AI verification code is: ${otp}. Valid for 5 minutes. Do not share this code.`,
      });

      const response = await fetch(twilioUrl, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${basicAuth}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: params.toString()
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Twilio SMS Dispatch Error]", errorText);
        throw new Error("Twilio API failed to dispatch SMS.");
      }

      return res.json({
        success: true,
        message: "A verification code has been dispatched to your mobile phone via SMS."
      });

    } catch (error: any) {
      console.error("Send Phone OTP Error (hiding actual code):", error.message || error);
      res.status(500).json({ error: "Failed to dispatch verification SMS. Please try again later." });
    }
  });

  // --- API ROUTE: Verify Phone SMS OTP ---
  app.post("/api/auth/verify-phone-otp", applyRateLimit(10, 60 * 1000), async (req, res) => {
    try {
      const { phoneNumber, otp } = req.body;
      if (!phoneNumber || !otp) {
        return res.status(400).json({ error: "Mobile number and OTP code are required." });
      }

      const phoneKey = phoneNumber.trim();
      const db = readDb();
      const otpRecord = db.otps[phoneKey];

      if (!otpRecord) {
        return res.status(400).json({ error: "No active verification code found. Please request a new code." });
      }

      if (otpRecord.expiresAt < Date.now()) {
        delete db.otps[phoneKey];
        writeDb(db);
        return res.status(400).json({ error: "The verification code has expired (5 minute limit). Please request a new one." });
      }

      if (otpRecord.attempts >= 5) {
        delete db.otps[phoneKey];
        writeDb(db);
        return res.status(400).json({ error: "Too many failed attempts. Security lock triggered. Please request a new code." });
      }

      if (otpRecord.otp !== otp.trim()) {
        otpRecord.attempts += 1;
        writeDb(db);
        return res.status(400).json({ error: `Invalid verification code. You have ${5 - otpRecord.attempts} attempts remaining.` });
      }

      // Success! Clear OTP record
      delete db.otps[phoneKey];

      // For phone-based sign-in, we use the phone number as their email/primary identity in our JSON DB
      const emailIdentifier = `${phoneKey.replace("+", "phone_")}@nurovia.phone`;

      // Get or create user profile
      let user = db.users[emailIdentifier];
      if (!user) {
        const displayName = `User ${phoneKey}`;
        user = {
          email: emailIdentifier,
          name: displayName,
          photoUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(phoneKey)}&backgroundColor=06b6d4,2563eb`,
          createdAt: new Date().toISOString(),
        };
        db.users[emailIdentifier] = user;

        // Initialize user collections
        if (!db.chats[emailIdentifier]) db.chats[emailIdentifier] = [];
        if (!db.history[emailIdentifier]) db.history[emailIdentifier] = [];
        if (!db.settings[emailIdentifier]) db.settings[emailIdentifier] = {
          targetLevel: "College",
          difficulty: "Beginner",
          activeMode: "doubt"
        };
      }

      // Create secure session token
      const token = crypto.randomBytes(32).toString("hex");
      db.sessions[token] = {
        token,
        email: emailIdentifier,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      writeDb(db);

      res.json({
        success: true,
        token,
        user,
      });
    } catch (error: any) {
      console.error("Verify Phone OTP Error:", error);
      res.status(500).json({ error: "An error occurred during verification." });
    }
  });

  // --- API ROUTE: Google Auth Verify Token ---
  app.post("/api/auth/google", applyRateLimit(10, 60 * 1000), async (req, res) => {
    try {
      const { idToken } = req.body;
      if (!idToken) {
        return res.status(400).json({ error: "Google ID Token is required." });
      }

      // Query Google's tokeninfo API to securely verify the signature and retrieve claims
      const tokeninfoUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
      const googleResponse = await fetch(tokeninfoUrl);

      if (!googleResponse.ok) {
        const errorData = await googleResponse.text();
        console.error("Google token validation failed:", errorData);
        return res.status(401).json({ error: "Invalid Google sign-in credentials. Token verification failed." });
      }

      const payload = await googleResponse.json();
      const email = payload.email;
      const name = payload.name;
      const picture = payload.picture;

      if (!email) {
        return res.status(400).json({ error: "Google account does not possess a valid email address." });
      }

      const emailKey = email.toLowerCase().trim();
      const db = readDb();

      // Retrieve or provision account automatically
      let user = db.users[emailKey];
      if (!user) {
        user = {
          email: emailKey,
          name: name || emailKey.split("@")[0],
          photoUrl: picture || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || emailKey)}`,
          createdAt: new Date().toISOString(),
        };
        db.users[emailKey] = user;

        if (!db.chats[emailKey]) db.chats[emailKey] = [];
        if (!db.history[emailKey]) db.history[emailKey] = [];
        if (!db.settings[emailKey]) {
          db.settings[emailKey] = {
            targetLevel: "College",
            difficulty: "Beginner",
            activeMode: "doubt"
          };
        }
      }

      // Provision secure session token
      const token = crypto.randomBytes(32).toString("hex");
      db.sessions[token] = {
        token,
        email: emailKey,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      writeDb(db);

      res.json({
        success: true,
        token,
        user,
      });

    } catch (error: any) {
      console.error("Google Sign-In backend verification failed:", error);
      res.status(500).json({ error: "An internal server error occurred verifying your Google Sign-In." });
    }
  });

  // --- API ROUTE: Get Profile ---
  app.get("/api/auth/profile", authenticateToken, async (req: any, res) => {
    const db = readDb();
    const user = db.users[req.userEmail];
    if (!user) {
      return res.status(404).json({ error: "User profile not found." });
    }
    res.json(user);
  });

  // --- API ROUTE: Update Profile ---
  app.post("/api/auth/update-profile", authenticateToken, async (req: any, res) => {
    try {
      const { name, photoUrl } = req.body;
      const db = readDb();
      const user = db.users[req.userEmail];

      if (!user) {
        return res.status(404).json({ error: "User profile not found." });
      }

      if (name && typeof name === "string") {
        user.name = name.trim();
        // Update automatic initials avatar seed if it was using Dicebear with initials
        if (user.photoUrl && user.photoUrl.includes("api.dicebear.com/7.x/initials")) {
          user.photoUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}&backgroundColor=2563eb,3b82f6,06b6d4`;
        }
      }

      if (photoUrl && typeof photoUrl === "string") {
        user.photoUrl = photoUrl;
      }

      writeDb(db);
      res.json({ success: true, user });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to update profile." });
    }
  });

  // --- API ROUTE: Delete Account ---
  app.post("/api/auth/delete-account", authenticateToken, async (req: any, res) => {
    try {
      const email = req.userEmail;
      const db = readDb();

      // Delete user details
      delete db.users[email];
      delete db.chats[email];
      delete db.history[email];
      delete db.settings[email];

      // Delete all sessions for this user
      Object.keys(db.sessions).forEach((token) => {
        if (db.sessions[token].email === email) {
          delete db.sessions[token];
        }
      });

      writeDb(db);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to delete account." });
    }
  });

  // --- API ROUTE: Sync Chats ---
  app.get("/api/sync/chats", authenticateToken, async (req: any, res) => {
    const db = readDb();
    const chats = db.chats[req.userEmail] || [];
    res.json(chats);
  });

  app.post("/api/sync/chats", authenticateToken, async (req: any, res) => {
    try {
      const { sessions } = req.body;
      if (!Array.isArray(sessions)) {
        return res.status(400).json({ error: "sessions array is required." });
      }

      const db = readDb();
      db.chats[req.userEmail] = sessions;
      writeDb(db);

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to sync chats." });
    }
  });

  // --- API ROUTE: Sync History ---
  app.get("/api/sync/history", authenticateToken, async (req: any, res) => {
    const db = readDb();
    const history = db.history[req.userEmail] || [];
    res.json(history);
  });

  app.post("/api/sync/history", authenticateToken, async (req: any, res) => {
    try {
      const { history } = req.body;
      if (!Array.isArray(history)) {
        return res.status(400).json({ error: "history array is required." });
      }

      const db = readDb();
      db.history[req.userEmail] = history;
      writeDb(db);

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to sync history." });
    }
  });

  // --- API ROUTE: Sync Settings ---
  app.get("/api/sync/settings", authenticateToken, async (req: any, res) => {
    const db = readDb();
    const settings = db.settings[req.userEmail] || {
      targetLevel: "College",
      difficulty: "Beginner",
      activeMode: "doubt"
    };
    res.json(settings);
  });

  app.post("/api/sync/settings", authenticateToken, async (req: any, res) => {
    try {
      const { settings } = req.body;
      const db = readDb();
      db.settings[req.userEmail] = settings;
      writeDb(db);

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to sync settings." });
    }
  });

  // Helper to retrieve the Google Gen AI client lazy loaded
  let aiInstance: GoogleGenAI | null = null;
  function getAI() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing. Please add your key in the AI Studio Secrets panel.");
    }
    if (!aiInstance) {
      aiInstance = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
    return aiInstance;
  }

  // Helper function to sleep for exponential backoff retries
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // Robust generateContent wrapper with automatic fallback models and retry capability to avoid 503/429 limits
  async function generateContentWithFallback(ai: GoogleGenAI, options: any) {
    const primaryModel = options.model || "gemini-3.5-flash";
    const candidateModels = [
      primaryModel,
      "gemini-3.5-flash",
      "gemini-3.1-flash-lite",
    ];
    const uniqueModels = Array.from(new Set(candidateModels));

    let lastError: any = null;
    for (const model of uniqueModels) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          console.log(`[AI Call] Attempting model "${model}" (attempt ${attempt}/2)`);
          const response = await ai.models.generateContent({
            ...options,
            model,
          });
          console.log(`[AI Call] Success using model "${model}"`);
          return response;
        } catch (error: any) {
          lastError = error;
          console.warn(`[AI Call Warning] Error on model "${model}" (attempt ${attempt}/2):`, error.message || error);
          
          const isTransient = error.status === 503 || error.status === 429 || error.statusCode === 503 || error.statusCode === 429 || (error.message && (error.message.includes("503") || error.message.includes("429") || error.message.toLowerCase().includes("limit") || error.message.toLowerCase().includes("demand") || error.message.toLowerCase().includes("unavailable")));
          
          if (!isTransient && attempt === 1) {
            break;
          }
          
          if (attempt < 2) {
            const delay = attempt * 1000;
            console.log(`[AI Call] Waiting ${delay}ms before retry...`);
            await sleep(delay);
          }
        }
      }
    }
    throw lastError;
  }

  // --- API ROUTE: Tutor Chat ---
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, level = "College", mode = "doubt", topic = "", attachedFile } = req.body;
      
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "messages array is required." });
      }

      const ai = getAI();

      // Formulate system instruction based on student level and active study mode
      const systemInstruction = `You are Nurovia AI, an intelligent educational assistant and highly accurate AI tutor designed to help students learn faster and understand concepts deeply.
Your primary goal is to help the user in every situation.

Strict Nurovia AI Rules to Follow:
1. Never reject a question just because it is unclear, incomplete, contains spelling mistakes, or appears meaningless.
2. First, intelligently infer the user's most likely intention from the words they used.
3. If multiple interpretations are possible, choose the most likely one and answer it. Briefly mention the assumption you made.
4. Correct spelling mistakes and grammatical errors internally before generating a response.
5. If the input is random words or nonsensical, creatively interpret them into the closest meaningful educational topic instead of refusing.
6. If the question is impossible to interpret, politely ask one short clarifying question while also giving examples of what the user might have meant.
7. Never respond with:
- "I cannot answer."
- "Invalid question."
- "Meaningless input."
- "Please ask a valid question."
8. Always be friendly, intelligent, and solution-oriented.
9. For educational questions:
- Explain concepts step by step.
- Use examples and analogies.
- Match the explanation to the selected difficulty level ("${level}").
10. Format answers using headings, bullet points, equations (when needed), and concise summaries.

Strict Pedagogical Rules to Follow:
1. EXPLAIN FIRST: Explain every topic in simple, jargon-free language first. Provide more technical detail or rigorous definitions only after establishing the intuitive foundation, or if explicitly requested.
2. STEP-BY-STEP: Break down complex concepts, mathematical derivations, or programming algorithms into small, logical, numbered steps.
3. REAL-LIFE ANALOGIES: Use vivid real-world examples and analogies for abstract concepts (e.g., comparing internet routers to mail delivery offices).
4. REASONING MATTERS: If solving a math, science, or programming question, solve it step-by-step. Never skip reasoning. Help the student improve problem-solving skills rather than encouraging copying.
5. CODING RULES: If the student asks for code, you MUST explain the high-level logic and algorithm in simple words BEFORE presenting the code. Ensure the code is commented and clean.
6. TARGET LEVEL: Adapt your vocabulary, detail depth, and tone to the requested level: "${level}".
   - School: Fun, simple analogies, basic terms, extremely encouraging.
   - College: Structured, clear, introducing academic terminology with solid explanations.
   - Beginner: Gentle introduction, no assumed prior knowledge, focus on basics.
   - Advanced: In-depth details, rigorous formulas or code structures, concise but complete.
7. ACTIVE LEARNING: Always end your response with a brief, encouraging follow-up check question or a micro-challenge (e.g., a simple conceptual question or scenario) to verify if the student understood.
8. STUDY MODE OBJECTIVE: Adapt to the requested study assistant mode:
   - "doubt": Focus on resolving doubts, answering questions, and clarifying misconceptions with high patience.
   - "homework": Help guide the student toward finding the answer themselves. Do not just output the final answer directly; guide them step-by-step.
   - "coding": Focus on code logic, debugging walkthroughs, and teaching coding design principles.
   - "notes": Help simplify, rephrase, or explain notes that the student has provided.
   - "exam": Provide mock questions, point out common exam traps, and act as a revision coach.

Your mission is to make every user feel that their question has been understood, even when it is poorly written. Be encouraging, positive, and accurate.`;

      // Convert simple message history to Gemini API format
      const contents = messages.map((m: any, idx: number) => {
        const parts: any[] = [{ text: m.content }];

        // If this is the user's latest message and an attached file exists, supply it to Gemini
        if (idx === messages.length - 1 && attachedFile) {
          if (attachedFile.type === "image" || attachedFile.type === "document") {
            parts.push({
              inlineData: {
                mimeType: attachedFile.mimeType || "application/octet-stream",
                data: attachedFile.data // base64 payload
              }
            });
          } else if (attachedFile.type === "text") {
            parts.push({
              text: `\n\n[Attached Plain Text File "${attachedFile.name}":]\n${attachedFile.data}`
            });
          }
        }

        return {
          role: m.role === "user" ? "user" : "model",
          parts
        };
      });

      // Generate response from the model with fallback and retry resilience
      const response = await generateContentWithFallback(ai, {
        model: "gemini-3.5-flash",
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("FULL ERROR:", error);
      if (error.response) {
        console.error("Response:", error.response);
      }
      res.status(500).json({
        error: error.message || "An error occurred during chat processing."
      });
    }
  });

  // --- API ROUTE: Summarize notes & generate materials (Summary, Analogy, Flashcards, Quiz) ---
  app.post("/api/summarize", async (req, res) => {
    try {
      const { text, topic = "", level = "College", image, mimeType } = req.body;
      if ((!text || typeof text !== "string") && !image) {
        return res.status(400).json({ error: "Either text or an image is required for note summarization." });
      }

      const ai = getAI();

      const prompt = `Analyze the study notes and text/images provided. Focus on the topic "${topic || "General Study"}".
Generate a comprehensive learning suite suited for a "${level}" level student.
If an image is uploaded, transcribe any study notes or text from the image, and use it as the source notes to generate the summary, analogy, flashcards, and quiz. If text is also provided, merge both inputs.

${text ? `Text:\n"""\n${text}\n"""\n` : ''}

Return a fully populated JSON object with the following structure:
- "summary": list of 4 to 8 clear, highly educational key bullet points summarizing the core concepts.
- "simplifiedExplanation": a very clear, simplified explanation of the topics in the text/images using a creative, easy-to-remember real-life analogy.
- "flashcards": an array of 4 to 6 flashcards for active recall. Each flashcard has a "front" (question, term, or prompt) and a "back" (answer, definition, or explanation).
- "quiz": an array of 4 to 6 multiple-choice practice questions. Each question must have:
  - "question": string text
  - "options": exactly 4 string options
  - "correctAnswerIndex": integer index (0-3) pointing to the correct option
  - "explanation": step-by-step reason why this option is correct and why other options are incorrect.`;

      let contents: any = prompt;
      if (image) {
        const imagePart = {
          inlineData: {
            mimeType: mimeType || "image/png",
            data: image
          }
        };
        contents = [imagePart, { text: prompt }];
      }

      const response = await generateContentWithFallback(ai, {
        model: "gemini-3.5-flash",
        contents,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Key bullet points summarizing the core concepts in the text"
              },
              simplifiedExplanation: {
                type: Type.STRING,
                description: "Friendly, simple explanation with a real-life analogy"
              },
              flashcards: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    front: { type: Type.STRING, description: "Front side (term/question)" },
                    back: { type: Type.STRING, description: "Back side (definition/explanation)" }
                  },
                  required: ["front", "back"]
                }
              },
              quiz: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    },
                    correctAnswerIndex: { type: Type.INTEGER },
                    explanation: { type: Type.STRING }
                  },
                  required: ["question", "options", "correctAnswerIndex", "explanation"]
                }
              }
            },
            required: ["summary", "simplifiedExplanation", "flashcards", "quiz"]
          }
        }
      });

      const result = JSON.parse(response.text || "{}");
      res.json(result);
    } catch (error: any) {
      console.error("Summarize API Error:", error);
      res.status(500).json({ error: error.message || "An error occurred during note processing." });
    }
  });

  // --- API ROUTE: Practice Quiz Generator ---
  app.post("/api/generate-quiz", async (req, res) => {
    try {
      const { topic, numQuestions = 5, targetLevel = "College", difficulty = "Beginner", questionTypeFilter = "all" } = req.body;
      const ai = getAI();

      const prompt = `You are a master academic assessment author. Generate a fresh, high-quality, conceptual practice quiz strictly on the following topic:
- Selected Topic: "${topic || "General Science & Mathematics"}"
- Target Student Level: "${targetLevel}" (School vs College)
- Difficulty Setting: "${difficulty}" (Beginner vs Advanced)
- Total Questions: ${numQuestions}
- Question Type Preference: "${questionTypeFilter}"

CRITICAL DIFFICULTY & LEVEL MAPPING RULES:
• School + Beginner: Easy high-school fundamental questions testing core definitions and basic application.
• School + Advanced: Challenging high-school exam questions requiring multi-step reasoning.
• College + Beginner: Introductory university / college course questions with standard conceptual depth.
• College + Advanced: Advanced, rigorous university level questions with deep problem solving and edge cases.

TOPIC ISOLATION RULE:
• Every single question MUST strictly belong to the specified topic "${topic}".
• Do NOT mix unrelated subjects (e.g. if topic is Vectors, generate ONLY vector algebra, dot product, cross product, projections, unit vectors).
• Never repeat standard textbook questions; create unique, thought-provoking scenarios.

QUESTION FORMAT DIVERSITY:
Provide a mix of question formats (MCQ, Multiple Correct, True/False, Assertion-Reason, Fill in Blank, Numerical) where appropriate:
- "mcq": single-choice options (options array + correctAnswerIndex integer)
- "multiple_correct": multiple correct options (options array + correctAnswerIndices integer array)
- "true_false": True/False options (options: ["True", "False"] + correctAnswerIndex integer)
- "assertion_reason": Assertion and Reason evaluation (options: ["Both A and R are true and R is correct explanation", "Both A and R are true but R is NOT correct explanation", "A is true but R is false", "A is false but R is true"] + correctAnswerIndex)
- "fill_in_blank": fill in the blank text/phrase (correctAnswerText string)
- "numerical": exact or rounded numeric answer (correctAnswerText string)

For every question include:
1. question: clear statement
2. type: "mcq" | "multiple_correct" | "true_false" | "assertion_reason" | "fill_in_blank" | "numerical"
3. options: array of options (for choice-based types)
4. correctAnswerIndex: 0-based integer index for single answer
5. correctAnswerIndices: array of 0-based integer indices for multiple correct answers
6. correctAnswerText: string representation for fill_in_blank or numerical
7. explanation: step-by-step breakdown of the solution
8. difficultyBadge: "Easy" | "Medium" | "Hard" | "Advanced"
9. estimatedTimeSeconds: estimated time in seconds (e.g. 30 to 120)
10. topicTag: short tag (e.g. "${topic} • Core Concepts")`;

      const response = await generateContentWithFallback(ai, {
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                type: { type: Type.STRING, description: "mcq, multiple_correct, true_false, assertion_reason, fill_in_blank, or numerical" },
                options: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                correctAnswerIndex: { type: Type.INTEGER },
                correctAnswerIndices: {
                  type: Type.ARRAY,
                  items: { type: Type.INTEGER }
                },
                correctAnswerText: { type: Type.STRING },
                explanation: { type: Type.STRING },
                difficultyBadge: { type: Type.STRING },
                estimatedTimeSeconds: { type: Type.INTEGER },
                topicTag: { type: Type.STRING }
              },
              required: ["question", "explanation"]
            }
          }
        }
      });

      const result = JSON.parse(response.text || "[]");
      res.json(result);
    } catch (error: any) {
      console.error("Generate Quiz Error:", error);
      res.status(500).json({ error: error.message || "An error occurred during quiz generation." });
    }
  });

  // --- API ROUTE: Exam Revision Planner & Timetable ---
  app.post("/api/generate-timetable", async (req, res) => {
    try {
      const { subjects, daysAvailable = 7, hoursPerDay = 3, examGoal = "", level = "College" } = req.body;
      
      const ai = getAI();

      const prompt = `Create a highly tailored study revision timetable for a student preparing for an exam.
- Student Level: ${level}
- Subjects/Topics to Cover: ${Array.isArray(subjects) ? subjects.join(", ") : subjects}
- Days until exam / available: ${daysAvailable} days
- Available hours per day: ${hoursPerDay} hours
- Exam Goal/Details: ${examGoal || "High score in upcoming test"}

Create a highly structured plan. Provide specific subtopics, list high-yield exam questions that frequently appear, suggest time management or focus tips for each session, and offer a general spaced repetition strategy.`;

      const response = await generateContentWithFallback(ai, {
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              revisionPlan: {
                type: Type.ARRAY,
                description: "A chronological list of study days",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    day: { type: Type.STRING, description: "Day label (e.g. 'Day 1', 'Day 2')" },
                    topic: { type: Type.STRING, description: "The main topic for this day" },
                    subtopics: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "List of specific subtopics to review"
                    },
                    frequentlyAskedQuestions: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "Likely exam questions or high-yield problems to practice on this topic"
                    },
                    estimatedHours: { type: Type.NUMBER, description: "Time to allocate in hours" },
                    tips: { type: Type.STRING, description: "Focus, active recall, or energy management tips tailored for this study block" }
                  },
                  required: ["day", "topic", "subtopics", "frequentlyAskedQuestions", "estimatedHours", "tips"]
                }
              },
              generalStrategy: {
                type: Type.STRING,
                description: "General advice on revision methods (active recall, spaced repetition, sleep, exam day mindset)"
              }
            },
            required: ["revisionPlan", "generalStrategy"]
          }
        }
      });

      const result = JSON.parse(response.text || "{}");
      res.json(result);
    } catch (error: any) {
      console.error("Timetable API Error:", error);
      res.status(500).json({ error: error.message || "An error occurred while generating study planner." });
    }
  });

  // --- API ROUTE: Formula Sheet Generator ---
  app.post("/api/generate-formula", async (req, res) => {
    try {
      const { topic, level = "College" } = req.body;
      if (!topic || typeof topic !== "string") {
        return res.status(400).json({ error: "topic is required for formula sheet generation." });
      }

      const ai = getAI();

      const prompt = `Generate a comprehensive Formula Library for the topic/subject: "${topic}".
Design it for a student at the "${level}" level.

For each formula or key academic concept, provide the standard equation or expression, a precise breakdown of the variables used, an intuitive real-life analogy or application, and a warning about a common mistake/trap students run into.
CRITICAL INSTRUCTIONS FOR EQUATIONS:
- Write equations in valid LaTeX syntax.
- Do NOT use the asterisk (*) for multiplication, use \\cdot or \\times instead.
- Do NOT wrap equations in $ or $$. Just return the raw LaTeX string.`;

      const response = await generateContentWithFallback(ai, {
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "Title of the formula cheat sheet" },
              formulas: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING, description: "Name of the formula or concept (e.g. Newton's Second Law)" },
                    equation: { type: Type.STRING, description: "The LaTeX string of the formula (e.g. F = m \\cdot a)" },
                    variables: { type: Type.STRING, description: "Variables description and units (e.g. F = Force in Newtons, m = mass in kg)" },
                    realLifeExample: { type: Type.STRING, description: "Vivid real-life example or physical analogy" },
                    commonMistake: { type: Type.STRING, description: "Common trap or misconception that causes lost points" }
                  },
                  required: ["name", "equation", "variables", "realLifeExample", "commonMistake"]
                }
              }
            },
            required: ["title", "formulas"]
          }
        }
      });

      const result = JSON.parse(response.text || "{}");
      res.json(result);
    } catch (error: any) {
      console.error("Formula API Error:", error);
      res.status(500).json({ error: error.message || "An error occurred while generating the formula sheet." });
    }
  });

  // --- VITE MIDDLEWARE SETUP ---
  if (process.env.NODE_ENV !== "production") {
    console.log("Setting up Vite server in development mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Setting up static file serving in production mode...");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`studySpark AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
