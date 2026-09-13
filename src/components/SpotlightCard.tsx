import { ReactNode } from "react";

interface SpotlightCardProps {
  children: ReactNode;
  className?: string;
  spotlightColor?: string; // Kept for prop compatibility, but unused
}

export default function SpotlightCard({
  children,
  className = "",
}: SpotlightCardProps) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div className="relative z-10 h-full w-full bg-surface-container border border-white/5 rounded-[inherit]">
        {children}
      </div>
    </div>
  );
}
