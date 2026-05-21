/**
 * 🔥 팀 생성 Callable 함수 (원자적 Atomic 설계)
 * 
 * 핵심 원칙: "팀은 멤버 없이는 존재할 수 없다"
 * 
 * ✅ 필수 사항 (체크리스트):
 * 1. 팀 생성은 서버 only (Cloud Functions)
 * 2. 팀 생성 = owner 멤버 자동 생성 (원자적)
 * 3. members/{uid} = uid 고정 (addDoc 사용 ❌)
 * 4. Transaction 실패 시 팀 생성 ❌ (전체 롤백)
 * 
 * 📐 표준 플로우 (절대 변경 금지):
 * 1. auth 검증 (ownerUid)
 * 2. teamId 생성
 * 3. teams/{teamId} set
 * 4. members/{ownerUid} set (role=owner, accessLevel=OWNER, status=active)
 * 5. team_members 인덱스 set
 * 6. transaction commit (모두 성공해야만 완료)
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import * as admin from "firebase-admin";
// 🔥 auditLog는 지연 import로 변경 (배포 타임아웃 방지)
// import { writeAuditLog, extractRequestInfo } from "./utils/auditLog";
import { initializeApp, getApps } from "firebase-admin/app";

// 🔥 Firebase Admin 초기화 (지연 초기화)
function getDb() {
  if (getApps().length === 0) {
    initializeApp();
  }
  return getFirestore();
}

interface CreateTeamRequest {
  name: string;
  region: string;
  sportType?: string; // 기본값: "football"
  teamType?: "club" | "study" | "hobby"; // 🔥 팀 타입 추가
}

interface CreateTeamResponse {
  teamId: string;
  success: boolean;
  message: string;
}

export const createTeam = onCall(
  {
    region: "asia-northeast3",
    cors: true, // 🔥 CORS 활성화 (GET 요청 에러 방지)
    maxInstances: 10,
  },
  async (request): Promise<CreateTeamResponse> => {
    // 🔥 STEP 1: 강제 로그 - 함수 호출 즉시 기록
    logger.info("🔥🔥🔥 [createTeam] ========== 함수 호출 시작 ==========");
    logger.info("[createTeam] called", {
      hasAuth: !!request?.auth,
      hasUid: !!request?.auth?.uid,
      uid: request?.auth?.uid || null,
      hasData: !!request?.data,
      dataKeys: request?.data ? Object.keys(request.data) : [],
      data: request?.data || null,
    });

    const { auth, data } = request;

    // 🔥 데이터 존재 여부 확인 (디버깅)
    if (!data) {
      logger.error("❌ [createTeam] request.data가 없습니다", {
        requestKeys: Object.keys(request),
        hasAuth: !!auth,
        requestType: typeof request,
      });
      throw new HttpsError("invalid-argument", "요청 데이터가 없습니다.");
    }

    // 1️⃣ 인증 확인
    if (!auth || !auth.uid) {
      logger.warn("❌ [createTeam] 인증되지 않은 요청");
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const uid = auth.uid;

    /** Callable JWT — 익명 로그인 시 `firebase.sign_in_provider === "anonymous"` */
    const token = auth.token as Record<string, unknown> | undefined;
    const firebaseMeta = token?.firebase as Record<string, unknown> | undefined;
    const signInProvider =
      typeof firebaseMeta?.sign_in_provider === "string" ? firebaseMeta.sign_in_provider : "";
    const ownerIsAnonymous = signInProvider === "anonymous";
    
    // 🔥 안전한 데이터 추출
    const requestData = data as CreateTeamRequest;
    const name = requestData?.name;
    const region = requestData?.region;
    const sportType = requestData?.sportType || "football";
    const teamType = requestData?.teamType || "club";

    logger.info("[createTeam] 입력 데이터 파싱 완료", { 
      uid, 
      name, 
      region, 
      sportType,
      teamType,
      dataKeys: Object.keys(requestData || {}),
      fullData: requestData,
    });

    // 2️⃣ 입력 검증
    if (!name || typeof name !== "string" || !name.trim()) {
      logger.error("[createTeam] 입력 검증 실패: name 없음 또는 유효하지 않음", {
        name,
        nameType: typeof name,
        data: requestData,
      });
      throw new HttpsError("invalid-argument", "팀 이름을 입력해주세요.");
    }
    if (!region || typeof region !== "string" || !region.trim()) {
      logger.error("[createTeam] 입력 검증 실패: region 없음 또는 유효하지 않음", {
        region,
        regionType: typeof region,
        data: requestData,
      });
      throw new HttpsError("invalid-argument", "활동 지역을 입력해주세요.");
    }

    logger.info("🔥 [createTeam] 팀 생성 시작", { uid, name, region, sportType });

    // 3️⃣ 트랜잭션으로 팀 + 멤버 생성
    logger.info("[createTeam] Firestore DB 초기화 시작");
    const db = getDb();
    logger.info("[createTeam] Firestore DB 초기화 완료");
    
    // 🔥 payload 로깅 (Rules 디버깅용)
    const payloadPreview = {
      name: name.trim(),
      region: region.trim(),
      sportType,
      ownerUid: uid,
      owners: [uid],
      plan: "free",
      seatLimit: 5,
      seatUsed: 1,
      allowManualFee: true,
      status: "active",
      membership: "non-member",
      associationId: null,
      isDeleted: false,
      createdAt: "serverTimestamp()", // 실제 값은 나중에 설정됨
    };
    logger.info("🔍 [createTeam] Payload 구조:", payloadPreview);
    
    try {
      logger.info("🔥🔥🔥 [createTeam] ========== 트랜잭션 시작 ==========");
      logger.info("[createTeam] before write - 트랜잭션 시작 전");
      
      const result = await db.runTransaction(async (transaction) => {
        logger.info("[createTeam] 트랜잭션 내부 진입");
        
        // 🔥 STEP 1: 팀 문서 ID 생성 (참조만 생성, 아직 write 안 함)
        logger.info("[createTeam] 팀 문서 ID 생성 시작");
        const teamRef = db.collection("teams").doc();
        const teamId = teamRef.id;
        logger.info("🔥 [createTeam] 팀 문서 ID 생성 완료", { teamId });

        // 🔥 STEP 2: 모든 READ 작업 먼저 실행 (Firestore transaction 규칙)
        // 2-1. 멤버 문서 존재 여부 확인
        logger.info("[createTeam] members 문서 참조 생성", { teamId, uid });
        const memberRef = db.doc(`teams/${teamId}/members/${uid}`);
        logger.info("[createTeam] members 문서 존재 여부 확인", { teamId, uid });
        const memberSnap = await transaction.get(memberRef);
        logger.info("[createTeam] members 문서 존재 여부 확인 완료", { 
          teamId, 
          uid, 
          exists: memberSnap.exists 
        });
        
        if (memberSnap.exists) {
          logger.warn("⚠️ [createTeam] members/{uid} 이미 존재", { teamId, uid });
          throw new HttpsError(
            "already-exists",
            "이미 이 팀의 멤버입니다."
          );
        }

        // 2-2. team_members 인덱스 존재 여부 확인
        logger.info("[createTeam] team_members 문서 참조 생성", { teamId, uid });
        const teamMemberRef = db.collection("team_members").doc(`${uid}_${teamId}`);
        logger.info("[createTeam] team_members 문서 존재 여부 확인", { teamId, uid });
        const teamMemberSnap = await transaction.get(teamMemberRef);
        logger.info("[createTeam] team_members 문서 존재 여부 확인 완료", { 
          teamId, 
          uid, 
          exists: teamMemberSnap.exists 
        });

        // 🔥 STEP 3: 모든 WRITE 작업 실행 (모든 read 완료 후)
        // 3-1. 팀 문서 데이터 준비
        const plan = "free";
        const seatLimit = 5; // free 플랜 기본값
        const dataRegion = "us"; // 🔥 M-7: 초기엔 기본값 "us"
        
        // 🔥 regionCode 생성: "서울시 노원구" → "SEOUL_NOWON" 형식
        // 간단한 변환: 공백 제거, 대문자 변환, 특수문자 언더스코어로 변환
        const regionCode = region
          .trim()
          .toUpperCase()
          .replace(/\s+/g, "_")
          .replace(/[^A-Z0-9_]/g, "");
        
        const teamData = {
          name: name.trim(),
          type: teamType, // 🔥 팀 타입: "club" | "study" | "hobby"
          sportType,
          sportKey: sportType, // 호환성
          sport: sportType, // 🔥 호환성: 프론트에서 sport 필드로도 조회 가능하도록 추가
          region: region.trim(), // 지역명 (서울시 노원구 등)
          regionCode, // 🔥 Phase 4: 지역 코드 (SEOUL_NOWON 등)
          dataRegion: dataRegion, // 🔥 M-1: 데이터 리전 ("us" | "eu" | "kr")
          ownerUid: uid,
          /** 생성 시점에 익명 Auth였으면 true (계정 연결 후에도 유지 — 분석·지원용) */
          ownerIsAnonymous,
          owners: [uid],
          plan,
          seatLimit, // 🔥 G-0: 플랜별 좌석 제한
          seatUsed: 1, // 🔥 G-0: owner 포함하여 1명
          memberCount: 1, // 🔥 Phase 4: 초기값 1 (onTeamMemberCreate에서 자동 업데이트)
          allowManualFee: true,
          status: "active",
          membership: "non-member", // non-member | pending | member | academy
          associationId: null, // 협회 ID (pending/member일 때만 값 있음)
          isDeleted: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        // 🔥 필수 필드 검증 (저장 전 최종 확인)
        logger.info("🔍 [createTeam] teamData 최종 검증:", {
          teamId,
          name: teamData.name,
          nameType: typeof teamData.name,
          nameLength: teamData.name?.length,
          sportType: teamData.sportType,
          region: teamData.region,
          ownerUid: teamData.ownerUid,
          memberCount: teamData.memberCount,
          regionCode: teamData.regionCode,
          allKeys: Object.keys(teamData),
          teamDataPreview: JSON.stringify(teamData).substring(0, 500),
        });

        if (!teamData.name || typeof teamData.name !== "string" || !teamData.name.trim()) {
          logger.error("❌ [createTeam] teamData.name이 비어있음 또는 유효하지 않음", {
            name: teamData.name,
            nameType: typeof teamData.name,
            originalName: name,
            originalNameType: typeof name,
          });
          throw new HttpsError("invalid-argument", "팀 이름이 비어있습니다.");
        }
        if (!teamData.sportType || typeof teamData.sportType !== "string" || !teamData.sportType.trim()) {
          logger.error("❌ [createTeam] teamData.sportType이 비어있음 또는 유효하지 않음", {
            sportType: teamData.sportType,
            sportTypeType: typeof teamData.sportType,
            originalSportType: sportType,
            originalSportTypeType: typeof sportType,
          });
          throw new HttpsError("invalid-argument", "스포츠 타입이 비어있습니다.");
        }
        if (!teamData.ownerUid || typeof teamData.ownerUid !== "string" || !teamData.ownerUid.trim()) {
          logger.error("❌ [createTeam] teamData.ownerUid가 비어있음 또는 유효하지 않음", {
            ownerUid: teamData.ownerUid,
            ownerUidType: typeof teamData.ownerUid,
            uid: uid,
            uidType: typeof uid,
          });
          throw new HttpsError("invalid-argument", "소유자 UID가 비어있습니다.");
        }

        // 3-2. 팀 문서 write
        logger.info("✅ [createTeam] teams 문서 write 시작", { 
          teamId,
          name: teamData.name,
          sportType: teamData.sportType,
          region: teamData.region,
          memberCount: teamData.memberCount,
        });
        transaction.set(teamRef, teamData);
        logger.info("✅ [createTeam] teams 문서 write 완료", { 
          teamId,
          writtenFields: Object.keys(teamData).length
        });

        // 3-3. 멤버 문서 데이터 준비
        const memberData = {
          uid,
          userId: uid, // Firebase Auth UID 연결 (권한 시스템 표준)
          teamId,
          role: "owner", // canonical: owner | admin | member
          accessLevel: "OWNER", // 하위 호환
          status: "active",
          joinedAt: admin.firestore.FieldValue.serverTimestamp(),
          isDeleted: false,
          ...(ownerIsAnonymous ? { isGuestAccount: true } : {}),
        };

        // 🔥 필수 필드 검증
        if (!memberData.uid || !memberData.uid.trim()) {
          logger.error("❌ [createTeam] memberData.uid가 비어있음");
          throw new HttpsError("invalid-argument", "멤버 UID가 비어있습니다.");
        }
        if (!memberData.teamId || !memberData.teamId.trim()) {
          logger.error("❌ [createTeam] memberData.teamId가 비어있음");
          throw new HttpsError("invalid-argument", "팀 ID가 비어있습니다.");
        }

        // 3-4. 멤버 문서 write
        logger.info("[createTeam] members 문서 write 시작", { teamId, uid });
        transaction.set(memberRef, memberData);
        logger.info("✅ [createTeam] members/{uid} 생성", { 
          teamId, 
          uid,
          writtenFields: Object.keys(memberData).length
        });

        // 3-5. team_members 인덱스 write (존재하지 않는 경우만)
        if (!teamMemberSnap.exists) {
          logger.info("[createTeam] team_members 문서 write 시작", { teamId, uid });
          const teamMemberData = {
            teamId, // 🔥 핵심: teamRef.id와 반드시 일치
            userId: uid, // 🔥 userId만 사용
            role: "owner", // 🔥 소문자로 통일
            status: "active",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            joinedAt: admin.firestore.FieldValue.serverTimestamp(),
          };
          transaction.set(teamMemberRef, teamMemberData);
          logger.info("✅ [createTeam] team_members 생성", { teamId, uid });
        } else {
          logger.warn("⚠️ [createTeam] team_members 이미 존재 (무시)", { teamId, uid });
        }

        // 3-6. Usage 초기화 (선택적 - 실패해도 팀 생성은 성공)
        try {
          const usageRef = db.doc(`teams/${teamId}/usage/current`);
          transaction.set(usageRef, {
            membersCount: 1, // 생성자 포함
            actionsThisMonth: 0,
            storageMB: 0,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        } catch (usageError: any) {
          // Usage 초기화 실패는 경고만 (팀 생성은 계속 진행)
          logger.warn("⚠️ [createTeam] Usage 초기화 실패 (무시):", usageError?.message);
        }

        logger.info("[createTeam] 트랜잭션 내부 - return 직전", { teamId });
        return { teamId };
      });

      logger.info("🔥🔥🔥 [createTeam] ========== 트랜잭션 완료 ==========");
      logger.info("[createTeam] after write - 트랜잭션 완료 후", { teamId: result.teamId });
      logger.info("✅ [createTeam] 팀 생성 완료", { teamId: result.teamId, uid });

      // 🔥 L-3: AuditLog 기록 (트랜잭션 성공 이후)
      // AuditLog 실패해도 팀 생성은 성공으로 간주 (에러 무시)
      try {
        // 🔥 auditLog는 지연 import (배포 타임아웃 방지)
        const { writeAuditLog, extractRequestInfo } = await import("./utils/auditLog");
        const requestInfo = extractRequestInfo((request as any).rawRequest || {});
        await writeAuditLog({
          actorUid: uid,
          actorRole: "owner",
          teamId: result.teamId,
          targetType: "team",
          action: "team.create",
          summary: `Owner ${uid} created team "${name.trim()}" (${region.trim()}, ${sportType})`,
          metadata: {
            teamName: name.trim(),
            sportType,
            region: region.trim(),
          },
          ua: requestInfo.userAgent,
          ip: requestInfo.ip,
        });
      } catch (auditError: any) {
        // AuditLog 실패는 경고만 하고 계속 진행 (팀 생성은 이미 성공)
        logger.warn("⚠️ [createTeam] AuditLog 기록 실패 (무시, 팀 생성은 성공)", {
          error: auditError?.message,
          errorStack: auditError?.stack,
          teamId: result.teamId,
        });
      }

      return {
        teamId: result.teamId,
        success: true,
        message: "팀이 성공적으로 생성되었습니다.",
      };
    } catch (error: any) {
      // 🔥 STEP 2: 강제 에러 로그 - 모든 에러 정보 기록
      logger.error("🔥🔥🔥 [createTeam] ========== 에러 발생 ==========");
      logger.error("[createTeam] error - catch 블록 진입", {
        errorName: error?.name,
        errorCode: error?.code,
        errorMessage: error?.message,
        errorStack: error?.stack,
        errorString: String(error),
        errorJSON: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      });
      
      // 🔥 상세 에러 로깅 (디버깅용)
      logger.error("❌ [createTeam] 팀 생성 실패", {
        uid,
        name: name.trim(),
        region: region.trim(),
        sportType,
        errorName: error?.name,
        errorCode: error?.code,
        errorMessage: error?.message,
        errorStack: error?.stack,
        // 🔥 payload 정보도 로깅 (Rules 디버깅용)
        payload: {
          name: name.trim(),
          region: region.trim(),
          sportType,
          ownerUid: uid,
          owners: [uid],
          plan: "free",
          seatLimit: 5,
          seatUsed: 1,
          allowManualFee: true,
          status: "active",
          membership: "non-member",
          associationId: null,
          isDeleted: false,
        },
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      });

      // HttpsError는 그대로 전달
      if (error instanceof HttpsError) {
        throw error;
      }

      // Firestore 에러인 경우 더 친절한 메시지 제공
      if (error?.code === "permission-denied" || error?.code === 7) {
        logger.error("❌ [createTeam] Firestore permission denied", { uid });
        throw new HttpsError(
          "permission-denied",
          "팀 생성 권한이 없습니다. 로그인 상태를 확인해주세요."
        );
      }

      // 기타 에러는 내부 에러로 변환 (에러 메시지 + teamId 포함)
      const errorMsg = error?.message || "알 수 없는 오류";
      logger.error("❌ [createTeam] Internal error", { 
        uid, 
        errorMsg,
        errorName: error?.name,
        errorCode: error?.code,
        errorStack: error?.stack?.substring(0, 500), // 스택 일부만 (너무 길면 로그 제한)
      });
      
      // 🔥 teamId가 있으면 (부분 성공) 에러에 포함
      const partialTeamId = error?.teamId || null;
      throw new HttpsError(
        "internal",
        `팀 생성 중 오류가 발생했습니다: ${errorMsg}. 다시 시도해주세요.`,
        { 
          originalError: errorMsg,
          teamId: partialTeamId, // 부분 성공 시 teamId 포함
        }
      );
    }
  }
);

