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
      "Dubai Corridor & Agent Architecture — Dhow",
      "How Dhow fits Dubai's D33 trade agenda and the Jebel Ali sea / DWC air corridor, and how its agent works."
    ),
  component: D33ArchitecturePage,
});

function D33ArchitecturePage() {
  const pillars = [
    {
      icon: Anchor,
      title: "Jebel Ali Port (DP World)",
      badge: "Deepwater Hub",
      desc: "Dubai's deep-water hub and the default transshipment point in Dhow's route model for Asia → Africa cargo.",
    },
    {
      icon: Plane,
      title: "Al Maktoum Int'l (DWC)",
      badge: "Air Cargo Epicenter",
      desc: "The air leg of the sea-air option: Dhow compares it with pure sea routes using a distance-based estimate, not carrier schedules.",
    },
    {
      icon: ShieldCheck,
      title: "Customs pre-declaration drafts",
      badge: "Roadmap: Mirsal II",
      desc: "Dhow prepares HS-coded draft declarations for broker review. It is not connected to Dubai Trade / Mirsal II and submits nothing today.",
    },
    {
      icon: Lock,
      title: "Privacy-preserving manifests",
      badge: "Roadmap",
      desc: "Planned: share only the fields a counterparty needs, with hash commitments. Real zero-knowledge proofs are a later phase. Not implemented yet.",
    },
  ];

  const specs = [
    { label: "Dubai D33 trade target", value: "AED 32 tn", detail: "Foreign trade goal set by the D33 agenda" },
    { label: "HS-2022 subheadings searched", value: "5,613", detail: "UN Comtrade open data, verified by code" },
    { label: "Agent tools", value: "5", detail: "Port, HS search, compliance, routes, landed cost" },
    { label: "Automated tests", value: "13", detail: "Tools, verifier, agent loop and fallback" },
  ];


  return (
    <div className="space-y-6">
      <PageTitle
        title="Dubai Corridor & Agent Architecture"
        sub="Connecting Asia, the Gulf and Africa through Dubai, with an agent that shows its work."
      />

      {/* Strategic Header Banner */}
      <Panel>
        <div className="relative overflow-hidden p-2 sm:p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl space-y-2">
              <div className="flex items-center gap-2">
                <AIBadge>Dubai Economic Agenda D33</AIBadge>
                <span className="text-xs text-muted-foreground">Tool-using trade agent</span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl font-['Syne',sans-serif]">
                Dubai as the pivot for Asia → Africa trade
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                When chokepoints such as the Red Sea or Hormuz are disrupted, a trader in Dubai has to compare sea, air and sea-air options fast. Dhow assembles those options, the duty estimate and the draft paperwork in one run, and shows every tool call it made, so a forwarder can check it instead of trusting it.
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
      <Panel title="Facts & Figures" icon={<Cpu className="size-4" />}>
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
      <Panel title="How a run works" icon={<Layers className="size-4" />}>
        <div className="space-y-3 pt-1">
          <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gold/20 font-mono text-xs font-bold text-gold-2">1</span>
            <div>
              <h4 className="text-xs font-semibold text-foreground">Cargo Manifest Ingestion & Geo-Routing</h4>
              <p className="mt-0.5 text-[11px] text-muted-foreground">The trader enters origin, destination, goods, value and deadline. The agent resolves the ports and estimates route options through a hub, including chokepoint exposure.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gold/20 font-mono text-xs font-bold text-gold-2">2</span>
            <div>
              <h4 className="text-xs font-semibold text-foreground">WCO 6-Digit Tariff & Customs Synthesis</h4>
              <p className="mt-0.5 text-[11px] text-muted-foreground">The AI picks among real HS-2022 candidates, a verifier confirms the code exists and keeps the duty on the legal bands of the destination customs union, and code computes the landed cost estimate.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gold/20 font-mono text-xs font-bold text-gold-2">3</span>
            <div>
              <h4 className="text-xs font-semibold text-foreground">Draft documents with a content fingerprint</h4>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Commercial invoice, packing list and bill of lading drafts are generated with placeholders for unknown parties, plus a SHA-256 fingerprint of the content to detect later changes. They are not official documents.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gold/20 font-mono text-xs font-bold text-gold-2">4</span>
            <div>
              <h4 className="text-xs font-semibold text-foreground">Human-in-the-loop dispatch</h4>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Booking requests and customs pre-declaration drafts are staged in the dispatch tower. A human approves or rejects them. Nothing is transmitted to carriers or customs yet.</p>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
