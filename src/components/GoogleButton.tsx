import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { TEST_MODE } from "../lib/testMode/flag";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Asks Supabase whether the Google provider is switched on, so the button
// never sends someone to a raw "provider is not enabled" error page.
async function isGoogleEnabled(): Promise<boolean> {
  if (!SUPABASE_URL || !ANON_KEY) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: ANON_KEY } });
    const settings = (await res.json()) as { external?: { google?: boolean } };
    return Boolean(settings.external?.google);
  } catch {
    return false;
  }
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="w-5 h-5" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export default function GoogleButton({ label = "Continue with Google" }: { label?: string }) {
  const [isEnabled, setIsEnabled] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (TEST_MODE) {
      setIsEnabled(false);
      return;
    }
    isGoogleEnabled().then((enabled) => {
      if (isMounted) setIsEnabled(enabled);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleClick = async () => {
    setMessage("");
    if (!isEnabled) {
      setMessage("Google sign-in is being switched on. Use your email below for now.");
      return;
    }
    setIsRedirecting(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/app` },
    });
    if (error) {
      setIsRedirecting(false);
      setMessage("Couldn't reach Google. Try again, or use your email below.");
    }
  };

  return (
    <div>
      <button type="button" onClick={handleClick} disabled={isRedirecting || isEnabled === null} className="btn-secondary w-full py-3.5">
        <GoogleMark />
        {isRedirecting ? "Opening Google..." : label}
      </button>
      {message && <p className="text-xs text-on-surface-variant mt-2 text-center">{message}</p>}
    </div>
  );
}
