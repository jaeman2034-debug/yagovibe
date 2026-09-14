import { createHash } from "node:crypto";
import type { CanonicalStoryEventInput, PublicStoryEvent, StoryDiagnostic, StoryPrivacyState } from "./publicMatchStoryTypes";

export type BuiltStory = { publicStoryEvents: PublicStoryEvent[]; storyRevision: string; diagnostics: StoryDiagnostic[] };

function maskName(name: unknown, state: StoryPrivacyState): string | null {
  if (state !== "ADULT" || typeof name !== "string") return null;
  const first = Array.from(name.trim())[0];
  return first && /[^\s\x00-\x1f]/u.test(first) ? `${first}OO` : null;
}

function normalize(input: CanonicalStoryEventInput): PublicStoryEvent | StoryDiagnostic {
  const eventId = typeof input.eventId === "string" && input.eventId.trim() ? input.eventId : null;
  if (!eventId) return { eventId: null, reason: "INVALID_EVENT_ID" };
  if (input.status !== "CONFIRMED") return { eventId, reason: "INVALID_STATUS" };
  const type = input.type === "GOAL" ? "GOAL" : input.type === "YELLOW_CARD" ? "YELLOW" :
    input.type === "RED_CARD" ? "RED" : null;
  if (!type) return { eventId, reason: "UNSUPPORTED_TYPE" };
  if (input.teamSide !== "home" && input.teamSide !== "away") return { eventId, reason: "INVALID_TEAM_SIDE" };
  const minute = input.minute;
  if (minute !== null && (typeof minute !== "number" || !Number.isSafeInteger(minute) || minute < 0)) {
    return { eventId, reason: "INVALID_MINUTE" };
  }
  const safeMinute = minute as number | null;
  const state = input.privacyState === "ADULT" || input.privacyState === "MINOR" ? input.privacyState : "UNKNOWN";
  const maskedPlayerName = maskName(input.playerName, state);
  const sideText = input.teamSide === "home" ? "홈팀" : "원정팀";
  const suffix = type === "GOAL" ? "득점" : type === "YELLOW" ? "경고" : "퇴장";
  const publicSafeText = [safeMinute === null ? null : `${safeMinute}분`, sideText, maskedPlayerName, suffix]
    .filter(Boolean).join(" ");
  return { eventId, type, minute: safeMinute, teamSide: input.teamSide, publicSafeText,
    period: safeMinute === null ? null : safeMinute <= 45 ? "FIRST_HALF" : "SECOND_HALF",
    maskedPlayerName };
}

function isDiagnostic(value: PublicStoryEvent | StoryDiagnostic): value is StoryDiagnostic {
  return "reason" in value;
}

export function buildPublicMatchStoryProjection(inputs: readonly CanonicalStoryEventInput[]): BuiltStory {
  const byId = new Map<string, { row: PublicStoryEvent; state: StoryPrivacyState }>();
  const conflicts = new Set<string>();
  const diagnostics: StoryDiagnostic[] = [];
  for (const input of inputs) {
    const row = normalize(input);
    if (isDiagnostic(row)) { diagnostics.push(row); continue; }
    const prior = byId.get(row.eventId);
    const state = input.privacyState === "MINOR" || input.privacyState === "ADULT" ? input.privacyState : "UNKNOWN";
    if (prior && JSON.stringify(prior) !== JSON.stringify({ row, state })) conflicts.add(row.eventId);
    else if (!prior) byId.set(row.eventId, { row, state });
  }
  for (const id of conflicts) {
    byId.delete(id);
    diagnostics.push({ eventId: id, reason: "CONFLICTING_DUPLICATE_EVENT_ID" });
  }
  const entries = [...byId.values()].sort((a, b) =>
    (a.row.minute ?? Number.POSITIVE_INFINITY) - (b.row.minute ?? Number.POSITIVE_INFINITY) ||
    (a.row.eventId < b.row.eventId ? -1 : a.row.eventId > b.row.eventId ? 1 : 0));
  const publicStoryEvents = entries.map(entry => entry.row);
  const revisionInput = entries.map(({ row, state }) => [row.eventId, row.type, row.minute, row.teamSide,
    state, row.publicSafeText, row.period, row.maskedPlayerName]);
  const storyRevision = createHash("sha256").update(JSON.stringify(revisionInput)).digest("hex");
  return { publicStoryEvents, storyRevision, diagnostics };
}
