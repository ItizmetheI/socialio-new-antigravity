import { supabase } from "./supabase";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Shared by the footer and Blog signup forms. Returns an error message to
// show, or null on success.
export async function subscribeToNewsletter(rawEmail: string): Promise<string | null> {
  // Lowercased so "Name@x.com" and "name@x.com" hit the same unique row.
  const email = rawEmail.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email)) return "Enter a valid email address.";
  const { error } = await supabase.from("newsletter_signups").insert({ email });
  // A duplicate (already subscribed) counts as success — they don't need to
  // know they'd signed up before.
  if (error && error.code !== "23505") return "Something went wrong. Try again.";
  return null;
}
