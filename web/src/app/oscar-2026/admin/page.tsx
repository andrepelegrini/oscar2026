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

  useEffect(() => {
    async function load() {
      const { data: event } = await supabase
        .from("events")
        .select("id")
        .eq("slug", "oscar-2026")
        .single();

      if (!event) return;

      const { data: cats } = await supabase
        .from("categories")
        .select("id,name")
        .eq("event_id", event.id)
        .order("sort_order");

      const { data: noms } = await supabase
        .from("nominees")
        .select("id,category_id,name,film");

      const { data: res } = await supabase
        .from("results")
        .select("category_id,winner_nominee_id");

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
    await supabase
      .from("results")
      .upsert({
        category_id: categoryId,
        winner_nominee_id: nomineeId,
      }, { onConflict: "category_id" });

    setResults((prev) => ({
      ...prev,
      [categoryId]: nomineeId,
    }));
  }

  if (loading) return <main style={{ padding: 24 }}>Carregando...</main>;

  return (
    <main style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 20 }}>
        Admin — Lançar vencedores
      </h1>

      {categories.map((cat) => {
        const catNominees = nominees.filter(
          (n) => n.category_id === cat.id
        );

        return (
          <section
            key={cat.id}
            style={{
              border: "1px solid #222",
              borderRadius: 16,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <h2>{cat.name}</h2>

            {catNominees.map((n) => {
              const label = n.film
                ? `${n.name} — ${n.film}`
                : n.name;

              return (
                <label
                  key={n.id}
                  style={{ display: "flex", gap: 8 }}
                >
                  <input
                    type="radio"
                    checked={results[cat.id] === n.id}
                    onChange={() =>
                      setWinner(cat.id, n.id)
                    }
                  />
                  {label}
                </label>
              );
            })}
          </section>
        );
      })}
    </main>
  );
}