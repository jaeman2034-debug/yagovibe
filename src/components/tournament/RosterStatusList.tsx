/**
 * 🔥 선수 명단 현황 리스트 (어드민용)
 * 
 * 승인된 참가 신청의 선수 명단 제출 현황을 표시
 */

import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "@/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Bell, Download } from "lucide-react";
import { toast } from "sonner";
import type { TournamentApplication } from "@/types/tournament";
import { useTournamentPlan } from "@/hooks/useTournamentPlan";
import { canExportExcel } from "@/utils/tournamentPlanGuard";
import { TournamentPricingModal } from "./TournamentPricingModal";

interface RosterStatusListProps {
  associationId: string;
  tournamentId: string;
  applications: TournamentApplication[];
}

interface RosterStatus {
  applicationId: string;
  playerCount: number;
  submitted: boolean;
}

export function RosterStatusList({
  associationId,
  tournamentId,
  applications,
}: RosterStatusListProps) {
  const [rosterStatuses, setRosterStatuses] = useState<Record<string, RosterStatus>>({});
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  
  // 🔥 요금제 체크
  const { plan, loading: planLoading } = useTournamentPlan(associationId);

  // 각 신청의 선수 명단 조회
  useEffect(() => {
    if (applications.length === 0) {
      setLoading(false);
      return;
    }

    const loadRosterStatuses = async () => {
      try {
        setLoading(true);
        const statuses: Record<string, RosterStatus> = {};

        for (const app of applications) {
          try {
            const playersRef = collection(
              db,
              `associations/${associationId}/tournaments/${tournamentId}/rosters/${app.id}/players`
            );
            const playersSnap = await getDocs(playersRef);
            
            statuses[app.id] = {
              applicationId: app.id,
              playerCount: playersSnap.size,
              submitted: app.rosterStatus === "submitted",
            };
          } catch (error) {
            // rosters 컬렉션이 없을 수 있음 (아직 선수 명단 미입력)
            statuses[app.id] = {
              applicationId: app.id,
              playerCount: 0,
              submitted: false,
            };
          }
        }

        setRosterStatuses(statuses);
      } catch (error) {
        console.error("[선수 명단 현황] 조회 실패:", error);
        toast.error("선수 명단 현황을 불러올 수 없습니다.");
      } finally {
        setLoading(false);
      }
    };

    loadRosterStatuses();
  }, [associationId, tournamentId, applications]);

  const handleViewRoster = (app: TournamentApplication) => {
    // TODO: 선수 명단 상세 모달 또는 페이지로 이동
    toast.info("선수 명단 보기 기능 준비 중입니다.");
  };

  const handleSendReminder = async (app: TournamentApplication) => {
    // TODO: 알림 발송 (카톡/문자/메일)
    toast.success(`${app.teamName} 팀장에게 선수 명단 제출 요청 알림을 발송했습니다.`);
  };

  const handleExportExcel = async () => {
    // 🔥 요금제 체크: BASIC 또는 PRO만 가능
    if (!canExportExcel(plan)) {
      setShowPaywall(true);
      return;
    }

    setExporting(true);
    const loadingToastId = toast.loading("엑셀 파일 생성 중...");

    try {
      // ⭐⭐⭐ 중요: region 명시 필수 (Callable 함수는 region이 다르면 호출 실패)
      const functions = getFunctions(undefined, "asia-northeast3");
      const exportFn = httpsCallable(functions, "exportCompetitionExcel");

      const result = await exportFn({
        associationId,
        tournamentId,
      });

      const data = result.data as any;
      const url = data.url;
      const fileName = data.fileName || "선수명단.xlsx";
      const teamCount = data.teamCount || 0;
      const playerCount = data.playerCount || 0;

      toast.success(
        `엑셀 파일이 생성되었습니다.\n팀: ${teamCount}팀, 선수: ${playerCount}명`,
        {
          id: loadingToastId,
        }
      );

      // 새 창에서 다운로드
      window.open(url, "_blank");
    } catch (error: any) {
      console.error("엑셀 Export 오류:", error);
      const errorMessage = error?.message || error?.details?.message || "알 수 없는 오류";
      toast.error(`엑셀 Export 실패: ${errorMessage}`, {
        id: loadingToastId,
      });
    } finally {
      setExporting(false);
    }
  };

  const submittedCount = applications.filter(
    (app) => app.rosterStatus === "submitted"
  ).length;
  const notSubmittedCount = applications.filter(
    (app) => !app.rosterStatus || app.rosterStatus === "draft"
  ).length;

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-gray-500">
          선수 명단 현황을 불러오는 중...
        </CardContent>
      </Card>
    );
  }

  if (applications.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-gray-500">
          승인된 참가 신청이 없습니다.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* 요약 정보 */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-4 text-sm">
          <span>총 {applications.length}팀</span>
          <span>•</span>
          <span className="text-green-600 font-medium">제출 완료: {submittedCount}팀</span>
          <span>•</span>
          <span className="text-amber-600 font-medium">미제출: {notSubmittedCount}팀</span>
        </div>
        <Button
          onClick={handleExportExcel}
          variant="outline"
          size="sm"
          disabled={exporting}
        >
          <Download className="w-4 h-4 mr-2" />
          {exporting ? "생성 중..." : "엑셀 다운로드"}
        </Button>
      </div>

      {/* 선수 명단 현황 리스트 */}
      <div className="space-y-2">
        {applications.map((app) => {
          const status = rosterStatuses[app.id];
          const playerCount = status?.playerCount || 0;
          const isSubmitted = app.rosterStatus === "submitted";

          return (
            <Card key={app.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="font-semibold">{app.teamName}</div>
                      {isSubmitted ? (
                        <Badge variant="default" className="bg-green-500">
                          ✅ 제출 완료
                        </Badge>
                      ) : (
                        <Badge variant="secondary">⏳ 미제출</Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      선수 수: {playerCount}명
                      {app.managerName && ` • 신청자: ${app.managerName}`}
                    </div>
                  </div>

                  <div className="flex gap-2">
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
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      </div>
    </>
  );
}
