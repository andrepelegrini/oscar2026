"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";

// Tipagens baseadas na sua estrutura de banco
type EventRow = { id: string; slug: string; deadline_at: string };
type CategoryRow = { id: string; name: string; weight: number; sort_order: number };
type NomineeRow = { id: string; category_id: string; name: string; film: string | null };
type PredictionRow = { category_id: string; nominee_id: string; user_id: string };

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

  const isLocked = useMemo(() => {
    if (!event) return false;
    return new Date() >= new Date(event.deadline_at);
  }, [event]);

  // Carregamento inicial corrigido para o Vercel
  const loadInitialData = useCallback(async () => {
    const pId = getParticipantId();
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

      // 2. Busca categorias e palpites (Note o uso de user_id aqui)
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
          .eq("user_id", pId) // Ajustado para sua coluna user_id
      ]);

      if (catsRes.error) throw catsRes.error;
      if (predsRes.error) throw predsRes.error;

      const catsData = catsRes.data || [];
      const catIds = catsData.map((c) => c.id);

      // 3. Busca indicados
      let nomsData: NomineeRow[] = [];
      if (catIds.length > 0) {
        const { data: noms, error: nomsErr } = await supabase
          .from("nominees")
          .select("id, category_id, name, film")
          .in("category_id", catIds);
        
        if (nomsErr) throw nomsErr;
        nomsData = noms || [];
      }

      const predMap: Record<string, string> = {};
      predsRes.data?.forEach((p) => {
        predMap[p.category_id] = p.nominee_id;
      });

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

  // Função de votação com mapeamento correto de colunas
  async function handleVote(categoryId: string, nomineeId: string) {
    if (!event || isLocked || saving === categoryId) return;

    const pId = getParticipantId();
    if (!pId) {
        window.location.href = "/";
        return;
    }

    const previousChoice = predByCat[categoryId];
    
    setError(null);
    setSaving(categoryId);
    setPredByCat((prev) => ({ ...prev, [categoryId]: nomineeId }));

    const { error: upsertErr } = await supabase.from("predictions").upsert(
      {
        event_id: event.id,
        user_id: pId, // Aqui usamos user_id para bater com seu banco
        category_id: categoryId,
        nominee_id: nomineeId,
      },
      { onConflict: "event_id,user_id,category_id" } // Ajustado onConflict também
    );

    if (upsertErr) {
      setError(`Erro ao salvar: ${upsertErr.message}`);
      setPredByCat((prev) => ({ ...prev, [categoryId]: previousChoice }));
    }

    setSaving(null);
  }

  if (loading) return <main style={{ padding: 40, textAlign: "center" }}>Carregando...</main>;

  return (
    <main style={{ padding: "24px", maxWidth: "800px", margin: "0 auto", fontFamily: "sans-serif" }}>
      <header style={{ marginBottom: 32, display: "flex", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: "24px", margin: "0" }}>Meus Palpites</h1>
          {event && <p style={{ opacity: 0.6, fontSize: "14px" }}>Prazo: {new Date(event.deadline_at).toLocaleString("pt-BR")}</p>}
        </div>
        <a href="/oscar-2026/ranking" style={{ color: "#0070f3", fontSize: "14px" }}>Ranking →</a>
      </header>

      {error && <div style={{ color: "red", marginBottom: 20 }}>{error}</div>}

      <div style={{ display: "grid", gap: 24 }}>
        {categories.map((cat) => (
          <section key={cat.id} style={{ padding: 20, border: "1px solid #eee", borderRadius: 12 }}>
            <h2 style={{ fontSize: "18px", marginBottom: 16 }}>{cat.name}</h2>
            <div style={{ display: "grid", gap: 10 }}>
              {(nomineesByCategory[cat.id] || []).map((nom) => (
                <label key={nom.id} style={{ display: "flex", gap: 10, cursor: isLocked ? "default" : "pointer" }}>
                  <input 
                    type="radio" 
                    checked={predByCat[cat.id] === nom.id}
                    disabled={isLocked || saving === cat.id}
                    onChange={() => handleVote(cat.id, nom.id)}
                  />
                  <span>{nom.name} {nom.film && <small style={{ opacity: 0.5 }}>— {nom.film}</small>}</span>
                </label>
              ))}
            </div>
            <div style={{ marginTop: 10, fontSize: "12px", color: "#999" }}>
              {saving === cat.id ? "Salvando..." : predByCat[cat.id] ? "✓ Salvo" : "Aguardando palpite"}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}