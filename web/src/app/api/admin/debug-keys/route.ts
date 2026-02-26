import { NextResponse } from "next/server";

function jwtRole(token: string | undefined) {
  if (!token) return { present: false };

  const parts = token.split(".");
  if (parts.length < 2) return { present: true, validJwt: false };

  try {
    const payloadJson = Buffer.from(parts[1], "base64").toString("utf8");
    const payload = JSON.parse(payloadJson);

    return {
      present: true,
      validJwt: true,
      role: payload.role ?? null,
      ref: payload.ref ?? null,
      // só pra bater se é a mesma key no runtime (não vaza segredo)
      prefix: token.slice(0, 12),
      length: token.length,
    };
  } catch {
    return { present: true, validJwt: false };
  }
}

export async function GET() {
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return NextResponse.json({
    anon: jwtRole(anon),
    service: jwtRole(service),
  });
}