import { ReactNode, useRef, useState } from "react";
import { motion, useMotionValue, useMotionTemplate } from "motion/react";

interface SpotlightCardProps {
  children: ReactNode;
  className?: string;
  spotlightColor?: string;
}

export default function SpotlightCard({
  children,
  className = "",
  spotlightColor = "rgba(221, 183, 255, 0.1)",
}: SpotlightCardProps) {
  return (
    <div
      className={`relative rounded-lg border border-white/10 bg-surface-container overflow-hidden ${className}`}
    >
      <div className="relative z-10">{children}</div>
    </div>
  );
}
