import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { createDemoRuntime } from "@/lib/demo-runtime";
import templates from "../../../contracts/dummy-data/templates.json";
import { getTemplateModule, templateRegistry } from "@/templates/registry";
import { TemplateRenderer } from "@/templates/renderer";

describe("template registry", () => {
  beforeEach(() => localStorage.clear());
  it("finds both versioned template modules", () => {
    expect(getTemplateModule("elegant-gold", 1)?.manifest.name).toBe("Elegant Gold");
    expect(getTemplateModule("minimal-white", 1)?.manifest.name).toBe("Minimal White");
  });
  it("keeps the dummy catalogue identical to registered manifests", () => {
    expect(Object.keys(templateRegistry).sort()).toEqual(["elegant-gold@1", "minimal-white@1"]);
    for (const template of templates) {
      expect(getTemplateModule(template.key, template.version)?.manifest).toEqual(template);
    }
  });
  it("renders both themes with the same invitation fixture", () => {
    const invitation = createDemoRuntime(localStorage).invitations.findById("inv_admin_published")!;
    const first = render(<TemplateRenderer invitation={invitation} />);
    expect(first.container.querySelector('[data-template="elegant-gold@1"]')).toBeInTheDocument();
    first.unmount();
    render(<TemplateRenderer invitation={{ ...invitation, templateKey: "minimal-white" }} />);
    expect(document.querySelector('[data-template="minimal-white@1"]')).toBeInTheDocument();
  });
  it("returns a controlled fallback for an unregistered template", () => {
    const invitation = createDemoRuntime(localStorage).invitations.findById("inv_admin_published")!;
    render(<TemplateRenderer invitation={{ ...invitation, templateKey: "missing" }} />);
    expect(screen.getByRole("heading", { name: "Template tidak tersedia" })).toBeInTheDocument();
  });
  it("renders enabled gift information through both themes", () => {
    const invitation = createDemoRuntime(localStorage).invitations.findById("inv_admin_published")!;
    const first = render(<TemplateRenderer invitation={invitation} />);
    expect(first.getByRole("heading", { name: "Hadiah" })).toBeInTheDocument();
    first.unmount();
    render(<TemplateRenderer invitation={{ ...invitation, templateKey: "minimal-white" }} />);
    expect(screen.getByRole("heading", { name: "Hadiah" })).toBeInTheDocument();
  });
});
