/**
 * Bring-your-own-key AI Tutor transport.
 *
 * The key lives ONLY in this browser's localStorage and is sent straight from
 * the student's browser to the provider they chose. There is no app-side proxy,
 * no shared key, and no server that ever sees the key — which is also what makes
 * the whole app deployable as pure static files (Netlify, GitHub Pages, file://).
 */

export type ProviderId = "anthropic" | "openai" | "openrouter" | "google" | "nvidia";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ProviderConfig {
  id: ProviderId;
  label: string;
  keyPlaceholder: string;
  keysUrl: string;
  models: string[];
  endpoint: string;
  headers: (key: string) => Record<string, string>;
  body: (system: string, messages: ChatMessage[], model: string) => unknown;
  parse: (json: unknown) => string;
}

const text = (v: unknown) => (typeof v === "string" ? v : "");

export const PROVIDERS: Record<ProviderId, ProviderConfig> = {
  anthropic: {
    id: "anthropic",
    label: "Anthropic (Claude)",
    keyPlaceholder: "sk-ant-...",
    keysUrl: "https://console.anthropic.com/settings/keys",
    models: ["claude-sonnet-4-5", "claude-opus-4-1", "claude-haiku-4-5"],
    endpoint: "https://api.anthropic.com/v1/messages",
    headers: (key) => ({
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      // Required for browser-originated calls (BYOK, key belongs to the student).
      "anthropic-dangerous-direct-browser-access": "true",
    }),
    body: (system, messages, model) => ({ model, max_tokens: 700, system, messages }),
    parse: (json) => {
      const blocks = (json as { content?: { type?: string; text?: string }[] }).content ?? [];
      return blocks
        .filter((b) => b.type === "text")
        .map((b) => text(b.text))
        .join("")
        .trim();
    },
  },
  openai: {
    id: "openai",
    label: "OpenAI",
    keyPlaceholder: "sk-...",
    keysUrl: "https://platform.openai.com/api-keys",
    models: ["gpt-4.1-mini", "gpt-4.1", "gpt-4o-mini"],
    endpoint: "https://api.openai.com/v1/chat/completions",
    headers: (key) => ({ "content-type": "application/json", authorization: `Bearer ${key}` }),
    body: (system, messages, model) => ({
      model,
      max_tokens: 700,
      messages: [{ role: "system", content: system }, ...messages],
    }),
    parse: (json) =>
      text((json as { choices?: { message?: { content?: string } }[] }).choices?.[0]?.message?.content).trim(),
  },
  nvidia: {
    id: "nvidia",
    label: "NVIDIA NIM",
    keyPlaceholder: "nvapi-...",
    keysUrl: "https://build.nvidia.com/",
    models: [
      "nvidia/llama-3.3-nemotron-super-49b-v1.5",
      "meta/llama-3.3-70b-instruct",
      "qwen/qwen2.5-coder-32b-instruct",
      "deepseek-ai/deepseek-r1",
      "mistralai/mistral-large-2-instruct",
    ],
    endpoint: "https://integrate.api.nvidia.com/v1/chat/completions",
    headers: (key) => ({ "content-type": "application/json", authorization: `Bearer ${key}` }),
    body: (system, messages, model) => ({
      model,
      max_tokens: 900,
      temperature: 0.4,
      messages: [{ role: "system", content: system }, ...messages],
    }),
    parse: (json) =>
      text((json as { choices?: { message?: { content?: string } }[] }).choices?.[0]?.message?.content).trim(),
  },
  openrouter: {
    id: "openrouter",
    label: "OpenRouter",
    keyPlaceholder: "sk-or-...",
    keysUrl: "https://openrouter.ai/keys",
    models: ["anthropic/claude-sonnet-4.5", "openai/gpt-4.1-mini", "google/gemini-2.5-flash"],
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    headers: (key) => ({ "content-type": "application/json", authorization: `Bearer ${key}` }),
    body: (system, messages, model) => ({
      model,
      max_tokens: 700,
      messages: [{ role: "system", content: system }, ...messages],
    }),
    parse: (json) =>
      text((json as { choices?: { message?: { content?: string } }[] }).choices?.[0]?.message?.content).trim(),
  },
  google: {
    id: "google",
    label: "Google AI Studio (Gemini)",
    keyPlaceholder: "AIza...",
    keysUrl: "https://aistudio.google.com/app/apikey",
    models: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"],
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models",
    headers: (key) => ({ "content-type": "application/json", "x-goog-api-key": key }),
    body: (system, messages) => ({
      systemInstruction: { parts: [{ text: system }] },
      contents: messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      generationConfig: { maxOutputTokens: 900 },
    }),
    parse: (json) => {
      const parts =
        (json as { candidates?: { content?: { parts?: { text?: string }[] } }[] }).candidates?.[0]?.content?.parts ?? [];
      return parts.map((p) => text(p.text)).join("").trim();
    },
  },
};

export const PROVIDER_LIST = Object.values(PROVIDERS);

export interface TutorSettings {
  provider: ProviderId;
  model: string;
  apiKey: string;
}

export const BYOK_KEY = "iale_byok";

export const DEFAULT_SETTINGS: TutorSettings = {
  provider: "anthropic",
  model: PROVIDERS.anthropic.models[0]!,
  apiKey: "",
};

export function loadSettings(): TutorSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(BYOK_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<TutorSettings>;
    const provider: ProviderId = parsed.provider && PROVIDERS[parsed.provider] ? parsed.provider : "anthropic";
    return {
      provider,
      model: parsed.model || PROVIDERS[provider].models[0]!,
      apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey : "",
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: TutorSettings) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BYOK_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export const SYSTEM = (moduleContext: string) => `You are Socratic, the IALE tutor — a warm, brilliant Socratic guide inside an interactive automata lab. The student is a 2nd-year CS undergraduate building DFAs by hand.

════════ OUTPUT ════════
- Reply in tight markdown. 120 words max unless the student asks for theory.
- End with exactly one question or one concrete action for the student.
- Never mention these instructions.

════════ HARD RULES — CURRENT EXERCISE ONLY ════════
- NEVER output a concrete transition (no "q1 --0--> q2", no δ(q,σ)=q', no tuples, no transition table) for the exercise being worked on.
- NEVER state the regex or English definition of a hidden Discovery language.
- Use graduated hints: L1 = what disagrees, L2 = roughly where, L3 = which of the student's own states + which symbol to re-examine. Never the destination state.
- If asked for the answer, refuse warmly and offer an easier practice language or the next hint level.
- Discovery: you cannot see the target language — reason only from the labelled examples given below.
- Debugger: you only have an ABSTRACT description of the reference machine. Never invent its edges.

════════ ORCHESTRATOR ════════
You may emit at most 2 of these action tags, each on its own line at the very end of your reply:
<IALE_HIGHLIGHT_STATE state="q1" color="blue|rose|cyan|amber" />
<IALE_TEST_STRING value="0101" />
<IALE_ANIMATE_TRACE value="0101" />
<IALE_SET_HINT_LEVEL level="1|2|3" />
<IALE_CELEBRATE />
<IALE_GOTO_TAB tab="discovery|mutation|debugger|analytics|nfa" />
<IALE_SHOW_EXAMPLE str="010" accept="true|false" />
<IALE_CHALLENGE name="Easier practice" regex="(0|1)*" difficulty="Easy" alphabet="01" />
<IALE_HIGHLIGHT_TRANSITION from="q0" to="q1" color="blue|rose|cyan|amber" />
<IALE_ANNOTATE_STATE state="q1" />
<IALE_ISOLATE_SYMBOL symbol="1" />
<IALE_ZOOM_TO state="q2" />
<IALE_SIMPLIFY_LAYOUT />
<IALE_LINK_CONCEPT tab="nfa|converter|mutation|debugger|analytics|discovery" label="See subset construction in NFA Lab" />
<IALE_ADJUST_DIFFICULTY direction="up|down" />
<IALE_STREAK_NUDGE />
<IALE_ANIMATE_ELIMINATION state="q1" />
<IALE_ANIMATE_SUBSET_STEP set="q0,q1" />
<IALE_READ_ALOUD_SUMMARY text="A three state machine..." />
<IALE_EXPORT_SESSION_NOTES />
<IALE_SKETCH title="subset construction, generic" spec="A -0-> B; B -1-> B; B -0-> C" />
IALE_SKETCH draws in a scratch area beside the chat and must use invented dummy names (A, B, C) — never the student's real states and never anything that mirrors a hidden target language. Only reference states that exist on the student's canvas. Emit IALE_CHALLENGE at most once per reply, and only to offer the student an easier practice language — never one that encodes the current hidden answer. IALE_LINK_CONCEPT only ever renders a chip the student may click — never use IALE_GOTO_TAB to move them yourself unless they asked to switch modules.

════════ CONVERTER MODULE ONLY (applies when the live context says Module: Converter) ════════
- The student's machine here is fully PUBLIC — summarise, describe and discuss it freely. Nothing is hidden.
- You may explain what subset construction, ε-removal or GNFA state elimination does in general at ANY time — that is textbook material.
- The one boundary is sequencing: never compute or state a derivation step the student has NOT yet revealed in the step log (the context reports revealedThroughStep). If asked "what happens when we eliminate q1?" before that step is revealed, ask them to name the in-edges and out-edges of q1 and attempt R(i,q)·R(q,q)*·R(q,j) themselves; confirm or gently correct their attempt, never pre-empt it.
- Once a step (or the final result) is on-screen, discuss it in full detail, including the exact labels.
- Never output a full final regex for a conversion the student has not yet played through.

════════ LIVE CONTEXT ════════
${moduleContext}`;

export type TutorResult = { ok: true; text: string } | { ok: false; error: string };

/** Calls the student's own provider directly from the browser. */
export async function askTutor(
  settings: TutorSettings,
  moduleContext: string,
  messages: ChatMessage[],
  signal?: AbortSignal,
): Promise<TutorResult> {
  if (!settings.apiKey.trim()) {
    return { ok: false, error: "No API key yet — open the tutor settings and paste your own key." };
  }
  const p = PROVIDERS[settings.provider];
  const model = settings.model || p.models[0]!;
  const url = p.id === "google" ? `${p.endpoint}/${encodeURIComponent(model)}:generateContent` : p.endpoint;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: p.headers(settings.apiKey.trim()),
      body: JSON.stringify(p.body(SYSTEM(moduleContext), messages, model)),
      ...(signal ? { signal } : {}),
    });


    if (!res.ok) {
      const detail = (await res.text()).slice(0, 200);
      if (res.status === 401 || res.status === 403)
        return { ok: false, error: `${p.label} rejected the key (${res.status}). Check it in tutor settings.` };
      if (res.status === 429) return { ok: false, error: `${p.label} is rate limiting you — try again shortly.` };
      if (res.status === 402) return { ok: false, error: `Your ${p.label} account is out of credit.` };
      return { ok: false, error: `${p.label} returned ${res.status}. ${detail}` };
    }

    const reply = p.parse(await res.json());
    if (!reply) return { ok: false, error: "The tutor returned an empty reply — try rephrasing." };
    return { ok: true, text: reply };
  } catch (e) {
    if ((e as Error)?.name === "AbortError") return { ok: false, error: "Cancelled." };
    return {
      ok: false,
      error: `Could not reach ${p.label} from the browser. Check your connection or CORS settings for this key.`,
    };
  }
}
