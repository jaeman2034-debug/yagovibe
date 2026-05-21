/**
 * 🔥 참가 신청 테이블 컴포넌트
 * 
 * 어드민용 참가 신청 목록을 테이블 형태로 표시
 */

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import type { TournamentApplication } from "@/types/tournament";
import { ApplicationApprovalModal } from "./ApplicationApprovalModal";
import { ApplicationRejectModal } from "./ApplicationRejectModal";
import { calcEntryFee, DEFAULT_FEE_POLICY } from "@/lib/notice/feeCalc";

interface ApplicationTableProps {
  applications: TournamentApplication[];
  associationId: string;
  tournamentId: string;
  onStatusChange?: () => void;
}

export function ApplicationTable({
  applications,
  associationId,
  tournamentId,
  onStatusChange,
}: ApplicationTableProps) {
  const [approvingApp, setApprovingApp] = useState<TournamentApplication | null>(null);
  const [rejectingApp, setRejectingApp] = useState<TournamentApplication | null>(null);

  const getStatusBadge = (status: string) => {
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
      <div className="text-center py-8 text-sm text-gray-500">
        해당 상태의 참가 신청이 없습니다.
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left py-3 px-4 font-medium text-sm">팀명</th>
              <th className="text-left py-3 px-4 font-medium text-sm">신청자</th>
              <th className="text-center py-3 px-4 font-medium text-sm">팀 수</th>
              <th className="text-center py-3 px-4 font-medium text-sm">참가비</th>
              <th className="text-center py-3 px-4 font-medium text-sm">상태</th>
              <th className="text-center py-3 px-4 font-medium text-sm">액션</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((app) => {
              const isPending = app.status?.toUpperCase() === "PENDING" || app.status === "pending";
              const isApproved = app.status?.toUpperCase() === "APPROVED" || app.status === "approved";
              const isRejected = app.status?.toUpperCase() === "REJECTED" || app.status === "rejected";

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
                <tr key={app.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{app.teamName}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {app.managerName || "-"}
                  </td>
                  <td className="py-3 px-4 text-center text-sm">{app.teamCount}팀</td>
                  <td className="py-3 px-4 text-center text-sm">
                    {displayFee !== null ? (
                      <span className="font-medium">
                        {displayFee.toLocaleString()}원
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">{getStatusBadge(app.status)}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2 justify-center">
                      {isPending && (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => setApprovingApp(app)}
                          >
                            승인
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setRejectingApp(app)}
                          >
                            반려
                          </Button>
                        </>
                      )}
                      {isApproved && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            // TODO: 선수 명단 보기 또는 상세 페이지로 이동
                            window.location.href = `/association/${associationId}/admin/tournaments/${tournamentId}?tab=rosters`;
                          }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          보기
                        </Button>
                      )}
                      {isRejected && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            // TODO: 거절 사유 확인
                            alert("거절 사유 확인 기능 준비 중입니다.");
                          }}
                        >
                          사유
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 승인 모달 */}
      {approvingApp && (
        <ApplicationApprovalModal
          application={approvingApp}
          associationId={associationId}
          tournamentId={tournamentId}
          open={!!approvingApp}
          onClose={() => setApprovingApp(null)}
          onSuccess={() => {
            setApprovingApp(null);
            onStatusChange?.();
          }}
        />
      )}

      {/* 반려 모달 */}
      {rejectingApp && (
        <ApplicationRejectModal
          application={rejectingApp}
          associationId={associationId}
          tournamentId={tournamentId}
          open={!!rejectingApp}
          onClose={() => setRejectingApp(null)}
          onSuccess={() => {
            setRejectingApp(null);
            onStatusChange?.();
          }}
        />
      )}
    </>
  );
}
