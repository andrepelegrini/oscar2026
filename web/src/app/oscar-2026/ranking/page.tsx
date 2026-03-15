"use client";

import { useEffect, useMemo, useState } from "react";
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

const groups: Record<string, string[]> = {
  "Amigos do Dudu": [
    "38b3ecfe-d0aa-410f-ac25-12103d841f18",
    "8f01c72a-cc4e-4bbf-9b60-17ff8ead02f2",
    "a8e0d044-af5e-497d-bd88-99410c875baf",
    "84f4b642-5738-46f8-b30f-04113d12d634",
    "cf1f0b16-ea5e-4d31-a140-9dcaf363be9a",
    "1f16c693-76ce-4c9c-ba88-44dffd21a2e2",
    "d1a72262-323d-4944-b571-80d6a708ef9b",
    "9d6fa7de-f35e-4ebd-a433-2fb2e6bf3277",
    "8848b147-c929-4d36-90ef-b249cf0bbc0a",
  ],
  "Amigos da Vivian": [
    "8848b147-c929-4d36-90ef-b249cf0bbc0a",
    "d1a72262-323d-4944-b571-80d6a708ef9b",
    "60316cc5-d397-4d0a-8747-027c24f240b7",
    "1087a0ab-a6a1-4ec8-966a-830243c0fdf3",
    "03656718-a861-455b-b270-6c581c6596b1",
    "d5ccce5b-03f4-4d0e-9856-e205288eb11c",
    "0e3c86ce-89d5-4140-aa43-64bc2f38d32e",
    "f45b7fd3-d899-4378-92ab-075be1c9c0f6",
    "e0b32f2b-35a7-4cd3-bf55-4ba20d378f09",
    "5a15e074-b034-4a3f-9fc8-4a8f2bf7789d"
  ],
};

const GROUP_ALL = "global";

export default function RankingPage() {
  const [ranking, setRanking] = useState<RankingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [announcedCount, setAnnouncedCount] = useState(0);
  const [totalCategories, setTotalCategories] = useState(0);
  const [selectedGroup, setSelectedGroup] = useState<string>(GROUP_ALL);

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

    const interval = setInterval(calculateRanking, 600000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const filteredRanking = useMemo(() => {
    if (selectedGroup === GROUP_ALL) return ranking;

    const groupMembers = new Set(groups[selectedGroup] || []);
    return ranking.filter((row) => groupMembers.has(row.participant_id));
  }, [ranking, selectedGroup]);

  const title = useMemo(() => {
    if (selectedGroup === GROUP_ALL) return "Ranking Global 🏆";
    return `Ranking — ${selectedGroup} 🏆`;
  }, [selectedGroup]);

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
          {title}
        </h1>

        <p style={{ textAlign: "center", marginBottom: 24, opacity: 0.7 }}>
          {announcedCount} / {totalCategories} categorias anunciadas
        </p>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            justifyContent: "center",
            marginBottom: 24,
          }}
        >
          <button
            onClick={() => setSelectedGroup(GROUP_ALL)}
            style={{
              padding: "10px 16px",
              borderRadius: 999,
              border: "1px solid var(--border)",
              background:
                selectedGroup === GROUP_ALL ? "var(--gold)" : "var(--card)",
              color: selectedGroup === GROUP_ALL ? "#111" : "var(--text)",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Global
          </button>

          {Object.keys(groups).map((groupName) => (
            <button
              key={groupName}
              onClick={() => setSelectedGroup(groupName)}
              style={{
                padding: "10px 16px",
                borderRadius: 999,
                border: "1px solid var(--border)",
                background:
                  selectedGroup === groupName ? "var(--gold)" : "var(--card)",
                color: selectedGroup === groupName ? "#111" : "var(--text)",
                fontWeight: 700,
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {groupName}
            </button>
          ))}
        </div>

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
            {filteredRanking.map((row, index) => (
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

        {filteredRanking.length === 0 && (
          <p style={{ textAlign: "center", marginTop: 20, opacity: 0.6 }}>
            Nenhum participante encontrado neste grupo.
          </p>
        )}
      </main>
    </AppShell>
  );
}