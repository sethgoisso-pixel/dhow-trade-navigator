import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { simulatePlan, type Plan, type PlanSource } from "./dhow-plan";

const Input = z.object({
  origin: z.string().min(2).max(120),
  destination: z.string().min(2).max(120),
  cargoType: z.string().min(2).max(200),
  weight: z.number().positive().max(100000),
  volume: z.number().positive().max(100000),
  declaredValue: z.number().nonnegative().max(1e10),
  deadline: z.string().max(20),
});

const S = { type: "string" } as const;
const N = { type: "number" } as const;
const obj = (p: Record<string, unknown>) => ({ type: "object", properties: p, required: Object.keys(p), additionalProperties: false });
const arr = (items: unknown) => ({ type: "array", items });

const SCHEMA = obj({
  reasoningSteps: arr(S),
  corridor: S,
  waypoints: arr(obj({ name: S, lat: N, lng: N, role: { type: "string", enum: ["origin", "hub", "destination"] } })),
  options: arr(obj({ key: { type: "string", enum: ["A", "B", "C"] }, name: S, via: S, days: N, cost: N, co2: N, reliability: N })),
  customs: obj({ hsCode: S, description: S, confidence: N, tariffs: arr(obj({ label: S, rate: S, amount: N })), totalLanded: N }),
  risks: obj({ congestion: N, customs: N, weather: N, briefing: S }),
  documents: arr(obj({
    kind: { type: "string", enum: ["invoice", "packing", "bl"] }, title: S, reference: S, incoterms: S,
    parties: arr(obj({ role: S, name: S, address: S })),
    meta: arr(obj({ label: S, value: S })),
    columns: arr(S), rows: arr(arr(S)),
    totals: arr(obj({ label: S, value: S })),
    marks: S,
  })),
});

const INSTRUCTIONS = `You are Dhow, an autonomous trade & logistics navigator headquartered in Dubai's neutral trade corridor.
Given a cargo request, produce a realistic logistics plan:
- reasoningSteps: 6-8 concise sequential steps (parse cargo, check sea/air corridors, chokepoints Suez/Red Sea/Malacca/Panama, carrier matching, HS classification, duty calculation, documents).
- corridor: hub chain like "Douala → Antwerp → Frankfurt (Rhine rail)".
- waypoints: exactly 3 in order origin, hub (strategic transshipment, Jebel Ali when sensible, otherwise the best regional hub), destination, with accurate decimal lat/lng.
- options: exactly 3: A fastest (sea-air or direct air), B cheapest (ocean FCL or road), C Dhow AI optimized multimodal (recommended, best reliability). days integers, cost USD integers, co2 tons with 1 decimal, reliability 0-100.
- customs: 6-digit HS code formatted like 0901.11, confidence 0-100, tariffs tailored to the destination country (import duty, local VAT/TVA, port fees, automated brokerage fee) with USD amounts computed on CIF value; totalLanded = sum.
- risks: percentages 0-100 and a 1-2 sentence intelligence briefing.
- documents: exactly 3 with kind invoice ("Commercial Invoice"), packing ("Packing List"), bl ("Draft Bill of Lading" for ocean or "Draft Air Waybill" for air). Use Incoterms 2020 notation, plausible party names/addresses, itemized rows matching columns, container numbers like MSKU1234567 / CMAU7654321, formatted currency strings like $127,680.`;

async function callGateway(apiKey: string, input: z.infer<typeof Input>): Promise<Plan> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, Authorization: `Bearer ${apiKey}`, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      instructions: INSTRUCTIONS,
      input: `Cargo request JSON: ${JSON.stringify(input)}`,
      stream: true,
      store: false,
      reasoning: { effort: "low" },
      text: { format: { type: "json_schema", name: "dhow_plan", strict: true, schema: SCHEMA } },
    }),
  });
  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => "");
    console.error("Dhow AI gateway error", res.status, body.slice(0, 300));
    throw new Error(res.status === 402 ? "AI credits exhausted" : res.status === 429 ? "AI rate limited" : `AI unavailable (${res.status})`);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let text = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      const frame = buf.slice(0, i);
      buf = buf.slice(i + 2);
      for (const line of frame.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const raw = line.slice(5).trim();
        if (!raw || raw === "[DONE]") continue;
        const ev = JSON.parse(raw) as { type?: string; delta?: string };
        if (ev.type === "response.output_text.delta" && ev.delta) text += ev.delta;
        if (ev.type === "response.refusal.delta" || ev.type === "response.failed" || ev.type === "error") throw new Error("AI declined or failed");
      }
    }
  }
  const plan = JSON.parse(text) as Plan;
  if (plan.options?.length !== 3 || plan.waypoints?.length < 2 || !plan.documents?.length) throw new Error("Incomplete AI plan");
  return plan;
}

export const planShipment = createServerFn({ method: "POST" })
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }): Promise<{ plan: Plan; source: PlanSource; note: string | null }> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    try {
      if (!apiKey) throw new Error("AI not configured");
      return { plan: await callGateway(apiKey, data), source: "ai", note: null };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "AI unavailable";
      return { plan: simulatePlan(data), source: "simulated", note: `${msg} — switched to local simulation` };
    }
  });
