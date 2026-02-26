"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Category = {
  id: string;
  name: string;
};

type Nominee = {
  id: string;
  category_id: string;
  name: string;
  film: string | null;
};

type Result = {
  category_id: string;
  winner_nominee_id: string;
};

export default function AdminPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [nominees, setNominees] = useState<Nominee[]>([]);
  const [results, setResults] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingCat, setSavingCat] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setError(null);
      setLoading(true);

      // 1) precisa estar logado
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        window.location.href = "/login";
        return;
      }

      // 2) checar se é admin (server-side)
      const checkRes = await fetch("/api/admin/check", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const checkJson = await checkRes.json();

      if (!checkRes.ok || !checkJson.ok) {
        setUnauthorized(true);
        setLoading(false);
        return;
      }

      // 3) carregar dados (read-only via client ok)
      const { data: event, error: evErr } = await supabase
        .from("events")
        .select("id")
        .eq("slug", "oscar-2026")
        .single();

      if (evErr || !event) {
        setError(evErr?.message ?? "Evento não encontrado");
        setLoading(false);
        return;
      }

      const { data: cats, error: catsErr } = await supabase
        .from("categories")
        .select("id,name")
        .eq("event_id", event.id)
        .order("sort_order");

      if (catsErr) {
        setError(catsErr.message);
        setLoading(false);
        return;
      }

      const { data: noms, error: nomsErr } = await supabase
        .from("nominees")
        .select("id,category_id,name,film");

      if (nomsErr) {
        setError(nomsErr.message);
        setLoading(false);
        return;
      }

      const { data: res, error: resErr } = await supabase
        .from("results")
        .select("category_id,winner_nominee_id");

      if (resErr) {
        setError(resErr.message);
        setLoading(false);
        return;
      }

      const map: Record<string, string> = {};
      res?.forEach((r: Result) => {
        map[r.category_id] = r.winner_nominee_id;
      });

      setCategories(cats ?? []);
      setNominees(noms ?? []);
      setResults(map);

      setLoading(false);
    }

    load();
  }, []);

  async function setWinner(categoryId: string, nomineeId: string) {
    setError(null);
    setSavingCat(categoryId);

    // token novamente (pode expirar)
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      window.location.href = "/login";
      return;
    }

    const res = await fetch("/api/admin/set-winner", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        category_id: categoryId,
        winner_nominee_id: nomineeId,
      }),
    });

    const json = await res.json().catch(() => ({}));

    setSavingCat(null);

    if (!res.ok) {
      setError(json.error ?? "Erro ao salvar vencedor");
      return;
    }

    setResults((prev) => ({
      ...prev,
      [categoryId]: nomineeId,
    }));
  }

  if (loading) return <main style={{ padding: 24 }}>Carregando...</main>;

  if (unauthorized) {
    return (
      <main style={{ padding: 24 }}>
        <h1 style={{ fontSize: 24 }}>Acesso negado</h1>
        <p style={{ opacity: 0.8 }}>Você não tem permissão para ver esta página.</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 12 }}>
        Admin — Lançar vencedores
      </h1>

      {error && (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            border: "1px solid crimson",
            borderRadius: 12,
          }}
        >
          <b>Erro:</b> {error}
        </div>
      )}

      {categories.map((cat) => {
        const catNominees = nominees.filter((n) => n.category_id === cat.id);

        return (
          <section
            key={cat.id}
            style={{
              border: "1px solid #222",
              borderRadius: 16,
              padding: 16,
              marginBottom: 16,
              opacity: savingCat === cat.id ? 0.7 : 1,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <h2 style={{ margin: 0 }}>{cat.name}</h2>
              <span style={{ opacity: 0.7, fontSize: 12 }}>
                {savingCat === cat.id ? "Salvando..." : results[cat.id] ? "Salvo ✅" : ""}
              </span>
            </div>

            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              {catNominees.map((n) => {
                const label = n.film ? `${n.name} — ${n.film}` : n.name;

                return (
                  <label key={n.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="radio"
                      checked={results[cat.id] === n.id}
                      disabled={savingCat === cat.id}
                      onChange={() => setWinner(cat.id, n.id)}
                    />
                    {label}
                  </label>
                );
              })}
            </div>
          </section>
        );
      })}
    </main>
  );
}