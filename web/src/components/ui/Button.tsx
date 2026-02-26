type Variant = "primary" | "ghost" | "danger";

export function Button({
  children,
  onClick,
  type = "button",
  disabled,
  variant = "primary",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  variant?: Variant;
}) {
  const base: React.CSSProperties = {
    position: "relative",
    padding: "10px 14px",
    borderRadius: 14,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
    transition: "transform .06s ease, filter .14s ease",
    overflow: "hidden",
  };

  const stylesByVariant: Record<Variant, React.CSSProperties> = {
    primary: {
      background: "linear-gradient(180deg, var(--gold), var(--gold-light))",
      color: "#1B1A22",
      border: "1px solid rgba(0,0,0,.35)",
      boxShadow: "0 10px 28px rgba(0,0,0,.35)",
    },
    ghost: {
      background: "transparent",
      color: "var(--text)",
      border: "1px solid var(--border-soft)",
    },
    danger: {
      background: "linear-gradient(180deg, #9B2435, var(--wine))",
      color: "var(--text)",
      border: "1px solid rgba(0,0,0,.35)",
    },
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{ ...base, ...stylesByVariant[variant] }}
      onMouseDown={(e) => (e.currentTarget.style.transform = "translateY(1px)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
      onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.06)")}
      onMouseLeave={(e) => (e.currentTarget.style.filter = "brightness(1)")}
    >
      {/* shimmer */}
      <span
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(120deg, transparent 0%, rgba(255,255,255,.22) 20%, transparent 45%)",
          transform: "translateX(-120%)",
          transition: "transform .6s ease",
          pointerEvents: "none",
        }}
        className="btnShimmer"
      />
      <span style={{ position: "relative" }}>{children}</span>

      <style jsx>{`
        button:hover .btnShimmer {
          transform: translateX(120%);
        }
      `}</style>
    </button>
  );
}