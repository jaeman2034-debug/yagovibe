/**
 * 🔥 조 추첨 실행 버튼 (사무국용)
 * 
 * 시스템 자동 조 추첨 실행
 * - 승인된 팀만 대상
 * - 재실행 불가
 * - 추첨 로그 자동 기록 (감사용)
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { httpsCallable, getFunctions } from "firebase/functions";
import { useAuth } from "@/context/AuthProvider";
import { AlertCircle, Shuffle, CheckCircle2, XCircle, Clock, Crown, Users } from "lucide-react";
import type { Tournament } from "@/types/tournament";
import { formatDate, safeToDate } from "@/utils/dateUtils";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db, app } from "@/lib/firebase";

interface DrawExecuteButtonProps {
  associationId: string;
  tournament: Tournament;
  onSuccess?: () => void; // 추첨 완료 후 콜백
  testMode?: boolean; // 🔥 테스트 모드 (운영 기록 미반영)
}

export function DrawExecuteButton({
  associationId,
  tournament,
  onSuccess,
  testMode = false, // 🔥 테스트 모드 기본값
}: DrawExecuteButtonProps) {
  const { user } = useAuth();
  const [executing, setExecuting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [divisionCount, setDivisionCount] = useState<number | "">("");
  const [seedTeamIds, setSeedTeamIds] = useState<string[]>([]); // 🔥 시드팀 목록
  const [distributeByClub, setDistributeByClub] = useState(false); // 🔥 클럽 분산
  const [publishMode, setPublishMode] = useState<"immediate" | "scheduled">(
    tournament.drawDate?.isPublic ? "immediate" : "scheduled"
  );
  const [approvedTeams, setApprovedTeams] = useState<Array<{ teamId: string; teamName: string }>>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [confirmedCheckbox, setConfirmedCheckbox] = useState(false); // 🔥 필수 확인 체크박스
  const [isTestMode, setIsTestMode] = useState(testMode); // 🔥 테스트 모드 상태
  const [algorithmLevel, setAlgorithmLevel] = useState<0 | 1 | 2>(1); // 🔥 알고리즘 레벨 (기본: 레벨 1)

  // 승인된 팀 목록 조회 (시드팀 선택용)
  useEffect(() => {
    if (!showConfirm) return; // 모달이 열릴 때만 조회
    // 🔥 가드: associationId, tournament.id 확인
    if (!associationId || !tournament?.id) return;

    const loadApprovedTeams = async () => {
      setLoadingTeams(true);
      try {
        const teamsRef = collection(
          db,
          `associations/${associationId}/tournaments/${tournament.id}/teams`
        );
        const teamsQuery = query(teamsRef, where("status", "==", "approved"));
        const teamsSnap = await getDocs(teamsQuery);

        const teams = teamsSnap.docs.map((doc) => ({
          teamId: doc.id,
          teamName: doc.data().teamName || "팀명 없음",
        }));

        setApprovedTeams(teams);
      } catch (error: any) {
        console.error("승인된 팀 목록 조회 실패:", error);
        toast.error("승인된 팀 목록을 불러올 수 없습니다.");
      } finally {
        setLoadingTeams(false);
      }
    };

    loadApprovedTeams();
  }, [showConfirm, associationId, tournament.id]);

  // 이미 추첨되었는지 확인
  // 🔥 테스트 모드일 때는 isTestDraw 플래그만 체크 (일반 drawExecuted는 무시)
  // ⚠️ 중요: 테스트 모드에서는 test_groups 컬렉션 존재 여부도 확인
  const isAlreadyExecuted = isTestMode
    ? ((tournament as any).isTestDraw === true) // 테스트 모드: isTestDraw만 체크
    : tournament.drawExecuted === true; // 운영 모드: 일반 drawExecuted 체크

  // 추첨 가능 여부 상태 (실시간 체크)
  const [checkResult, setCheckResult] = useState<{ allowed: boolean; reason: string | null; approvedTeamCount?: number }>({
    allowed: false,
    reason: null,
    approvedTeamCount: 0,
  });

  // 추첨 가능 여부 확인 (검수 기간 종료 + 승인 팀 수 체크)
  useEffect(() => {
    // 🔥 테스트 모드일 때는 조건 체크 완전 우회 (전체 파이프라인 검증용)
    if (isTestMode) {
      // 테스트 모드: isAlreadyExecuted만 체크 (나머지 조건 모두 무시)
      const testAlreadyExecuted = (tournament as any).isTestDraw === true;
      if (testAlreadyExecuted) {
        setCheckResult({ 
          allowed: false, 
          reason: "이미 테스트 조 추첨이 완료되었습니다.",
          approvedTeamCount: 0,
        });
        console.log("🧪 [조 추첨 체크] 테스트 모드: 이미 실행됨 (isTestDraw = true)");
        return;
      }
      // 테스트 모드: 모든 조건 우회하고 통과
      // ⚠️ 참고: checkResult.allowed는 설정하지만, canDraw 계산에서는 사용하지 않음
      //          (테스트 모드일 때는 isAlreadyExecuted만 체크)
      setCheckResult({ 
        allowed: true, 
        reason: null,
        approvedTeamCount: 0, // 테스트 모드에서는 승인 팀 수 무시
      });
      console.log("🧪 [조 추첨 체크] 테스트 모드: 조건 체크 완전 우회, 활성화됨", {
        isTestMode: true,
        isAlreadyExecuted: testAlreadyExecuted,
        checkResult: { allowed: true, reason: null },
        canDraw_계산_방식: "테스트 모드에서는 isAlreadyExecuted만 체크 (checkResult.allowed 무시)",
      });
      return;
    }
    
    if (isAlreadyExecuted) {
      setCheckResult({ allowed: false, reason: "이미 조 추첨이 완료되었습니다." });
      return;
    }

    const checkCanExecute = async () => {
      // 🔥 가드: associationId, tournament.id 확인
      if (!associationId || !tournament?.id) {
        setCheckResult({ allowed: false, reason: "대회 정보를 불러올 수 없습니다." });
        return;
      }
      
      // 🔥 헬퍼: 날짜를 YYYY-MM-DD 문자열로 변환 (startOf('day') 기준 통일)
      const toDateString = (date: Date | string): string => {
        const d = typeof date === 'string' ? new Date(date) : date;
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      const todayStr = toDateString(new Date());
      const MIN_APPROVED_TEAMS = 2; // 🔥 승인 팀 수 기준 상수화
      const APPROVED_STATUS = "approved"; // 🔥 승인 상태 상수화
      
      // 🔥 디버깅: 조건 체크 시작 (groupCollapsed로 가독성 향상)
      console.groupCollapsed('[조 추첨 체크] 조건 확인');
      console.log('초기 상태', {
        reviewEndDate: tournament.reviewPeriod?.endDate,
        drawDate: tournament.drawDate?.date,
        drawExecuted: tournament.drawExecuted,
        today: todayStr,
      });
      
      let checkResults = {
        reviewPeriodPassed: false,
        approvedTeamsCount: 0,
        approvedTeamsList: [] as Array<{ id: string; name: string; status: string }>,
        drawDatePassed: false,
      };
      
      // 1️⃣ 검수 기간 종료 체크
      if (tournament.reviewPeriod?.endDate) {
        const reviewEndDateStr = toDateString(tournament.reviewPeriod.endDate);
        const reviewPassed = reviewEndDateStr <= todayStr;
        checkResults.reviewPeriodPassed = reviewPassed;
        
        console.log('1️⃣ 검수 종료일', {
          reviewEndDate: reviewEndDateStr,
          today: todayStr,
          passed: reviewPassed,
        });
        
        if (!reviewPassed) {
          console.groupEnd();
          setCheckResult({
            allowed: false,
            reason: `검수 기간 종료일(${formatDate(new Date(tournament.reviewPeriod.endDate))}) 이후에만 추첨할 수 있습니다. (오늘: ${todayStr})`,
          });
          return;
        }
      } else {
        checkResults.reviewPeriodPassed = true; // 검수 기간 미설정 시 통과
        console.log('1️⃣ 검수 종료일', { status: '미설정 (통과)' });
      }
      
      // 2️⃣ 승인 팀 수 체크 (최소 2팀 이상)
      try {
        const teamsRef = collection(
          db,
          `associations/${associationId}/tournaments/${tournament.id}/teams`
        );
        const teamsQuery = query(teamsRef, where("status", "==", APPROVED_STATUS));
        const teamsSnap = await getDocs(teamsQuery);
        
        checkResults.approvedTeamsCount = teamsSnap.size;
        checkResults.approvedTeamsList = teamsSnap.docs.map(d => ({
          id: d.id,
          name: d.data().teamName || '팀명 없음',
          status: d.data().status || 'unknown',
        }));
        
        console.log('2️⃣ 승인 팀 수', {
          required: MIN_APPROVED_TEAMS,
          current: checkResults.approvedTeamsCount,
          passed: checkResults.approvedTeamsCount >= MIN_APPROVED_TEAMS,
          teams: checkResults.approvedTeamsList,
        });
        
        if (checkResults.approvedTeamsCount < MIN_APPROVED_TEAMS) {
          console.groupEnd();
          setCheckResult({
            allowed: false,
            reason: `조 추첨을 진행하려면 최소 ${MIN_APPROVED_TEAMS}개 이상의 승인된 참가 팀이 필요합니다. (현재: ${checkResults.approvedTeamsCount}팀)`,
            approvedTeamCount: checkResults.approvedTeamsCount,
          });
          return;
        }
      } catch (error: any) {
        console.error("승인 팀 수 조회 실패:", error);
        console.groupEnd();
        setCheckResult({
          allowed: false,
          reason: "승인 팀 수를 확인할 수 없습니다.",
          approvedTeamCount: 0,
        });
        return;
      }
      
      // 🔥 STEP 2: Phase 체크 (ROSTER_LOCKED 필수)
      const currentPhase = tournament.tournamentPhase;
      if (currentPhase !== "ROSTER_LOCKED") {
        console.log('2.5️⃣ Phase 체크', {
          currentPhase,
          required: "ROSTER_LOCKED",
          passed: false,
        });
        console.groupEnd();
        setCheckResult({
          allowed: false,
          reason: "팀원 명단 잠금 후, 승인된 팀 2팀 이상일 때 조 추첨 가능합니다.",
          approvedTeamCount: checkResults.approvedTeamsCount,
        });
        return;
      }

      // 3️⃣ 추첨일 확인 (선택적)
      if (tournament.drawDate?.date) {
        const drawDateStr = toDateString(tournament.drawDate.date);
        const drawDatePassed = drawDateStr <= todayStr;
        checkResults.drawDatePassed = drawDatePassed;
        
        console.log('3️⃣ 추첨일', {
          drawDate: drawDateStr,
          today: todayStr,
          passed: drawDatePassed,
        });
        
        if (!drawDatePassed) {
          console.groupEnd();
          setCheckResult({
            allowed: false,
            reason: `조 추첨일(${formatDate(new Date(tournament.drawDate.date))}) 이전에는 추첨할 수 없습니다. (오늘: ${todayStr})`,
            approvedTeamCount: checkResults.approvedTeamsCount,
          });
          return;
        }
      } else {
        checkResults.drawDatePassed = true; // 추첨일 미설정 시 통과
        console.log('3️⃣ 추첨일', { status: '미설정 (통과)' });
      }
      
      // ✅ 모든 조건 통과
      console.log('✅ 최종 결과', {
        reviewPeriodPassed: checkResults.reviewPeriodPassed,
        approvedTeamsCount: checkResults.approvedTeamsCount,
        drawDatePassed: checkResults.drawDatePassed,
        allPassed: true,
      });
      console.groupEnd();
        
        setCheckResult({ 
          allowed: true, 
          reason: null,
        approvedTeamCount: checkResults.approvedTeamsCount,
        });
    };

    checkCanExecute();
    // 🔥 무한루프 방지: tournament.drawExecuted, tournamentPhase, isTestMode 변경 시 재실행
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournament?.drawExecuted, tournament?.tournamentPhase, tournament?.reviewPeriod?.endDate, tournament?.drawDate?.date, associationId, isTestMode]);

  const check = checkResult;

  const handleExecute = async () => {
    // 🔥 실행 전 가드 (중복 실행 방지)
    if (executing) {
      console.warn("[조 추첨 실행] 이미 실행 중입니다.");
      return;
    }

    if (!user) {
      toast.error("로그인이 필요합니다.");
      return;
    }

    if (!check.allowed) {
      toast.error(check.reason || "조 추첨을 실행할 수 없습니다.");
      return;
    }

    setExecuting(true);
    try {
      // 🔥 1️⃣ 핵심: 모든 변수 계산을 최상단에서 먼저 수행 (TDZ 완전 방지)
      // ❗ 원칙: 선언 → 계산 → 검증 → 사용 순서 준수
      
      // 🔥 승인된 팀 수 가져오기 (자동 계산에 필요)
      const approvedTeamCount = check.approvedTeamCount || 0;
      
      console.log("[조 추첨 실행] 변수 계산 시작", {
        입력_조_수_state: divisionCount,
        입력_타입: typeof divisionCount,
        승인_팀_수: approvedTeamCount,
      });

      // 🔥 조 수 계산: 입력값이 있으면 사용, 없으면 자동 계산 (UI 설명과 일치)
      // ✅ 자동 계산 규칙: 4팀 이상 → 2조, 8팀 이상 → 4조
      let calculatedDivisionCount: number;
      
      if (divisionCount !== "" && divisionCount !== null && divisionCount !== undefined) {
        // 사용자 입력값 사용
        const numValue = Number(divisionCount);
        if (!isNaN(numValue) && isFinite(numValue) && numValue >= 1 && numValue <= 8) {
          calculatedDivisionCount = numValue;
        } else {
          // 입력값이 유효하지 않으면 자동 계산
          calculatedDivisionCount = approvedTeamCount >= 8 ? 4 : approvedTeamCount >= 4 ? 2 : 1;
          console.warn("[조 추첨 실행] 입력값 유효하지 않음, 자동 계산 사용", {
            입력값: divisionCount,
            계산된_조_수: calculatedDivisionCount,
          });
        }
      } else {
        // 입력값이 없으면 자동 계산 (UI 설명: "미지정 시 자동 계산")
        calculatedDivisionCount = approvedTeamCount >= 8 ? 4 : approvedTeamCount >= 4 ? 2 : 1;
        console.log("[조 추첨 실행] 입력값 없음, 자동 계산 실행", {
          승인_팀_수: approvedTeamCount,
          계산된_조_수: calculatedDivisionCount,
        });
      }

      console.log("[조 추첨 실행] 조 수 계산 완료", {
        입력값: divisionCount,
        승인_팀_수: approvedTeamCount,
        계산된_조_수: calculatedDivisionCount,
        계산_방식: divisionCount !== "" && divisionCount !== null && divisionCount !== undefined ? "사용자_입력" : "자동_계산",
      });
      
      // 🔥 undefined 방어 (절대 필수)
      if (!calculatedDivisionCount || calculatedDivisionCount < 1 || calculatedDivisionCount > 8) {
        console.error("❌ divisionCount 계산 실패", {
          calculatedDivisionCount,
          approvedTeamCount,
          입력값: divisionCount,
        });
        toast.error("조 수 계산에 실패했습니다. 다시 시도해주세요.");
        setExecuting(false);
        return;
      }

      // 🔥 2️⃣ 검증 (계산된 변수 사용)
      if (calculatedDivisionCount !== undefined) {
        // 범위 검증 (이미 계산 시 검증했지만 추가 안전장치)
        if (calculatedDivisionCount < 1 || calculatedDivisionCount > 8) {
          console.error("[조 추첨 실행] 조 수 범위 오류", { calculatedDivisionCount });
          toast.error("조 수는 1~8조만 가능합니다.");
        setExecuting(false);
        return;
      }

        // 시드팀 수 검증
        if (seedTeamIds.length > 0 && seedTeamIds.length > calculatedDivisionCount) {
          console.error("[조 추첨 실행] 시드팀 수 오류", {
            시드팀_수: seedTeamIds.length,
            조_수: calculatedDivisionCount,
          });
          toast.error(`시드팀 수(${seedTeamIds.length}팀)가 조 수(${calculatedDivisionCount}조)보다 많습니다.`);
          setExecuting(false);
          return;
        }
      }

      // 🔥 3️⃣ Firebase Functions 초기화 (region 명시 필수 - v2 callable 호환)
      // ⚠️ 중요: v2 callable은 region을 명시하지 않으면 Cloud Run까지 요청이 도달하지 않음
      const functions = getFunctions(app, "asia-northeast3");
      const executeDraw = httpsCallable(functions, "executeDrawCallable");
      
      console.log("[조 추첨 실행] Functions 초기화 완료", {
        region: functions.region || "기본값",
        함수명: "executeDrawCallable",
      });

      // 🔥 4️⃣ 요청 payload 구성 (모든 변수 준비 완료 후)
      const requestPayload = {
        associationId,
        tournamentId: tournament.id,
        divisionCount: calculatedDivisionCount, // ✅ 하나의 변수로 통일
        adminId: user.uid,
        seedTeamIds: seedTeamIds.length > 0 ? seedTeamIds : undefined,
        distributeByClub: distributeByClub || undefined,
        publishMode,
        testMode: isTestMode,
        algorithmLevel,
      };

      // 🔥 디버깅: payload 검증 (Firebase Functions internal 에러 방지)
      console.log("[조 추첨 실행] 요청 payload 준비 완료", {
        associationId: requestPayload.associationId,
        tournamentId: requestPayload.tournamentId,
        divisionCount: requestPayload.divisionCount, // ✅ undefined일 수 있음 (자동 계산)
        adminId: requestPayload.adminId,
        seedTeamIds_개수: requestPayload.seedTeamIds?.length || 0,
        distributeByClub: requestPayload.distributeByClub,
        publishMode: requestPayload.publishMode,
        testMode: requestPayload.testMode,
        algorithmLevel: requestPayload.algorithmLevel,
        payload_유효성: requestPayload.associationId && requestPayload.tournamentId && requestPayload.adminId ? "OK" : "ERROR",
      });

      // 🔥 5️⃣ Firebase Function 호출 (모든 준비 완료 후)
      console.log("[조 추첨 실행] Firebase Function 호출 시작");
      console.log("[조 추첨 실행] 최종 payload 상세:", JSON.stringify(requestPayload, null, 2));
      
      const result = await executeDraw(requestPayload);
      
      console.log("[조 추첨 실행] Firebase Function 호출 완료", {
        성공: !!result?.data,
        응답_데이터_존재: !!result?.data,
        응답_전체: result,
      });

      const data = result.data as any;
      
      // 🔥 testMode 전용 분기: 테스트 모드에서는 검증 스킵 (서버가 빈 결과를 의도적으로 반환)
      if (isTestMode || data.message?.includes("테스트 모드") || data.logId === "test-mode-skip") {
        console.log("✅ [조 추첨 실행] 테스트 모드 조 추첨 성공 (검증 스킵)", {
          message: data.message,
          logId: data.logId,
        });
        toast.success("✅ 테스트 모드 조 추첨 성공 (검증 완료)", {
          description: "서버 연결 및 함수 호출이 정상적으로 작동했습니다.",
        });
        setShowConfirm(false);
        setExecuting(false);
        if (onSuccess) {
          onSuccess();
        }
        return; // testMode에서는 여기서 종료
      }
      
      const totalTeams = data.result?.divisions?.reduce((sum: number, d: any) => sum + d.teams.length, 0) || 0;
      // 🔥 변수명 충돌 방지: 결과의 divisionCount는 resultDivisionCount로 명명
      const resultDivisionCount = data.divisionCount || 0;
      
      // 🔥 안전성 검증: resultDivisionCount가 유효한 값인지 확인 (운영 모드만)
      if (typeof resultDivisionCount !== "number" || resultDivisionCount < 1) {
        console.error("❌ 조 추첨 결과 검증 실패", {
          resultDivisionCount,
          data,
          원인: "서버에서 반환된 divisionCount가 유효하지 않음",
        });
        throw new Error("조 추첨 결과가 유효하지 않습니다.");
      }
      
      // 🔥 조 추첨 결과 로그 출력 (디버깅 및 검증용)
      console.group("[조 추첨 실행] ✅ 성공");
      console.log("📊 조 추첨 결과 요약", {
        조_수: resultDivisionCount,
        총_팀_수: totalTeams,
        테스트_모드: isTestMode,
        알고리즘_버전: data.algorithm?.version || "unknown",
        알고리즘_레벨: data.algorithm?.level || "unknown",
      });
      console.log("📋 조별 배정 결과", {
        조_목록: data.result?.divisions?.map((d: any) => ({
          조: d.division,
          팀_수: d.teamIds?.length || 0,
          팀명_목록: d.teamNames || [],
        })) || [],
      });
      console.log("🔍 다음 단계", {
        다음_액션: "경기 자동 생성",
        활성화_조건: "조 추첨 완료 상태 (drawExecuted === true)",
        예상_경기_수: "조별 리그 방식으로 자동 계산",
      });
      console.groupEnd();

      // 🔥 운영 로그 기록 (테스트 모드가 아닐 때만)
      if (!isTestMode) {
        try {
          const opsLogRef = collection(
            db,
            `associations/${associationId}/tournaments/${tournament.id}/opsLogs`
          );
          await addDoc(opsLogRef, {
            action: "조 추첨 실행",
            executor: user.uid,
            executorName: user.email || "관리자",
            timestamp: serverTimestamp(),
            details: `${resultDivisionCount}조, ${totalTeams}팀`,
            metadata: {
              divisionCount: resultDivisionCount,
              totalTeams,
              seedTeamIds: seedTeamIds.length > 0 ? seedTeamIds : null,
              distributeByClub,
              publishMode,
            },
          });
        } catch (logError) {
          console.error("운영 로그 기록 실패:", logError);
          // 로그 실패해도 조 추첨은 계속 진행
        }
      }

      toast.success(
        `✅ 조 추첨 완료: ${resultDivisionCount}조, ${totalTeams}팀${isTestMode ? " (테스트 모드)" : ""}`
      );

      setShowConfirm(false);
      setDivisionCount("");
      setSeedTeamIds([]);
      setDistributeByClub(false);
      setPublishMode(tournament.drawDate?.isPublic ? "immediate" : "scheduled");
      setConfirmedCheckbox(false); // 🔥 체크박스 초기화

      // 🔥 콜백 호출 (무한루프 방지: 단일 실행 보장, 에러 처리)
      if (onSuccess) {
        try {
          await onSuccess();
        } catch (callbackError) {
          console.error("[조 추첨 완료] onSuccess 콜백 실행 실패:", callbackError);
          // 콜백 실패해도 조 추첨은 성공으로 처리
        }
      }
    } catch (error: any) {
      // 🔥 상세한 에러 로깅 (Cloud Function 디버깅용)
      console.error("❌ 조 추첨 실행 실패", {
        error,
        errorType: typeof error,
        errorConstructor: error?.constructor?.name,
        code: error?.code,
        message: error?.message,
        details: error?.details,
        detailsType: typeof error?.details,
        detailsKeys: error?.details ? Object.keys(error?.details) : [],
        stack: error?.stack,
        발생_위치: "handleExecute 함수",
      });
      
      // 🔥 details에 있는 원본 에러 정보 추출
      const originalError = error?.details?.originalError || error?.details?.originalMessage || error?.details?.message;
      const originalCode = error?.details?.originalCode || error?.details?.code;
      const errorStack = error?.details?.stack || error?.stack;
      
      if (originalError || originalCode) {
        console.error("🔍 Cloud Function 내부 에러 상세:", {
          originalError,
          originalCode,
          errorStack: errorStack?.substring(0, 500),
        });
      }
      
      const message = originalError || error?.message || error?.details?.message || "조 추첨 실행 중 오류가 발생했습니다.";
      toast.error(`❌ 조 추첨 실패: ${message}`);
      
      // 🔥 에러 상세 정보를 개발자 콘솔에 출력 (디버깅용)
      if (error?.code) {
        console.error("에러 코드:", error.code);
      }
    } finally {
      setExecuting(false);
    }
  };

  // 이미 실행됨 (테스트 모드가 아닐 때만 체크)
  // 공식 승격 후에는 테스트 모드도 비활성화
  if (isAlreadyExecuted && !isTestMode) {
    return (
      <div className="border rounded-lg p-4 bg-green-50 border-green-200">
        <div className="flex items-center gap-3 mb-3">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <span className="font-semibold text-green-900">조 추첨 상태: 완료 ✅</span>
        </div>
        <div className="text-sm text-green-800 space-y-1">
          <p>조 추첨이 이미 완료되었습니다. 재실행할 수 없습니다.</p>
          {tournament.drawExecutedAt && (
            <div className="mt-2 pt-2 border-t border-green-300">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>실행 시각: {safeToDate(tournament.drawExecutedAt).toLocaleString("ko-KR")}</span>
              </div>
              {tournament.drawExecutedBy && (
                <div className="flex items-center gap-2 mt-1">
                  <Users className="w-4 h-4" />
                  <span>실행자: {tournament.drawExecutedBy}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 🔥 STEP 2: 추첨 가능 여부 계산 (명확한 조건)
  // 🔥 테스트 모드일 때는 조건 체크 완전 우회 (전체 파이프라인 검증용)
  // ⚠️ 핵심: 테스트 모드일 때는 checkResult.allowed를 완전히 무시하고, isAlreadyExecuted만 체크
  //          (checkResult.allowed는 실제 조건 기준이므로 테스트 모드에서는 사용하지 않음)
  const canDraw = isTestMode
    ? !isAlreadyExecuted // 테스트 모드: isAlreadyExecuted만 체크, 나머지 조건 모두 무시
    : (
        checkResult.allowed &&
        !isAlreadyExecuted &&
        tournament.tournamentPhase === "ROSTER_LOCKED" &&
        (checkResult.approvedTeamCount || 0) >= 2
      ); // 운영 모드: 기존 조건
  
  // 🔥 디버깅: canDraw 계산 결과 로그
  console.log("[조 추첨 버튼] canDraw 계산 결과", {
    isTestMode,
    isAlreadyExecuted,
    checkResult_allowed: checkResult.allowed,
    checkResult_reason: checkResult.reason,
    tournamentPhase: tournament.tournamentPhase,
    approvedTeamCount: checkResult.approvedTeamCount,
    canDraw,
    계산_방식: isTestMode 
      ? "테스트 모드 (조건 완전 우회, isAlreadyExecuted만 체크)" 
      : "운영 모드 (전체 조건 체크)",
  });

  // 🔥 테스트 모드일 때는 경고 Alert를 렌더링하지 않고 바로 체크박스와 버튼을 보여줌
  // 추첨 불가 상태 (테스트 모드일 때는 경고 메시지 완전 숨김 - 체크박스가 보이도록)
  // ⚠️ 중요: 테스트 모드일 때는 Alert를 렌더링하지 않고 바로 체크박스와 버튼을 보여줌
  // if (!canDraw && !isTestMode) 조건은 아래 return 문에서 처리

  return (
    <div className="space-y-4">
      {/* 🔥 조 추첨 상태 표시 */}
      <div className="border rounded-lg p-4 bg-white">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <span className="font-semibold text-gray-900">조 추첨 상태: {isTestMode ? "테스트 모드" : "미실행"}</span>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          승인된 팀을 랜덤 알고리즘으로 조에 배정합니다. 이 작업은 1회만 실행 가능하며 되돌릴 수 없습니다.
        </p>
        
        {/* 🔥 테스트 모드 토글 (최상단에 배치하여 항상 보이도록) */}
        <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-2">
            <Checkbox
              id="test-mode-toggle"
              checked={isTestMode}
              onCheckedChange={(checked) => setIsTestMode(checked as boolean)}
            />
            <label
              htmlFor="test-mode-toggle"
              className="text-sm font-medium text-gray-900 cursor-pointer flex-1"
            >
              테스트 모드로 조 추첨 실행 (운영 기록 미반영)
            </label>
          </div>
          {isTestMode && (
            <p className="text-xs text-amber-700 mt-2 ml-6">
              ⚠️ 테스트 모드: 조 추첨 결과는 test_groups 컬렉션에 저장되며, 공식 기록에는 반영되지 않습니다.
            </p>
          )}
        </div>
        
        {/* 🔥 테스트 모드일 때 안내 메시지 (버튼 위에 표시) */}
        {isTestMode && (
          <div className={`mb-3 p-2 rounded-lg border ${canDraw ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
            <p className={`text-xs font-medium ${canDraw ? "text-green-800" : "text-amber-800"}`}>
              {canDraw 
                ? "✅ 테스트 모드 활성화: 모든 조건 체크를 완전히 우회하여 조 추첨을 실행할 수 있습니다."
                : "⚠️ 테스트 모드: 이미 테스트 조 추첨이 완료되었습니다. (재실행 불가)"
              }
            </p>
            {canDraw && (
              <p className="text-xs text-green-700 mt-1">
                💡 팀 수, 검수 종료일, 추첨일 등 모든 조건이 무시됩니다.
              </p>
            )}
          </div>
        )}
        
        {/* 🔥 STEP 2: 버튼 비활성 조건 (canDraw) */}
        <Button
          onClick={() => setShowConfirm(true)}
          disabled={executing || !canDraw}
          className={`w-full text-white ${isTestMode ? "bg-orange-600 hover:bg-orange-700" : "bg-blue-600 hover:bg-blue-700"} ${!canDraw ? "opacity-50 cursor-not-allowed" : ""}`}
          size="lg"
        >
          <Shuffle className="w-4 h-4 mr-2" />
          {isTestMode ? "조 추첨 실행 (테스트)" : "조 추첨 실행"}
        </Button>
        
        {/* 🔥 STEP 2: 버튼 비활성 이유 설명 UX (테스트 모드일 때는 완전 숨김) */}
        {/* ⚠️ 중요: 테스트 모드일 때는 Alert를 완전히 숨김 (체크박스와 버튼이 보이도록) */}
        {!canDraw && !isTestMode && (
          <div className="mt-3">
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <AlertTitle className="text-yellow-900">조 추첨 불가</AlertTitle>
              <AlertDescription className="text-yellow-800">
                <p className="font-medium mb-2">
                  상태: {
                    tournament.tournamentPhase !== "ROSTER_LOCKED" 
                      ? "팀원 명단 확정 필요" 
                      : (checkResult.approvedTeamCount || 0) < 2 
                        ? "팀 수 부족" 
                        : checkResult.reason || "조건 미충족"
                  }
                </p>
                <div className="space-y-1 mt-2">
                  {tournament.tournamentPhase !== "ROSTER_LOCKED" && (
                    <p className="text-xs text-yellow-700">⚠ 팀원 명단이 아직 확정되지 않았습니다.</p>
                  )}
                  {(checkResult.approvedTeamCount || 0) < 2 && (
                    <p className="text-xs text-yellow-700">
                      ⚠ 승인된 팀이 2팀 이상 필요합니다. (현재: {checkResult.approvedTeamCount || 0}팀)
                    </p>
                  )}
                  {checkResult.reason && (
                    <p className="text-xs text-yellow-700">{checkResult.reason}</p>
                  )}
                </div>
                {checkResult.approvedTeamCount !== undefined && (
                  <p className="text-sm mt-2">
                    현재 승인 팀: <strong>{checkResult.approvedTeamCount}팀</strong>
                  </p>
                )}
                {tournament.drawDate?.date && (
                  <div className="mt-2 text-sm">
                    추첨일: {formatDate(new Date(tournament.drawDate.date))}
                  </div>
                )}
                {tournament.reviewPeriod?.endDate && (
                  <div className="mt-2 text-sm">
                    검수 종료일: {formatDate(new Date(tournament.reviewPeriod.endDate))}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          </div>
        )}
      </div>

      {/* 확인 모달 */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-red-600" />
              조 추첨을 실행하시겠습니까?
            </DialogTitle>
            <DialogDescription className="text-base mt-2">
              조 추첨을 실행하기 전에 아래 내용을 확인해주세요.
            </DialogDescription>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 mt-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-900 mb-2">
                      ⚠️ 조 추첨은 되돌릴 수 없습니다
                    </p>
                    <ul className="text-sm text-red-800 space-y-1 list-disc list-inside">
                      <li>조 추첨은 <strong>1회만 실행</strong>됩니다.</li>
                      <li>실행 후 <strong>되돌릴 수 없습니다</strong>.</li>
                      <li>추첨 결과는 <strong>자동 저장</strong>되며,</li>
                      <li>운영 로그 및 <strong>행정 증빙</strong>으로 사용됩니다.</li>
                    </ul>
                  </div>
                </div>
              </div>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            {/* 조 수 설정 */}
            <div>
              <Label htmlFor="divisionCount">조 수 (선택)</Label>
              <Input
                id="divisionCount"
                type="number"
                min="1"
                max="8"
                value={divisionCount}
                onChange={(e) => setDivisionCount(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="미지정 시 자동 계산 (4팀 이상 2조, 8팀 이상 4조, 16팀 이상 8조)"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                미지정 시 팀 수에 따라 자동으로 조 수가 결정됩니다.
              </p>
            </div>

            {/* 시드팀 선택 (옵션 B) */}
            {approvedTeams.length > 0 && (
              <div>
                <Label>시드팀 선택 (선택)</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  시드팀은 각 조에 1팀씩 먼저 배치됩니다. (최대 조 수만큼)
                </p>
                <div className="max-h-32 overflow-y-auto border rounded-lg p-2 space-y-2">
                  {loadingTeams ? (
                    <p className="text-sm text-muted-foreground text-center py-2">로딩 중...</p>
                  ) : (
                    approvedTeams.map((team) => {
                      const isSelected = seedTeamIds.includes(team.teamId);
                      const canSelect = !isSelected && (divisionCount === "" || seedTeamIds.length < Number(divisionCount));
                      
                      return (
                        <div key={team.teamId} className="flex items-center gap-2">
                          <Checkbox
                            id={`seed-${team.teamId}`}
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                // 최대 조 수까지만 선택 가능
                                if (divisionCount === "" || seedTeamIds.length < Number(divisionCount)) {
                                  setSeedTeamIds([...seedTeamIds, team.teamId]);
                                } else {
                                  toast.error(`시드팀은 조 수(${divisionCount}조)만큼만 선택할 수 있습니다.`);
                                }
                              } else {
                                setSeedTeamIds(seedTeamIds.filter((id) => id !== team.teamId));
                              }
                            }}
                            disabled={!canSelect && !isSelected}
                          />
                          <label
                            htmlFor={`seed-${team.teamId}`}
                            className={`text-sm flex items-center gap-1 ${isSelected ? "font-medium" : ""} ${!canSelect && !isSelected ? "opacity-50" : "cursor-pointer"}`}
                          >
                            {isSelected && <Crown className="w-3 h-3 text-yellow-500" />}
                            {team.teamName}
                          </label>
                        </div>
                      );
                    })
                  )}
                </div>
                {seedTeamIds.length > 0 && (
                  <p className="text-xs text-green-600 mt-1">
                    시드팀 {seedTeamIds.length}팀 선택됨
                  </p>
                )}
              </div>
            )}

              {/* 알고리즘 레벨 선택 */}
              <div>
                <Label htmlFor="algorithmLevel">조 추첨 알고리즘</Label>
                <Select
                  value={String(algorithmLevel)}
                  onValueChange={(value) => setAlgorithmLevel(Number(value) as 0 | 1 | 2)}
                >
                  <SelectTrigger id="algorithmLevel" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">레벨 0: 완전 랜덤 (테스트용)</SelectItem>
                    <SelectItem value="1">레벨 1: 시드 분산 + 랜덤 (권장)</SelectItem>
                    <SelectItem value="2">레벨 2: 시드 + 회피 규칙 + 균형 (고급)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {algorithmLevel === 0 && "완전 랜덤 배정 (테스트/데모용)"}
                  {algorithmLevel === 1 && "시드팀은 서로 다른 조로 분산, 나머지는 랜덤 배정"}
                  {algorithmLevel === 2 && "시드 분산 + 동일 클럽 회피 + 조별 균형 최적화"}
                </p>
              </div>

              {/* 클럽 분산 옵션 (레벨 2일 때만 표시) */}
              {algorithmLevel === 2 && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="distributeByClub"
                    checked={distributeByClub}
                    onCheckedChange={(checked) => setDistributeByClub(checked as boolean)}
                  />
                  <label htmlFor="distributeByClub" className="text-sm cursor-pointer">
                    동일 클럽/지역 회피 적용 (레벨 2)
                  </label>
                </div>
              )}
              {algorithmLevel === 2 && distributeByClub && (
                <p className="text-xs text-muted-foreground ml-6">
                  같은 클럽/동호회 팀을 가능한 한 서로 다른 조에 배치합니다.
                </p>
              )}

            {/* 공개 모드 선택 */}
            <div>
              <Label htmlFor="publishMode">결과 공개</Label>
              <Select
                value={publishMode}
                onValueChange={(value) => setPublishMode(value as "immediate" | "scheduled")}
              >
                <SelectTrigger id="publishMode" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">즉시 공개</SelectItem>
                  <SelectItem value="scheduled">예약 공개 (조 추첨일 설정에 따라)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {publishMode === "immediate"
                  ? "추첨 완료 후 즉시 모든 사용자에게 공개됩니다."
                  : "조 추첨일 설정에 따라 예약 공개됩니다."}
              </p>
            </div>

            {/* 🔥 필수 확인 체크박스 */}
            <div className="border-t pt-4 mt-4">
              <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <Checkbox
                  id="confirm-checkbox"
                  checked={confirmedCheckbox}
                  onCheckedChange={(checked) => setConfirmedCheckbox(checked as boolean)}
                  className="mt-0.5"
                />
                <label
                  htmlFor="confirm-checkbox"
                  className="text-sm font-medium text-gray-900 cursor-pointer flex-1"
                >
                  ☑ 위 내용을 모두 확인했습니다.
                </label>
              </div>
              {!confirmedCheckbox && (
                <p className="text-xs text-red-600 mt-2 ml-6">
                  확인 체크박스를 선택해야 조 추첨을 실행할 수 있습니다.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirm(false);
                setDivisionCount("");
                setConfirmedCheckbox(false);
              }}
              disabled={executing}
            >
              취소
            </Button>
            <Button
              onClick={handleExecute}
              disabled={executing || !confirmedCheckbox}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {executing ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  추첨 중...
                </>
              ) : (
                <>
                  <Shuffle className="w-4 h-4 mr-2" />
                  조 추첨 실행
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

