import { DFA } from "@/lib/engine/dfa";
import { NFA, EPS } from "@/lib/engine/nfa";
import { regexToDFA, regexToNFA, validateRegex } from "@/lib/engine/regex";
import { liftToNfa, removeEpsilons, nfaToRegex, toDfa, hasEpsilon, machineToNFA, nfaToMachine } from "@/lib/engine/convert";
import { minimize, isEquivalent, findCounterexample, languageDiff, getTraceHint } from "@/lib/engine/algorithms";
import { FIXED_CHALLENGES, challengeGenerator } from "@/lib/engine/challenges";
import { validateDFA } from "@/lib/engine/validate";

let fail = 0, pass = 0;
const ok = (c: boolean, msg: string) => { if (c) pass++; else { fail++; console.log("FAIL:", msg); } };

function strings(alpha: string[], maxLen: number): string[] {
  let cur = [""], out = [""];
  for (let i = 0; i < maxLen; i++) { cur = cur.flatMap(s => alpha.map(a => s + a)); out.push(...cur); }
  return out;
}

// 1. Every fixed challenge: DFA is valid, total, and has samples
for (const c of FIXED_CHALLENGES) {
  const errs = validateDFA(c.dfa);
  ok(errs.length === 0, `challenge ${c.id} validateDFA: ${errs.join("; ")}`);
  const S = strings(c.alphabet, 6);
  const acc = S.filter(s => c.dfa.run(s));
  ok(acc.length > 0, `challenge ${c.id} accepts nothing up to len 6`);
  ok(acc.length < S.length, `challenge ${c.id} accepts everything (trivial)`);
  // minimize preserves language
  const m = minimize(c.dfa);
  ok(S.every(s => m.run(s) === c.dfa.run(s)), `minimize changed language for ${c.id}`);
  ok(isEquivalent(m, c.dfa), `isEquivalent(min, orig) false for ${c.id}`);
  ok(findCounterexample(m, c.dfa) === null, `spurious counterexample for ${c.id}`);
  // idempotent
  ok(minimize(m).toJSON().states.length === m.toJSON().states.length, `minimize not idempotent for ${c.id}`);
  // DFA -> NFA -> DFA roundtrip
  const back = toDfa(liftToNfa(c.dfa));
  ok(S.every(s => back.run(s) === c.dfa.run(s)), `dfa->nfa->dfa roundtrip broke ${c.id}`);
  // DFA -> regex -> DFA roundtrip
  const { regex } = nfaToRegex(liftToNfa(c.dfa));
  if (regex === null) { fail++; console.log("FAIL: nfaToRegex null for", c.id); }
  else {
    const v = validateRegex(regex, c.alphabet);
    ok(v.valid, `regex from ${c.id} invalid: ${regex} -> ${v.error}`);
    const rd = regexToDFA(regex, c.alphabet);
    if (!rd) { fail++; console.log("FAIL: regexToDFA null for", c.id, regex); }
    else {
      const bad = S.find(s => rd.run(s) !== c.dfa.run(s));
      ok(bad === undefined, `regex roundtrip mismatch ${c.id}: regex=${regex} str="${bad}"`);
    }
  }
}

// 2. Regex primitives
const cases: [string, string[], string[]][] = [
  ["(0|1)*01", ["01","001","1101"], ["","0","10","011"]],
  ["0*", ["","0","000"], ["1","01"]],
  ["(01)*", ["","01","0101"], ["0","1","010"]],
  ["1(0|1)*", ["1","10","111"], ["","0","01"]],
  ["0|1", ["0","1"], ["","01","00"]],
];
for (const [re, yes, no] of cases) {
  const d = regexToDFA(re, ["0","1"]);
  if (!d) { fail++; console.log("FAIL: regexToDFA null:", re); continue; }
  for (const s of yes) ok(d.run(s), `${re} should accept "${s}"`);
  for (const s of no) ok(!d.run(s), `${re} should reject "${s}"`);
}

// 3. epsilon removal preserves language
const enfa = new NFA({
  states: ["A","B","C"], alphabet: ["0","1"], start: "A", accepting: ["C"],
  transitions: { A: { [EPS]: ["B"], "0": ["A"] }, B: { "1": ["C"] }, C: { [EPS]: ["A"] } },
} as any);
ok(hasEpsilon(enfa), "hasEpsilon should be true");
const { nfa: cleaned } = removeEpsilons(enfa);
ok(!hasEpsilon(cleaned), "removeEpsilons left epsilons");
{
  const S = strings(["0","1"], 7);
  const a = toDfa(enfa), b = toDfa(cleaned);
  const bad = S.find(s => a.run(s) !== b.run(s));
  ok(S.every(s => a.run(s) === b.run(s)), `removeEpsilons changed language at "${bad}"`);
}

// 4. Generator sanity across difficulties
for (const diff of ["Easy","Medium","Hard"] as const) {
  for (let i = 0; i < 12; i++) {
    const c = challengeGenerator.random();
    if (!c) break;
    ok(validateDFA(c.dfa).length === 0, `generated ${diff} #${i} invalid`);
    const S = strings(c.alphabet, 6);
    const acc = S.filter((s: string) => c.dfa.run(s));
    ok(acc.length > 0 && acc.length < S.length, `generated ${diff} #${i} trivial language (${acc.length}/${S.length})`);
  }
}

// 5. Counterexample must be a real witness
{
  const a = regexToDFA("(0|1)*0", ["0","1"])!;
  const b = regexToDFA("(0|1)*1", ["0","1"])!;
  const ce = findCounterexample(a, b);
  ok(ce !== null, "expected counterexample between complement languages");
  if (ce) ok(a.run(ce.string) !== b.run(ce.string), `counterexample "${ce.string}" is not a real witness`);
  ok(!isEquivalent(a, b), "isEquivalent said equal for different languages");
}

// 6. languageDiff / getTraceHint don't throw
{
  const a = FIXED_CHALLENGES[0]!.dfa, b = minimize(FIXED_CHALLENGES[0]!.dfa);
  const d = languageDiff(a, b);
  ok(d.isEquivalent === true, "languageDiff: equal DFAs not reported equivalent");
  ok(d.lostExample === null && d.gainedExample === null, "languageDiff: witnesses on equal DFAs");
  for (const w of ["", "0", "0101", "1111", "0000"]) {
    const h = getTraceHint(a, b, w);
    ok(!!h.level1 && !!h.level2 && !!h.level3, `getTraceHint incomplete for "${w}"`);
    ok(!/__SINK__/.test(h.level1 + h.level2 + h.level3), `getTraceHint leaks SINK label for "${w}"`);
  }
}

// 7. machine <-> NFA roundtrip
{
  const n = liftToNfa(FIXED_CHALLENGES[0]!.dfa);
  const m = nfaToMachine(n);
  const n2 = machineToNFA(m, FIXED_CHALLENGES[0]!.alphabet);
  const S = strings(FIXED_CHALLENGES[0]!.alphabet, 6);
  const A = toDfa(n), B = toDfa(n2);
  ok(S.every(s => A.run(s) === B.run(s)), "machine<->NFA roundtrip changed language");
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
