export type StoryPrivacyState = "MINOR" | "ADULT" | "UNKNOWN";
export type SupportedStoryEventType = "GOAL" | "YELLOW_CARD" | "RED_CARD";
export type StoryTeamSide = "home" | "away";

export type CanonicalStoryEventInput = {
  eventId: string;
  type: unknown;
  status: unknown;
  teamSide: unknown;
  minute: unknown;
  playerName?: unknown;
  privacyState: StoryPrivacyState;
};

export type PublicStoryEvent = {
  eventId: string;
  type: "GOAL" | "YELLOW" | "RED";
  minute: number | null;
  teamSide: StoryTeamSide;
  publicSafeText: string;
  period: "FIRST_HALF" | "SECOND_HALF" | null;
  maskedPlayerName: string | null;
};

export type StoryDiagnostic = {
  eventId: string | null;
  reason: "INVALID_STATUS" | "UNSUPPORTED_TYPE" | "INVALID_TEAM_SIDE" |
    "INVALID_MINUTE" | "INVALID_EVENT_ID" | "CONFLICTING_DUPLICATE_EVENT_ID";
};
