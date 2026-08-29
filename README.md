# Blueprint Lab

# IALE — Interactive Automata Learning Environment
## MASTER PROMPT — Massive, Complete, Production-Ready Specification

**Version:** 3.1 — Blue-Black Lab Edition (2026-08-29)
**Stack:** Vanilla HTML5 + CSS3 + ES6 Modules (No React/Vue) + Python 3 HTTP Proxy + LocalStorage
**Primary Colors:** Blueprint Blue `#2A5BDA` on Void Black `#04070F` / Panel `#0B142A` — NO other accent may dominate
**Motto:** *The tutor never tells. The canvas never lies. The student always figures it out.*

> This file is the single source of truth. If a line here conflicts with code, code is wrong. If a feature is not in here, it does not exist. Build strictly to this spec.

---

## 1. PRODUCT THESIS

**What:** A browser-based laboratory where undergraduates *build* DFAs by hand, *test* them against hidden languages, and are *taught* by a Socratic AI that can see and move everything but will never reveal the answer.

**Who:** 2nd-year CS (Theory of Computation). They know what a state is, they fail at: sink states, accepting status, transition hunting, and untangling “why did my machine reject `01`?”

**Single Job of the Page:** Make an abstract DFA feel tactile — states are pucks you drag, transitions are labeled tapes, examples are a physical punch-tape feeding into the machine — so the student stays in *doing* not *reading*.

**Aesthetic Risk (intentional):** The whole app is a **midnight blueprint lab**, not a dashboard. Dark navy/black void with electric blue grid, state nodes glow like lab instruments, tape cells light up as the machine runs. The canvas is the hero, not a number.

---

## 2. CORE PRINCIPLES (NON-NEGOTIABLE)

1. **Structural Secrecy > Prompt Politeness.** The hidden target DFA in Discovery is *unreachable* by code path, not just hidden by prompt. `ContextBuilder.buildDiscoveryContext()` signature cannot accept a `targetDfa` param — that would be a bug.
2. **Socratic Guarantee.** For the *active* exercise (Discovery hidden language OR Debugger counterexample) the AI **NEVER** outputs: concrete `δ(q,σ)=q'`, `q2 --1--> q0`, `| q | 1 | q |`, `(q,1,q)`, regex of hidden language, or a full transition table. It must ask, highlight, or test.
3. **Orchestrator, Not Chatbot.** The AI has 11 tools and **drives** the session: creates challenges, highlights states, animates traces, switches tabs — but never spams (max 2 tools/turn, 1 `IALE_CHALLENGE`/turn).
4. **Canvas is Truth.** The DFA on screen *is* the DFA. No hidden model. Validate is the single gate (`Validate.checkTransitionConflict` must be called by every edge-creation path).
5. **No Throw, No Crash.** Every engine method is pure and testable. Every UI action is undoable. Every API call returns `{ok, error}` never throws to caller. Missing transitions = crash (reject), not exception.
6. **Mobile is Not Afterthought.** Responsive down to 390px, keyboard focus visible, `prefers-reduced-motion` respected.

---

## 3. TECH STACK & CONSTRAINTS

- **No framework.** Plain HTML/CSS/JS, ES6 classes, `Map` for states/transitions, SVG for canvas. No bundler.
- **Module load order (critical):** `utils.js` → `engine/DFA.js` → `NFA.js` → `regex.js` → `algorithms.js` → `validate.js` → `challenges.js` → `storage/db.js` → `ai/ToolDefinitions.js` → `SessionMemory.js` → `AIBrain.js` → `ContextEngine.js` → `PromptSystem.js` → `SafetyLayer.js` → `ToolOrchestrator.js` → `AIProvider.js` → `ContextBuilder.js` → `AnswerGuard.js` → `ActionBridge.js` → `ui/*` → `ChatbotPanel.js` → `modules/*` → `app.js` last.
- **Python proxy:** `server.py` serves static *and* `POST /api/proxy` (HTTPS-only targets, streams SSE as `Transfer-Encoding: chunked` with `X-Accel-Buffering: no`). Must be started via `start.bat` or `python server.py [port]` and opened at `http://localhost:PORT`. Opening `index.html` as `file://` must show a red CORS banner and block AI calls with a 2-step fix message.
- **Storage:** `localStorage` only, via `storage/db.js`. No other file may call `localStorage` for app data (AI settings live in `ChatbotPanel.js` under `iale_ai_settings`).

---

## 4. DESIGN SYSTEM — BLUE-BLACK LAB

### 4.1 Tokens

```css
:root {
  /* Surfaces */
  --bg-app:          #04070F; /* void */
  --bg-canvas:       #080E1F; /* workbench */
  --bg-panel:        #0B142A;
  --bg-panel-raised: #12214A;
  --grid-line:       rgba(42,91,218,0.09);

  /* Ink */
  --ink-primary:     #EAF0FF;
  --ink-muted:       #8A9CC2;
  --ink-disabled:    #5A6A8A;
  --border-subtle:   rgba(42,91,218,0.14);
  --border-strong:   rgba(42,91,218,0.32);

  /* Signals — blue is KING */
  --signal-blue:     #2A5BDA; /* electric blueprint */
  --signal-blue-10:  rgba(42,91,218,0.10);
  --signal-blue-15:  rgba(42,91,218,0.15);
  --signal-blue-40:  rgba(42,91,218,0.40);
  --signal-cyan:     #0EA5E9; /* accept only */
  --signal-cyan-15:  rgba(14,165,233,0.15);
  --signal-rose:     #F43F5E; /* reject only */
  --signal-rose-15:  rgba(244,63,94,0.14);
  --overlay-scrim:   rgba(4,7,15,0.78);

  /* Radii, space, shadow, type, timing — keep existing 10/16/24 etc. */
  --font-display: "Space Grotesk", system-ui, sans-serif;
  --font-ui:      "Inter", system-ui, sans-serif;
  --font-mono:    "JetBrains Mono", monospace;
}
```
- **Overcast theme** `[data-theme="overcast"]` inverts to light but keeps same blue primary `#1D4ED8`.

### 4.2 Typography
- Display: `Space Grotesk` 600-700, -0.015em, for `challenge-title`, `analytics-title`, `tutor-header-title`.
- Body: `Inter` 400-600, for UI.
- Mono: `JetBrains Mono` for strings, tape cells, state labels, code.

### 4.3 Layout Concept — Lab Bench

```
+------------------------------------------------------------------+
| [ IALE ● ]  Discovery | Mutation Lab | Debugger | Analytics | NFA |  Saved | Reset | Theme |
+------------------------------------------------------------------+
| Spec Tray (360px │ Workbench (flex:1)                                          |
| CHALLENGE 1        │ [ V S T D | Undo Redo | Trash Layout | Σ={0,1} | Share Batch Create Practice | New | Check ] |
| ??? Easy           │ +---------------------------------------------------+ |
| Language examples  │ | · · · · · · · ·  (q0)←→(q1)  · · · · · · · · · | |
| Table String|Result │ | · · · · · · · · · · · · · · · · · · · · · | |
| Custom regex [in]  │ +---------------------------------------------------+ |
| All challenges     │ [ Counterexample: "10" Expected: Accept | Yours: Reject ] |
+------------------------------------------------------------------+
```
- **Signature element:** The DFA canvas *is* the hero — dot grid (`--grid-line`), radial vignette `radial-gradient(800px 400px at 50% 0%, rgba(42,91,218,0.10), transparent 70%), var(--bg-canvas)`, states glow on hover/selection.
- **Tape signature:** Example rows are a punch-tape: left border 3px `signal-cyan/rose`, cell `✓/✗` chips, click row → `toast + pulse highlight` of final state.

### 4.4 Shell

- `html, body { height: 100dvh }`, `body { display:flex; flex-direction:column; overflow:hidden; background: radial-gradient(1200px 600px at 70% -10%, rgba(42,91,218,0.14), transparent 60%), radial-gradient(900px 500px at 0% 100%, rgba(14,165,233,0.08), transparent 60%), var(--bg-app) }`
- `.app-header { height:60px; min-height:60px; flex-shrink:0; flex-wrap:wrap; background: linear-gradient(180deg, rgba(18,33,74,0.98), rgba(11,20,42,0.98)); border-bottom:1px solid rgba(42,91,218,0.22); box-shadow: 0 1px 0 rgba(42,91,218,0.18), 0 8px 24px rgba(0,0,0,0.35) }`
- `.main-content { flex:1; min-height:0; display:flex; flex-direction:column }`
- `.module-container.active { display:flex; flex:1; min-height:0 }`
- `.nav-tab { height:32px; border-radius:999px; font-weight:600; }` `.nav-tab.active { background: var(--signal-blue); color:white; box-shadow:0 2px 10px rgba(42,91,218,0.35) }` (no underline — pill is the signal)
- `.module-panel-left { background: var(--bg-panel); border-right:1px solid rgba(42,91,218,0.14); padding:18px; gap:18px; box-shadow: inset -1px 0 0 rgba(42,91,218,0.06) }`
- `.canvas-toolbar { background: rgba(11,20,42,0.92); backdrop-filter:blur(6px); border-bottom:1px solid rgba(42,91,218,0.16); flex-wrap:wrap; gap:6px; padding:8px 10px }`
- `.tool-btn { 34px; border-radius:10px; background: rgba(18,33,74,0.55); border:1px solid rgba(42,91,218,0.14) }` `.tool-btn.active { background: var(--signal-blue); color:white; box-shadow:0 4px 14px rgba(42,91,218,0.32) }`
- `.btn-primary { background: var(--signal-blue); color:white; border-radius:999px; font-weight:700; box-shadow:0 4px 18px rgba(42,91,218,0.28) }`
- `.btn-ghost { border-radius:999px; background: rgba(18,33,74,0.45); border-color: rgba(42,91,218,0.14) }`
- `.field-input, .string-input { background: rgba(18,33,74,0.55); border-radius:10px; }` focus `0 0 0 3px rgba(42,91,218,0.18)`

### 4.5 Responsive Rules (enforced)

- `body` is flex column so header never crops.
- `@media (max-width:900px)` → inline grids `320px|300px` flip to `1fr` + `42vh` top tray; `.module-panel-left { max-height:42vh; border-right:none; border-bottom:1px solid }`
- `@media (max-width:640px)` → `nav-tab {height:30px; font-size:11px}`; `.tutor-panel {width:100vw}`
- `.canvas-toolbar { flex-wrap:wrap; row-gap:6px }` — all 11 buttons remain reachable.

---

## 5. ENGINE — DETERMINISTIC AUTOMATA

### 5.1 DFA `engine/DFA.js`

```js
class DFA {
  constructor({states:string[], alphabet:string[], transitions:{[from]:{[sym]:to}}, startState:string|null, acceptStates:string[]})
  transition(state,sym): string|null
  run(input:string): boolean // crash → false
  runWithTrace(input): {accepted, trace:[{state,symbol,fromState,position}], crashed, crashAt}
  reachableStates(): Set<string> // BFS O(|Q||Σ|)
  isComplete(): boolean // every reachable state has |Σ| outgoing
  complete(): DFA // adds __SINK__ self-loops for missing, handles __SINK__ collision, clamps to reachable+Sink
  symmetricDifferenceWith(other:DFA): DFA // PRODUCT on UNION alphabet (not this.alphabet), handles null start, uses __SINK__ for missing, O(|Q1||Q2||Σ|)
  findShortestAccepted(maxLen=25): string|null // BFS visited per STATE only (not string), returns shortest
  sampleStrings({maxLen=8,count=15}): {accepted, rejected} // BFS with seenStrings Set + visitedStateDepth Set, max 200 strings, diversity
  clone(): DFA
  toJSON(): {states,alphabet,transitions,startState,acceptStates}
  static fromJSON(obj): DFA
}
```

Invariants:
- No throwing. Missing transition → `null` → `run` returns false.
- `complete()` never duplicates `__SINK__`.
- `symmetricDifferenceWith` must union alphabets.

### 5.2 NFA `engine/NFA.js`

```js
class NFA {
  constructor({states, alphabet (no ε), transitions:{[state]:{[sym|ε]:Set}}, startStates:Set, acceptStates:Set})
  static _setKey(set): string // sorted join ',' or '__EMPTY__'
  epsilonClosure(set): Set
  move(set,sym): Set
  toDFA(): DFA // subset construction O(2^Q * Σ), ε-closures, __EMPTY__ dead with self-loops
}
```

### 5.3 Regex `engine/regex.js`

Thompson construction via `RegexParser`:

- Literals, Union `a|b`, Concatenation implicit `ab`, Star `*`, Plus `+` (= `aa*` via `_cloneFragment`), Optional `?`, Group `( )`, Wildcard `.` (union of alphabet), Class `[abc]/[a-z]/[^01]`, Escape `\c`.
- Methods: `concatenate(a,b)`, `union(a,b)`, `kleeneStar(a)`, `plus(a)`, `optional(a)`, `_mergeTrans`, `_addEps`, `_cloneFragment`.
- Parse: `_parseUnion` → `_parseConcatenation` → `_parseQuantifier` → `_parseAtom` → `_parseCharClass`.
- Public: `toNFA(): NFA`, free `regexToDFA(regex, alphabet): DFA` (parse → NFA → DFA), `validateRegex(regex, alphabet): {valid, error?}`.

Edge: `alphabet=[]` → `.` is ε. `[2]` on `{0,1}` → ε.

### 5.4 Algorithms `engine/algorithms.js`

```js
findCounterexample(dfa1, dfa2): {string, expected, got} | null // BFS on symDiff product, visited per STATE, maxLen 25, returns shortest distinguishing string with expected/got via dfa.run
isEquivalent(dfa1,dfa2): bool // findCounterexample === null
minimize(dfa): DFA // Moore partition: complete → reachable → {accept}/{nonAccept} → split by signature (tuple of group indices) → rep = [0] of each block → new DFA
languageDiff(orig, mutated): {lostExample,gainedExample,isEquivalent,isStillMinimal} // NOT sampling. Uses findCounterexample shortest witness, then targeted BFS for the *other* direction (orig∩¬mut vs ¬orig∩mut) up to len12, plus minimize check for isStillMinimal
getTraceHint(ref, student, wrongStr): {level1,level2,level3,divergeIndex,divergeState,prefix,sym,crashed}
  // LABEL-AGNOSTIC: crashed → diverge at crashAt, last good state. Else brute-force earliest prefix where tail distinguishes (walk ref/student to prefix, then check suffix acceptance diff). If none, divergeIndex=-1 (accept-status-wrong). Prefix = wrongStr.slice(0, divergeIndex-1). level1=outcome, level2=where (crash vs diverge vs accept), level3=which student state+sym to inspect (never destination).
detectMisconceptions(history:{category}[]): string[] // counts ≥2 → pushes templated explanations for sink/accept/transition
```

### 5.5 Validate `engine/validate.js`

```js
checkTransitionConflict(existing:[{from,to,symbols:Set}], fromId, toId, sym): {valid} | {valid:false, reason, conflictingTo}
validateDFA(dfa, {warnings?:bool}): string[] // strict: no start, no accept, no states, missing transitions for every reachable×alphabet. Unreachable is NOT error unless warnings:true.
validateWarnings(dfa): string[] // ["Unreachable states: ... (won't affect language)."]
```

### 5.6 Challenges `engine/challenges.js`

- Helpers: `_buildDFA(spec):DFA`, `_verifyExamples(dfa, examples)` warns if mismatch.

- `FIXED_CHALLENGES` 12, each `{id, name, difficulty, alphabet, dfa, initialExamples:{accepted, rejected}, description}`:
  1. `ends-with-0` Easy `{q0,q1}` x {0,1} → q1 is accept (last 0)
  2. `even-ones` Easy `{even,odd}` count parity
  3. `contains-101` Medium 4 states s0..s3 trap
  4. `divisible-by-3` Medium `r0,r1,r2` delta `(2r+b)%3`
  5. `no-consecutive-0s` Medium `ok,saw0,dead`
  6. `length-div-by-3` Easy `l0,l1,l2`
  7. `a-followed-by-b` Medium `ok,sawA,dead` over {a,b}
  8. `starts-with-01` Easy `s0..s3` prefix
  9. `not-contains-00` Medium `q0,q1,q2` (same as 5 but named differently)
  10. `odd-as-even-bs` Hard `ee,eo,oe,oo` parity product
  11. `binary-div-by-5` Hard `0..4` `(2r+b)%5`
  12. `strict-alternating` Hard `start,last0,last1,dead`

- `ChallengeGenerator`:
  ```js
  random(forceType?): challenge|null // implemented types: suffix, contains, notContains (complement via flipped complete), countMod (parity), lengthMod (mod 2/3/4). Old ghost types removed. Each adds `id: gen-*-<ts>`, verifies examples, returns null on failure.
  fromRegex(regex, alphabet): challenge|null // validates, regexToDFA, samples 6, verifies.
  ```
  `challengeGenerator` singleton.

---

## 6. STORAGE — `storage/db.js` (ONLY `localStorage` caller for app data)

```js
KEYS = { DFA_SAVES:'iale_dfa_saves', PROGRESS:'iale_progress', MISTAKE_LOG:'iale_mistake_log', STATS:'iale_stats', AI_CHALLENGES:'iale_ai_challenges', LIBRARY:'iale_library' }
// Private: _read(key,fallback) -> JSON.parse | _write(key,val) -> JSON.stringify | _wrapResult(fn)
saveDFA(saveId, dfaJSON, positions): {ok}
loadDFA(saveId): {ok, data:{dfa,positions,updatedAt}|null}
deleteDFA(saveId)
getProgress(challengeId): {ok, data:{shownAccepted,shownRejected,solved,attempts}|null}
setProgress(challengeId, {shownAccepted?,shownRejected?,solved?,attempts?})
appendMistake(category, challengeId, details): {id,timestamp,category,challengeId,details}
getMistakeSummary(): {ok, data:[{category,count}] sorted desc}
getAllMistakes()
recordAttempt(moduleId,challengeId, details): increments attempts[`${module}:${id}`]
recordSolve(moduleId,challengeId, attemptsCount): sets solves[key]={solvedAt,attempts}
getStats(): {attempts, solves}
countAttempted(): number // unique keys count
countSolved(): number
countAttemptedUnique(): dedup by challengeId (split on ':')
countSolvedUnique()
saveAIChallenge(challenge): upsert by id, store dfa via toJSON(), dispatch iale-ai-challenge-updated, write
getAIChallenges(): rehydrate via DFA.fromJSON
deleteAIChallenge(id)
saveToLibrary(challenge): if not exists, push with savedAt, also ensure ai- id is in AI_CHALLENGES, dispatch iale-library-updated
getLibrary(): rehydrate
removeFromLibrary(id)
isInLibrary(id): bool
clearAllData(): removes DFA_SAVES,PROGRESS,MISTAKE_LOG,STATS,AI_CHALLENGES,LIBRARY,iale_session_memory, etc. keeps ai_settings & theme; dispatches iale-data-cleared
clearAllWithSettings(): above + removes ai_settings & theme
```

AI settings (`iale_ai_settings`) live **only** in `ChatbotPanel.js` (`iale_ai_settings`), never in `db.js`.

---

## 7. AI SYSTEM — 5-LAYER COGNITIVE TUTOR (COMPLETE REDO)

### 7.1 Goal

The AI **controls** the lab, **creates** the right practice at the right time, **guides** Socratically, and **never** reveals the answer — like a great tutor who believes you can figure it out.

### 7.2 Architecture

```
L1 PERCEPTION   ContextEngine  — privacy-tiered snapshot (PUBLIC / ABSTRACT / SECRET)
L2 POLICY       AIBrain        — FSM decides WHAT to do (hint? challenge? celebrate?)
L3 PROMPT       PromptSystem   — composes system prompt from blocks + few-shots
L4 ACTION       ToolOrchestrator + ToolDefinitions (11 tools) — validated execution + feedback
L5 SAFETY       SafetyLayer → AnswerGuard — 18-pattern + table-dump + regex-reveal guards
MEMORY         SessionMemory  — windowed 18 turns + 30% summarization + 6h TTL
DELIVERY       ChatbotPanel   — streaming <think>, markdown, challenge cards, proactive nudges
```

### 7.3 ToolDefinitions `ai/ToolDefinitions.js` (11 tools)

| Tag | Type | When | Required |
|-----|------|------|----------|
| `IALE_CHALLENGE` | block `<IALE_CHALLENGE>json</IALE_CHALLENGE>` | Stuck ≥2 fails or idle 45s → offer *slightly easier* practice. At most 1/turn. | `name, difficulty(Easy/Medium/Hard), alphabet, regex, description(no regex), hints[3]` |
| `IALE_LOAD_CHALLENGE` | self-closing | Direct to curated `FIXED_CHALLENGES` id | `id` |
| `IALE_GOTO_TAB` | self-closing | True progression, not ping-pong | `tab: discovery|mutation|debugger|analytics|nfa` |
| `IALE_HIGHLIGHT_STATE` | self-closing | Discussing a state that exists on canvas | `state, color=blue|rose|cyan|amber` |
| `IALE_CLEAR_HIGHLIGHTS` | self-closing | After demo |
| `IALE_TEST_STRING` | self-closing | Demo concept with 2 strings live | `value` |
| `IALE_SHOW_EXAMPLE` | self-closing | Discovery only, add one well-chosen labeled example | `str, accept=true|false` |
| `IALE_ANIMATE_TRACE` | self-closing | Show step-by-step pulse on trace | `value, speed=slow|normal|fast` |
| `IALE_SET_HINT_LEVEL` | self-closing | Sync with Socratic L1/L2/L3 | `level=1|2|3` |
| `IALE_CELEBRATE` | self-closing | After solve | `message?` |
| `IALE_SUGGEST_NEXT` | self-closing | Propose next challenge, not auto-load | `challengeId, reason?` |

- `validate(tag, attrsOrInner)` returns `{valid, data/attrs, reason}`. `regex` validated via `validateRegex`.
- `buildPromptSection()` renders the compact tool spec for the system prompt.

### 7.4 SessionMemory `ai/SessionMemory.js`

- `MAX_TURNS=18`, `SUMMARY_TRIGGER=24`, `STORAGE_KEY='iale_session_memory'`
- `add(role, content, meta)` slices to 6000 chars, `summary` = rolling keywords of oldest 30% (600 chars), `history` trimmed.
- `getHistoryForProvider()` returns `[{role,content}]` with pseudo-user `[Conversation summary so far: ...]` + last 18.
- `lastUserMessage()`, `exchangeCount()`, `clear()`, `raw()/setRaw()`.

### 7.5 AIBrain `ai/AIBrain.js` (Policy FSM)

```js
STUCK_ATTEMPTS=2, IDLE_MS=45000
recordActivity(), timeSinceActivity(), isIdle()
decide(moduleId, ctxData, guardData): {action, hintLevel?, reason, challengeDifficulty?}
  discovery: solved → celebrate_and_progress
            errors & attempts==0 & hasCanvas → hint L1
            attempts≥3 → offer_practice (difficulty Easy if was Easy/Hard→Medium else Easy)
            attempts≥2 && isIdle → nudge L1
  debugger: no ce → encourage_check
           hint≥3 && still stuck → offer_practice
           hint<3 && ce → hint escalate
  mutation: !isEquivalent → explain_diff
  analytics: → suggest_drill
policyToInstruction(policy): string // hidden POLICY: line appended to moduleContext
startIdleObserver(callback, intervalMs=45000) / stopIdleObserver()
```

### 7.6 ContextEngine `ai/ContextEngine.js`

- `_summarizeMachine(summary)` → `{states:["q0(start)(accept)"], transitions:["q0 --0--> q1"], alphabet, stateCount, transCount}` (no positions)
- `buildDiscoveryContext({difficulty, shownAccepted, shownRejected, canvasSummary, canvasErrors, attempts, solved})` → `Module: Discovery (HIDDEN...)`, `Difficulty/Attempts/Solved/Stuck`, `Shown examples`, `Canvas issues OR Student machine`, `Pedagogy note: stuck → consider L1 or NEW challenge`
- `buildDebuggerContext({challengeName, targetAbstract, canvasSummary, canvasErrors, lastCounterexample, hintLevelRevealed})` → **ABSTRACT ONLY**: `Reference ABSTRACT: 3 states (minimal), alphabet {0,1}, 1 accept. Language: …` + `Hint level already shown: 1/3 — do NOT jump` + `Counterexample: "101" expected accept got reject` + `Student machine` + `Pedagogy: L1/L2/L3`
- `buildMutationLabContext`, `buildAnalyticsContext`, `buildNFALabContext`, `buildContext(moduleId, data)` dispatcher.

### 7.7 PromptSystem `ai/PromptSystem.js`

- `VERSION='2.1-socratic-orchestrator'`
- `FEW_SHOTS` 3 golden triples: `student` / `bad (reveals)` / `good (Socratic + tool)` for `ends with 01` / `tell me regex` / `is my transition correct?`
- `buildFewShotBlock()` renders them + `Notice: Good responses never name target state`.
- `buildSystemPrompt(moduleContext)` composes:
  ```
  You are IALE Tutor vVERSION — warm, brilliant …
  ════════ OUTPUT ════════
  - Think inside <think>…</think> (collapsed)
  - Visible reply is markdown
  - Greeting → warm + one question
  ════════ HARD RULES — CURRENT EXERCISE ONLY ════════
  NEVER output concrete delta / table / regex for active exercise; use L1/L2/L3 graduated, respect hintLevelRevealed, deflect "give answer" → offer practice, Discovery: don't hallucinate, Debugger: only ABSTRACT
  ════════ ORCHESTRATOR — YOU DRIVE ════════
  max 2 tools/turn, 1 challenge/turn, when to act (stuck→easier challenge, explain→TEST_STRING, state→HIGHLIGHT, Discovery→SHOW_EXAMPLE, progression→GOTO_TAB, counterexample→ANIMATE_TRACE, solve→CELEBRATE)
  ════════ ACTIONS ════════ (ToolDefinitions.buildPromptSection())
  ════════ CHALLENGE RULES (strict) ════════
  ════════ LIVE CONTEXT ════════
  ${moduleContext}
  ```
- `buildUserMessageWithContext(history)` passthrough hook.

### 7.8 ToolOrchestrator `ai/ToolOrchestrator.js`

- `parse(text): {cleanText, actions}` — strips `<IALE_CHALLENGE>…</IALE_CHALLENGE>` (validates JSON via ToolDefinitions, on invalid pushes `{invalid:true, error}` and strips) + self-closing `<IALE_TAG attrs/>` (validates, pushes invalid if bad).
- `execute(actions): [{type, ok, message, data}]` — per tag validated, dispatches `CustomEvent`s: `iale-challenge-created` (also `Storage.saveAIChallenge`), `iale-load-challenge-id`, `iale-highlight-state`, `iale-clear-highlights`, `iale-test-string`, `iale-show-example`, `iale-animate-trace` (+ fallback test), `iale-set-hint-level`, `iale-celebrate` (confetti), `iale-suggest-next`.
- `_parseAttrs(attrsStr)` via `/(\w+)\s*=\s*"([^"]*)"/g`.
- `buildToolFeedback(results)` → `"[Tool results: ✓ … | ✗ …]"` (for future history injection).

### 7.9 SafetyLayer `ai/SafetyLayer.js` + AnswerGuard `ai/AnswerGuard.js`

- `AnswerGuard.looksLikeAnswerLeak(reply, {studentDFA, referenceDFA, counterexample})`:
  - Via `Algorithms.getTraceHint` gets `divergeState, sym`, infers `correctTarget` via prefix walk on reference, then 13 regexes: `ds ->/→/, ds on sym`, table row `| q |`, `from ds to … on sym`, `δ(q,sym)=`, `set/change/replace … ds … sym`, `should go to target`.
  - Generic: `δ(/delta(`, `add|create|set|change … transition … [01ab]`, `transition … should … go`, `q,0,q` tuple, header `| State | Symbol | Next`.
  - Table rows `≥2` or edge mentions `≥3` + `transition` → flag.
  - `FALLBACK_MESSAGE = "Let's not skip to fix — try hint ... or say 'make me a practice one'."`
- `SafetyLayer.check(reply, {studentDFA,referenceDFA,counterexample,moduleId,hintLevelRevealed})` → Stage 1: AnswerGuard if debugger/mutation, Stage 2: table `≥2`, edge `≥3`, Stage 3: regex reveal `(0|1)*` + `this language` in Discovery, returns `{allowed, reason, fallback}`.

### 7.10 AIProvider `ai/AIProvider.js`

- Proxy-aware: `window.location.protocol==='file:'` → `{ok:false, error:'FILE_PROTOCOL'}`; `localhost` → `fetch('/api/proxy', {body:{url,headers,body,stream}})` else direct `fetch(url, {mode:'cors'})`.
- Wire formats `WIRE_FORMATS`:
  - `messages-api` (Anthropic): `{model,max_tokens,system,messages}` + `x-api-key`
  - `chat-completions-api` (NVIDIA/OpenAI/Groq default): `{model,max_tokens,messages:[{role:system},...history]}` + `Bearer`
  - `custom`: template `{{system}}/{{history}}/{{model}}/{{maxTokens}}` + dot-path `responsePath`.
- `send({settings,systemPrompt,history,maxTokens=1024}): {ok,text,error}` never throws; maps `401/403/404/422/429/500` to friendly, `Failed to fetch` → CORS hint (“open via server.py”).
- `sendStream({settings,systemPrompt,history,maxTokens,onChunk})` → for `chat-completions-api` sets `stream:true`, reads SSE `data:` lines, `JSON.parse → delta = choices[0].delta.content`, calls `onChunk(delta)`, fallback to `send` on error.

### 7.11 Legacy Facades (keep app.js and modules working)

- `ContextBuilder.js` now facade over `ContextEngine` (same 4 methods) — new code should call `ContextEngine`.
- `ActionBridge.js` facade over `ToolOrchestrator` — `parse/execute` delegate, returns summary strings for old callers.

---

## 8. UI & CANVAS — `ui/DFACanvas.js` + Modules

### 8.1 DFACanvas

- `new DFACanvas(container, {editable, alphabet, allowNondet, allowEpsilon, stateRadius:28, width:700, height:420})`
- State: `_states: Map<id,{id,label,x,y,isAccepting,isStart}>`, `_transitions: Map<id,{id,from,to,symbols:Set}>`, `_stateCounter`, `_transCounter`, `_history/_histFwd` (50), `_mode=pointer`, `_selected`, `_dragging`, `_transFrom`, `_highlights Map`, `_hlTrans`, `_popover/_contextMenu`, `_alphabet`, `_listeners`, `_resizeObserver`.
- Build: SVG `700×420` viewBox, defs (markers `arr/arr-hl`, glow, gradients), layers `grid/ghost/transitions/states`, ghost line, `ResizeObserver.observe(container)` → `render()`.
- Grid: 24px dot spacing, `fill: var(--grid-line)`.
- Events: `pointerdown/move/up/cancel, dblclick, contextmenu`; global `pointerdown` to close popovers; `keydown` for `V/S/T/D` (only when SVG or container focused, **not** when `INPUT/TEXTAREA/SELECT/contenteditable` — fix for Move bug), `Escape` to cancel, `Delete/Backspace` to delete selected, `Ctrl+Z/Y`.
- Pointer logic:
  - `addTransition` (editable): first hit → `transFrom` + `current` highlight; second hit → `openTransitionPopover`; empty → cancel.
  - `delete`: `deleteStateConfirm` or `deleteTransition`.
  - `addState`: if `!hitState` → `_addStateAt`.
  - `pointer`: if `hitState` → select + drag; else → **deselect only** (FIX: no `_addStateAt` — Move no longer creates). `drag` clamps `x∈[R+4, W-R-4]`.
- Popover: `chiRow` of symbol chips (`--allowEpsilon` adds `ε`). If `!allowNondet`, `Validate.checkTransitionConflict` disables conflicting chips (`rose`, `not-allowed`). `Done` → `_applyTransitionEdit`.
- Context menu: `Set as start`, `Toggle accepting`, `Rename…` (input at `x*sx, y*sy`), `Delete state` (confirm).
- `_deleteStateConfirm`: first click → `s._confirming=true` + `orange` ring + `click again to delete` text for 3s; second click within 3s → delete. Prevents accidental.
- `autoLayout()`: snapshot, ring elliptical `rx=0.62*min(cx,cy)`, `ry=rx*0.72`, angle `2πi/n - π/2`, clamp, 3-pass repulsion `minD=54` (28*2+26). `render()` + emit.
- `highlightState(id,type)`, `highlightStateByLabel(label,type)`, `highlightTransition`, `clearHighlights()`, `getStateLabel`, `toStructuredSummary() → {states:[{label,isStart,isAccepting}], transitions:[{from,to,symbols}], alphabet}`, `getPositionMap(): {[label]:{x,y}}`.
- `toDFA()`: builds `DFA` from canvas, `validate(): Validate.validateDFA(toDFA())`, `loadDFA(dfa, posMap)`: ring or posMap, validates via `checkTransitionConflict` (skipped if `allowNondet`), `clear()`, `undo/redo` via `_serialize/_deserialize`.

### 8.2 Modules

All instantiated once on `DOMContentLoaded`, survive tab switches.

#### Discovery `modules/Discovery.js` (360px left + flex right)

- Left: `Challenge 1` header (`???` until solved, `badge Easy/Medium/Hard`), example table `String|Result` (Accept cyan `✓`, Reject rose `✗`), click row → `runWithTrace` + toast + `highlightStateByLabel(final, accept|reject)` for 1.2s. `Hint` button reveals 3 hints, `Custom language` regex + alphabet select + Load, accordion `All challenges` grouped Easy/Medium/Hard/Custom + `AI Challenges 0` + `Library 0` (each row has `☆ Save to Library` → becomes `✓ Saved`, delete for AI, remove for Library).
- Right: toolbar `V S T D | Undo Redo | Clear Layout | Σ={0,1} | Share Batch Create Practice | New challenge | Check hypothesis`, canvas `#disc-canvas-wrap` (flex:1), feedback `#disc-feedback` (border top 2px `cyan/rose/blue` per type).
- Canvas: `new DFACanvas(wrap, {editable:true, alphabet:['0','1']})`; mode buttons toggle `active` + `setMode`; autosave `debounce 800ms` → `Storage.saveDFA('discovery:'+id)` + `Save:saving→saved/error`.
- Load: `_loadChallenge(index)` → `_setChallenge(ch, idx+1)` + highlight `active`; `_loadRandomChallenge()` via `challengeGenerator.random()`; `_loadCustomRegex()` via `challengeGenerator.fromRegex` (shows `disc-regex-err` on invalid); `_setChallenge` resets `hintIndex=0, attempts=0, solved=false`, updates header, `setAlphabet`, restore `Storage.loadDFA` + `Storage.getProgress` (if `solved` then `attempts=prog.data.attempts`), `clear` else, `render`, `_refreshExamples`, scroll left to 0, if `solved` show banner.
- `_checkHypothesis()`: if `solved` return; `attempts++`; `validate()` → show error feedback and return; `studentDFA=toDFA()`, `ce=findCounterexample(ch.dfa, studentDFA)`; if `!ce` → `solved=true`, `recordSolve`, `setProgress(solved,attempts)`, reveal name, `showSolvedBanner()` (also shows unreachable warning + `Clear unreachable?` button); else `recordAttempt`, `_addExample(ce.string, ce.expected)` + `showFeedback` with `Expected: Accept/Reject` chips.
- Tutor context: `IALEChatbot.setContextProvider('discovery', ()=>{challengeName, difficulty, shownAccepted, shownRejected, canvasSummary, canvasErrors, attempts, solved})`.

#### Mutation Lab `modules/MutationLab.js` (dual 1fr|1fr)

- Left: challenge list + `Language Diff` card (Lost/Gained + `Replay` buttons + minimality pill) + `Mutation history` (throttled 1.2s, pending 1.3s debounce, max 25, reverse, click → `deserialize` + `computeDiff`).
- Right: toolbar `V S T D | Undo Redo | Reset Minimize | Test both` (string input), dual canvases `ORIGINAL (read-only)` / `YOUR MUTATION (editable)`, `mut-test-result` bar.
- `_computeDiff()`: validates, `languageDiff(orig, mutated)` → badge `Equivalent ✓` vs `Language Changed`, lost/gained pills, minimality, `pushHistory` throttled, `setGuardData` for Tutor.

#### Debugger `modules/Debugger.js` (320px left + flex right)

- Left: header + `☆ Save to Library`, challenge list (row + save chip), regex loader, `Execution Trace` card (tape cells `26px` + `Prev/Play/Next` + step desc), `Hints` card `L1/L2/L3`.
- Right: toolbar `V S T D | Undo Redo | Reference | Try again | Debug my DFA`, canvas, `Result area`.
- `_debugDFA()`: validate, `studentDFA=toDFA()`, `recordAttempt`, `ce=findCounterexample(challenge.dfa, studentDFA)` → if `!ce` success else `lastCE, sessionOpen, hintLevel=0, appendMistake, setGuardData, traceData=studentDFA.runWithTrace(ce.string), showResult (Expected/Yours chips), showTraceHint, renderTape, renderTraceStep`.
- Trace: `renderTape` maps `...str` to `isCurrent/past` styles, `renderTraceStep` highlights `current/accept/reject` via `highlightStateByLabel`, re-renders tape, updates desc.
- Hints: `showHint(level)` → `hintLevel=max`, `appendMistake`, `hint=Algorithms.getTraceHint`, shows `texts[level]` + highlight `divergeState` for L3 for 5s.
- `_getTargetAbstract()` → `{stateCount: min.states.length, alphabet, acceptCount, description, difficulty}` for ContextEngine.

#### Analytics `modules/Analytics.js` (960px centered)

- Header `Learning Analytics` + `Export Report` + `Reset all data` (rose `🗑`).
- `stats-row` 3 cards (Attempted, Solved, Top mistake with `animateCounter`), `bar-chart-row` per mistake (180px label + track + count, 400ms width), `rec-cards` (reason + name + Try in Discovery/Debugger), `DFA Zoo` 12 cards grid (icon, name, desc, `⚡ Try it` if in FIXED else disabled), `Export Report` → `window.open` + `document.write` + `print()`, `refresh()` called on tab switch.

#### NFA Lab `modules/NFALab.js`

- Left: presets (Ends with 1, Contains ab, Even length OR starts with a with ε, Third-to-last is 1), alphabet select, tips (`ε` labelled), `Subset construction log` + `Prev/Play/Next`, state count.
- Right: toolbar + dual `NFA (Editable, allowNondet:true, allowEpsilon:true)` / `RESULT DFA (read-only)` + `Convert to DFA` button.
- `loadPreset(i)`: sets desc, alphabet, `_currentPresetNFA`, visual dfa via first targets, skips ε, `clearResult`.
- `convert()`: builds `NFA` from preset or canvas, `epsilonClosure`, `subset construction` with `queue`, captures `steps` (`start`, `transition` with `ε-closure({moved})=`, `done`), loads result into `dfaCanvas`, animates log.

#### ChallengeCreator / TimedPractice

- Creator: modal `700px` grid 1fr|1fr, left form (name, desc, diff, alphabet, `Regex→DFA` vs `Draw DFA` tabs, `Build DFA`/`Validate & Preview`, preview table, status), right canvas preview (read-only after build / editable in draw). `BuildFromRegex` via `challengeGenerator.fromRegex` + `showPreview` (generates up to len5 samples), `ValidateCanvas` via `validate()`, `downloadJSON` (Blob, `id` slug), `loadIntoDiscovery` via `iale-challenge-created`.

- TimedPractice: overlay `position:fixed; inset:0; z-index:800; display:flex; flex-direction:column` (FIXED: was centered flex, now column). Header `56px` with timer bar `6px` + `time-left` + `Solved/Streak` + `Quit`, combo flash `top:72px`, content `flex:1; display:flex` left `360px` (challenge info, examples, alphabet, `Check DFA` + `Skip`) + right `flex:1` canvas + toolbar. `_nextChallenge` picks random from `FIXED` filtered by difficulty, `_check` validates, `findCounterexample`, `recordSolve`, streak+combo (`🔥 x5 STREAK!`), `_tickTimer` via `requestAnimationFrame` updates `pct` + color `<20 rose <40 amber else blue`, `_finish` shows `🏆/🌟/✅` + stats grid + `Play again/Done`.

---

## 9. STORAGE & RESET

- **Reset button** `#reset-all-btn` in header (`🗑 Reset` pill rose) + `Analytics #an-reset-btn` + `Ctrl+K` → `Reset all data`.
- `Storage.clearAllData()` removes `DFA_SAVES, PROGRESS, MISTAKE_LOG, STATS, AI_CHALLENGES, LIBRARY, session_memory` but keeps `ai_settings` + `theme`. `clearAllWithSettings` removes those too. Dispatches `iale-data-cleared`.
- `?reset=1` or `?fresh=1` in URL → on load `Object.keys(localStorage).forEach(k=>if(k.startsWith('iale_')) removeItem` then `replaceState` + `reload`.
- `window.IALEResetAll`, `IALEResetAllWithSettings` exposed.
- After reset, `Discovery` shows clean `q0` only, `Challenge 1 ???` and empty `AI Challenges 0 / Library 0` — verified via Playwright.

---

## 10. SERVER & PROXY

- `server.py` — `HTTPServer(('localhost', port), IALEHandler)` extends `SimpleHTTPRequestHandler`. `do_GET` serves static with `Cache-Control: no-cache` for `/` and `/index.html`. `do_POST` for `/api/proxy` only: reads `Content-Length`, `json.loads`, requires `url.startswith('https://')`, builds `urllib.request.Request(url, data=json.dumps(body).encode(), method='POST')`, forwards `headers`, adds `Content-Type`. If `stream:true` → `urlopen(req, timeout=120)` streams `512`-byte chunks as `Transfer-Encoding: chunked` with `X-Accel-Buffering: no`; else buffers full. Errors `HTTPError` → forward status/body, `URLError` → `502`, else `500`. CORS `Access-Control-Allow-Origin:*` etc. Logs only non-200.
- `start.bat` tries `python3` then `python`.

---

## 11. ERROR HANDLING — NO THROW TO UI

- Every `Storage.*` returns `{ok, data/error}`.
- `AIProvider.send/sendStream` returns `{ok, text/error}`; `FILE_PROTOCOL` if `file:`; `Unknown wire format` if bad; HTTP 401/403/404/422/429/5xx mapped to friendly strings; network `Failed to fetch` → CORS hint.
- `validateDFA` returns `[]` if ok.
- `ChatbotPanel.sendMessage` guards `file:` and `!hasValidSettings` (redirects to Settings), `setSending(true)` disables send, `onChunk` handles split `<think>` correctly, `looksLikeAnswerLeak` fallback, `catch` warns.

---

## 12. TESTING CHECKLIST

- `node --check js/*/*/*.js` — all OK.
- Playwright: header visible at 390px, toolbar wraps, `Right/Discovery` no crop, canvas `autoLayout` minDist 82px (>55) for 8 overlapping states → fixed.
- Timed Practice: `?reset=1` clears → `Click to add a state` centered, header not covering, `Check DFA` + `Skip` at `margin-top:16px` (not auto).
- AI: `Settings → Test connection` → green `✓ Connected — model replied: "ok"` or red `✗` with `_friendlyError`.

---

## 13. DEPLOY

- `python server.py` → `http://localhost:8080`
- For GitHub Pages: ensure `index.html` uses relative `css/style.css` and `js/...` and `ShareLink` works via `#dfa=` hash (no backend).

---

## 14. FUTURE — NOT IN SPEC YET

- E2E `playwright` suite for all 12 challenges.
- `validateWarnings` visualization for unreachable states.
- `PromptSystem` A/B versioning via `localStorage` flag.

---

I want you to build this and improve the design if you want/can I want a powerful working product at the end

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/da8d75fa-e277-4a37-9d6f-5aa1b7acfed5).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

---

## APPENDIX — RUNNING & DEPLOYING (v3.2, React/TanStack build)

### AI Tutor: bring your own key (BYOK only)

The Tutor has **no shared key and no server-side AI**. Open the Tutor panel
(robot icon, top right) → settings, pick a provider (Anthropic, OpenAI,
OpenRouter or Google AI Studio), choose a model, and paste your own API key.

- The key is stored **only in your browser's `localStorage`** (`iale_byok`).
- Requests go **directly from your browser to the provider** — nothing is
  proxied through this app, so nobody else can see or pay for your usage.
- If no key is entered, the Tutor simply does not respond. Every other module
  (Discovery, Mutation Lab, Debugger, NFA Lab, Analytics) works fully offline.

Because there is no server secret, there is nothing to configure in any hosting
dashboard — no environment variables, no proxy function.

### Deploying to Netlify

1. Push the repo and connect it as a new Netlify site.
2. Accept the settings from `netlify.toml` (build `npm run build`, publish
   `.output/public`). No environment variables are required.
3. Deploy. The Tutor works immediately for any student who supplies their own key.

### Local development

```bash
npm install
npm run dev      # http://localhost:8080
```

### Theme

Light (`overcast`) and dark (`blueprint`) themes are both first-class. The
choice is persisted in `localStorage` under `iale_theme` and applied before
first paint, so there is no flash of the wrong theme on reload. With no stored
choice, the OS `prefers-color-scheme` setting decides.
