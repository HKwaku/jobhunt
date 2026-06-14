import { matchBadge, type MatchBadge } from "@/lib/types";

// ---- Page header ----
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ---- Card ----
export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 ${className}`}
    >
      {children}
    </div>
  );
}

const MATCH_STYLES: Record<MatchBadge, string> = {
  Strong: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30",
  Good: "bg-sky-500/15 text-sky-400 ring-sky-500/30",
  Partial: "bg-amber-500/15 text-amber-400 ring-amber-500/30",
  Weak: "bg-zinc-500/15 text-zinc-400 ring-zinc-500/30",
};

// ---- Match badge (Strong / Good / Partial / Weak) ----
export function MatchBadgePill({ score }: { score: number | null | undefined }) {
  const badge = matchBadge(score);
  if (!badge) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${MATCH_STYLES[badge]}`}
    >
      {badge}
      <span className="opacity-70">· {score}</span>
    </span>
  );
}

// ---- Generic status chip ----
export function Chip({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "brand" | "muted";
}) {
  const tones = {
    default: "bg-zinc-800 text-zinc-300",
    brand: "bg-brand-600/15 text-brand-400",
    muted: "bg-zinc-900 text-zinc-500",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

// ---- Empty state ----
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-800 px-6 py-14 text-center">
      <p className="text-sm font-medium text-zinc-300">{title}</p>
      {body && <p className="mx-auto mt-1 max-w-md text-sm text-zinc-500">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
