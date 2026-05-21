/**
 * 🔥 ResultInputCard - 팀별 결과 입력 카드 (관리자용)
 * 
 * 팀별 결과 입력 카드:
 * - 팀 이름
 * - 순위 입력
 * - 점수 입력
 * - 결과 텍스트
 * - 저장 버튼
 */

import { useState } from "react";
import { Card } from "@/components/ui/cards/Card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trophy } from "lucide-react";
import { saveTournamentResult, updateTournamentResult } from "@/lib/tournament/tournamentResult";
import type { TournamentResult } from "@/types/tournament";

interface ResultInputCardProps {
  teamId: string;
  teamName: string;
  tournamentId: string;
  existingResult?: TournamentResult;
  onSaved?: () => void;
}

export function ResultInputCard({
  teamId,
  teamName,
  tournamentId,
  existingResult,
  onSaved,
}: ResultInputCardProps) {
  const [rank, setRank] = useState<string>(
    existingResult?.rank?.toString() || ""
  );
  const [score, setScore] = useState<string>(
    existingResult?.score?.toString() || ""
  );
  const [resultText, setResultText] = useState<string>(
    existingResult?.resultText || ""
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (existingResult) {
        // 수정
        await updateTournamentResult(existingResult.id, {
          rank: rank ? parseInt(rank) : undefined,
          score: score ? parseFloat(score) : undefined,
          resultText: resultText || undefined,
        });
      } else {
        // 생성
        await saveTournamentResult({
          tournamentId,
          teamId,
          rank: rank ? parseInt(rank) : undefined,
          score: score ? parseFloat(score) : undefined,
          resultText: resultText || undefined,
        });
      }
      onSaved?.();
    } catch (error: any) {
      console.error("[ResultInputCard] 저장 실패:", error);
      alert(error.message || "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card variant="info" className="hover:shadow-md transition-shadow">
      {/* 팀 이름 */}
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">{teamName}</h3>
      </div>

      {/* 입력 필드 */}
      <div className="space-y-4">
        {/* 순위 */}
        <div>
          <Label htmlFor={`rank-${teamId}`} className="text-sm font-medium text-gray-700">
            순위
          </Label>
          <Input
            id={`rank-${teamId}`}
            type="number"
            min="1"
            value={rank}
            onChange={(e) => setRank(e.target.value)}
            placeholder="1, 2, 3..."
            className="mt-1"
          />
        </div>

        {/* 점수 */}
        <div>
          <Label htmlFor={`score-${teamId}`} className="text-sm font-medium text-gray-700">
            점수
          </Label>
          <Input
            id={`score-${teamId}`}
            type="number"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            placeholder="점수 (선택)"
            className="mt-1"
          />
        </div>

        {/* 결과 텍스트 */}
        <div>
          <Label htmlFor={`resultText-${teamId}`} className="text-sm font-medium text-gray-700">
            결과 텍스트
          </Label>
          <Input
            id={`resultText-${teamId}`}
            type="text"
            value={resultText}
            onChange={(e) => setResultText(e.target.value)}
            placeholder="예: 8강, 예선 탈락"
            className="mt-1"
          />
        </div>

        {/* 저장 버튼 */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          size="sm"
        >
          {saving ? "저장 중..." : existingResult ? "수정" : "저장"}
        </Button>
      </div>
    </Card>
  );
}
