import type { ReactNode } from "react";

export function Panel({ title, icon, action, children, className = "" }: { title?: ReactNode; icon?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`animate-fade-up rounded-xl border bg-card p-4 shadow-card sm:p-5 ${className}`}>
      {title && (
        <div className="mb-4 flex items-center gap-2">
          {icon && <span className="text-gold-2">{icon}</span>}
          <h2 className="font-semibold">{title}</h2>
          <div className="ml-auto">{action}</div>
        </div>
      )}
      {children}
    </section>
  );
}

export function PageTitle({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-5">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{sub}</p>
    </div>
  );
}

export function AIBadge({ children = "AI" }: { children?: ReactNode }) {
  return <span className="inline-flex items-center gap-1 rounded-full bg-gradient-gold px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-navy">✦ {children}</span>;
}

export function Meter({ value, label }: { value: number; label: string }) {
  const tone = value > 40 ? "bg-destructive" : value > 25 ? "bg-warning" : "bg-success";
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs"><span className="text-muted-foreground">{label}</span><span className="font-mono font-semibold">{value}%</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${tone} transition-all duration-700`} style={{ width: `${value}%` }} /></div>
    </div>
  );
}
