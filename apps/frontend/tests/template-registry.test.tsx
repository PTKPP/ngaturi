import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { createDemoRuntime } from "@/lib/demo-runtime";
import { getTemplateModule } from "@/templates/registry";
import { TemplateRenderer } from "@/templates/renderer";

describe("template registry", () => {
  beforeEach(() => localStorage.clear());
  it("finds both versioned template modules", () => {
    expect(getTemplateModule("elegant-gold", 1)?.manifest.name).toBe("Elegant Gold");
    expect(getTemplateModule("minimal-white", 1)?.manifest.name).toBe("Minimal White");
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
});
