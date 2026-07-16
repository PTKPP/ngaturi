"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { canAccessPath } from "@/services";
import { useDemo } from "./DemoProvider";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { ready, session, error } = useDemo();
  const pathname = usePathname();
  const router = useRouter();
  const allowed = ready && !error && canAccessPath(session, pathname);

  useEffect(() => {
    if (ready && !error && !allowed) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [allowed, error, pathname, ready, router]);

  if (error) return <main className="state-card"><h1>Data demo bermasalah</h1><p>{error}</p></main>;
  if (!allowed) return <main className="state-card"><p>Memeriksa akses demo…</p></main>;
  return children;
}
