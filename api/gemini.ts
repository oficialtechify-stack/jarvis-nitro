import { GoogleGenAI } from "@google/genai";
import { validateAIRequest } from "./_auth";

export default async function handler(req: any, res: any) {
  if (!(await validateAIRequest(req, res))) return;
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) return res.status(503).json({ error: "Configure GEMINI_API_KEY na Vercel." });
  const { model, stream, ...options } = req.body || {};
  const allowed = new Set(["gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-2.5-flash", "gemini-3.1-pro-preview"]);
  if (!allowed.has(model)) return res.status(400).json({ error: "Modelo Gemini inválido." });
  try {
    const ai = new GoogleGenAI({ apiKey: key });
    if (stream) {
      res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
      res.setHeader("X-Content-Type-Options", "nosniff");
      const chunks = await ai.models.generateContentStream({ model, ...options });
      for await (const chunk of chunks) res.write(JSON.stringify({ text: chunk.text || "", candidates: chunk.candidates, functionCalls: chunk.functionCalls }) + "\n");
      return res.end();
    }
    const answer = await ai.models.generateContent({ model, ...options });
    return res.status(200).json({ text: answer.text || "", candidates: answer.candidates, functionCalls: answer.functionCalls, usageMetadata: answer.usageMetadata });
  } catch (error: any) {
    console.error("Gemini request failed", error?.status || error?.name);
    if (res.headersSent) return res.end();
    return res.status(502).json({ error: "Falha na geração Gemini. Verifique modelo, quota e credencial." });
  }
}
