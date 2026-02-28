"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";

type EventRow = { id: string; slug: string; deadline_at: string };
type CategoryRow = { id: string; name: string; weight: number; sort_order: number };
type NomineeRow = { id: string; category_id: string; name: string; film: string | null };

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
    return map;
  }, [nominees]);

  const isLocked = useMemo(() => {
    if (!event) return false;
    return new Date() >= new Date(event.deadline_at);
  }, [event]);

  // Função de carga otimizada para evitar erros de ESLint
  const loadInitialData = useCallback(async () => {
    const pId = getParticipantId();
    if (!pId) {
      window.location.href = "/";
      return;
    }

    try {
      setLoading(true);
      const { data: ev } = await supabase.from("events").select("*").eq("slug", "oscar-2026").single();
      if (!ev) throw new Error("Evento não encontrado");

      const [catsRes, predsRes] = await Promise.all([
        supabase.from("categories").select("*").eq("event_id", ev.id).order("sort_order"),
        supabase.from("predictions").select("category_id, nominee_id").eq("event_id", ev.id).eq("user_id", pId)
      ]);

      const catsData = catsRes.data || [];
      const { data: nomsData } = await supabase.from("nominees").select("*").in("category_id", catsData.map(c => c.id));

      const predMap: Record<string, string> = {};
      predsRes.data?.forEach(p => { predMap[p.category_id] = p.nominee_id; });

      setEvent(ev);
      setCategories(catsData);
      setNominees(nomsData || []);
      setPredByCat(predMap);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleVote(catId: string, nomId: string) {
    const pId = getParticipantId();
    if (!pId || isLocked) return;

    const old = predByCat[catId];
    setPredByCat(prev => ({ ...prev, [catId]: nomId }));
    setSaving(catId);

    const { error: err } = await supabase.from("predictions").upsert(
      { event_id: event?.id, user_id: pId, category_id: catId, nominee_id: nomId },
      { onConflict: "event_id,user_id,category_id" }
    );

    if (err) {
      setPredByCat(prev => ({ ...prev, [catId]: old }));
      setError(err.message);
    }
    setSaving(null);
  }

  if (loading) return <div style={{ padding: 20 }}>Carregando...</div>;

  return (
    <div style={{ maxWidth: 600, margin: "auto", padding: 20 }}>
      <h1>Meus Palpites</h1>
      {categories.map(cat => (
        <div key={cat.id} style={{ marginBottom: 20, padding: 15, border: "1px solid #ccc", borderRadius: 10 }}>
          <h3>{cat.name}</h3>
          {(nomineesByCategory[cat.id] || []).map(nom => (
            <label key={nom.id} style={{ display: "block", marginBottom: 5 }}>
              <input 
                type="radio" 
                checked={predByCat[cat.id] === nom.id} 
                disabled={!!saving || isLocked}
                onChange={() => handleVote(cat.id, nom.id)} 
              />
              {nom.name}
            </label>
          ))}
          <small>{saving === cat.id ? "Salvando..." : "Salvo"}</small>
        </div>
      ))}
    </div>
  );
}