/**
 * 연령대별 대진표 표시 컴포넌트
 * 노원구청장기 축구대회 스타일: 공식 게시형 고정 대진표
 */

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Bracket, Match, AgeDivision } from "@/types/tournament";
import { AGE_DIVISION_LABELS } from "@/types/tournament";
import { getVenueById, type VenueId } from "@/types/venue";
import { VenueBadge } from "./VenueBadge";
import { Calendar, Clock } from "lucide-react";

interface BracketDisplayProps {
  bracket: Bracket;
  tournamentName?: string;
}

export function BracketDisplay({ bracket, tournamentName }: BracketDisplayProps) {
  // 날짜별로 경기 그룹화
  const matchesByDate = React.useMemo(() => {
    const grouped: Record<string, Match[]> = {};
    bracket.matches.forEach((match) => {
      const dateKey = match.date.split("T")[0]; // YYYY-MM-DD
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(match);
    });
    return grouped;
  }, [bracket.matches]);

  // 날짜 포맷팅 (한국어)
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
    const weekday = weekdays[date.getDay()];
    return `${month}월 ${day}일 (${weekday})`;
  };

  // 경기 번호로 정렬
  const sortMatches = (matches: Match[]): Match[] => {
    return [...matches].sort((a, b) => {
      const numA = parseInt(a.matchNumber.replace(/[^0-9]/g, "")) || 0;
      const numB = parseInt(b.matchNumber.replace(/[^0-9]/g, "")) || 0;
      return numA - numB;
    });
  };

  // 라운드별 색상
  const getRoundColor = (round: string): string => {
    if (round.includes("결승")) return "bg-yellow-100 text-yellow-800 border-yellow-300";
    if (round.includes("준결승") || round.includes("3·4위전")) return "bg-blue-100 text-blue-800 border-blue-300";
    return "bg-gray-100 text-gray-800 border-gray-300";
  };

  return (
    <div className="space-y-6">
      {/* 연령대 헤더 */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{AGE_DIVISION_LABELS[bracket.division]}</h2>
        {bracket.confirmed && (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
            대진표 확정
          </Badge>
        )}
      </div>

      {/* 날짜별 경기 목록 */}
      {Object.entries(matchesByDate)
        .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
        .map(([dateKey, matches]) => (
          <Card key={dateKey} className="rounded-2xl">
            <CardContent className="p-6">
              {/* 날짜 헤더 */}
              <div className="mb-4 pb-3 border-b">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <Calendar className="w-5 h-5" />
                  {formatDate(dateKey)}
                </div>
              </div>

              {/* 경기 목록 */}
              <div className="space-y-3">
                {sortMatches(matches).map((match) => (
                  <div
                    key={match.id}
                    className={`p-4 rounded-lg border-2 ${
                      match.round.includes("결승")
                        ? "bg-yellow-50 border-yellow-300"
                        : match.round.includes("준결승") || match.round.includes("3·4위전")
                        ? "bg-blue-50 border-blue-300"
                        : "bg-white border-gray-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      {/* 좌측: 경기 정보 */}
                      <div className="flex-1 min-w-[200px]">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className={getRoundColor(match.round)}>
                            {match.round}
                          </Badge>
                          <span className="text-sm font-medium text-gray-600">
                            {match.matchNumber}
                          </span>
                        </div>

                        {/* 팀 정보 (슬롯 방식 우선, 하위 호환) */}
                        <div className="space-y-2">
                          {(() => {
                            // resolveSlotLabel 유틸리티 사용
                            const homeTeam = resolveSlotLabel(match.homeSlot, match.teamA);
                            const awayTeam = resolveSlotLabel(match.awaySlot, match.teamB);

                            return (
                              <>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-gray-900">
                                    {homeTeam || "대기중"}
                                  </span>
                                  {match.scoreA !== undefined && (
                                    <span className="text-lg font-bold text-blue-600">
                                      {match.scoreA}
                                    </span>
                                  )}
                                </div>
                                <div className="text-gray-400 text-center">VS</div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-gray-900">
                                    {awayTeam || "대기중"}
                                  </span>
                                  {match.scoreB !== undefined && (
                                    <span className="text-lg font-bold text-blue-600">
                                      {match.scoreB}
                                    </span>
                                  )}
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>

                      {/* 우측: 시간/장소 */}
                      <div className="flex flex-col gap-2 text-sm text-gray-600 min-w-[120px]">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span className="font-medium">{match.time}</span>
                        </div>
                        <VenueBadge
                          venueId={match.venueId}
                          venueName={match.venue}
                          className="text-sm"
                        />
                        {match.status === "completed" && match.winner && (
                          <div className="mt-1">
                            <Badge
                              variant="outline"
                              className="bg-green-50 text-green-700 border-green-300"
                            >
                              {match.winner === "A" || match.winner === "HOME"
                                ? match.homeSlot?.teamName || match.teamA
                                : match.awaySlot?.teamName || match.teamB}{" "}
                              승
                            </Badge>
                            {match.resultType && (
                              <div className="text-xs text-gray-500">
                                {match.resultType === "FT" && "전반"}
                                {match.resultType === "PK" && "승부차기"}
                                {match.resultType === "ET" && "연장"}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 비고 */}
                    {match.notes && (
                      <div className="mt-2 pt-2 border-t text-xs text-gray-500">
                        {match.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

      {/* 대진표 미확정 안내 */}
      {!bracket.confirmed && (
        <div className="text-center py-8 text-muted-foreground border-t">
          <p className="text-sm">대진표는 아직 확정되지 않았습니다.</p>
          <p className="text-xs mt-1">확정 후 공개됩니다.</p>
        </div>
      )}
    </div>
  );
}

