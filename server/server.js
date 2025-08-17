import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import fs from "fs";
import path from "path";
import rateLimit from "express-rate-limit";
import nodemailer from "nodemailer";
import Groq from "groq-sdk";

dotenv.config();

const app = express();

// --- Middleware ---
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// CORS (allow only your frontend or all in dev)
app.use(cors());

app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") || "*",
    credentials: false
  })
);

// Basic rate limit
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30
});
app.use(limiter);

// --- File uploads (text only) ---
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (req, file, cb) => {
    const ok =
      file.mimetype === "text/plain" ||
      file.originalname.toLowerCase().endsWith(".txt");
    cb(ok ? null : new Error("Only .txt files allowed"), ok);
  }
});

// --- Groq client (LLM) ---
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

// --- Health check ---
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "mangodesk-ai-notes",
    time: new Date().toISOString()
  });
});

// --- Summarize endpoint ---
app.post("/api/summarize", upload.single("file"), async (req, res) => {
  try {
    const userPrompt = (req.body.prompt || "").trim();
    const inlineTranscript = (req.body.transcript || "").trim();

    let transcript = inlineTranscript;

    if (req.file) {
      const abs = path.resolve(req.file.path);
      transcript = fs.readFileSync(abs, "utf8");
      fs.unlink(abs, () => {}); // clean up temp file
    }

    if (!transcript) {
      return res
        .status(400)
        .json({ error: "Transcript is required (file or text)." });
    }

    const system = [
      "You are a precise meeting notes summarizer.",
      "Return clear, structured output.",
      "If the user asks for bullet points, use short bullets.",
      "If they ask to highlight action items, include an 'Action Items' section with assignee and due date when possible.",
      "Keep it concise but comprehensive."
    ].join(" ");

    const instruction =
      userPrompt ||
      "Summarize in concise bullet points with key decisions and action items.";

    const content = [
      `=== TRANSCRIPT START ===\n${transcript}\n=== TRANSCRIPT END ===`,
      `\nUser Instruction: ${instruction}`,
      `\nOutput format template: 
## Executive Summary
- ...

## Key Points
- ...

## Decisions
- ...

## Action Items
- [Assignee] Action — Due: <date>`
    ].join("\n");

    const completion = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content }
      ]
    });

    const summary =
      completion?.choices?.[0]?.message?.content?.trim() ||
      "No summary generated.";

    res.json({ summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate summary." });
  }
});

// --- Email endpoint ---
app.post("/api/send-email", async (req, res) => {
  try {
    const { to, subject, summary } = req.body || {};
    if (!to || !summary) {
      return res
        .status(400)
        .json({ error: "Fields 'to' and 'summary' are required." });
    }

   const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: String(process.env.SMTP_SECURE) === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

    const info = await transporter.sendMail({
      from: process.env.FROM_EMAIL || process.env.SMTP_USER,
      to,
      subject: subject || "Meeting Summary",
      text: summary
    });

    res.json({ ok: true, messageId: info.messageId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send email." });
  }
});

// --- Start server ---
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
