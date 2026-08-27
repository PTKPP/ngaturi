"use client";

import { Suspense } from "react";
import { Cormorant_Garamond, Josefin_Sans, Noto_Naskh_Arabic, Sacramento } from "next/font/google";
import type { InvitationTemplateProps } from "@/templates/types";
import { isModuleEnabled } from "@/invitation-modules/content";
import { moduleRegistry } from "@/invitation-modules/registry";
import type { WeddingRenderModel } from "@/invitation-modules/schemas";
import { BottomNavigation } from "./components/BottomNavigation";
import { ClosingSection } from "./components/ClosingSection";
import { CountdownSection } from "./components/CountdownSection";
import { CoupleSection } from "./components/CoupleSection";
import { EventSection } from "./components/EventSection";
import { GallerySection } from "./components/GallerySection";
import { GiftSection } from "./components/GiftSection";
import { GreetingSection } from "./components/GreetingSection";
import { GuestInteractionSection } from "./components/GuestInteractionSection";
import { HeroSection } from "./components/HeroSection";
import { MapsSection } from "./components/MapsSection";
import { QuoteSection } from "./components/QuoteSection";
import { StorySection } from "./components/StorySection";
import { VideoSection } from "./components/VideoSection";
import { WelcomeCover } from "./components/WelcomeCover";
import styles from "./styles.module.css";
import { themeCssVariables } from "@/themes/css-variables";
import type { DaztoreInv1ViewModel } from "./view-model";
import { useInvitationExperience } from "@/templates/shared/InvitationExperienceShell";

const bodyFont = Josefin_Sans({ subsets: ["latin"], variable: "--daztore-font-body", display: "swap" });
const headingFont = Cormorant_Garamond({ subsets: ["latin"], variable: "--daztore-font-heading", display: "swap" });
const scriptFont = Sacramento({ weight: "400", subsets: ["latin"], variable: "--daztore-font-script", display: "swap" });
const arabicFont = Noto_Naskh_Arabic({ subsets: ["arabic"], variable: "--daztore-font-arabic", display: "swap" });

export function DaztoreInv1Template({ invitation, content, moduleContent, theme }: InvitationTemplateProps<WeddingRenderModel>) {
  const { opened } = useInvitationExperience();
  const viewModel: DaztoreInv1ViewModel = { ...invitation, ...content, content: content.copy };
  const events = [...content.events].sort((left, right) => left.sortOrder - right.sortOrder);
  const mainEvent = events[0];
  const cover = moduleRegistry.cover.schema.parse(moduleContent.modules.cover);
  const countdown = moduleRegistry.countdown.schema.parse(moduleContent.modules.countdown);
  const video = moduleRegistry.video.schema.parse(moduleContent.modules.video);
  const rsvp = moduleRegistry.rsvp.schema.parse(moduleContent.modules.rsvp);
  const wishes = moduleRegistry.wishes.schema.parse(moduleContent.modules.wishes);
  const maps = moduleRegistry.maps.schema.parse(moduleContent.modules.maps);
  const hasGallery = isModuleEnabled(moduleContent, "gallery") && content.gallery.length > 0;
  const hasGift = isModuleEnabled(moduleContent, "gift") && content.settings.showGiftInformation && Boolean(content.copy.giftInformation.trim());
  const coupleNames = `${content.couple.partnerOne.nickname} & ${content.couple.partnerTwo.nickname}`;

  return <div className={`${styles.root} ${bodyFont.variable} ${headingFont.variable} ${scriptFont.variable} ${arabicFont.variable}`} data-template="daztore-inv1@1" data-theme={`${theme.key}@${theme.version}`} data-pattern={theme.tokens.backgroundPattern} data-ornament={theme.tokens.ornament} data-opened={opened ? "true" : "false"} style={themeCssVariables(theme)}>
    <Suspense fallback={<div className={styles.coverFallback}>Menyiapkan undangan…</div>}>
      <WelcomeCover invitation={viewModel} event={mainEvent} eyebrow={cover.eyebrow} title={cover.title} />
    </Suspense>
    <main>
      <HeroSection invitation={viewModel} event={mainEvent} />
      <GreetingSection text={content.copy.openingText} />
      <CoupleSection invitation={viewModel} />
      <QuoteSection invitation={viewModel} />
      <EventSection events={events} />
      {isModuleEnabled(moduleContent, "countdown") ? <CountdownSection event={mainEvent} label={countdown.label} /> : null}
      <StorySection story={content.copy.story} />
      <GallerySection gallery={content.gallery} coupleNames={coupleNames} />
      {isModuleEnabled(moduleContent, "video") ? <VideoSection url={video.url} /> : null}
      {isModuleEnabled(moduleContent, "rsvp") && rsvp.enabled ? <GuestInteractionSection kind="rsvp" /> : null}
      {hasGift ? <GiftSection information={content.copy.giftInformation} /> : null}
      {isModuleEnabled(moduleContent, "wishes") && wishes.enabled ? <GuestInteractionSection kind="wishes" /> : null}
      {isModuleEnabled(moduleContent, "maps") ? <MapsSection events={events} label={maps.label} /> : null}
    </main>
    <ClosingSection invitation={viewModel} />
    <BottomNavigation visible={opened} hasGallery={hasGallery} hasGift={hasGift} />
  </div>;
}
