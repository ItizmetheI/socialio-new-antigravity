import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth } = vi.hoisted(() => ({
  auth: {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    signOut: vi.fn(),
  },
}));
vi.mock("../supabase", () => ({ supabase: { auth }, isSupabaseConfigured: true }));
vi.mock("../testMode/flag", () => ({ TEST_MODE: false }));

import { AuthProvider, useAuth } from "./AuthContext";

const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;

async function renderAuth() {
  const hook = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
  return hook.result;
}

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.getSession.mockResolvedValue({ data: { session: null } });
    auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  });

  it("trims the email before signing in", async () => {
    auth.signInWithPassword.mockResolvedValue({ error: null });
    const result = await renderAuth();
    let outcome: { error: string | null } | undefined;
    await act(async () => {
      outcome = await result.current.signIn("  me@example.com \n", " pass with spaces ");
    });
    // Password is passed through untouched — spaces can be part of it.
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: "me@example.com", password: " pass with spaces " });
    expect(outcome).toEqual({ error: null });
  });

  it("turns a bare 'Failed to fetch' into a readable message", async () => {
    auth.signInWithPassword.mockResolvedValue({ error: { message: "Failed to fetch" } });
    const result = await renderAuth();
    let outcome: { error: string | null } | undefined;
    await act(async () => {
      outcome = await result.current.signIn("me@example.com", "pw");
    });
    expect(outcome?.error).toMatch(/^Couldn't reach the sign-in server/);
  });

  it("passes other auth errors through unchanged", async () => {
    auth.signInWithPassword.mockResolvedValue({ error: { message: "Invalid login credentials" } });
    const result = await renderAuth();
    let outcome: { error: string | null } | undefined;
    await act(async () => {
      outcome = await result.current.signIn("me@example.com", "wrong");
    });
    expect(outcome).toEqual({ error: "Invalid login credentials" });
  });

  it("trims the email and full name on sign-up", async () => {
    auth.signUp.mockResolvedValue({ error: null });
    const result = await renderAuth();
    await act(async () => {
      await result.current.signUp(" new@example.com ", "pw", "  Ada Lovelace ");
    });
    expect(auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({ email: "new@example.com", options: expect.objectContaining({ data: { full_name: "Ada Lovelace" } }) }),
    );
  });

  it("throws when used outside the provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow("useAuth must be used within an AuthProvider");
  });
});
