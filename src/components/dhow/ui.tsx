import type { ReactNode } from "react";

export function Panel({
  title,
  icon,
  action,
  children,
  className = "",
}: {
  title?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`animate-fade-up relative overflow-hidden rounded-2xl sm:rounded-3xl border border-white/20 dark:border-white/12 bg-white/75 dark:bg-[#0B1120]/60 p-5 backdrop-blur-2xl shadow-card transition-all duration-300 sm:p-6 before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/35 before:to-transparent ${className}`}
    >
      {title && (
        <div className="mb-5 flex items-center gap-2.5 border-b border-black/[0.06] pb-3 dark:border-white/10">
          {icon && <span className="text-[#E5C378]">{icon}</span>}
          <h2 className="font-semibold tracking-tight text-foreground">{title}</h2>
          <div className="ml-auto">{action}</div>
        </div>
      )}
      {children}
    </section>
  );
}

export function PageTitle({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl text-foreground font-['Syne',sans-serif]">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{sub}</p>
    </div>
  );
}

export function AIBadge({ children = "AI" }: { children?: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-transparent px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-300 shadow-[0_0_14px_rgba(245,158,11,0.25)] backdrop-blur-sm">
      <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
      {children}
    </span>
  );
}

export function Meter({ value, label }: { value: number; label: string }) {
  const tone = value > 40 ? "bg-destructive" : value > 25 ? "bg-warning" : "bg-success";
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-semibold">{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-black/20 dark:bg-white/10">
        <div className={`h-full rounded-full ${tone} transition-all duration-700`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
