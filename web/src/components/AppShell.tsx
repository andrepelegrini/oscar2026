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
      <header className="headerShell">
        <div className="container" style={{ padding: "14px 0" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
              <Link href="/" className="brandPlate">
                <span className="dot" />
                <span style={{ fontFamily: "var(--font-display)", letterSpacing: "1.2px" }}>
                  BOLÃO ÓSCAR 2026
                </span>
              </Link>

              <nav className="nav">
                <Link className="navlink" href="/oscar-2026/palpites">Palpites</Link>
                <Link className="navlink" href="/oscar-2026/ranking">Ranking</Link>
                {isAdmin && <Link className="navlink" href="/oscar-2026/admin">Admin</Link>}
              </nav>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {!authed ? (
                <Link className="navlink" href="/login">Entrar</Link>
              ) : (
                <Button variant="ghost" onClick={signOut}>Sair</Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container" style={{ padding: "26px 0 64px" }}>
        {(title || subtitle) && (
          <div className="decoFrame">
            <div className="decoGlyph">
              <span />
              <div>HOLLYWOOD • NOIR</div>
              <span />
            </div>

            {title && <h1 style={{ margin: "14px 0 0", fontSize: 34 }}>{title}</h1>}
            {subtitle && <p style={{ color: "var(--text-muted)", margin: "8px 0 0" }}>{subtitle}</p>}
          </div>
        )}

        {children}
      </main>
    </>
  );
}