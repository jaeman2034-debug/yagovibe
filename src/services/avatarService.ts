import { doc, getDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AvatarAppearance } from "@/types/avatar";

export type AvatarOnboardingAppearance = Pick<
  AvatarAppearance,
  "bodyType" | "hair" | "face" | "skinTone" | "outfit" | "shoes"
>;

export interface AvatarOnboardingPayload {
  displayName: string;
  appearance: AvatarOnboardingAppearance;
  /** 1~99, 미입력·무효값이면 문서에 필드 생략 */
  jerseyNumber?: number;
}

/** 온보딩·클라이언트 공통: 유효하면 정수, 아니면 undefined */
export function normalizeAvatarJerseyNumber(n: unknown): number | undefined {
  if (n === null || n === undefined) return undefined;
  let v: number;
  if (typeof n === "number") {
    v = n;
  } else if (typeof n === "bigint") {
    v = Number(n);
  } else if (typeof n === "string") {
    v = Number.parseInt(n.trim(), 10);
  } else {
    v = Number.parseInt(String(n).trim(), 10);
  }
  if (!Number.isFinite(v)) return undefined;
  const k = Math.floor(v);
  if (k < 1 || k > 99) return undefined;
  return k;
}

export async function getAvatarDocExists(uid: string): Promise<boolean> {
  const snap = await getDoc(doc(db, "avatars", uid));
  return snap.exists();
}

/**
 * 온보딩 완료: `avatars/{uid}` 생성 + `users/{uid}.hasCompletedAvatarOnboarding`
 * (Firestore rules와 필드 값이 반드시 일치해야 함)
 */
export async function completeAvatarOnboarding(
  uid: string,
  payload: AvatarOnboardingPayload,
): Promise<void> {
  const avatarRef = doc(db, "avatars", uid);
  const existing = await getDoc(avatarRef);
  if (existing.exists()) {
    throw new Error("avatar_already_exists");
  }

  const batch = writeBatch(db);
  const userRef = doc(db, "users", uid);
  const jersey = normalizeAvatarJerseyNumber(payload.jerseyNumber);

  const avatarWrite: Record<string, unknown> = {
    schemaVersion: 1,
    uid,
    displayName: payload.displayName.trim(),
    appearance: { ...payload.appearance },
    progression: { level: 1, xp: 0, stamina: 100 },
    stats: {
      shooting: 0,
      passing: 0,
      dribbling: 0,
      defense: 0,
      speed: 0,
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (jersey !== undefined) avatarWrite.jerseyNumber = jersey;

  batch.set(avatarRef, avatarWrite);

  batch.set(
    userRef,
    {
      hasCompletedAvatarOnboarding: true,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  await batch.commit();
}
