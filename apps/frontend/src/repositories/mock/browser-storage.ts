import type { StoragePort } from "../contracts";

export function getBrowserStorage(): StoragePort {
  if (typeof window === "undefined") throw new Error("Browser storage hanya tersedia pada client.");
  return window.localStorage;
}
