import type { InvitationEvent } from "@/domain";

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const ZERO_COUNTDOWN: CountdownParts = { days: 0, hours: 0, minutes: 0, seconds: 0 };

export function eventTargetInstant(event: Pick<InvitationEvent, "date" | "startTime" | "timezone">): Date | null {
  const [year, month, day] = event.date.split("-").map(Number);
  const [hour, minute] = event.startTime.split(":").map(Number);
  if (![year, month, day, hour, minute].every(Number.isFinite)) return null;

  const intendedUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  let instant = intendedUtc;
  try {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const zoned = getZonedParts(new Date(instant), event.timezone);
      const representedUtc = Date.UTC(zoned.year, zoned.month - 1, zoned.day, zoned.hour, zoned.minute, zoned.second);
      instant = intendedUtc - (representedUtc - instant);
    }
  } catch {
    return null;
  }
  return new Date(instant);
}

export function getCountdownParts(target: Date | null, now = new Date()): CountdownParts {
  if (!target || Number.isNaN(target.getTime())) return ZERO_COUNTDOWN;
  const remaining = Math.max(0, target.getTime() - now.getTime());
  return {
    days: Math.floor(remaining / 86_400_000),
    hours: Math.floor((remaining % 86_400_000) / 3_600_000),
    minutes: Math.floor((remaining % 3_600_000) / 60_000),
    seconds: Math.floor((remaining % 60_000) / 1_000),
  };
}

export function formatEventDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "full", timeZone: "UTC" }).format(parsed);
}

function getZonedParts(date: Date, timeZone: string): Record<"year" | "month" | "day" | "hour" | "minute" | "second", number> {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
  return values as Record<"year" | "month" | "day" | "hour" | "minute" | "second", number>;
}
