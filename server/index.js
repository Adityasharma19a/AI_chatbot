import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import fetch from "node-fetch";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// ✅ MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

// ✅ Chat Route
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY not set — returning simulated dev reply");
      // Dev fallback: return a simulated but helpful reply so the UI remains interactive
      const simulated = generateDevReply(message);
      return res.status(200).json({ reply: simulated, dev: true });
    }

    // Use a configurable model name. If not provided, default to a supported model.
    const modelName = process.env.GEMINI_MODEL || "models/gemini-pro-latest";
    const url = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: message }] }],
      }),
    });

    const data = await response.json();

    // Log the raw response for easier debugging in development
    console.debug("Gemini raw response:", JSON.stringify(data));

    // Try multiple common response shapes used by the generative API
    const candidateText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      data?.candidates?.[0]?.content?.[0]?.text ||
      data?.candidates?.[0]?.output?.[0]?.content?.[0]?.text ||
      data?.output_text ||
      data?.outputs?.[0]?.content?.text;

    if (!response.ok) {
      // If the API returned an error status, log it and return a simulated dev reply so UX stays usable
      console.error("Gemini API returned non-OK status", response.status, data);
      const simulated = generateDevReply(message);
      return res.status(200).json({ reply: simulated, dev: true, apiError: data });
    }

    if (candidateText && String(candidateText).trim().length > 0) {
      return res.json({ reply: String(candidateText).trim() });
    }

    // If the model returned no text, log and fall back to a simulated reply so the UI shows something
    console.warn("Gemini returned no candidate text", data);
    const simulated = generateDevReply(message);
    return res.status(200).json({ reply: simulated, dev: true });
  } catch (err) {
    console.error("Unexpected error in /api/chat:", err);
    // On unexpected errors, provide a simulated dev reply so the UX remains responsive
    const simulated = generateDevReply(req.body?.message || "");
    res.status(200).json({ reply: simulated, dev: true, error: String(err?.message || err) });
  }
});

// Debug helper: list available models from the Generative Language API
app.get("/api/models", async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(400).json({ error: "GEMINI_API_KEY not configured" });
    }

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`
    );
    const data = await resp.json();

    if (!resp.ok) {
      console.error("ListModels API returned non-OK status", resp.status, data);
      return res.status(502).json({ error: "ListModels failed", details: data });
    }

    // Return the raw models list so you can inspect supported methods and model names
    return res.json(data);
  } catch (err) {
    console.error("Error listing models:", err);
    return res.status(500).json({ error: String(err) });
  }
});

// Small helper to produce a simple simulated reply in development.
function generateDevReply(message) {
  if (!message || String(message).trim().length === 0) return "Hi — send me a message and I'll reply.";
  const m = String(message).trim();
  const lower = m.toLowerCase();
  if (/(who|what)\b/.test(lower)) return `Dev Assistant: I don't have the model key in this environment, but I can tell you: ${m}`;
  if (/how|why|explain/.test(lower)) return `Dev Assistant: Here's a short explanation for: ${m}`;
  if (m.length < 30) return `Dev Assistant: I heard '${m}' — here's a helpful note about that.`;
  return `Dev Assistant: (simulated) Thanks for your message. You said: ${m}`;
}

// ✅ Start Server
app.listen(process.env.PORT, () => {
  console.log(`🚀 Server running on port ${process.env.PORT}`);
});
