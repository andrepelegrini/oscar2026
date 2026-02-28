"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

type EventRow = { id: string };
type Category = { id: string; name: string };
type Nominee = { id: string; category_id: string; name: string; film: string | null };
type Prediction = { category_id: string; nominee_id: string };

function getParticipantId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("participant_id");
}

const DEADLINE = new Date("2026-03-15T17:00:00-03:00");

export default function PalpitesPage() {
  const router = useRouter();

  const [participantId, setParticipantId] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [nominees, setNominees] = useState<Nominee[]>([]);
  const [selected, setSelected] = useState<Record<string, string>>({}); // category_id -> nominee_id

  const [loading, setLoading] = useState(true);
  const [savingCat, setSavingCat] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const locked = useMemo(() => new Date() > DEADLINE, []);

  useEffect(() => {
    async function load() {
      setError(null);
      setLoading(true);

      const pid = getParticipantId();
      if (!pid) {
        router.push("/");
        return;
      }
      setParticipantId(pid);

      // 1) event
      const { data: event, error: evErr } = await supabase
        .from("events")
        .select("id")
        .eq("slug", "oscar-2026")
        .single<EventRow>();

      if (evErr || !event) {
        setError(evErr?.message ?? "Evento não encontrado");
        setLoading(false);
        return;
      }

      // 2) categories
      const { data: cats, error: catsErr } = await supabase
        .from("categories")
        .select("id,name")
        .eq("event_id", event.id)
        .order("sort_order")
        .returns<Category[]>();

      if (catsErr) {
        setError(catsErr.message);
        setLoading(false);
        return;
      }

      // 3) nominees
      const { data: noms, error: nomsErr } = await supabase
        .from("nominees")
        .select("id,category_id,name,film")
        .returns<Nominee[]>();

      if (nomsErr) {
        setError(nomsErr.message);
        setLoading(false);
        return;
      }

      // 4) existing predictions for participant
      const { data: preds, error: predsErr } = await supabase
        .from("predictions")
        .select("category_id,nominee_id")
        .eq("participant_id", pid)
        .returns<Prediction[]>();

      if (predsErr) {
        setError(predsErr.message);
        setLoading(false);
        return;
      }

      const map: Record<string, string> = {};
      preds?.forEach((p) => {
        map[p.category_id] = p.nominee_id;
      });

      setCategories(cats ?? []);
      setNominees(noms ?? []);
      setSelected(map);
      setLoading(false);
    }

    load();
  }, [router]);

  async function savePick(categoryId: string, nomineeId: string) {
    if (!participantId) return;
    if (locked) return;

    setError(null);
    setSavingCat(categoryId);

    // atualiza UI otimista
    setSelected((prev) => ({ ...prev, [categoryId]: nomineeId }));

    const { error: upsertErr } = await supabase
      .from("predictions")
      .upsert(
        {
          participant_id: participantId,
          category_id: categoryId,
          nominee_id: nomineeId,
        },
        { onConflict: "participant_id,category_id" }
      );

    if (upsertErr) {
      // desfaz UI se falhar
      setSelected((prev) => {
        const copy = { ...prev };
        delete copy[categoryId];
        return copy;
      });
      setError(upsertErr.message);
    }

    setSavingCat(null);
  }

  if (loading) {
    return (
      <AppShell title="Palpites" subtitle="Carregando categorias...">
        <div />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Palpites"
      subtitle={
        locked
          ? "Palpites encerrados. Agora é só aguardar os vencedores."
          : "Escolha um vencedor por categoria. Você pode alterar até o deadline."
      }
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
        <Badge>
          Deadline: {formatDeadline(DEADLINE)}
        </Badge>
        <Badge>
          Status: {locked ? "Encerrado" : "Aberto"}
        </Badge>
      </div>

      {error && (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            border: "1px solid rgba(155,36,53,0.7)",
            borderRadius: 12,
            background: "rgba(110,15,30,0.18)",
          }}
        >
          <b>Erro:</b> {error}
        </div>
      )}

      <div style={{ display: "grid", gap: 14 }}>
        {categories.map((cat) => {
          const catNominees = nominees.filter((n) => n.category_id === cat.id);

          return (
            <Card key={cat.id}>
              <CardHeader>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
                  <h2 style={{ margin: 0, fontSize: 18 }}>{cat.name}</h2>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {savingCat === cat.id ? "Salvando..." : selected[cat.id] ? "Selecionado ✓" : ""}
                  </span>
                </div>
              </CardHeader>

              <CardContent>
                <div style={{ display: "grid", gap: 10 }}>
                  {catNominees.map((n) => {
                    const label = n.film ? `${n.name} — ${n.film}` : n.name;
                    const checked = selected[cat.id] === n.id;

                    return (
                      <label
                        key={n.id}
                        style={{
                          display: "flex",
                          gap: 10,
                          alignItems: "center",
                          padding: "10px 12px",
                          borderRadius: 14,
                          border: checked ? "1px solid var(--border)" : "1px solid rgba(212,175,55,0.12)",
                          background: checked ? "rgba(212,175,55,0.08)" : "rgba(255,255,255,0.01)",
                          cursor: locked ? "not-allowed" : "pointer",
                          opacity: locked ? 0.65 : 1,
                          transition: "transform .08s ease, background .12s ease, border-color .12s ease",
                        }}
                        onMouseEnter={(e) => {
                          if (locked) return;
                          (e.currentTarget as HTMLLabelElement).style.transform = "translateY(-1px)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLLabelElement).style.transform = "translateY(0px)";
                        }}
                      >
                        <input
                          type="radio"
                          name={`cat-${cat.id}`}
                          checked={checked}
                          disabled={locked || savingCat === cat.id}
                          onChange={() => savePick(cat.id, n.id)}
                        />
                        <span>{label}</span>
                      </label>
                    );
                  })}
                </div>

                {locked && (
                  <p style={{ marginTop: 12, color: "var(--text-muted)", fontSize: 13 }}>
                    Edições bloqueadas após o deadline.
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div style={{ marginTop: 28, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
        Dica: seu acesso fica salvo neste dispositivo. Se abrir em outro navegador/celular, você cria um novo participante.
      </div>
    </AppShell>
  );
}

function formatDeadline(d: Date) {
  // formato pt-BR simples, sem depender de libs
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${dd}/${mm}/${yyyy} ${hh}:${mi} (GMT-3)`;
}