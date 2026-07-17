import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const themeRoot = join(process.cwd(), "src/templates/themes/daztore-inv1");
function codeFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? codeFiles(path) : /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

describe("daztore theme boundaries", () => {
  it("contains no storage, repository, backend, Apps Script, external runtime script, or unsafe HTML access", () => {
    const source = codeFiles(themeRoot).map((file) => readFileSync(file, "utf8")).join("\n");
    expect(source).not.toMatch(/localStorage|@\/repositories|invitationService|script\.google|google apps script/i);
    expect(source).not.toMatch(/dangerouslySetInnerHTML|insertAdjacentHTML|\.innerHTML|<script|unpkg\.com|boxicons|\bAOS\b/i);
    expect(source).not.toMatch(/\bfetch\s*\(/);
  });
});
