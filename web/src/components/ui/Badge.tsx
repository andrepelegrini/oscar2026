export function Badge({ children }: { children: React.ReactNode }) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 10px",
          borderRadius: 999,
          border: "1px solid var(--border)",
          background: "rgba(214,179,106,.08)",
          color: "var(--text)",
          fontSize: 12,
          opacity: 0.9,
        }}
      >
        {children}
      </span>
    );
  }