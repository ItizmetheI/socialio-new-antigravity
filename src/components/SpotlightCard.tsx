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
  spotlightColor = "rgba(139, 92, 246, 0.2)"
}: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const { current } = ref;
    if (current) {
      const rect = current.getBoundingClientRect();
      mouseX.set(e.clientX - rect.left);
      mouseY.set(e.clientY - rect.top);
    }
  }

  return (
    <div 
      className={`relative overflow-hidden rounded-[14px] group ${className}`}
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-[inherit] opacity-0 transition-opacity duration-500 group-hover:opacity-100 z-10"
        style={{
          background: useMotionTemplate`radial-gradient(500px circle at ${mouseX}px ${mouseY}px, ${spotlightColor}, transparent 40%)`
        }}
      />
      <div className="relative z-20 h-full w-full bg-surface-container/80 backdrop-blur-sm border border-white/5 rounded-[inherit]">
        {children}
      </div>
    </div>
  );
}
