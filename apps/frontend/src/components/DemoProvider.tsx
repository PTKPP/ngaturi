"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@/domain";
import { createDemoRuntime, type DemoRuntime } from "@/lib/demo-runtime";
import { getBrowserStorage, resetDemoData } from "@/repositories/mock";

interface DemoContextValue {
  runtime: DemoRuntime | null;
  session: Session | null;
  ready: boolean;
  error: string | null;
  refreshSession(): void;
  reset(): void;
}

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [runtime, setRuntime] = useState<DemoRuntime | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const next = createDemoRuntime(getBrowserStorage());
        setRuntime(next);
        setSession(next.auth.current());
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Data demo tidak dapat dibuka.");
      }
    });
    return () => { active = false; };
  }, []);

  const value: DemoContextValue = {
    runtime, session, ready: runtime !== null || error !== null, error,
    refreshSession: () => setSession(runtime?.auth.current() ?? null),
    reset: () => {
      if (!runtime) return;
      resetDemoData(runtime.storage);
      const next = createDemoRuntime(runtime.storage);
      setRuntime(next);
      setSession(null);
      setError(null);
    },
  };

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo(): DemoContextValue {
  const value = useContext(DemoContext);
  if (!value) throw new Error("useDemo harus digunakan di dalam DemoProvider.");
  return value;
}
