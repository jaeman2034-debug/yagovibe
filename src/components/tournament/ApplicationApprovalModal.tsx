/**
 * 🔥 참가 신청 승인 모달
 * 
 * 승인 전 확인 및 승인 처리
 */

import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { getFunctions, httpsCallable } from "firebase/functions";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { TournamentApplication, Tournament } from "@/types/tournament";
import { calcEntryFee, DEFAULT_FEE_POLICY } from "@/lib/notice/feeCalc";
import { useAuth } from "@/context/AuthProvider";

interface ApplicationApprovalModalProps {
  application: TournamentApplication;
  associationId: string;
  tournamentId: string;
  tournament?: Tournament; // ⭐⭐⭐ 추가: tournament 상태 체크용
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ApplicationApprovalModal({
  application,
  associationId,
  tournamentId,
  tournament,
  open,
  onClose,
  onSuccess,
}: ApplicationApprovalModalProps) {
  const [approving, setApproving] = useState(false);
  const { user } = useAuth();

  // 🔥 가드: user가 없으면 승인 불가
  if (!user) {
    return null; // 또는 로그인 안내 UI
  }

  // ⭐⭐⭐ 핵심: 대진표 생성 이후 승인 버튼 비활성화 (프론트 선차단)
  const tournamentStatus = tournament?.status?.toUpperCase();
  const isMatchesGenerated = 
    tournamentStatus === "MATCHES_GENERATED" || 
    tournament?.bracket?.locked === true;

  // 🔥 참가비 재계산 (feePolicySnapshot이 있으면 항상 teamCount 기반으로 재계산 - 단일 소스 보장)
  const feeDisplay = useMemo(() => {
    // 1. feePolicySnapshot이 있으면 항상 재계산 (우선순위 1 - 정확도 보장)
    if (application.feePolicySnapshot && application.teamCount) {
      const feeCalc = calcEntryFee(application.teamCount, application.feePolicySnapshot);
      return {
        totalFee: feeCalc.total,
        feeCalc: {
          extraTeams: feeCalc.extraTeams,
          extraFee: feeCalc.extraFee,
          totalFee: feeCalc.total,
        },
        source: "recalculated" as const,
      };
    }

    // 2. feeCalc.totalFee가 있으면 사용 (우선순위 2 - fallback)
    if (application.feeCalc?.totalFee) {
      return {
        totalFee: application.feeCalc.totalFee,
        feeCalc: {
          extraTeams: application.feeCalc.extraTeams || 0,
          extraFee: 0, // feeCalc에 없을 수 있음
          totalFee: application.feeCalc.totalFee,
        },
        source: "feeCalc" as const,
      };
    }

    // 3. 둘 다 없으면 null
    return null;
  }, [application.feePolicySnapshot, application.teamCount, application.feeCalc]);

  const handleApprove = async () => {
    // ⭐⭐⭐ 핵심 0: 대진표 생성 이후 승인 차단 (프론트 선차단)
    if (isMatchesGenerated) {
      toast.error("대진표가 이미 생성된 대회는 참가 승인을 할 수 없습니다.");
      return;
    }

    // ⭐⭐⭐ 핵심 1: 중복 클릭 완전 차단 (동시성 충돌 방지)
    if (approving) {
      console.warn("[승인] 이미 처리 중입니다. 중복 요청 무시", {
        applicationId: application.id,
        timestamp: Date.now(),
      });
      toast.warning("이미 처리 중입니다. 잠시만 기다려주세요.");
      return;
    }

    // 🔥 가드: user가 없으면 즉시 종료
    if (!user) {
      toast.error("로그인 정보가 없습니다. 다시 로그인해주세요.");
      return;
    }

    // 🔥 디버깅: 승인 직전 로그
    console.log("[승인 데이터]", {
      uid: user.uid,
      status: "approved",
      applicationId: application.id,
    });

    setApproving(true);
    const loadingToastId = toast.loading("승인 처리 중입니다...");

    try {
      // 🔥 Cloud Function 호출 (프론트에서 Firestore 직접 업데이트 금지)
      // ⭐⭐⭐ 중요: region 명시 필수 (Callable 함수는 region이 다르면 호출 실패)
      const functions = getFunctions(undefined, "asia-northeast3");
      const approveFn = httpsCallable(functions, "approveApplicationCallable");

      const result = await approveFn({
        associationId,
        tournamentId,
        applicationId: application.id,
      });

      // 🔥 초대 링크가 반환되면 표시 (선택)
      const inviteLink = (result.data as any)?.inviteLink;
      if (inviteLink) {
        console.log("[승인 완료] 초대 링크:", inviteLink);
      }

      toast.success("참가 신청이 승인되었습니다. 팀장에게 알림이 발송되었습니다.", {
        id: loadingToastId,
      });

      // ⭐⭐⭐ 핵심: 승인 성공 시 즉시 UI 반영 (강제 재조회)
      // 🔥 onSnapshot이 안 도는 경우를 대비해 getDoc()으로 직접 재조회
      try {
        const appRef = doc(
          db,
          "associations",
          associationId,
          "tournaments",
          tournamentId,
          "applications",
          application.id
        );
        
        const latestSnap = await getDoc(appRef);
        if (latestSnap.exists()) {
          const latestData = latestSnap.data();
          console.log("[승인 후 재조회] 최신 상태:", {
            status: latestData?.status,
            approvedAt: latestData?.approvedAt,
          });
        }
      } catch (recheckError: any) {
        // 재조회 실패해도 승인은 성공했으므로 경고만
        console.warn("[승인 후 재조회] 실패 (승인은 성공):", recheckError);
      }

      // 🔥 승인 성공 후 발생하는 다른 에러는 별도 처리 (승인 성공과 분리)
      try {
        onSuccess(); // 목록 새로고침
        onClose(); // 모달 닫기
      } catch (postApprovalError: any) {
        // 🔥 승인 후 발생한 에러는 경고만 (승인 자체는 성공)
        console.warn("[승인 후 처리] 추가 조회 실패 (승인은 성공):", postApprovalError);
        // 모달은 닫고, 목록 새로고침은 시도
        onClose();
        // 목록 새로고침 실패해도 승인은 성공했으므로 무시
      }
    } catch (error: any) {
      // 🔥 상세한 오류 로깅
      console.error("승인 오류:", {
        error,
        code: error?.code,
        message: error?.message,
        details: error?.details,
        stack: error?.stack,
        applicationId: application.id,
        associationId,
        tournamentId,
      });

      // 🔥 Firebase Functions 오류 메시지 추출
      const errorCode = error?.code;
      const errorMessage = error?.message || error?.details?.message;
      
      // ⭐⭐⭐ 핵심: aborted / failed-precondition은 "이미 처리됨"으로 처리 (정상 상태)
      if (errorCode === "functions/aborted" || errorCode === "aborted") {
        // 동시성 충돌 = 이미 다른 요청이 처리 중이거나 완료됨
        toast.info("이미 처리 중이거나 완료된 신청입니다. 목록을 새로고침해주세요.", {
          id: loadingToastId,
          duration: 4000,
        });
        onSuccess(); // 목록 새로고침
        onClose();
        return;
      }
      
      if (errorCode === "failed-precondition") {
        // ⭐⭐⭐ "이미 대진표가 생성되었습니다" 등의 메시지는 정상 상태
        const isAlreadyProcessed = errorMessage?.includes("이미") || 
                                   errorMessage?.includes("already") ||
                                   errorMessage?.includes("대진표");
        
        if (isAlreadyProcessed) {
          toast.info(errorMessage || "이미 처리된 상태입니다. 목록을 새로고침해주세요.", {
            id: loadingToastId,
            duration: 4000,
          });
          onSuccess(); // 목록 새로고침
          onClose();
          return;
        }
        
        // 그 외의 failed-precondition은 에러로 처리
        toast.error(`승인할 수 없는 상태입니다: ${errorMessage || "알 수 없는 오류"}`, {
          id: loadingToastId,
          duration: 5000,
        });
        return;
      }
      
      // 🔥 다른 에러는 기존대로 처리
      let displayMessage = "알 수 없는 오류가 발생했습니다.";
      
      if (errorCode) {
        switch (errorCode) {
          case "permission-denied":
            displayMessage = "권한이 없습니다. 관리자 권한을 확인해주세요.";
            break;
          case "unauthenticated":
            displayMessage = "로그인이 필요합니다. 다시 로그인해주세요.";
            break;
          case "not-found":
            displayMessage = "참가 신청을 찾을 수 없습니다.";
            break;
          case "invalid-argument":
            displayMessage = "필수 정보가 누락되었습니다.";
            break;
          case "internal":
            displayMessage = errorMessage || "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
            break;
          default:
            displayMessage = errorMessage || `오류가 발생했습니다. (코드: ${errorCode})`;
        }
      } else if (errorMessage) {
        displayMessage = errorMessage;
      }

      toast.error(`승인 실패: ${displayMessage}`, {
        id: loadingToastId,
        duration: 5000,
      });
    } finally {
      setApproving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>참가 신청 승인</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">팀명:</span>
              <span className="text-sm font-medium">{application.teamName}</span>
            </div>
            {application.managerName && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">신청자:</span>
                <span className="text-sm font-medium">{application.managerName}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">팀 수:</span>
              <span className="text-sm font-medium">{application.teamCount}팀</span>
            </div>
            {feeDisplay && (
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">참가비:</span>
                  <span className="text-sm font-medium">
                    {feeDisplay.totalFee.toLocaleString()}원
                  </span>
                </div>
                {/* 🔥 계산식 표시 (UX 완성 - 사용자 제시 패턴) */}
                {feeDisplay.feePolicy && feeDisplay.feeCalc.extraTeams > 0 && (
                  <div className="text-xs text-gray-500 pl-4">
                    (기본 {feeDisplay.feePolicy.baseFee.toLocaleString()}원
                    {" + "}
                    추가 {feeDisplay.feeCalc.extraTeams}팀 × {feeDisplay.feePolicy.extraFeePerTeam.toLocaleString()}원)
                  </div>
                )}
                {feeDisplay.feePolicy && feeDisplay.feeCalc.extraTeams === 0 && (
                  <div className="text-xs text-gray-500 pl-4">
                    (기본 {feeDisplay.feePolicy.baseFee.toLocaleString()}원)
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-700">
              승인 시 팀장에게 선수 명단 등록 링크가 제공됩니다.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={approving || isMatchesGenerated}>
            취소
          </Button>
          <Button 
            onClick={handleApprove} 
            disabled={approving || isMatchesGenerated}
          >
            {approving ? "승인 중..." : isMatchesGenerated ? "승인 불가" : "승인하기"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
