/**
 * 🔥 참가 신청 관리자 목록 (승인/거절 기능 포함)
 */

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getFunctions, httpsCallable } from "firebase/functions";
import { toast } from "sonner";
import type { TournamentApplication } from "@/types/tournament";
import { StatusFilter } from "./StatusFilter";
import { ApplicationTable } from "./ApplicationTable";
import { calcEntryFee, DEFAULT_FEE_POLICY } from "@/lib/notice/feeCalc";

interface ApplicationAdminListProps {
  associationId: string;
  tournamentId: string;
  applications: TournamentApplication[];
  onStatusChange?: () => void;
}

export function ApplicationAdminList({
  associationId,
  tournamentId,
  applications,
  onStatusChange,
}: ApplicationAdminListProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending"); // 🔥 기본값: 대기 (운영 효율 극대화)

  const handleStatusChange = async (
    applicationId: string,
    newStatus: "APPROVED" | "REJECTED" | "HOLD"
  ) => {
    // ⭐⭐⭐ 핵심: 중복 클릭 방지 (동시성 충돌 방지)
    if (updatingId === applicationId) {
      console.warn("[상태 변경] 이미 처리 중입니다. 중복 요청 무시", { applicationId });
      return;
    }

    setUpdatingId(applicationId);

    // 🔥 UX 즉시 반응: 클릭 즉시 로딩 토스트 표시
    const loadingToastId = toast.loading("처리 중입니다...");

    // 🔥 프론트 타임아웃 가드 (4초 후 안내)
    const timeoutTimer = setTimeout(() => {
      toast.info("조금 지연되고 있습니다...", { id: loadingToastId });
    }, 4000);

    try {
      // 승인은 Cloud Function으로 처리 (teams/payment 자동 생성)
      if (newStatus === "APPROVED") {
        // ⭐⭐⭐ 중요: region 명시 필수 (Callable 함수는 region이 다르면 호출 실패)
        const functions = getFunctions(undefined, "asia-northeast3");
        const approveFn = httpsCallable(functions, "approveApplicationCallable");

        await approveFn({
          associationId,
          tournamentId,
          applicationId,
        });

        clearTimeout(timeoutTimer);
        toast.success("참가 신청이 승인되었습니다. (팀 및 결제 정보 자동 생성)", {
          id: loadingToastId,
        });
        
        // ⭐⭐⭐ 핵심: 승인 성공 시 즉시 UI 반영 (강제 재조회)
        // 🔥 onSnapshot이 안 도는 경우를 대비해 getDoc()으로 직접 재조회
        try {
          const { doc, getDoc } = await import("firebase/firestore");
          const { db } = await import("@/lib/firebase");
          const appRef = doc(
            db,
            "associations",
            associationId,
            "tournaments",
            tournamentId,
            "applications",
            applicationId
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
          if (onStatusChange) {
            onStatusChange(); // 목록 새로고침
          }
        } catch (postApprovalError: any) {
          // 🔥 승인 후 발생한 에러는 경고만 (승인 자체는 성공)
          console.warn("[승인 후 처리] 추가 조회 실패 (승인은 성공):", postApprovalError);
          // 목록 새로고침 실패해도 승인은 성공했으므로 무시
        }
      } else {
        // 거절/보류는 클라이언트에서 직접 처리 (간단한 상태 변경)
        // ⭐⭐⭐ 중요: region 명시 필수 (Callable 함수는 region이 다르면 호출 실패)
        const functions = getFunctions(undefined, "asia-northeast3");
        const updateFn = httpsCallable(functions, "updateApplicationStatusCallable");

        await updateFn({
          associationId,
          tournamentId,
          applicationId,
          status: newStatus,
        });

        clearTimeout(timeoutTimer);
        toast.success(
          newStatus === "REJECTED"
            ? "참가 신청이 거절되었습니다."
            : "참가 신청이 보류되었습니다.",
          { id: loadingToastId }
        );
      }

      // 🔥 승인/거절 성공 후 발생하는 다른 에러는 별도 처리 (성공과 분리)
      try {
        onStatusChange?.(); // 목록 새로고침
      } catch (postStatusChangeError: any) {
        // 🔥 상태 변경 후 발생한 에러는 경고만 (상태 변경 자체는 성공)
        console.warn("[상태 변경 후 처리] 추가 조회 실패 (상태 변경은 성공):", postStatusChangeError);
        // 목록 새로고침 실패해도 상태 변경은 성공했으므로 무시
      }
    } catch (error: any) {
      clearTimeout(timeoutTimer);
      console.error("상태 변경 오류:", error);
      
      const errorCode = error?.code;
      const errorMessage = error?.message || error?.details?.message;
      
      // ⭐⭐⭐ 핵심: aborted / failed-precondition은 "이미 처리됨"으로 처리 (정상 상태)
      if (errorCode === "functions/aborted" || errorCode === "aborted") {
        toast.info("이미 처리 중이거나 완료된 신청입니다. 목록을 새로고침해주세요.", {
          id: loadingToastId,
          duration: 4000,
        });
        onStatusChange?.(); // 목록 새로고침
        setUpdatingId(null);
        return;
      }
      
      if (errorCode === "failed-precondition") {
        const isAlreadyProcessed = errorMessage?.includes("이미") || 
                                   errorMessage?.includes("already") ||
                                   errorMessage?.includes("대진표");
        
        if (isAlreadyProcessed) {
          toast.info(errorMessage || "이미 처리된 상태입니다. 목록을 새로고침해주세요.", {
            id: loadingToastId,
            duration: 4000,
          });
          onStatusChange?.(); // 목록 새로고침
          setUpdatingId(null);
          return;
        }
      }
      
      // 그 외의 에러는 기존대로 처리
      const displayMessage = errorMessage || "알 수 없는 오류";
      toast.error(`상태 변경 실패: ${displayMessage}`, {
        id: loadingToastId,
        duration: 5000,
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const getPaymentStatusBadge = (status?: string) => {
    switch (status) {
      case "PAID":
        return <Badge variant="default" className="bg-green-500">완납</Badge>;
      case "PARTIAL":
        return <Badge variant="default" className="bg-yellow-500">부분납</Badge>;
      case "UNPAID":
      default:
        return <Badge variant="secondary">미납</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    // 🔥 대소문자 모두 지원 (소문자로 정규화된 값도 처리)
    const normalizedStatus = status?.toUpperCase();
    switch (normalizedStatus) {
      case "APPROVED":
        return <Badge variant="default" className="bg-green-500">✅ 승인</Badge>;
      case "REJECTED":
        return <Badge variant="destructive">❌ 반려</Badge>;
      case "HOLD":
        return <Badge variant="outline">⏸️ 보류</Badge>;
      case "PENDING":
      default:
        return <Badge variant="secondary">⏳ 대기</Badge>;
    }
  };

  // 🔥 필터 적용
  const filteredApplications = useMemo(() => {
    if (statusFilter === "all") return applications;
    
    return applications.filter((app) => {
      const normalizedStatus = app.status?.toUpperCase();
      switch (statusFilter) {
        case "pending":
          return normalizedStatus === "PENDING" || app.status === "pending";
        case "approved":
          return normalizedStatus === "APPROVED" || app.status === "approved";
        case "rejected":
          return normalizedStatus === "REJECTED" || app.status === "rejected";
        default:
          return true;
      }
    });
  }, [applications, statusFilter]);

  // 🔥 대기 신청을 상단에 고정
  const sortedApplications = useMemo(() => {
    const pending = filteredApplications.filter((app) => 
      app.status?.toUpperCase() === "PENDING" || app.status === "pending"
    );
    const others = filteredApplications.filter((app) => 
      app.status?.toUpperCase() !== "PENDING" && app.status !== "pending"
    );
    return [...pending, ...others];
  }, [filteredApplications]);

  // ⭐⭐⭐ 핵심: 모든 hooks는 early return 전에 호출되어야 함 (React Hooks 규칙)
  // 🔥 테이블 뷰와 카드 뷰 선택 가능 (기본은 테이블)
  const [viewMode, setViewMode] = useState<"table" | "card">("table");

  // early return은 모든 hooks 호출 후에만 가능
  if (applications.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          등록된 참가 신청이 없습니다.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* 🔥 상태 필터 */}
      <StatusFilter value={statusFilter} onChange={setStatusFilter} />

      {/* 🔥 뷰 모드 선택 (테이블/카드) */}
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          총 {filteredApplications.length}건
          {statusFilter === "pending" && 
            ` (대기 중: ${sortedApplications.filter((app) => 
              app.status?.toUpperCase() === "PENDING" || app.status === "pending"
            ).length}건)`}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={viewMode === "table" ? "default" : "outline"}
            onClick={() => setViewMode("table")}
          >
            테이블
          </Button>
          <Button
            size="sm"
            variant={viewMode === "card" ? "default" : "outline"}
            onClick={() => setViewMode("card")}
          >
            카드
          </Button>
        </div>
      </div>

      {/* 🔥 테이블 뷰 */}
      {viewMode === "table" ? (
        <ApplicationTable
          applications={sortedApplications}
          associationId={associationId}
          tournamentId={tournamentId}
          onStatusChange={onStatusChange}
        />
      ) : (
        /* 🔥 카드 뷰 (기존) */
        <div className="space-y-3">
          {sortedApplications.map((app) => {
            // 🔥 참가비 표시 (단일 소스 오브 트루스: calculatedFee 우선)
            const displayFee = (() => {
              // 1. calculatedFee가 있으면 우선 사용 (승인 시 확정 저장된 값 - 최우선)
              if ((app as any).calculatedFee !== undefined && (app as any).calculatedFee !== null) {
                return (app as any).calculatedFee;
              }
              // 2. feePolicySnapshot이 있으면 재계산 (우선순위 2)
              if (app.feePolicySnapshot && app.teamCount) {
                const feeCalc = calcEntryFee(app.teamCount, app.feePolicySnapshot);
                return feeCalc.total;
              }
              // 3. feeCalc.totalFee가 있으면 사용 (우선순위 3)
              if (app.feeCalc?.totalFee) {
                return app.feeCalc.totalFee;
              }
              // 4. feePolicySnapshot이 없으면 기본 정책으로 재계산 (우선순위 4 - 최후 fallback)
              if (app.teamCount) {
                const feeCalc = calcEntryFee(app.teamCount, DEFAULT_FEE_POLICY);
                return feeCalc.total;
              }
              return null;
            })();

            return (
              <Card key={app.id}>
                <CardContent className="py-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{app.teamName}</div>
                    <div className="flex gap-2">
                      {getStatusBadge(app.status)}
                      {getPaymentStatusBadge(app.paymentStatus)}
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>참가 팀 수: {app.teamCount}팀</div>
                    {displayFee !== null && (
                      <div>
                        참가비: {displayFee.toLocaleString()}원
                        {app.paidTotal !== undefined && app.paidTotal > 0 && (
                          <> (납부: {app.paidTotal.toLocaleString()}원)</>
                        )}
                        {app.dueAmount !== undefined && app.dueAmount > 0 && (
                          <> (미납: {app.dueAmount.toLocaleString()}원)</>
                        )}
                      </div>
                    )}
              {app.createdAt && (
                <div>
                  신청일: {app.createdAt.toDate?.().toLocaleDateString("ko-KR")}
                </div>
              )}
            </div>

            {app.status === "PENDING" && (
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleStatusChange(app.id, "APPROVED")}
                  disabled={updatingId === app.id}
                >
                  {updatingId === app.id ? "처리 중..." : "승인"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange(app.id, "HOLD")}
                  disabled={updatingId === app.id}
                >
                  보류
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleStatusChange(app.id, "REJECTED")}
                  disabled={updatingId === app.id}
                >
                  거절
                </Button>
              </div>
            )}

            {(app.status?.toUpperCase() === "HOLD" || app.status === "hold") && (
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleStatusChange(app.id, "APPROVED")}
                  disabled={updatingId === app.id}
                >
                  {updatingId === app.id ? "처리 중..." : "승인"}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleStatusChange(app.id, "REJECTED")}
                  disabled={updatingId === app.id}
                >
                  거절
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

