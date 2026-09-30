import { expect, test } from "vitest";
import { clientStatus } from "./clientStatus";
import type { ClientOnboarding, Plan, Proposal } from "../lib/database.types";

const onboarding = (status: ClientOnboarding["status"]) => ({ status }) as ClientOnboarding;
const plan = (status: Plan["status"]) => ({ status }) as Plan;
const proposal = (status: Proposal["status"]) => ({ status }) as Proposal;

test("says whose move it is for each client", () => {
  expect(clientStatus(null, null, null, [])).toEqual({ label: "Waiting on their brief", tone: "theirs" });
  expect(clientStatus(onboarding("submitted"), null, null, []).tone).toBe("ours");
  expect(clientStatus(onboarding("reviewed"), null, null, []).label).toBe("Build their plan");
  expect(clientStatus(onboarding("reviewed"), plan("sent"), null, []).tone).toBe("theirs");
  expect(clientStatus(onboarding("reviewed"), plan("changes_requested"), null, []).label).toBe("Revise their plan");
  expect(clientStatus(onboarding("reviewed"), null, proposal("pending"), []).tone).toBe("theirs");
  expect(clientStatus(onboarding("reviewed"), plan("approved"), null, [{ stage: "review" }, { stage: "in_progress" }]).label).toBe("1 with client to review");
  expect(clientStatus(onboarding("reviewed"), plan("approved"), null, [{ stage: "in_progress" }])).toEqual({ label: "1 in the works", tone: "good" });
  expect(clientStatus(onboarding("reviewed"), plan("approved"), null, []).tone).toBe("idle");
});
