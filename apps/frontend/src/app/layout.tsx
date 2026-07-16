import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { DemoProvider } from "@/components/DemoProvider";
import "./globals.css";

export const metadata: Metadata = { title: "Ngaturi Demo", description: "Prototype undangan digital frontend-first" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="id"><body><DemoProvider>{children}</DemoProvider></body></html>;
}
