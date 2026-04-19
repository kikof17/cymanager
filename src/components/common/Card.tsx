import type { PropsWithChildren } from "react";

type CardProps = PropsWithChildren<{
  title?: string;
  style?: React.CSSProperties;
  className?: string;
}>;

export default function Card({ title, children, style, className }: CardProps) {
  return (
    <section className={className ? `card ${className}` : "card"} style={style}>
      {title ? <h3 className="card-title">{title}</h3> : null}
      {children}
    </section>
  );
}