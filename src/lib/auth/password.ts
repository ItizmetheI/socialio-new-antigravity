// One password rule for sign-up, reset and change-password. Mirrors the
// Supabase Auth policy (min 8, at least one letter and one digit) so people
// hear about it before the server rejects them with its raw message.
export const PASSWORD_RULE = "At least 8 characters, with a letter and a number.";

export function passwordProblem(password: string): string | null {
  if (password.length < 8) return "Use at least 8 characters.";
  if (!/[a-z]/i.test(password) || !/\d/.test(password)) return "Include at least one letter and one number.";
  return null;
}
