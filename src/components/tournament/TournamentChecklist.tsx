/**
 * 🔥 운영 체크리스트 컴포넌트
 * Step 1: 운영 체크리스트 자동화
 */

import React from "react";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import type { TournamentChecklist } from "@/lib/tournament/checklistRepository";

interface TournamentChecklistProps {
  checklist: TournamentChecklist;
  compact?: boolean;
}

function ChecklistItem({
  label,
  ok,
  message,
}: {
  label: string;
  ok: boolean;
  message: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {ok ? (
        <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
      ) : (
        <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
      )}
      <span className={ok ? "text-gray-700" : "font-semibold text-yellow-700"}>
        {label}
      </span>
      {!ok && message && (
        <span className="text-xs text-muted-foreground">({message})</span>
      )}
    </div>
  );
}

export function TournamentChecklist({
  checklist,
  compact = false,
}: TournamentChecklistProps) {
  if (compact) {
    // 컴팩트 모드: 대회 카드용
    return (
      <div className="space-y-1.5">
        {checklist.items.map((item) => (
          <ChecklistItem
            key={item.id}
            label={item.label}
            ok={item.status === "ok"}
            message={item.status === "ok" ? "" : item.message}
          />
        ))}
      </div>
    );
  }

  // 전체 모드: 상세 화면용
  return (
    <div className="space-y-2">
      {checklist.items.map((item) => {
        const Icon =
          item.status === "ok"
            ? CheckCircle2
            : item.status === "warning"
            ? AlertCircle
            : XCircle;

        const bgColor =
          item.status === "ok"
            ? "bg-green-50 border-green-200"
            : item.status === "warning"
            ? "bg-yellow-50 border-yellow-200"
            : "bg-red-50 border-red-200";

        const iconColor =
          item.status === "ok"
            ? "text-green-600"
            : item.status === "warning"
            ? "text-yellow-600"
            : "text-red-600";

        const textColor =
          item.status === "ok"
            ? "text-green-900"
            : item.status === "warning"
            ? "text-yellow-900"
            : "text-red-900";

        return (
          <div
            key={item.id}
            className={`flex items-center gap-3 p-3 rounded-lg border ${bgColor}`}
          >
            <Icon className={`w-5 h-5 ${iconColor} flex-shrink-0`} />
            <div className="flex-1">
              <div className={`font-medium ${textColor}`}>{item.label}</div>
              <div className={`text-sm ${textColor} opacity-80`}>
                {item.message}
              </div>
            </div>
            {item.count !== undefined && item.count > 0 && (
              <div
                className={`px-2 py-1 rounded text-xs font-semibold ${
                  item.status === "ok"
                    ? "bg-green-200 text-green-800"
                    : item.status === "warning"
                    ? "bg-yellow-200 text-yellow-800"
                    : "bg-red-200 text-red-800"
                }`}
              >
                {item.count}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

