import type { PropsWithChildren } from "react";

type CardProps = PropsWithChildren<{
  title?: string;
  style?: React.CSSProperties; // Ajout de la propriété style
}>;

export default function Card({ title, children, style }: CardProps) {
  return (
    <section className="card" style={style}> {/* Application des styles */}
      {title ? <h3 className="card-title">{title}</h3> : null}
      {children}
    </section>
  );
}