import type { Timestamp } from "firebase/firestore";

/** 팀원 RSVP */
export type RSVPStatus = "going" | "maybe" | "no";

/** 공개 팀 허브 일정 노출 범위 */
export type ScheduledMatchVisibility = "public" | "team";

/**
 * teams/{teamId}/scheduled_matches/{fixtureId}
 */
export type ScheduledMatch = {
  id: string;
  teamId: string;
  title: string;
  description: string;
  location: string;
  startAt: Timestamp;
  endAt?: Timestamp | null;
  visibility: ScheduledMatchVisibility;
  goingCount: number;
  maybeCount: number;
  noCount: number;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

/**
 * teams/{teamId}/scheduled_matches/{fixtureId}/participants/{uid}
 */
export type MatchParticipant = {
  uid: string;
  status: RSVPStatus;
  respondedAt: Timestamp;
};

export type CreateScheduledMatchInput = {
  title: string;
  description?: string;
  location: string;
  startAt: Date;
  endAt?: Date | null;
  visibility: ScheduledMatchVisibility;
};
