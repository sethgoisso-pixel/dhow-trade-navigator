import { CheckCircle2, Loader2, Circle } from "lucide-react";

export function AgentSteps({ steps, index }: { steps: string[]; index: number }) {
  return (
    <ol className="space-y-2">
      {steps.map((s, i) => {
        const done = i < index, cur = i === index;
        return (
          <li key={i} className={`flex items-start gap-2.5 text-sm transition-opacity ${i > index ? "opacity-35" : "animate-fade-up"}`}>
            {done ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" /> : cur ? <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-gold-2" /> : <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
            <span className={cur ? "font-medium" : ""}>{s}</span>
          </li>
        );
      })}
    </ol>
  );
}
