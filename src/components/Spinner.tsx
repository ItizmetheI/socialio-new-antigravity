import React from "react";

export default function Spinner({ className = "w-8 h-8" }: { className?: string }) {
  return <div className={`${className} border-2 border-white/20 border-t-primary rounded-full animate-spin`} />;
}

export function FullScreenSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Spinner />
    </div>
  );
}
