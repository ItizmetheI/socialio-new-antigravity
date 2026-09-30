import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { useLenis } from "lenis/react";

// Detail opens in a panel over the page instead of a separate page, so
// nobody loses their place (client home, staff Work). Esc, the backdrop or
// the X closes it; focus moves in on open and back to where it was on close.
// Full-screen on phones, like an app sheet.
export default function SidePanel({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const lenis = useLenis();

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    lenis?.stop();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      lenis?.start();
      previousFocus?.focus();
    };
  }, [lenis]);

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={label}>
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/50 cursor-default" />
      <div className="absolute inset-y-0 right-0 w-full sm:max-w-xl bg-background border-l border-white/10 shadow-2xl flex flex-col">
        <div className="flex items-center justify-end px-4 py-3 border-b border-white/10">
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="p-2 rounded-lg text-on-surface-variant hover:text-white hover:bg-white/5">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div data-lenis-prevent className="flex-1 overflow-y-auto overscroll-contain px-5 sm:px-8 py-6">
          {children}
        </div>
      </div>
    </div>
  );
}
