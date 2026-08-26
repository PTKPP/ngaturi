import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { currentProfile } from "@/application/auth";
export const dynamic = "force-dynamic";
export default async function AdminLayout({ children }: { children: ReactNode }) { const profile = await currentProfile(); if (!profile) redirect("/login"); if (profile.role !== "admin") redirect("/dashboard"); return children; }
