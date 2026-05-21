/**
 * 🔥 팀 서비스
 * 
 * 역할:
 * - 내가 속한 팀 조회
 * - 팀 정보 조회
 * - 팀 멤버 조회
 */

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  getDocFromServer,
  getDocsFromServer,
  limit as fsLimit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { updateTeamDocument } from "@/lib/team/updateTeamDocument";
import type { TeamOperationalSettings } from "@/types/teamOperationalSettings";

/**
 * 🔥 내가 속한 팀 ID 목록 조회 (일회성)
 * 
 * 실시간 구독이 필요 없을 때 사용
 * 실시간 구독이 필요하면 useMyTeams 훅 사용
 */
export async function fetchMyTeamIds(uid: string): Promise<string[]> {
  if (!uid) return [];

  const q = query(
    collection(db, "team_members"),
    where("uid", "==", uid), // 🔥 DB 필드명: uid
    where("status", "==", "active")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs
    .map((doc) => doc.data().teamId)
    .filter((teamId): teamId is string => Boolean(teamId));
}

/**
 * 🔥 팀 정보 조회
 */
export async function fetchTeam(teamId: string) {
  if (!teamId) return null;

  const teamDoc = await getDoc(doc(db, "teams", teamId));
  
  if (!teamDoc.exists()) {
    return null;
  }

  /** 문서 본문에 `id` 필드가 있어도 SoT는 항상 문서 ID (Storage 경로·규칙 정합) */
  return {
    ...teamDoc.data(),
    id: teamDoc.id,
  };
}

/** Callable 등 서버 반영 직후 UI 동기화용 — 로컬 캐시 우회 */
export async function fetchTeamFromServer(teamId: string) {
  if (!teamId) return null;

  const teamDoc = await getDocFromServer(doc(db, "teams", teamId));

  if (!teamDoc.exists()) {
    return null;
  }

  return {
    ...teamDoc.data(),
    id: teamDoc.id,
  };
}

/** @deprecated 호환용 별칭 — 신규 코드는 `fetchTeam` 사용 */
export const getTeam = fetchTeam;

/**
 * 팀 운영 설정(settings 맵) 부분 갱신 — 기존 settings 키는 유지(얕은 병합)
 */
export async function updateTeamSettings(teamId: string, patch: TeamOperationalSettings): Promise<void> {
  if (!teamId) return;

  const snap = await getDoc(doc(db, "teams", teamId));
  const prev =
    snap.exists() && snap.data()?.settings && typeof snap.data()?.settings === "object" && !Array.isArray(snap.data()?.settings)
      ? (snap.data()?.settings as Record<string, unknown>)
      : {};

  const nextSettings: TeamOperationalSettings = {
    ...(prev as TeamOperationalSettings),
    ...patch,
  };

  await updateTeamDocument(teamId, { settings: nextSettings });
}

/**
 * 🔥 팀 조회 (ID 또는 슬러그 유추)
 * - 먼저 문서 ID로 조회
 * - 없으면 slug/팀 식별자 필드로 조회 후 첫 번째 결과 반환
 */
export async function fetchTeamByIdOrSlug(idOrSlug: string) {
  if (!idOrSlug) return null;

  // 1) 문서 ID로 직접 조회
  const byId = await fetchTeam(idOrSlug);
  if (byId) return byId;

  // 2) 슬러그 유추 필드로 조회 (필드가 없으면 결과 0 → 안전)
  const candidateFields = ["slug", "teamSlug", "nameId", "handle"];
  for (const field of candidateFields) {
    const q = query(
      collection(db, "teams"),
      where(field, "==", idOrSlug),
      fsLimit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docSnap = snap.docs[0];
      return { ...docSnap.data(), id: docSnap.id };
    }
  }

  return null;
}

/**
 * `fetchTeamByIdOrSlug`와 동일하되 Firestore 서버에서만 읽음 (저장 직후 스냅샷 갱신용).
 */
export async function fetchTeamByIdOrSlugFromServer(idOrSlug: string) {
  if (!idOrSlug) return null;

  const byId = await fetchTeamFromServer(idOrSlug);
  if (byId) return byId;

  const candidateFields = ["slug", "teamSlug", "nameId", "handle"];
  for (const field of candidateFields) {
    const q = query(
      collection(db, "teams"),
      where(field, "==", idOrSlug),
      fsLimit(1)
    );
    const snap = await getDocsFromServer(q);
    if (!snap.empty) {
      const docSnap = snap.docs[0];
      return { ...docSnap.data(), id: docSnap.id };
    }
  }

  return null;
}

/**
 * 🔥 여러 팀 정보 일괄 조회
 */
export async function fetchTeams(teamIds: string[]) {
  if (!teamIds.length) return [];

  const promises = teamIds.map((teamId) => fetchTeam(teamId));
  const teams = await Promise.all(promises);

  return teams.filter((team): team is NonNullable<typeof team> => team !== null);
}
