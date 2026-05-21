/**
 * 🔥 팀원 삭제 (Callable Function)
 * 
 * 역할:
 * - 팀장만 호출 가능
 * - 팀장 삭제 방지
 * - 잠금 상태 체크
 * - 트랜잭션으로 동시 삭제 방지
 * 
 * 정책:
 * - 팀장(role: "captain")은 삭제 불가
 * - locked=true면 삭제 불가
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";

export const removeTeamMember = onCall(
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

      const { associationId, teamId, index } = request.data || {};
      const uid = request.auth.uid;

      // 필수 값 검증
      if (!associationId || !teamId || typeof index !== "number") {
        throw new HttpsError(
          "invalid-argument",
          "필수 값이 누락되었습니다: associationId, teamId, index (number)"
        );
      }

      // 인덱스 범위 검증
      if (index < 0 || !Number.isInteger(index)) {
        throw new HttpsError("invalid-argument", "유효하지 않은 인덱스입니다.");
      }

      const db = getFirestore();
      const teamRef = db.doc(`associations/${associationId}/Teams/${teamId}`);

      // 트랜잭션으로 안전하게 삭제
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
            "팀장만 팀원을 삭제할 수 있습니다."
          );
        }

        // 잠금 상태 체크
        if (team.locked === true) {
          throw new HttpsError(
            "failed-precondition",
            "대회 진행으로 잠금 상태입니다. 팀원을 삭제할 수 없습니다."
          );
        }

        const members = team.members ?? [];

        // 인덱스 범위 체크
        if (index >= members.length) {
          throw new HttpsError("out-of-range", "유효하지 않은 인덱스입니다.");
        }

        const target = members[index];
        if (!target) {
          throw new HttpsError("out-of-range", "대상 팀원을 찾을 수 없습니다.");
        }

        // 팀장 삭제 방지
        if (target.role === "captain") {
          throw new HttpsError(
            "failed-precondition",
            "팀장은 삭제할 수 없습니다."
          );
        }

        // 팀원 삭제
        const next = members.filter((_: any, i: number) => i !== index);
        tx.update(teamRef, {
          members: next,
          updatedAt: FieldValue.serverTimestamp(),
        });

        logger.info("✅ [removeTeamMember] 팀원 삭제 완료", {
          associationId,
          teamId,
          removedName: target.name,
          removedIndex: index,
          remainingMembers: next.length,
          uid,
        });
      });

      return { ok: true, message: "팀원이 삭제되었습니다." };
    } catch (error: any) {
      // HttpsError는 그대로 전달
      if (error instanceof HttpsError) {
        logger.warn(`[removeTeamMember] HttpsError: ${error.code} - ${error.message}`);
        throw error;
      }

      // 일반 에러는 래핑
      logger.error("❌ [removeTeamMember] 오류 발생", {
        error: error?.message || String(error),
        code: error?.code,
        stack: error?.stack,
      });

      throw new HttpsError(
        "internal",
        `팀원 삭제 중 오류가 발생했습니다: ${error?.message || "알 수 없는 오류"}`
      );
    }
  }
);
