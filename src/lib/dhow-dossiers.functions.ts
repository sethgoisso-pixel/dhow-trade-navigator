import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Plan } from "./dhow-plan";

const Save = z.object({
  origin: z.string().min(1).max(120),
  destination: z.string().min(1).max(120),
  cargo: z.record(z.string(), z.unknown()),
  plan: z.record(z.string(), z.unknown()),
  source: z.string().max(20),
});

function makeRef() {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const b = crypto.getRandomValues(new Uint8Array(10));
  const s = Array.from(b, (x) => a[x % a.length]).join("");
  return `DHOW-${new Date().getUTCFullYear()}-${s}`;
}

/** Stores a computed shipment plan; returns its unguessable dossier reference. */
export const saveDossier = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Save.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const reference = makeRef();
    const { error } = await supabaseAdmin.from("dossiers").insert({
      reference, origin: data.origin, destination: data.destination,
      cargo: data.cargo as never, plan: data.plan as never, source: data.source,
    });
    if (error) { console.error(error); return { reference: null }; }
    return { reference };
  });

export const getDossier = createServerFn({ method: "GET" })
  .inputValidator((d: { reference: string }) => z.object({ reference: z.string().regex(/^DHOW-\d{4}-[A-Z0-9]{10}$/) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin.from("dossiers")
      .select("reference, origin, destination, plan, source, created_at")
      .eq("reference", data.reference).maybeSingle();
    if (!row) return null;
    return { ...row, plan: row.plan as unknown as Plan };
  });

export interface DossierSummary {
  reference: string;
  origin: string;
  destination: string;
  source: string;
  createdAt: string;
  corridor: string;
  mode: string;
}

/** Fetches recent shipment dossiers stored in Lovable Cloud */
export const listRecentDossiers = createServerFn({ method: "GET" }).handler(
  async (): Promise<DossierSummary[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("dossiers")
      .select("reference, origin, destination, source, created_at, plan")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Error fetching dossiers:", error);
      return [];
    }

    return (data || []).map((row) => {
      const plan = row.plan as Record<string, any> | null;
      const options = plan?.options as Array<{ mode?: string }> | undefined;
      return {
        reference: row.reference,
        origin: row.origin,
        destination: row.destination,
        source: row.source,
        createdAt: row.created_at,
        corridor: (plan?.corridor as string) || `${row.origin} → ${row.destination}`,
        mode: options?.[0]?.mode || "Multimodal Sea-Air",
      };
    });
  }
);
