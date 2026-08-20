export function createPrototypeId(prefix: string): string {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === "function") return `${prefix}_${cryptoApi.randomUUID()}`;
  if (typeof cryptoApi?.getRandomValues === "function") {
    const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
    return `${prefix}_${Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("")}`;
  }
  return `${prefix}_${new Date().getTime().toString(36)}_${Math.random().toString(36).slice(2, 14)}`;
}
