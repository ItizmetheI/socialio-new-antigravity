import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { pageMeta } from "./pages";

const setMeta = (attr: "name" | "property", key: string, content: string) => {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
};

// Keeps <head> in step with the page as people click around. Each page's
// first load already has the right tags baked in by the build; this only
// matters after in-app navigation (and for the private pages' noindex).
export function usePageMeta() {
  const { pathname } = useLocation();
  useEffect(() => {
    const m = pageMeta(pathname);
    document.title = m.title;
    setMeta("name", "description", m.description);
    setMeta("name", "robots", m.noindex ? "noindex, nofollow" : "index, follow");
    setMeta("property", "og:title", m.title);
    setMeta("property", "og:description", m.description);
    setMeta("property", "og:url", m.canonical);
    setMeta("name", "twitter:title", m.title);
    setMeta("name", "twitter:description", m.description);
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = m.canonical;
    document.head.querySelectorAll('script[type="application/ld+json"]').forEach((el) => el.remove());
    for (const data of m.jsonLd) {
      const el = document.createElement("script");
      el.type = "application/ld+json";
      el.textContent = JSON.stringify(data);
      document.head.appendChild(el);
    }
  }, [pathname]);
}
