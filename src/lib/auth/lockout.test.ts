import { expect, test } from "vitest";
import { lockoutSeconds } from "./lockout";

test("locks out at every 5th failure, doubling up to 5 minutes", () => {
  expect([1, 2, 3, 4].map(lockoutSeconds)).toEqual([0, 0, 0, 0]);
  expect(lockoutSeconds(5)).toBe(30);
  expect(lockoutSeconds(6)).toBe(0);
  expect(lockoutSeconds(10)).toBe(60);
  expect(lockoutSeconds(15)).toBe(120);
  expect(lockoutSeconds(30)).toBe(300);
});
