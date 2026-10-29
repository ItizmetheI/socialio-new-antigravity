import { describe, expect, it } from "vitest";
import { PUBLIC_PATHS, headTags, pageMeta } from "./pages";
import { servicesData } from "../data/services";

describe("page metadata", () => {
  it("covers every public page and every service page", () => {
    for (const p of ["/", "/services", "/pricing", "/about", "/contact", "/terms", "/privacy"]) expect(PUBLIC_PATHS).toContain(p);
    for (const s of servicesData) expect(PUBLIC_PATHS).toContain(`/service/${s.id}`);
  });

  it("gives each public page its own title, description and trailing-slash canonical", () => {
    const about = pageMeta("/about");
    expect(about.title).toBe("About Us | Socialio");
    expect(about.description.length).toBeGreaterThan(50);
    expect(about.canonical).toBe("https://socialio.io/about/");
    expect(about.noindex).toBe(false);
    expect(pageMeta("/about/").canonical).toBe("https://socialio.io/about/");
    expect(pageMeta("/").title).toBe("Productized Growth Marketing for Ambitious Brands");
  });

  it("keeps dashboards, checkout and unknown pages out of search", () => {
    for (const p of ["/app", "/app/account", "/ops/clients", "/checkout", "/set-password", "/nope"]) {
      expect(pageMeta(p).noindex).toBe(true);
    }
  });

  it("escapes text in the generated head", () => {
    const html = headTags("/compare");
    expect(html).toContain("<title>Compare Socialio vs. Agencies &amp; In-House | Socialio</title>");
    expect(html).toContain('<meta name="robots" content="index, follow" />');
    expect(html).toContain('<script type="application/ld+json">');
  });
});
