/**
 * 🔥 팀원 추가 (Callable Function)
 * 
 * 역할:
 * - 팀장만 호출 가능
 * - 인원 제한 검증 (최대 25명)
 * - 중복 이름 방지
 * - 잠금 상태 체크
 * - 트랜잭션으로 동시 추가 방지
 * 
 * 정책:
 * - MAX_MEMBERS = 25 (팀장 포함)
 * - 이름 2~20자
 * - 대소문자 무시 중복 체크
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";

const MAX_MEMBERS = 25; // ✅ 팀장 포함 최대 인원

export const addTeamMember = onCall(
  {
    region: "asia-northeast3",
    cors: true,
    timeoutSeconds: 30,
  },
  async (request) => {
    try {
      // 인증 확인
      if (!request.auth || !request.auth.uid) {
        throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
      }

      const { associationId, teamId, name } = request.data || {};
      const uid = request.auth.uid;

      // 필수 값 검증
      if (!associationId || !teamId || !name) {
        throw new HttpsError(
          "invalid-argument",
          "필수 값이 누락되었습니다: associationId, teamId, name"
        );
      }

      // 이름 정규화 및 검증
      const normalized = String(name).trim().replace(/\s+/g, " ");
      if (normalized.length < 2 || normalized.length > 20) {
        throw new HttpsError("invalid-argument", "이름은 2~20자여야 합니다.");
      }

      const db = getFirestore();
      const teamRef = db.doc(`associations/${associationId}/Teams/${teamId}`);

      // 트랜잭션으로 안전하게 추가
      let newMemberCount = 0;
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(teamRef);
        if (!snap.exists) {
          throw new HttpsError("not-found", "팀을 찾을 수 없습니다.");
        }

        const team = snap.data()!;

        // 팀장 권한 체크
        if (team.captainUid !== uid) {
          throw new HttpsError(
            "permission-denied",
            "팀장만 팀원을 추가할 수 있습니다."
          );
        }

        // 잠금 상태 체크
        if (team.locked === true) {
          throw new HttpsError(
            "failed-precondition",
            "대회 진행으로 잠금 상태입니다. 팀원을 추가할 수 없습니다."
          );
        }

        const members = team.members ?? [];

        // 인원 제한 체크
        if (members.length >= MAX_MEMBERS) {
          throw new HttpsError(
            "failed-precondition",
            `최대 ${MAX_MEMBERS}명까지 등록 가능합니다. (현재: ${members.length}명)`
          );
        }

        // 중복 이름 체크 (대소문자 무시)
        const dup = members.some(
          (m: any) => String(m.name).trim().toLowerCase() === normalized.toLowerCase()
        );
        if (dup) {
          throw new HttpsError("already-exists", "이미 등록된 이름입니다.");
        }

        // 팀원 추가
        newMemberCount = members.length + 1;
        tx.update(teamRef, {
          members: [...members, { name: normalized, role: "player" }],
          updatedAt: FieldValue.serverTimestamp(),
        });
      });

      logger.info("✅ [addTeamMember] 팀원 추가 완료", {
        associationId,
        teamId,
        name: normalized,
        totalMembers: newMemberCount,
        uid,
      });

      return { ok: true, message: "팀원이 추가되었습니다." };
    } catch (error: any) {
      // HttpsError는 그대로 전달
      if (error instanceof HttpsError) {
        logger.warn(`[addTeamMember] HttpsError: ${error.code} - ${error.message}`);
        throw error;
      }

      // 일반 에러는 래핑
      logger.error("❌ [addTeamMember] 오류 발생", {
        error: error?.message || String(error),
        code: error?.code,
        stack: error?.stack,
      });

      throw new HttpsError(
        "internal",
        `팀원 추가 중 오류가 발생했습니다: ${error?.message || "알 수 없는 오류"}`
      );
    }
  }
);
