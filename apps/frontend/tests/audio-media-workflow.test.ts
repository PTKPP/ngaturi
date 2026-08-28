import { describe, expect, it } from "vitest";
import { detectAudioSignature } from "@/invitation-media/client-audio";
import { InvitationMusicSchema, resolveInvitationMusic } from "@/invitation-music/registry";

describe("invitation audio media workflow", () => {
  it("recognizes the supported MP3 and M4A container signatures", () => {
    expect(detectAudioSignature(new Uint8Array([0x49, 0x44, 0x33, 4]))).toBe("id3");
    expect(detectAudioSignature(new Uint8Array([0xff, 0xfb, 0x90, 0x64]))).toBe("mpeg-frame");
    expect(detectAudioSignature(new Uint8Array([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x4d, 0x34, 0x41, 0x20]))).toBe("mp4-ftyp");
    expect(detectAudioSignature(new Uint8Array([0x52, 0x49, 0x46, 0x46]))).toBeNull();
  });

  it("resolves custom music through the controlled same-origin route", () => {
    const mediaId = "7ab6d9dc-73ef-4da8-8e70-713a0cc53b30";
    const music = InvitationMusicSchema.parse({ trackId: "custom", mediaId, title: "Lagu kami", startAtSeconds: 0, volume: 0.4, loop: true });
    expect(resolveInvitationMusic(music)?.source).toBe(`/api/public-audio/${mediaId}`);
    expect(() => InvitationMusicSchema.parse({ ...music, trackId: "ambient-soft" })).toThrow();
  });
});
