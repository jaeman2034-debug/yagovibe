// src/components/home/ActionCard.tsx
// 🔥 블록2 운영 액션 공통 카드 (severity별 아이콘/색상 강화)

import { useEffect } from "react";
import type { OpsAction } from "@/hooks/useOpsActions";
import { AlertCircle, CheckCircle2, Info, Calendar, DollarSign, Users, FileText, Vote } from "lucide-react";
import { track } from "@/lib/analytics";
import { useTeam } from "@/context/TeamContext";

interface Props {
  action: OpsAction;
}

// 아이콘 매핑
const getIcon = (id: string) => {
  const iconMap: { [key: string]: React.ReactNode } = {
    UNPAID: <DollarSign size={20} />,
    ATTENDANCE: <CheckCircle2 size={20} />,
    NEXT_GAME: <Calendar size={20} />,
    SCHEDULE: <Calendar size={20} />,
    VOTES: <Vote size={20} />,
    AI_REPORT: <FileText size={20} />,
    TODO: <AlertCircle size={20} />,
  };
  return iconMap[id] || <Info size={20} />;
};

export default function ActionCard({ action }: Props) {
  const { myTeam } = useTeam();
  const base =
    "flex items-center justify-between w-full px-4 py-3 rounded-2xl shadow-sm cursor-pointer transition-all border";

  // 🔥 카드 노출 추적
  useEffect(() => {
    const severityMap: Record<string, "urgent" | "warn" | "info"> = {
      critical: "urgent",
      warning: "warn",
      info: "info",
    };

    track("hub_card_impression", {
      cardId: action.id,
      severity: severityMap[action.severity] || "info",
      page: "home",
      teamId: myTeam?.id,
    });
  }, [action.id, action.severity, myTeam?.id]);

  // 🔥 severity별 색상 강화 (모바일은 라이트 전용)
  const severityConfig =
    action.severity === "critical"
      ? {
          bg: "bg-red-50",
          border: "border-red-200",
          hover: "hover:bg-red-100",
          text: "text-red-900",
          iconColor: "text-red-600",
          buttonBg: "bg-red-100",
        }
      : action.severity === "warning"
      ? {
          bg: "bg-amber-50",
          border: "border-amber-200",
          hover: "hover:bg-amber-100",
          text: "text-amber-900",
          iconColor: "text-amber-600",
          buttonBg: "bg-amber-100",
        }
      : {
          bg: "bg-blue-50",
          border: "border-blue-200",
          hover: "hover:bg-blue-100",
          text: "text-blue-900",
          iconColor: "text-blue-600",
          buttonBg: "bg-blue-100",
        };

  const handleClick = () => {
    // 🔥 Analytics: 운영 카드 클릭 추적
    const severityMap: Record<string, "urgent" | "warn" | "info"> = {
      critical: "urgent",
      warning: "warn",
      info: "info",
    };

    // AI 리포트 카드인지 확인
    if (action.id === "AI_REPORT") {
      track("ai_report_card_click", {
        teamId: myTeam?.id,
      });
    } else {
      track("ops_card_click", {
        cardId: action.id,
        severity: severityMap[action.severity] || "info",
        teamId: myTeam?.id,
      });
    }

    // 원래 onClick 실행
    action.onClick();
  };

  return (
    <div
      className={`${base} ${severityConfig.bg} ${severityConfig.border} ${severityConfig.hover}`}
      onClick={handleClick}
    >
      <div className="flex items-center gap-3 flex-1">
        {/* 아이콘 */}
        <div className={`${severityConfig.iconColor} flex-shrink-0`}>
          {getIcon(action.id)}
        </div>
        {/* 텍스트 */}
        <div className="flex flex-col flex-1 min-w-0">
          <span className={`text-sm font-semibold ${severityConfig.text}`}>
            {action.title}
          </span>
          {action.subtitle && (
            <span className={`text-xs ${severityConfig.text} opacity-80 mt-1 truncate`}>
              {action.subtitle}
            </span>
          )}
        </div>
      </div>
      {/* CTA 버튼 */}
      <button
        className={`ml-4 px-3 py-1.5 text-xs font-medium ${severityConfig.buttonBg} ${severityConfig.text} rounded-full shadow-sm hover:opacity-90 transition-opacity flex-shrink-0`}
        onClick={(e) => {
          e.stopPropagation();
          action.onClick();
        }}
      >
        {action.ctaLabel}
      </button>
    </div>
  );
}


