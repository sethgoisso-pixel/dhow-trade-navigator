import { Link, useNavigate } from "@tanstack/react-router";
import { ThemeToggle } from "./ThemeToggle";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DhowLogo({ className = "size-9" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-[#1E293B] to-[#0A0F1D] p-2 border border-[#E5C378]/40 shadow-lg shadow-[#D4AF37]/15 ${className}`}>
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="size-full">
        <path
          d="M10 32V8C10 8 28 9 28 20C28 29 18 32 10 32Z"
          stroke="url(#goldGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M10 24C16 23 22 20 22 14"
          stroke="url(#goldGrad)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeDasharray="2 3"
        />
        <path
          d="M6 32H32L29 35H9L6 32Z"
          fill="url(#goldGrad)"
        />
        <defs>
          <linearGradient id="goldGrad" x1="6" y1="8" x2="32" y2="35" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FDE68A" />
            <stop offset="0.5" stopColor="#D4AF37" />
            <stop offset="1" stopColor="#996515" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

const NAV = [
  { to: "/", label: "Mission Control" },
  { to: "/optimizer", label: "Route Optimizer" },
  { to: "/customs", label: "Customs & Compliance" },
  { to: "/dispatch", label: "Autonomous Dispatch" },
  { to: "/scenarios", label: "Architecture" },
] as const;

export function Header() {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-40 border-b border-black/[0.06] bg-white/70 text-slate-900 shadow-xl backdrop-blur-2xl transition-colors dark:border-white/10 dark:bg-[#070A10]/70 dark:text-slate-100 dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-3 group">
            <DhowLogo className="size-10 transition-transform group-hover:scale-105" />
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-xl font-['Syne',sans-serif]">Dhow</span>
              <span className="text-[9px] font-semibold tracking-widest text-[#E5C378] uppercase">Emirates Trade Intelligence</span>
            </div>
          </Link>
          <span className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-medium text-amber-300">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
            Autonomous v1.0
          </span>
          <span className="hidden lg:inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-medium text-slate-300">
            Neutral Trade Corridor · Dubai hub · every figure sourced or labelled
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="rounded-2xl border-white/15 bg-white/10 text-slate-700 hover:bg-white/20 hover:text-slate-900 dark:border-white/15 dark:bg-white/[0.05] dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white backdrop-blur-md"
            onClick={() => navigate({ to: "/optimizer" })}
          >
            <PlusCircle className="size-3.5" />
            <span className="hidden sm:inline">New Cargo Request</span>
            <span className="sm:hidden">New</span>
          </Button>
          <ThemeToggle />
        </div>
      </div>
      
      <nav className="mx-auto flex max-w-7xl flex-nowrap gap-1.5 overflow-x-auto overscroll-x-contain px-4 pb-2.5 pt-1 [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden">
        {NAV.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            activeOptions={{ exact: true }}
            className="shrink-0 whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-medium text-slate-500 transition-all hover:bg-slate-100/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-slate-200 data-[status=active]:border data-[status=active]:border-amber-400/50 data-[status=active]:bg-gradient-to-r data-[status=active]:from-amber-500/25 data-[status=active]:to-yellow-500/15 data-[status=active]:text-amber-300 data-[status=active]:shadow-[0_0_15px_rgba(245,158,11,0.2)]"
          >
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
