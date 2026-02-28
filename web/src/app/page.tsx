"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { AppShell } from "@/components/AppShell";
import { getParticipantId, setParticipantId } from "@/lib/participant";

export default function HomePage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  // Inicialização preguiçosa (Lazy Initializer)
  const [participantId, setLocalParticipantId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return getParticipantId();
    }
    return null;
  });

  async function handleEnter() {
    if (!name.trim()) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("participants")
      .insert({ name: name.trim() })
      .select()
      .single();

    if (error) {
      alert("Erro ao criar participante.");
      setLoading(false);
      return;
    }

    setParticipantId(data.id);
    setLocalParticipantId(data.id);
    
    router.push("/oscar-2026/palpites");
  }

  // Componente de Footer para reutilizar nas duas telas
  const Footer = () => (
    <footer style={{
      textAlign: "center",
      padding: "40px 20px",
      opacity: 0.5,
      fontSize: 13,
      borderTop: "1px solid var(--border)",
      marginTop: "auto", // Empurra para o fim do container flex
      width: "100%"
    }}>
      <p>© {new Date().getFullYear()} André Pelegrini, founder @ Cadenzia. Todos os direitos reservados.</p>
    </footer>
  );

  // Tela de Login (Se não houver ID de participante)
  if (!participantId) {
    return (
      <AppShell>
        <div style={{ 
          display: "flex", 
          flexDirection: "column", 
          minHeight: "80vh" // Garante altura para o footer descer
        }}>
          <div style={{ maxWidth: 500, margin: "80px auto 40px", padding: "0 20px", flex: 1 }}>
            <h1 style={{ fontSize: 42, marginBottom: 8 }}>Entrar no Bolão</h1>
            <p style={{ color: "var(--text-muted)", marginBottom: 24 }}>
              Participe e faça seus palpites para o Oscar 2026.
            </p>

            <input
              placeholder="Digite seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: "100%",
                padding: 14,
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--card)",
                color: "var(--text)",
                fontSize: 16,
                outline: "none"
              }}
            />

            <button
              onClick={handleEnter}
              disabled={loading}
              style={{
                marginTop: 16,
                width: "100%",
                padding: 14,
                borderRadius: 14,
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                background: "linear-gradient(180deg, var(--gold), var(--gold-light))",
                color: "#000",
                fontWeight: 600,
                fontSize: 16,
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? "Entrando..." : "Entrar no Bolão"}
            </button>
          </div>
          <Footer />
        </div>
      </AppShell>
    );
  }

  // Tela de Boas-vindas (Se já existe participante logado)
  return (
    <AppShell>
      <div style={{ 
        display: "flex", 
        flexDirection: "column", 
        minHeight: "80vh" 
      }}>
        <div style={{ textAlign: "center", marginTop: 80, padding: "0 20px", flex: 1 }}>
          <h1 style={{ fontSize: 36 }}>Bem-vindo ao Bolão 🎬</h1>
          <p style={{ marginTop: 8, color: "var(--text-muted)" }}>
            Seu acesso está ativo. Pronto para votar?
          </p>
          
          <button
            style={{
              marginTop: 24,
              padding: "16px 32px",
              borderRadius: 14,
              border: "1px solid var(--border)",
              background: "var(--card)",
              color: "var(--text)",
              cursor: "pointer",
              fontWeight: 500,
              fontSize: 16,
              transition: "all 0.2s"
            }}
            onClick={() => router.push("/oscar-2026/palpites")}
          >
            Ir para Meus Palpites
          </button>
        </div>
        <Footer />
      </div>
    </AppShell>
  );
}