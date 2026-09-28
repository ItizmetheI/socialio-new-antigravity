import type { ReactNode } from "react";

// One header shape for every dashboard page: title, one line of context,
// and the page's main action on the right.
export default function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 mb-8">
      <div className="min-w-0">
        <h1 className="hero-display font-bold text-2xl md:text-3xl text-white">{title}</h1>
        {description && <p className="text-on-surface-variant text-sm mt-1.5 max-w-xl">{description}</p>}
      </div>
      {action}
    </header>
  );
}
