"use client";

import { Suspense, useRef, useState } from "react";
import { Josefin_Sans, Noto_Naskh_Arabic, Sacramento } from "next/font/google";
import type { InvitationTemplateProps } from "@/templates/types";
import { daztoreInv1Assets } from "./assets";
import { AudioControl, type AudioControlHandle } from "./components/AudioControl";
import { BottomNavigation } from "./components/BottomNavigation";
import { ClosingSection } from "./components/ClosingSection";
import { CoupleSection } from "./components/CoupleSection";
import { EventSection } from "./components/EventSection";
import { GallerySection } from "./components/GallerySection";
import { GiftSection } from "./components/GiftSection";
import { HeroSection } from "./components/HeroSection";
import { QuoteSection } from "./components/QuoteSection";
import { StorySection } from "./components/StorySection";
import { WelcomeCover } from "./components/WelcomeCover";
import styles from "./styles.module.css";
import { themeCssVariables } from "@/templates/theme-registry";

const bodyFont = Josefin_Sans({ subsets: ["latin"], variable: "--daztore-font-body", display: "swap" });
const scriptFont = Sacramento({ weight: "400", subsets: ["latin"], variable: "--daztore-font-script", display: "swap" });
const arabicFont = Noto_Naskh_Arabic({ subsets: ["arabic"], variable: "--daztore-font-arabic", display: "swap" });

export function DaztoreInv1Template({ invitation, theme, preview = false }: InvitationTemplateProps) {
  const [opened, setOpened] = useState(false);
  const audioControlRef = useRef<AudioControlHandle>(null);
  const events = [...invitation.events].sort((left, right) => left.sortOrder - right.sortOrder);
  const mainEvent = events[0];
  const hasGallery = invitation.gallery.length > 0;
  const hasGift = invitation.settings.showGiftInformation && Boolean(invitation.content.giftInformation.trim());
  const coupleNames = `${invitation.couple.partnerOne.nickname} & ${invitation.couple.partnerTwo.nickname}`;

  const openInvitation = () => {
    setOpened(true);
    window.scrollTo({ top: 0, behavior: "auto" });
    if (!preview) void audioControlRef.current?.play();
  };

  return <div className={`${styles.root} ${bodyFont.variable} ${scriptFont.variable} ${arabicFont.variable}`} data-template="daztore-inv1@1" data-theme={`${theme.key}@${theme.version}`} data-opened={opened ? "true" : "false"} style={themeCssVariables(theme)}>
    <Suspense fallback={<div className={styles.coverFallback}>Menyiapkan undangan…</div>}><WelcomeCover invitation={invitation} open={!opened} onOpen={openInvitation} /></Suspense>
    <main>
      <HeroSection invitation={invitation} event={mainEvent} />
      <CoupleSection invitation={invitation} />
      <QuoteSection invitation={invitation} />
      <EventSection events={events} />
      <StorySection story={invitation.content.story} />
      <GallerySection gallery={invitation.gallery} coupleNames={coupleNames} />
      {hasGift ? <GiftSection information={invitation.content.giftInformation} /> : null}
    </main>
    <ClosingSection invitation={invitation} />
    <BottomNavigation visible={opened} hasGallery={hasGallery} hasGift={hasGift} />
    <AudioControl ref={audioControlRef} src={daztoreInv1Assets.audio} visible={opened} />
  </div>;
}
