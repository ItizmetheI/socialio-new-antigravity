import { useEffect, type ReactNode } from "react";
import { useLocation, useOutletContext } from "react-router-dom";
import { useLenis } from "lenis/react";
import PageHeader from "../components/workspace/PageHeader";
import type { ClientOutletContext } from "./ClientLayout";
import BillingSection from "./BillingSection";
import BrandSection from "./BrandSection";
import ProfileSection from "./ProfileSection";

const SECTIONS = [
  { id: "billing", label: "Billing" },
  { id: "brand", label: "Brand kit" },
  { id: "profile", label: "Your details" },
];

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-36 pt-10 first:pt-0 pb-12 border-b border-white/10 last:border-b-0">
      <h2 className="font-bold text-white text-lg mb-5">{title}</h2>
      {children}
    </section>
  );
}

// The client's second (and last) page: everything about the account itself
// — billing, brand kit, name and password — on one scroll, with jump links.
export default function AccountPage() {
  const { orgId, orgName } = useOutletContext<ClientOutletContext>();
  const { hash } = useLocation();
  const lenis = useLenis();

  const jumpTo = (id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    // Immediate: an animated jump depends on animation frames and can stall
    // (background tabs throttle them); a jump link should always land.
    // resize() first: Lenis caches the page height, and right after the
    // sections load it can still think the page is one screen tall and
    // clamp the jump to the top.
    if (lenis) {
      lenis.resize();
      // Lenis honours the section's scroll-margin (clears the sticky nav + tabs).
      lenis.scrollTo(target, { immediate: true, force: true });
    }
    else target.scrollIntoView();
  };

  // Old links like /app/brand land here as /app/account#brand. The sections
  // above load their data and grow, so wait until the target stops moving
  // (checked every 100ms, give up after 2s) and then jump.
  useEffect(() => {
    if (!hash) return;
    const id = hash.slice(1);
    let lastTop = -1;
    let stableChecks = 0;
    let checks = 0;
    const timer = setInterval(() => {
      const top = document.getElementById(id)?.offsetTop ?? -1;
      stableChecks = top === lastTop ? stableChecks + 1 : 0;
      lastTop = top;
      checks += 1;
      if ((top >= 0 && stableChecks >= 2) || checks >= 20) {
        clearInterval(timer);
        jumpTo(id);
      }
    }, 100);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash, lenis]);

  return (
    <div className="max-w-5xl">
      <PageHeader title="Account" description="Billing, your brand kit, and your login details." />
      <nav aria-label="Account sections" className="flex flex-wrap gap-2 mb-10">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => jumpTo(s.id)}
            className="px-3.5 py-1.5 rounded-full border border-white/10 text-sm text-on-surface-variant hover:text-white hover:border-white/25 transition-colors"
          >
            {s.label}
          </button>
        ))}
      </nav>
      <Section id="billing" title="Billing">
        <BillingSection orgId={orgId} />
      </Section>
      <Section id="brand" title="Brand kit">
        <BrandSection orgId={orgId} />
      </Section>
      <Section id="profile" title="Your details">
        <ProfileSection orgName={orgName} />
      </Section>
    </div>
  );
}
