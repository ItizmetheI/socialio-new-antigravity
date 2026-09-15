// Preview-only escape hatch: lets the dashboard be browsed with fixture data
// before the client hands over real Supabase credentials. Set VITE_TEST_MODE
// in .env.local (never committed — .env* is gitignored) to turn it on; leave
// it unset in every real deployment.
export const TEST_MODE = import.meta.env.VITE_TEST_MODE === "true";
