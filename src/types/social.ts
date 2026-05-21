import type { Timestamp } from "firebase/firestore";

/** PR-8 — 친구 관계 MVP (계약: docs/architecture/pr-8-social-seed.md) */
export type FriendshipStatus = "pending" | "accepted" | "blocked";

/** Callable `requestFriendship` 응답 (프론트·문서 공유) */
export type RequestFriendshipResponse = {
  ok: boolean;
  status?: "pending_created" | "pending_existing" | "accepted_already" | "pending_incoming_use_accept";
  reason?: string;
};

export interface FriendshipDoc {
  schemaVersion: number;
  /** 정렬된 [uid 작은 값, uid 큰 값] — friendshipId 파생과 동일 */
  users: [string, string];
  requesterUid: string;
  addresseeUid: string;
  status: FriendshipStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** `friendshipId = [uidA, uidB].sort().join("_")` */
export function canonicalFriendshipId(uidA: string, uidB: string): string {
  const a = uidA.trim();
  const b = uidB.trim();
  return a < b ? `${a}_${b}` : `${b}_${a}`;
}

export function sortedFriendUsers(uidA: string, uidB: string): [string, string] {
  const a = uidA.trim();
  const b = uidB.trim();
  return a < b ? [a, b] : [b, a];
}

/** 클라·서버 공통 — Auth uid 형태 가드(엄격 검증 아님) */
export function isPlausibleFirebaseUid(s: string): boolean {
  const t = s.trim();
  return t.length >= 10 && t.length <= 128 && t !== "";
}
