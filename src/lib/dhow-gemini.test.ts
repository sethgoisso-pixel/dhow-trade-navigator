import { afterEach, describe, expect, it, vi } from "vitest";
import { callGeminiJSON } from "./dhow-gemini";

afterEach(() => vi.unstubAllGlobals());

describe("direct Gemini structured adapter", () => {
  it("sends the action schema to Google and records provider usage", async () => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      candidates: [{ finishReason: "STOP", content: { parts: [{ text: '{"action":"finish"}' }] } }],
      usageMetadata: { promptTokenCount: 123, candidatesTokenCount: 45, thoughtsTokenCount: 2 },
    })));
    vi.stubGlobal("fetch", request);
    const meter = { calls: 0, inputTokens: 0, outputTokens: 0 };
    const schema = { type: "object", properties: { action: { type: "string" } }, required: ["action"] };
    expect(await callGeminiJSON("test-only", "google/gemini-2.5-flash", { instructions: "Choose", input: "Cargo", schema }, meter)).toEqual({ action: "finish" });
    expect(meter).toMatchObject({ calls: 1, inputTokens: 123, outputTokens: 47 });
    const call = request.mock.calls[0];
    if (!call) throw new Error("Expected a Google request");
    const [url, init] = call;
    expect(url).toBe("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent");
    expect(JSON.parse(init.body).generationConfig.responseJsonSchema).toEqual(schema);
  });

  it("reports Google quota without echoing upstream response data", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("private upstream detail", { status: 429 })));
    await expect(callGeminiJSON("test-only", "google/gemini-3.1-flash-lite", { instructions: "Read", input: "Cargo", schema: {} })).rejects.toThrow("Google Gemini quota reached");
  });

  it("rejects truncated structured output rather than using an incomplete action", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ candidates: [{ finishReason: "MAX_TOKENS", content: { parts: [{ text: '{}' }] } }] }))));
    await expect(callGeminiJSON("test-only", "google/gemini-2.5-flash", { instructions: "Read", input: "Cargo", schema: {} })).rejects.toThrow("did not complete");
  });
});