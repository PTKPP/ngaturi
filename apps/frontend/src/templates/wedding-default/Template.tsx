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
import { HeroSection } from "./components/HeroSection";
import { MapsSection } from "./components/MapsSection";
import { QuoteSection } from "./components/QuoteSection";
import { RsvpSection } from "./components/RsvpSection";
import { StorySection } from "./components/StorySection";
import { VideoSection } from "./components/VideoSection";
import { WelcomeCover } from "./components/WelcomeCover";
import { WishesSection } from "./components/WishesSection";
import styles from "./styles.module.css";
import { themeCssVariables } from "@/themes/css-variables";
import type { WeddingDefaultViewModel } from "./view-model";
import { useInvitationExperience } from "@/templates/shared/InvitationExperienceShell";
import { hasPublicGift } from "@/invitation-modules/definitions/gift";

const bodyFont = Josefin_Sans({ subsets: ["latin"], variable: "--wedding-default-font-body", display: "swap" });
const headingFont = Cormorant_Garamond({ subsets: ["latin"], variable: "--wedding-default-font-heading", display: "swap" });
const scriptFont = Sacramento({ weight: "400", subsets: ["latin"], variable: "--wedding-default-font-script", display: "swap" });
const arabicFont = Noto_Naskh_Arabic({ subsets: ["arabic"], variable: "--wedding-default-font-arabic", display: "swap" });

export function WeddingDefaultTemplate({ invitation, content, moduleContent, media = [], theme, preview = false }: InvitationTemplateProps<WeddingRenderModel>) {
  const { opened } = useInvitationExperience();
  const viewModel: WeddingDefaultViewModel = { ...invitation, ...content, content: content.copy };
  const events = [...content.events].sort((left, right) => left.sortOrder - right.sortOrder);
  const mainEvent = events[0];
  const cover = moduleRegistry.cover.schema.parse(moduleContent.modules.cover);
  const countdown = moduleRegistry.countdown.schema.parse(moduleContent.modules.countdown);
  const video = moduleRegistry.video.schema.parse(moduleContent.modules.video);
  const rsvp = moduleRegistry.rsvp.schema.parse(moduleContent.modules.rsvp);
  const wishes = moduleRegistry.wishes.schema.parse(moduleContent.modules.wishes);
  const gift = moduleRegistry.gift.schema.parse(moduleContent.modules.gift);
  const maps = moduleRegistry.maps.schema.parse(moduleContent.modules.maps);
  const hasGallery = isModuleEnabled(moduleContent, "gallery") && content.gallery.length > 0;
  const hasGift = isModuleEnabled(moduleContent, "gift") && hasPublicGift(gift);
  const coupleNames = `${content.couple.partnerOne.nickname} & ${content.couple.partnerTwo.nickname}`;

  return <div className={`${styles.root} ${bodyFont.variable} ${headingFont.variable} ${scriptFont.variable} ${arabicFont.variable}`} data-template="wedding-default@1" data-theme={`${theme.key}@${theme.version}`} data-pattern={theme.tokens.backgroundPattern} data-ornament={theme.tokens.ornament} data-opened={opened ? "true" : "false"} style={themeCssVariables(theme)}>
    <Suspense fallback={<div className={styles.coverFallback}>Menyiapkan undangan…</div>}>
      <WelcomeCover invitation={viewModel} event={mainEvent} eyebrow={cover.eyebrow} title={cover.title} />
    </Suspense>
    <main>
      <HeroSection invitation={viewModel} event={mainEvent} />
      <GreetingSection text={content.copy.openingText} />
      <CoupleSection invitation={viewModel} media={media} />
      <QuoteSection invitation={viewModel} />
      <EventSection events={events} showMapLinks={isModuleEnabled(moduleContent, "maps")} />
      {isModuleEnabled(moduleContent, "countdown") ? <CountdownSection event={mainEvent} label={countdown.label} /> : null}
      <StorySection story={content.copy.story} />
      <GallerySection gallery={content.gallery} coupleNames={coupleNames} media={media} />
      {isModuleEnabled(moduleContent, "video") ? <VideoSection video={video} /> : null}
      {isModuleEnabled(moduleContent, "rsvp") && rsvp.enabled ? <RsvpSection invitationId={invitation.id} preview={preview} /> : null}
      {hasGift ? <GiftSection gift={gift} /> : null}
      {isModuleEnabled(moduleContent, "wishes") && wishes.enabled ? <WishesSection invitationId={invitation.id} preview={preview} /> : null}
      {isModuleEnabled(moduleContent, "maps") ? <MapsSection events={events} config={maps} /> : null}
    </main>
    <ClosingSection invitation={viewModel} />
    <BottomNavigation visible={opened} hasGallery={hasGallery} hasGift={hasGift} />
  </div>;
}
