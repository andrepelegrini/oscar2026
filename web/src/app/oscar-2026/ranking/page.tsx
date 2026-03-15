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

type Participant = {
  id: string;
  name: string;
};

type Category = {
  id: string;
  weight: number;
};

type Result = {
  category_id: string;
  winner_nominee_id: string;
  announced_at: string | null;
};

type Prediction = {
  user_id: string;
  category_id: string;
  nominee_id: string;
};

export default function RankingPage() {
  const [ranking, setRanking] = useState<RankingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [announcedCount, setAnnouncedCount] = useState(0);
  const [totalCategories, setTotalCategories] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function calculateRanking() {
      if (isMounted) setLoading(true);

      const [
        { data: participants, error: participantsError },
        { data: categories, error: categoriesError },
        { data: results, error: resultsError },
        { data: predictions, error: predictionsError },
      ] = await Promise.all([
        supabase.from("participants").select("id, name"),
        supabase.from("categories").select("id, weight"),
        supabase
          .from("results")
          .select("category_id, winner_nominee_id, announced_at"),
        supabase.from("predictions").select("user_id, category_id, nominee_id"),
      ]);

      if (
        participantsError ||
        categoriesError ||
        resultsError ||
        predictionsError ||
        !participants ||
        !categories ||
        !results ||
        !predictions
      ) {
        if (isMounted) setLoading(false);
        return;
      }

      const typedParticipants = participants as Participant[];
      const typedCategories = categories as Category[];
      const typedResults = results as Result[];
      const typedPredictions = predictions as Prediction[];

      const categoryWeightMap: Record<string, number> = {};
      typedCategories.forEach((category) => {
        categoryWeightMap[category.id] = category.weight;
      });

      const announcedResults = typedResults.filter((result) => result.announced_at);
      const announcedResultMap = new Map<string, string>();

      announcedResults.forEach((result) => {
        announcedResultMap.set(result.category_id, result.winner_nominee_id);
      });

      const stats: RankingRow[] = typedParticipants.map((participant) => {
        const userPredictions = typedPredictions.filter(
          (prediction) => prediction.user_id === participant.id
        );

        let points = 0;
        let correct = 0;

        userPredictions.forEach((prediction) => {
          const winnerNomineeId = announcedResultMap.get(prediction.category_id);

          if (winnerNomineeId && winnerNomineeId === prediction.nominee_id) {
            points += categoryWeightMap[prediction.category_id] || 0;
            correct += 1;
          }
        });

        return {
          participant_id: participant.id,
          name: participant.name,
          total_points: points,
          total_correct: correct,
        };
      });

      stats.sort(
        (a, b) =>
          b.total_points - a.total_points ||
          b.total_correct - a.total_correct ||
          a.name.localeCompare(b.name)
      );

      if (isMounted) {
        setRanking(stats);
        setAnnouncedCount(announcedResults.length);
        setTotalCategories(typedCategories.length);
        setLoading(false);
      }
    }

    calculateRanking();

    const interval = setInterval(calculateRanking, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        Carregando ranking...
      </div>
    );
  }

  return (
    <AppShell>
      <main style={{ padding: "40px 20px", maxWidth: 800, margin: "0 auto" }}>
        <h1 style={{ fontSize: 32, marginBottom: 12, textAlign: "center" }}>
          Ranking Global 🏆
        </h1>

        <p style={{ textAlign: "center", marginBottom: 24, opacity: 0.7 }}>
          {announcedCount} / {totalCategories} categorias anunciadas
        </p>

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            background: "var(--card)",
            borderRadius: 16,
            overflow: "hidden",
          }}
        >
          <thead>
            <tr
              style={{
                background: "rgba(255,255,255,0.05)",
                textAlign: "left",
              }}
            >
              <th style={{ padding: 16 }}>Posição</th>
              <th style={{ padding: 16 }}>Participante</th>
              <th style={{ padding: 16 }}>Acertos</th>
              <th style={{ padding: 16 }}>Pontos</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((row, index) => (
              <tr
                key={row.participant_id}
                style={{ borderTop: "1px solid var(--border)" }}
              >
                <td style={{ padding: 16, fontWeight: 700 }}>
                  {index + 1}º
                  {index === 0 && " 🥇"}
                  {index === 1 && " 🥈"}
                  {index === 2 && " 🥉"}
                </td>
                <td style={{ padding: 16 }}>{row.name}</td>
                <td style={{ padding: 16 }}>{row.total_correct}</td>
                <td
                  style={{
                    padding: 16,
                    color: "var(--gold)",
                    fontWeight: 700,
                  }}
                >
                  {row.total_points}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {ranking.length === 0 && (
          <p style={{ textAlign: "center", marginTop: 20, opacity: 0.6 }}>
            Nenhum palpite registrado ainda.
          </p>
        )}
      </main>
    </AppShell>
  );
}