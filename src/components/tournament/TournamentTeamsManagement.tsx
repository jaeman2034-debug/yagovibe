/**
 * 🔥 참가팀 관리 섹션
 * 
 * 승인된 팀 목록 표시 및 관리
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, CheckCircle2, Clock, XCircle } from "lucide-react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface TournamentTeamsManagementProps {
  associationId: string;
  tournamentId: string;
  refreshTrigger?: number; // 🔥 새로고침 트리거 (값이 변경되면 재조회)
}

interface Team {
  id: string;
  teamName: string;
  status: "pending" | "approved" | "rejected";
  createdAt?: any;
  isTestTeam?: boolean;
}

export function TournamentTeamsManagement({
  associationId,
  tournamentId,
  refreshTrigger = 0, // 🔥 새로고침 트리거
}: TournamentTeamsManagementProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 🔥 가드: associationId, tournamentId 확인
    if (!associationId || !tournamentId) {
      setLoading(false);
      return;
    }
    
    const loadTeams = async () => {
      try {
        setLoading(true);
        const teamsRef = collection(
          db,
          `associations/${associationId}/tournaments/${tournamentId}/teams`
        );
        const teamsQuery = query(
          teamsRef,
          orderBy("createdAt", "desc")
        );
        const teamsSnap = await getDocs(teamsQuery);

        const teamsList = teamsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as Team));

        setTeams(teamsList);
      } catch (error) {
        console.error("팀 목록 조회 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    loadTeams();
  }, [associationId, tournamentId, refreshTrigger]); // 🔥 refreshTrigger 의존성 추가

  // 팀이 없으면 섹션 숨김
  if (teams.length === 0 && !loading) {
    return null;
  }

  const approvedTeams = teams.filter((t) => t.status === "approved");
  const pendingTeams = teams.filter((t) => t.status === "pending");
  const rejectedTeams = teams.filter((t) => t.status === "rejected");

  return (
    <Card id="teams-management-section">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          참가팀 관리
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 통계 요약 */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-700">{approvedTeams.length}</div>
            <div className="text-sm text-green-600">승인 완료</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-700">{pendingTeams.length}</div>
            <div className="text-sm text-yellow-600">대기 중</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-700">{rejectedTeams.length}</div>
            <div className="text-sm text-red-600">반려</div>
          </div>
        </div>

        {/* 팀 목록 */}
        {loading ? (
          <div className="text-center py-8 text-gray-500">로딩 중...</div>
        ) : (
          <div className="space-y-2">
            {teams.map((team) => (
              <div
                key={team.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{team.teamName}</span>
                      {team.isTestTeam && (
                        <Badge variant="outline" className="text-xs">
                          테스트
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {team.status === "approved" && (
                      <Badge className="bg-green-600">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        승인
                      </Badge>
                    )}
                    {team.status === "pending" && (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        <Clock className="w-3 h-3 mr-1" />
                        대기
                      </Badge>
                    )}
                    {team.status === "rejected" && (
                      <Badge variant="destructive">
                        <XCircle className="w-3 h-3 mr-1" />
                        반려
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 안내 메시지 */}
        {approvedTeams.length >= 2 && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              ✅ 승인된 팀이 {approvedTeams.length}팀입니다. 조 추첨을 실행할 수 있습니다.
            </p>
          </div>
        )}
        {approvedTeams.length < 2 && teams.length > 0 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⚠️ 조 추첨을 실행하려면 최소 2팀 이상의 승인된 팀이 필요합니다. (현재: {approvedTeams.length}팀)
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

