import { useCallback, useMemo, useRef, useState } from "react";
import { DFA, type TransitionMap } from "./engine/dfa";
import type { PositionMap } from "./storage";

export interface MachineState {
  id: string;
  label: string;
  x: number;
  y: number;
  isStart: boolean;
  isAccepting: boolean;
}
export interface MachineTransition {
  id: string;
  from: string;
  to: string;
  symbols: string[];
}
export interface Machine {
  states: MachineState[];
  transitions: MachineTransition[];
}

export const CANVAS_W = 700;
export const CANVAS_H = 420;
export const STATE_R = 28;

export const emptyMachine = (): Machine => ({ states: [], transitions: [] });

export function starterMachine(): Machine {
  return {
    states: [{ id: "s1", label: "q0", x: 160, y: 210, isStart: true, isAccepting: false }],
    transitions: [],
  };
}

export function machineToDFA(machine: Machine, alphabet: string[]): DFA {
  const label = (id: string) => machine.states.find((s) => s.id === id)?.label ?? id;
  const transitions: TransitionMap = {};
  for (const s of machine.states) transitions[s.label] = {};
  for (const t of machine.transitions) {
    const from = label(t.from);
    transitions[from] = transitions[from] ?? {};
    for (const sym of t.symbols) transitions[from][sym] = label(t.to);
  }
  return new DFA({
    states: machine.states.map((s) => s.label),
    alphabet,
    transitions,
    startState: machine.states.find((s) => s.isStart)?.label ?? null,
    acceptStates: machine.states.filter((s) => s.isAccepting).map((s) => s.label),
  });
}

export function layoutMachine(machine: Machine): Machine {
  const n = machine.states.length;
  if (!n) return machine;
  const cx = CANVAS_W / 2;
  const cy = CANVAS_H / 2;
  const rx = 0.62 * Math.min(cx, cy) * (n > 5 ? 1.35 : 1.1);
  const ry = rx * 0.72;
  const states = machine.states.map((s, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    return {
      ...s,
      x: Math.min(CANVAS_W - STATE_R - 6, Math.max(STATE_R + 6, cx + rx * Math.cos(angle))),
      y: Math.min(CANVAS_H - STATE_R - 6, Math.max(STATE_R + 6, cy + ry * Math.sin(angle))),
    };
  });
  // repulsion passes
  const minD = STATE_R * 2 + 26;
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < states.length; i++) {
      for (let j = i + 1; j < states.length; j++) {
        const a = states[i];
        const b = states[j];
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.01;
        if (d < minD) {
          const push = (minD - d) / 2;
          const ux = dx / d;
          const uy = dy / d;
          a.x = Math.max(STATE_R + 6, Math.min(CANVAS_W - STATE_R - 6, a.x - ux * push));
          a.y = Math.max(STATE_R + 6, Math.min(CANVAS_H - STATE_R - 6, a.y - uy * push));
          b.x = Math.max(STATE_R + 6, Math.min(CANVAS_W - STATE_R - 6, b.x + ux * push));
          b.y = Math.max(STATE_R + 6, Math.min(CANVAS_H - STATE_R - 6, b.y + uy * push));
        }
      }
    }
  }
  return { ...machine, states };
}

export function dfaToMachine(dfa: DFA, positions?: PositionMap): Machine {
  const states: MachineState[] = dfa.states.map((label, i) => ({
    id: `s${i + 1}`,
    label,
    x: positions?.[label]?.x ?? 0,
    y: positions?.[label]?.y ?? 0,
    isStart: dfa.startState === label,
    isAccepting: dfa.acceptStates.includes(label),
  }));
  const idOf = (label: string) => states.find((s) => s.label === label)?.id ?? label;
  const edges = new Map<string, MachineTransition>();
  let n = 0;
  for (const [from, row] of Object.entries(dfa.transitions)) {
    for (const [sym, to] of Object.entries(row)) {
      if (!states.some((s) => s.label === to)) continue;
      const key = `${from}->${to}`;
      if (!edges.has(key)) edges.set(key, { id: `t${++n}`, from: idOf(from), to: idOf(to), symbols: [] });
      const edge = edges.get(key)!;
      if (!edge.symbols.includes(sym)) edge.symbols.push(sym);
    }
  }
  const machine: Machine = { states, transitions: [...edges.values()] };
  return positions && Object.keys(positions).length ? machine : layoutMachine(machine);
}

export function positionsOf(machine: Machine): PositionMap {
  return Object.fromEntries(machine.states.map((s) => [s.label, { x: s.x, y: s.y }]));
}

/** Editable machine with 50-step undo/redo history. */
export function useMachine(initial: Machine = starterMachine()) {
  const [machine, setMachine] = useState<Machine>(initial);
  const past = useRef<Machine[]>([]);
  const future = useRef<Machine[]>([]);
  const [version, setVersion] = useState(0);

  const commit = useCallback((next: Machine | ((prev: Machine) => Machine)) => {
    setMachine((prev) => {
      past.current = [...past.current, prev].slice(-50);
      future.current = [];
      setVersion((v) => v + 1);
      return typeof next === "function" ? (next as (p: Machine) => Machine)(prev) : next;
    });
  }, []);

  /** Update without creating a history entry (e.g. every frame of a drag). */
  const set = useCallback((next: Machine | ((prev: Machine) => Machine)) => {
    setMachine((prev) => (typeof next === "function" ? (next as (p: Machine) => Machine)(prev) : next));
  }, []);

  const replace = useCallback((next: Machine) => {
    past.current = [];
    future.current = [];
    setVersion((v) => v + 1);
    setMachine(next);
  }, []);

  const undo = useCallback(() => {
    setMachine((prev) => {
      const p = past.current.pop();
      if (!p) return prev;
      future.current = [...future.current, prev].slice(-50);
      setVersion((v) => v + 1);
      return p;
    });
  }, []);

  const redo = useCallback(() => {
    setMachine((prev) => {
      const f = future.current.pop();
      if (!f) return prev;
      past.current = [...past.current, prev].slice(-50);
      setVersion((v) => v + 1);
      return f;
    });
  }, []);

  const flags = useMemo(
    () => ({ canUndo: past.current.length > 0, canRedo: future.current.length > 0 }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );

  return { machine, commit, set, replace, undo, redo, ...flags };
}
