/**
 * 경기 상세 페이지
 * 심판/운영진용 실무 화면
 */

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Match, MatchPlayer, MatchDisciplinary, RefereeNote, AgeDivision } from "@/types/tournament";
import { getMatchTeamLabels } from "@/lib/tournament/resolveSlotLabel";
import { getVenueById } from "@/types/venue";
import { useAuth } from "@/context/AuthProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle2, XCircle, AlertTriangle, Clock, MapPin, Users, FileText, UserPlus } from "lucide-react";
import { MatchLineupSection } from "@/components/association/tournament/MatchLineupSection";
import { MatchVerificationSection } from "@/components/association/tournament/MatchVerificationSection";
import { MatchDisciplinarySection } from "@/components/association/tournament/MatchDisciplinarySection";
import { MatchRefereeNotesSection } from "@/components/association/tournament/MatchRefereeNotesSection";

export default function MatchDetailPage() {
  const { associationId, tournamentId, division, matchId } = useParams<{
    associationId: string;
    tournamentId: string;
    division: AgeDivision;
    matchId: string;
  }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!associationId || !tournamentId || !division || !matchId) return;

    const loadMatch = async () => {
      try {
        const bracketRef = doc(
          db,
          `associations/${associationId}/tournaments/${tournamentId}/brackets/${division}`
        );
        const bracketSnap = await getDoc(bracketRef);

        if (!bracketSnap.exists()) {
          setLoading(false);
          return;
        }

        const bracket = bracketSnap.data();
        const matches: Match[] = bracket.matches || [];
        const foundMatch = matches.find((m) => m.id === matchId);

        if (foundMatch) {
          setMatch(foundMatch);
        }
      } catch (error) {
        console.error("[MatchDetailPage] 로딩 오류:", error);
      } finally {
        setLoading(false);
      }
    };

    loadMatch();
  }, [associationId, tournamentId, division, matchId]);

  const handleMatchUpdate = async (updates: Partial<Match>) => {
    if (!associationId || !tournamentId || !division || !match) return;

    try {
      const bracketRef = doc(
        db,
        `associations/${associationId}/tournaments/${tournamentId}/brackets/${division}`
      );
      const bracketSnap = await getDoc(bracketRef);

      if (!bracketSnap.exists()) return;

      const bracket = bracketSnap.data();
      const matches: Match[] = bracket.matches || [];
      const matchIndex = matches.findIndex((m) => m.id === match.id);

      if (matchIndex === -1) return;

      matches[matchIndex] = { ...matches[matchIndex], ...updates };

      await updateDoc(bracketRef, {
        matches,
        updatedAt: serverTimestamp(),
      });

      setMatch({ ...match, ...updates });
    } catch (error) {
      console.error("[MatchDetailPage] 업데이트 오류:", error);
      alert("업데이트에 실패했습니다.");
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-8 px-4">
        <div className="text-center">로딩 중...</div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="max-w-6xl mx-auto py-8 px-4">
        <div className="text-center">경기를 찾을 수 없습니다.</div>
      </div>
    );
  }

  const { homeLabel, awayLabel } = getMatchTeamLabels(match);
  const venue = match.venueId ? getVenueById(match.venueId as any) : null;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">
      {/* 상단 고정 헤더 */}
      <div className="sticky top-0 z-10 bg-white border-b pb-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            뒤로
          </Button>
          <Badge
            variant={
              match.status === "completed"
                ? "default"
                : match.status === "in_progress"
                ? "default"
                : "outline"
            }
            className={
              match.status === "completed"
                ? "bg-green-500"
                : match.status === "in_progress"
                ? "bg-blue-500"
                : ""
            }
          >
            {match.status === "completed" && "종료"}
            {match.status === "in_progress" && "진행중"}
            {match.status === "scheduled" && "예정"}
            {match.status === "cancelled" && "취소"}
          </Badge>
        </div>

        {/* 경기 기본 정보 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              {match.matchNumber} · {match.round}
            </h1>
            <div className="text-lg font-semibold">
              {homeLabel} <span className="text-gray-400 mx-2">vs</span> {awayLabel}
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span>
                {venue ? `${venue.shortName} · ${venue.name}` : match.venue || "장소 미정"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>
                {match.date.split("T")[0]} {match.time}
              </span>
            </div>
            {match.referees && (
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span>
                  주심: {match.referees.main?.name || "미배정"}
                  {match.referees.assistant1 && ` / 부심1: ${match.referees.assistant1.name}`}
                  {match.referees.assistant2 && ` / 부심2: ${match.referees.assistant2.name}`}
                </span>
              </div>
            )}
            {match.scoreA !== undefined && match.scoreB !== undefined && (
              <div className="text-lg font-bold text-blue-600">
                {match.scoreA} : {match.scoreB}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="space-y-6">
        {/* 출전 명단 */}
        <MatchLineupSection
          match={match}
          onUpdate={handleMatchUpdate}
        />

        {/* 선수 검인 */}
        <MatchVerificationSection
          match={match}
          onUpdate={handleMatchUpdate}
          associationId={associationId}
          tournamentId={tournamentId}
        />

        {/* 경고/퇴장 */}
        <MatchDisciplinarySection
          match={match}
          onUpdate={handleMatchUpdate}
        />

        {/* 심판 메모/특이사항 */}
        <MatchRefereeNotesSection
          match={match}
          onUpdate={handleMatchUpdate}
        />
      </div>
    </div>
  );
}

