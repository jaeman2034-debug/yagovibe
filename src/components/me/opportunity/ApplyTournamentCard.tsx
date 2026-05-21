/**
 * 🔥 ApplyTournamentCard - 대회 참가 카드 (STEP: 대회 참가 플로우)
 * 
 * STEP 설계 원칙:
 * - variant: action (선택 유도, 버튼 1개만, OpportunitySection 전용)
 * - "할 수 있어요" 톤 (강요 ❌)
 * - 참가 상태에 따라 버튼 텍스트 변경
 */
import { Trophy } from "lucide-react";
import { Card } from "@/components/ui/cards/Card";

interface ApplyTournamentCardProps {
  onClick: () => void;
  hasApplication?: boolean;
  applicationStatus?: string;
}

/**
 * 🔥 대회 참가 카드
 * 
 * 참가 상태에 따른 표시:
 * - 없음: "참가 신청"
 * - pending: "신청 중입니다" (비활성화)
 * - approved: "참가 확정" (비활성화)
 * - rejected: "반려됨" (재신청 가능)
 */
export function ApplyTournamentCard({
  onClick,
  hasApplication = false,
  applicationStatus,
}: ApplyTournamentCardProps) {
  const getButtonText = () => {
    if (!hasApplication) {
      return "참가 신청";
    }

    const status = applicationStatus?.toUpperCase();
    switch (status) {
      case "PENDING":
        return "신청 중입니다";
      case "APPROVED":
        return "참가 확정";
      case "REJECTED":
        return "재신청";
      default:
        return "신청 중입니다";
    }
  };

  const isDisabled = hasApplication && applicationStatus?.toUpperCase() !== "REJECTED";

  return (
    <Card
      variant="action"
      icon={<Trophy className="w-5 h-5" />}
      title="대회 참가"
      subText="이 팀으로 대회에 참가할 수 있어요"
      actionLabel={getButtonText()}
      onAction={onClick}
      disabled={isDisabled}
    />
  );
}
