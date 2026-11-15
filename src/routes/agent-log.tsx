import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Activity } from "lucide-react";
import { PageTitle, Panel } from "@/components/dhow/ui";
import { listAgentRuns } from "@/lib/dhow-ai.functions";

const runsQuery = queryOptions({ queryKey: ["agent-runs"], queryFn: () => listAgentRuns() });

export const Route = createFileRoute("/agent-log")({
  loader: ({ context }) => context.queryClient.ensureQueryData(runsQuery),
  head: () => ({
    meta: [
      { title: "Agent Log — Dhow" },
      { name: "description", content: "Measured usage of every Dhow agent run: model calls, input and output tokens, duration." },
      { property: "og:title", content: "Agent Log — Dhow" },
      { property: "og:description", content: "Measured tokens, model calls and duration for each Dhow agent run." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AgentLog,
});

function AgentLog() {
  const { data: runs } = useSuspenseQuery(runsQuery);
  const ai = runs.filter((r) => r.source === "ai");
  const sum = (k: "input_tokens" | "output_tokens" | "model_calls" | "duration_ms") => ai.reduce((a, r) => a + r[k], 0);
  const avg = (n: number) => (ai.length ? Math.round(n / ai.length) : 0);
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <PageTitle title="Agent Log" sub="Every agent run, measured on the server. Token counts come from the AI provider response, not estimates." />
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm">
        {[
          ["Runs with AI", String(ai.length)],
          ["Avg model calls", String(avg(sum("model_calls")))],
          ["Avg tokens in / out", `${avg(sum("input_tokens"))} / ${avg(sum("output_tokens"))}`],
          ["Avg duration", `${(avg(sum("duration_ms")) / 1000).toFixed(1)} s`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg border border-border bg-card/60 p-3">
            <div className="text-xs text-muted-foreground">{k}</div>
            <div className="text-lg font-semibold text-foreground">{v}</div>
          </div>
        ))}
      </div>
      <Panel title="Runs (latest 200)" icon={<Activity className="h-4 w-4" />}>
        {runs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No runs recorded yet. Plan a shipment or classify a product to create the first entry.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr className="text-left">
                  {["When (UTC)", "Type", "Mode", "Model", "Calls", "Tokens in", "Tokens out", "Duration", "Note"].map((h) => <th key={h} className="p-2 font-medium">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id} className="border-t border-border text-foreground">
                    <td className="p-2 whitespace-nowrap">{r.created_at.slice(0, 19).replace("T", " ")}</td>
                    <td className="p-2">{r.kind}</td>
                    <td className="p-2">{r.source === "ai" ? "AI" : "Tools only"}</td>
                    <td className="p-2 whitespace-nowrap">{r.model}</td>
                    <td className="p-2">{r.model_calls}</td>
                    <td className="p-2">{r.input_tokens}</td>
                    <td className="p-2">{r.output_tokens}</td>
                    <td className="p-2 whitespace-nowrap">{(r.duration_ms / 1000).toFixed(1)} s</td>
                    <td className="p-2 text-muted-foreground">{r.note ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
