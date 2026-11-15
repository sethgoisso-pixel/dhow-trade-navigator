/** Direct Google calls; the key is supplied only by a server handler. */
export type GeminiMeter = { calls: number; inputTokens: number; outputTokens: number; lastGeminiCallAt?: number };

export async function callGeminiJSON(
  apiKey: string,
  model: string,
  req: { instructions: string; input: string; schema: unknown },
  meter?: GeminiMeter,
): Promise<unknown> {
  const modelId = model.replace(/^google\//, "");
  // Space the multi-turn Flash loop instead of exhausting the free-tier
  // minute quota within a single shipment. No failed inference is replayed.
  if (meter && modelId === "gemini-2.5-flash") {
    const wait = Math.max(0, 15_000 - (Date.now() - (meter.lastGeminiCallAt ?? 0)));
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    meter.lastGeminiCallAt = Date.now();
  }
  if (meter) meter.calls++;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelId)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    signal: AbortSignal.timeout(45_000),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: req.instructions }] },
      contents: [{ role: "user", parts: [{ text: req.input }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseJsonSchema: req.schema,
        temperature: 0.1,
        ...(modelId === "gemini-2.5-flash" ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
      },
    }),
  });
  // Do not log upstream bodies: they may echo request content or credentials.
  if (!res.ok) {
    throw new Error(res.status === 429
      ? "Google Gemini quota reached. The manual form and built-in tools remain available. Try again later."
      : res.status === 400 || res.status === 401 || res.status === 403
        ? "Google Gemini rejected the configuration or access. The built-in tools remain available."
        : `Google Gemini unavailable (HTTP ${res.status}). The built-in tools remain available.`);
  }
  const body = await res.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> }; finishReason?: string }>;
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number };
  };
  if (meter) {
    meter.inputTokens += body.usageMetadata?.promptTokenCount ?? 0;
    meter.outputTokens += (body.usageMetadata?.candidatesTokenCount ?? 0) + (body.usageMetadata?.thoughtsTokenCount ?? 0);
  }
  const candidate = body.candidates?.[0];
  if (!candidate || candidate.finishReason !== "STOP") throw new Error("Google Gemini did not complete a structured response.");
  const text = candidate.content?.parts?.filter((part) => !part.thought).map((part) => part.text ?? "").join("");
  if (!text) throw new Error("Google Gemini returned no structured response.");
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("Google Gemini returned invalid JSON.");
  }
}