import { Suspense, type ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { motion } from "motion/react";
import NavBar from "./NavBar";
import AuthWorkShowcase from "./AuthWorkShowcase";

// Log in / sign up / forgot password share one route layout: the site nav on
// top, the form on the left, and on wide screens the work itself (real
// showcase clips). It stays mounted while moving between those pages, so
// only the form changes — the clips don't reload and nothing flashes.
export function AuthShell() {
  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <main className="min-h-screen pt-20 grid lg:grid-cols-2">
        <div className="flex items-center justify-center px-5 py-12 md:py-16">
          <Suspense fallback={null}>
            <Outlet />
          </Suspense>
        </div>
        <div className="hidden lg:block p-6 pl-0 h-[calc(100vh-5rem)] sticky top-20">
          <AuthWorkShowcase />
        </div>
      </main>
    </div>
  );
}

// Each auth page's form column, fading in as the page changes.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="w-full max-w-sm">
      {children}
    </motion.div>
  );
}
