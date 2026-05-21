/**
 * 경기장별 일정표 컴포넌트
 * 사무국/운영진/심판용 실무 뷰
 */

import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Bracket, Match, AgeDivision } from "@/types/tournament";
import { AGE_DIVISION_LABELS } from "@/types/tournament";
import { NOWON_VENUES, type VenueId, getVenueById } from "@/types/venue";
import { getMatchTeamLabels, getRoundLabel } from "@/lib/tournament/resolveSlotLabel";
import { Calendar, Clock, MapPin, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
// 날짜 포맷팅 유틸리티
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const weekday = weekdays[date.getDay()];
  return `${month}월 ${day}일 (${weekday})`;
}

interface VenueScheduleProps {
  brackets: Bracket[];
  selectedDate?: string | null; // YYYY-MM-DD, null이면 전체
  selectedVenue?: VenueId | "all" | null; // null이면 전체
  onDateChange?: (date: string | null) => void;
  onVenueChange?: (venue: VenueId | "all" | null) => void;
  associationId?: string; // 경기 상세 링크용
  tournamentId?: string; // 경기 상세 링크용
}

export function VenueSchedule({
  brackets,
  selectedDate = null,
  selectedVenue = "all",
  onDateChange,
  onVenueChange,
  associationId,
  tournamentId,
}: VenueScheduleProps) {
  const navigate = useNavigate();
  // 모든 경기를 평탄화
  const allMatches = useMemo(() => {
    return brackets.flatMap((bracket) =>
      bracket.matches.map((match) => ({
        ...match,
        division: bracket.division,
      }))
    );
  }, [brackets]);

  // 날짜별/경기장별로 그룹화
  const scheduleData = useMemo(() => {
    const grouped: Record<string, Record<VenueId | "other", Match[]>> = {};

    allMatches.forEach((match) => {
      const dateKey = match.date.split("T")[0]; // YYYY-MM-DD
      const venueId = (match.venueId || match.venue) as VenueId | undefined;

      // 날짜 필터
      if (selectedDate && dateKey !== selectedDate) return;

      // 경기장 필터
      if (selectedVenue && selectedVenue !== "all") {
        if (venueId !== selectedVenue) return;
      }

      if (!grouped[dateKey]) {
        grouped[dateKey] = {};
      }

      const venue = venueId && getVenueById(venueId) ? venueId : "other";
      if (!grouped[dateKey][venue]) {
        grouped[dateKey][venue] = [];
      }

      grouped[dateKey][venue].push(match);
    });

    // 시간순 정렬
    Object.keys(grouped).forEach((dateKey) => {
      Object.keys(grouped[dateKey]).forEach((venue) => {
        grouped[dateKey][venue as VenueId].sort((a, b) => {
          const timeA = a.time || "99:99";
          const timeB = b.time || "99:99";
          return timeA.localeCompare(timeB);
        });
      });
    });

    return grouped;
  }, [allMatches, selectedDate, selectedVenue]);

  // 연속 경기 체크 (같은 팀이 연속으로 경기)
  const getConsecutiveWarning = (matches: Match[], currentIndex: number): string | null => {
    if (currentIndex === 0) return null;

    const current = matches[currentIndex];
    const previous = matches[currentIndex - 1];

    const { homeLabel: currentHome, awayLabel: currentAway } = getMatchTeamLabels(current);
    const { homeLabel: prevHome, awayLabel: prevAway } = getMatchTeamLabels(previous);

    const currentTeams = [currentHome, currentAway].filter(Boolean);
    const prevTeams = [prevHome, prevAway].filter(Boolean);

    const hasOverlap = currentTeams.some((team) => prevTeams.includes(team));

    if (hasOverlap) {
      const overlapTeam = currentTeams.find((team) => prevTeams.includes(team));
      return `${overlapTeam} 연속 경기`;
    }

    return null;
  };

  // 오늘 날짜 (기본값)
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      {/* 필터 바 */}
      <Card className="rounded-xl">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">필터</span>
            </div>

            {/* 날짜 필터 */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <Button
                variant={selectedDate === null ? "default" : "outline"}
                size="sm"
                onClick={() => onDateChange?.(null)}
              >
                전체
              </Button>
              <Button
                variant={selectedDate === today ? "default" : "outline"}
                size="sm"
                onClick={() => onDateChange?.(today)}
              >
                오늘
              </Button>
              <input
                type="date"
                value={selectedDate && selectedDate !== today ? selectedDate : ""}
                onChange={(e) => onDateChange?.(e.target.value || null)}
                className="px-3 py-1.5 border rounded-md text-sm"
              />
            </div>

            {/* 경기장 필터 */}
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <Button
                variant={selectedVenue === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => onVenueChange?.("all")}
              >
                전체
              </Button>
              {NOWON_VENUES.map((venue) => (
                <Button
                  key={venue.id}
                  variant={selectedVenue === venue.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => onVenueChange?.(venue.id)}
                >
                  {venue.shortName}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 일정표 */}
      {Object.keys(scheduleData).length === 0 ? (
        <Card className="rounded-xl">
          <CardContent className="p-8 text-center text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>선택한 조건에 해당하는 경기가 없습니다.</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(scheduleData)
          .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
          .map(([dateKey, venues]) => (
            <div key={dateKey} className="space-y-6">
              {/* 날짜 헤더 */}
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                <h2 className="text-xl font-bold">
                  {formatDate(dateKey)} ({dateKey === today ? "오늘" : ""})
                </h2>
              </div>

              {/* 경기장별 그룹 */}
              {NOWON_VENUES.map((venue) => {
                const matches = venues[venue.id] || [];

                if (matches.length === 0) return null;

                return (
                  <Card key={venue.id} className="rounded-xl">
                    <CardContent className="p-6">
                      {/* 경기장 헤더 */}
                      <div className="mb-4 pb-3 border-b">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-5 h-5 text-primary" />
                          <h3 className="text-lg font-semibold">
                            {venue.shortName} · {venue.name}
                          </h3>
                        </div>
                      </div>

                      {/* 경기 목록 */}
                      <div className="space-y-2">
                        {matches.map((match, index) => {
                          const { homeLabel, awayLabel } = getMatchTeamLabels(match);
                          const consecutiveWarning = getConsecutiveWarning(matches, index);
                          const roundLabel = getRoundLabel(match.round);

                          return (
                            <div
                              key={match.id}
                              className={`flex items-center justify-between rounded-lg border-2 p-3 ${
                                match.status === "completed"
                                  ? "bg-green-50 border-green-200"
                                  : match.status === "in_progress"
                                  ? "bg-blue-50 border-blue-300"
                                  : "bg-white border-gray-200"
                              }`}
                            >
                              {/* 시간 */}
                              <div className="font-mono text-sm font-semibold w-16">
                                {match.time || "TBD"}
                              </div>

                              {/* 경기 정보 */}
                              <div className="flex-1 mx-4">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="text-xs">
                                    {AGE_DIVISION_LABELS[match.division]}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {roundLabel}
                                  </Badge>
                                  {consecutiveWarning && (
                                    <Badge variant="destructive" className="text-xs">
                                      ⚠️ {consecutiveWarning}
                                    </Badge>
                                  )}
                                </div>
                                <div className="font-medium">
                                  {homeLabel} <span className="text-gray-400 mx-2">vs</span>{" "}
                                  {awayLabel}
                                </div>
                                {match.matchNumber && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {match.matchNumber}
                                  </div>
                                )}
                              </div>

                              {/* 결과/상태 */}
                              <div className="text-right min-w-[80px]">
                                {match.scoreA !== undefined && match.scoreB !== undefined ? (
                                  <div>
                                    <div className="text-lg font-bold text-blue-600">
                                      {match.scoreA} : {match.scoreB}
                                    </div>
                                    {match.resultType && (
                                      <div className="text-xs text-muted-foreground">
                                        {match.resultType === "FT" && "전반"}
                                        {match.resultType === "PK" && "승부차기"}
                                        {match.resultType === "ET" && "연장"}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-sm text-muted-foreground">
                                    {match.status === "in_progress" ? (
                                      <Badge variant="default" className="bg-blue-500">
                                        진행중
                                      </Badge>
                                    ) : (
                                      "예정"
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ))
      )}
    </div>
  );
}

