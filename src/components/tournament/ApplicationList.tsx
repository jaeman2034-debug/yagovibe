/**
 * 🔥 참가 신청 목록 (결제 상태 뱃지 포함)
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TournamentApplication } from "@/types/tournament";
import { calcEntryFee, DEFAULT_FEE_POLICY } from "@/lib/notice/feeCalc";
import { PaymentButton } from "./PaymentButton";
import { usePayment } from "@/hooks/usePayment";

interface ApplicationListProps {
  applications: TournamentApplication[];
  associationId?: string;
  tournamentId?: string;
  onApplicationClick?: (application: TournamentApplication) => void;
}

/**
 * 참가 신청 목록 컴포넌트
 */
export function ApplicationList({
  applications,
  associationId,
  tournamentId,
  onApplicationClick,
}: ApplicationListProps) {
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
    <div className="space-y-3">
      {applications.map((app) => {
        // 🔥 v2: 결제 정보 조회 (승인된 신청만)
        const isApproved = app.status === "APPROVED" || app.status === "approved";
        const shouldLoadPayment = isApproved && associationId && tournamentId;

        return (
          <ApplicationListItem
            key={app.id}
            application={app}
            associationId={associationId}
            tournamentId={tournamentId}
            shouldLoadPayment={shouldLoadPayment}
            onApplicationClick={onApplicationClick}
          />
        );
      })}
    </div>
  );
}

/**
 * 개별 신청 카드 컴포넌트 (결제 정보 포함)
 */
function ApplicationListItem({
  application: app,
  associationId,
  tournamentId,
  shouldLoadPayment,
  onApplicationClick,
}: {
  application: TournamentApplication;
  associationId?: string;
  tournamentId?: string;
  shouldLoadPayment: boolean;
  onApplicationClick?: (application: TournamentApplication) => void;
}) {
  // 🔥 v2: 결제 정보 실시간 조회
  const { payment, loading: paymentLoading } = usePayment(
    shouldLoadPayment ? associationId : undefined,
    shouldLoadPayment ? tournamentId : undefined,
    shouldLoadPayment ? app.id : undefined,
    { realtime: true }
  );

  // 🔥 참가비 재계산 (feePolicySnapshot이 있으면 항상 재계산 - 단일 소스 보장)
  const displayFee = (() => {
    // 1. feePolicySnapshot이 있으면 항상 재계산 (우선순위 1 - 정확도 보장)
    if (app.feePolicySnapshot && app.teamCount) {
      const feeCalc = calcEntryFee(app.teamCount, app.feePolicySnapshot);
      return feeCalc.total;
    }
    // 2. feePolicySnapshot이 없으면 기본 정책으로 재계산 (우선순위 2 - 기존 데이터 보정)
    if (app.teamCount) {
      const feeCalc = calcEntryFee(app.teamCount, DEFAULT_FEE_POLICY);
      return feeCalc.total;
    }
    // 3. feeCalc.totalFee가 있으면 사용 (우선순위 3 - 최후 fallback)
    if (app.feeCalc?.totalFee) {
      return app.feeCalc.totalFee;
    }
    return null;
  })();

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

  const normalizedStatus = app.status?.toUpperCase();
  const isApproved = normalizedStatus === "APPROVED" || app.status === "approved";

  return (
    <Card
      className="cursor-pointer hover:bg-muted/40"
      onClick={() => onApplicationClick?.(app)}
    >
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
        </div>

        {/* 🔥 v2: 승인된 신청에 결제 버튼 표시 */}
        {isApproved && associationId && tournamentId && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            {paymentLoading ? (
              <div className="text-xs text-gray-500">결제 정보 로딩 중...</div>
            ) : (
              <PaymentButton
                application={app}
                payment={payment}
                associationId={associationId}
                tournamentId={tournamentId}
                onPaymentSuccess={() => {
                  // 결제 성공 후 리로드 (부모 컴포넌트에서 처리)
                }}
              />
            )}
          </div>
        )}

        {/* 🔥 상태별 안내 문구 */}
        {!isApproved && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            {normalizedStatus === "PENDING" || app.status === "pending" ? (
              <p className="text-xs text-gray-600">
                현재 상태: 참가 신청 대기<br />
                <span className="text-gray-500">→ 승인 후 선수 명단 등록 가능</span>
              </p>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

