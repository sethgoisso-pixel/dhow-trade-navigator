import type { Dispatch } from "./dhow-store";
import { sha256Hex } from "./agent/fingerprint";

/**
 * Draft payload for a future TMS integration. It is NOT an IATA ONE Record or UN/CEFACT message and
 * it makes no compliance claim: it only describes an approved draft and carries a SHA-256 fingerprint of its content.
 */
export interface TMSPayload {
  format: "dhow-draft-v1";
  event: "DISPATCH_DRAFT_APPROVED";
  timestamp: string;
  /** SHA-256 (Web Crypto) of the canonical JSON of `dispatch`. Detects changes; it is not a signature. */
  contentSha256: string;
  dispatch: {
    id: string;
    title: string;
    corridor?: string | undefined;
    dossierRef?: string | undefined;
    saving: string;
  };
}

export async function buildTMSPayload(d: Dispatch): Promise<TMSPayload> {
  const dispatch = { id: d.id, title: d.title, corridor: d.corridor, dossierRef: d.dossierRef, saving: d.saving };
  return {
    format: "dhow-draft-v1",
    event: "DISPATCH_DRAFT_APPROVED",
    timestamp: new Date().toISOString(),
    contentSha256: await sha256Hex(JSON.stringify(dispatch)),
    dispatch,
  };
}

/** Sends the payload by HTTP POST to a URL chosen by the user. Nothing calls this automatically. */
export async function sendTMSWebhook(url: string, payload: TMSPayload): Promise<{ ok: boolean; status: number; message: string }> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Dhow-Event": payload.event, "X-Dhow-Content-Sha256": payload.contentSha256 },
      body: JSON.stringify(payload),
    });
    return { ok: res.ok, status: res.status, message: res.ok ? `HTTP ${res.status} · delivered` : `HTTP ${res.status} · rejected` };
  } catch (err) {
    return { ok: false, status: 0, message: err instanceof Error ? `Network error: ${err.message}` : "Unable to reach endpoint" };
  }
}
