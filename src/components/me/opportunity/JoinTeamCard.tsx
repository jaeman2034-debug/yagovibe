/**
 * 🔥 JoinTeamCard - 팀에 소속되기 카드 (PR 5: 선택 톤 적용)
 * 
 * PR 5 설계 원칙:
 * - variant: action (선택 유도, 버튼 1개만, OpportunitySection 전용)
 * - "할 수 있어요" 톤 (강요 ❌)
 */
import { Users } from "lucide-react";
import { Card } from "@/components/ui/cards/Card";

interface JoinTeamCardProps {
  onClick: () => void;
}

/**
 * 🔥 팀에 소속되기 카드
 * 
 * PR 5 문구 정리:
 * - Title: 팀에 소속되기
 * - SubText: 이미 활동 중인 팀에 합류할 수 있어요 (선택 톤)
 */
export function JoinTeamCard({ onClick }: JoinTeamCardProps) {
  return (
    <Card
      variant="action"
      icon={<Users className="w-5 h-5" />}
      title="팀에 소속되기"
      subText="이미 활동 중인 팀에 합류할 수 있어요."
      actionLabel="팀 찾기"
      onAction={onClick}
    />
  );
}
