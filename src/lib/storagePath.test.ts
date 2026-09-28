import { afterEach, describe, expect, it, vi } from "vitest";
import { safeFileName, storagePathFor } from "./storagePath";

describe("safeFileName", () => {
  it.each([
    ["logo é.png", "logo e.png"],
    ["Café Menü.pdf", "Cafe Menu.pdf"],
    ["Brand Guide – 2024.pdf", "Brand Guide - 2024.pdf"],
    ["#1 report%.pdf", "1 report-.pdf"],
    ["photo[1].jpg", "photo-1-.jpg"],
    ["party 🎉.png", "party -.png"],
    ["ｒｅｐｏｒｔ.pdf", "report.pdf"], // full-width letters fold to ASCII
    ["plain-name_v2 (final).png", "plain-name_v2 (final).png"],
  ])("%s -> %s", (input, expected) => {
    expect(safeFileName(input)).toBe(expected);
  });

  it("falls back to 'file' for all non-Latin names", () => {
    expect(safeFileName("日本語.txt")).toBe("file.txt");
    expect(safeFileName("🎉🎉")).toBe("file");
    expect(safeFileName("")).toBe("file");
  });

  it("never produces a hidden (leading-dot) name", () => {
    expect(safeFileName(".env")).toBe("file.env");
    expect(safeFileName("...")).toMatch(/^file/);
  });

  it("cannot escape its folder", () => {
    const name = safeFileName("../../etc/passwd");
    expect(name).not.toContain("/");
    expect(name).not.toMatch(/^\./);
  });

  it("only ever emits characters Supabase Storage accepts", () => {
    for (const input of ['a\\b:c*d?e"f<g>h|i.png', "tab\there.png", "ß ø æ.doc"]) {
      expect(safeFileName(input)).toMatch(/^[\w.() -]+$/);
    }
  });
});

describe("storagePathFor", () => {
  afterEach(() => vi.restoreAllMocks());

  it("is org/folder/timestamp-safeName", () => {
    vi.spyOn(Date, "now").mockReturnValue(1700000000000);
    expect(storagePathFor("org-1", "deliverables", "logo é.png")).toBe("org-1/deliverables/1700000000000-logo e.png");
  });
});

describe("safeFileName leading characters", () => {
  it("drops a leading space left behind by a replaced character", () => {
    expect(safeFileName("– report.pdf")).toBe("report.pdf");
    expect(safeFileName("# notes.txt")).toBe("notes.txt");
  });

  it("never strips real leading letters", () => {
    expect(safeFileName("summer sale.png")).toBe("summer sale.png");
  });
});
