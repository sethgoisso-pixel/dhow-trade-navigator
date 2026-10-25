import { Link, useNavigate } from "@tanstack/react-router";
import { Compass, PlusCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SCENARIOS } from "@/lib/dhow-data";
import { runAgent } from "@/lib/dhow-store";

const NAV = [
  { to: "/", label: "Mission Control" },
  { to: "/optimizer", label: "Route Optimizer" },
  { to: "/customs", label: "Customs & Compliance" },
  { to: "/dispatch", label: "Autonomous Dispatch" },
  { to: "/scenarios", label: "Demo Scenarios" },
] as const;

export function Header() {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-40 bg-gradient-navy text-navy-foreground shadow-card">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-lg bg-gradient-gold text-navy shadow-gold">
            <Compass className="size-5" />
          </span>
          <span className="text-xl font-bold tracking-tight">Dhow</span>
        </Link>
        <span className="flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-[11px] font-medium text-gold">
          <span className="size-1.5 animate-pulse rounded-full bg-success" />
          Autonomous Agent Active (v1.0)
        </span>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" className="border-navy-foreground/20 bg-transparent text-navy-foreground hover:bg-navy-foreground/10 hover:text-navy-foreground" onClick={() => navigate({ to: "/optimizer" })}>
            <PlusCircle /> <span className="hidden sm:inline">Launch New Cargo Request</span><span className="sm:hidden">New</span>
          </Button>
          <Button size="sm" className="shadow-gold" onClick={() => { runAgent(SCENARIOS[0]); navigate({ to: "/scenarios" }); }}>
            <Zap /> <span className="hidden sm:inline">Load Hackathon Demo Scenario</span><span className="sm:hidden">Demo</span>
          </Button>
        </div>
      </div>
      <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-2">
        {NAV.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            activeOptions={{ exact: true }}
            className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm text-navy-foreground/70 transition-colors hover:bg-navy-foreground/10 hover:text-navy-foreground data-[status=active]:bg-gold/15 data-[status=active]:text-gold"
          >
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
