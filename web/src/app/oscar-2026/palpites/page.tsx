"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";

type EventRow = { id: string; slug: string; deadline_at: string };
type CategoryRow = { id: string; name: string; weight: number; sort_order: number };
type NomineeRow = { id: string; category_id: string; name: string; film: string | null };
type PredictionRow = { category_id: string; nominee_id: string };

function getParticipantId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("participant_id");
}

export default function PalpitesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [event, setEvent] = useState<EventRow | null>(null);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [nominees, setNominees] = useState<NomineeRow[]>([]);
  const [predByCat, setPredByCat] = useState<Record<string, string>>({});

  // Memoiza os indicados por categoria para performance
  const nomineesByCategory = useMemo(() => {
    const map: Record<string, NomineeRow[]> = {};
    nominees.forEach((n) => {
      (map[n.category_id] ??= []).push(n);
    });
    Object.keys(map).forEach((k) => {
      map[k].sort((a, b) => a.name.localeCompare(b.name));
    });
    return map;
  }, [nominees]);

  // Bloqueio lógico (segurança básica no client)
  const isLocked = useMemo(() => {
    if (!event) return false;
    return new Date() >= new Date(event.deadline_at);
  }, [event]);

  const loadData = useCallback(async () => {
    const participantId = getParticipantId();
    if (!participantId) {
      window.location.href = "/";
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 1. Carregar Evento
      const { data: ev, error: evErr } = await supabase
        .from("events")
        .select("id, slug, deadline_at")
        .eq("slug", "oscar-2026")
        .single();

      if (evErr || !ev) throw new Error(evErr?.message || "Evento não encontrado");

      // 2. Carregar Categorias e Indicados em paralelo (Melhora performance)
      const [catsRes, nomsRes, predsRes] = await Promise.all([
        supabase
          .from("categories")
          .select("id, name, weight, sort_order")
          .eq("event_id", ev.id)
          .order("sort_order", { ascending: true }),
        supabase
          .from("nominees")
          .select("id, category_id, name, film")
          .in("category_id", (await supabase.from("categories").select("id").eq("event_id", ev.id)).data?.map(c => c.id) || []),
        supabase
          .from("predictions")
          .select("category_id, nominee_id")
          .eq("event_id", ev.id)
          .eq("participant_id", participantId)
      ]);

      if (catsRes.error) throw catsRes.error;
      if (nomsRes.error) throw nomsRes.error;
      if (predsRes.error) throw predsRes.error;

      // Montar mapa de palpites
      const predMap: Record<string, string> = {};
      predsRes.data.forEach((p) => (predMap[p.category_id] = p.nominee_id));

      setEvent(ev);
      setCategories(catsRes.data || []);
      setNominees(nomsRes.data || []);
      setPredByCat(predMap);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function choose(categoryId: string, nomineeId: string) {
    if (!event || isLocked || saving === categoryId) return;

    const participantId = getParticipantId();
    if (!participantId) {
      window.location.href = "/";
      return;
    }

    // Guardar estado anterior para rollback em caso de erro
    const previousNomineeId = predByCat[categoryId];

    setError(null);
    setSaving(categoryId);

    // Update Otimista (UI responde na hora)
    setPredByCat((prev) => ({ ...prev, [categoryId]: nomineeId }));

    const { error: upsertErr } = await supabase.from("predictions").upsert(
      {
        event_id: event.id,
        participant_id: participantId,
        category_id: categoryId,
        nominee_id: nomineeId,
      },
      { onConflict: "event_id,participant_id,category_id" }
    );

    if (upsertErr) {
      setError(`Falha ao salvar: ${upsertErr.message}`);
      // REVERTE o estado se o servidor falhar
      setPredByCat((prev) => ({ ...prev, [categoryId]: previousNomineeId }));
    }

    setSaving(null);
  }

  if (loading) return <main style={{ padding: 24, textAlign: "center" }}>Carregando categorias...</main>;

  return (
    <main style={{ padding: 24, maxWidth: 920, margin: "0 auto", minHeight: "100vh" }}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, marginBottom: 6 }}>Meus palpites</h1>
          {event && (
            <p style={{ opacity: 0.8 }}>
              Deadline: <b>{new Date(event.deadline_at).toLocaleString("pt-BR")}</b>
              {isLocked ? " — palpites encerrados ✅" : " — aberto para votação"}
            </p>
          )}
        </div>
        <a href="/oscar-2026/ranking" style={{ color: "#0070f3", textDecoration: "none" }}>Ver ranking →</a>
      </header>

      {error && (
        <div style={{ padding: 16, backgroundColor: "#fff5f5", color: "#c00", borderRadius: 8, marginBottom: 20, border: "1px solid #ffcaca" }}>
          <b>Erro:</b> {error}
        </div>
      )}

      {isLocked && (
        <div style={{ marginBottom: 24, padding: 16, backgroundColor: "#111", color: "#eee", borderRadius: 12, textAlign: "center" }}>
          🔒 O prazo expirou. Os palpites agora são apenas para visualização.
        </div>
      )}

      <div style={{ display: "grid", gap: 20 }}>
        {categories.map((c) => {
          const selectedId = predByCat[c.id] || null;
          const list = nomineesByCategory[c.id] || [];

          return (
            <section key={c.id} style={{ padding: 20, border: "1px solid #333", borderRadius: 16, backgroundColor: saving === c.id ? "#fafafa" : "transparent", transition: "0.2s" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                <h2 style={{ fontSize: 18, margin: 0 }}>{c.name}</h2>
                <span style={{ fontSize: 14, opacity: 0.6 }}>Peso {c.weight}</span>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {list.map((n) => {
                  const isChecked = selectedId === n.id;
                  return (
                    <label 
                      key={n.id} 
                      style={{ 
                        display: "flex", 
                        gap: 12, 
                        alignItems: "center", 
                        cursor: isLocked || saving === c.id ? "not-allowed" : "pointer",
                        padding: "8px 12px",
                        borderRadius: 8,
                        backgroundColor: isChecked ? "#f0f7ff" : "transparent",
                        border: isChecked ? "1px solid #0070f3" : "1px solid transparent"
                      }}
                    >
                      <input
                        type="radio"
                        name={c.id}
                        checked={isChecked}
                        disabled={isLocked || saving === c.id}
                        onChange={() => choose(c.id, n.id)}
                        style={{ width: 18, height: 18 }}
                      />
                      <span style={{ fontWeight: isChecked ? 600 : 400 }}>
                        {n.name} {n.film && <span style={{ opacity: 0.6, fontWeight: 400 }}>— {n.film}</span>}
                      </span>
                    </label>
                  );
                })}
              </div>

              <div style={{ marginTop: 12, fontSize: 12, color: saving === c.id ? "#0070f3" : "#666" }}>
                {saving === c.id ? "Salvando alteração..." : selectedId ? "Palpite salvo" : "Nenhum selecionado"}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}