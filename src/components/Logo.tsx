import React from 'react';
import { Link } from 'react-router-dom';

export default function Logo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center ${className}`}>
      <img src="https://iili.io/nq7rnqB.png" alt="Socialio" className="h-10 md:h-12 w-auto object-contain" />
    </Link>
  );
}
