/**
 * 🔥 팀 가입/초대 수락 Callable 함수 (v1 LOCK - inviteId 기반)
 * 
 * 원칙:
 * - inviteId로만 팀 합류 가능 (팀 정보 직접 전달 금지)
 * - 초대 수락 시 members/{uid} 생성 (role 덮어쓰기 방지)
 * - 중복 가입 방지 (idempotent 처리)
 * - role은 invite에서 가져옴 (admin은 팀 생성 시만)
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { logger } from "firebase-functions";
import * as admin from "firebase-admin";
import { writeAuditLog, extractRequestInfo } from "./utils/auditLog";
import { checkJoinTeamRateLimit } from "./joinTeamRateLimit";
import { writeInviteAuditLog } from "./inviteAuditLog";
import { logInviteJoinSuccess, logInviteJoinFailed } from "./utils/inviteFunnelLog";

const db = getFirestore();

interface JoinTeamRequest {
  inviteId: string; // 🔥 inviteId만 받음
  ua?: string; // 🔥 user-agent (옵션)
}

interface JoinTeamResponse {
  ok: boolean;
  teamId: string;
  alreadyMember: boolean;
}

export const joinTeam = onCall(
  {
    region: "asia-northeast3",
    maxInstances: 10,
  },
  async (request): Promise<JoinTeamResponse> => {
    const { auth, data } = request;

    // 1️⃣ 인증 확인
    if (!auth || !auth.uid) {
      logger.warn("❌ [joinTeam] 인증되지 않은 요청");
      throw new HttpsError("unauthenticated", "AUTH_REQUIRED");
    }

    const uid = auth.uid;
    const { inviteId, ua } = data as JoinTeamRequest;

    // 2️⃣ 입력 검증
    if (!inviteId || !inviteId.trim()) {
      throw new HttpsError("invalid-argument", "INVITE_REQUIRED");
    }

    // 🔥 E-1: joinTeam Rate Limit 체크 (UA + IP 기반)
    const requestInfo = extractRequestInfo((request as any).rawRequest || {});
    const rateLimitCheck = await checkJoinTeamRateLimit(
      requestInfo.ip || "unknown",
      ua || requestInfo.userAgent || "unknown"
    );

    if (!rateLimitCheck.allowed) {
      logger.warn("⚠️ [joinTeam] Rate limit 초과", {
        uid,
        inviteId,
        ip: requestInfo.ip,
        ua: ua || requestInfo.userAgent,
      });
      throw new HttpsError("resource-exhausted", "JOIN_RATE_LIMIT");
    }

    // 🔥 H-2: 이메일 / 도메인 검증 (트랜잭션 전, 읽기-only)
    // 먼저 invite를 읽어서 allowedDomains 확인
    const inviteRef = db.doc(`invites/${inviteId}`);
    const inviteSnap = await inviteRef.get();

    if (!inviteSnap.exists) {
      throw new HttpsError("not-found", "INVITE_NOT_FOUND");
    }

    const invite = inviteSnap.data()!;
    const teamId = invite.teamId;

    // 이메일 검증 (트랜잭션 전에 수행)
    const user = await getAuth().getUser(uid);
    const email = user.email?.toLowerCase() || "";
    const emailVerified = user.emailVerified || false;

    if (!email) {
      throw new HttpsError("failed-precondition", "EMAIL_REQUIRED");
    }

    // 도메인 체크
    if (invite.allowedDomains?.length) {
      const domain = email.split("@")[1];
      const allowed = invite.allowedDomains.includes(domain);

      if (!allowed) {
        logger.warn("⚠️ [joinTeam] 이메일 도메인 제한 위반", {
          uid,
          email,
          domain,
          allowedDomains: invite.allowedDomains,
        });
        throw new HttpsError("permission-denied", "EMAIL_DOMAIN_NOT_ALLOWED");
      }
    }

    // 이메일 인증 체크
    if (invite.requireVerifiedEmail && !emailVerified) {
      logger.warn("⚠️ [joinTeam] 이메일 미인증", { uid, email, emailVerified });
      throw new HttpsError("failed-precondition", "EMAIL_NOT_VERIFIED");
    }

    logger.info("🔥 [joinTeam] 팀 가입 시작", { uid, inviteId });

    const inviteRoleForAudit =
      typeof invite.role === "string" && invite.role.trim()
        ? invite.role.trim()
        : "member";

    // 3️⃣ 트랜잭션으로 가입 처리
    try {
      const result = await db.runTransaction(async (transaction) => {
        // 3-1. invite 재조회 (트랜잭션 내에서 최신 상태 확인)
        const inviteRef = db.doc(`invites/${inviteId}`);
        const inviteSnap = await transaction.get(inviteRef);

        if (!inviteSnap.exists) {
          throw new HttpsError("not-found", "INVITE_NOT_FOUND");
        }

        const invite = inviteSnap.data()!;

        // 3-2. 취소 확인
        if (invite.revoked === true) {
          throw new HttpsError("failed-precondition", "INVITE_REVOKED");
        }

        // 3-3. 만료 시간 확인
        const now = admin.firestore.Timestamp.now();
        if (invite.expiresAt && invite.expiresAt.toMillis() < now.toMillis()) {
          throw new HttpsError("failed-precondition", "INVITE_EXPIRED");
        }

        // 3-4. 사용 횟수 확인
        if (
          typeof invite.maxUses === "number" &&
          typeof invite.usedCount === "number"
        ) {
          if (invite.usedCount >= invite.maxUses) {
            throw new HttpsError("failed-precondition", "INVITE_USED_UP");
          }
        }

        // 3-5. 팀 정보 확인
        const teamId = invite.teamId;
        const role = invite.role || "member";

        // 🔥 role 검증: admin은 팀 생성 시만 가능
        if (role === "admin") {
          logger.warn("⚠️ [joinTeam] admin role은 팀 생성 시만 가능", { uid, teamId });
          throw new HttpsError(
            "permission-denied",
            "admin 권한은 팀 생성 시에만 부여됩니다."
          );
        }

        const teamRef = db.doc(`teams/${teamId}`);
        const memberRef = teamRef.collection("members").doc(uid);

        const [teamSnap, memberSnap] = await Promise.all([
          transaction.get(teamRef),
          transaction.get(memberRef),
        ]);

        if (!teamSnap.exists) {
          throw new HttpsError("not-found", "TEAM_NOT_FOUND");
        }

        const teamData = teamSnap.data()!;

        // 3-6. 팀 상태 확인
        if (teamData.status === "inactive" || teamData.isDeleted === true) {
          throw new HttpsError("failed-precondition", "TEAM_INACTIVE");
        }

        // 3-7. 중복 가입 확인 (idempotent 처리)
        // ✅ 이미 멤버면 idempotent 성공 (좌석 차감 ❌)
        if (memberSnap.exists) {
          logger.info("✅ [joinTeam] 이미 멤버 (idempotent)", { uid, teamId });
          return { ok: true, teamId, alreadyMember: true };
        }

        // 🔥 G-2: 좌석 차감 트랜잭션 (LOCK)
        const { seatLimit, seatUsed } = teamData;

        if (seatUsed >= seatLimit) {
          logger.warn("⚠️ [joinTeam] 좌석 제한 초과", {
            teamId,
            seatUsed,
            seatLimit,
          });
          throw new HttpsError("failed-precondition", "SEAT_LIMIT_REACHED");
        }

        // 3-8. 멤버 문서 생성 (표시명·이메일 — team_members / 멤버 탭과 정렬)
        const authDisplay =
          (user.displayName && user.displayName.trim()) ||
          (user.email ? user.email.split("@")[0]! : "") ||
          "";
        const resolvedMemberName = authDisplay.slice(0, 200) || "이름 없음";
        const memberData: Record<string, unknown> = {
          uid,
          userId: uid,
          role,
          joinedAt: now,
          joinedVia: "invite",
          inviteId,
          status: "active",
          displayName: resolvedMemberName,
          userName: resolvedMemberName,
          name: resolvedMemberName,
        };
        if (user.email) {
          memberData.email = user.email;
        }

        transaction.set(memberRef, memberData);
        logger.info("✅ [joinTeam] members/{uid} 생성", { teamId, uid, role });

        // 🔥 G-2: 좌석 차감 (트랜잭션 내)
        transaction.update(teamRef, {
          seatUsed: admin.firestore.FieldValue.increment(1),
        });

        // 3-9. invite 사용 기록 업데이트
        transaction.update(inviteRef, {
          usedCount: admin.firestore.FieldValue.increment(1),
          lastUsedAt: now,
          lastUsedByUid: uid,
          lastUsedUa: ua || undefined, // 🔥 user-agent 기록
        });

        // 3-10. 역인덱스: team_members 컬렉션 (조회 최적화용)
        const teamMemberRef = db.collection("team_members").doc(`${teamId}_${uid}`);

        const teamMemberSnap = await transaction.get(teamMemberRef);
        if (!teamMemberSnap.exists) {
          const teamMemberData: Record<string, unknown> = {
            teamId,
            uid,
            userId: uid,
            role,
            status: "active",
            createdAt: now,
            displayName: resolvedMemberName,
            userName: resolvedMemberName,
            name: resolvedMemberName,
          };
          if (user.email) {
            teamMemberData.email = user.email;
            teamMemberData.userEmail = user.email;
          }
          transaction.set(teamMemberRef, teamMemberData);
          logger.info("✅ [joinTeam] team_members 생성", { teamId, uid });
        }

        // 3-11. Usage 멤버 수 업데이트
        const usageRef = db.doc(`teams/${teamId}/usage/current`);
        const usageSnap = await transaction.get(usageRef);

        if (usageSnap.exists) {
          const membersRef = db.collection(`teams/${teamId}/members`);
          const membersSnapshot = await transaction.get(membersRef);
          const activeCount = membersSnapshot.docs.filter(
            (doc: any) => doc.data().status === "active"
          ).length;

          transaction.update(usageRef, {
            membersCount: activeCount,
            updatedAt: now,
          });
        } else {
          transaction.set(usageRef, {
            membersCount: 1,
            actionsThisMonth: 0,
            storageMB: 0,
            updatedAt: now,
          });
        }

        return { ok: true, teamId, alreadyMember: false };
      });

      logger.info("✅ [joinTeam] 팀 가입 완료", {
        teamId: result.teamId,
        uid,
        alreadyMember: result.alreadyMember,
      });

      // 🔥 E-5: 초대 사용 로그 기록
      const requestInfo = extractRequestInfo((request as any).rawRequest || {});
      const now = admin.firestore.Timestamp.now();
      await writeInviteAuditLog({
        inviteId,
        event: "used",
        uid,
        ua: ua || requestInfo.userAgent,
        ip: requestInfo.ip,
        timestamp: now,
        metadata: {
          teamId: result.teamId,
          alreadyMember: result.alreadyMember,
        },
      });

      // 🔥 I-2: 합류 성공 이벤트 기록 (서버)
      await logInviteJoinSuccess(
        inviteId,
        result.teamId,
        uid,
        ua || requestInfo.userAgent,
        requestInfo.ip
      );

      // 🔥 L-3: AuditLog 기록 (트랜잭션 성공 이후)
      await writeAuditLog({
        actorUid: uid,
        actorRole: inviteRoleForAudit,
        teamId: result.teamId,
        targetUid: uid,
        targetType: "member",
        action: "member.join",
        summary: `User ${uid} joined team ${result.teamId} via invite ${inviteId}${result.alreadyMember ? " (already member)" : ""}`,
        metadata: {
          inviteId,
          alreadyMember: result.alreadyMember,
          role: inviteRoleForAudit,
        },
        ua: requestInfo.userAgent,
        ip: requestInfo.ip,
      });

      return result;
    } catch (error: any) {
      logger.error("❌ [joinTeam] 팀 가입 실패", {
        uid,
        inviteId,
        error: error.message,
        stack: error.stack,
      });

      // 🔥 I-2: 합류 실패 이벤트 기록 (서버)
      // 실패 로그를 "삼키지 않는 것"이 핵심
      try {
        await logInviteJoinFailed(
          inviteId,
          invite?.teamId || "unknown",
          uid,
          error.code || error.message || "unknown",
          ua || requestInfo.userAgent,
          requestInfo.ip
        );
      } catch (logError) {
        // 로그 기록 실패는 무시 (소프트 실패)
        logger.warn("⚠️ [joinTeam] 이벤트 로그 기록 실패:", logError);
      }

      // HttpsError는 그대로 전달
      if (error instanceof HttpsError) {
        throw error;
      }

      // 기타 에러는 내부 에러로 변환
      throw new HttpsError("internal", "팀 가입 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
  }
);
