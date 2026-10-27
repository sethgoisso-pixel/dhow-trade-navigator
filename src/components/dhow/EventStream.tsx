import { useEffect, useRef } from "react";
import { Terminal } from "lucide-react";
import { useDhow } from "@/lib/dhow-store";

const color = { info: "text-muted-foreground", ok: "text-success", warn: "text-warning", agent: "text-gold" };

export function EventStream({ className = "" }: { className?: string }) {
  const { log, running } = useDhow();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
  }, [log]);
  return (
    <div className={`flex flex-col overflow-hidden rounded-xl border border-border bg-card text-foreground backdrop-blur-md shadow-card ${className}`}>
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5 text-sm font-medium">
        <Terminal className="size-4 text-gold" /> AI Agent Event Stream
        <span className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className={`size-1.5 rounded-full ${running ? "animate-pulse bg-gold" : "bg-success"}`} />
          {running ? "REASONING" : "LIVE"}
        </span>
      </div>
      <div ref={ref} className="h-full min-h-0 flex-1 space-y-1 overflow-y-auto p-4 font-mono text-xs">
        {log.map((l) => (
          <div key={l.id} className="animate-fade-up flex gap-2">
            <span className="shrink-0 text-muted-foreground/70">{l.t}</span>
            <span className={color[l.kind]}>{l.kind === "agent" ? "› " : ""}{l.msg}</span>
          </div>
        ))}
        <div className="animate-pulse text-gold">▍</div>
      </div>
    </div>
  );
}
