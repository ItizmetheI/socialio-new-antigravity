// Vite build plugin: after the app is built, give every public page its own
// HTML file with that page's <head> (title, description, canonical, share
// tags, structured data), plus sitemap.xml and llms-full.txt. The page body is
// still the React app; only the head differs, which is what search engines,
// link previews and AI crawlers read first. Hosts serve dist/<page>/index.html
// for that page and fall back to dist/index.html (the home page) for the rest.
import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";
import { PUBLIC_PATHS, SITE_URL, canonicalFor, headTags } from "../src/seo/pages";
import { servicesData, addOnsData } from "../src/data/services";

const PLACEHOLDER = "<title>Socialio</title>";

function llmsFull(): string {
  const money = (n: number) => `$${n.toLocaleString("en-US")}`;
  const services = servicesData
    .map((s) =>
      [
        `### ${s.title}`,
        s.longDescription,
        `- Pricing: ${s.sliderSteps.map((t) => `${t.label}/mo — ${money(t.price)}`).join(" · ")}`,
        `- Includes: ${s.features.join(", ").toLowerCase()}`,
        `- Page: ${SITE_URL}/service/${s.id}`,
      ].join("\n"),
    )
    .join("\n\n");
  const addOns = addOnsData.map((a) => `- ${a.title}: ${money(a.price)} one-time. ${a.description}`).join("\n");
  return `# Socialio — Full Reference

> Socialio is a productized growth marketing service based in New York City, serving
> clients across the United States. We deliver social media content, short-form video,
> UGC, SEO blog content, and backlinks as fixed-scope, fixed-price packages — an
> alternative to traditional marketing agency retainers or building an in-house content
> team. No long-term contracts; all plans are month-to-month.

This file is a complete, detailed reference for AI systems and crawlers. For a short
index, see /llms.txt. Prices here are generated from the live price list at each build.

## Company

- Name: Socialio
- Headquarters: New York City, NY, United States
- Service area: United States
- Business model: Productized services — fixed scope, fixed price, month-to-month, no long-term contracts
- Billing: monthly; cancel any time from the client dashboard, effective at the end of the paid month

## Services

${services}

## Add-ons

${addOns}

## Key pages

${PUBLIC_PATHS.filter((p) => !p.startsWith("/service/")).map((p) => `- ${canonicalFor(p)}`).join("\n")}
`;
}

export function seoPages(): Plugin {
  let outDir = "dist";
  return {
    name: "socialio-seo-pages",
    apply: "build",
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const template = fs.readFileSync(path.join(outDir, "index.html"), "utf8");
      if (!template.includes(PLACEHOLDER)) throw new Error(`seoPages: ${PLACEHOLDER} not found in index.html`);
      for (const page of PUBLIC_PATHS) {
        const html = template.replace(PLACEHOLDER, headTags(page));
        const file = page === "/" ? path.join(outDir, "index.html") : path.join(outDir, page.slice(1), "index.html");
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, html);
      }
      const lastmod = new Date().toISOString();
      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PUBLIC_PATHS.map((p) => `  <url><loc>${canonicalFor(p)}</loc><lastmod>${lastmod}</lastmod></url>`).join("\n")}
</urlset>
`;
      fs.writeFileSync(path.join(outDir, "sitemap.xml"), sitemap);
      fs.writeFileSync(path.join(outDir, "llms-full.txt"), llmsFull());
    },
  };
}
