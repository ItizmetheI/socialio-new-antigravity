import React from 'react';

export default function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`font-display font-bold tracking-tighter flex items-center gap-3 ${className}`}>
      <div className="w-auto h-auto px-2 py-1 rounded-lg bg-primary flex items-center justify-center shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.4)]">
        <span className="text-background text-xl leading-none">S</span>
      </div>
      <span>Socialio</span>
    </div>
  );
}
