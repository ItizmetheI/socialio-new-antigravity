import type { UserRole } from "../database.types";
import { ORG_AURORA_ID, ORG_NORTHWIND_ID, TEST_STAFF_ID } from "./fixtures";

const STORAGE_KEY = "socialio-test-identity";

export type TestIdentity = {
  id: string;
  role: UserRole;
  orgId: string | null;
  fullName: string;
  email: string;
};

export const TEST_IDENTITIES = {
  "client-pending": {
    id: "client-aurora",
    role: "client" as UserRole,
    orgId: ORG_AURORA_ID,
    fullName: "Dana Cho",
    email: "dana@aurora-skincare.example",
  },
  "client-approved": {
    id: "client-northwind",
    role: "client" as UserRole,
    orgId: ORG_NORTHWIND_ID,
    fullName: "Sam Okafor",
    email: "sam@northwind-coffee.example",
  },
  internal: {
    id: "staff-morgan",
    role: "internal" as UserRole,
    orgId: null,
    fullName: "Morgan Lee",
    email: "morgan@socialio.io",
  },
  admin: {
    id: TEST_STAFF_ID,
    role: "admin" as UserRole,
    orgId: null,
    fullName: "Priya Nandan",
    email: "priya@socialio.io",
  },
} satisfies Record<string, TestIdentity>;

export type TestIdentityKey = keyof typeof TEST_IDENTITIES;

export function getStoredTestIdentityKey(): TestIdentityKey | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored && stored in TEST_IDENTITIES ? (stored as TestIdentityKey) : null;
}

export function setStoredTestIdentityKey(key: TestIdentityKey | null): void {
  if (key) {
    localStorage.setItem(STORAGE_KEY, key);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}
