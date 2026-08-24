"use client";

import { useState } from "react";
import Image, { type ImageLoaderProps } from "next/image";

function passthroughLoader({ src }: ImageLoaderProps): string { return src; }

export function ThemeImage({ src, fallback, alt, eager = false, className }: { src: string; fallback: string; alt: string; eager?: boolean; className?: string }) {
  const [failed, setFailed] = useState(false);
  return <Image loader={passthroughLoader} unoptimized src={!src || failed ? fallback : src} alt={alt} width={600} height={600} loading={eager ? "eager" : "lazy"} className={className} onError={() => setFailed(true)} />;
}
