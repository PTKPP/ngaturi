import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { currentProfile } from "@/application/auth";
export const dynamic = "force-dynamic";
export default async function DashboardLayout({ children }: { children: ReactNode }) { if (!await currentProfile()) redirect("/login"); return children; }
