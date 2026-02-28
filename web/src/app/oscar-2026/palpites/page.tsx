"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { getParticipantId } from "@/lib/participant";
import { useRouter } from "next/navigation";

type EventRow = { id: string; slug: string; deadline_at: string };
type CategoryRow = { id: string; name: string; weight: number; sort_order: number };
type NomineeRow = { id: string; category_id: string; name: string; film: string | null };
type PredictionRow = { category_id: string; nominee_id: string };

export default function PalpitesPage() {
  const router = useRouter();
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

  useEffect(() => {
    async function load() {
      setError(null);
      setLoading(true);

      const pId = getParticipantId();
      if (!pId) {
        router.push("/");
        return;
      }

      // 1. Carregar evento
      const { data: ev, error: evErr } = await supabase
        .from("events")
        .select("id,slug,deadline_at")
        .eq("slug", "oscar-2026")
        .single();

      if (evErr) {
        setError("Evento não encontrado.");
        setLoading(false);
        return;
      }

      // 2. Carregar categorias e indicados em paralelo para performance
      const [catsRes, nomsRes, predsRes] = await Promise.all([
        supabase.from("categories").select("*").eq("event_id", ev.id).order("sort_order"),
        supabase.from("nominees").select("*"),
        supabase.from("predictions").select("category_id,nominee_id").eq("event_id", ev.id).eq("user_id", pId)
      ]);

      if (catsRes.error || nomsRes.error || predsRes.error) {
        setError("Erro ao carregar dados do banco.");
        setLoading(false);
        return;
      }

      const predMap: Record<string, string> = {};
      predsRes.data.forEach(p => predMap[p.category_id] = p.nominee_id);

      setEvent(ev);
      setCategories(catsRes.data);
      setNominees(nomsRes.data);
      setPredByCat(predMap);
      setLoading(false);
    }

    load();
  }, [router]);

  async function choose(categoryId: string, nomineeId: string) {
    if (!event || isLocked) return;

    const pId = getParticipantId();
    if (!pId) return router.push("/");

    setSaving(categoryId);
    // Update local state (optimistic)
    setPredByCat(prev => ({ ...prev, [categoryId]: nomineeId }));

    const { error: upsertErr } = await supabase.from("predictions").upsert(
      {
        event_id: event.id,
        user_id: pId, // Aqui usamos o seu UUID do participante na coluna user_id
        category_id: categoryId,
        nominee_id: nomineeId,
      },
      { onConflict: "event_id,user_id,category_id" } // O banco precisa de um unique index nessas 3 colunas
    );

    if (upsertErr) {
      console.error(upsertErr);
      alert("Erro ao salvar palpite. Verifique sua conexão.");
    }
    
    setSaving(null);
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Carregando bolão...</div>;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 20px" }}>
      <header style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 32 }}>Meus Palpites 🏆</h1>
        <p style={{ opacity: 0.7 }}>
          {isLocked ? "🔒 Votação encerrada" : "Sua escolha é salva automaticamente."}
        </p>
      </header>

      <div style={{ display: "grid", gap: 24 }}>
        {categories.map((cat) => (
          <section key={cat.id} style={{ 
            padding: 24, 
            borderRadius: 16, 
            background: "var(--card)", 
            border: "1px solid var(--border)" 
          }}>
            <h2 style={{ fontSize: 20, marginBottom: 16, color: "var(--gold)" }}>{cat.name}</h2>
            
            <div style={{ display: "grid", gap: 12 }}>
              {(nomineesByCategory[cat.id] || []).map((nom) => {
                const isSelected = predByCat[cat.id] === nom.id;
                return (
                  <label key={nom.id} style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: 16,
                    borderRadius: 12,
                    border: "1px solid",
                    borderColor: isSelected ? "var(--gold)" : "transparent",
                    background: isSelected ? "rgba(212, 175, 55, 0.1)" : "rgba(255,255,255,0.03)",
                    cursor: isLocked ? "default" : "pointer",
                    transition: "all 0.2s"
                  }}>
                    <input
                      type="radio"
                      checked={isSelected}
                      disabled={isLocked || saving === cat.id}
                      onChange={() => choose(cat.id, nom.id)}
                      style={{ accentColor: "var(--gold)" }}
                    />
                    <div>
                      <div style={{ fontWeight: isSelected ? 600 : 400 }}>{nom.name}</div>
                      {nom.film && <div style={{ fontSize: 13, opacity: 0.6 }}>{nom.film}</div>}
                    </div>
                  </label>
                );
              })}
            </div>
            
            <div style={{ marginTop: 12, height: 20, fontSize: 12, color: "var(--gold)", textAlign: "right" }}>
              {saving === cat.id && "Salvando..."}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}