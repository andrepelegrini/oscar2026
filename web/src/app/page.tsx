"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/Card";

function getParticipantId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("participant_id");
}
function setParticipantId(id: string) {
  localStorage.setItem("participant_id", id);
}

export default function HomePage() {
  const router = useRouter();

  const [participantId, setLocalParticipantId] = useState<string | null>(null);
  const [showName, setShowName] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const id = getParticipantId();
    if (id) setLocalParticipantId(id);
  }, []);

  async function ensureParticipantAndGo() {
    // já tem participante → vai direto
    if (participantId) {
      router.push("/oscar-2026/palpites");
      return;
    }
    // não tem → abre o input
    setShowName(true);
  }

  async function createParticipant() {
    const trimmed = name.trim();
    if (!trimmed) return;

    setCreating(true);

    const { data, error } = await supabase
      .from("participants")
      .insert({ name: trimmed })
      .select("id")
      .single<{ id: string }>();

    if (error || !data?.id) {
      alert(error?.message ?? "Erro ao criar participante");
      setCreating(false);
      return;
    }

    setParticipantId(data.id);
    setLocalParticipantId(data.id);
    setCreating(false);

    router.push("/oscar-2026/palpites");
  }

  return (
    <AppShell>
      <section className="hero">
        <div className="heroGrid">
          <div>
            <div className="heroKicker">ART DECO • NOIR • 2026</div>
            <h1 className="heroTitle">Bolão do Óscar</h1>
            <p className="heroSubtitle">
              Entre com seu nome, faça seus palpites e acompanhe o ranking. Sem login.
            </p>

            <div className="heroActions">
              {/* Botão principal */}
              <button
                className="heroBtn primary"
                onClick={ensureParticipantAndGo}
                type="button"
              >
                {participantId ? "Continuar meus palpites" : "Entrar no bolão"}
                <span className="hint">
                  {participantId ? "Voltar para categorias" : "Digite seu nome uma vez"}
                </span>
              </button>

              {/* Ranking sempre visível */}
              <Link className="heroBtn ghost" href="/oscar-2026/ranking">
                Ver ranking
                <span className="hint">Pontuação ao vivo</span>
              </Link>
            </div>

            {/* Painel de nome (aparece quando precisa) */}
            {showName && !participantId && (
              <div
                style={{
                  marginTop: 16,
                  padding: 14,
                  borderRadius: 16,
                  border: "1px solid var(--border)",
                  background: "rgba(0,0,0,0.18)",
                }}
              >
                <div style={{ fontFamily: "var(--font-display)", letterSpacing: 1 }}>
                  Digite seu nome
                </div>

                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: André"
                  style={{
                    marginTop: 10,
                    width: "100%",
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid var(--border-soft)",
                    background: "var(--card)",
                    color: "var(--text)",
                  }}
                />

                <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                  <button
                    className="heroBtn primary"
                    style={{ padding: "12px 14px" }}
                    onClick={createParticipant}
                    disabled={creating}
                    type="button"
                  >
                    {creating ? "Criando..." : "Começar"}
                    <span className="hint">Salvar no dispositivo</span>
                  </button>

                  <button
                    className="heroBtn ghost"
                    style={{ padding: "12px 14px" }}
                    onClick={() => setShowName(false)}
                    type="button"
                  >
                    Cancelar
                    <span className="hint">Voltar</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Poster com estatueta */}
          <div className="heroPoster">
            <Card>
              <CardContent>
                <div className="posterInner">
                  <div className="posterFrame" />
                  <OscarStatuette />
                  <div className="posterText">
                    <div className="posterTop">THE ACADEMY</div>
                    <div className="posterBig">OSCAR</div>
                    <div className="posterBottom">BOLÃO • 2026</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <footer className="siteFooter">
        © {new Date().getFullYear()} André Pelegrini. Todos os direitos reservados.
      </footer>
    </AppShell>
  );
}

function OscarStatuette() {
  return (
    <svg className="oscarSvg" viewBox="0 0 220 520" role="img" aria-label="Estatueta do Oscar">
      <defs>
        <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--gold-light)" />
          <stop offset="0.45" stopColor="var(--gold)" />
          <stop offset="1" stopColor="#9C7A1F" />
        </linearGradient>
        <radialGradient id="shine" cx="35%" cy="20%" r="70%">
          <stop offset="0" stopColor="rgba(255,255,255,0.45)" />
          <stop offset="0.35" stopColor="rgba(255,255,255,0.10)" />
          <stop offset="1" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>

      <path d="M55 455c0-25 14-40 55-40s55 15 55 40v18H55v-18z" fill="url(#goldGrad)" opacity="0.92" />
      <path d="M42 473h136c4 0 7 3 7 7v22c0 10-8 18-18 18H53c-10 0-18-8-18-18v-22c0-4 3-7 7-7z" fill="url(#goldGrad)" />
      <path d="M58 470h104" stroke="rgba(0,0,0,0.25)" strokeWidth="3" opacity="0.35" />

      <path
        d="M110 28
           c20 0 34 16 34 36
           c0 12-5 22-12 28
           c18 20 28 44 26 70
           c-2 28-17 48-25 65
           c-6 13-5 31 3 47
           c8 16 10 33 6 51
           c-7 32-23 55-26 83
           c-2 18 5 39 10 57
           c2 7-2 14-9 16
           c-19 5-41 5-60 0
           c-7-2-11-9-9-16
           c5-18 12-39 10-57
           c-3-28-19-51-26-83
           c-4-18-2-35 6-51
           c8-16 9-34 3-47
           c-8-17-23-37-25-65
           c-2-26 8-50 26-70
           c-7-6-12-16-12-28
           c0-20 14-36 34-36z"
        fill="url(#goldGrad)"
      />

      <path
        d="M110 28
           c20 0 34 16 34 36
           c0 12-5 22-12 28
           c18 20 28 44 26 70
           c-2 28-17 48-25 65
           c-6 13-5 31 3 47
           c8 16 10 33 6 51
           c-7 32-23 55-26 83
           c-2 18 5 39 10 57
           c2 7-2 14-9 16
           c-19 5-41 5-60 0
           c-7-2-11-9-9-16
           c5-18 12-39 10-57
           c-3-28-19-51-26-83
           c-4-18-2-35 6-51
           c8-16 9-34 3-47
           c-8-17-23-37-25-65
           c-2-26 8-50 26-70
           c-7-6-12-16-12-28
           c0-20 14-36 34-36z"
        fill="url(#shine)"
        opacity="0.75"
      />

      <path
        d="M110 28
           c20 0 34 16 34 36
           c0 12-5 22-12 28
           c18 20 28 44 26 70
           c-2 28-17 48-25 65
           c-6 13-5 31 3 47
           c8 16 10 33 6 51
           c-7 32-23 55-26 83
           c-2 18 5 39 10 57
           c2 7-2 14-9 16
           c-19 5-41 5-60 0
           c-7-2-11-9-9-16
           c5-18 12-39 10-57
           c-3-28-19-51-26-83
           c-4-18-2-35 6-51
           c8-16 9-34 3-47
           c-8-17-23-37-25-65
           c-2-26 8-50 26-70
           c-7-6-12-16-12-28
           c0-20 14-36 34-36z"
        fill="none"
        stroke="rgba(0,0,0,0.25)"
        strokeWidth="3"
        opacity="0.35"
      />
    </svg>
  );
}