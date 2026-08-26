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
import { themeCssVariables } from "@/themes/registry";
import type { DaztoreInv1Content, DaztoreInv1ViewModel } from "./schema";

const bodyFont = Josefin_Sans({ subsets: ["latin"], variable: "--daztore-font-body", display: "swap" });
const scriptFont = Sacramento({ weight: "400", subsets: ["latin"], variable: "--daztore-font-script", display: "swap" });
const arabicFont = Noto_Naskh_Arabic({ subsets: ["arabic"], variable: "--daztore-font-arabic", display: "swap" });

export function DaztoreInv1Template({ invitation, content, theme, preview = false }: InvitationTemplateProps<DaztoreInv1Content>) {
  const [opened, setOpened] = useState(false);
  const audioControlRef = useRef<AudioControlHandle>(null);
  const viewModel: DaztoreInv1ViewModel = { ...invitation, ...content, content: content.copy };
  const events = [...content.events].sort((left, right) => left.sortOrder - right.sortOrder);
  const mainEvent = events[0];
  const hasGallery = content.gallery.length > 0;
  const hasGift = content.settings.showGiftInformation && Boolean(content.copy.giftInformation.trim());
  const coupleNames = `${content.couple.partnerOne.nickname} & ${content.couple.partnerTwo.nickname}`;

  const openInvitation = () => {
    setOpened(true);
    window.scrollTo({ top: 0, behavior: "auto" });
    if (!preview) void audioControlRef.current?.play();
  };

  return <div className={`${styles.root} ${bodyFont.variable} ${scriptFont.variable} ${arabicFont.variable}`} data-template="daztore-inv1@1" data-theme={`${theme.key}@${theme.version}`} data-opened={opened ? "true" : "false"} style={themeCssVariables(theme)}>
    <Suspense fallback={<div className={styles.coverFallback}>Menyiapkan undangan…</div>}><WelcomeCover invitation={viewModel} open={!opened} onOpen={openInvitation} /></Suspense>
    <main>
      <HeroSection invitation={viewModel} event={mainEvent} />
      <CoupleSection invitation={viewModel} />
      <QuoteSection invitation={viewModel} />
      <EventSection events={events} />
      <StorySection story={content.copy.story} />
      <GallerySection gallery={content.gallery} coupleNames={coupleNames} />
      {hasGift ? <GiftSection information={content.copy.giftInformation} /> : null}
    </main>
    <ClosingSection invitation={viewModel} />
    <BottomNavigation visible={opened} hasGallery={hasGallery} hasGift={hasGift} />
    <AudioControl ref={audioControlRef} src={daztoreInv1Assets.audio} visible={opened} />
  </div>;
}
