import { afterEach, describe, expect, it } from "vitest";
import { callGeminiChain, GeminiError } from "./dhow-gemini";

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

const ok = (text = '{"action":"finish"}') => new Response(JSON.stringify({ candidates: [{ finishReason: "STOP", content: { parts: [{ text }] } }], usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 } }));
const req = { instructions: "x", input: "y", schema: {} };
const fast = { backoffMs: 1 };
const script = (responses: Array<Response | Error>) => {
  const urls: string[] = [];
  let i = 0;
  globalThis.fetch = (async (url: string) => {
    urls.push(url);
    const r = responses[Math.min(i++, responses.length - 1)]!;
    if (r instanceof Error) throw r;
    return r.clone();
  }) as never;
  return urls;
};

describe("Gemini chain", () => {
  it("retries a 503 once on the same model", async () => {
    const urls = script([new Response("x", { status: 503 }), ok()]);
    const meter = { calls: 0, inputTokens: 0, outputTokens: 0 } as { calls: number; inputTokens: number; outputTokens: number; model?: string };
    expect(await callGeminiChain("k", ["google/a", "google/b"], req, meter, fast)).toEqual({ action: "finish" });
    expect(urls.length).toBe(2);
    expect(urls.every((u) => u.includes("/a:"))).toBe(true);
    expect(meter.model).toBe("google/a");
    expect(meter.calls).toBe(2);
  });
  it("moves to the next model after two failures or on a quota error", async () => {
    const urls = script([new Response("x", { status: 503 }), new Response("x", { status: 503 }), ok()]);
    const meter = { calls: 0, inputTokens: 0, outputTokens: 0 } as { calls: number; inputTokens: number; outputTokens: number; model?: string };
    await callGeminiChain("k", ["google/a", "google/b"], req, meter, fast);
    expect(urls.map((u) => (u.includes("/a:") ? "a" : "b"))).toEqual(["a", "a", "b"]);
    expect(meter.model).toBe("google/b");
    const urls2 = script([new Response("x", { status: 429 }), ok()]);
    await callGeminiChain("k", ["google/a", "google/b"], req, undefined, fast);
    expect(urls2.map((u) => (u.includes("/a:") ? "a" : "b"))).toEqual(["a", "b"]);
  });
  it("treats a timeout as temporary", async () => {
    script([new Error("The operation was aborted due to timeout"), ok()]);
    expect(await callGeminiChain("k", ["google/a"], req, undefined, fast)).toEqual({ action: "finish" });
  });
  it("treats a timeout while reading the answer as temporary and wraps it", async () => {
    const broken = { ok: true, status: 200, json: async () => { throw new Error("The operation was aborted due to timeout"); }, clone() { return broken; } } as unknown as Response;
    script([broken, broken]);
    const err = await callGeminiChain("k", ["google/a"], req, undefined, fast).catch((e) => e as Error);
    expect(err).toBeInstanceOf(GeminiError);
    expect(err.message).toContain("did not answer in time");
  });
  it("stops at once on a configuration error", async () => {
    const urls = script([new Response("x", { status: 403 }), ok()]);
    await expect(callGeminiChain("k", ["google/a", "google/b"], req, undefined, fast)).rejects.toThrow("rejected the configuration");
    expect(urls.length).toBe(1);
  });
  it("gives a clear error when every model fails, without upstream data", async () => {
    script([new Response("secret upstream detail", { status: 503 })]);
    const err = await callGeminiChain("k", ["google/a", "google/b"], req, undefined, fast).catch((e) => e as Error);
    expect(err).toBeInstanceOf(GeminiError);
    expect(err.message).toContain("unavailable (HTTP 503)");
    expect(err.message).not.toContain("secret");
  });
});
