// Encryption for client social-account logins (social-access Edge Function).
// AES-256-GCM via WebCrypto (Deno and Node both have it). The key lives only
// in the SOCIAL_VAULT_KEY function secret; the database only ever holds
// "v1:<base64(iv || ciphertext+tag)>". The row's id is bound in as
// additional data, so a ciphertext copied onto another row won't decrypt.
// Tested in src/lib/vault.test.ts.

const enc = new TextEncoder();
const dec = new TextDecoder();

const toB64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromB64 = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

// SOCIAL_VAULT_KEY: 32 random bytes, base64.
export async function importVaultKey(b64: string): Promise<CryptoKey> {
  const raw = fromB64(b64.trim());
  if (raw.length !== 32) throw new Error("SOCIAL_VAULT_KEY must be 32 bytes (base64)");
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function seal(key: CryptoKey, plaintext: string, boundTo: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: enc.encode(boundTo) }, key, enc.encode(plaintext)),
  );
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv);
  out.set(ct, iv.length);
  return `v1:${toB64(out)}`;
}

// Throws if the blob was altered, belongs to another row, or the key is wrong.
export async function open(key: CryptoKey, blob: string, boundTo: string): Promise<string> {
  if (!blob.startsWith("v1:")) throw new Error("unknown vault format");
  const bytes = fromB64(blob.slice(3));
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: bytes.slice(0, 12), additionalData: enc.encode(boundTo) },
    key,
    bytes.slice(12),
  );
  return dec.decode(pt);
}
