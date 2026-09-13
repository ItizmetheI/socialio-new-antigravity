import React, { useEffect, useRef } from "react";
import anime from "animejs";

interface LoaderProps {
  onComplete: () => void;
}

export default function Loader({ onComplete }: LoaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    try {
      // A sophisticated timeline using anime.js
      const timeline = anime.timeline({
        easing: "easeOutExpo",
      });

      // 1. Reveal logo with a subtle scale & fade
      timeline.add({
        targets: logoRef.current,
        opacity: [0, 1],
        scale: [0.9, 1],
        duration: 1000,
        easing: "easeOutSine",
      });

      // 2. Animate a sleek SVG line underneath it
      timeline.add({
        targets: pathRef.current,
        strokeDashoffset: [anime.setDashoffset, 0],
        duration: 800,
        easing: "easeInOutSine",
      }, "-=400"); // Start a bit earlier

      // 3. Fade everything out and slide up
      timeline.add({
        targets: containerRef.current,
        opacity: [1, 0],
        translateY: [0, -50],
        duration: 600,
        delay: 400,
        easing: "easeInOutQuad",
        complete: () => {
          if (onComplete) onComplete();
        },
      });

      return () => {
        anime.remove(logoRef.current);
        anime.remove(pathRef.current);
        anime.remove(containerRef.current);
      };
    } catch (error) {
      console.error("Loader animation error:", error);
      if (onComplete) onComplete();
    }
  }, [onComplete]);

  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0 z-[10000] bg-background flex flex-col items-center justify-center pointer-events-none"
    >
      <div className="flex flex-col items-center">
        <img 
          ref={logoRef} 
          src="/logo.png" 
          alt="Socialio Loading" 
          className="h-16 w-auto mb-6 opacity-0" 
        />
        <svg width="200" height="2" viewBox="0 0 200 2" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path 
            ref={pathRef} 
            d="M0 1H200" 
            stroke="url(#paint0_linear)" 
            strokeWidth="2" 
            strokeDasharray="200"
          />
          <defs>
            <linearGradient id="paint0_linear" x1="0" y1="1" x2="200" y2="1" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ddb7ff" stopOpacity="0" />
              <stop offset="0.5" stopColor="#ddb7ff" />
              <stop offset="1" stopColor="#ddb7ff" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}
