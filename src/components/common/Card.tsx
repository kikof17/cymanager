import type { PropsWithChildren } from "react";

type CardProps = PropsWithChildren<{
  title?: string;
}>;

export default function Card({ title, children }: CardProps) {
  return (
    <section className="card">
      {title ? <h3 className="card-title">{title}</h3> : null}
      {children}
    </section>
  );
}