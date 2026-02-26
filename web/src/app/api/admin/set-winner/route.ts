import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function required(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env var: ${name}`);
  }
  return value;
}

export async function POST(req: Request) {
  // 🔐 Fail-fast: garante que as env vars existem no build/runtime
  const url = required("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = required("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const serviceKey = required("SUPABASE_SERVICE_ROLE_KEY");
  const adminEmail = required("ADMIN_EMAIL");

  // 🔑 Pega token do usuário logado
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "") ?? null;

  if (!token) {
    return NextResponse.json({ error: "No token" }, { status: 401 });
  }

  // 👤 Valida usuário usando anon key
  const supabaseAnon = createClient(url, anonKey);
  const { data: userData, error: userError } =
    await supabaseAnon.auth.getUser(token);

  if (userError || !userData.user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const email = (userData.user.email ?? "").toLowerCase();
  if (email !== adminEmail.toLowerCase()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 📦 Dados enviados
  const body = await req.json();
  const { category_id, winner_nominee_id } = body ?? {};

  if (!category_id || !winner_nominee_id) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // 🛠️ Usa SERVICE ROLE para bypass do RLS
  const supabaseAdmin = createClient(url, serviceKey);

  const { error: upsertError } = await supabaseAdmin
    .from("results")
    .upsert(
      { category_id, winner_nominee_id },
      { onConflict: "category_id" }
    );

  if (upsertError) {
    return NextResponse.json(
      { error: upsertError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}