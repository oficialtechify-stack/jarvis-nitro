import { validateAIRequest } from "./_auth";
export default async function handler(req: any, res: any) {
  if (!(await validateAIRequest(req, res))) return;
  const key = process.env.GROQ_API_KEY;
  if (!key) return res.status(503).json({ error: "Configure GROQ_API_KEY na Vercel." });
  const { model, messages, stream, temperature, max_tokens } = req.body || {};
  const allowed = new Set(["openai/gpt-oss-120b", "openai/gpt-oss-20b"]);
  if (!allowed.has(model) || !Array.isArray(messages)) return res.status(400).json({ error: "Requisição Groq inválida." });
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, stream: !!stream, temperature: temperature ?? 0.7, max_tokens: Math.min(max_tokens || 1536, 4096) })
    });
    if (!response.ok) {
      console.error("Groq status", response.status);
      return res.status(response.status === 429 ? 429 : 502).json({ error: response.status === 429 ? "Limite temporário da Groq excedido." : "Falha ao consultar Groq." });
    }
    if (!stream) return res.status(200).json(await response.json());
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    if (!response.body) return res.end();
    const reader = response.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
    } finally { reader.releaseLock(); }
    return res.end();
  } catch (error: any) {
    console.error("Groq gateway failure", error?.name);
    if (res.headersSent) return res.end();
    return res.status(502).json({ error: "Falha temporária de comunicação com a Groq." });
  }
}
