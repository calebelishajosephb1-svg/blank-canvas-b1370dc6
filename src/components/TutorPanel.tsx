import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Bot, Download, ExternalLink, Eye, EyeOff, KeyRound, Send, Settings2, Volume2, X } from "lucide-react";
import {
  askTutor,
  loadSettings,
  saveSettings,
  PROVIDERS,
  PROVIDER_LIST,
  type ChatMessage,
  type ProviderId,
  type TutorSettings,
} from "@/lib/tutor/byok";
import { checkReply } from "@/lib/tutor/guard";
import { dispatchTutorActions, parseTutorActions } from "@/lib/tutor/actions";

const GREETING =
  "I'm Socratic, your lab tutor. I can see your canvas, your examples and your last mistake — but I'll never hand you the fix. Ask me anything, or say **\"hint\"**.";

export function TutorPanel({
  open,
  onClose,
  moduleId,
  getContext,
}: {
  open: boolean;
  onClose: () => void;
  moduleId: string;
  getContext: () => string;
}) {
  const [settings, setSettings] = useState<TutorSettings>(() => loadSettings());
  const [showSettings, setShowSettings] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "assistant", content: GREETING }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chips, setChips] = useState<{ tab: string; label: string }[]>([]);
  const scroller = useRef<HTMLDivElement | null>(null);
  const composer = useRef<HTMLInputElement | null>(null);
  /** Converter reveal tracking — feeds the sequencing guard. */
  const reveal = useRef<Record<string, boolean>>({});

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  useEffect(() => {
    const onReveal = (e: Event) => {
      const d = (e as CustomEvent).detail as { moduleId: string; finalVisible: boolean };
      if (d?.moduleId) reveal.current[d.moduleId] = d.finalVisible;
    };
    window.addEventListener("iale-reveal-state", onReveal);
    return () => window.removeEventListener("iale-reveal-state", onReveal);
  }, []);

  useEffect(() => {
    if (open) composer.current?.focus();
  }, [open, moduleId]);

  useEffect(() => {
    if (!settings.apiKey && open) setShowSettings(true);
  }, [settings.apiKey, open]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  function patch(next: Partial<TutorSettings>) {
    const merged = { ...settings, ...next };
    if (next.provider && next.provider !== settings.provider) merged.model = PROVIDERS[next.provider].models[0] ?? merged.model;
    setSettings(merged);
    saveSettings(merged);
  }

  async function send() {
    const question = input.trim();
    if (!question || busy) return;
    const history = [...messages.filter((m) => m.content !== GREETING), { role: "user" as const, content: question }];
    setMessages((m) => [...m, { role: "user", content: question }]);
    setInput("");
    setBusy(true);
    setError(null);

    const res = await askTutor(settings, getContext().slice(0, 6000), history.slice(-24));
    setBusy(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }
    const { cleanText, actions } = parseTutorActions(res.text);
    const verdict = checkReply(cleanText, { moduleId, finalVisible: reveal.current[moduleId] });
    const finalText = verdict.allowed ? cleanText : verdict.fallback;
    setMessages((m) => [...m, { role: "assistant", content: finalText }]);
    composer.current?.focus();
    if (!verdict.allowed) return;

    dispatchTutorActions(actions);
    for (const a of actions) {
      if (a.type === "linkConcept") setChips((c) => [...c.filter((x) => x.tab !== a.tab), { tab: a.tab, label: a.label }].slice(-3));
      if (a.type === "readAloud") speak(a.text);
      if (a.type === "exportNotes") exportNotes([...messages, { role: "assistant", content: finalText }]);
    }
  }

  function exportNotes(thread: ChatMessage[]) {
    const body = thread
      .map((m) => `${m.role === "user" ? "You" : "Socratic"}: ${stripThink(m.content)}`)
      .join("\n\n");
    const url = URL.createObjectURL(new Blob([`IALE session notes — ${moduleId}\n\n${body}\n`], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `iale-session-${moduleId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!open) return null;
  const provider = PROVIDERS[settings.provider];

  return (
    <aside className="tutor-panel">
      <header className="tutor-head">
        <Bot size={16} style={{ color: "var(--signal-blue)" }} />
        <span className="font-semibold text-sm">Socratic</span>
        <span className="badge" data-tone={settings.apiKey ? "accept" : "amber"}>
          {settings.apiKey ? provider.label.split(" ")[0] : "no key"}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button className="tool-btn" title="Tutor settings" onClick={() => setShowSettings((s) => !s)}>
            <Settings2 size={15} />
          </button>
          <button className="tool-btn" title="Close tutor" onClick={onClose}>
            <X size={15} />
          </button>
        </div>
      </header>

      {showSettings && (
        <div className="tutor-settings">
          <p className="section-label">Bring your own key</p>
          <p className="text-[11.5px] leading-relaxed" style={{ color: "var(--ink-muted)" }}>
            Your key is stored only in this browser and is sent directly to the provider. Nothing is proxied through
            this app, and no one else pays for your usage.
          </p>
          <label className="section-label">Provider</label>
          <select
            className="field-input"
            value={settings.provider}
            onChange={(e) => patch({ provider: e.target.value as ProviderId })}
          >
            {PROVIDER_LIST.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <label className="section-label">Model</label>
          <select className="field-input" value={settings.model} onChange={(e) => patch({ model: e.target.value })}>
            {provider.models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <label className="section-label">API key</label>
          <div className="flex gap-1">
            <input
              className="field-input"
              type={showKey ? "text" : "password"}
              autoComplete="off"
              spellCheck={false}
              placeholder={provider.keyPlaceholder}
              value={settings.apiKey}
              onChange={(e) => patch({ apiKey: e.target.value })}
            />
            <button className="tool-btn" title={showKey ? "Hide key" : "Show key"} onClick={() => setShowKey((s) => !s)}>
              {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <a
            className="inline-flex items-center gap-1 text-[11.5px]"
            style={{ color: "var(--signal-blue)" }}
            href={provider.keysUrl}
            target="_blank"
            rel="noreferrer"
          >
            <KeyRound size={12} /> Get a {provider.label} key <ExternalLink size={11} />
          </a>
        </div>
      )}

      <div className="tutor-thread" ref={scroller}>
        {messages.map((m, i) => (
          <div key={i} className="tutor-msg" data-role={m.role}>
            {m.content}
          </div>
        ))}
        {busy && (
          <div className="tutor-msg" data-role="assistant" style={{ color: "var(--ink-muted)" }}>
            Thinking…
          </div>
        )}
        {error && (
          <div className="tutor-msg" data-role="error">
            {error}
          </div>
        )}
      </div>

      <div className="tutor-compose">
        <input
          className="field-input"
          placeholder={settings.apiKey ? "Ask about your machine…" : "Add your API key to start"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <button className="btn-primary" onClick={() => void send()} disabled={busy || !input.trim()} title="Send">
          <Send size={14} />
        </button>
      </div>
    </aside>
  );
}
