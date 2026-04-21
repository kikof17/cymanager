import { useState } from "react";

type CollapsibleBoxProps = {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  variant?: "default" | "warning" | "success";
};

export default function CollapsibleBox({
  title,
  children,
  defaultExpanded = false,
  variant = "default",
}: CollapsibleBoxProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const variantClass =
    variant === "warning"
      ? "message-box message-box-warning"
      : variant === "success"
      ? "message-box message-box-success"
      : "message-box";

  return (
    <div className={variantClass}>
      <button
        type="button"
        className="collapsible-box-header"
        aria-expanded={expanded}
        onClick={() => setExpanded((prev) => !prev)}
      >
        <span>{title}</span>
        <span className="collapsible-box-chevron">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded ? <div className="collapsible-box-body">{children}</div> : null}
    </div>
  );
}
