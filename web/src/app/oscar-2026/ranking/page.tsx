"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type ScoreRow = {
  user_id: string;
  points: number;
  correct_count: number;
};

type UserRow = {
  id: string;
  email: string;
};

export default function RankingPage() {
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [users, setUsers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      // Buscar pontuações
      const { data: scoreData, error: scoreError } = await supabase
        .from("v_scoreboard")
        .select("user_id, points, correct_count")
        .eq("event_id", (await supabase
          .from("events")
          .select("id")
          .eq("slug", "oscar-2026")
          .single()).data?.id
        );

      if (scoreError) {
        setError(scoreError.message);
        setLoading(false);
        return;
      }

      // Ordenar: pontos desc, acertos desc
      const ordered = (scoreData ?? []).sort(
        (a, b) =>
          b.points - a.points ||
          b.correct_count - a.correct_count
      );

      setScores(ordered);

      // Buscar emails dos usuários
      const userIds = ordered.map((s) => s.user_id);

      if (userIds.length > 0) {
        const { data: userData } = await supabase
          .from("auth.users")
          .select("id,email")
          .in("id", userIds);

        const map: Record<string, string> = {};
        userData?.forEach((u) => {
          map[u.id] = u.email;
        });

        setUsers(map);
      }

      setLoading(false);
    }

    load();
  }, []);

  if (loading) return <main style={{ padding: 24 }}>Carregando ranking...</main>;
  if (error) return <main style={{ padding: 24 }}>Erro: {error}</main>;

  return (
    <main style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 20 }}>Ranking</h1>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th align="left">Posição</th>
            <th align="left">Participante</th>
            <th align="right">Pontos</th>
            <th align="right">Acertos</th>
          </tr>
        </thead>
        <tbody>
          {scores.map((s, i) => (
            <tr key={s.user_id}>
              <td>{i + 1}</td>
              <td>{users[s.user_id] ?? "Usuário"}</td>
              <td align="right">{s.points}</td>
              <td align="right">{s.correct_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}