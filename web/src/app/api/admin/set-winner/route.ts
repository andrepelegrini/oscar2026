import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const ADMIN_EMAILS = new Set([
  "SEU_EMAIL_AQUI@exemplo.com", // troque pelo seu email do usuário admin
]);

export async function POST(req: Request) {
  // Checagem simples (MVP): segredo via header
  const adminSecret = req.headers.get("x-admin-secret");
  if (!process.env.ADMIN_SECRET || adminSecret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { category_id, winner_nominee_id } = body ?? {};

  if (!category_id || !winner_nominee_id) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("results")
    .upsert(
      { category_id, winner_nominee_id },
      { onConflict: "category_id" }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}