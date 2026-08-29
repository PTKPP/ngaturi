import type { SVGProps } from "react";

export type ThemeIconName = "audio" | "calendar" | "copy" | "couple" | "envelope" | "gift" | "heart" | "home" | "map" | "pause" | "play" | "photo";

const paths: Record<ThemeIconName, string> = {
  audio: "M9 18V5l10-2v13M9 9l10-2M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm10-2a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  calendar: "M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Zm3 8h3v3H8v-3Z",
  copy: "M8 8h11v12H8V8Zm-3 8H4V4h11v1",
  couple: "M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 20c.5-4 2.5-6 6-6s5.5 2 6 6m-4 0c.4-3.4 2.4-5.5 6-5.5 3.2 0 5.2 2 6 5.5",
  envelope: "M3 6h18v12H3V6Zm1 1 8 6 8-6",
  gift: "M4 10h16v10H4V10Zm-1-4h18v4H3V6Zm9 0v14m0-14c-1-4-6-4-6-1 0 1 2 1 6 1Zm0 0c1-4 6-4 6-1 0 1-2 1-6 1Z",
  heart: "M12 21S3 15 3 8.5C3 4 8.5 2 12 6c3.5-4 9-2 9 2.5C21 15 12 21 12 21Z",
  home: "m3 11 9-8 9 8v10h-6v-7H9v7H3V11Z",
  map: "M9 18 3 21V6l6-3 6 3 6-3v15l-6 3-6-3Zm0 0V3m6 18V6",
  pause: "M7 5h4v14H7V5Zm6 0h4v14h-4V5Z",
  play: "m8 5 11 7-11 7V5Z",
  photo: "M4 5h16v14H4V5Zm2 11 4-4 3 3 2-2 3 3M9 9h.01",
};

export function ThemeIcon({ name, ...props }: { name: ThemeIconName } & SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}><path d={paths[name]} /></svg>;
}

export function Wave({ flip = false }: { flip?: boolean }) {
  return <svg viewBox="0 0 1440 160" preserveAspectRatio="none" aria-hidden="true"><path d="M0 64 48 82.7C96 101 192 139 288 136s192-48 288-51 192 35 288 27 192-60 288-67 192 31 240 49l48 18v48H0Z" transform={flip ? "translate(1440 160) rotate(180)" : undefined} /></svg>;
}
