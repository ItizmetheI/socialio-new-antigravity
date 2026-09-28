import type { ReactNode } from "react";
import { motion } from "motion/react";
import NavBar from "./NavBar";
import AuthFeedPanel from "./AuthFeedPanel";

// Log in / sign up / password pages live inside the site: same top nav as
// every marketing page, form card on the left, brand panel beside it on
// wide screens.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <main className="max-w-6xl mx-auto px-5 md:px-6 pt-28 md:pt-32 pb-16 grid lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] gap-10 items-center min-h-screen">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md mx-auto lg:mx-0"
        >
          {children}
        </motion.div>
        <AuthFeedPanel />
      </main>
    </div>
  );
}
