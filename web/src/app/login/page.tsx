"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    window.location.href = "/oscar-2026/palpites";
  }

  async function signOut() {
    await supabase.auth.signOut();
    setMsg("Saiu.");
  }

  return (
    <main style={{ padding: 24, maxWidth: 480, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 16 }}>Entrar</h1>

      <form onSubmit={signIn} style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Email</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            style={{ padding: 10, borderRadius: 8, border: "1px solid #333" }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Senha</span>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            style={{ padding: 10, borderRadius: 8, border: "1px solid #333" }}
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          style={{ padding: 12, borderRadius: 10, border: "1px solid #333" }}
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>

        <button
          type="button"
          onClick={signOut}
          style={{
            padding: 12,
            borderRadius: 10,
            border: "1px solid #333",
            opacity: 0.8,
          }}
        >
          Sair
        </button>

        {msg && <p style={{ marginTop: 8 }}>{msg}</p>}
      </form>
    </main>
  );
}