import { readFile } from "node:fs/promises";
import { join } from "node:path";

export type ChatgptLocalEnv = Record<string, string | undefined>;

let cache: ChatgptLocalEnv | undefined;

/**
 * Reads `.chatgpt/setting.local.json` → `{ "env": { "KEY": "value" } }`.
 * Cached for the lifetime of the server process. Env vars still win in callers.
 */
export async function readChatgptLocalEnv(): Promise<ChatgptLocalEnv> {
  if (process.env.NODE_ENV === "production" && cache !== undefined) {
    return cache;
  }

  const filePath = join(process.cwd(), ".chatgpt", "setting.local.json");
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as { env?: unknown };
    if (!parsed.env || typeof parsed.env !== "object" || Array.isArray(parsed.env)) {
      if (process.env.NODE_ENV === "production") cache = {};
      return {};
    }
    const out: ChatgptLocalEnv = {};
    for (const [k, v] of Object.entries(parsed.env as Record<string, unknown>)) {
      if (typeof v === "string") out[k] = v;
    }
    if (process.env.NODE_ENV === "production") cache = out;
    return out;
  } catch {
    if (process.env.NODE_ENV === "production") cache = {};
    return {};
  }
}

function firstNonEmpty(
  ...values: (string | undefined)[]
): string | undefined {
  for (const v of values) {
    const t = v?.trim();
    if (t) return t;
  }
  return undefined;
}

function sanitizeSecret(v: string | undefined): string | undefined {
  if (!v) return undefined;
  let t = v.trim();
  if (
    t.length >= 2 &&
    ((t.startsWith('"') && t.endsWith('"')) ||
      (t.startsWith("'") && t.endsWith("'")))
  ) {
    t = t.slice(1, -1).trim();
  }
  return t || undefined;
}

export function openRouterChatCompletionsUrl(base: string): string {
  const b = base.replace(/\/$/, "");
  if (b.endsWith("/v1")) return `${b}/chat/completions`;
  return `${b}/v1/chat/completions`;
}

export async function resolveChatConfig() {
  const file = await readChatgptLocalEnv();

  const token = sanitizeSecret(
    firstNonEmpty(
      process.env.OPENROUTER_API_KEY,
      process.env.ANTHROPIC_AUTH_TOKEN,
      file.OPENROUTER_API_KEY,
      file.ANTHROPIC_AUTH_TOKEN,
    ),
  );

  const baseUrl = firstNonEmpty(
    process.env.OPENROUTER_BASE_URL,
    process.env.ANTHROPIC_BASE_URL,
    file.OPENROUTER_BASE_URL,
    file.ANTHROPIC_BASE_URL,
  );

  const model = firstNonEmpty(
    process.env.OPENROUTER_MODEL,
    process.env.ANTHROPIC_DEFAULT_SONNET_MODEL,
    process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL,
    process.env.ANTHROPIC_DEFAULT_OPUS_MODEL,
    file.OPENROUTER_MODEL,
    file.ANTHROPIC_DEFAULT_SONNET_MODEL,
    file.ANTHROPIC_DEFAULT_HAIKU_MODEL,
    file.ANTHROPIC_DEFAULT_OPUS_MODEL,
  );

  const base = (baseUrl ?? "https://openrouter.ai/api").replace(/\/$/, "");

  return {
    token,
    completionsUrl: openRouterChatCompletionsUrl(base),
    model: model ?? "openai/gpt-4o-mini",
  };
}
