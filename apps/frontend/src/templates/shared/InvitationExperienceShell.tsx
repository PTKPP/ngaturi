"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { InvitationMusic } from "@/invitation-music/registry";
import styles from "./invitation-experience.module.css";

export interface InvitationExperience {
  opened: boolean;
  playing: boolean;
  openInvitation(): void;
  playMusic(): Promise<void>;
  pauseMusic(): void;
}

const InvitationExperienceContext = createContext<InvitationExperience | null>(null);

export function useInvitationExperience(): InvitationExperience {
  const experience = useContext(InvitationExperienceContext);
  if (!experience) throw new Error("useInvitationExperience must be used inside InvitationExperienceShell");
  return experience;
}

export interface ResolvedInvitationMusic extends InvitationMusic {
  source: string;
}

export function InvitationExperienceShell({ children, music, preview, style }: {
  children: ReactNode;
  music: ResolvedInvitationMusic | null;
  preview: boolean;
  style?: CSSProperties;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [opened, setOpened] = useState(false);
  const [playing, setPlaying] = useState(false);

  const playMusic = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !music) return;
    audio.volume = music.volume;
    audio.loop = music.loop;
    if (audio.currentTime === 0 && music.startAtSeconds > 0) {
      try { audio.currentTime = music.startAtSeconds; } catch { /* Metadata may not be ready yet. */ }
    }
    try { await audio.play(); }
    catch { setPlaying(false); }
  }, [music]);

  const pauseMusic = useCallback(() => audioRef.current?.pause(), []);
  const openInvitation = useCallback(() => {
    setOpened(true);
    window.scrollTo({ top: 0, behavior: "auto" });
    // playMusic invokes audio.play() synchronously while this click handler is active.
    if (!preview && music) void playMusic();
  }, [music, playMusic, preview]);

  useEffect(() => {
    if (opened) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [opened]);

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
  }, [music?.source]);

  const toggleMusic = useCallback(() => {
    if (playing) pauseMusic(); else void playMusic();
  }, [pauseMusic, playMusic, playing]);
  const experience = useMemo<InvitationExperience>(() => ({ opened, playing, openInvitation, playMusic, pauseMusic }), [openInvitation, opened, pauseMusic, playMusic, playing]);

  return <InvitationExperienceContext.Provider value={experience}>
    <div className={styles.shell} data-invitation-experience data-opened={opened ? "true" : "false"} style={style}>
      {children}
      {music ? <audio ref={audioRef} src={music.source} loop={music.loop} preload="metadata" data-testid="invitation-audio" /> : null}
      {music && opened ? <button className={styles.musicControl} data-playing={playing ? "true" : "false"} type="button" onClick={toggleMusic} aria-label={playing ? "Jeda musik" : "Putar musik"} aria-pressed={playing} title={music.title}>
        <span aria-hidden="true">{playing ? "Ⅱ" : "▶"}</span>
      </button> : null}
    </div>
  </InvitationExperienceContext.Provider>;
}
