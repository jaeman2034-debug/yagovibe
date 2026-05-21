/**
 * 🔥 시스템 자동 조 추첨 Cloud Function
 * 
 * 행정/감사 기준: 랜덤 알고리즘 + 완전한 로그
 * 
 * 원칙:
 * - 승인된 팀만 대상
 * - 재실행 불가 (로그가 증거)
 * - 추첨 결과는 로그로 기록
 */

// 🔥 타입 import (런타임 import와 분리)
import type * as FirebaseFirestore from "firebase-admin/firestore";
// 🔥 Firebase Admin static import (동적 import 제거 - 초기화 보장)
import { admin } from "../firebaseAdmin";

interface ExecuteDrawRequest {
  associationId: string;
  tournamentId: string;
  divisionCount?: number; // 조 수 (미지정 시 자동 계산)
  adminId: string; // 실행한 관리자 UID
  seedTeamIds?: string[]; // 🔥 시드팀 목록 (선택, 각 조에 1팀씩 먼저 배치)
  distributeByClub?: boolean; // 🔥 동일 클럽/지역 분산 (선택, 기본 false)
  publishMode?: "immediate" | "scheduled"; // 🔥 공개 모드 (즉시/예약)
  testMode?: boolean; // 🔥 테스트 모드 (운영 기록 미반영)
  algorithmLevel?: 0 | 1 | 2; // 🔥 알고리즘 레벨 (0: 완전 랜덤, 1: 시드 분산, 2: 시드+회피+균형)
}

interface DrawResult {
  success: boolean;
  divisionCount: number;
  teamsPerDivision: number;
  divisions: Array<{
    division: string; // "A조", "B조", ...
    teams: Array<{
      teamId: string;
      teamName: string;
      seed: number; // 추첨 순서 (1, 2, 3, ...)
    }>;
  }>;
  executedAt: FirebaseFirestore.Timestamp;
  executedBy: string;
  logId: string; // 추첨 로그 문서 ID
}

/**
 * Fisher-Yates 셔플 알고리즘 (공정한 랜덤)
 * 
 * 행정/감사 기준: 재현 가능성을 위한 시드 지원
 */
function shuffleArray<T>(array: T[], seed?: string): T[] {
  const shuffled = [...array];
  
  // 시드가 있으면 시드 기반 난수 생성기 사용
  let random: () => number;
  if (seed) {
    // 간단한 시드 기반 난수 생성 (감사용 재현 가능)
    let seedValue = seed.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    random = () => {
      seedValue = (seedValue * 9301 + 49297) % 233280;
      return seedValue / 233280;
    };
  } else {
    // 일반 랜덤 (더 안전하지만 재현 불가)
    random = () => Math.random();
  }
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * 조 수 자동 계산 (팀 수 기준)
 * 
 * 규칙:
 * - 4팀 미만: 1조
 * - 4~7팀: 2조
 * - 8팀 이상: 4조
 * 
 * 🔥 최종 확정 규칙 (운영 기준)
 */
function calculateOptimalDivisionCount(totalTeams: number): number {
  if (totalTeams >= 8) return 4;
  if (totalTeams >= 4) return 2;
  return 1;
}

/**
 * 🔥 시드 분산 스네이크 드래프트 알고리즘
 * 
 * 목표: 시드 높은 팀들이 한 조에 몰리지 않게 균등 분산
 * 
 * 방식:
 * - 팀을 시드 순서로 정렬
 * - 스네이크 드래프트 방식으로 조에 배분
 *   1라운드: 1조→2조→3조→...
 *   2라운드: ...→3조→2조→1조
 *   반복
 * 
 * @param teamIds 정렬된 팀 ID 목록 (시드 높은 순)
 * @param divisionCount 조 수
 * @returns 각 조에 배정된 팀 ID 배열
 */
function seededSnakeDraft(teamIds: string[], divisionCount: number): string[][] {
  const divisions: string[][] = Array.from({ length: divisionCount }, () => []);
  let dir = 1; // 1: forward, -1: backward
  let idx = 0;

  for (const teamId of teamIds) {
    divisions[idx].push(teamId);

    if (dir === 1) {
      // 정방향: 다음 조로 이동
      if (idx === divisionCount - 1) {
        dir = -1; // 마지막 조 도달 시 역방향 전환
      } else {
        idx++;
      }
    } else {
      // 역방향: 이전 조로 이동
      if (idx === 0) {
        dir = 1; // 첫 조 도달 시 정방향 전환
      } else {
        idx--;
      }
    }
  }

  return divisions;
}

/**
 * 조별 팀 수 균형 분배 (시드팀 포함)
 * 
 * 규칙:
 * 1. 시드팀이 있으면 각 조에 1팀씩 먼저 배치
 * 2. 나머지 팀을 균형 분배
 * 3. 조 간 최대 편차 = 1
 * 
 * 예: 14팀, 4조, 시드 2팀
 * - 시드 2팀 → A조, B조에 1팀씩
 * - 나머지 12팀 → 각 조에 3팀씩 (3+3+3+3)
 */
function distributeTeamsWithSeeds(
  seedTeams: Array<{ teamId: string; teamName: string }>,
  nonSeedTeams: Array<{ teamId: string; teamName: string }>,
  divisionCount: number
): Array<{ division: string; teams: Array<{ teamId: string; teamName: string; seed: number; isSeedTeam?: boolean }> }> {
  const totalTeams = seedTeams.length + nonSeedTeams.length;
  const baseTeamsPerDivision = Math.floor(totalTeams / divisionCount);
  const remainder = totalTeams % divisionCount;
  
  const divisions: Array<{ division: string; teams: Array<{ teamId: string; teamName: string; seed: number; isSeedTeam?: boolean }> }> = [];
  const divisionNames = ["A", "B", "C", "D", "E", "F", "G", "H"];
  
  // 초기화: 각 조에 빈 배열 생성
  for (let i = 0; i < divisionCount; i++) {
    divisions.push({
      division: `${divisionNames[i]}조`,
      teams: [],
    });
  }
  
  // 1️⃣ 시드팀 배치 (각 조에 1팀씩)
  seedTeams.forEach((team, idx) => {
    if (idx < divisionCount) {
      divisions[idx].teams.push({
        teamId: team.teamId,
        teamName: team.teamName,
        seed: 1, // 시드팀은 항상 시드 1
        isSeedTeam: true,
      });
    }
  });
  
  // 2️⃣ 나머지 팀 균형 분배
  // 각 조의 목표 팀 수 계산 (시드팀 제외)
  let nonSeedTeamIndex = 0;
  
  for (let i = 0; i < divisionCount; i++) {
    const currentSeedCount = divisions[i].teams.length; // 이미 배정된 시드팀 수
    const targetTeamsInDivision = baseTeamsPerDivision + (i < remainder ? 1 : 0);
    const remainingSlots = targetTeamsInDivision - currentSeedCount; // 나머지 슬롯
    
    // 나머지 팀 배정
    for (let j = 0; j < remainingSlots && nonSeedTeamIndex < nonSeedTeams.length; j++) {
      const team = nonSeedTeams[nonSeedTeamIndex];
      const seed = currentSeedCount + j + 1; // 시드팀 다음 번호부터
      
      divisions[i].teams.push({
        teamId: team.teamId,
        teamName: team.teamName,
        seed,
        isSeedTeam: false,
      });
      
      nonSeedTeamIndex++;
    }
  }
  
  return divisions;
}

/**
 * 조 추첨 실행 핵심 로직 (함수로 분리하여 lazy import 지원)
 * 
 * 🔥 주의: 이 함수는 index.ts에서 동적으로 import됨
 */
export async function executeDrawCallableImpl(request: any) {
    // 🔥 함수 실행 시점에만 필요한 모듈 동적 import (초기화 타임아웃 방지)
    const [httpsModule, functionsModule, cryptoModule] = await Promise.all([
        import("firebase-functions/v2/https"),
        import("firebase-functions/v2"),
        import("crypto"),
    ]);
    
    const { HttpsError } = httpsModule;
    const { logger } = functionsModule;
    // crypto는 Node.js 기본 모듈이므로 바로 사용
    const crypto = cryptoModule;
    
    // 🔥 안전한 request 데이터 추출
    if (!request || typeof request !== "object") {
        throw new HttpsError("invalid-argument", "유효하지 않은 요청입니다.");
    }
    
    // 🔥 request.auth 체크 (Callable은 인증 필수)
    if (!request.auth || !request.auth.uid) {
        logger.error(`[executeDraw] 인증 정보 없음`, {
            hasAuth: !!request.auth,
            hasUid: !!request.auth?.uid,
        });
        throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }
    
    const requestData = (request.data || request) as ExecuteDrawRequest;
    const uid = request.auth.uid;
    
    // 🔥🔥 testMode 정확한 체크 (문자열 "true", undefined 등 모두 false 처리)
    const testMode = requestData.testMode === true;
    
    // 🔥 맨 위에 testMode 로그 출력 (체크리스트 1번)
    console.log("[executeDraw] ========== 시작 ==========");
    console.log("[executeDraw] START");
    console.log("[executeDraw] executeDraw called", {
      testMode,
      testMode_type: typeof requestData.testMode,
      testMode_raw: requestData.testMode,
      associationId: requestData.associationId,
      tournamentId: requestData.tournamentId,
    });
    
    // 🔥 테스트 모드일 때 명확한 로그 출력
    if (testMode) {
      console.log("[executeDraw] ⚠️ 테스트 모드 활성화: 모든 사전 조건(precondition) 체크 우회");
      logger.info(`[executeDraw] ⚠️ 테스트 모드 활성화: 모든 사전 조건(precondition) 체크 우회`);
    }
    logger.info(`[executeDraw] START`, {
      associationId: requestData.associationId,
      tournamentId: requestData.tournamentId,
      divisionCount: requestData.divisionCount,
      adminId: requestData.adminId,
      uid,
      testMode,
      testMode_type: typeof requestData.testMode,
      testMode_raw: requestData.testMode,
      algorithmLevel: requestData.algorithmLevel,
    });

    const { associationId, tournamentId, divisionCount, adminId } = requestData;

    // 🔥 필수 필드 검증
    if (!associationId || !tournamentId || !adminId) {
      logger.error(`[executeDraw] 필수 필드 누락`, {
        associationId: !!associationId,
        tournamentId: !!tournamentId,
        adminId: !!adminId,
      });
      throw new HttpsError(
        "invalid-argument",
        "필수 필드가 누락되었습니다: associationId, tournamentId, adminId"
      );
    }

    // 🔐 권한 체크 (uid와 adminId 일치 확인)
    if (uid !== adminId) {
      logger.error(`[executeDraw] 권한 검증 실패`, {
        uid,
        adminId,
        일치: uid === adminId,
      });
      throw new HttpsError("permission-denied", "권한이 없습니다.");
    }

    // 🔥🔥 testMode 확인 로그 (실제 추첨 로직은 아래에서 실행됨)
    if (testMode) {
      console.log("[executeDraw] TEST MODE: 실제 추첨 로직 실행 (test_groups에 저장)");
      logger.info(`[executeDraw] 테스트 모드 - 실제 추첨 로직 실행, test_groups 저장`);
    }

    const db = admin.firestore();

    try {
      // 1️⃣ 대회 정보 조회
      const tournamentRef = db.doc(`associations/${associationId}/tournaments/${tournamentId}`);
      const tournamentSnap = await tournamentRef.get();

      if (!tournamentSnap.exists) {
        throw new HttpsError("not-found", "대회를 찾을 수 없습니다.");
      }

      const tournament = tournamentSnap.data()!;

      // 🔥🔥 MVP 보안: OpenAI/detectFraudRisk 등 외부 API 호출 완전 차단 🔥🔥
      // ⚠️ 아래 코드는 절대 활성화하지 말 것 (MVP 단계에서는 비활성화)
      // TODO: 추후 운영 환경에서 OpenAI API Key 설정 후 활성화 검토
      // const fraudResult = await detectFraudRisk(...); // ❌ 절대 활성화 금지 (MVP 단계)
      
      logger.info(`[executeDraw] 모드: ${testMode ? "테스트 모드" : "운영 모드"} - 정상 추첨 로직 실행`);

      // 2️⃣ 이미 추첨되었는지 확인 (테스트 모드는 제외)
      // 🔥🔥 동시 실행 방지: 트랜잭션 밖에서 사전 체크 (UX 개선용)
      // ⚠️ 주의: 실제 보호는 트랜잭션 내부에서 수행됨 (788-800줄)
      // 🔥 테스트 모드일 때는 이미 실행된 것만 체크 (isTestDraw)
      if (testMode) {
        // 테스트 모드: isTestDraw만 체크
        if ((tournament as any).isTestDraw === true) {
          logger.warn(`[executeDraw] 테스트 모드: 이미 테스트 조 추첨이 완료됨`);
          throw new HttpsError(
            "failed-precondition",
            "이미 테스트 조 추첨이 완료되었습니다. 재실행할 수 없습니다."
          );
        }
        logger.info(`[executeDraw] 테스트 모드: 일반 drawExecuted 체크 우회`);
      } else {
        // 운영 모드: 일반 drawExecuted 체크
        // 🔥 draw.locked 체크 (최신 구조)
        if (tournament.draw?.locked === true) {
          logger.warn(`[executeDraw] 이미 조 추첨이 확정됨 (locked)`);
          throw new HttpsError(
            "failed-precondition",
            "이미 조 추첨이 확정되었습니다. 재실행할 수 없습니다."
          );
        }
        // 🔥 하위 호환: drawExecuted 체크 (구버전)
        if (tournament.drawExecuted === true) {
          throw new HttpsError(
            "failed-precondition",
            "이미 조 추첨이 완료되었습니다. 재실행할 수 없습니다."
          );
        }
      }
      
      logger.info(`[executeDraw] 대회 정보 확인 완료`, {
        tournamentId,
        drawExecuted: tournament.drawExecuted,
      });

      // 🔥 테스트 모드일 때는 날짜/Phase 체크 모두 우회 (전체 파이프라인 검증용)
      // ⚠️ 중요: testMode === true일 때 모든 사전 조건(precondition) 완전 우회
      if (!testMode) {
        // 3️⃣ 참가 접수 닫힘 확인 (필수)
        const registrationEndDate = tournament.registrationPeriod?.endDate;
        if (registrationEndDate) {
          const endDate = new Date(registrationEndDate);
          const now = new Date();
          endDate.setHours(23, 59, 59, 999); // 마감일 종료 시각
          
          if (now < endDate) {
            logger.warn(`[executeDraw] 참가 접수 마감 전`, {
              registrationEndDate: endDate.toISOString(),
              now: now.toISOString(),
            });
            throw new HttpsError(
              "failed-precondition",
              `참가 접수가 아직 마감되지 않았습니다. (마감일: ${endDate.toLocaleDateString("ko-KR")})`
            );
          }
        }

        // 4️⃣ 검수 기간 종료 확인 (필수)
        const reviewEndDate = tournament.reviewPeriod?.endDate;
        if (reviewEndDate) {
          const endDate = new Date(reviewEndDate);
          const now = new Date();
          endDate.setHours(23, 59, 59, 999); // 검수 종료일 종료 시각
          
          if (now < endDate) {
            logger.warn(`[executeDraw] 검수 기간 미종료`, {
              reviewEndDate: endDate.toISOString(),
              now: now.toISOString(),
            });
            throw new HttpsError(
              "failed-precondition",
              `검수 기간이 아직 종료되지 않았습니다. (종료일: ${endDate.toLocaleDateString("ko-KR")})`
            );
          }
        } else {
          // 검수 기간이 설정되지 않은 경우, 참가 접수 종료일 기준으로 체크
          if (registrationEndDate) {
            const endDate = new Date(registrationEndDate);
            const now = new Date();
            endDate.setHours(23, 59, 59, 999);
            
            // 참가 접수 종료 후 최소 1일 경과 확인 (검수 기간 최소 1일 가정)
            const minReviewDays = 1;
            const reviewDeadline = new Date(endDate);
            reviewDeadline.setDate(reviewDeadline.getDate() + minReviewDays);
            
            if (now < reviewDeadline) {
              logger.warn(`[executeDraw] 검수 기간 부족`, {
                reviewDeadline: reviewDeadline.toISOString(),
                now: now.toISOString(),
              });
              throw new HttpsError(
                "failed-precondition",
                `검수 기간이 필요합니다. (최소 ${minReviewDays}일 경과 필요)`
              );
            }
          }
        }

        // 🔥 STEP 2: Phase 체크 (ROSTER_LOCKED 필수 - 서버 이중 방어)
        const currentPhase = tournament.tournamentPhase;
        if (currentPhase !== "ROSTER_LOCKED") {
          logger.warn(`[executeDraw] Phase 체크 실패`, {
            currentPhase,
            required: "ROSTER_LOCKED",
          });
          throw new HttpsError(
            "failed-precondition",
            "팀원 명단이 확정된 이후에만 조 추첨이 가능합니다."
          );
        }
      } else {
        // 🔥 테스트 모드: 모든 조건 체크 완전 우회 (파이프라인 검증용)
        logger.info(`[executeDraw] 테스트 모드: 모든 사전 조건(precondition) 완전 우회`, {
          testMode: true,
          registrationEndDate: tournament.registrationPeriod?.endDate,
          reviewEndDate: tournament.reviewPeriod?.endDate,
          tournamentPhase: tournament.tournamentPhase,
          message: "참가 접수 마감, 검수 기간 종료, Phase 체크 모두 스킵",
        });
        console.log(`[executeDraw] testMode: true → 모든 precondition 체크 우회`);
      }

      // 5️⃣ 추첨일 확인 (선택적, 있으면 우선 적용) - 테스트 모드에서는 우회
      if (!testMode && tournament.drawDate?.date) {
        const drawDate = new Date(tournament.drawDate.date);
        const now = new Date();
        drawDate.setHours(0, 0, 0, 0);
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        if (today < drawDate) {
          throw new HttpsError(
            "failed-precondition",
            `조 추첨일(${drawDate.toLocaleDateString("ko-KR")}) 이전에는 추첨할 수 없습니다.`
          );
        }
      }

      // 6️⃣ 승인된 팀 목록 조회
      logger.info(`[executeDraw] 승인된 팀 조회 시작`, { tournamentId, associationId });
      
      let approvedTeams: Array<{ teamId: string; teamName: string; applicationId: string | null }>;
      try {
      const teamsRef = db.collection(
        `associations/${associationId}/tournaments/${tournamentId}/teams`
      );
        logger.info(`[executeDraw] Firestore 쿼리 실행`, { 
          collectionPath: `associations/${associationId}/tournaments/${tournamentId}/teams`,
          filter: "status == 'approved'"
        });
        
      const teamsSnap = await teamsRef.where("status", "==", "approved").get();
        logger.info(`[executeDraw] Firestore 쿼리 완료`, { docsCount: teamsSnap.size });

      // 🔥 테스트 모드일 때는 승인된 팀이 없어도 허용 (빈 조 생성용)
      if (teamsSnap.empty) {
        if (!testMode) {
          logger.warn(`[executeDraw] 승인된 팀 없음`);
          throw new HttpsError(
            "failed-precondition",
            "승인된 팀이 없습니다. 조 추첨을 실행할 수 없습니다."
          );
        } else {
          // 테스트 모드: 승인된 팀이 없어도 허용 (빈 조 생성)
          logger.info(`[executeDraw] 테스트 모드: 승인된 팀 없어도 허용(빈 조 생성)`);
          console.log(`[executeDraw] 테스트 모드: 승인된 팀 없어도 허용(빈 조 생성)`);
          approvedTeams = []; // 빈 배열로 설정
        }
      } else {
        approvedTeams = teamsSnap.docs.map((doc) => ({
          teamId: doc.id,
          teamName: doc.data().teamName || "팀명 없음",
          applicationId: doc.data().applicationId || null,
        }));
      }

      logger.info(`🎲 [executeDraw] 승인된 팀 수: ${approvedTeams.length}팀`);
      console.log(`[executeDraw] 승인된 팀 수: ${approvedTeams.length}팀`);
      console.log(`[executeDraw] 승인된 팀 목록:`, approvedTeams.map(t => ({ id: t.teamId, name: t.teamName })));
      } catch (queryError: any) {
        logger.error(`[executeDraw] 승인된 팀 조회 실패`, {
          error: queryError?.message,
          code: queryError?.code,
          stack: queryError?.stack,
          tournamentId,
          associationId,
        });
        // HttpsError는 그대로 전달
        if (queryError instanceof HttpsError) {
          throw queryError;
        }
        // 기타 에러는 래핑
        throw new HttpsError(
          "internal",
          `승인된 팀 조회 실패: ${queryError?.message || String(queryError)}`,
          { originalError: queryError?.message, code: queryError?.code }
        );
      }

      // 🔥 STEP 2: 최소 팀 수 확인 (필수 - 서버 이중 방어)
      const totalTeams = approvedTeams.length;
      const MIN_TEAMS_FOR_DRAW = 2; // 🔥 조 추첨 최소 팀 수 (고정값)
      
      // 🔥 테스트 모드일 때는 승인 팀 수 체크 완전 우회 (전체 파이프라인 검증용)
      // ⚠️ 중요: testMode === true일 때 승인 팀 수 체크 완전 스킵
      if (!testMode) {
        if (totalTeams < MIN_TEAMS_FOR_DRAW) {
          logger.warn(`[executeDraw] 최소 팀 수 부족`, {
            current: totalTeams,
            required: MIN_TEAMS_FOR_DRAW,
          });
          throw new HttpsError(
            "failed-precondition",
            `조 추첨을 위해서는 최소 ${MIN_TEAMS_FOR_DRAW}팀 이상이 필요합니다. (현재: ${totalTeams}팀)`
          );
        }
      } else {
        // 🔥 테스트 모드: 승인 팀 수 체크 완전 우회
        logger.info(`[executeDraw] 테스트 모드: 승인 팀 수 체크 완전 우회 (현재: ${totalTeams}팀)`, {
          testMode: true,
          totalTeams,
          message: "MIN_TEAMS_FOR_DRAW 체크 스킵",
        });
        console.log(`[executeDraw] testMode: true → 승인 팀 수 체크 우회 (${totalTeams}팀)`);
        
        // 🔥 테스트 모드일 때 승인 팀이 없으면 빈 조 생성 (파이프라인 검증용)
        if (totalTeams === 0) {
          logger.info(`[executeDraw] 테스트 모드: 승인 팀 없음, 빈 조 생성으로 파이프라인 검증`);
          // 빈 조 생성 (경기 자동 생성 버튼 활성화 확인용)
          approvedTeams = []; // 빈 배열 유지
        }
      }

      // 8️⃣ 조 수 결정 (안전한 처리)
      let finalDivisionCount: number;
      let divisionCountSource: "user_specified" | "auto_calculated";
      let divisionCountReason: string;
      
      // 🔥 divisionCount가 undefined이거나 유효하지 않으면 자동 계산
      if (
        divisionCount === undefined || 
        divisionCount === null || 
        isNaN(divisionCount) || 
        !isFinite(divisionCount) ||
        divisionCount < 1 ||
        divisionCount > 8
      ) {
        logger.info(`[executeDraw] 조 수 자동 계산 (입력값: ${divisionCount}, 팀 수: ${totalTeams})`);
        finalDivisionCount = calculateOptimalDivisionCount(totalTeams);
        divisionCountSource = "auto_calculated";
        divisionCountReason = `정책 기반 자동 계산: ${totalTeams}팀 → ${finalDivisionCount}조 (규칙: 4팀 미만=1조, 4~7팀=2조, 8팀 이상=4조)`;
        logger.info(`[executeDraw] 자동 계산된 조 수: ${finalDivisionCount}조 (${divisionCountReason})`);
      } else {
        finalDivisionCount = divisionCount;
        divisionCountSource = "user_specified";
        divisionCountReason = `관리자 직접 지정: ${finalDivisionCount}조`;
        logger.info(`[executeDraw] 사용자 지정 조 수: ${finalDivisionCount}조`);
      }

      // 🔥 조 수 유효성 재검증 (안전장치)
      if (finalDivisionCount < 1 || finalDivisionCount > 8) {
        logger.error(`[executeDraw] 조 수 범위 오류`, {
          finalDivisionCount,
          totalTeams,
        });
        throw new HttpsError(
          "invalid-argument",
          `조 수(${finalDivisionCount}조)는 1~8조만 가능합니다.`
        );
      }

      // 🔥 테스트 모드일 때는 팀 수 부족 체크도 완전 우회 (빈 조 생성 허용)
      // ⚠️ 중요: testMode === true일 때 팀 수 부족 체크 완전 스킵
      if (!testMode) {
        if (totalTeams < finalDivisionCount) {
          logger.error(`[executeDraw] 팀 수 부족`, {
            totalTeams,
            finalDivisionCount,
          });
          throw new HttpsError(
            "failed-precondition",
            `팀 수(${totalTeams}팀)가 조 수(${finalDivisionCount}조)보다 적습니다. 최소 ${finalDivisionCount}팀이 필요합니다.`
          );
        }
      } else {
        // 🔥 테스트 모드: 팀 수 부족 체크 완전 우회
        logger.info(`[executeDraw] 테스트 모드: 팀 수 부족 체크 완전 우회`, {
          testMode: true,
          totalTeams,
          finalDivisionCount,
          message: "팀 수 < 조 수 체크 스킵",
        });
        console.log(`[executeDraw] testMode: true → 팀 수 부족 체크 우회 (${totalTeams}팀 < ${finalDivisionCount}조 허용)`);
      }
      
      // 🔥 divisions 변수 선언 (테스트 모드 빈 조 생성용)
      let divisions: Array<{ division: string; teams: Array<{ teamId: string; teamName: string; seed: number; isSeedTeam?: boolean }> }> | undefined = undefined;
      
      // 🔥 테스트 모드일 때 팀이 없으면 빈 조 생성 (경기 자동 생성 버튼 활성화용)
      if (testMode && totalTeams === 0) {
        logger.info(`[executeDraw] 테스트 모드: 승인 팀 없음, 빈 조 생성으로 파이프라인 검증`);
        // 빈 조 1개 생성 (경기 자동 생성 버튼 활성화 확인용)
        finalDivisionCount = 1;
        divisions = [{
          division: "A조",
          teams: [],
        }];
      }

      const teamsPerDivision = Math.ceil(totalTeams / finalDivisionCount);
      const remainder = totalTeams % finalDivisionCount;

      // 9️⃣ 시드팀 처리 (옵션 B: 시드팀이 지정된 경우)
      // 🔥 안전한 destructuring 및 방어 코드
      const seedTeamIdsRaw = requestData.seedTeamIds;
      const seedTeamIds: string[] = Array.isArray(seedTeamIdsRaw) ? seedTeamIdsRaw : [];
      const distributeByClub = requestData.distributeByClub || false;
      // 🔥 testMode는 이미 위에서 return되었으므로 여기는 항상 운영 모드
      const algorithmLevel = requestData.algorithmLevel ?? 1;
      const publishMode = requestData.publishMode || "scheduled";
      
      logger.info(`[executeDraw] 추첨 파라미터`, {
        finalDivisionCount,
        totalTeams,
        seedTeamIds_개수: seedTeamIds.length,
        seedTeamIds_타입: Array.isArray(seedTeamIdsRaw) ? "array" : typeof seedTeamIdsRaw,
        distributeByClub,
        algorithmLevel,
        publishMode,
      });
      
      let seedTeams: Array<{ teamId: string; teamName: string }> = [];
      let nonSeedTeams = [...approvedTeams];
      
      // 🔥 seedTeamIds가 배열이고 길이가 0보다 큰 경우만 처리
      if (Array.isArray(seedTeamIds) && seedTeamIds.length > 0) {
        // 시드팀 목록 검증
        const validSeedTeams = approvedTeams.filter((t) => seedTeamIds.includes(t.teamId));
        
        if (validSeedTeams.length !== seedTeamIds.length) {
          throw new HttpsError(
            "invalid-argument",
            "일부 시드팀이 승인된 팀 목록에 없습니다."
          );
        }
        
        if (validSeedTeams.length > finalDivisionCount) {
          throw new HttpsError(
            "invalid-argument",
            `시드팀 수(${validSeedTeams.length}팀)가 조 수(${finalDivisionCount}조)보다 많습니다.`
          );
        }
        
        seedTeams = validSeedTeams;
        nonSeedTeams = approvedTeams.filter((t) => !seedTeamIds.includes(t.teamId));
        
        logger.info(`🎯 [executeDraw] 시드팀: ${seedTeams.length}팀`);
      }

      // 🔥 STEP 4: Seed 기반 랜덤 (재현 가능성 확보)
      // 같은 대회는 항상 같은 조 추첨 결과를 보장
      const drawSeed = tournamentId; // 🔥 단순하고 재현 가능한 seed
      const timestamp = Date.now(); // 로깅용 (seed에는 사용 안 함)
      
      // 🔥 해시는 로깅용으로만 사용 (실제 셔플에는 tournamentId 직접 사용)
      let randomSeedHash: string;
      try {
        const hash = crypto.createHash("sha256");
        hash.update(drawSeed);
        randomSeedHash = hash.digest("hex");
      } catch (cryptoError: any) {
        logger.warn(`[executeDraw] 시드 해시 생성 실패, 대체값 사용`, {
          error: cryptoError?.message,
        });
        randomSeedHash = drawSeed;
      }
      
      // 셔플에 사용할 시드 (재현 가능하도록 tournamentId 직접 사용)
      const randomSeed = drawSeed; // 🔥 같은 대회는 항상 같은 결과

      // 1️⃣1️⃣ 동일 클럽/지역 분산 시도 (선택)
      let distributionAttempt = "random";
      let clubDistributionLog: string | null = null;
      
      if (distributeByClub && nonSeedTeams.length > 0) {
        // 클럽/지역 정보 추출 시도 (팀 이름 기반 또는 teams 컬렉션에서)
        // 일단 시도는 하지만 강제는 하지 않음 (공정성 우선)
        try {
          // TODO: teams 컬렉션에서 region 정보 조회
          // 지금은 구현만 해두고 나중에 확장 가능
          distributionAttempt = "club_aware";
          clubDistributionLog = "클럽 분산 시도 (구현 예정)";
        } catch (e) {
          distributionAttempt = "random";
          clubDistributionLog = "클럽 정보 부족으로 랜덤 분배";
        }
      }

      // 1️⃣2️⃣ 알고리즘 레벨에 따른 조 배정
      // 🔥 테스트 모드 경량화: 테스트 모드일 때는 항상 레벨 0 (완전 랜덤)만 사용
      const effectiveAlgorithmLevel = testMode ? 0 : (algorithmLevel ?? 1);
      const { distributeLevel0, distributeLevel1, distributeLevel2 } = await import("./drawAlgorithm");
      
      // ⚠️ 주의: divisions 변수는 위에서 이미 선언되었을 수 있음 (testMode && totalTeams === 0인 경우)
      // divisions가 아직 설정되지 않았으면 알고리즘으로 생성
      let algorithmVersion = "v1.0";
      let algorithmRules: string[] = [];
      let algorithmMetadata: any = {};
      
      if (!divisions) {
        if (effectiveAlgorithmLevel === 0) {
          // 레벨 0: 완전 랜덤
          algorithmVersion = "v0.0";
          algorithmRules = ["random"];
          const result = distributeLevel0(approvedTeams, finalDivisionCount, randomSeed);
          divisions = result.map((div) => ({
            division: div.division,
            teams: div.teams.map((t) => ({
              teamId: t.teamId,
              teamName: t.teamName,
              seed: t.seed,
              isSeedTeam: false,
            })),
          }));
        } else if (effectiveAlgorithmLevel === 1) {
          // 레벨 1: 시드 분산 + 랜덤
          algorithmVersion = "v1.0";
          algorithmRules = ["seed", "random"];
          const seedIds = seedTeamIds && seedTeamIds.length > 0 ? seedTeamIds : [];
          const result = distributeLevel1(approvedTeams, finalDivisionCount, seedIds, randomSeed);
          divisions = result.map((div) => ({
            division: div.division,
            teams: div.teams.map((t) => ({
              teamId: t.teamId,
              teamName: t.teamName,
              seed: t.seed,
              isSeedTeam: t.isSeedTeam || false,
            })),
          }));
        } else {
          // 레벨 2: 시드 + 회피 규칙 + 균형 점수
          algorithmVersion = "v2.1";
          algorithmRules = ["seed", "clubAvoid", "balance"];
          // 🔥 안전한 배열 처리
          const seedIds: string[] = Array.isArray(seedTeamIds) && seedTeamIds.length > 0 ? seedTeamIds : [];
          logger.info(`[executeDraw] 레벨 2 알고리즘 실행`, {
            seedIds_개수: seedIds.length,
            totalTeams: approvedTeams.length,
            divisionCount: finalDivisionCount,
            distributeByClub,
          });
          const result = distributeLevel2(
            approvedTeams,
            finalDivisionCount,
            seedIds,
            randomSeed,
            distributeByClub || false,
            true // balanceSeeds 항상 true
          );
          divisions = result.divisions.map((div) => ({
            division: div.division,
            teams: div.teams.map((t) => ({
              teamId: t.teamId,
              teamName: t.teamName,
              seed: t.seed,
              isSeedTeam: t.isSeedTeam || false,
            })),
          }));
          algorithmMetadata = {
            score: result.score,
            attempts: result.metadata.attempts,
          };
        }
      } // divisions가 이미 설정된 경우 (testMode && totalTeams === 0) 알고리즘 스킵

      // 1️⃣4️⃣ 추첨 로그 생성 (감사용 - 완전한 기록) / 테스트 모드 분기
      // 🔥 테스트 모드 경량화: 테스트 모드일 때는 로그 최소화 (타임아웃 방지)
      let logRef: FirebaseFirestore.DocumentReference | null = null;
      
      if (!testMode) {
        // 운영 모드: 상세 로그 기록
        const logCollectionPath = `associations/${associationId}/tournaments/${tournamentId}/drawLogs`;
        logRef = db.collection(logCollectionPath).doc();
      } else {
        // 테스트 모드: 최소 로그만 (경량화)
        const logCollectionPath = `associations/${associationId}/tournaments/${tournamentId}/test_drawLogs`;
        logRef = db.collection(logCollectionPath).doc();
      }

      // 입력 데이터 해시 (감사용 - "왜 우리 팀 빠졌냐" 차단)
      // 🔥 테스트 모드 경량화: 테스트 모드일 때는 해시 생성 스킵
      let inputHash: string;
      if (testMode) {
        // 테스트 모드: 간단한 해시만 (타임아웃 방지)
        inputHash = `${tournamentId}_test_${Date.now()}`;
      } else {
        // 운영 모드: 정상 해시 생성
        try {
          const hash = crypto.createHash("sha256");
          hash.update(JSON.stringify({
            teamIds: approvedTeams.map((t) => t.teamId).sort(),
            teamNames: approvedTeams.map((t) => t.teamName).sort(),
          }));
          inputHash = hash.digest("hex");
        } catch (cryptoError: any) {
          logger.warn(`[executeDraw] crypto 해시 생성 실패, 대체값 사용`, {
            error: cryptoError?.message,
          });
          inputHash = `${tournamentId}_${totalTeams}_${Date.now()}`;
        }
      }

      // 🔥 Firestore FieldValue 접근 (안전하게)
      const FieldValue = admin.firestore.FieldValue;
      if (!FieldValue || !FieldValue.serverTimestamp) {
        logger.error(`[executeDraw] FieldValue.serverTimestamp 접근 실패`);
        throw new HttpsError("internal", "Firestore FieldValue 접근 실패");
      }

      // 🔥 타임아웃 방지: 테스트 모드일 때는 auth.getUser() 스킵 (이메일은 null)
      let executedByEmail: string | null = null;
      if (!testMode) {
        try {
          const userRecord = await admin.auth().getUser(uid);
          executedByEmail = userRecord.email || null;
        } catch (authError: any) {
          logger.warn(`[executeDraw] 사용자 이메일 조회 실패 (무시)`, {
            error: authError?.message,
          });
          // 이메일 조회 실패는 무시 (기능 차단하지 않음)
        }
      }
      
      // 🔥 테스트 모드 경량화: 테스트 모드일 때는 최소 로그만 기록
      if (!testMode) {
        // 운영 모드: 상세 로그 기록
        const drawLog: any = {
          executedAt: FieldValue.serverTimestamp(),
          executedBy: uid,
          executedByEmail,
          input: {
            totalTeams,
            divisionCount: finalDivisionCount,
            divisionCountSource,
            divisionCountReason,
            approvedTeamIds: approvedTeams.map((t) => t.teamId).sort(),
            approvedTeamNames: approvedTeams.map((t) => t.teamName).sort(),
            inputHash,
          },
          algorithm: {
            version: algorithmVersion,
            level: algorithmLevel,
            rules: algorithmRules,
            method: algorithmLevel === 0 ? "Random" : algorithmLevel === 1 ? "Seed + Random" : "Seed + Avoid + Balance",
            seed: randomSeedHash,
            seedString: drawSeed,
            timestamp,
            distributionMethod: distributionAttempt,
            clubDistributionLog,
            metadata: algorithmMetadata,
          },
          seedTeams: seedTeams.length > 0 ? {
            count: seedTeams.length,
            teamIds: seedTeams.map((t) => t.teamId).sort(),
            teamNames: seedTeams.map((t) => t.teamName).sort(),
          } : null,
          result: {
            divisionCount: finalDivisionCount,
            teamsPerDivision: {
              base: Math.floor(totalTeams / finalDivisionCount),
              remainder,
              distribution: divisions.map((d) => ({
                division: d.division,
                teamCount: d.teams.length,
              })),
            },
            divisions: divisions.map((d) => ({
              division: d.division,
              teamCount: d.teams.length,
              teamIds: d.teams.map((t) => t.teamId),
              seeds: d.teams.map((t) => t.seed),
            })),
          },
          status: "completed",
          algorithmVersion: algorithmVersion,
        };
        await logRef!.set(drawLog);
      } else {
        // 테스트 모드: 최소 로그만 (타임아웃 방지)
        const testLog: any = {
          executedAt: FieldValue.serverTimestamp(),
          executedBy: uid,
          testMode: true,
          divisionCount: finalDivisionCount,
          totalTeams,
          status: "completed",
        };
        await logRef!.set(testLog);
      }

      // 1️⃣5️⃣ 공개 모드 결정
      const isPublicImmediate = publishMode === "immediate" || (tournament.drawDate?.isPublic ?? false);

      // 1️⃣6️⃣ Firestore 저장 (테스트 모드 분기)
      if (testMode) {
        // 🔥 테스트 모드: test_groups 컬렉션에 저장 + divisions 컬렉션에도 저장 (경기 자동 생성 버튼 활성화용)
        const testGroupsPath = `associations/${associationId}/tournaments/${tournamentId}/test_groups`;
        const divisionsPath = `associations/${associationId}/tournaments/${tournamentId}/divisions`;
        
        // 🛡️ 안전장치: testMode와 컬렉션 경로 일치 검증
        if (!testGroupsPath.includes("test_")) {
          logger.error(`[executeDraw] testMode 불일치: testMode=${testMode}, path=${testGroupsPath}`);
          throw new HttpsError("internal", "테스트 모드 설정 오류");
        }
        
        // 1. test_groups에 저장 (테스트 로그용 - 경량화)
        // 🔥 테스트 모드 경량화: 최소 정보만 저장
        const testGroupsRef = db.collection(testGroupsPath).doc();
        await testGroupsRef.set({
          createdAt: FieldValue.serverTimestamp(),
          testMode: true,
          divisionCount: finalDivisionCount,
          totalTeams,
          // 🔥 경량화: 상세 정보는 divisions 컬렉션에만 저장
        });
        
        // 2. divisions 컬렉션에도 저장 (경기 자동 생성 버튼 활성화용)
        // 🔥 타임아웃 방지: Promise.all로 모든 문서 저장 완료 대기
        const divisionsRef = db.collection(divisionsPath);
        const divisionPromises = divisions.map((div, idx) => {
          const divisionNumber = idx + 1;
          const divisionId = `div${divisionNumber}`;
          const divisionDocRef = divisionsRef.doc(divisionId);
          
          return divisionDocRef.set({
            divisionNumber,
            teamIds: div.teams.map((t) => t.teamId),
            teamNames: div.teams.map((t) => t.teamName),
            seeds: div.teams.map((t) => t.seed),
            createdAt: FieldValue.serverTimestamp(),
            published: false,
            isTest: true, // 🔥 테스트 모드 표시
          });
        });
        await Promise.all(divisionPromises); // 🔥 모든 division 문서 저장 완료 대기
        
        // 3. tournament 문서 업데이트 (경기 자동 생성 버튼 활성화용)
        await tournamentRef.update({
          drawDivisions: divisions.map((div) => ({
            division: div.division,
            teams: div.teams.map((t) => ({
              teamId: t.teamId,
              teamName: t.teamName,
              seed: t.seed,
            })),
          })),
          drawExecuted: true, // 🔥 경기 자동 생성 버튼 활성화용
          drawExecutedAt: FieldValue.serverTimestamp(),
          drawExecutedBy: uid,
          isTestDraw: true, // 🔥 테스트 모드 표시
        });
        
        logger.info(`🧪 [executeDraw] 테스트 모드: test_groups + divisions 저장 완료 (${finalDivisionCount}조, ${totalTeams}팀)`);
      } else {
        // 🔥🔥 운영 모드: 트랜잭션으로 안전하게 저장 (동시 실행 방지)
        const divisionsRef = db.collection(`associations/${associationId}/tournaments/${tournamentId}/divisions`);
        
        await db.runTransaction(async (tx) => {
          // 🔥🔥🔥 동시 실행 완전 차단: 트랜잭션 내부에서만 locked 검증 및 설정
          // 이 부분이 실제 보호 메커니즘 (트랜잭션 원자성 보장)
          const tournamentSnap = await tx.get(tournamentRef);
          if (!tournamentSnap.exists) {
            throw new HttpsError("not-found", "대회를 찾을 수 없습니다.");
          }
          const tournamentData = tournamentSnap.data()!;
          
          // 🔒 동시 실행 방지: locked 또는 drawExecuted가 true면 즉시 실패
          // Firestore 트랜잭션은 첫 번째 커밋만 성공하고 나머지는 자동 롤백됨
          if (tournamentData.draw?.locked === true || tournamentData.drawExecuted === true) {
            logger.warn(`[executeDraw] 트랜잭션 내부: 이미 조 추첨 확정 감지 (동시 실행 차단)`);
            throw new HttpsError(
              "failed-precondition",
              "이미 조 추첨이 확정되었습니다. 재실행할 수 없습니다."
            );
          }
          
          // 1️⃣ divisions 컬렉션에 각 조를 별도 문서로 저장
          divisions.forEach((div, idx) => {
            const divisionNumber = idx + 1; // 1, 2, 3...
            const divisionId = `div${divisionNumber}`; // div1, div2, ...
            const divisionDocRef = divisionsRef.doc(divisionId);
            
            tx.set(divisionDocRef, {
              divisionNumber,
              teamIds: div.teams.map((t) => t.teamId),
              teamNames: div.teams.map((t) => t.teamName), // 조회 편의성
              seeds: div.teams.map((t) => t.seed), // 시드 정보 보존
              createdAt: FieldValue.serverTimestamp(),
              published: isPublicImmediate,
            });
          });
          
          // 2️⃣ 대회 문서 업데이트 (draw 메타데이터 + 상태 + locked + drawDivisions)
          tx.update(tournamentRef, {
            status: "draw_completed",
            tournamentPhase: "DRAW_DONE", // 🔥 STEP 4: Phase 변경
            draw: {
              executedAt: FieldValue.serverTimestamp(),
              executedBy: uid,
              algorithm: `seeded_v${algorithmVersion.replace("v", "").replace(".", "_")}`,
              divisionCount: finalDivisionCount,
              locked: true, // 🔥 불변 규칙: 조 추첨은 1회만
              seed: drawSeed, // 🔥 STEP 4: Seed 저장 (재현 가능성)
            },
            drawSeed: drawSeed, // 🔥 STEP 4: Seed 별도 필드로 저장 (조회 편의성)
            // 🔥 UI 조회용: drawDivisions 필드 추가 (divisions 컬렉션과 동기화)
            drawDivisions: divisions.map((div) => ({
              division: div.division,
              teams: div.teams.map((t) => ({
                teamId: t.teamId,
                teamName: t.teamName,
                seed: t.seed,
              })),
            })),
            config: {
              teamsPerDivision: {
                base: Math.floor(totalTeams / finalDivisionCount),
                remainder,
                min: Math.floor(totalTeams / finalDivisionCount),
                max: Math.ceil(totalTeams / finalDivisionCount),
              },
              format: "group_round_robin",
              matchType: "single",
            },
            drawLogId: logRef.id,
            // 🔥 하위 호환: drawExecuted도 true로 설정
          drawExecuted: true,
            drawExecutedAt: FieldValue.serverTimestamp(),
          drawExecutedBy: uid,
          });
        });
        
        logger.info(`✅ [executeDraw] 운영 모드: divisions 컬렉션 저장 완료 (트랜잭션) - ${finalDivisionCount}개 조`);
      }

      // 통계 계산 (로깅용)
      const stats = {
        totalTeams,
        divisionCount: finalDivisionCount,
        teamsPerDivision: {
          base: Math.floor(totalTeams / finalDivisionCount),
          remainder,
          min: Math.floor(totalTeams / finalDivisionCount),
          max: Math.ceil(totalTeams / finalDivisionCount),
        },
      };

      logger.info(`✅ [executeDraw] 조 추첨 완료: ${finalDivisionCount}조, ${totalTeams}팀 (${stats.teamsPerDivision.min}~${stats.teamsPerDivision.max}팀/조)`);

      // 🔥 운영 로그 기록 (opLogs) - testMode가 아닐 때만
      if (!testMode) {
        try {
          const opLogsRef = db.collection(
            `associations/${associationId}/tournaments/${tournamentId}/opLogs`
          );
          await opLogsRef.add({
            ts: FieldValue.serverTimestamp(),
            type: "DRAW_EXECUTED",
            level: "info",
            actorUid: uid,
            actorRole: "admin",
            message: `조 추첨 완료: ${finalDivisionCount}개 조`,
            ref: {
              collection: "drawLogs",
              docId: logRef.id,
            },
            meta: {
              algorithmLevel,
              seedTeamIdsCount: seedTeamIds?.length || 0,
              divisionCount: finalDivisionCount,
              totalTeams,
              logId: logRef.id,
            },
          });
        } catch (logError: any) {
          // 로그 기록 실패는 무시 (소프트 실패)
          logger.warn("⚠️ [executeDraw] 운영 로그 기록 실패:", logError);
        }
      }

      const result: DrawResult = {
        success: true,
        divisionCount: finalDivisionCount,
        teamsPerDivision: Math.ceil(totalTeams / finalDivisionCount),
        divisions,
        executedAt: admin.firestore.Timestamp.now(),
        executedBy: uid,
        logId: logRef.id,
      };

      return result;
    } catch (error: any) {
      // 🔥 상세한 에러 로깅 (디버깅용)
      logger.error("❌ [executeDraw] 조 추첨 실패", {
        error: error?.message || String(error),
        code: error?.code,
        stack: error?.stack,
        name: error?.name,
        errorType: typeof error,
        errorConstructor: error?.constructor?.name,
        errorKeys: error ? Object.keys(error) : [],
        associationId,
        tournamentId,
        divisionCount,
        totalTeams: 0, // catch 블록에서는 approvedTeams 접근 불가
      });
      
      // HttpsError는 그대로 전달
      if (error instanceof HttpsError) {
        logger.info(`[executeDraw] HttpsError 재전달: ${error.code} - ${error.message}`);
        throw error;
      }
      
      // 기타 에러는 internal로 래핑 (원본 메시지 포함)
      const errorMessage = error?.message || error?.toString() || "알 수 없는 오류";
      const errorCode = error?.code || "UNKNOWN_ERROR";
      
      logger.error(`❌ [executeDraw] Internal error: ${errorMessage}`, {
        errorCode,
        stack: error?.stack?.substring(0, 500),
        originalError: error,
      });
      
      throw new HttpsError(
        "internal",
        `조 추첨 실패 (${errorCode}): ${errorMessage}`,
        {
          originalCode: errorCode,
          originalMessage: errorMessage,
          stack: error?.stack?.substring(0, 1000),
        }
      );
    }
  }

