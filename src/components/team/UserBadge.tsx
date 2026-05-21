/**
 * 🔥 사용자 배지 표시 컴포넌트
 */
import { Trophy, Award, Star } from "lucide-react";

interface UserBadgeProps {
  badges?: string[];
  size?: "sm" | "md" | "lg";
}

const BADGE_CONFIG: { [key: string]: { icon: any; color: string; label: string } } = {
  monthly_mvp: {
    icon: Trophy,
    color: "#fbbf24",
    label: "MVP",
  },
  "100_messages": {
    icon: Award,
    color: "#3b82f6",
    label: "100메시지",
  },
  event_master: {
    icon: Star,
    color: "#8b5cf6",
    label: "이벤트 마스터",
  },
  super7: {
    icon: Trophy,
    color: "#f59e0b",
    label: "SUPER STRIKER",
  },
};

export default function UserBadge({ badges = [], size = "sm" }: UserBadgeProps) {
  if (!badges || badges.length === 0) {
    return null;
  }

  const sizeMap = {
    sm: 12,
    md: 16,
    lg: 20,
  };

  const iconSize = sizeMap[size];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      {badges.map((badge) => {
        const config = BADGE_CONFIG[badge];
        if (!config) return null;

        const Icon = config.icon;

        return (
          <div
            key={badge}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              padding: "2px 6px",
              background: `${config.color}20`,
              borderRadius: 8,
              fontSize: 10,
              fontWeight: 600,
              color: config.color,
            }}
            title={config.label}
          >
            <Icon size={iconSize} color={config.color} />
            <span>{config.label}</span>
          </div>
        );
      })}
    </div>
  );
}
