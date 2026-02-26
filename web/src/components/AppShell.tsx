"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

export function AppShell({
  title,
  subtitle,
  children,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      setAuthed(Boolean(token));

      if (!token) return;

      const res = await fetch("/api/admin/check", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json().catch(() => ({ ok: false }));
      setIsAdmin(Boolean(json?.ok));
    }

    load();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <>
      <div className="noir-rays" />
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "linear-gradient(180deg, #2B0F1A, #1A0C12)",
          borderBottom: "1px solid var(--border)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
        }}
      >
        <div className="container" style={{ padding: "14px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
              <a href="/" style={{ fontFamily: "var(--font-display)", letterSpacing: ".8px" }}>
                BOLÃO ÓSCAR 2026
              </a>
              <nav style={{ display: "flex", gap: 12, opacity: 0.9, flexWrap: "wrap" }}>
                <a href="/oscar-2026/palpites">Palpites</a>
                <a href="/oscar-2026/ranking">Ranking</a>
                {isAdmin && <a href="/oscar-2026/admin">Admin</a>}
              </nav>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {!authed ? (
                <a href="/login">Entrar</a>
              ) : (
                <Button variant="ghost" onClick={signOut}>
                  Sair
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container" style={{ padding: "22px 0 56px" }}>
        {(title || subtitle) && (
          <div style={{ marginBottom: 16 }}>
            {title && <h1 style={{ margin: 0, fontSize: 32 }}>{title}</h1>}
            {subtitle && <p style={{ margin: "8px 0 0", color: "var(--muted)" }}>{subtitle}</p>}
            <hr className="sep" />
          </div>
        )}
        {children}
      </main>
    </>
  );
}