"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";

type EventRow = { id: string; slug: string; deadline_at: string };
type CategoryRow = { id: string; name: string; weight: number; sort_order: number };
type NomineeRow = { id: string; category_id: string; name: string; film: string | null };
type PredictionRow = { category_id: string; nominee_id: string };

// Helper para ler o localStorage com segurança no lado do cliente
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

  // Organiza indicados por categoria de forma eficiente
  const nomineesByCategory = useMemo(() => {
    const map: Record<string, NomineeRow[]> = {};
    for (const n of nominees) {
      (map[n.category_id] ??= []).push(n);
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => a.name.localeCompare(b.name));
    }
    return map;
  }, [nominees]);

  // Bloqueio visual baseado no deadline
  const isLocked = useMemo(() => {
    if (!event) return false;
    return new Date() >= new Date(event.deadline_at);
  }, [event]);

  // Função central de carregamento (Consolidada para evitar erros de ESLint)
  const loadInitialData = useCallback(async () => {
    const pId = getParticipantId();
    
    // Se não houver ID, redireciona para a home
    if (!pId) {
      window.location.href = "/";
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 1. Busca o evento
      const { data: ev, error: evErr } = await supabase
        .from("events")
        .select("id, slug, deadline_at")
        .eq("slug", "oscar-2026")
        .single();

      if (evErr || !ev) throw new Error(evErr?.message || "Evento não encontrado.");

      // 2. Busca categorias e palpites em paralelo
      const [catsRes, predsRes] = await Promise.all([
        supabase
          .from("categories")
          .select("id, name, weight, sort_order")
          .eq("event_id", ev.id)
          .order("sort_order", { ascending: true }),
        supabase
          .from("predictions")
          .select("category_id, nominee_id")
          .eq("event_id", ev.id)
          .eq("participant_id", pId)
      ]);

      if (catsRes.error) throw catsRes.error;
      if (predsRes.error) throw predsRes.error;

      const catsData = catsRes.data || [];
      const catIds = catsData.map((c) => c.id);

      // 3. Busca indicados (somente se houver categorias)
      let nomsData: NomineeRow[] = [];
      if (catIds.length > 0) {
        const { data: noms, error: nomsErr } = await supabase
          .from("nominees")
          .select("id, category_id, name, film")
          .in("category_id", catIds);
        
        if (nomsErr) throw nomsErr;
        nomsData = noms || [];
      }

      // 4. Mapeia os palpites existentes
      const predMap: Record<string, string> = {};
      predsRes.data?.forEach((p) => {
        predMap[p.category_id] = p.nominee_id;
      });

      // Atualiza os estados de uma vez só
      setEvent(ev);
      setCategories(catsData);
      setNominees(nomsData);
      setPredByCat(predMap);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Função para salvar palpite (com rollback em caso de erro)
  async function handleVote(categoryId: string, nomineeId: string) {
    if (!event || isLocked || saving === categoryId) return;

    const pId = getParticipantId();
    if (!pId) {
      window.location.href = "/";
      return;
    }

    const previousChoice = predByCat[categoryId];
    
    // Update otimista
    setError(null);
    setSaving(categoryId);
    setPredByCat((prev) => ({ ...prev, [categoryId]: nomineeId }));

    const { error: upsertErr } = await supabase.from("predictions").upsert(
      {
        event_id: event.id,
        participant_id: pId,
        category_id: categoryId,
        nominee_id: nomineeId,
      },
      { onConflict: "event_id,participant_id,category_id" }
    );

    if (upsertErr) {
      setError(`Erro ao salvar: ${upsertErr.message}`);
      // Reverte para o palpite anterior
      setPredByCat((prev) => ({ ...prev, [categoryId]: previousChoice }));
    }

    setSaving(null);
  }

  if (loading) {
    return (
      <main style={{ padding: 40, textAlign: "center", fontFamily: "sans-serif" }}>
        <p>Carregando seus palpites...</p>
      </main>
    );
  }

  return (
    <main style={{ padding: "24px", maxWidth: "800px", margin: "0 auto", fontFamily: "sans-serif" }}>
      <header style={{ marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: "24px", margin: "0 0 8px 0" }}>Oscar 2026</h1>
          {event && (
            <p style={{ fontSize: "14px", opacity: 0.7, margin: 0 }}>
              Deadline: {new Date(event.deadline_at).toLocaleString("pt-BR")} 
              {isLocked ? " (Encerrado)" : " (Aberto)"}
            </p>
          )}
        </div>
        <a href="/oscar-2026/ranking" style={{ fontSize: "14px", color: "#0070f3" }}>Ver Ranking</a>
      </header>

      {error && (
        <div style={{ padding: 12, backgroundColor: "#fff0f0", color: "#d00", borderRadius: 8, marginBottom: 24, fontSize: "14px" }}>
          {error}
        </div>
      )}

      {isLocked && (
        <div style={{ padding: 12, backgroundColor: "#f0f0f0", borderRadius: 8, marginBottom: 24, textAlign: "center", fontSize: "14px" }}>
          🔒 As votações foram encerradas.
        </div>
      )}

      <div style={{ display: "grid", gap: 24 }}>
        {categories.map((cat) => {
          const selectedNomineeId = predByCat[cat.id];
          const options = nomineesByCategory[cat.id] || [];

          return (
            <section key={cat.id} style={{ padding: 20, border: "1px solid #eee", borderRadius: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                <h2 style={{ fontSize: "18px", margin: 0 }}>{cat.name}</h2>
                <span style={{ fontSize: "12px", opacity: 0.5 }}>Peso {cat.weight}</span>
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                {options.map((nom) => {
                  const active = selectedNomineeId === nom.id;
                  return (
                    <label 
                      key={nom.id} 
                      style={{ 
                        display: "flex", 
                        padding: "10px", 
                        borderRadius: "8px", 
                        border: "1px solid", 
                        borderColor: active ? "#0070f3" : "#eee",
                        backgroundColor: active ? "#f0f7ff" : "transparent",
                        cursor: isLocked || saving === cat.id ? "not-allowed" : "pointer",
                        alignItems: "center",
                        gap: "10px"
                      }}
                    >
                      <input 
                        type="radio" 
                        name={cat.id}
                        checked={active}
                        disabled={isLocked || saving === cat.id}
                        onChange={() => handleVote(cat.id, nom.id)}
                      />
                      <span style={{ fontSize: "14px" }}>
                        <strong>{nom.name}</strong> {nom.film && <span style={{ opacity: 0.7 }}>— {nom.film}</span>}
                      </span>
                    </label>
                  );
                })}
              </div>
              
              <div style={{ marginTop: 12, fontSize: "11px", color: "#999" }}>
                {saving === cat.id ? "Salvando..." : selectedNomineeId ? "✓ Salvo" : "Pendente"}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}