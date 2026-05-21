/**
 * 🔥 관리자 로그 뷰 컴포넌트
 * Step 3: 관리자 로그 뷰 (Audit / Timeline)
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, UserCheck, AlertTriangle, FileText } from "lucide-react";
import type { AuditLog } from "@/types/auditLog";

function renderLabel(log: AuditLog): { label: string; icon: React.ReactNode; color: string } {
  switch (log.type) {
    case "CHECKIN":
      return {
        label: `선수 검인 (${log.playerId})`,
        icon: <UserCheck className="w-4 h-4" />,
        color: "text-blue-600",
      };
    case "CARD":
      const cardLabel = `${log.cardType === "RED" ? "퇴장" : "경고"} (${log.playerId}) ${log.minute}분`;
      return {
        label: cardLabel,
        icon: <AlertTriangle className="w-4 h-4" />,
        color: log.cardType === "RED" ? "text-red-600" : "text-yellow-600",
      };
    case "MEMO":
      return {
        label: `메모: ${log.text.length > 50 ? log.text.substring(0, 50) + "..." : log.text}`,
        icon: <FileText className="w-4 h-4" />,
        color: "text-gray-600",
      };
  }
}

interface AuditLogTimelineProps {
  logs: AuditLog[];
  title?: string;
}

export function AuditLogTimeline({ logs, title = "경기 로그 타임라인" }: AuditLogTimelineProps) {
  if (logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground text-center py-4">
            아직 로그가 없습니다.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Clock className="w-4 h-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {logs.map((log, i) => {
          const { label, icon, color } = renderLabel(log);
          const timeStr = log.at.toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });
          const dateStr = log.at.toLocaleDateString("ko-KR", {
            month: "2-digit",
            day: "2-digit",
          });

          return (
            <div
              key={i}
              className="flex items-start gap-3 text-sm border-l-2 border-gray-200 pl-3 py-2"
            >
              <div className="flex-shrink-0 w-[100px] text-xs text-muted-foreground">
                {dateStr} {timeStr}
              </div>
              <div className={`flex-shrink-0 ${color}`}>{icon}</div>
              <Badge
                variant="outline"
                className="flex-shrink-0 text-xs"
              >
                {log.type}
              </Badge>
              <div className="flex-1 min-w-0">
                <span className={color}>{label}</span>
              </div>
              <div className="flex-shrink-0 text-xs text-muted-foreground font-mono">
                {log.actorId.substring(0, 8)}...
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

