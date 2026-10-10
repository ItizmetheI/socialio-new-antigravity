import { describe, expect, it } from "vitest";
import { importVaultKey, open, seal } from "../../supabase/functions/_shared/vault.ts";

const keyB64 = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64");

describe("social login vault", () => {
  it("round-trips a secret and never stores it readable", async () => {
    const key = await importVaultKey(keyB64);
    const secret = JSON.stringify({ password: "Hunter2!insta", notes: "codes go to Maya's phone" });
    const blob = await seal(key, secret, "row-1");
    expect(blob.startsWith("v1:")).toBe(true);
    expect(blob).not.toContain("Hunter2");
    expect(await open(key, blob, "row-1")).toBe(secret);
  });

  it("gives a different ciphertext every time (fresh IV)", async () => {
    const key = await importVaultKey(keyB64);
    expect(await seal(key, "same", "row-1")).not.toBe(await seal(key, "same", "row-1"));
  });

  it("refuses a ciphertext moved to another row", async () => {
    const key = await importVaultKey(keyB64);
    const blob = await seal(key, "pw", "row-1");
    await expect(open(key, blob, "row-2")).rejects.toThrow();
  });

  it("refuses a tampered ciphertext or the wrong key", async () => {
    const key = await importVaultKey(keyB64);
    const blob = await seal(key, "pw", "row-1");
    const flipped = blob.slice(0, -4) + (blob.at(-4) === "A" ? "B" : "A") + blob.slice(-3);
    await expect(open(key, flipped, "row-1")).rejects.toThrow();
    const other = await importVaultKey(Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64"));
    await expect(open(other, blob, "row-1")).rejects.toThrow();
  });

  it("rejects a key that isn't 32 bytes", async () => {
    await expect(importVaultKey(Buffer.from("short").toString("base64"))).rejects.toThrow(/32 bytes/);
  });
});
