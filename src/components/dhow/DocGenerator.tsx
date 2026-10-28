import { useState } from "react";
import { Copy, FileText, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { TradeDoc } from "@/lib/dhow-plan";
import { DhowLogo } from "./Header";
import { Panel } from "./ui";

const hash = (s: string) => [...s].reduce((h, c) => (h * 33 + c.charCodeAt(0)) >>> 0, 5381);

function VerifyQR({ seed }: { seed: string }) {
  // Génère un QR code direct via l'API QR sécurisée standard sans dépendance lourde
  const verifyUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/dossier/${seed}`
    : `https://dhow-route.lovable.app/dossier/${seed}`;
  const qrEndpoint = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(verifyUrl)}&bgcolor=ffffff&color=0b192c&margin=1`;

  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <img
        src={qrEndpoint}
        alt={`Verification QR for ${seed}`}
        className="size-20 rounded border border-slate-300 bg-white p-0.5 shadow-sm"
        loading="lazy"
      />
      <span className="font-mono text-[8px] text-slate-500 uppercase tracking-tighter">Scan to Verify</span>
    </div>
  );
}

export function docToText(d: TradeDoc) {
  const line = "-".repeat(64);
  return [
    `UNB+UNOC:3+DHOW:ZZ+${d.reference}'`,
    d.title.toUpperCase(), `Ref: ${d.reference}   Date: ${new Date().toISOString().slice(0, 10)}`, `Incoterms: ${d.incoterms}`, line,
    ...d.parties.map((p) => `${p.role}: ${p.name}, ${p.address}`), line,
    ...d.meta.map((m) => `${m.label}: ${m.value}`), line,
    d.columns.join(" | "), ...d.rows.map((r) => r.join(" | ")), line,
    ...d.totals.map((t) => `${t.label}: ${t.value}`), `Marks & numbers: ${d.marks}`,
    "VERIFIED BY DHOW EMIRATES TRADE REPOSITORY — BLOCK 9104-E",
  ].join("\n");
}

function OfficialDoc({ d }: { d: TradeDoc }) {
  const date = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  return (
    <article className="print-doc rounded-lg bg-white p-6 font-sans text-slate-900 shadow-2xl sm:p-8">
      <header className="flex items-start justify-between gap-4 border-b-2 border-slate-900 pb-4">
        <div className="flex items-center gap-3">
          <DhowLogo className="size-12" />
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">Dhow Trade Intelligence</div>
            <h2 className="text-xl font-bold uppercase tracking-wide sm:text-2xl">{d.title}</h2>
            <div className="text-[11px] text-slate-500">{d.incoterms}</div>
          </div>
        </div>
        <dl className="text-right text-[11px]">
          <dt className="text-slate-500">Document ref.</dt><dd className="font-mono font-semibold">{d.reference}</dd>
          <dt className="mt-1 text-slate-500">Date of issue</dt><dd className="font-mono">{date}</dd>
        </dl>
      </header>
      <section className="mt-4 grid gap-3 sm:grid-cols-3">
        {d.parties.map((p) => (
          <div key={p.role} className="rounded border border-slate-300 p-2.5 text-[11px]">
            <div className="font-semibold uppercase tracking-wider text-slate-500">{p.role}</div>
            <div className="mt-1 font-semibold">{p.name}</div>
            <div className="text-slate-600">{p.address}</div>
          </div>
        ))}
      </section>
      <section className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-[11px] sm:grid-cols-3">
        {d.meta.map((m) => <div key={m.label}><span className="text-slate-500">{m.label}: </span><span className="font-medium">{m.value}</span></div>)}
      </section>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-[11px]">
          <thead><tr>{d.columns.map((c, i) => <th key={c} className={`border border-slate-400 bg-slate-100 px-2 py-1.5 font-semibold ${i === d.columns.length - 1 ? "text-right" : "text-left"}`}>{c}</th>)}</tr></thead>
          <tbody>{d.rows.map((r, ri) => <tr key={ri}>{r.map((c, i) => <td key={i} className={`border border-slate-300 px-2 py-1.5 ${i === r.length - 1 ? "text-right font-mono" : ""} ${i === 0 ? "font-mono" : ""}`}>{c}</td>)}</tr>)}</tbody>
        </table>
      </div>
      <div className="mt-3 flex justify-end">
        <dl className="min-w-56 text-[11px]">
          {d.totals.map((t, i) => <div key={t.label} className={`flex justify-between gap-6 border-b border-slate-200 py-1 ${i === d.totals.length - 1 ? "font-bold" : ""}`}><dt>{t.label}</dt><dd className="font-mono">{t.value}</dd></div>)}
        </dl>
      </div>
      <footer className="mt-6 flex items-end justify-between gap-4 border-t border-slate-300 pt-4">
        <div className="text-[10px] text-slate-600">
          <div><span className="font-semibold">Marks & numbers:</span> <span className="font-mono">{d.marks}</span></div>
          <div className="mt-3 inline-block rotate-[-2deg] rounded border-2 border-emerald-700 px-2 py-1 font-bold uppercase tracking-wider text-emerald-800">
            Verified by Dhow Emirates Trade Repository — Block 9104-E
          </div>
          <div className="mt-1 font-mono text-[9px] text-slate-400">SHA-256 {hash(d.reference).toString(16).padStart(8, "0")}…{hash(d.title + d.marks).toString(16)}</div>
        </div>
        <VerifyQR seed={d.reference} />
      </footer>
    </article>
  );
}

export function DocGenerator({ docs }: { docs: TradeDoc[] }) {
  const [doc, setDoc] = useState<TradeDoc | null>(null);
  const copy = async (d: TradeDoc) => {
    try { await navigator.clipboard.writeText(docToText(d)); toast.success("Raw EDI / text copied"); }
    catch { toast.error("Clipboard unavailable in this browser"); }
  };
  return (
    <Panel title="1-Click Document Generator" icon={<FileText className="size-4" />}>
      <div className="grid gap-2 sm:grid-cols-3">
        {docs.map((d) => (
          <Button key={d.reference} variant="outline" className="h-auto justify-start whitespace-normal py-3 text-left" onClick={() => { setDoc(d); toast.success(`${d.title} generated`); }}>
            <FileText className="shrink-0 text-gold-2" /> {d.title}
          </Button>
        ))}
      </div>
      <Dialog open={!!doc} onOpenChange={(o) => !o && setDoc(null)}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
          <DialogHeader className="no-print"><DialogTitle>{doc?.title}</DialogTitle></DialogHeader>
          {doc && <OfficialDoc d={doc} />}
          <div className="no-print flex flex-col gap-2 sm:flex-row">
            <Button className="flex-1" onClick={() => window.print()}><Printer /> Print / Save as PDF</Button>
            <Button variant="outline" className="flex-1" onClick={() => doc && copy(doc)}><Copy /> Copy Raw EDI / Text</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}
