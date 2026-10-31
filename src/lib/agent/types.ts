/** One real step of an agent run: a tool call, a model thought, or a verification check. */
export type TraceEvent = {
  step: number;
  kind: "thought" | "tool" | "check";
  tool?: string;
  args?: Record<string, unknown>;
  summary: string;
  ms: number;
  ok: boolean;
};

export type ComplianceSummary = {
  verdict: "no_red_flags" | "review_required";
  flags: string[];
  dangerousGoods: string | null;
  disclaimer: string;
};
