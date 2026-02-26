"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const router = useRouter();

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
    router.push("/");
  }

  return (
    <>
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
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
              <Link
                href="/"
                style={{
                  fontFamily: "var(--font-display)",
                  letterSpacing: "1px",
                }}
              >
                BOLÃO ÓSCAR 2026
              </Link>

              <nav style={{ display: "flex", gap: 14 }}>
                <Link href="/oscar-2026/palpites">Palpites</Link>
                <Link href="/oscar-2026/ranking">Ranking</Link>
                {isAdmin && <Link href="/oscar-2026/admin">Admin</Link>}
              </nav>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              {!authed ? (
                <Link href="/login">Entrar</Link>
              ) : (
                <Button variant="ghost" onClick={signOut}>
                  Sair
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container" style={{ padding: "32px 0 60px" }}>
        {(title || subtitle) && (
          <div style={{ marginBottom: 20 }}>
            {title && <h1 style={{ margin: 0 }}>{title}</h1>}
            {subtitle && (
              <p style={{ color: "var(--text-muted)", marginTop: 6 }}>
                {subtitle}
              </p>
            )}
            <hr className="sep" />
          </div>
        )}

        {children}
      </main>
    </>
  );
}