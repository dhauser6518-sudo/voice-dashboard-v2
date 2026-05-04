// Per-million-token pricing (USD)
export const MODEL_PRICING: Record<string, { input: number; cached_input: number; output: number; cache_write: number }> = {
  'claude-sonnet-4-6': { input: 3.0, cached_input: 0.30, output: 15.0, cache_write: 3.75 },
  'claude-haiku-4-5-20251001': { input: 1.0, cached_input: 0.10, output: 5.0, cache_write: 1.25 },
  'gpt-4o-mini': { input: 0.15, cached_input: 0.075, output: 0.60, cache_write: 0.15 },
  'gpt-4o': { input: 2.50, cached_input: 1.25, output: 10.0, cache_write: 2.50 },
};

const DEFAULT_MODEL = 'claude-sonnet-4-6';
// ElevenLabs Flash v2.5 — Scale tier pricing per 1k characters
// Adjust this if on a different plan (Pro=$0.30, Scale=$0.24, Business=custom)
const ELEVENLABS_PER_1K_CHARS = 0.18;
const TELNYX_PER_MINUTE = 0.0085;

export type CallCostBreakdown = {
  llm_actual: number;
  elevenlabs_estimated: number;
  telnyx_estimated: number;
  total: number;
  model_used: string;
};

type CallRow = {
  model_used: string | null;
  total_input_tokens: number | null;
  total_output_tokens: number | null;
  cache_hits: number | null;
  cache_creates: number | null;
  duration_seconds: number | null;
  ai_responses: unknown;
};

export function computeCallCost(call: CallRow): CallCostBreakdown {
  const model = call.model_used || DEFAULT_MODEL;
  const pricing = MODEL_PRICING[model] || MODEL_PRICING[DEFAULT_MODEL];

  const inputTokens = call.total_input_tokens || 0;
  const outputTokens = call.total_output_tokens || 0;
  const cacheHits = call.cache_hits || 0;
  const cacheCreates = call.cache_creates || 0;
  const ASSUMED_CACHE_PROMPT_SIZE = 3200;
  const cachedTokens = cacheHits * ASSUMED_CACHE_PROMPT_SIZE;
  const cacheWriteTokens = cacheCreates * ASSUMED_CACHE_PROMPT_SIZE;

  const nonCachedInputTokens = Math.max(0, inputTokens - cachedTokens - cacheWriteTokens);
  const llmActual =
    (nonCachedInputTokens / 1_000_000) * pricing.input +
    (cachedTokens / 1_000_000) * pricing.cached_input +
    (outputTokens / 1_000_000) * pricing.output +
    (cacheWriteTokens / 1_000_000) * pricing.cache_write;

  const aiResponses = Array.isArray(call.ai_responses) ? call.ai_responses : [];
  const totalChars = aiResponses.reduce((sum: number, r: unknown) => {
    const text = (r as { text?: string })?.text || '';
    return sum + text.length;
  }, 0);
  const elevenlabsEstimated = (totalChars / 1000) * ELEVENLABS_PER_1K_CHARS;

  const minutes = (call.duration_seconds || 0) / 60;
  const telnyxEstimated = minutes * TELNYX_PER_MINUTE;

  return {
    llm_actual: llmActual,
    elevenlabs_estimated: elevenlabsEstimated,
    telnyx_estimated: telnyxEstimated,
    total: llmActual + elevenlabsEstimated + telnyxEstimated,
    model_used: model,
  };
}

const NON_PICKUP_OUTCOMES = new Set(['voicemail', 'no_answer', 'busy']);

export function isHumanPickup(call: { outcome: string | null; duration_seconds: number | null }): boolean {
  if (NON_PICKUP_OUTCOMES.has(call.outcome || '')) return false;
  if (!call.duration_seconds || call.duration_seconds < 10) return false;
  return true;
}

export function formatUSD(amount: number, decimals = 2): string {
  if (amount < 0.01 && amount > 0) return '<$0.01';
  return `$${amount.toFixed(decimals)}`;
}
