"use client";

import { useState } from "react";
import Image from "next/image";

const MEDIA_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function controlledSource(source: string, fallback: string): string {
  if (MEDIA_ID.test(source)) return `/api/public-media/${source}`;
  return source.startsWith("/templates/") ? source : fallback;
}

export function ThemeImage({ src, fallback, alt, eager = false, className }: { src: string; fallback: string; alt: string; eager?: boolean; className?: string }) {
  const [failed, setFailed] = useState(false);
  return <Image src={failed ? fallback : controlledSource(src, fallback)} alt={alt} width={600} height={600} loading={eager ? "eager" : "lazy"} className={className} onError={() => setFailed(true)} />;
}
