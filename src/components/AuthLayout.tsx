import type { ReactNode } from "react";
import { motion } from "motion/react";
import NavBar from "./NavBar";
import AuthProductPreview from "./AuthProductPreview";

// Log in / sign up / password pages: the site nav on top, the form on the
// left, and on wide screens a preview of the dashboard they're signing into.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <main className="min-h-screen pt-20 grid lg:grid-cols-2">
        <div className="flex items-center justify-center px-5 py-12 md:py-16">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="w-full max-w-sm"
          >
            {children}
          </motion.div>
        </div>
        <div className="hidden lg:block p-6 pl-0">
          <AuthProductPreview />
        </div>
      </main>
    </div>
  );
}
