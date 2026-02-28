"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { AppShell } from "@/components/AppShell";
import { getParticipantId, setParticipantId } from "@/lib/participant";

export default function HomePage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [participantId, setLocalParticipantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const id = getParticipantId();
    if (id) setLocalParticipantId(id);
  }, []);

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
    router.push("/oscar-2026/palpites");
  }

  if (!participantId) {
    return (
      <AppShell>
        <div style={{ maxWidth: 500, margin: "80px auto" }}>
          <h1 style={{ fontSize: 42 }}>Entrar no Bolão</h1>

          <input
            placeholder="Digite seu nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              width: "100%",
              padding: 14,
              marginTop: 20,
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "var(--card)",
              color: "var(--text)",
              fontSize: 16,
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
              cursor: "pointer",
              background:
                "linear-gradient(180deg, var(--gold), var(--gold-light))",
              fontWeight: 600,
            }}
          >
            {loading ? "Entrando..." : "Entrar no Bolão"}
          </button>
        </div>
      </AppShell>
    );
  }

  // Se já existe participant_id
  return (
    <AppShell>
      <div style={{ textAlign: "center", marginTop: 80 }}>
        <h1>Bem-vindo ao Bolão 🎬</h1>
        <button
          style={{
            marginTop: 20,
            padding: 16,
            borderRadius: 14,
            border: "1px solid var(--border)",
            background: "var(--card)",
            cursor: "pointer",
          }}
          onClick={() => router.push("/oscar-2026/palpites")}
        >
          Fazer meus palpites
        </button>
      </div>
    </AppShell>
  );
}