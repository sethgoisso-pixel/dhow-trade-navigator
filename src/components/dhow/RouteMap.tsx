import { useState } from "react";

const NODES = {
  shanghai: { x: 820, y: 150, label: "Shanghai" },
  ningbo: { x: 812, y: 172, label: "Ningbo" },
  shenzhen: { x: 785, y: 205, label: "Shenzhen" },
  jebelali: { x: 545, y: 200, label: "Jebel Ali / Dubai" },
  suez: { x: 455, y: 170, label: "Suez" },
  cotonou: { x: 330, y: 285, label: "Cotonou" },
  lagos: { x: 345, y: 282, label: "" },
  mombasa: { x: 485, y: 320, label: "Mombasa" },
};

const ROUTES = [
  { id: "cn-ae", name: "Ningbo/Shanghai → Jebel Ali", d: "M812 172 C 720 260, 620 250, 545 200", ships: 14 },
  { id: "sz-ae", name: "Shenzhen → Dubai (Sea-Air)", d: "M785 205 C 700 120, 620 140, 545 200", ships: 6 },
  { id: "ae-bj", name: "Dubai → Cotonou / West Africa", d: "M545 200 C 520 330, 420 360, 330 285", ships: 4 },
  { id: "ae-ke", name: "Dubai → Mombasa", d: "M545 200 C 545 260, 520 300, 485 320", ships: 2 },
];

export function RouteMap({ highlight }: { highlight?: string[] }) {
  const [active, setActive] = useState<string | null>(null);
  const isOn = (id: string) => (active ? active === id : highlight ? highlight.includes(id) : true);
  return (
    <div className="overflow-hidden rounded-xl bg-gradient-navy text-navy-foreground shadow-card">
      <div className="flex flex-wrap items-center gap-2 px-4 pt-3 text-sm font-medium">
        Live Trade Corridors
        <div className="ml-auto flex flex-wrap gap-1">
          {ROUTES.map((r) => (
            <button
              key={r.id}
              onMouseEnter={() => setActive(r.id)}
              onMouseLeave={() => setActive(null)}
              onClick={() => setActive(active === r.id ? null : r.id)}
              className={`rounded-full border px-2 py-0.5 text-[10px] transition-colors ${isOn(r.id) ? "border-gold/50 bg-gold/15 text-gold" : "border-navy-foreground/15 text-navy-foreground/50"}`}
            >
              {r.name} · {r.ships}
            </button>
          ))}
        </div>
      </div>
      <svg viewBox="250 80 650 300" className="h-64 w-full sm:h-80">
        <defs>
          <pattern id="dots" width="12" height="12" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" className="fill-navy-foreground/10" />
          </pattern>
        </defs>
        <rect x="250" y="80" width="650" height="300" fill="url(#dots)" />
        {/* stylized landmasses */}
        <path d="M290 160 Q330 120 420 150 L470 180 Q500 250 480 330 Q430 380 380 340 Q330 300 300 280 Q270 220 290 160Z" className="fill-navy-foreground/[0.06]" />
        <path d="M470 120 Q560 100 640 120 Q760 100 860 130 L850 220 Q780 240 720 220 Q650 260 600 230 Q560 200 500 190 Z" className="fill-navy-foreground/[0.06]" />
        {ROUTES.map((r) => (
          <g key={r.id} className="transition-opacity" opacity={isOn(r.id) ? 1 : 0.18}>
            <path d={r.d} fill="none" className="stroke-gold/25" strokeWidth={6} />
            <path d={r.d} fill="none" className="animate-dash stroke-gold" strokeWidth={2} />
            <circle r="4" className="fill-gold">
              <animateMotion dur={`${4 + r.ships / 4}s`} repeatCount="indefinite" path={r.d} />
            </circle>
          </g>
        ))}
        {Object.values(NODES).map((n, i) => (
          <g key={i}>
            <circle cx={n.x} cy={n.y} r="9" className="fill-gold/20">
              <animate attributeName="r" values="5;11;5" dur="2.4s" repeatCount="indefinite" />
            </circle>
            <circle cx={n.x} cy={n.y} r="4" className="fill-navy-foreground" />
            {n.label && <text x={n.x + 8} y={n.y - 8} className="fill-navy-foreground/80 text-[11px] font-medium">{n.label}</text>}
          </g>
        ))}
        <text x="458" y="150" className="fill-warning text-[9px]">⚠ Red Sea risk</text>
      </svg>
    </div>
  );
}
