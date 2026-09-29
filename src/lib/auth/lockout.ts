const FREE_TRIES = 5;
const FIRST_WAIT_SECONDS = 30;
const MAX_WAIT_SECONDS = 300;

// Seconds to wait after `failures` wrong passwords in a row: none for the
// first four, then 30s at the 5th, doubling at every 5th after (capped at
// 5 minutes). ponytail: a courtesy brake in the browser; the real brute-force
// limits are Supabase Auth's per-IP rate limits (and CAPTCHA once enabled).
export function lockoutSeconds(failures: number): number {
  if (failures < FREE_TRIES || failures % FREE_TRIES !== 0) return 0;
  return Math.min(MAX_WAIT_SECONDS, FIRST_WAIT_SECONDS * 2 ** (failures / FREE_TRIES - 1));
}
