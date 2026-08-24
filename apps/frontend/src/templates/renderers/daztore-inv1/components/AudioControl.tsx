"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import styles from "../styles.module.css";
import { ThemeIcon } from "./Icons";

export interface AudioControlHandle {
  play(): Promise<void>;
}

export const AudioControl = forwardRef<AudioControlHandle, { src: string; visible: boolean }>(function AudioControl({ src, visible }, ref) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  const play = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    try { await audio.play(); }
    catch { setPlaying(false); }
  };

  useImperativeHandle(ref, () => ({ play }), []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onPause);
    audio.addEventListener("error", onPause);
    return () => {
      audio.pause();
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onPause);
      audio.removeEventListener("error", onPause);
    };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) audio.pause(); else void play();
  };

  return <><audio ref={audioRef} src={src} loop preload="metadata" data-testid="daztore-audio" /><button className={styles.audioControl} data-visible={visible ? "true" : "false"} data-playing={playing ? "true" : "false"} type="button" onClick={toggle} aria-label={playing ? "Jeda musik" : "Putar musik"} aria-pressed={playing}><ThemeIcon name={playing ? "pause" : "play"} /></button></>;
});
