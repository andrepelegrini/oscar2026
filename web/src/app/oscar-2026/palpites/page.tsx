"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type EventRow = { id: string; slug: string; deadline_at: string };
type CategoryRow = { id: string; name: string; weight: number; sort_order: number };
type NomineeRow = { id: string; category_id: string; name: string; film: string | null };
type PredictionRow = { category_id: string; nominee_id: string };

export default function PalpitesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [event, setEvent] = useState<EventRow | null>(null);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [nominees, setNominees] = useState<NomineeRow[]>([]);
  const [predByCat, setPredByCat] = useState<Record<string, string>>({}); // category_id -> nominee_id

  const nomineesByCategory = useMemo(() => {
    const map: Record<string, NomineeRow[]> = {};
    for (const n of nominees) {
      (map[n.category_id] ??= []).push(n);
    }
    // ordena por name pra ficar estável
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

      // 1) session guard
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session?.user) {
        window.location.href = "/login";
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

      // 4) carregar nominees (por todas categorias do evento)
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

      // 5) carregar palpites do usuário
      const preds = await supabase
        .from("predictions")
        .select("category_id,nominee_id")
        .eq("event_id", ev.data.id)
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
  }, []);

  async function choose(categoryId: string, nomineeId: string) {
    if (!event) return;

    setError(null);
    setSaving(categoryId);

    // otimista no UI
    setPredByCat((prev) => ({ ...prev, [categoryId]: nomineeId }));

    // pega user_id da sessão
    const { data: sess } = await supabase.auth.getSession();
    const user = sess.session?.user;
    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { error: upsertErr } = await supabase.from("predictions").upsert(
      {
        event_id: event.id,
        user_id: user.id,
        category_id: categoryId,
        nominee_id: nomineeId,
      },
      { onConflict: "event_id,user_id,category_id" }
    );

    setSaving(null);

    if (upsertErr) {
      // reverte se falhar
      setError(upsertErr.message);
    }
  }

  if (loading) {
    return <main style={{ padding: 24 }}>Carregando...</main>;
  }

  if (error) {
    return (
      <main style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
        <h1 style={{ fontSize: 24, marginBottom: 12 }}>Meus palpites</h1>
        <p style={{ color: "crimson" }}>{error}</p>
        <p style={{ marginTop: 12 }}>
          Dica: confira se as policies de RLS permitem SELECT em categories/nominees/events e
          SELECT/UPSERT em predictions.
        </p>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, maxWidth: 920, margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 28, marginBottom: 6 }}>Meus palpites</h1>
          {event && (
            <p style={{ opacity: 0.8 }}>
              Deadline: <b>{new Date(event.deadline_at).toLocaleString("pt-BR")}</b>
              {isLocked ? " — palpites bloqueados ✅" : " — em aberto"}
            </p>
          )}
        </div>

        <a href="/oscar-2026/ranking">Ver ranking →</a>
      </header>

      {isLocked && (
        <div style={{ marginTop: 16, padding: 12, border: "1px solid #333", borderRadius: 12 }}>
          Palpites estão bloqueados. Você pode apenas visualizar.
        </div>
      )}

      <div style={{ marginTop: 20, display: "grid", gap: 18 }}>
        {categories.map((c) => {
          const selected = predByCat[c.id] ?? null;
          const list = nomineesByCategory[c.id] ?? [];

          return (
            <section key={c.id} style={{ padding: 16, border: "1px solid #222", borderRadius: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <h2 style={{ fontSize: 18, margin: 0 }}>{c.name}</h2>
                <span style={{ opacity: 0.8 }}>Peso {c.weight}</span>
              </div>

              <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                {list.map((n) => {
                  const label = n.film ? `${n.name} — ${n.film}` : n.name;
                  const checked = selected === n.id;

                  return (
                    <label key={n.id} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <input
                        type="radio"
                        name={c.id}
                        checked={checked}
                        disabled={isLocked || saving === c.id}
                        onChange={() => choose(c.id, n.id)}
                      />
                      <span>{label}</span>
                    </label>
                  );
                })}
              </div>

              <div style={{ marginTop: 10, opacity: 0.7, fontSize: 12 }}>
                {saving === c.id ? "Salvando..." : selected ? "Salvo ✅" : "Escolha um indicado"}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}