/**
 * 🔒 대회 종료 버튼 (기록 잠금)
 * Step 4: 대회 종료 Lock
 */

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Lock, Loader2 } from "lucide-react";
import { lockTournament } from "@/lib/tournament/tournamentRepository";
import { useNavigate } from "react-router-dom";

interface EndTournamentButtonProps {
  associationId: string;
  tournamentId: string;
}

export function EndTournamentButton({
  associationId,
  tournamentId,
}: EndTournamentButtonProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEnd = async () => {
    const ok = window.confirm(
      "대회를 종료하면 모든 기록이 잠기며 수정할 수 없습니다.\n\n" +
      "• 검인 기록 수정 불가\n" +
      "• 경고/퇴장 기록 수정 불가\n" +
      "• 심판 메모 수정 불가\n" +
      "• 경기 정보 수정 불가\n\n" +
      "정말 종료하시겠습니까?"
    );

    if (!ok) return;

    setLoading(true);
    setError(null);

    try {
      await lockTournament(associationId, tournamentId);
      alert("✅ 대회가 종료되었습니다. 모든 기록이 잠겼습니다.");
      // 대회 목록으로 이동
      navigate(`/association/${associationId}/admin/tournaments`);
    } catch (e: any) {
      console.error("대회 종료 오류:", e);
      setError(e.message || "대회 종료에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        variant="destructive"
        onClick={handleEnd}
        disabled={loading}
        className="w-full sm:w-auto"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            처리 중...
          </>
        ) : (
          <>
            <Lock className="w-4 h-4 mr-2" />
            대회 종료 (기록 잠금)
          </>
        )}
      </Button>
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}

