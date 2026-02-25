import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const adminEmail = process.env.ADMIN_EMAIL!;

  // Pega o JWT do usuário logado (via cookies)
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "") ?? null;

  if (!token) {
    return NextResponse.json({ ok: false, error: "No token" }, { status: 401 });
  }

  const supabase = createClient(url, anon);

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 });
  }

  const email = data.user.email ?? "";
  const ok = email.toLowerCase() === adminEmail.toLowerCase();

  return NextResponse.json({ ok });
}