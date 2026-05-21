/**
 * 🔥 STEP 6: 팀 체크인 보드 (관리자용 현장 화면)
 * 
 * 대회 당일 팀 출석 체크를 빠르게 처리하는 초고속 화면
 */

import { useState, useEffect, useMemo } from "react";
import { collection, query, where, getDocs, doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/lib/firebase";
import { Search, CheckCircle2, Clock, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import type { Tournament } from "@/types/tournament";

type TeamCheckinStatus = 
  | "NOT_CHECKED_IN" 
  | "CHECKED_IN" 
  | "LATE" 
  | "NO_SHOW" 
  | "DISQUALIFIED";

interface TeamCheckinData {
  teamId: string;
  teamName: string;
  division?: string;
  playerCount: number;
  status: TeamCheckinStatus;
  checkedInAt?: any;
  note?: string;
}

interface TeamCheckinBoardProps {
  associationId: string;
  tournament: Tournament;
  isAdmin: boolean;
}

export function TeamCheckinBoard({
  associationId,
  tournament,
  isAdmin,
}: TeamCheckinBoardProps) {
  const [teams, setTeams] = useState<TeamCheckinData[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TeamCheckinStatus | "ALL">("ALL");

  // 🔥 체크인 가능 여부
  const canCheckin = tournament.tournamentPhase === "DRAW_DONE" 
    || tournament.tournamentPhase === "CHECKIN_OPEN" 
    || tournament.tournamentPhase === "MATCHES_RUNNING";

  // 🔥 팀 목록 조회
  useEffect(() => {
    if (!associationId || !tournament.id || !canCheckin) {
      setLoading(false);
      return;
    }

    const loadTeams = async () => {
      try {
        setLoading(true);

        // 1. 승인된 팀 목록 조회
        const teamsRef = collection(
          db,
          `associations/${associationId}/tournaments/${tournament.id}/teams`
        );
        const teamsQuery = query(teamsRef, where("status", "==", "APPROVED"));
        const teamsSnap = await getDocs(teamsQuery);

        // 2. 조 정보 조회 (divisions 컬렉션)
        const divisionsRef = collection(
          db,
          `associations/${associationId}/tournaments/${tournament.id}/divisions`
        );
        const divisionsSnap = await getDocs(divisionsRef);

        // 조별 팀 매핑 생성
        const divisionMap = new Map<string, string>();
        divisionsSnap.docs.forEach((divDoc) => {
          const data = divDoc.data();
          const division = `조 ${data.divisionNumber}`;
          const teamIds = data.teamIds || [];
          teamIds.forEach((teamId: string) => {
            divisionMap.set(teamId, division);
          });
        });

        // 3. 각 팀의 선수 수 및 체크인 상태 조회
        const teamsData: TeamCheckinData[] = [];

        for (const teamDoc of teamsSnap.docs) {
          const teamData = teamDoc.data();
          const teamId = teamDoc.id;

          // 선수 수 조회
          const playersRef = collection(teamDoc.ref, "players");
          const playersSnap = await getDocs(playersRef);
          const playerCount = playersSnap.size;

          // 체크인 상태 조회
          const checkinRef = doc(
            db,
            `associations/${associationId}/tournaments/${tournament.id}/checkins/teams/${teamId}`
          );
          const checkinSnap = await checkinRef.get();
          
          let status: TeamCheckinStatus = "NOT_CHECKED_IN";
          let checkedInAt: any = null;
          let note: string | undefined = undefined;

          if (checkinSnap.exists()) {
            const checkinData = checkinSnap.data();
            status = checkinData?.status || "NOT_CHECKED_IN";
            checkedInAt = checkinData?.checkedInAt;
            note = checkinData?.note;
          }

          teamsData.push({
            teamId,
            teamName: teamData.teamName || teamData.name || "팀명 없음",
            division: divisionMap.get(teamId),
            playerCount,
            status,
            checkedInAt,
            note,
          });
        }

        // 조 → 팀명 순으로 정렬
        teamsData.sort((a, b) => {
          const divCompare = (a.division || "").localeCompare(b.division || "", "ko");
          if (divCompare !== 0) return divCompare;
          return a.teamName.localeCompare(b.teamName, "ko");
        });

        setTeams(teamsData);
      } catch (error: any) {
        console.error("[체크인 보드] 팀 목록 조회 실패:", error);
        toast.error("팀 목록을 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };

    loadTeams();

    // 실시간 구독 (체크인 상태 변경 감지)
    const checkinsRef = collection(
      db,
      `associations/${associationId}/tournaments/${tournament.id}/checkins/teams`
    );

    const unsubscribe = onSnapshot(checkinsRef, (snapshot) => {
      // 체크인 상태 변경 시 팀 목록 재조회 (간단하게 전체 재조회)
      loadTeams();
    });

    return () => unsubscribe();
  }, [associationId, tournament.id, canCheckin]);

  // 🔥 필터링된 팀 목록
  const filteredTeams = useMemo(() => {
    let filtered = teams;

    // 검색 필터
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (team) =>
          team.teamName.toLowerCase().includes(query) ||
          team.division?.toLowerCase().includes(query)
      );
    }

    // 상태 필터
    if (statusFilter !== "ALL") {
      filtered = filtered.filter((team) => team.status === statusFilter);
    }

    return filtered;
  }, [teams, searchQuery, statusFilter]);

  // 🔥 체크인 상태 업데이트
  const handleUpdateStatus = async (teamId: string, status: TeamCheckinStatus, note?: string) => {
    if (!isAdmin) {
      toast.error("관리자만 체크인 상태를 변경할 수 있습니다.");
      return;
    }

    try {
      setUpdating(teamId);
      const functions = getFunctions(app, "asia-northeast3");
      const updateCheckin = httpsCallable(functions, "updateTeamCheckinStatusCallable");

      await updateCheckin({
        associationId,
        tournamentId: tournament.id,
        teamId,
        status,
        note,
      });

      toast.success("체크인 상태가 업데이트되었습니다.");
    } catch (error: any) {
      console.error("[체크인 보드] 상태 업데이트 실패:", error);
      toast.error(error?.message || "체크인 상태 업데이트에 실패했습니다.");
    } finally {
      setUpdating(null);
    }
  };

  // 🔥 상태별 아이콘 및 색상
  const getStatusConfig = (status: TeamCheckinStatus) => {
    switch (status) {
      case "CHECKED_IN":
        return {
          icon: <CheckCircle2 className="w-4 h-4" />,
          label: "체크인 완료",
          color: "bg-green-100 text-green-800 border-green-300",
        };
      case "LATE":
        return {
          icon: <Clock className="w-4 h-4" />,
          label: "지각",
          color: "bg-yellow-100 text-yellow-800 border-yellow-300",
        };
      case "NO_SHOW":
        return {
          icon: <XCircle className="w-4 h-4" />,
          label: "노쇼",
          color: "bg-red-100 text-red-800 border-red-300",
        };
      case "DISQUALIFIED":
        return {
          icon: <AlertTriangle className="w-4 h-4" />,
          label: "실격",
          color: "bg-gray-100 text-gray-800 border-gray-300",
        };
      default:
        return {
          icon: null,
          label: "미체크인",
          color: "bg-gray-50 text-gray-600 border-gray-200",
        };
    }
  };

  if (!canCheckin) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">
          <p>조 추첨 완료 후 체크인 기능을 사용할 수 있습니다.</p>
          <p className="text-sm mt-2">현재 단계: {tournament.tournamentPhase || "알 수 없음"}</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
          <p className="text-sm text-gray-500 mt-2">팀 목록을 불러오는 중...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>📋 팀 체크인 보드</span>
          <Badge variant="outline">
            총 {teams.length}팀 / 체크인 {teams.filter((t) => t.status === "CHECKED_IN" || t.status === "LATE").length}팀
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 필터 및 검색 */}
        <div className="flex gap-2 flex-col sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="팀명 또는 조 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as TeamCheckinStatus | "ALL")}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="상태 필터" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">전체</SelectItem>
              <SelectItem value="NOT_CHECKED_IN">미체크인</SelectItem>
              <SelectItem value="CHECKED_IN">체크인 완료</SelectItem>
              <SelectItem value="LATE">지각</SelectItem>
              <SelectItem value="NO_SHOW">노쇼</SelectItem>
              <SelectItem value="DISQUALIFIED">실격</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 팀 리스트 */}
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {filteredTeams.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchQuery || statusFilter !== "ALL" 
                ? "검색 결과가 없습니다." 
                : "팀이 없습니다."}
            </div>
          ) : (
            filteredTeams.map((team) => {
              const statusConfig = getStatusConfig(team.status);
              const isUpdating = updating === team.teamId;

              return (
                <div
                  key={team.teamId}
                  className={`border rounded-lg p-4 ${statusConfig.color} transition-colors`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {statusConfig.icon}
                        <span className="font-semibold">{team.teamName}</span>
                        {team.division && (
                          <Badge variant="outline" className="text-xs">
                            {team.division}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-xs">
                          {team.playerCount}명
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant="outline" className={statusConfig.color}>
                          {statusConfig.label}
                        </Badge>
                        {team.checkedInAt && (
                          <span className="text-xs text-gray-500">
                            {new Date(team.checkedInAt.toDate()).toLocaleTimeString("ko-KR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>
                      {team.note && (
                        <p className="text-xs text-gray-600 mt-1">📝 {team.note}</p>
                      )}
                    </div>

                    {/* 체크인 버튼 */}
                    <div className="flex gap-2 flex-shrink-0">
                      {team.status === "NOT_CHECKED_IN" ? (
                        <Button
                          size="sm"
                          onClick={() => handleUpdateStatus(team.teamId, "CHECKED_IN")}
                          disabled={isUpdating || !isAdmin}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {isUpdating ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            "체크인"
                          )}
                        </Button>
                      ) : (
                        <Select
                          value={team.status}
                          onValueChange={(v) => handleUpdateStatus(team.teamId, v as TeamCheckinStatus)}
                          disabled={isUpdating || !isAdmin}
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CHECKED_IN">체크인 완료</SelectItem>
                            <SelectItem value="LATE">지각</SelectItem>
                            <SelectItem value="NO_SHOW">노쇼</SelectItem>
                            <SelectItem value="DISQUALIFIED">실격</SelectItem>
                            <SelectItem value="NOT_CHECKED_IN">미체크인</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
