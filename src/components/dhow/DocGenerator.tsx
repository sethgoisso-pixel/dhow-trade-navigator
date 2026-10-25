import { useState } from "react";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fmtUSD, type CargoForm, type HSEntry } from "@/lib/dhow-data";
import { Panel } from "./ui";

type Doc = { name: string; body: string };

function build(kind: string, f: CargoForm, hs: HSEntry, value: number): string {
  const ref = `DH-${f.origin.slice(0, 2).toUpperCase()}${f.destination.slice(0, 2).toUpperCase()}-${new Date().getFullYear()}-0${Math.floor(value % 900) + 100}`;
  const head = `${kind.toUpperCase()}\nRef: ${ref}    Date: ${new Date().toISOString().slice(0, 10)}\n${"─".repeat(56)}\n`;
  const parties = `Shipper:    Zhejiang SunVolt New Energy Co., Ltd — ${f.origin}\nConsignee:  Atlantic Infra Builders SARL — ${f.destination}\nNotify:     Dhow Logistics FZE, Jebel Ali Free Zone, Dubai\n`;
  if (kind === "Commercial Invoice")
    return head + parties + `Incoterms:  CIF ${f.destination}\n\nHS Code     Description                                Value\n${hs.code}     ${hs.description.slice(0, 40).padEnd(40)} ${fmtUSD(value)}\nFreight & insurance                                    ${fmtUSD(value * 0.06)}\n\nTOTAL CIF VALUE: ${fmtUSD(value * 1.06)}\nCountry of origin: China   Payment: L/C at sight\n`;
  if (kind === "Packing List")
    return head + parties + `\nCargo:      ${f.cargoType}\nPackages:   ${Math.ceil(f.volume * 9)} pallets / crates\nGross wt:   ${(f.weight * 1000).toLocaleString()} kg\nNet wt:     ${(f.weight * 930).toLocaleString()} kg\nVolume:     ${f.volume} CBM\nContainers: ${Math.max(1, Math.ceil(f.volume / 66))} × 40' HC  (MSKU 771204-3, MSKU 771288-9)\nMarks:      DHOW / ${hs.code} / 1-UP\n`;
  return head + parties + `\nCarrier:        Maersk Line — Vessel MAERSK ESSEN / 445W\nPort of loading: ${f.origin}\nTransshipment:  Jebel Ali, AE\nPort of discharge: ${f.destination}\nFreight:        PREPAID\nDescription:    ${f.cargoType} — HS ${hs.code}\n                SAID TO CONTAIN ${Math.ceil(f.volume * 9)} PKGS, ${(f.weight * 1000).toLocaleString()} KG\n\n*** DRAFT — NOT NEGOTIABLE ***\n`;
}

export function DocGenerator({ form, hs, value }: { form: CargoForm; hs: HSEntry; value: number }) {
  const [doc, setDoc] = useState<Doc | null>(null);
  const kinds = ["Commercial Invoice", "Packing List", "Draft Bill of Lading"];
  const download = (d: Doc) => {
    const url = URL.createObjectURL(new Blob([d.body], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${d.name.replace(/ /g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${d.name} exported`);
  };
  return (
    <Panel title="1-Click Document Generator" icon={<FileText className="size-4" />}>
      <div className="grid gap-2 sm:grid-cols-3">
        {kinds.map((k) => (
          <Button key={k} variant="outline" className="h-auto justify-start py-3" onClick={() => { setDoc({ name: k, body: build(k, form, hs, value) }); toast.success(`${k} generated`); }}>
            <FileText className="text-gold-2" /> {k}
          </Button>
        ))}
      </div>
      <Dialog open={!!doc} onOpenChange={(o) => !o && setDoc(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{doc?.name}</DialogTitle></DialogHeader>
          <pre className="max-h-[60vh] overflow-auto rounded-lg bg-navy p-4 font-mono text-[11px] leading-relaxed text-navy-foreground">{doc?.body}</pre>
          <Button onClick={() => doc && download(doc)}><Download /> Export document</Button>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}
