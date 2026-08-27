import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("invitation experience Server/Client boundary", () => {
  it("passes serializable JSX children from the server renderer into the client shell", () => {
    const renderer = source("src/templates/renderer.tsx");
    const shell = source("src/templates/shared/InvitationExperienceShell.tsx");

    expect(renderer).not.toMatch(/^\s*["']use client["']/m);
    expect(renderer).toMatch(/<InvitationExperienceShell[\s\S]*<Component/);
    expect(renderer).not.toMatch(/\{\s*\([^)]*experience[^)]*\)\s*=>/);
    expect(renderer).not.toContain("experience={experience}");
    expect(shell).toContain("children: ReactNode");
    expect(shell).not.toMatch(/children\s*\([^)]*\)\s*:/);
    expect(shell).not.toContain("children({");
  });

  it("keeps the opening gesture and music state inside client components", () => {
    const button = source("src/templates/shared/InvitationOpenButton.tsx");
    const shell = source("src/templates/shared/InvitationExperienceShell.tsx");

    expect(button).toMatch(/onClick=\{openInvitation\}/);
    expect(shell).toMatch(/const openInvitation = useCallback\([\s\S]*void playMusic\(\)/);
    expect(shell).toMatch(/await audio\.play\(\)/);
    expect(shell).toMatch(/InvitationExperienceContext\.Provider/);
  });
});
