import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  DRIBBLE_CHALLENGE_TEMPLATE_ID,
  DRIBBLE_RULES_VERSION,
  PK_CHALLENGE_TEMPLATE_ID,
  PK_RULES_VERSION,
} from "@/lib/challenge/constants";
import type { DribbleChallengeSubmissionMetadata, PkChallengeSubmissionMetadata } from "@/types/challenge";

export async function createPkChallengeSubmission(
  uid: string,
  score: number,
  metadata: PkChallengeSubmissionMetadata,
  avatarId?: string,
): Promise<string> {
  const ref = await addDoc(collection(db, "challenge_submissions"), {
    schemaVersion: 1,
    challengeId: PK_CHALLENGE_TEMPLATE_ID,
    uid,
    ...(avatarId ? { avatarId } : {}),
    score,
    rulesVersion: PK_RULES_VERSION,
    metadata,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function createDribbleChallengeSubmission(
  uid: string,
  score: number,
  metadata: DribbleChallengeSubmissionMetadata,
  avatarId?: string,
): Promise<string> {
  const ref = await addDoc(collection(db, "challenge_submissions"), {
    schemaVersion: 1,
    challengeId: DRIBBLE_CHALLENGE_TEMPLATE_ID,
    uid,
    ...(avatarId ? { avatarId } : {}),
    score,
    rulesVersion: DRIBBLE_RULES_VERSION,
    metadata,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** 단일 uid의 해당 챌린지 최고 점수 (없으면 null) */
export async function fetchBestScoreForUser(
  challengeId: string,
  targetUid: string,
): Promise<number | null> {
  const q = query(
    collection(db, "challenge_submissions"),
    where("challengeId", "==", challengeId),
    where("uid", "==", targetUid),
    orderBy("score", "desc"),
    limit(1),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const raw = snap.docs[0].data().score;
  return typeof raw === "number" && Number.isFinite(raw) ? raw : null;
}
