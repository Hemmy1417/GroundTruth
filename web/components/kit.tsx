"use client";

/**
 * The component kit — the shared design system. Every screen composes these
 * so radius / spacing / type / color / interaction stay consistent. Purely
 * presentational; no business logic lives here.
 */
import { useState } from "react";

/* ── Section: title + optional description + content, generous rhythm, no card
   unless one is asked for. This is the default grouping primitive. ── */
export function Section({
  title,
  description,
  action,
  children,
  className = "",
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      {title ? (
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="t-h2">{title}</h2>
            {description ? <p className="t-small mt-1">{description}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/* ── quiet label→value row (secondary info, no boxes) ── */
export function Row({
  k,
  children,
  mono = false,
}: {
  k: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="row">
      <span className="row-k">{k}</span>
      <span className={`row-v ${mono ? "t-mono" : ""}`} style={mono ? { color: "var(--ink-2)" } : undefined}>
        {children}
      </span>
    </div>
  );
}

/* ── progressive disclosure ── */
export function Disclosure({
  label,
  children,
  defaultOpen = false,
  count,
}: {
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  count?: number | string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`disc ${open ? "disc-open" : ""}`}>
      <button className="disc-btn" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span>
          {label}
          {count !== undefined ? (
            <span className="t-meta" style={{ marginLeft: 8 }}>
              {count}
            </span>
          ) : null}
        </span>
        <svg className="disc-chev" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? <div className="disc-body">{children}</div> : null}
    </div>
  );
}

/* ── badges / status ── */
type Tone = "neutral" | "success" | "warning" | "danger" | "pending";
export function Badge({
  tone = "neutral",
  dot = false,
  children,
}: {
  tone?: Tone;
  dot?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span className={`badge badge-${tone}`}>
      {dot ? <span className="badge-dot" /> : null}
      {children}
    </span>
  );
}

/* ── states ── */
export function EmptyState({
  title,
  body,
  action,
  icon,
}: {
  title: string;
  body?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="text-center" style={{ padding: "var(--s8) var(--s5)" }}>
      {icon ? <div style={{ marginBottom: "var(--s4)", color: "var(--muted)" }}>{icon}</div> : null}
      <div className="t-h2">{title}</div>
      {body ? <p className="t-body mt-2" style={{ maxWidth: 420, margin: "8px auto 0" }}>{body}</p> : null}
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ h = 16, w = "100%", className = "" }: { h?: number; w?: number | string; className?: string }) {
  return <div className={`skel ${className}`} style={{ height: h, width: w }} />;
}

export function Spinner({ size = 16 }: { size?: number }) {
  return <span className="spin" style={{ width: size, height: size }} aria-label="Loading" />;
}

/* ── copyable mono value (addresses/hashes — de-emphasized, whole value in DOM) ── */
export function Mono({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <span className="t-mono" title={title}>
      {children}
    </span>
  );
}
