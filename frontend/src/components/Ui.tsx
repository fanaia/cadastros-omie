import type { ReactNode } from "react";

export function Page({ eyebrow, title, description, actions, children }: { eyebrow?: string; title: string; description: string; actions?: ReactNode; children: ReactNode }) {
  return <main className="oon-page"><header className="oon-hero"><div><span className="oon-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{actions && <div className="oon-hero-actions">{actions}</div>}</header>{children}</main>;
}
export function Card({ title, description, actions, children, className = "" }: { title?: string; description?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`oon-card ${className}`}>{(title || actions) && <div className="oon-card-head"><div>{title && <h2>{title}</h2>}{description && <p>{description}</p>}</div>{actions}</div>}{children}</section>;
}
export function Badge({ tone = "neutral", children }: { tone?: "success" | "warning" | "danger" | "neutral"; children: ReactNode }) {
  return <span className={`oon-badge ${tone}`}>{children}</span>;
}
export function Button({ variant = "primary", busy, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger"; busy?: boolean }) {
  return <button {...props} disabled={busy || props.disabled} className={`oon-button ${variant}`}>{busy ? "Processando…" : children}</button>;
}
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="oon-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}
export function Notice({ tone, children }: { tone: "success" | "error" | "info"; children: ReactNode }) {
  return <div role="status" className={`oon-notice ${tone}`}>{children}</div>;
}
export function Empty({ title, description }: { title: string; description: string }) {
  return <div className="oon-empty"><strong>{title}</strong><span>{description}</span></div>;
}
export function StatGrid({ items }: { items: Array<{ label: string; value: string | number; detail?: string; tone?: string }> }) {
  return <div className="oon-stats">{items.map(item => <article key={item.label}><span>{item.label}</span><strong className={item.tone}>{item.value}</strong>{item.detail && <small>{item.detail}</small>}</article>)}</div>;
}
export function toneFor(value?: string): "success" | "warning" | "danger" | "neutral" {
  if (["Ativa", "Saudável", "Sincronizado", "success"].includes(value || "")) return "success";
  if (["Erro", "Indisponível", "failure"].includes(value || "")) return "danger";
  if (["Degradada", "Suspensa", "Não verificada", "partial"].includes(value || "")) return "warning";
  return "neutral";
}
export function errorMessage(error: unknown) {
  const candidate = error as { response?: { data?: { error?: { message?: string; correlationId?: string } } }; message?: string };
  const detail = candidate.response?.data?.error;
  return [detail?.message || candidate.message || "Não foi possível concluir a operação.", detail?.correlationId ? `Protocolo: ${detail.correlationId}` : ""].filter(Boolean).join(" ");
}
