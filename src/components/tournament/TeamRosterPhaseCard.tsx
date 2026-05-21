/**
 * 🔥 팀원 등록 Phase 제어 카드 (관리자 전용, 천재 모드)
 * 
 * 기능:
 * - 팀원 등록 시작 (ROSTER_OPEN)
 * - 팀원 명단 잠금 (ROSTER_LOCKED)
 * - 현재 phase 표시
 */

import { useState, useEffect } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, Lock, Unlock, CheckCircle2 } from "lucide-react";
import { MIN_PLAYERS, MAX_PLAYERS } from "@/constants/rosterPolicy";
import { useAuth } from "@/context/AuthProvider";
import { auth, app, db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { checkStepBConditions, type StepBConditions } from "@/lib/tournament/stepConditions";

interface TeamRosterPhaseCardProps {
  associationId: string;
  tournamentId: string;
  currentPhase: string | undefined;
  onUpdate?: () => void;
}

export function TeamRosterPhaseCard({
  associationId,
  tournamentId,
  currentPhase,
  onUpdate,
}: TeamRosterPhaseCardProps) {
  const { user } = useAuth();
  const [opening, setOpening] = useState(false);
  const [locking, setLocking] = useState(false);
  const [approvedTeamsCount, setApprovedTeamsCount] = useState<number | null>(null);
  const [loadingTeamsCount, setLoadingTeamsCount] = useState(false);
  const [stepBConditions, setStepBConditions] = useState<StepBConditions | null>(null);
  const [checkingStepB, setCheckingStepB] = useState(false);

  // 🔥 PING 테스트 완료 (성공 확인됨) - 주석 처리
  // useEffect(() => {
  //   const testPing = async () => {
  //     try {
  //       console.log("🔥 PING 테스트 시작");
  //       const functions = getFunctions(app, "asia-northeast3");
  //       const ping = httpsCallable(functions, "pingCallable");
  //       const res = await ping();
  //       console.log("✅ ping result:", res.data);
  //       console.log("✅ 엔드포인트 연결 성공!");
  //     } catch (error: any) {
  //       console.error("❌ PING 실패:", error);
  //       console.error("❌ code:", error?.code);
  //       console.error("❌ message:", error?.message);
  //     }
  //   };
  //   testPing();
  // }, []);

  const isRosterOpen = currentPhase === "ROSTER_OPEN";
  const isRosterLocked = currentPhase === "ROSTER_LOCKED";

  // 🔥 승인된 팀 수 조회
  useEffect(() => {
    const fetchApprovedTeamsCount = async () => {
      if (!associationId || !tournamentId) return;
      
      setLoadingTeamsCount(true);
      try {
        const teamsRef = collection(
          db,
          `associations/${associationId}/tournaments/${tournamentId}/teams`
        );
        const teamsQuery = query(teamsRef, where("status", "==", "APPROVED"));
        const teamsSnap = await getDocs(teamsQuery);
        setApprovedTeamsCount(teamsSnap.size);
      } catch (error) {
        console.error("[팀원 등록 관리] 승인 팀 수 조회 실패:", error);
        setApprovedTeamsCount(null);
      } finally {
        setLoadingTeamsCount(false);
      }
    };

    fetchApprovedTeamsCount();
  }, [associationId, tournamentId, onUpdate]);

  // 🔥 팀원 등록 시작
  const handleOpenRoster = async () => {
    // 🔥 1. 중복 호출 방지
    if (opening) {
      console.warn("[팀원 등록 시작] 이미 처리 중입니다. 중복 요청 무시");
      return;
    }

    // 🔥 2. Phase 전이 가드: 이미 ROSTER_OPEN이면 차단
    if (currentPhase === "ROSTER_OPEN") {
      toast.info("이미 팀원 등록이 진행 중입니다.");
      return;
    }

    // 🔥 필수 파라미터 검증 (방어 코드)
    if (!associationId || !tournamentId) {
      console.error("[팀원 등록 시작] 필수 파라미터 누락:", {
        associationId,
        tournamentId,
        associationId_type: typeof associationId,
        tournamentId_type: typeof tournamentId,
      });
      toast.error("대회 정보가 올바르지 않습니다. 페이지를 새로고침해주세요.");
      return;
    }

    if (
      !confirm(
        "팀원 등록을 시작하시겠습니까?\n\n팀 대표들이 팀원을 등록할 수 있게 됩니다."
      )
    ) {
      return;
    }

    setOpening(true);
    const loadingToastId = toast.loading("팀원 등록 기간 시작 중...");

    try {
      // 🔥 토큰 확인: securetoken API 차단 문제로 인해 getIdToken(true) 사용 안 함
      if (user) {
        // 기존 토큰 사용 (강제 갱신 없음)
        await user.getIdToken();
        console.log("[팀원 등록 시작] 토큰 확인 완료");
      }

      // ⚠️ 중요: v2 callable은 region을 명시하지 않으면 Cloud Run까지 요청이 도달하지 않음
      const functions = getFunctions(app, "asia-northeast3");
      
      // 🔥 정답: httpsCallable은 문자열로 직접 함수 이름을 전달
      const updatePhaseFn = httpsCallable(
        functions,
        "updateTournamentPhaseCallable"
      );

      console.log("🧪 STEP 4: 함수 호출 직전");

      // 🔥 반드시 await로 실제 실행
      const result = await updatePhaseFn({
        associationId,
        tournamentId,
        phase: "ROSTER_OPEN",
      });

      console.log("🧪 STEP 5: 함수 호출 성공", result);

      toast.success("팀원 등록 기간이 시작되었습니다.", {
        id: loadingToastId,
      });
      
      // 🔥 상태 업데이트 후 즉시 반영을 위해 콜백 호출
      onUpdate?.();
      
      // 🔥 팀 관리 섹션으로 스크롤 (팀 대표들이 선수 등록할 수 있도록 안내)
      setTimeout(() => {
        // 팀 관리 섹션 ID로 스크롤 시도
        const teamsSection = document.getElementById("teams-management-section");
        if (teamsSection) {
          teamsSection.scrollIntoView({ behavior: "smooth", block: "start" });
          // 추가 안내 토스트
          setTimeout(() => {
            toast.info("팀 대표들이 이제 선수를 등록할 수 있습니다.", {
              duration: 3000,
            });
          }, 500);
        } else {
          // 섹션이 없으면 페이지 새로고침 (기존 동작 유지)
          window.location.reload();
        }
      }, 300);
    } catch (error: any) {
      // 🔥 천재 디버깅: 진짜 에러 코드까지 찍기
      console.error("[팀원 등록 시작 오류] raw:", error);
      console.error("[팀원 등록 시작 오류] code:", error?.code);
      console.error("[팀원 등록 시작 오류] message:", error?.message);
      console.error("[팀원 등록 시작 오류] details:", error?.details);
      
      // 🔥 Auth 토큰 차단 감지 및 명확한 안내
      const isAuthError = 
        error?.code === "functions/internal" ||
        error?.message?.includes("securetoken.googleapis.com") ||
        error?.message?.includes("auth/requests-to-this-api") ||
        error?.code === "unauthenticated";
      
      let errorMessage: string;
      if (isAuthError) {
        errorMessage = 
          "인증 토큰 갱신 실패\n\n" +
          "브라우저 확장 프로그램(광고 차단, VPN 등)을 비활성화하거나\n" +
          "시크릿 모드에서 다시 시도해주세요.\n\n" +
          "또는 네트워크 환경(회사망, VPN)을 확인해주세요.";
      } else {
        errorMessage =
          error?.message ||
          error?.details?.message ||
          error?.code ||
          "팀원 등록 기간 시작에 실패했습니다.";
      }
      
      toast.error(errorMessage, {
        id: loadingToastId,
        duration: 8000,
      });
    } finally {
      setOpening(false);
    }
  };

  // 🔥 팀원 명단 잠금
  const handleLockRoster = async () => {
    // 🔥 1. 중복 호출 방지
    if (locking) {
      console.warn("[팀원 등록 잠금] 이미 처리 중입니다. 중복 요청 무시");
      return;
    }

    // 🔥 2. Phase 전이 가드: 이미 ROSTER_LOCKED이면 차단
    if (currentPhase === "ROSTER_LOCKED") {
      toast.info("이미 팀원 명단이 잠겨 있습니다.");
      return;
    }

    // 🔥 3. STEP B 조건 사전 체크 (승인 팀 수 + 선수 수 검증)
    if (stepBConditions && !stepBConditions.allConditionsMet) {
      toast.error(
        stepBConditions.reason || 
        "팀원 명단을 잠그려면 승인된 팀이 필요하고, 모든 팀의 선수 수가 충족되어야 합니다.",
        { duration: 8000 }
      );
      return;
    }

    // 🔥 추가 안전장치: 승인 팀 수 체크 (stepBConditions가 없을 때)
    if (approvedTeamsCount !== null && approvedTeamsCount === 0) {
      toast.error(
        "팀원 명단을 잠그려면 최소 1개 이상의 승인된 팀이 필요합니다.\n\n" +
        "먼저 '참가 신청 관리' 탭에서 팀을 승인해주세요.",
        { duration: 8000 }
      );
      return;
    }

    if (
      !confirm(
        "팀원 명단을 잠그면 이후 수정이 불가능합니다.\n\n모든 팀의 팀원 등록이 잠기며, 조 추첨을 진행할 수 있습니다.\n\n이 작업은 되돌릴 수 없습니다. 진행할까요?"
      )
    ) {
      return;
    }

    setLocking(true);
    const loadingToastId = toast.loading("팀원 등록 잠금 중...");

    try {
      // 🔥 토큰 확인: securetoken API 차단 문제로 인해 getIdToken(true) 사용 안 함
      if (user) {
        // 기존 토큰 사용 (강제 갱신 없음)
        await user.getIdToken();
        console.log("[팀원 등록 잠금] 토큰 확인 완료");
      }

      // ⚠️ 중요: v2 callable은 region을 명시하지 않으면 Cloud Run까지 요청이 도달하지 않음
      const functions = getFunctions(app, "asia-northeast3");
      
      // 🔥 정답: httpsCallable은 문자열로 직접 함수 이름을 전달
      const updatePhaseFn = httpsCallable(
        functions,
        "updateTournamentPhaseCallable"
      );
      
      console.log("[팀원 등록 잠금] Functions 초기화 완료", {
        region: functions.region || "기본값",
        함수명: "updateTournamentPhaseCallable",
      });

      await updatePhaseFn({
        associationId,
        tournamentId,
        phase: "ROSTER_LOCKED",
      });

      toast.success("팀원 명단이 잠겼습니다.", {
        id: loadingToastId,
      });
      onUpdate?.();
    } catch (error: any) {
      // 🔥 천재 디버깅: 진짜 에러 코드까지 찍기
      console.error("[팀원 등록 잠금 오류] raw:", error);
      console.error("[팀원 등록 잠금 오류] code:", error?.code);
      console.error("[팀원 등록 잠금 오류] message:", error?.message);
      console.error("[팀원 등록 잠금 오류] details:", error?.details);
      
      // 🔥 Auth 토큰 차단 감지 및 명확한 안내
      const isAuthError = 
        error?.code === "functions/internal" ||
        error?.message?.includes("securetoken.googleapis.com") ||
        error?.message?.includes("auth/requests-to-this-api") ||
        error?.code === "unauthenticated";
      
      let errorMessage: string;
      if (isAuthError) {
        errorMessage = 
          "인증 토큰 갱신 실패\n\n" +
          "브라우저 확장 프로그램(광고 차단, VPN 등)을 비활성화하거나\n" +
          "시크릿 모드에서 다시 시도해주세요.\n\n" +
          "또는 네트워크 환경(회사망, VPN)을 확인해주세요.";
      } else if (error?.code === "failed-precondition") {
        // 🔥 승인된 팀이 없는 경우 명확한 안내
        const errorMsg = error?.message || error?.details?.message || "";
        if (errorMsg.includes("승인된 팀이 없습니다")) {
          errorMessage = 
            "팀원 명단을 잠그려면 최소 1개 이상의 승인된 팀이 필요합니다.\n\n" +
            "다음 단계:\n" +
            "1. '참가 신청 관리' 탭으로 이동\n" +
            "2. 대기 중인 참가 신청을 승인\n" +
            "3. 승인 완료 후 다시 시도";
        } else {
          errorMessage = errorMsg || "팀원 등록 잠금에 실패했습니다.";
        }
      } else {
        errorMessage =
          error?.message ||
          error?.details?.message ||
          error?.code ||
          "팀원 등록 잠금에 실패했습니다.";
      }
      
      toast.error(errorMessage, {
        id: loadingToastId,
        duration: 8000,
      });
    } finally {
      setLocking(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          팀원 등록 관리
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 현재 상태 */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700">현재 단계</div>
          {isRosterOpen && (
            <Alert className="bg-green-50 border-green-200">
              <AlertDescription className="text-green-800">
                ✅ 팀원 등록 진행 중
              </AlertDescription>
            </Alert>
          )}
          {isRosterLocked && (
            <Alert className="bg-red-50 border-red-200">
              <AlertDescription className="text-red-800">
                🔒 팀원 등록 잠금됨 (조 추첨 가능)
              </AlertDescription>
            </Alert>
          )}
          {!isRosterOpen && !isRosterLocked && (
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertDescription className="text-yellow-800">
                ⏳ 팀원 등록 기간 미시작
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* 설명 */}
        <p className="text-sm text-gray-600">
          팀원(선수) 등록 가능 여부를 제어합니다.
        </p>

        {/* 액션 버튼 */}
        <div className="flex gap-2">
          {!isRosterOpen && !isRosterLocked && (
            <Button
              onClick={handleOpenRoster}
              disabled={opening}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              <Unlock className="w-4 h-4 mr-2" />
              {opening ? "시작 중..." : "팀원 등록 시작"}
            </Button>
          )}

          {isRosterOpen && (
            <Button
              onClick={handleLockRoster}
              disabled={
                locking || 
                checkingStepB ||
                (stepBConditions && !stepBConditions.allConditionsMet) ||
                (approvedTeamsCount !== null && approvedTeamsCount === 0)
              }
              variant="destructive"
              className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
            >
              <Lock className="w-4 h-4 mr-2" />
              {locking 
                ? "잠금 중..." 
                : checkingStepB
                ? "조건 확인 중..."
                : stepBConditions && !stepBConditions.allConditionsMet
                ? stepBConditions.reason || "조건 미충족"
                : approvedTeamsCount === 0
                ? "승인된 팀 필요"
                : "팀원 명단 잠금"}
            </Button>
          )}

          {isRosterLocked && (
            <div className="space-y-2 w-full">
              <div className="text-sm text-gray-600 flex items-center">
                <span className="mr-2">🔒</span>
                팀원 등록이 잠겨 있습니다. 조 추첨을 진행할 수 있습니다.
              </div>
              {approvedTeamsCount !== null && (
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  승인된 팀: {approvedTeamsCount}팀
                </div>
              )}
            </div>
          )}
        </div>

        {/* 🔥 STEP B 조건 상태 표시 */}
        {isRosterOpen && stepBConditions && (
          <Alert className={
            stepBConditions.allConditionsMet
              ? "bg-green-50 border-green-200"
              : "bg-yellow-50 border-yellow-200"
          }>
            <AlertDescription className={
              stepBConditions.allConditionsMet
                ? "text-green-800 text-sm"
                : "text-yellow-800 text-sm"
            }>
              {stepBConditions.allConditionsMet ? (
                <div className="space-y-1">
                  <div className="font-medium">✅ 팀원 명단 잠금 가능</div>
                  <div className="text-xs">
                    승인된 팀: {stepBConditions.approvedTeamsCount}팀
                    {stepBConditions.approvedTeams.length > 0 && (
                      <span className="ml-2">
                        (모든 팀 선수 수 충족: {stepBConditions.approvedTeams.filter(t => t.isValid).length}/{stepBConditions.approvedTeams.length})
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="font-medium">⚠️ 팀원 명단 잠금 불가</div>
                  <div className="text-xs">
                    {stepBConditions.reason || "조건을 확인할 수 없습니다."}
                  </div>
                  {stepBConditions.approvedTeams.length > 0 && (
                    <div className="text-xs mt-1">
                      <div>승인된 팀 상세:</div>
                      {stepBConditions.approvedTeams.map((team) => (
                        <div key={team.teamId} className="ml-2">
                          • {team.teamName}: {team.playerCount}명 {team.isValid ? "✅" : `❌ (최소 ${MIN_PLAYERS}명 필요)`}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
        
        {/* 🔥 기존 승인 팀 수 표시 (stepBConditions가 없을 때만) */}
        {isRosterOpen && !stepBConditions && approvedTeamsCount !== null && (
          <Alert className="bg-blue-50 border-blue-200">
            <AlertDescription className="text-blue-800 text-sm">
              <div className="flex items-center justify-between">
                <span>승인된 팀: <strong>{approvedTeamsCount}팀</strong></span>
                {approvedTeamsCount === 0 && (
                  <span className="text-xs text-blue-600">
                    ⚠️ 팀원 명단 잠금을 위해 최소 1팀 이상 승인 필요
                  </span>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* 안내 메시지 */}
        <div className="text-xs text-gray-500 space-y-1">
          <div>• 팀원 등록 시작: 팀 대표들이 팀원을 등록할 수 있습니다.</div>
          <div>
            • 팀원 등록 잠금: 모든 팀의 등록이 잠기며, 조 추첨을 진행할 수 있습니다.
          </div>
          <div>• 잠금 후에는 팀원 추가/삭제가 불가능합니다.</div>
          {isRosterOpen && approvedTeamsCount === 0 && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
              <div className="font-medium mb-1">📋 다음 단계: 참가 신청 승인</div>
              <div className="text-xs space-y-0.5">
                <div>1. 상단 "참가 신청 관리" 탭 클릭</div>
                <div>2. 대기 중인 참가 신청 확인</div>
                <div>3. "승인" 버튼 클릭 (팀 및 결제 정보 자동 생성)</div>
                <div>4. 최소 1팀 이상 승인 완료 후 팀원 명단 잠금 가능</div>
              </div>
            </div>
          )}
          <div className="mt-2 font-medium text-gray-700">
            ※ 팀원 11~25명인 팀만 명단 잠금 가능
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
