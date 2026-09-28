import { beforeEach, describe, expect, it, vi } from "vitest";

const { insert, from } = vi.hoisted(() => {
  const insert = vi.fn();
  return { insert, from: vi.fn(() => ({ insert })) };
});
vi.mock("./supabase", () => ({ supabase: { from } }));

import { subscribeToNewsletter } from "./newsletter";

describe("subscribeToNewsletter", () => {
  beforeEach(() => {
    insert.mockReset().mockResolvedValue({ error: null });
    from.mockClear();
  });

  it.each(["", "   ", "not-an-email", "a@b", "a b@c.com", "@x.com"])("rejects %j without hitting the network", async (email) => {
    expect(await subscribeToNewsletter(email)).toBe("Enter a valid email address.");
    expect(insert).not.toHaveBeenCalled();
  });

  it("trims and lowercases before inserting", async () => {
    expect(await subscribeToNewsletter("  Name@Example.COM ")).toBeNull();
    expect(from).toHaveBeenCalledWith("newsletter_signups");
    expect(insert).toHaveBeenCalledWith({ email: "name@example.com" });
  });

  it("treats an existing signup (23505) as success", async () => {
    insert.mockResolvedValue({ error: { code: "23505", message: "duplicate key" } });
    expect(await subscribeToNewsletter("a@b.co")).toBeNull();
  });

  it("returns a generic message for any other error", async () => {
    insert.mockResolvedValue({ error: { code: "42501", message: "permission denied" } });
    expect(await subscribeToNewsletter("a@b.co")).toBe("Something went wrong. Try again.");
  });
});
