import { describe, expect, it } from "vitest";
import { passwordProblem } from "./password";

describe("passwordProblem", () => {
  it("accepts 8+ characters with a letter and a number", () => {
    expect(passwordProblem("abcdefg1")).toBeNull();
    expect(passwordProblem("Correct horse 9")).toBeNull();
  });
  it("rejects short passwords", () => {
    expect(passwordProblem("abc12")).toBe("Use at least 8 characters.");
  });
  it("rejects letters-only and digits-only", () => {
    expect(passwordProblem("abcdefghij")).toBe("Include at least one letter and one number.");
    expect(passwordProblem("1234567890")).toBe("Include at least one letter and one number.");
  });
});
