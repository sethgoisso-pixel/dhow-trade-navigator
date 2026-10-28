import { createFileRoute, Link } from "@tanstack/react-router";
import { 
  Anchor, 
  Plane, 
  ShieldCheck, 
  Cpu, 
  Globe2, 
  ArrowRight, 
  CheckCircle2, 
  Building2,
  Lock,
  Layers
} from "lucide-react";
import { AIBadge, PageTitle, Panel } from "@/components/dhow/ui";
import { Button } from "@/components/ui/button";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/scenarios")({
  head: () =>
    seo(
      "D33 Sovereign Corridor & Architecture — Dhow",
      "How Dhow leverages Dubai's D33 trade agenda, Jebel Ali Sea-Air hub, and Mirsal II digital customs integration."
    ),
  component: D33ArchitecturePage,
});

export function D33ArchitecturePage() {
  const pillars = [
    {
      icon: Anchor,
      title: "Jebel Ali Port (DP World)",
      badge: "Deepwater Hub",
      desc: "Handles over 14M TEU annually. Direct feeder connectivity to 150+ ports across the Indian Ocean, East Africa, and South Asia.",
    },
    {
      icon: Plane,
      title: "Al Maktoum Int'l (DWC)",
      badge: "Air Cargo Epicenter",
      desc: "Ultra-fast bonded transit corridor (<8 hours from berth to tarmac via Emirates SkyCargo) cutting transit times by up to 14 days.",
    },
    {
      icon: ShieldCheck,
      title: "Dubai Trade Mirsal II",
      badge: "Digital Clearance",
      desc: "Pre-filing electronic customs manifests with automated Harmonized System tariff assignment and WCO SAFE compliance.",
    },
    {
      icon: Lock,
      title: "Zero-Knowledge Manifests",
      badge: "Neutral Escrow",
      desc: "Commercial confidentiality protocols safeguarding merchant routes, margins, and trade flows across geopolitical chokepoints.",
    },
  ];

  const specs = [
    { label: "Target Trade Volume", value: "32 Trillion AED", detail: "Aligned with Dubai D33 Agenda" },
    { label: "Bonded Transfer Window", value: "< 8 Hours", detail: "Jebel Ali seaport to DWC airport" },
    { label: "Transit Time Reduction", value: "60% to 75%", detail: "Compared to pure maritime routes" },
    { label: "Customs Protocol", value: "WCO & Mirsal II", detail: "6-digit Harmonized Tariff System" },
  ];

  return (
    <div className="space-y-6">
      <PageTitle
        title="D33 Sovereign Corridor & Architecture"
        sub="Connecting Asia, the Gulf, and Africa through Dubai's sovereign physical and digital trade infrastructure."
      />

      {/* Strategic Header Banner */}
      <Panel>
        <div className="relative overflow-hidden p-2 sm:p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl space-y-2">
              <div className="flex items-center gap-2">
                <AIBadge>Dubai Economic Agenda D33</AIBadge>
                <span className="text-xs text-muted-foreground">Autonomous Trade Engine</span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl font-['Syne',sans-serif]">
                The Neutral Pivot for Global Commerce
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                As geopolitical tensions disrupt historical chokepoints like the Red Sea, Dhow positions Dubai as the world's most resilient multimodal pivot. By combining sea transit from Asia with air dispatch to Africa and Europe, Dhow executes trade routes that traditional forwarders take days to assemble.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2">
              <Link to="/optimizer">
                <Button className="w-full bg-gradient-gold font-semibold text-navy shadow-gold hover:opacity-95">
                  Launch Route Optimizer
                  <ArrowRight className="ml-1.5 size-4" />
                </Button>
              </Link>
              <Link to="/customs">
                <Button variant="outline" className="w-full text-xs">
                  Inspect Customs Engine
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Panel>

      {/* 4 Pillars of Architecture */}
      <div className="grid gap-4 sm:grid-cols-2">
        {pillars.map((p) => {
          const Icon = p.icon;
          return (
            <Panel key={p.title}>
              <div className="flex items-start gap-3.5">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold/10 text-gold-2">
                  <Icon className="size-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{p.title}</h3>
                    <AIBadge>{p.badge}</AIBadge>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">{p.desc}</p>
                </div>
              </div>
            </Panel>
          );
        })}
      </div>

      {/* Architecture Metrics Grid */}
      <Panel title="Corridor Telemetry & Performance Targets" icon={<Cpu className="size-4" />}>
        <div className="grid gap-4 divide-y divide-border sm:grid-cols-4 sm:divide-x sm:divide-y-0 pt-2">
          {specs.map((s, idx) => (
            <div key={s.label} className={idx === 0 ? "" : "sm:pl-4 pt-3 sm:pt-0"}>
              <div className="text-[11px] font-medium text-muted-foreground">{s.label}</div>
              <div className="mt-1 font-mono text-lg font-bold text-gold-2 sm:text-xl">{s.value}</div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">{s.detail}</div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Operational Flow */}
      <Panel title="Autonomous Execution Workflow" icon={<Layers className="size-4" />}>
        <div className="space-y-3 pt-1">
          <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gold/20 font-mono text-xs font-bold text-gold-2">1</span>
            <div>
              <h4 className="text-xs font-semibold text-foreground">Cargo Manifest Ingestion & Geo-Routing</h4>
              <p className="mt-0.5 text-[11px] text-muted-foreground">The merchant inputs origin, destination, and commodity specifications. The agent parses transit corridors and computes optimal multimodal alternatives.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gold/20 font-mono text-xs font-bold text-gold-2">2</span>
            <div>
              <h4 className="text-xs font-semibold text-foreground">WCO 6-Digit Tariff & Customs Synthesis</h4>
              <p className="mt-0.5 text-[11px] text-muted-foreground">The AI classifies the commodity into official Harmonized System codes, checks import tariffs at the destination port, and generates landed cost assessments.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gold/20 font-mono text-xs font-bold text-gold-2">3</span>
            <div>
              <h4 className="text-xs font-semibold text-foreground">Institutional Document & QR Stamping</h4>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Commercial Invoice, Bill of Lading, and Certificate of Origin are synthesized with a cryptographic SHA-256 seal and a scannable verification QR code.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gold/20 font-mono text-xs font-bold text-gold-2">4</span>
            <div>
              <h4 className="text-xs font-semibold text-foreground">Human-in-the-Loop Autonomous Dispatch</h4>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Concrete booking orders and digital pre-filings are staged in the Autonomous Dispatch Tower where a human controller signs off before execution.</p>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
