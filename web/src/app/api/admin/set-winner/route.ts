import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabase } from "@/lib/supabase/client";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // 1. Verificar se o usuário está logado
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // 2. Receber os dados
    const { category_id, winner_nominee_id } = await request.json();

    if (!category_id) {
      return NextResponse.json({ error: "category_id é obrigatório" }, { status: 400 });
    }

    // 3. Ação no Banco de Dados usando o Admin
    if (winner_nominee_id === null) {
      // Deletar o registro para limpar o vencedor
      const { error: deleteError } = await supabaseAdmin
        .from("results")
        .delete()
        .eq("category_id", category_id);

      if (deleteError) throw deleteError;
      
      return NextResponse.json({ ok: true, message: "Vencedor removido" });
    } else {
      // Inserir ou atualizar vencedor
      const { error: upsertError } = await supabaseAdmin
        .from("results")
        .upsert(
          { 
            category_id, 
            winner_nominee_id 
          },
          { onConflict: "category_id" }
        );

      if (upsertError) throw upsertError;

      return NextResponse.json({ ok: true, message: "Vencedor salvo" });
    }

  } catch (error: unknown) {
    // RESOLUÇÃO DO ERRO DE ANY:
    const errorMessage = error instanceof Error ? error.message : "Erro interno";
    console.error("Erro na API set-winner:", errorMessage);
    
    return NextResponse.json(
      { error: errorMessage }, 
      { status: 500 }
    );
  }
}