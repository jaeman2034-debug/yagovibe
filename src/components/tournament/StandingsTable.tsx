/**
 * 🔥 STEP 7: 조별 순위표 (참가자용)
 * 
 * 조별 순위표를 표시하는 컴포넌트
 */

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { Tournament, TeamStanding } from "@/types/tournament";

interface StandingsTableProps {
  associationId: string;
  tournament: Tournament;
  currentTeamId?: string; // 현재 팀 ID (하이라이트용)
}

export function StandingsTable({
  associationId,
  tournament,
  currentTeamId,
}: StandingsTableProps) {
  const [standings, setStandings] = useState<TeamStanding[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDivision, setSelectedDivision] = useState<number | "ALL">("ALL");

  // 🔥 순위표 조회
  useEffect(() => {
    if (!associationId || !tournament.id) {
      setLoading(false);
      return;
    }

    const standingsRef = collection(
      db,
      `associations/${associationId}/tournaments/${tournament.id}/standings`
    );

    // 실시간 구독
    const unsubscribe = onSnapshot(standingsRef, (snapshot) => {
      const standingsData = snapshot.docs.map((doc) => ({
        ...doc.data(),
      })) as TeamStanding[];

      // 조별로 정렬 후 순위별 정렬
      standingsData.sort((a, b) => {
        if (a.divisionNumber !== b.divisionNumber) {
          return a.divisionNumber - b.divisionNumber;
        }
        return a.rank - b.rank;
      });

      setStandings(standingsData);
      setLoading(false);
    }, (error) => {
      console.error("[순위표 조회 오류]", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [associationId, tournament.id]);

  // 🔥 조 목록 추출
  const divisions = Array.from(new Set(standings.map((s) => s.divisionNumber))).sort((a, b) => a - b);

  // 🔥 필터링된 순위표
  const filteredStandings = selectedDivision === "ALL"
    ? standings
    : standings.filter((s) => s.divisionNumber === selectedDivision);

  // 🔥 조별로 그룹화
  const standingsByDivision = filteredStandings.reduce((acc, standing) => {
    const div = standing.divisionNumber;
    if (!acc[div]) {
      acc[div] = [];
    }
    acc[div].push(standing);
    return acc;
  }, {} as Record<number, TeamStanding[]>);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
          <p className="text-sm text-gray-500 mt-2">순위표를 불러오는 중...</p>
        </CardContent>
      </Card>
    );
  }

  if (standings.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">
          <p>아직 경기 결과가 없습니다.</p>
          <p className="text-sm mt-2">경기 결과가 입력되면 순위표가 표시됩니다.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>📊 조별 순위표</CardTitle>
          {divisions.length > 1 && (
            <Select
              value={selectedDivision === "ALL" ? "ALL" : selectedDivision.toString()}
              onValueChange={(v) => setSelectedDivision(v === "ALL" ? "ALL" : parseInt(v))}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">전체 조</SelectItem>
                {divisions.map((div) => (
                  <SelectItem key={div} value={div.toString()}>
                    조 {div}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(standingsByDivision).map(([division, divStandings]) => (
          <div key={division} className="space-y-2">
            <h3 className="font-semibold text-lg">조 {division}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-2 font-semibold">순위</th>
                    <th className="text-left p-2 font-semibold">팀명</th>
                    <th className="text-center p-2 font-semibold">경기</th>
                    <th className="text-center p-2 font-semibold">승</th>
                    <th className="text-center p-2 font-semibold">무</th>
                    <th className="text-center p-2 font-semibold">패</th>
                    <th className="text-center p-2 font-semibold">득점</th>
                    <th className="text-center p-2 font-semibold">실점</th>
                    <th className="text-center p-2 font-semibold">득실차</th>
                    <th className="text-center p-2 font-semibold">승점</th>
                  </tr>
                </thead>
                <tbody>
                  {divStandings.map((standing) => {
                    const isCurrentTeam = currentTeamId === standing.teamId;
                    return (
                      <tr
                        key={standing.teamId}
                        className={`border-b hover:bg-gray-50 ${
                          isCurrentTeam ? "bg-blue-50 font-semibold" : ""
                        }`}
                      >
                        <td className="p-2">
                          <Badge variant={standing.rank <= 2 ? "default" : "outline"}>
                            {standing.rank}
                          </Badge>
                        </td>
                        <td className="p-2">
                          {standing.teamName}
                          {isCurrentTeam && <span className="ml-2 text-blue-600">(내 팀)</span>}
                        </td>
                        <td className="text-center p-2">{standing.played}</td>
                        <td className="text-center p-2 text-green-600">{standing.win}</td>
                        <td className="text-center p-2 text-gray-600">{standing.draw}</td>
                        <td className="text-center p-2 text-red-600">{standing.loss}</td>
                        <td className="text-center p-2">{standing.goalsFor}</td>
                        <td className="text-center p-2">{standing.goalsAgainst}</td>
                        <td className={`text-center p-2 font-semibold ${
                          standing.goalDiff > 0 ? "text-green-600" :
                          standing.goalDiff < 0 ? "text-red-600" : "text-gray-600"
                        }`}>
                          {standing.goalDiff > 0 ? "+" : ""}{standing.goalDiff}
                        </td>
                        <td className="text-center p-2 font-bold text-blue-600">
                          {standing.points}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
