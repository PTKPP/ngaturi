import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import invitations from "../../../contracts/dummy-data/invitations.json";
import templates from "../../../contracts/dummy-data/templates.json";
import themes from "../../../contracts/dummy-data/themes.json";
import { InvitationSchema } from "@/domain";
import { getTemplateModule, templateRegistry } from "@/templates/registry";
import { TemplateRenderer } from "@/templates/renderer";
import { getRegisteredTheme, themeRegistry } from "@/themes/registry";

describe("template registry", () => {
  const invitation = (id: string) => InvitationSchema.parse(invitations.find((item) => item.id === id));
  it("finds all versioned template modules", () => {
    expect(getTemplateModule("wedding-default", 1)?.manifest.name).toBe("Wedding Default");
    expect(getTemplateModule("elegant-gold", 1)?.manifest.name).toBe("Elegant Gold");
    expect(getTemplateModule("minimal-white", 1)?.manifest.name).toBe("Minimal White");
  });
  it("keeps the dummy catalogue identical to registered manifests", () => {
    expect(Object.keys(templateRegistry).sort()).toEqual(["elegant-gold@1", "minimal-white@1", "wedding-default@1"]);
    for (const template of templates) {
      expect(getTemplateModule(template.key, template.version)?.manifest).toEqual(template);
    }
  });
  it("keeps the typed theme catalogue identical to fixtures and compatible with templates", () => {
    expect([...themeRegistry].sort((left, right) => left.key.localeCompare(right.key))).toEqual([...themes].sort((left, right) => left.key.localeCompare(right.key)));
    for (const theme of themes) expect(getTemplateModule(theme.templateKey, theme.templateVersion)).not.toBeNull();
  });
  it("renders both themes with the same invitation fixture", () => {
    const stored = invitation("inv_admin_published");
    const first = render(<TemplateRenderer invitation={stored} />);
    expect(first.container.querySelector('[data-template="elegant-gold@1"]')).toBeInTheDocument();
    first.unmount();
    render(<TemplateRenderer invitation={{ ...stored, templateKey: "minimal-white", themeKey: "minimal-white-default" }} />);
    expect(document.querySelector('[data-template="minimal-white@1"]')).toBeInTheDocument();
  });
  it("returns a controlled fallback for an unregistered template", () => {
    render(<TemplateRenderer invitation={{ ...invitation("inv_admin_published"), templateKey: "missing" }} />);
    expect(screen.getByRole("heading", { name: "Template tidak tersedia" })).toBeInTheDocument();
  });
  it("renders the stored theme while preserving the template layout contract and content", () => {
    const stored = invitation("inv_owner_draft");
    const first = render(<TemplateRenderer invitation={stored} preview />);
    const firstRoot = first.container.querySelector('[data-template="minimal-white@1"]')!;
    expect(firstRoot).toHaveAttribute("data-theme", "minimal-white-default@1");
    expect(firstRoot).toHaveTextContent(String((stored.content.copy as Record<string, unknown>).openingText));
    first.unmount();
    const second = render(<TemplateRenderer invitation={{ ...stored, themeKey: "minimal-white-sage" }} preview />);
    const secondRoot = second.container.querySelector('[data-template="minimal-white@1"]')!;
    expect(secondRoot).toHaveAttribute("data-theme", "minimal-white-sage@1");
    expect(secondRoot.querySelectorAll("header, section, footer")).toHaveLength(firstRoot.querySelectorAll("header, section, footer").length);
    expect(secondRoot).toHaveTextContent(String((stored.content.copy as Record<string, unknown>).openingText));
    expect(getRegisteredTheme("minimal-white-sage", 1)?.tokens.background).not.toBe(getRegisteredTheme("minimal-white-default", 1)?.tokens.background);
  });
  it("renders enabled gift information through both themes", () => {
    const stored = invitation("inv_admin_published");
    const first = render(<TemplateRenderer invitation={stored} />);
    expect(first.getByRole("heading", { name: "Hadiah" })).toBeInTheDocument();
    first.unmount();
    render(<TemplateRenderer invitation={{ ...stored, templateKey: "minimal-white", themeKey: "minimal-white-default" }} />);
    expect(screen.getByRole("heading", { name: "Hadiah" })).toBeInTheDocument();
  });
});
