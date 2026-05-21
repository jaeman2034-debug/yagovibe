/**
 * 🔥 내 대회 참가 신청 목록 페이지
 * 
 * 경로: /me/tournaments
 * 
 * 역할:
 * - 사용자의 모든 대회 참가 신청 목록 표시
 * - PersonaP3TeamCaptain의 "전체 보기" 버튼에서 이동
 */

import { useNavigate } from "react-router-dom";
import { useMyTournamentApplications } from "@/hooks/useMyTournamentApplications";
import { PaymentButton } from "@/components/tournament/PaymentButton";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";

export default function MyTournamentsPage() {
  const navigate = useNavigate();
  const { applications, isLoading } = useMyTournamentApplications();

  const getStatusBadge = (status?: string) => {
    const normalizedStatus = status?.toUpperCase();
    switch (normalizedStatus) {
      case "APPROVED":
        return <Badge variant="default" className="bg-green-500 text-xs">✅ 승인</Badge>;
      case "REJECTED":
        return <Badge variant="destructive" className="text-xs">❌ 반려</Badge>;
      case "HOLD":
        return <Badge variant="outline" className="text-xs">⏸️ 보류</Badge>;
      case "PENDING":
      default:
        return <Badge variant="secondary" className="text-xs">⏳ 대기</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2" />
          <p className="text-sm text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* 헤더 */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            ← 뒤로 가기
          </button>
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-purple-600" />
            <h1 className="text-2xl font-bold text-gray-900">출전 신청 현황</h1>
          </div>
        </div>

        {/* 신청 목록 */}
        {applications.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-sm text-gray-500">출전 신청 내역이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {applications.map((app) => {
              const isApproved = app.status?.toUpperCase() === "APPROVED" || app.status === "approved";
              const rosterStatus = app.rosterStatus || "draft";
              const needsRosterSubmission = isApproved && rosterStatus !== "submitted";

              return (
                <div
                  key={app.id}
                  className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-base text-gray-900">{app.teamName}</div>
                    {getStatusBadge(app.status)}
                  </div>
                  <div className="text-sm text-gray-500 mb-2">
                    {app.teamCount}팀 참가
                    {app.feeCalc && ` • ${app.feeCalc.totalFee.toLocaleString()}원`}
                  </div>
                  
                  {/* 승인된 신청에 결제 버튼 + 선수 명단 등록 버튼 */}
                  {isApproved && (
                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                      {/* 결제 버튼 (미결제 시) */}
                      {app.paymentStatus !== "PAID" && app.feeCalc && (
                        <PaymentButton
                          application={app}
                          associationId={app.associationId}
                          tournamentId={app.tournamentId}
                        />
                      )}
                      
                      {/* 선수 명단 버튼 */}
                      {(app.paymentStatus === "PAID" || !app.feeCalc || app.feeCalc.totalFee <= 0) && (
                        <>
                          {needsRosterSubmission ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/me/applications/${app.id}/roster`);
                              }}
                              className="w-full text-sm px-4 py-2 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors font-medium"
                            >
                              📝 선수 명단 등록하기
                            </button>
                          ) : (
                            <div className="text-sm text-green-600 font-medium">
                              ✅ 선수 명단 제출 완료
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
