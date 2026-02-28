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

      // 1) PEGA O ID DO PARTICIPANTE (SEM LOGIN/SENHA)
      const pId = getParticipantId();
      if (!pId) {
        router.push("/"); // Se não tem ID, volta para a home para "entrar"
        return;
      }

      // 2) carregar evento
      const ev = await supabase
        .from("events")
        .select("id,slug,deadline_at")
        .eq("slug", "oscar-2026")
        .single<EventRow>();

      if (ev.error) {
        setError(ev.error.message);
        setLoading(false);
        return;
      }

      // 3) carregar categorias
      const cats = await supabase
        .from("categories")
        .select("id,name,weight,sort_order")
        .eq("event_id", ev.data.id)
        .order("sort_order", { ascending: true })
        .returns<CategoryRow[]>();

      if (cats.error) {
        setError(cats.error.message);
        setLoading(false);
        return;
      }

      // 4) carregar nominees
      const catIds = cats.data.map((c) => c.id);
      const noms = await supabase
        .from("nominees")
        .select("id,category_id,name,film")
        .in("category_id", catIds)
        .returns<NomineeRow[]>();

      if (noms.error) {
        setError(noms.error.message);
        setLoading(false);
        return;
      }

      // 5) carregar palpites usando o participant_id do seu storage
      const preds = await supabase
        .from("predictions")
        .select("category_id,nominee_id")
        .eq("event_id", ev.data.id)
        .eq("participant_id", pId) // Filtro alterado aqui
        .returns<PredictionRow[]>();

      if (preds.error) {
        setError(preds.error.message);
        setLoading(false);
        return;
      }

      const predMap: Record<string, string> = {};
      for (const p of preds.data) predMap[p.category_id] = p.nominee_id;

      setEvent(ev.data);
      setCategories(cats.data);
      setNominees(noms.data);
      setPredByCat(predMap);
      setLoading(false);
    }

    load();
  }, [router]);

  async function choose(categoryId: string, nomineeId: string) {
    if (!event) return;

    const pId = getParticipantId();
    if (!pId) {
      router.push("/");
      return;
    }

    setError(null);
    setSaving(categoryId);

    // Otimista na UI
    setPredByCat((prev) => ({ ...prev, [categoryId]: nomineeId }));

    const { error: upsertErr } = await supabase.from("predictions").upsert(
      {
        event_id: event.id,
        participant_id: pId, // Usando pId em vez de user.id
        category_id: categoryId,
        nominee_id: nomineeId,
      },
      { onConflict: "event_id,participant_id,category_id" } // Ajuste o conflito se necessário
    );

    setSaving(null);

    if (upsertErr) {
      setError(upsertErr.message);
    }
  }

  if (loading) return <main style={{ padding: 24 }}>Carregando seus palpites...</main>;

  if (error) {
    return (
      <main style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
        <h1 style={{ fontSize: 24, marginBottom: 12 }}>Erro</h1>
        <p style={{ color: "crimson" }}>{error}</p>
        <button onClick={() => window.location.reload()}>Tentar novamente</button>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, maxWidth: 920, margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 30 }}>
        <div>
          <h1 style={{ fontSize: 28, marginBottom: 6 }}>Meus palpites 🎬</h1>
          {event && (
            <p style={{ opacity: 0.8 }}>
              Deadline: <b>{new Date(event.deadline_at).toLocaleString("pt-BR")}</b>
              {isLocked ? " — palpites bloqueados ✅" : " — em aberto"}
            </p>
          )}
        </div>
        <a href="/oscar-2026/ranking" style={{ color: 'var(--gold)' }}>Ver ranking →</a>
      </header>

      <div style={{ display: "grid", gap: 18 }}>
        {categories.map((c) => {
          const selected = predByCat[c.id] ?? null;
          const list = nomineesByCategory[c.id] ?? [];

          return (
            <section key={c.id} style={{ padding: 20, border: "1px solid var(--border)", borderRadius: 16, background: "var(--card)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: 'center' }}>
                <h2 style={{ fontSize: 18, margin: 0 }}>{c.name}</h2>
                <span style={{ opacity: 0.6, fontSize: 14 }}>Peso {c.weight}</span>
              </div>

              <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
                {list.map((n) => (
                  <label key={n.id} style={{ 
                    display: "flex", 
                    gap: 12, 
                    alignItems: "center", 
                    padding: 12, 
                    borderRadius: 8, 
                    background: selected === n.id ? "rgba(255,215,0,0.1)" : "transparent",
                    cursor: isLocked ? "default" : "pointer"
                  }}>
                    <input
                      type="radio"
                      name={c.id}
                      checked={selected === n.id}
                      disabled={isLocked || saving === c.id}
                      onChange={() => choose(c.id, n.id)}
                    />
                    <span>{n.film ? `${n.name} — ${n.film}` : n.name}</span>
                  </label>
                ))}
              </div>
              
              <div style={{ marginTop: 12, fontSize: 12, textAlign: 'right', color: 'var(--gold)' }}>
                {saving === c.id ? "Salvando..." : selected ? "Palpite salvo" : "Aguardando escolha"}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}