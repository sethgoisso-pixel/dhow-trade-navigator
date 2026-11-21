/** Direct Google calls; the key is supplied only by a server handler. */
export type GeminiMeter = { calls: number; inputTokens: number; outputTokens: number; lastGeminiCallAt?: number; /** Model that finally answered, e.g. "google/gemini-3.1-flash-lite". */ model?: string; /** Time (ms since epoch) after which no further attempt is made for this analysis. Set by the first chain call. */ deadlineAt?: number };

/** An error from Google. `status` is the HTTP status, or 0 for a timeout or network failure. The message never contains upstream data. */
export class GeminiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "GeminiError";
  }
}

export async function callGeminiJSON(
  apiKey: string,
  model: string,
  req: { instructions: string; input: string; schema: unknown },
  meter?: GeminiMeter,
  timeoutMs = 45_000,
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
  let res: Response;
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelId)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    signal: AbortSignal.timeout(timeoutMs),
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
  } catch {
    throw new GeminiError("Google Gemini did not answer in time. The built-in tools remain available.", 0);
  }
  // Do not log upstream bodies: they may echo request content or credentials.
  if (!res.ok) {
    throw new GeminiError(res.status === 429
      ? "Google Gemini quota reached. The manual form and built-in tools remain available. Try again later."
      : res.status === 400 || res.status === 401 || res.status === 403
        ? "Google Gemini rejected the configuration or access. The built-in tools remain available."
        : `Google Gemini unavailable (HTTP ${res.status}). The built-in tools remain available.`, res.status);
  }
  type GeminiBody = {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> }; finishReason?: string }>;
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number };
  };
  let body: GeminiBody;
  try {
    body = await res.json() as GeminiBody;
  } catch {
    // The timeout can also fire while the answer is still being read.
    throw new GeminiError("Google Gemini did not answer in time. The built-in tools remain available.", 0);
  }
  if (meter) {
    meter.inputTokens += body.usageMetadata?.promptTokenCount ?? 0;
    meter.outputTokens += (body.usageMetadata?.candidatesTokenCount ?? 0) + (body.usageMetadata?.thoughtsTokenCount ?? 0);
  }
  const candidate = body.candidates?.[0];
  if (!candidate || candidate.finishReason !== "STOP") throw new GeminiError("Google Gemini did not complete a structured response.", 200);
  const text = candidate.content?.parts?.filter((part) => !part.thought).map((part) => part.text ?? "").join("");
  if (!text) throw new Error("Google Gemini returned no structured response.");
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("Google Gemini returned invalid JSON.");
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Tries the models in order. A temporary failure (HTTP 5xx, timeout, incomplete answer) is retried up to 3 times in total on the same model
 * (1.5 s then 3 s of waiting), and the whole analysis stops trying after a time budget (default 60 s) so that the built-in tools take over quickly;
 * a quota (429) or unknown model (404) moves on to the next model; a configuration error (400/401/403) stops at once.
 * Every attempt is counted in the meter, and the meter records which model finally answered.
 */
export async function callGeminiChain(
  apiKey: string,
  models: string[],
  req: { instructions: string; input: string; schema: unknown },
  meter?: GeminiMeter,
  opts: { attempts?: number; timeoutMs?: number; backoffMs?: number; budgetMs?: number } = {},
): Promise<unknown> {
  const attempts = opts.attempts ?? 3;
  const deadline = meter ? (meter.deadlineAt ??= Date.now() + (opts.budgetMs ?? 60_000)) : Date.now() + (opts.budgetMs ?? 60_000);
  let last: Error = new GeminiError("Google Gemini unavailable. The built-in tools remain available.", 0);
  for (const model of models) {
    for (let a = 0; a < attempts; a++) {
      if (Date.now() > deadline) throw last instanceof GeminiError && last.status !== 0 ? last : new GeminiError("Google Gemini did not answer in time. The built-in tools remain available.", 0);
      try {
        const out = await callGeminiJSON(apiKey, model, req, meter, opts.timeoutMs ?? 15_000);
        if (meter) meter.model = model;
        return out;
      } catch (e) {
        last = e instanceof Error ? e : new GeminiError("Google Gemini unavailable.", 0);
        const status = e instanceof GeminiError ? e.status : 0;
        if (status === 400 || status === 401 || status === 403) throw last;
        if (status === 429 || status === 404) break;
        if (a < attempts - 1) await sleep((opts.backoffMs ?? 1_500) * (a + 1));
      }
    }
  }
  throw last;
}
