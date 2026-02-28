"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { getParticipantId } from "@/lib/participant";
import { useRouter } from "next/navigation";
import Image from "next/image";

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

  const [isFinished, setIsFinished] = useState(false);

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

      const [catsRes, nomsRes, predsRes] = await Promise.all([
        supabase.from("categories").select("*").eq("event_id", ev.id).order("sort_order"),
        supabase.from("nominees").select("*"),
        supabase.from("predictions").select("category_id,nominee_id").eq("event_id", ev.id).eq("user_id", pId)
      ]);

      if (catsRes.error || nomsRes.error || predsRes.error) {
        setError("Erro ao carregar dados.");
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
    setPredByCat(prev => ({ ...prev, [categoryId]: nomineeId }));

    const { error: upsertErr } = await supabase.from("predictions").upsert(
      {
        event_id: event.id,
        user_id: pId, 
        category_id: categoryId,
        nominee_id: nomineeId,
      },
      { onConflict: "event_id,user_id,category_id" }
    );

    if (upsertErr) alert("Erro ao salvar.");
    setSaving(null);
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Carregando bolão...</div>;

  // TELA DE SUCESSO FINAL
  if (isFinished) {
    return (
      <div style={{ 
        textAlign: "center", 
        marginTop: 60, 
        padding: "0 20px 80px 20px",
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minHeight: '80vh',
        justifyContent: 'center'
      }}>
        {/* IMAGEM PERSONALIZADA */}
        <div style={{ 
          marginBottom: 30, 
          borderRadius: 24, 
          overflow: 'hidden', 
          boxShadow: "0 15px 35px rgba(0,0,0,0.4)",
          border: "1px solid var(--border)"
        }}>
          <Image 
            src="/sebastiana.png" 
            alt="Sucesso"
            width={350} 
            height={250} 
            style={{ objectFit: 'cover' }}
            priority
          />
        </div>

        <h1 style={{ fontSize: 36, marginBottom: 12 }}>Palpites Enviados!</h1>
        <p style={{ opacity: 0.7, maxWidth: 450, marginBottom: 40, lineHeight: 1.6 }}>
          Seus votos para o Oscar 2026 foram registrados. 
          Você pode voltar e alterar suas escolhas a qualquer momento.
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          {/* BOTÃO VOLTAR PARA HOME */}
          <button
            onClick={() => router.push("/")}
            style={{
              padding: "14px 24px",
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "var(--card)",
              cursor: "pointer",
              color: "var(--text)",
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            🏠 Início
          </button>

          <button
            onClick={() => setIsFinished(false)}
            style={{
              padding: "14px 24px",
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "var(--card)",
              cursor: "pointer",
              color: "var(--text)",
              fontWeight: 600
            }}
          >
            Revisar palpites
          </button>
          
          <button
            onClick={() => router.push("/oscar-2026/ranking")}
            style={{
              padding: "14px 28px",
              borderRadius: 12,
              border: "none",
              background: "linear-gradient(180deg, var(--gold), var(--gold-light))",
              color: "#000",
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            Ver Ranking →
          </button>
        </div>
      </div>
    );
  }

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
              {saving === cat.id ? "Salvando..." : predByCat[cat.id] ? "Salvo ✅" : ""}
            </div>
          </section>
        ))}
      </div>

      {!loading && categories.length > 0 && (
        <div style={{ marginTop: 60, textAlign: 'center', paddingBottom: 80 }}>
          <button
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
              setIsFinished(true);
            }}
            style={{
              padding: "20px 60px",
              fontSize: 18,
              fontWeight: 700,
              borderRadius: 16,
              border: "none",
              background: "linear-gradient(180deg, var(--gold), var(--gold-light))",
              color: "#000",
              cursor: "pointer",
              boxShadow: "0 10px 20px rgba(212, 175, 55, 0.2)"
            }}
          >
            Enviar Palpites 🎬
          </button>
        </div>
      )}
    </div>
  );
}