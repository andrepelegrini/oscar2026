export function Card({ children }: { children: React.ReactNode }) {
    return (
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          boxShadow: "var(--shadow)",
          padding: 0,
        }}
      >
        {children}
      </div>
    );
  }
  
  export function CardHeader({ children }: { children: React.ReactNode }) {
    return (
      <div
        style={{
          padding: 18,
          borderBottom: "1px solid var(--border-soft)",
          background: "linear-gradient(90deg, rgba(212,175,55,0.08), transparent)",
        }}
      >
        {children}
      </div>
    );
  }
  
  export function CardContent({ children }: { children: React.ReactNode }) {
    return <div style={{ padding: 18 }}>{children}</div>;
  }