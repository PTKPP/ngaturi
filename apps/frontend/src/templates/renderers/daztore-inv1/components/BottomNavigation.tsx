"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import styles from "../styles.module.css";
import { ThemeIcon, type ThemeIconName } from "./Icons";

interface NavigationItem {
  id: string;
  label: string;
  icon: ThemeIconName;
}

export function BottomNavigation({ visible, hasGallery, hasGift }: { visible: boolean; hasGallery: boolean; hasGift: boolean }) {
  const items = useMemo<NavigationItem[]>(() => [
    { id: "daztore-home", label: "Home", icon: "home" },
    { id: "daztore-couple", label: "Mempelai", icon: "couple" },
    { id: "daztore-events", label: "Acara", icon: "calendar" },
    ...(hasGallery ? [{ id: "daztore-gallery", label: "Galeri", icon: "photo" as const }] : []),
    ...(hasGift ? [{ id: "daztore-gift", label: "Hadiah", icon: "gift" as const }] : []),
  ], [hasGallery, hasGift]);
  const [active, setActive] = useState(items[0].id);

  useEffect(() => {
    if (!visible || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver((entries) => {
      const current = entries.filter((entry) => entry.isIntersecting).sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
      if (current?.target.id) setActive(current.target.id);
    }, { rootMargin: "-30% 0px -55%", threshold: [0.1, 0.35, 0.7] });
    const sections = items.map((item) => document.getElementById(item.id)).filter((section): section is HTMLElement => section !== null);
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [items, visible]);

  const navigate = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    setActive(id);
  };

  return <nav className={styles.bottomNavigation} data-visible={visible ? "true" : "false"} aria-label="Navigasi undangan">{items.map((item) => <a key={item.id} href={`#${item.id}`} onClick={(event) => navigate(event, item.id)} aria-current={active === item.id ? "location" : undefined}><ThemeIcon name={item.icon} /><span>{item.label}</span></a>)}</nav>;
}
