"use client";

import type { ReactNode } from "react";
import { useInvitationExperience } from "./InvitationExperienceShell";

export function InvitationOpenButton({ children, className }: { children: ReactNode; className?: string }) {
  const { openInvitation } = useInvitationExperience();
  return <button className={className} type="button" onClick={openInvitation}>{children}</button>;
}
