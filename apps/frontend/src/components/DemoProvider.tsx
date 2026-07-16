"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@/domain";
import { createDemoRuntime, type DemoRuntime } from "@/lib/demo-runtime";
import { getBrowserStorage, resetDemoData } from "@/repositories/mock";

interface DemoContextValue {
  runtime: DemoRuntime | null;
  session: Session | null;
  status: "loading" | "ready" | "error";
  ready: boolean;
  error: string | null;
  refreshSession(): void;
  retry(): void;
  reset(): void;
}

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [runtime, setRuntime] = useState<DemoRuntime | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<DemoContextValue["status"]>("loading");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const finishInitialization = useCallback(() => {
    try {
      const next = createDemoRuntime(getBrowserStorage());
      setRuntime(next);
      setSession(next.auth.current());
      setError(null);
      setStatus("ready");
    } catch (cause) {
      setRuntime(null);
      setSession(null);
      setError(cause instanceof Error ? cause.message : "Data demo tidak dapat dibuka.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(finishInitialization, 0);
    return () => window.clearTimeout(timer);
  }, [attempt, finishInitialization]);

  const retry = () => {
    setRuntime(null);
    setSession(null);
    setError(null);
    setStatus("loading");
    setAttempt((value) => value + 1);
  };

  const reset = () => {
    setRuntime(null);
    setSession(null);
    setError(null);
    setStatus("loading");
    try {
      const storage = getBrowserStorage();
      resetDemoData(storage);
      const next = createDemoRuntime(storage);
      setRuntime(next);
      setSession(null);
      setStatus("ready");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Data demo tidak dapat direset.");
      setStatus("error");
    }
  };

  const value: DemoContextValue = {
    runtime, session, status, ready: status !== "loading", error,
    refreshSession: () => setSession(runtime?.auth.current() ?? null),
    retry,
    reset,
  };

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo(): DemoContextValue {
  const value = useContext(DemoContext);
  if (!value) throw new Error("useDemo harus digunakan di dalam DemoProvider.");
  return value;
}
