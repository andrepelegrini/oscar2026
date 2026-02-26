export function Card({ children }: { children: React.ReactNode }) {
    return <div className="card">{children}</div>;
  }
  
  export function CardHeader({ children }: { children: React.ReactNode }) {
    return <div className="cardHeader">{children}</div>;
  }
  
  export function CardContent({ children }: { children: React.ReactNode }) {
    return <div className="cardContent">{children}</div>;
  }