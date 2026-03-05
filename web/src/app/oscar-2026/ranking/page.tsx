"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { AppShell } from "@/components/AppShell";

type RankingRow = {
  participant_id: string;
  name: string;
  total_points: number;
  total_correct: number;
};

export default function RankingPage() {
  const [ranking, setRanking] = useState<RankingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function calculateRanking() {
      setLoading(true);

      // 1. Busca todos os participantes
      const { data: participants } = await supabase
        .from("participants")
        .select("id, name");

      // 2. Busca todos os resultados oficiais (vencedores)
      const { data: results } = await supabase
        .from("results")
        .select("category_id, winner_nominee_id");

      // 3. Busca todos os palpites
      const { data: predictions } = await supabase
        .from("predictions")
        .select("user_id, category_id, nominee_id");

      if (!participants || !results || !predictions) {
        setLoading(false);
        return;
      }

      // 4. Lógica de cálculo
      const stats = participants.map((p) => {
        const userPredictions = predictions.filter((pred) => pred.user_id === p.id);
        let points = 0;
        let correct = 0;

        userPredictions.forEach((pred) => {
          const isCorrect = results.find(
            (r) => r.category_id === pred.category_id && r.winner_nominee_id === pred.nominee_id
          );

          if (isCorrect) {
            points += 10; // Ajuste o peso dos pontos aqui se desejar
            correct += 1;
          }
        });

        return {
          participant_id: p.id,
          name: p.name,
          total_points: points,
          total_correct: correct,
        };
      });

      // 5. Ordenar por pontos (quem tem mais pontos fica no topo)
      stats.sort((a, b) => b.total_points - a.total_points || b.total_correct - a.total_correct);

      setRanking(stats);
      setLoading(false);
    }

    calculateRanking();
  }, []);

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Carregando ranking...</div>;

  return (
    <AppShell>
      <main style={{ padding: "40px 20px", maxWidth: 800, margin: "0 auto" }}>
        <h1 style={{ fontSize: 32, marginBottom: 24, textAlign: 'center' }}>Ranking Global 🏆</h1>

        <table style={{ width: "100%", borderCollapse: "collapse", background: "var(--card)", borderRadius: 16, overflow: "hidden" }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.05)", textAlign: "left" }}>
              <th style={{ padding: 16 }}>Posição</th>
              <th style={{ padding: 16 }}>Participante</th>
              <th style={{ padding: 16 }}>Acertos</th>
              <th style={{ padding: 16 }}>Pontos</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((row, index) => (
              <tr key={row.participant_id} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={{ padding: 16, fontWeight: 700 }}>
                  {index + 1}º
                  {index === 0 && " 🥇"}
                  {index === 1 && " 🥈"}
                  {index === 2 && " 🥉"}
                </td>
                <td style={{ padding: 16 }}>{row.name}</td>
                <td style={{ padding: 16 }}>{row.total_correct}</td>
                <td style={{ padding: 16, color: "var(--gold)", fontWeight: 700 }}>{row.total_points}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {ranking.length === 0 && (
          <p style={{ textAlign: 'center', marginTop: 20, opacity: 0.6 }}>Nenhum palpite registrado ainda.</p>
        )}
      </main>
    </AppShell>
  );
}