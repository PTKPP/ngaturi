import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { calculateVariantDimensions } from "@/invitation-media/client-image";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("Daztore image media workflow", () => {
  it("calculates bounded thumbnail, medium, and large dimensions without upscaling", () => {
    expect(calculateVariantDimensions(2400, 1600, 400)).toEqual({ width: 400, height: 267 });
    expect(calculateVariantDimensions(2400, 1600, 900)).toEqual({ width: 900, height: 600 });
    expect(calculateVariantDimensions(1200, 800, 1600)).toEqual({ width: 1200, height: 800 });
  });

  it("keeps binary upload in the browser and sends only signed metadata through the server boundary", () => {
    const contract = source("src/repositories/contracts/media-repository.ts");
    const service = source("src/application/media-service.ts");
    const client = source("src/invitation-media/client-image.ts");
    const adapter = source("src/repositories/supabase/media-repository.ts");
    expect(contract).not.toMatch(/\bFile\b|FormData/);
    expect(service).not.toMatch(/:\s*File\b|FormData/);
    expect(adapter).toMatch(/createSignedUploadUrl/);
    expect(client).toMatch(/uploadToSignedUrl|image\/webp|toBlob/);
    expect(client).not.toMatch(/fetch\([^)]*\/api\/.*upload/);
  });

  it("defines immutable paths, lifecycle transitions, object verification, and deferred deletion in a forward migration", () => {
    const migration = source("../../supabase/migrations/202608270002_daztore_image_media_workflow.sql");
    expect(migration).toMatch(/invitation_media_variants|thumbnail','medium','large/);
    expect(migration).toMatch(/'uploading','processing','ready','failed','delete_pending'/);
    expect(migration).toMatch(/storage\.objects|original_object_mismatch|variant_object_mismatch/);
    expect(migration).toMatch(/stale_invitation_version|media_still_referenced|delete_requested_at/);
    expect(migration).not.toMatch(/delete from public\.invitation_media|storage\.objects[^\n]+delete/i);
  });
});
