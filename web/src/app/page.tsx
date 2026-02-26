"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/Card";

type AdminCheckResponse = { ok: boolean };

export default function HomePage() {
  const [authed, setAuthed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      setAuthed(Boolean(token));

      if (!token) return;

      const res = await fetch("/api/admin/check", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await res.json().catch(() => ({ ok: false }))) as AdminCheckResponse;
      setIsAdmin(Boolean(json.ok));
    }

    load();
  }, []);

  return (
    <AppShell>
      <section className="hero">
        <div className="heroGrid">
          <div>
            <div className="heroKicker">ART DECO • NOIR • 2026</div>
            <h1 className="heroTitle">Bolão do Óscar</h1>
            <p className="heroSubtitle">
              Faça seus palpites, acompanhe o ranking e lance os vencedores no grande dia.
            </p>

            <div className="heroActions">
              {!authed ? (
                <Link className="heroBtn primary" href="/login">
                  Entrar e participar
                  <span className="hint">Login rápido</span>
                </Link>
              ) : (
                <Link className="heroBtn primary" href="/oscar-2026/palpites">
                  Fazer meus palpites
                  <span className="hint">Abrir categorias</span>
                </Link>
              )}

              <Link className="heroBtn ghost" href="/oscar-2026/ranking">
                Ver ranking
                <span className="hint">Pontuação ao vivo</span>
              </Link>

              {isAdmin && (
                <Link className="heroBtn danger" href="/oscar-2026/admin">
                  Admin: lançar vencedores
                  <span className="hint">Somente você</span>
                </Link>
              )}
            </div>
          </div>

          <div className="heroPoster">
            <Card>
              <CardContent>
                <div className="posterInner">
                  <div className="posterFrame" />
                  <OscarStatuette />
                  <div className="posterText">
                    <div className="posterTop">THE ACADEMY</div>
                    <div className="posterBig">OSCAR</div>
                    <div className="posterBottom">BOLÃO • 2026</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </AppShell>
  );
}

/**
 * Estatueta em SVG dourado (estilo “foto/ilustração” Art Deco).
 * Se você quiser trocar por uma foto real depois: basta colocar um <img src="/oscar.png" .../>
 * e salvar a imagem em web/public/oscar.png
 */
function OscarStatuette() {
  return (
    <svg
      className="oscarSvg"
      viewBox="0 0 220 520"
      role="img"
      aria-label="Estatueta do Oscar"
    >
      <defs>
        <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--gold-light)" />
          <stop offset="0.45" stopColor="var(--gold)" />
          <stop offset="1" stopColor="#9C7A1F" />
        </linearGradient>
        <radialGradient id="shine" cx="35%" cy="20%" r="70%">
          <stop offset="0" stopColor="rgba(255,255,255,0.45)" />
          <stop offset="0.35" stopColor="rgba(255,255,255,0.10)" />
          <stop offset="1" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>

      {/* base */}
      <path
        d="M55 455c0-25 14-40 55-40s55 15 55 40v18H55v-18z"
        fill="url(#goldGrad)"
        opacity="0.92"
      />
      <path
        d="M42 473h136c4 0 7 3 7 7v22c0 10-8 18-18 18H53c-10 0-18-8-18-18v-22c0-4 3-7 7-7z"
        fill="url(#goldGrad)"
      />
      <path
        d="M58 470h104"
        stroke="rgba(0,0,0,0.25)"
        strokeWidth="3"
        opacity="0.35"
      />

      {/* body silhouette */}
      <path
        d="M110 28
           c20 0 34 16 34 36
           c0 12-5 22-12 28
           c18 20 28 44 26 70
           c-2 28-17 48-25 65
           c-6 13-5 31 3 47
           c8 16 10 33 6 51
           c-7 32-23 55-26 83
           c-2 18 5 39 10 57
           c2 7-2 14-9 16
           c-19 5-41 5-60 0
           c-7-2-11-9-9-16
           c5-18 12-39 10-57
           c-3-28-19-51-26-83
           c-4-18-2-35 6-51
           c8-16 9-34 3-47
           c-8-17-23-37-25-65
           c-2-26 8-50 26-70
           c-7-6-12-16-12-28
           c0-20 14-36 34-36z"
        fill="url(#goldGrad)"
      />

      {/* shine overlay */}
      <path
        d="M110 28
           c20 0 34 16 34 36
           c0 12-5 22-12 28
           c18 20 28 44 26 70
           c-2 28-17 48-25 65
           c-6 13-5 31 3 47
           c8 16 10 33 6 51
           c-7 32-23 55-26 83
           c-2 18 5 39 10 57
           c2 7-2 14-9 16
           c-19 5-41 5-60 0
           c-7-2-11-9-9-16
           c5-18 12-39 10-57
           c-3-28-19-51-26-83
           c-4-18-2-35 6-51
           c8-16 9-34 3-47
           c-8-17-23-37-25-65
           c-2-26 8-50 26-70
           c-7-6-12-16-12-28
           c0-20 14-36 34-36z"
        fill="url(#shine)"
        opacity="0.75"
      />

      {/* small outline */}
      <path
        d="M110 28
           c20 0 34 16 34 36
           c0 12-5 22-12 28
           c18 20 28 44 26 70
           c-2 28-17 48-25 65
           c-6 13-5 31 3 47
           c8 16 10 33 6 51
           c-7 32-23 55-26 83
           c-2 18 5 39 10 57
           c2 7-2 14-9 16
           c-19 5-41 5-60 0
           c-7-2-11-9-9-16
           c5-18 12-39 10-57
           c-3-28-19-51-26-83
           c-4-18-2-35 6-51
           c8-16 9-34 3-47
           c-8-17-23-37-25-65
           c-2-26 8-50 26-70
           c-7-6-12-16-12-28
           c0-20 14-36 34-36z"
        fill="none"
        stroke="rgba(0,0,0,0.25)"
        strokeWidth="3"
        opacity="0.35"
      />
    </svg>
  );
}