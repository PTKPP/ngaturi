"use client";

import { useEffect, useMemo, useState } from "react";
import type { InvitationEvent } from "@/domain";
import { eventTargetInstant, getCountdownParts } from "../utilities/countdown";
import styles from "../styles.module.css";

export function Countdown({ event, className = "" }: { event: InvitationEvent; className?: string }) {
  const target = useMemo(() => eventTargetInstant(event), [event]);
  const [parts, setParts] = useState(() => getCountdownParts(target));

  useEffect(() => {
    const update = () => setParts(getCountdownParts(target));
    update();
    const interval = window.setInterval(update, 1_000);
    return () => window.clearInterval(interval);
  }, [target]);

  const values = [["Hari", parts.days], ["Jam", parts.hours], ["Menit", parts.minutes], ["Detik", parts.seconds]] as const;
  return <div className={className} aria-label="Hitung mundur acara"><span className={styles.screenReader} aria-live="polite">{parts.days} hari dan {parts.hours} jam menuju acara</span>{values.map(([label, value]) => <div key={label}><strong>{String(value).padStart(2, "0")}</strong><span>{label}</span></div>)}</div>;
}
