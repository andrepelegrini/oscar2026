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
  const stylesByVariant: Record<Variant, React.CSSProperties> = {
    primary: {
      background: "linear-gradient(180deg, var(--gold), var(--gold-2))",
      color: "var(--ink)",
      border: "1px solid rgba(0,0,0,.35)",
    },
    ghost: {
      background: "transparent",
      color: "var(--text)",
      border: "1px solid var(--border-strong)",
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
      style={{
        padding: "10px 14px",
        borderRadius: 14,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        transition: "transform .06s ease",
        ...stylesByVariant[variant],
      }}
      onMouseDown={(e) => (e.currentTarget.style.transform = "translateY(1px)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
    >
      {children}
    </button>
  );
}