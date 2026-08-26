import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("production persistence and auth boundary", () => {
  it("does not mount demo or localStorage persistence in the production app tree", () => {
    const layout = source("src/app/layout.tsx");
    expect(layout).not.toMatch(/DemoProvider|localStorage|createDemoRuntime/);
    expect(source("src/app/login/page.tsx")).toMatch(/loginAction|Supabase Auth/);
  });

  it("keeps service-role usage server-only and never public-prefixed", () => {
    expect(source("src/lib/supabase/admin.ts")).toMatch(/server-only/);
    expect(source("src/lib/supabase/admin.ts")).not.toMatch(/NEXT_PUBLIC_SUPABASE_SERVICE/);
    expect(source("..\\..\\.env.example")).toMatch(/^SUPABASE_SERVICE_ROLE_KEY=$/m);
  });

  it("reauthorizes server mutations through profile guards and application services", () => {
    expect(source("src/app/actions/invitations.ts")).toMatch(/requireProfile/);
    expect(source("src/app/actions/admin.ts")).toMatch(/requireAdmin/);
    expect(source("src/app/actions/invitations.ts")).toMatch(/InvitationApplicationService/);
  });

  it("keeps media on controlled same-origin optimized image paths", () => {
    const image = source("src/templates/renderers/daztore-inv1/components/ThemeImage.tsx");
    expect(image).toMatch(/next\/image/);
    expect(image).not.toMatch(/unoptimized|loader=/);
    expect(image).toMatch(/\/api\/public-media\//);
  });
});
