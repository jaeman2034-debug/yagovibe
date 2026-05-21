/**
 * 🔥 ActivityLogSection - 활동 로그 섹션 (STEP: 알림 히스토리 & 활동 로그)
 * 
 * 위치: /me/records 하단 또는 /me/activity
 * 
 * 규칙:
 * - 절대 삭제 ❌
 * - 시간이 쌓일수록 가치 증가
 * - 시즌별 그룹핑 가능
 */

import { useActivityLogs } from "@/hooks/useActivityLogs";
import { safeToDate } from "@/utils/dateUtils";
import { Calendar, Trophy, Users, Award } from "lucide-react";

interface ActivityLogSectionProps {
  seasonId?: string | null; // 시즌 필터 (optional)
}

export function ActivityLogSection({ seasonId }: ActivityLogSectionProps) {
  const { logs, loading } = useActivityLogs({ enabled: true, seasonId });

  if (loading) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-sm text-gray-500">로딩 중...</p>
      </div>
    );
  }

  // 로그 0개면 아무것도 안 보여준다 (EmptyState ❌)
  if (logs.length === 0) {
    return null;
  }

  // 날짜별 그룹핑
  const groupedLogs = logs.reduce((acc, log) => {
    const date = log.createdAt ? safeToDate(log.createdAt) : null;
    const dateKey = date
      ? `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}`
      : "날짜 없음";

    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(log);
    return acc;
  }, {} as Record<string, typeof logs>);

  const getActionIcon = (category: string, action: string) => {
    if (category === "TEAM") {
      return <Users className="w-4 h-4 text-blue-500" />;
    }
    if (category === "TOURNAMENT") {
      return <Trophy className="w-4 h-4 text-purple-500" />;
    }
    if (category === "RESULT") {
      return <Award className="w-4 h-4 text-yellow-500" />;
    }
    return <Calendar className="w-4 h-4 text-gray-400" />;
  };

  const getActionText = (action: string, context: any) => {
    const actionMap: Record<string, string> = {
      JOINED_TEAM: "팀 가입",
      LEFT_TEAM: "팀 탈퇴",
      PLACED_1: "1위 기록",
      PLACED_2: "2위 기록",
      PLACED_3: "3위 기록",
      PLACED_4: "4위 기록",
      PLACED_5: "5위 기록",
      TOURNAMENT_APPLIED: "대회 참가 신청",
      TOURNAMENT_APPROVED: "대회 참가 승인",
      TEAM_ENTERED_TOURNAMENT: "대회 참가",
      TOURNAMENT_RESULT_RECORDED: context?.resultText || "대회 결과 기록",
    };
    
    // PLACED_{rank} 패턴 처리
    if (action.startsWith("PLACED_")) {
      const rank = action.replace("PLACED_", "");
      return `${rank}위 기록`;
    }
    
    return actionMap[action] || action;
  };

  return (
    <div className="px-4 py-4 space-y-6">
      {Object.entries(groupedLogs).map(([dateKey, dateLogs]) => (
        <div key={dateKey}>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700">{dateKey}</h3>
          </div>
          <div className="space-y-2 ml-6">
            {dateLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center gap-2 text-sm text-gray-600"
              >
                {getActionIcon(log.category, log.action)}
                <span>{getActionText(log.action, log.context)}</span>
                {log.context.teamId && (
                  <span className="text-xs text-gray-400">
                    (팀: {log.context.teamId.slice(0, 8)}...)
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
