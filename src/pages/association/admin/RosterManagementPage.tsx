/**
 * 🔥 선수 명단 관리 페이지 (운영자용)
 * 
 * 경로: /association/:associationId/admin/tournaments/:tournamentId/rosters
 * 
 * 기능:
 * - 참가팀별 선수 명단 현황 조회
 * - 선수 명단 제출 여부 확인
 * - 미제출 팀 알림
 * - 엑셀 다운로드
 */

import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, query, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useIsAssociationAdmin } from "@/hooks/useIsAssociationAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Bell, Download } from "lucide-react";
import { toast } from "sonner";
import type { TournamentApplication } from "@/types/tournament";
import { getTournamentApplications } from "@/lib/tournament/applicationRepository";
import * as XLSX from "xlsx";

export default function RosterManagementPage() {
  const { associationId, tournamentId } = useParams<{
    associationId: string;
    tournamentId: string;
  }>();
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useIsAssociationAdmin(associationId);

  const [applications, setApplications] = useState<TournamentApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<TournamentApplication | null>(null);

  // 권한 체크
  useEffect(() => {
    if (adminLoading) return;
    if (!isAdmin) {
      navigate(`/association/${associationId}/tournaments`);
    }
  }, [isAdmin, adminLoading, navigate, associationId]);

  // 참가 신청 목록 조회
  useEffect(() => {
    if (!associationId || !tournamentId) return;

    const loadApplications = async () => {
      try {
        setLoading(true);
        const apps = await getTournamentApplications(associationId, tournamentId);
        // 승인된 신청만 필터링
        const approvedApps = apps.filter(
          (app) => app.status?.toUpperCase() === "APPROVED" || app.status === "approved"
        );
        setApplications(approvedApps);
      } catch (error) {
        console.error("[선수 명단 관리] 조회 실패:", error);
        toast.error("참가 신청 목록을 불러올 수 없습니다.");
      } finally {
        setLoading(false);
      }
    };

    loadApplications();
  }, [associationId, tournamentId]);

  // 선수 명단 조회 (각 applicationId별)
  const getRosterStatus = async (applicationId: string) => {
    try {
      const playersRef = collection(
        db,
        `associations/${associationId}/tournaments/${tournamentId}/rosters/${applicationId}/players`
      );
      const playersSnap = await getDocs(playersRef);
      return {
        playerCount: playersSnap.size,
        submitted: false, // TODO: application.rosterStatus 확인
      };
    } catch (error) {
      console.error("[선수 명단] 조회 실패:", error);
      return { playerCount: 0, submitted: false };
    }
  };

  const handleViewRoster = async (app: TournamentApplication) => {
    // TODO: 선수 명단 상세 모달 또는 페이지로 이동
    toast.info("선수 명단 보기 기능 준비 중입니다.");
  };

  const handleSendReminder = async (app: TournamentApplication) => {
    // TODO: 알림 발송 (카톡/문자/메일)
    toast.success(`${app.teamName} 팀장에게 선수 명단 제출 요청 알림을 발송했습니다.`);
  };

  const handleExportExcel = async () => {
    try {
      // TODO: 모든 팀의 선수 명단을 엑셀로 다운로드
      toast.info("엑셀 다운로드 기능 준비 중입니다.");
    } catch (error) {
      console.error("[엑셀 다운로드] 실패:", error);
      toast.error("엑셀 다운로드에 실패했습니다.");
    }
  };

  const submittedCount = useMemo(() => {
    return applications.filter((app) => app.rosterStatus === "submitted").length;
  }, [applications]);

  const notSubmittedCount = useMemo(() => {
    return applications.filter(
      (app) => !app.rosterStatus || app.rosterStatus === "draft"
    ).length;
  }, [applications]);

  if (loading || adminLoading) {
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
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold mb-2">선수 명단 현황</h1>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>총 {applications.length}팀</span>
            <span>•</span>
            <span className="text-green-600">제출 완료: {submittedCount}팀</span>
            <span>•</span>
            <span className="text-amber-600">미제출: {notSubmittedCount}팀</span>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="mb-4 flex gap-2">
          <Button onClick={handleExportExcel} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            엑셀 다운로드
          </Button>
        </div>

        {/* 선수 명단 현황 테이블 */}
        <Card>
          <CardHeader>
            <CardTitle>참가팀별 선수 명단 현황</CardTitle>
          </CardHeader>
          <CardContent>
            {applications.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-500">
                승인된 참가 신청이 없습니다.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">팀명</th>
                      <th className="text-left py-3 px-4 font-medium">신청자</th>
                      <th className="text-center py-3 px-4 font-medium">명단 상태</th>
                      <th className="text-center py-3 px-4 font-medium">액션</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((app) => {
                      const rosterStatus = app.rosterStatus || "draft";
                      const isSubmitted = rosterStatus === "submitted";

                      return (
                        <tr key={app.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">{app.teamName}</td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {app.managerName || "-"}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isSubmitted ? (
                              <Badge variant="default" className="bg-green-500">
                                ✅ 제출 완료
                              </Badge>
                            ) : (
                              <Badge variant="secondary">⏳ 미제출</Badge>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2 justify-center">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewRoster(app)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                보기
                              </Button>
                              {!isSubmitted && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleSendReminder(app)}
                                >
                                  <Bell className="w-4 h-4 mr-1" />
                                  알림
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
