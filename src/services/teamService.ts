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
import { normalizeTeamIdOrSlugParam } from "@/lib/team/resolveTeamIdOrSlugKey";
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

type TeamDocRow = Record<string, unknown> & { id: string };

/**
 * Resolve team by canonical doc id, then derived slugLower (Sprint 1-2).
 * Does not change routes — callers already pass URL param into this helper.
 *
 * Order:
 * 1) teams/{idOrSlug} document id (canonical)
 * 2) teams where slugLower == normalized
 * 3) teams where slug == raw (legacy / exact display form)
 */
async function resolveTeamByIdOrSlug(
  idOrSlug: string,
  opts: { fromServer: boolean }
): Promise<TeamDocRow | null> {
  const { raw, slugLower } = normalizeTeamIdOrSlugParam(idOrSlug);
  if (!raw) return null;

  const byId = opts.fromServer ? await fetchTeamFromServer(raw) : await fetchTeam(raw);
  if (byId) return byId as TeamDocRow;

  const teamsCol = collection(db, "teams");

  const bySlugLowerQ = query(teamsCol, where("slugLower", "==", slugLower), fsLimit(1));
  const bySlugLowerSnap = opts.fromServer
    ? await getDocsFromServer(bySlugLowerQ)
    : await getDocs(bySlugLowerQ);
  if (!bySlugLowerSnap.empty) {
    const docSnap = bySlugLowerSnap.docs[0];
    return { ...docSnap.data(), id: docSnap.id } as TeamDocRow;
  }

  // Exact slug match when input casing differs from slugLower normalization edge cases
  if (raw !== slugLower) {
    const bySlugQ = query(teamsCol, where("slug", "==", raw), fsLimit(1));
    const bySlugSnap = opts.fromServer ? await getDocsFromServer(bySlugQ) : await getDocs(bySlugQ);
    if (!bySlugSnap.empty) {
      const docSnap = bySlugSnap.docs[0];
      return { ...docSnap.data(), id: docSnap.id } as TeamDocRow;
    }
  }

  return null;
}

/**
 * 팀 조회 (canonical teamId 또는 public slug)
 * - teamId SoT 문서 ID 우선
 * - 없으면 slugLower (Sprint 1-1 발급 필드)
 */
export async function fetchTeamByIdOrSlug(idOrSlug: string) {
  return resolveTeamByIdOrSlug(idOrSlug, { fromServer: false });
}

/**
 * `fetchTeamByIdOrSlug`와 동일하되 Firestore 서버에서만 읽음 (저장 직후 스냅샷 갱신용).
 */
export async function fetchTeamByIdOrSlugFromServer(idOrSlug: string) {
  return resolveTeamByIdOrSlug(idOrSlug, { fromServer: true });
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
