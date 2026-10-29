// Search and share metadata for every public page: one source of truth used
// twice. The build (vite.config.ts, seoPages plugin) writes it into a real
// HTML file per page, so Google, link previews and AI crawlers see it without
// running JavaScript; usePageMeta keeps it right while people navigate.
//
// Titles, descriptions, canonical URLs (trailing slash), structured data and
// the private-page noindex carry over unchanged from the previous Astro site
// (socialio-T1), so existing rankings keep pointing at the same pages.
import { servicesData } from "../data/services";

export const SITE_URL = "https://socialio.io";
export const SITE_NAME = "Socialio";
export const OG_IMAGE = `${SITE_URL}/og-image.png`;

type PageType = "WebPage" | "AboutPage" | "ContactPage" | "CollectionPage";
interface PageInfo {
  title: string;
  description: string;
  type?: PageType;
}

const PAGES: Record<string, PageInfo> = {
  "/": {
    title: "Productized Growth Marketing for Ambitious Brands",
    description: "Socialio delivers content, paid acquisition, and SEO as a productized service — no bloated retainers, no agency fluff. Book a free strategy call.",
  },
  "/services": { title: "Services", type: "CollectionPage", description: "Productized social media posts, short-form video, UGC, SEO blog content, and backlinks — priced simply, delivered fast." },
  "/pricing": { title: "Pricing", description: "Simple, transparent pricing for social media posts, short-form video, blog & SEO, and more. No long-term contracts, cancel anytime." },
  "/case-studies": { title: "Case Studies", type: "CollectionPage", description: "Real results from real clients — see how Socialio's content and growth systems drove measurable revenue across SaaS, e-commerce, and more." },
  "/about": { title: "About Us", type: "AboutPage", description: "Socialio productizes the marketing agency model — meet the team behind the fast, fixed-price growth engine for ambitious brands." },
  "/contact": { title: "Contact Us", type: "ContactPage", description: "Book a free 30-minute strategy call with Socialio. We'll audit your current content setup and show you exactly what we'd do differently." },
  "/blog": { title: "The Growth Log — Blog", type: "CollectionPage", description: "Tactical teardowns, frameworks, and actionable essays on scaling revenue through content and growth marketing." },
  "/compare": { title: "Compare Socialio vs. Agencies & In-House", description: "See how Socialio's productized model stacks up against traditional marketing agencies and building an in-house team." },
  "/examples": { title: "Our Work Gallery", type: "CollectionPage", description: "Browse real examples of social posts, short-form videos, UGC, and blog content Socialio has produced for clients." },
  "/reviews": { title: "Client Reviews", type: "CollectionPage", description: "Read verified reviews from companies successfully scaling their content and growth with Socialio." },
  "/industries": { title: "Industries We Serve", description: "See how Socialio drives growth across SaaS, e-commerce, health & wellness, real estate, travel, and professional services." },
  "/privacy": { title: "Privacy Policy", description: "Socialio's privacy policy — how we collect, use, and protect your information." },
  "/terms": { title: "Terms of Service", description: "Socialio's terms of service — the agreement covering your use of our website and growth marketing services." },
};
for (const s of servicesData) {
  PAGES[`/service/${s.id}`] = { title: s.title, description: s.longDescription };
}

// Every page that should be in search, in sitemap order.
export const PUBLIC_PATHS = Object.keys(PAGES);

// Dashboards, sign-in and checkout aren't in PAGES, so they get noindex; the
// host also sends X-Robots-Tag: noindex for them (public/_headers).
export const PRIVATE_PREFIXES = ["/app", "/ops", "/checkout", "/set-password"];

export interface PageMeta {
  title: string; // the full <title>
  description: string;
  canonical: string;
  noindex: boolean;
  jsonLd: object[];
}

const normalize = (path: string) => (path.length > 1 ? path.replace(/\/+$/, "") : path);
export const canonicalFor = (path: string) => (path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}/`);

export function pageMeta(rawPath: string): PageMeta {
  const path = normalize(rawPath);
  const info = PAGES[path];
  // Private pages and anything unknown stay out of search.
  if (!info) {
    return { title: SITE_NAME, description: PAGES["/"].description, canonical: canonicalFor("/"), noindex: true, jsonLd: [] };
  }
  const isHome = path === "/";
  const title = isHome ? info.title : `${info.title} | ${SITE_NAME}`;
  const canonical = canonicalFor(path);
  const jsonLd: object[] = [];
  if (isHome) {
    jsonLd.push({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/icon-512.png`,
      address: { "@type": "PostalAddress", addressLocality: "New York", addressRegion: "NY", addressCountry: "US" },
      areaServed: "US",
      sameAs: ["https://www.facebook.com/share/17oA4Peihv/?mibextid=wwXIfr", "https://www.instagram.com/getsocialio"],
    });
  }
  jsonLd.push({
    "@context": "https://schema.org",
    "@type": info.type ?? "WebPage",
    name: info.title,
    headline: info.title,
    description: info.description,
    url: canonical,
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
  });
  if (!isHome && !path.startsWith("/service/")) {
    jsonLd.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: info.title, item: canonical },
      ],
    });
  }
  return { title, description: info.description, canonical, noindex: false, jsonLd };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// The <head> tags for a page, as HTML. Used by the build.
export function headTags(path: string): string {
  const m = pageMeta(path);
  const imageAlt = `${SITE_NAME} — ${m.title.replace(` | ${SITE_NAME}`, "")}`;
  return [
    `<title>${esc(m.title)}</title>`,
    `<meta name="description" content="${esc(m.description)}" />`,
    `<meta name="robots" content="${m.noindex ? "noindex, nofollow" : "index, follow"}" />`,
    `<link rel="canonical" href="${m.canonical}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:title" content="${esc(m.title)}" />`,
    `<meta property="og:description" content="${esc(m.description)}" />`,
    `<meta property="og:url" content="${m.canonical}" />`,
    `<meta property="og:image" content="${OG_IMAGE}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${esc(imageAlt)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(m.title)}" />`,
    `<meta name="twitter:description" content="${esc(m.description)}" />`,
    `<meta name="twitter:image" content="${OG_IMAGE}" />`,
    ...m.jsonLd.map((d) => `<script type="application/ld+json">${JSON.stringify(d).replace(/</g, "\\u003c")}</script>`),
  ].join("\n    ");
}
