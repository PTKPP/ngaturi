"use client";

import { useEffect, useMemo, useState } from "react";
import type { InvitationEvent } from "@/domain";
import { eventTargetInstant, getCountdownParts } from "../utilities/countdown";
import styles from "../styles.module.css";

export function Countdown({ event, className = "" }: { event: InvitationEvent; className?: string }) {
  const target = useMemo(() => eventTargetInstant(event), [event]);
  const [parts, setParts] = useState(() => getCountdownParts(null));
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setParts(getCountdownParts(target, now));
      setFinished(Boolean(target && target.getTime() <= now.getTime()));
    };
    update();
    const interval = window.setInterval(update, 1_000);
    return () => window.clearInterval(interval);
  }, [target]);

  const values = [["Hari", parts.days], ["Jam", parts.hours], ["Menit", parts.minutes], ["Detik", parts.seconds]] as const;
  if (finished) return <p className={styles.countdownFinished}>Hari bahagia telah tiba.</p>;
  return <div className={className} role="timer" aria-label={`${parts.days} hari dan ${parts.hours} jam menuju acara`}>{values.map(([label, value]) => <div key={label}><strong>{String(value).padStart(2, "0")}</strong><span>{label}</span></div>)}</div>;
}
