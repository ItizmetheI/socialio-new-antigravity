import { useEffect, type MouseEvent, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useLenis } from "lenis/react";

export type LegalSection = { id: string; title: string; body: ReactNode };

type Props = {
  title: string;
  effective: string;
  intro: ReactNode;
  summary: string[];
  sections: LegalSection[];
};

// Shared layout for the Terms and Privacy pages: a plain-English summary up
// top, then numbered sections (each with its own #link, so support can point
// someone at "section 8"), and a contents list that stays put on desktop.
export default function LegalPage({ title, effective, intro, summary, sections }: Props) {
  const lenis = useLenis();
  const { hash } = useLocation();

  // The site's smooth scroller ignores plain #links, so jumps go through it.
  // resize() first: it caches page height and would otherwise stop short.
  const jumpTo = (id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    if (lenis) {
      lenis.resize();
      lenis.scrollTo(target, { immediate: true, force: true });
    } else {
      target.scrollIntoView();
    }
  };

  const onContentsClick = (e: MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    history.replaceState(null, "", `#${id}`);
    jumpTo(id);
  };

  // Shared links like /terms#disputes land on that section.
  useEffect(() => {
    if (!hash) return;
    const timer = setTimeout(() => jumpTo(hash.slice(1)), 150);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash, lenis]);

  const contents = (
    <ol className="space-y-1.5 text-sm">
      {sections.map((s, i) => (
        <li key={s.id}>
          <a href={`#${s.id}`} onClick={(e) => onContentsClick(e, s.id)} className="flex gap-2 text-on-surface-variant hover:text-white transition-colors">
            <span className="tabular-nums w-5 shrink-0 text-right">{i + 1}.</span>
            <span>{s.title}</span>
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <div className="pt-32 pb-24 min-h-screen">
      <div className="max-w-6xl mx-auto px-5 md:px-8 grid lg:grid-cols-[14rem_minmax(0,1fr)] gap-x-16">
        <header className="lg:col-start-2 mb-10 max-w-3xl">
          <h1 className="hero-display font-bold text-4xl md:text-5xl tracking-tight text-white mb-3">{title}</h1>
          <p className="text-sm text-on-surface-variant">Effective {effective}</p>
          <div className="text-on-surface/80 leading-relaxed mt-6 space-y-3">{intro}</div>
        </header>

        <nav aria-label="Contents" className="hidden lg:block row-start-2">
          <div className="sticky top-28">
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3">Contents</p>
            {contents}
          </div>
        </nav>

        <div className="row-start-2 lg:col-start-2 max-w-3xl min-w-0">
          <details className="lg:hidden mb-8 rounded-2xl border border-white/10 px-5 py-4">
            <summary className="cursor-pointer text-sm font-bold text-white">Contents ({sections.length} sections)</summary>
            <div className="mt-4">{contents}</div>
          </details>
          <section aria-labelledby="short-version" className="rounded-2xl border border-white/10 bg-surface-container p-6 md:p-7 mb-14">
            <h2 id="short-version" className="font-bold text-white mb-4">The short version</h2>
            <ul className="space-y-2.5 text-on-surface/85 leading-relaxed">
              {summary.map((line) => (
                <li key={line} className="flex gap-3">
                  <span aria-hidden className="mt-2.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-on-surface-variant mt-5">This summary is for convenience. The full text below is what applies.</p>
          </section>

          <div className="space-y-12">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`} className="scroll-mt-28">
                <h2 id={`${s.id}-title`} className="text-xl font-bold text-white mb-4 flex gap-3">
                  <span className="text-on-surface-variant tabular-nums">{i + 1}.</span>
                  <span>{s.title}</span>
                </h2>
                <div className="legal-body text-on-surface/80 leading-relaxed space-y-4">{s.body}</div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
