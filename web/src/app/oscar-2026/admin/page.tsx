"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type Category = { id: string; name: string };
type Nominee = { id: string; category_id: string; name: string; film: string | null };
type Result = { category_id: string; winner_nominee_id: string };

type AdminCheckResponse = { ok: boolean; error?: string };
type ApiErrorResponse = { error?: string };
type ApiOkResponse = { ok: true };
type SetWinnerResponse = ApiOkResponse | ApiErrorResponse;

export default function AdminPage() {
  const router = useRouter();

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
      setUnauthorized(false);
      setLoading(true);

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;

        if (!token) {
          router.push("/login");
          return;
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        let checkRes: Response;
        try {
          checkRes = await fetch("/api/admin/check", {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeout);
        }

        const checkJson = (await checkRes
          .json()
          .catch((): AdminCheckResponse => ({ ok: false, error: "Bad JSON" }))) as AdminCheckResponse;

        if (!checkRes.ok || !checkJson.ok) {
          setUnauthorized(true);
          setLoading(false);
          return;
        }

        const { data: event, error: evErr } = await supabase
          .from("events")
          .select("id")
          .eq("slug", "oscar-2026")
          .single<{ id: string }>();

        if (evErr || !event) {
          setError(evErr?.message ?? "Evento não encontrado");
          setLoading(false);
          return;
        }

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

        const { data: noms, error: nomsErr } = await supabase
          .from("nominees")
          .select("id,category_id,name,film")
          .returns<Nominee[]>();

        if (nomsErr) {
          setError(nomsErr.message);
          setLoading(false);
          return;
        }

        const { data: res, error: resErr } = await supabase
          .from("results")
          .select("category_id,winner_nominee_id")
          .returns<Result[]>();

        if (resErr) {
          setError(resErr.message);
          setLoading(false);
          return;
        }

        const map: Record<string, string> = {};
        res?.forEach((r) => {
          map[r.category_id] = r.winner_nominee_id;
        });

        setCategories(cats ?? []);
        setNominees(noms ?? []);
        setResults(map);
        setLoading(false);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        setLoading(false);
      }
    }

    load();
  }, [router]);

  // FUNÇÃO MODIFICADA PARA SUPORTAR LIMPEZA (TOGGLE)
  async function toggleWinner(categoryId: string, nomineeId: string) {
    const isCurrentWinner = results[categoryId] === nomineeId;
    const newWinnerId = isCurrentWinner ? null : nomineeId;

    setError(null);
    setSavingCat(categoryId);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        router.push("/login");
        return;
      }

      const res = await fetch("/api/admin/set-winner", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ category_id: categoryId, winner_nominee_id: newWinnerId }),
      });

      const json = (await res.json().catch((): SetWinnerResponse => ({}))) as SetWinnerResponse;

      if (!res.ok) {
        setError(("error" in json && json.error) ? json.error : "Erro ao atualizar vencedor");
        return;
      }

      // Se for null, removemos a chave do estado. Se não, atualizamos.
      setResults((prev) => {
        const newResults = { ...prev };
        if (newWinnerId === null) {
          delete newResults[categoryId];
        } else {
          newResults[categoryId] = newWinnerId;
        }
        return newResults;
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setSavingCat(null);
    }
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
      <h1 style={{ fontSize: 28, marginBottom: 12 }}>Admin — Lançar vencedores</h1>

      {error && (
        <div style={{ marginBottom: 16, padding: 12, border: "1px solid crimson", borderRadius: 12 }}>
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
                {savingCat === cat.id ? "Atualizando..." : results[cat.id] ? "Salvo ✅" : ""}
              </span>
            </div>

            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              {catNominees.map((n) => {
                const label = n.film ? `${n.name} — ${n.film}` : n.name;
                const isChecked = results[cat.id] === n.id;

                return (
                  <label key={n.id} style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
                    <input
                      type="radio"
                      checked={isChecked}
                      disabled={savingCat === cat.id}
                      // Usamos onClick e prevenimos o comportamento padrão para controlar manualmente
                      onClick={(e) => {
                        e.preventDefault();
                        toggleWinner(cat.id, n.id);
                      }}
                      // Mantemos um onChange vazio para evitar avisos do React
                      onChange={() => {}}
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