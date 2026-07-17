import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Josefin_Sans: () => ({ variable: "font-josefin" }),
  Sacramento: () => ({ variable: "font-sacramento" }),
  Noto_Naskh_Arabic: () => ({ variable: "font-naskh" }),
}));

if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

afterEach(cleanup);
