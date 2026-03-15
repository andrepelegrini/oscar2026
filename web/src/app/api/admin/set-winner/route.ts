import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // 1. Validar o Token manualmente através do Header de Autorização
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Token não fornecido" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Usamos o supabaseAdmin para verificar se o token do usuário é válido
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Sessão inválida ou expirada" }, { status: 401 });
    }

    // 2. Receber os dados da requisição
    const { category_id, winner_nominee_id } = await request.json();

    if (!category_id) {
      return NextResponse.json({ error: "category_id é obrigatório" }, { status: 400 });
    }

    // 3. Ação no Banco de Dados usando o Admin
    if (winner_nominee_id === null) {
      // Deletar o registro para limpar o vencedor (Toggle OFF)
      const { error: deleteError } = await supabaseAdmin
        .from("results")
        .delete()
        .eq("category_id", category_id);

      if (deleteError) throw deleteError;
      
      return NextResponse.json({ ok: true, message: "Vencedor removido" });
    } else {
      // Inserir ou atualizar vencedor (Toggle ON ou Troca)
      const { error: upsertError } = await supabaseAdmin
        .from("results")
        .upsert(
          { 
            category_id, 
            winner_nominee_id,
            announced_at: new Date().toISOString()
          },
          { onConflict: "category_id" }
        );

      if (upsertError) throw upsertError;

      return NextResponse.json({ ok: true, message: "Vencedor salvo" });
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Erro interno";
    console.error("Erro na API set-winner:", errorMessage);
    
    return NextResponse.json(
      { error: errorMessage }, 
      { status: 500 }
    );
  }
}