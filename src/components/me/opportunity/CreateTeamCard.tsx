/**
 * 🔥 CreateTeamCard - 팀 만들기 카드
 * 
 * 설계 원칙:
 * - P1 (개인 체육인)만 노출
 * - "직접 팀을 만들어 운영할 수 있어요" (선택 톤)
 */
import { Plus } from "lucide-react";
import { Card } from "@/components/ui/cards/Card";

interface CreateTeamCardProps {
  onClick: () => void;
}

/**
 * 🔥 팀 만들기 카드
 */
export function CreateTeamCard({ onClick }: CreateTeamCardProps) {
  return (
    <Card
      variant="action"
      icon={<Plus className="w-5 h-5" />}
      title="팀 만들기"
      subText="새로운 팀을 만들어 운영할 수 있어요."
      actionLabel="팀 만들기"
      onAction={onClick}
    />
  );
}
