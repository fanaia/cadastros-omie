import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";

const NAVIGATION = [{ label: "Visão geral", href: "/" }, { label: "Clientes e fornecedores", href: "/parceiros" }, { label: "Auxiliares", href: "/auxiliares" }, { label: "Sincronização", href: "/sincronizacao" }];
type ToastTone = "success" | "error" | "info";
type ToastItem = { id: string; tone: ToastTone; text: string };
const TOAST_EVENT = "oon:toast";
export const toast = { success: (text: string) => publishToast("success", text), error: (text: string) => publishToast("error", text), info: (text: string) => publishToast("info", text) };
function publishToast(tone: ToastTone, text: string) { window.dispatchEvent(new CustomEvent<ToastItem>(TOAST_EVENT, { detail: { id: crypto.randomUUID(), tone, text } })); }
function NavigationTabs() { const { pathname } = useLocation(); return <nav className="oon-tabs" aria-label="Navegação do módulo" role="tablist">{NAVIGATION.map(item => { const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href); return <Link key={item.href} role="tab" aria-selected={active} className={active ? "active" : ""} to={item.href}>{item.label}</Link>; })}</nav>; }
function ToastViewport() { const [items, setItems] = useState<ToastItem[]>([]); useEffect(() => { const receive = (event: Event) => { const item = (event as CustomEvent<ToastItem>).detail; setItems(current => [...current.filter(candidate => candidate.text !== item.text), item].slice(-4)); window.setTimeout(() => setItems(current => current.filter(candidate => candidate.id !== item.id)), item.tone === "error" ? 9000 : 5500); }; window.addEventListener(TOAST_EVENT, receive); return () => window.removeEventListener(TOAST_EVENT, receive); }, []); return createPortal(<div className="oon-toast-viewport" aria-live="polite" aria-atomic="true">{items.map(item => <div key={item.id} className={`oon-toast ${item.tone}`} role={item.tone === "error" ? "alert" : "status"}><span aria-hidden="true">{item.tone === "success" ? "✓" : item.tone === "error" ? "!" : "i"}</span><p>{item.text}</p><button aria-label="Fechar aviso" onClick={() => setItems(current => current.filter(candidate => candidate.id !== item.id))}>×</button></div>)}</div>, document.body); }

export function Page({ eyebrow, title, description, actions, children }: { eyebrow?: string; title: string; description: string; actions?: ReactNode; children: ReactNode }) {
  return <main className="oon-page"><ToastViewport /><header className="oon-hero"><div><span className="oon-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{actions && <div className="oon-hero-actions">{actions}</div>}</header><NavigationTabs />{children}</main>;
}
export function Modal({ open, title, description, onClose, children }: { open: boolean; title: string; description?: string; onClose: () => void; children: ReactNode }) { const closeRef = useRef<HTMLButtonElement>(null); useEffect(() => { if (!open) return; const active = document.activeElement as HTMLElement | null; const previousOverflow = document.body.style.overflow; document.body.style.overflow = "hidden"; closeRef.current?.focus(); const escape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); }; window.addEventListener("keydown", escape); return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", escape); active?.focus(); }; }, [open]); if (!open) return null; return createPortal(<div className="oon-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section className="oon-modal" role="dialog" aria-modal="true" aria-labelledby="oon-modal-title"><header><div><h2 id="oon-modal-title">{title}</h2>{description && <p>{description}</p>}</div><button ref={closeRef} type="button" className="oon-modal-close" aria-label="Fechar" onClick={onClose}>×</button></header><div className="oon-modal-body">{children}</div></section></div>, document.body); }
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
  useEffect(() => { const message = typeof children === "string" ? children : "A operação foi atualizada."; toast[tone](message); }, [children, tone]);
  return null;
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
