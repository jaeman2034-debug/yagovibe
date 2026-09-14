import type { FederationMatchStatus } from "./federationMatchOps";

const clientTransitions: Partial<Record<FederationMatchStatus, readonly FederationMatchStatus[]>> = {
  SCHEDULED: ["READY", "POSTPONED", "CANCELLED"],
  READY: ["LIVE", "FIRST_HALF", "POSTPONED", "CANCELLED"],
  LIVE: ["FINISHED", "SUSPENDED"],
  FIRST_HALF: ["HALFTIME", "SUSPENDED"],
  HALFTIME: ["SECOND_HALF", "SUSPENDED"],
  SECOND_HALF: ["FINISHED", "SUSPENDED"],
  FINISHED: ["REVIEW_REQUIRED"],
  REVIEW_REQUIRED: ["CONFIRMED"],
  POSTPONED: ["SCHEDULED"],
  SUSPENDED: ["READY", "CANCELLED"],
};

export function canClientTransitionMatchStatus(from: FederationMatchStatus, to: FederationMatchStatus): boolean {
  return to !== "OFFICIAL" && from !== "OFFICIAL" && (clientTransitions[from]?.includes(to) ?? false);
}

export function isMatchLockedForDirectEdit(status: FederationMatchStatus): boolean {
  return status === "OFFICIAL";
}
