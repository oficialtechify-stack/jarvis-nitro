import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Security Headers Middleware
  app.use((req, res, next) => {
    // 1. Restrict CORS (remover access-control-allow-origin: * — restrinja ao seu domínio)
    const origin = req.headers.origin;
    const allowedOriginRegex = /^(https?:\/\/(localhost:\d+|127\.0\.0\.1:\d+|.*\.run\.app|.*\.google\.com|.*\.aistudio\.google|.*\.studio))$/;
    
    if (origin && allowedOriginRegex.test(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
    
    // Allow necessary headers and methods for J.A.R.V.I.S. operations
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // 2. Content-Security-Policy (CSP)
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.google.com https://*.googleapis.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.googleapis.com https://*.gstatic.com; " +
      "font-src 'self' data: https://fonts.gstatic.com https://fonts.googleapis.com; " +
      "img-src 'self' data: blob: https://*.googleusercontent.com https://*.google.com https://*.gstatic.com; " +
      "connect-src 'self' https://api.groq.com https://generativelanguage.googleapis.com https://*.googleapis.com wss://*.googleapis.com https://*.firebaseapp.com https://*.identitytoolkit.googleapis.com https://*.securetoken.googleapis.com https://*.firestore.googleapis.com wss://*.firestore.googleapis.com https://*.google.com; " +
      "frame-src 'self' https://*.google.com https://*.studio https://*.aistudio.google; " +
      "frame-ancestors 'self' https://*.google.com https://*.studio https://*.aistudio.google; " +
      "media-src 'self' data: blob: https://*.google.com https://*.googleapis.com;"
    );

    // 3. X-Frame-Options: SAMEORIGIN (Note: frame-ancestors in CSP provides the modern equivalent, but adding this as requested)
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');

    // 4. X-Content-Type-Options: nosniff
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // 5. Referrer-Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // 6. Permissions-Policy
    res.setHeader('Permissions-Policy', 'microphone=(self), camera=(), geolocation=()');

    // Handle pre-flight OPTIONS requests
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }

    next();
  });

  app.use(express.json({ limit: "15mb" }));

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { prompt, context, imageBase64, customKey } = req.body;
      const apiKey = customKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

      if (!apiKey) {
        return res.status(400).json({
          error: "Chave GEMINI_API_KEY não encontrada no servidor nem configurada no cliente.",
          code: "MISSING_API_KEY"
        });
      }

      const ai = new GoogleGenAI({ apiKey });
      const models = ["gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-3.1-pro-preview"];
      
      let lastErr: any = null;
      for (const model of models) {
        try {
          const contents: any[] = [];
          const parts: any[] = [{ text: `${context || ""}\n\nUsuário: ${prompt}` }];
          if (imageBase64) {
            const matches = imageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
            if (matches) {
              parts.push({
                inlineData: {
                  mimeType: matches[1],
                  data: matches[2]
                }
              });
            }
          }
          contents.push({ role: "user", parts });

          const response = await ai.models.generateContent({
            model,
            contents
          });

          if (response && response.text) {
            return res.json({ text: response.text });
          }
        } catch (mErr: any) {
          lastErr = mErr;
          console.warn(`Server model ${model} failed:`, mErr?.message);
        }
      }

      throw lastErr || new Error("Todos os modelos Gemini falharam no servidor.");
    } catch (err: any) {
      console.error("Server /api/chat error:", err);
      return res.status(500).json({
        error: err?.message || String(err),
        status: err?.status || 500
      });
    }
  });

  // Vite middleware for development vs static asset serving for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
