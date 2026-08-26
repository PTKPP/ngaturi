import type { WeddingContent } from "./content-schema";

export function createWeddingContentDefaults(prefix: string): WeddingContent {
  return {
    couple: {
      partnerOne: { fullName: "Partner Satu", nickname: "Satu", parentNames: [], photo: "" },
      partnerTwo: { fullName: "Partner Dua", nickname: "Dua", parentNames: [], photo: "" },
    },
    events: [{ id: `${prefix}-event-1`, type: "reception", title: "Acara", date: "2026-12-01", startTime: "10:00", endTime: "12:00", timezone: "Asia/Jakarta", venueName: "Lokasi Acara", address: "Alamat acara", mapUrl: "", sortOrder: 0 }],
    copy: { openingText: "Dengan bahagia kami mengundang Anda.", quote: "", story: "", closingText: "Terima kasih atas doa dan kehadiran Anda.", giftInformation: "" },
    gallery: [], settings: { showGiftInformation: false },
  };
}
