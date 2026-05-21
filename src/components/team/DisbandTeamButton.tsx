/**
 * 🔥 DisbandTeamButton - 팀 해체 버튼 (STEP: 팀원 가입 플로우)
 * 
 * 팀장(P3)만 사용 가능
 * - 확인 UX 필수
 * - 해체 후 모든 팀원이 자동으로 P1로 전이
 */

import { useState } from "react";
import { useAuth } from "@/context/AuthProvider";
import { disbandTeam } from "@/lib/team/teamLeave";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface DisbandTeamButtonProps {
  teamId: string;
  teamName?: string;
  onDisbanded?: () => void;
}

export function DisbandTeamButton({
  teamId,
  teamName,
  onDisbanded,
}: DisbandTeamButtonProps) {
  const { user } = useAuth();
  const [disbanding, setDisbanding] = useState(false);

  const handleDisband = async () => {
    if (!user) return;

    // 확인 UX (필수)
    const confirmed = confirm(
      "팀을 해체하면 모든 팀원이 팀에서 분리됩니다. 계속할까요?"
    );

    if (!confirmed) {
      return;
    }

    setDisbanding(true);

    try {
      await disbandTeam(teamId);
      onDisbanded?.();
      // 해체 후 자동으로 Persona가 P1로 전이됨 (새로고침 필요)
      // 강제 리다이렉트 없음 - 상태 변화가 피드백
    } catch (error: any) {
      console.error("[DisbandTeamButton] 팀 해체 실패:", error);
      alert(error.message || "팀 해체에 실패했습니다.");
    } finally {
      setDisbanding(false);
    }
  };

  return (
    <Button
      onClick={handleDisband}
      disabled={disbanding}
      className="bg-red-600 hover:bg-red-700 text-white"
      size="sm"
    >
      <AlertTriangle className="w-4 h-4 mr-1" />
      {disbanding ? "해체 중..." : "팀 해체"}
    </Button>
  );
}
