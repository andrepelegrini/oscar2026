"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type Category = { id: string; name: string };
type Nominee = { id: string; category_id: string; name: string; film: string | null };
type Result = { category_id: string; winner_nominee_id: string };

type AdminCheckResponse = { ok: boolean; error?: string };

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

  async function toggleWinner(categoryId: string, nomineeId: string) {
    const isCurrentWinner = results[categoryId] === nomineeId;
    const winnerIdToSend = isCurrentWinner ? null : nomineeId;

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
        body: JSON.stringify({ 
          category_id: categoryId, 
          winner_nominee_id: winnerIdToSend 
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(json.error || "Erro ao salvar vencedor");
        return;
      }

      setResults((prev) => {
        const newResults = { ...prev };
        if (winnerIdToSend === null) {
          delete newResults[categoryId];
        } else {
          newResults[categoryId] = winnerIdToSend;
        }
        return newResults;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
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
        <div style={{ marginBottom: 16, padding: 12, border: "1px solid crimson", borderRadius: 12, color: "crimson" }}>
          <b>Aviso:</b> {error === "Missing fields" ? "A API não aceita desmarcar (valor nulo). É necessário ajustar o arquivo route.ts" : error}
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
              <h2 style={{ margin: 0, fontSize: 20 }}>{cat.name}</h2>
              <span style={{ opacity: 0.7, fontSize: 12, color: "var(--gold)" }}>
                {savingCat === cat.id ? "Processando..." : results[cat.id] ? "Salvo ✅" : "Pendente"}
              </span>
            </div>

            <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
              {catNominees.map((n) => {
                const isSelected = results[cat.id] === n.id;
                const label = n.film ? `${n.name} — ${n.film}` : n.name;

                return (
                  <label 
                    key={n.id} 
                    style={{ 
                      display: "flex", 
                      gap: 10, 
                      alignItems: "center", 
                      padding: "8px 12px",
                      borderRadius: 8,
                      background: isSelected ? "rgba(255,255,255,0.05)" : "transparent",
                      cursor: "pointer" 
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      if (savingCat !== cat.id) toggleWinner(cat.id, n.id);
                    }}
                  >
                    <input
                      type="radio"
                      checked={isSelected}
                      readOnly
                      style={{ cursor: "pointer", accentColor: "var(--gold)" }}
                    />
                    <span style={{ fontWeight: isSelected ? 600 : 400 }}>{label}</span>
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