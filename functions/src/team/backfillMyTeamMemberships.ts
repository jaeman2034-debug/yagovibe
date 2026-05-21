import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue, type DocumentReference } from "firebase-admin/firestore";
import { logger } from "firebase-functions";

const REGION = "asia-northeast3";

/** teams/{teamId}/members/{memberDocId} 만 인정 (다른 컬렉션그룹 members 노이즈 제외) */
function teamIdFromTeamsMembersPath(ref: DocumentReference): string | null {
  const parts = ref.path.split("/");
  if (parts.length >= 4 && parts[0] === "teams" && parts[2] === "members") {
    return parts[1] || null;
  }
  return null;
}

type MemberDoc = {
  userId?: string;
  uid?: string;
  role?: string;
  status?: string;
};

function isActiveMember(status: unknown): boolean {
  if (status === undefined || status === null || status === "") return true;
  return String(status).trim().toLowerCase() === "active";
}

function normalizeMemberRole(raw: unknown): "owner" | "admin" | "member" {
  const s = String(raw ?? "member").trim().toLowerCase();
  if (s === "owner") return "owner";
  if (s === "admin") return "admin";
  return "member";
}

/**
 * users/{uid}/teamMemberships · team_members · teams/{teamId}/members/{uid} 백필
 * - 기준: teams/{teamId}/members/* 중 userId/uid가 일치하고 active인 문서
 * - teams.ownerUid / ownerUserId 일치 팀은 항상 병합(owner) — 레거시 팀장 SoT
 * - Storage rules 등이 기대하는 members/{auth.uid} 문서를 merge 생성
 */
export const backfillMyTeamMemberships = onCall(
  { region: REGION, cors: true, maxInstances: 10 },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    try {
      const db = getFirestore();
      const token = request.auth?.token as Record<string, unknown> | undefined;
      const displayNameFromToken =
        typeof token?.name === "string" && token.name.trim()
          ? token.name.trim().slice(0, 200)
          : undefined;

      const byTeamId = new Map<string, { teamId: string; data: MemberDoc }>();

      // 1) 팀 문서 owner* — collectionGroup 인덱스 실패해도 팀장 복구는 반드시 수행
      const [
        ownerUidSnap,
        ownerUserIdSnap,
        ownerIdSnap,
        leaderIdSnap,
        createdBySnap,
      ] = await Promise.all([
        db.collection("teams").where("ownerUid", "==", uid).get(),
        db.collection("teams").where("ownerUserId", "==", uid).get(),
        db.collection("teams").where("ownerId", "==", uid).get(),
        db.collection("teams").where("leaderId", "==", uid).get(),
        db.collection("teams").where("createdBy", "==", uid).get(),
      ]);
      for (const d of [
        ...ownerUidSnap.docs,
        ...ownerUserIdSnap.docs,
        ...ownerIdSnap.docs,
        ...leaderIdSnap.docs,
        ...createdBySnap.docs,
      ]) {
        byTeamId.set(d.id, { teamId: d.id, data: { role: "owner", status: "active" } });
      }

      // 2) collectionGroup 보강 (인덱스·타임아웃 실패 시 owner 병합은 유지)
      try {
        const [memberByUserIdSnap, memberByUidSnap] = await Promise.all([
          db.collectionGroup("members").where("userId", "==", uid).get(),
          db.collectionGroup("members").where("uid", "==", uid).get(),
        ]);
        const rows = [...memberByUserIdSnap.docs, ...memberByUidSnap.docs]
          .map((d) => {
            const teamId = teamIdFromTeamsMembersPath(d.ref);
            const data = d.data() as MemberDoc;
            return { teamId: teamId ?? "", data };
          })
          .filter((r) => Boolean(r.teamId) && isActiveMember(r.data.status));
        for (const row of rows) {
          if (!row.teamId || byTeamId.has(row.teamId)) continue;
          byTeamId.set(row.teamId, row);
        }
      } catch (cgErr) {
        logger.warn("[backfillMyTeamMemberships] collectionGroup skipped", {
          uid,
          err: cgErr instanceof Error ? cgErr.message : String(cgErr),
        });
      }

      const finalRows = [...byTeamId.values()];
      if (finalRows.length === 0) {
        return { ok: true, matchedTeams: 0, upserted: 0, message: "복구할 팀 멤버십이 없습니다." };
      }

      /** 팀당 writes: teamMemberships + team_members + teams/.../members/{uid} → 청크로 500 미만 유지 */
      const CHUNK_SIZE = 120;
      let upserted = 0;

      for (let offset = 0; offset < finalRows.length; offset += CHUNK_SIZE) {
        const slice = finalRows.slice(offset, offset + CHUNK_SIZE);
        const teamRefs = slice.map((r) => db.collection("teams").doc(r.teamId));
        const teamSnaps = teamRefs.length > 0 ? await db.getAll(...teamRefs) : [];
        const snapByTeamId = new Map(slice.map((row, j) => [row.teamId, teamSnaps[j]]));

        const batch = db.batch();

        for (const row of slice) {
          const teamSnap = snapByTeamId.get(row.teamId);
          const teamData = (teamSnap?.exists ? teamSnap.data() : undefined) ?? {};
          const td = teamData as Record<string, unknown>;

          const role = normalizeMemberRole(row.data.role);
          const teamRef = db.collection("teams").doc(row.teamId);

          batch.set(
            db.collection("users").doc(uid).collection("teamMemberships").doc(row.teamId),
            {
              teamId: row.teamId,
              role,
              status: "active",
              teamName: String(td.name ?? ""),
              teamRegion: String(td.region ?? ""),
              teamType: String(td.type ?? "normal"),
              sportType: String(td.sportType ?? td.sport ?? ""),
              joinedAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
              backfilledAt: FieldValue.serverTimestamp(),
              backfillSource: "backfillMyTeamMemberships",
            },
            { merge: true }
          );

          // joinTeam과 동일한 역인덱스 docId (레거시 uid_teamId와 병행 존재 가능 — 신규는 이 형식만 사용)
          batch.set(
            db.collection("team_members").doc(`${row.teamId}_${uid}`),
            {
              teamId: row.teamId,
              userId: uid,
              uid,
              role,
              status: "active",
              joinedAt: FieldValue.serverTimestamp(),
              createdAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
              backfilledAt: FieldValue.serverTimestamp(),
              backfillSource: "backfillMyTeamMemberships",
            },
            { merge: true }
          );

          const memberPayload: Record<string, unknown> = {
            uid,
            userId: uid,
            role,
            status: "active",
            joinedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            backfilledAt: FieldValue.serverTimestamp(),
            backfillSource: "backfillMyTeamMemberships",
          };
          if (displayNameFromToken) {
            memberPayload.displayName = displayNameFromToken;
            memberPayload.userName = displayNameFromToken;
            memberPayload.name = displayNameFromToken;
          }
          batch.set(teamRef.collection("members").doc(uid), memberPayload, { merge: true });

          upserted += 1;
        }

        await batch.commit();
      }

      logger.info("[backfillMyTeamMemberships] completed", {
        uid,
        matchedTeams: finalRows.length,
        upserted,
      });

      return {
        ok: true,
        matchedTeams: finalRows.length,
        upserted,
      };
    } catch (e: unknown) {
      if (e instanceof HttpsError) {
        throw e;
      }
      const msg = e instanceof Error ? e.message : String(e);
      const stack = e instanceof Error ? e.stack : undefined;
      logger.error("[backfillMyTeamMemberships] unhandled", { uid, msg, stack });
      throw new HttpsError("internal", msg || "backfillMyTeamMemberships failed", {
        uid,
        stack,
      });
    }
  }
);
