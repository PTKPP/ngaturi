"use client";

import { useRouter } from "next/navigation";
import { useDemo } from "./DemoProvider";

export function DevResetButton() {
  const { reset } = useDemo();
  const router = useRouter();
  if (process.env.NODE_ENV === "production") return null;
  return <button className="button danger" onClick={() => { if (window.confirm("Reset seluruh data demo Ngaturi?")) { reset(); router.replace("/login"); } }}>Reset data demo</button>;
}
