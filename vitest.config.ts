import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Run every test in a zone west of UTC so date-only bugs ("2026-09-30"
// parsed as UTC midnight -> shown as Sept 29) actually fail here instead of
// passing silently on a UTC CI runner. Set before workers spawn so they
// inherit it.
process.env.TZ = "America/New_York";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    // ponytail: forks timed out starting jsdom on this OneDrive checkout; threads start fine.
    pool: "threads",
    setupFiles: ["src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    env: { TZ: "America/New_York", VITE_TEST_MODE: "false" },
  },
});
