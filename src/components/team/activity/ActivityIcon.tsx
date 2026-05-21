/**
 * 🔥 Activity 타입별 아이콘 컴포넌트
 */

import { TeamActivityType } from "@/types/activity";

interface ActivityIconProps {
  type: TeamActivityType;
  className?: string;
}

export function ActivityIcon({ type, className = "" }: ActivityIconProps) {
  const icons: Record<TeamActivityType, string> = {
    event: "📅",
    notice: "📢",
    match: "⚽",
    member_join: "👤",
    member_left: "👋",
    post: "📝",
  };

  return (
    <span className={className} role="img" aria-label={type}>
      {icons[type] || "📌"}
    </span>
  );
}
