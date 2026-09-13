import { useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";

interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
}

export default function SpotlightCard({
  children,
  className = "",
  spotlightColor = "rgba(183, 109, 255, 0.15)", // Deep violet glow
}: SpotlightCardProps) {
  const boundingRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springX = useSpring(mouseX, { stiffness: 500, damping: 50 });
  const springY = useSpring(mouseY, { stiffness: 500, damping: 50 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!boundingRef.current) return;
    const rect = boundingRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  return (
    <div
      ref={boundingRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative overflow-hidden ${className}`}
    >
      {/* Background radial gradient that follows mouse */}
      <motion.div
        className="pointer-events-none absolute -inset-px z-0 opacity-0 transition duration-300"
        animate={{ opacity: isHovered ? 1 : 0 }}
        style={{
          background: `radial-gradient(600px circle at calc(${springX}px) calc(${springY}px), ${spotlightColor}, transparent 40%)`,
        }}
      />
      {/* The actual content sits above the spotlight */}
      <div className="relative z-10 h-full w-full bg-surface-container/80 backdrop-blur-sm border border-white/5 rounded-[inherit]">
        {children}
      </div>
    </div>
  );
}
