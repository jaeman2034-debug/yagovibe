/**
 * 공개 팀 허브 — 가입 멤버 기준 운영진(회장·부회장·운영진·총무 등) 목록.
 * members 서브컬렉션 직접 list 권한 없이도 볼 수 있도록 Callable.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";

const REGION = "asia-northeast3";

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function profileUidForMember(data: Record<string, unknown>, memberDocId: string): string {
  return str(data.userId) || str(data.uid) || memberDocId;
}

/** 멤버 문서 role(+일부 레거시) → 스태프 구분용 정규 키 */
function resolveStaffRoleKey(data: Record<string, unknown>): string | null {
  const raw = String(data.role ?? "member").trim();
  const r = raw.toLowerCase();
  if (r === "owner") return "owner";
  if (r === "vice" || raw === "부팀장") return "vice";
  if (r === "admin") return "admin";
  if (r === "manager") return "manager";
  const rd = str(data.roleDetail);
  if (rd === "부팀장" && r === "member") return "vice";
  return null;
}

function roleLabelForKey(key: string): string {
  if (key === "owner") return "회장";
  if (key === "vice") return "부회장";
  if (key === "admin") return "운영진";
  if (key === "manager") return "총무";
  return "멤버";
}

export type PublicTeamStaffRow = {
  uid: string;
  displayName: string;
  roleKey: string;
  roleLabel: string;
  photoUrl: string | null;
  /** 직책 상세(총무 등) — 배지와 중복되지 않을 때만 */
  subtitle: string | null;
};

export const getPublicTeamStaff = onCall({ region: REGION, maxInstances: 20 }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

  const d = request.data as Record<string, unknown> | undefined;
  const teamId = typeof d?.teamId === "string" ? d.teamId.trim() : "";
  if (!teamId) throw new HttpsError("invalid-argument", "teamId가 필요합니다.");

  const firestore = getFirestore();
  const teamRef = firestore.collection("teams").doc(teamId);
  const teamSnap = await teamRef.get();
  if (!teamSnap.exists) throw new HttpsError("not-found", "팀을 찾을 수 없습니다.");

  const memSnap = await teamRef.collection("members").get();
  const rows: PublicTeamStaffRow[] = [];
  const seen = new Set<string>();

  for (const doc of memSnap.docs) {
    const data = doc.data() as Record<string, unknown>;
    if (data.isDeleted === true) continue;
    const status = String(data.status ?? "active").toLowerCase();
    if (status !== "active") continue;
    const staffKey = resolveStaffRoleKey(data);
    if (!staffKey) continue;

    const profileUid = profileUidForMember(data, doc.id);
    if (seen.has(profileUid)) continue;
    seen.add(profileUid);

    const fromMember =
      str(data.displayName) || str(data.name) || str(data.userName) || str(data.nickname);

    let displayName = fromMember || profileUid;
    let photoUrl: string | null = null;

    try {
      const userSnap = await firestore.collection("users").doc(profileUid).get();
      if (userSnap.exists) {
        const ud = userSnap.data() as Record<string, unknown>;
        const fromUser = str(ud.displayName) || str(ud.name) || str(ud.nickname);
        displayName = fromMember || fromUser || profileUid;
        photoUrl = str(ud.photoURL) || str(ud.avatar) || null;
      }
    } catch (e) {
      logger.warn("[getPublicTeamStaff] user lookup", { profileUid, error: String(e) });
    }

    const roleLabel = roleLabelForKey(staffKey);
    const rd = str(data.roleDetail);
    let subtitle: string | null = null;
    if (rd && rd !== roleLabel && !(staffKey === "vice" && (rd === "부팀장" || rd === "부회장"))) {
      subtitle = rd.slice(0, 120);
    }

    rows.push({
      uid: profileUid,
      displayName,
      roleKey: staffKey,
      roleLabel,
      photoUrl,
      subtitle,
    });
  }

  /** 회장(owner) → 부회장(vice) → 운영진(admin) → 총무(manager) 순 (생활체육 클럽 운영 모델) */
  rows.sort((a, b) => {
    const rank = (x: string) => {
      if (x === "owner") return 0;
      if (x === "vice") return 1;
      if (x === "admin") return 2;
      if (x === "manager") return 3;
      return 9;
    };
    const c = rank(a.roleKey) - rank(b.roleKey);
    if (c !== 0) return c;
    return a.displayName.localeCompare(b.displayName, "ko");
  });

  logger.info("[getPublicTeamStaff] ok", { teamId, count: rows.length, caller: uid });
  return { staff: rows };
});
