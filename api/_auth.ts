import { createRemoteJWKSet, jwtVerify } from "jose";

const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"));
export async function validateAIRequest(req: any, res: any): Promise<boolean> {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") { res.status(405).json({ error: "Método não permitido" }); return false; }
  const token = /^Bearer (.+)$/.exec(req.headers.authorization || "")?.[1];
  if (!token) { res.status(401).json({ error: "Faça login para utilizar a IA." }); return false; }
  const project = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "will-copilot";
  try {
    const result = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${project}`, audience: project,
      algorithms: ["RS256"]
    });
    if (!result.payload.sub || typeof result.payload.sub !== "string") throw Error("UID inválido");
    return true;
  } catch {
    res.status(401).json({ error: "Sua sessão expirou. Entre novamente." });
    return false;
  }
}
