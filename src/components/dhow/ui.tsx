import type { ReactNode } from "react";

export function Panel({ title, icon, action, children, className = "" }: { title?: ReactNode; icon?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`animate-fade-up rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md shadow-card sm:p-6 ${className}`}>
      {title && (
        <div className="mb-5 flex items-center gap-2.5 border-b border-white/5 pb-3">
          {icon && <span className="text-[#E5C378]">{icon}</span>}
          <h2 className="font-semibold tracking-tight text-slate-100">{title}</h2>
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
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[#E5C378]/40 bg-gradient-to-r from-[#D4AF37]/20 via-[#F3E5AB]/10 to-transparent px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#E5C378] shadow-sm">
      ✦ {children}
    </span>
  );
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
