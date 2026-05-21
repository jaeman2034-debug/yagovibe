/**
 * 🔥 Match Result Input 컴포넌트
 * 
 * 역할:
 * - 경기 스코어 입력
 * - 빠른 입력 UX
 * - 자동 검증
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QuickInputButtons } from "./QuickInputButtons";
import { CheckCircle, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import type { EventMatch } from "@/types/event";

interface MatchResultInputProps {
  match: EventMatch;
  eventId: string;
  organizationId?: string;
  onSaved?: () => void;
}

export function MatchResultInput({
  match,
  eventId,
  organizationId,
  onSaved,
}: MatchResultInputProps) {
  const navigate = useNavigate();
  const [homeScore, setHomeScore] = useState<number>(match.score?.home || 0);
  const [awayScore, setAwayScore] = useState<number>(match.score?.away || 0);
  const [status, setStatus] = useState<string>(match.status || "scheduled");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // 기존 점수 로드
  useEffect(() => {
    if (match.score) {
      setHomeScore(match.score.home || 0);
      setAwayScore(match.score.away || 0);
    }
    if (match.status) {
      setStatus(match.status);
    }
  }, [match]);

  // 완료 상태 체크
  useEffect(() => {
    if (match.status === "completed") {
      setSaved(true);
    }
  }, [match.status]);

  const validateScores = (): string | null => {
    if (homeScore < 0 || awayScore < 0) {
      return "점수는 0 이상이어야 합니다.";
    }
    if (homeScore > 50 || awayScore > 50) {
      return "점수가 비정상적으로 높습니다. 확인해주세요.";
    }
    return null;
  };

  const handleSave = async () => {
    const validationError = validateScores();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      setSaving(true);

      const matchRef = doc(db, "event_matches", match.id);
      const winner = homeScore > awayScore ? "HOME" : homeScore < awayScore ? "AWAY" : null;
      const winnerTeamId = winner === "HOME" ? match.homeTeamId : winner === "AWAY" ? match.awayTeamId : null;

      await updateDoc(matchRef, {
        score: {
          home: homeScore,
          away: awayScore,
        },
        status: status === "completed" ? "completed" : status,
        winner,
        winnerTeamId,
        updatedAt: serverTimestamp(),
      });

      setSaved(true);
      toast.success("경기 결과가 저장되었습니다.");
      onSaved?.();
    } catch (error: any) {
      console.error("경기 결과 저장 실패:", error);
      toast.error(error.message || "경기 결과 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleEnterStats = () => {
    navigate(`/admin/organizations/${organizationId}/events/${eventId}/matches/${match.id}/stats`);
  };

  const homeTeamName = match.homeTeamName || "홈 팀";
  const awayTeamName = match.awayTeamName || "원정 팀";

  return (
    <div className="space-y-6">
      {/* Match Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">경기 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-sm text-gray-500 mb-1">홈 팀</div>
                <div className="text-lg font-semibold">{homeTeamName}</div>
              </div>
              <div className="text-3xl font-bold text-gray-900">vs</div>
              <div className="text-center">
                <div className="text-sm text-gray-500 mb-1">원정 팀</div>
                <div className="text-lg font-semibold">{awayTeamName}</div>
              </div>
            </div>
          </div>
          {match.stageLabel && (
            <div className="mt-4 text-sm text-gray-600">
              <span className="font-medium">라운드:</span> {match.stageLabel}
            </div>
          )}
          {match.scheduledAt && (
            <div className="mt-2 text-sm text-gray-600">
              <span className="font-medium">일시:</span>{" "}
              {match.scheduledAt.toDate?.().toLocaleString("ko-KR") || "-"}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Score Input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">스코어 입력</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Home Score */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-700 mb-2">{homeTeamName}</div>
                <QuickInputButtons
                  value={homeScore}
                  onChange={setHomeScore}
                  min={0}
                  max={50}
                />
              </div>
            </div>

            {/* Away Score */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-700 mb-2">{awayTeamName}</div>
                <QuickInputButtons
                  value={awayScore}
                  onChange={setAwayScore}
                  min={0}
                  max={50}
                />
              </div>
            </div>

            {/* Current Score Display */}
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-sm text-gray-500 mb-1">현재 스코어</div>
              <div className="text-3xl font-bold text-gray-900">
                {homeScore} : {awayScore}
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">경기 상태</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="scheduled">예정</option>
                <option value="live">진행중</option>
                <option value="completed">완료</option>
                <option value="canceled">취소</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Button
          onClick={handleSave}
          disabled={saving || saved}
          className="flex-1"
          size="lg"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              저장 중...
            </>
          ) : saved ? (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              저장 완료
            </>
          ) : (
            "경기 결과 저장"
          )}
        </Button>
        {saved && (
          <Button
            onClick={handleEnterStats}
            variant="outline"
            className="flex-1"
            size="lg"
          >
            <Users className="w-4 h-4 mr-2" />
            선수 기록 입력
          </Button>
        )}
      </div>
    </div>
  );
}
