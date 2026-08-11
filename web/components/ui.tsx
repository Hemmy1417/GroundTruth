"use client";

export function StatTile({
  label,
  value,
  sub,
  mono = true,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="g-card">
      <div className="g-eyebrow">{label}</div>
      <div className={`g-display-sm mt-2 ${mono ? "g-mono" : ""}`}>{value}</div>
      {sub ? <div className="g-caption mt-1">{sub}</div> : null}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="g-card-paper text-center py-12">
      <div className="g-display-sm">{title}</div>
      <div className="g-caption mt-2 max-w-md mx-auto">{body}</div>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="g-card" aria-busy>
      <div className="g-skeleton h-3 w-24" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="g-skeleton h-5 mt-3" style={{ width: `${88 - i * 14}%` }} />
      ))}
    </div>
  );
}

export function TitleBlock({
  eyebrow,
  title,
  right,
}: {
  eyebrow?: string;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="g-titleblock flex items-end justify-between gap-4 mb-5">
      <div>
        {eyebrow ? <div className="g-eyebrow mb-1">{eyebrow}</div> : null}
        <h2 className="g-display-md">{title}</h2>
      </div>
      {right}
    </div>
  );
}
