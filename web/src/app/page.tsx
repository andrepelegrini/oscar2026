export default function Home() {
  return (
    <main style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 32, marginBottom: 8 }}>Bolão Óscar 2026</h1>
      <p style={{ marginBottom: 24 }}>
        Faça seus palpites até <b>15/03/2026 17:00 (GMT-3)</b>.
      </p>

      <ul style={{ display: "grid", gap: 12, listStyle: "none", padding: 0 }}>
        <li>
          <a href="/login">Entrar</a>
        </li>
        <li>
          <a href="/oscar-2026/palpites">Meus palpites</a>
        </li>
        <li>
          <a href="/oscar-2026/ranking">Ranking</a>
        </li>
      </ul>
    </main>
  );
}