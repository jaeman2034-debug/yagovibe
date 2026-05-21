/**
 * 🔥 AuditLogList - 감사 로그 목록
 * 
 * 최근 20개 조회
 * 
 * UI 원칙:
 * - 문장 ❌
 * - 액션명 + 대상 + 시간
 * - 클릭 시 meta 펼침
 */

import { useEffect, useState } from "react";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AuditLog } from "@/types/audit";
import { Clock, User, Target } from "lucide-react";

export function AuditLogList({ teamId }: { teamId: string }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const auditLogsRef = collection(db, `teams/${teamId}/auditLogs`);
        const q = query(auditLogsRef, orderBy("createdAt", "desc"), limit(20));
        const snapshot = await getDocs(q);

        const logsList: AuditLog[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as AuditLog));

        setLogs(logsList);
      } catch (error) {
        console.error("❌ [AuditLogList] 조회 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [teamId]);

  const formatAction = (action: string) => {
    const actionMap: Record<string, string> = {
      TEAM_CREATED: "팀 생성",
      TEAM_UPDATED: "팀 수정",
      MEMBER_ADDED: "멤버 추가",
      MEMBER_REMOVED: "멤버 제거",
      ROLE_CHANGED: "역할 변경",
      PLAN_CHANGED: "플랜 변경",
      LOGIN: "로그인",
      LOGOUT: "로그아웃",
      SETTINGS_UPDATED: "설정 변경",
      FEE_CREATED: "회비 생성",
      FEE_PAID: "회비 납부",
      ATTENDANCE_RECORDED: "출석 기록",
      REPORT_GENERATED: "리포트 생성",
    };
    return actionMap[action] || action;
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return "-";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "방금 전";
      if (diffMins < 60) return `${diffMins}분 전`;
      if (diffHours < 24) return `${diffHours}시간 전`;
      if (diffDays < 7) return `${diffDays}일 전`;
      
      return date.toLocaleDateString("ko-KR", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "-";
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        최근 활동 (감사 로그)
      </h2>

      <div className="space-y-2">
        {logs.length === 0 ? (
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">
            활동 기록이 없습니다
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
              onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatAction(log.action)}
                    </span>
                    {log.targetUid && (
                      <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                        <Target className="w-3 h-3" />
                        <span className="text-xs">{log.targetUid.slice(0, 8)}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span className="text-xs">{log.actorUid.slice(0, 8)}</span>
                      <span className="text-xs text-gray-500">({log.actorRole})</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatTime(log.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 메타 데이터 펼침 */}
              {expandedLog === log.id && log.meta && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">상세 정보</div>
                  <pre className="text-xs bg-gray-50 dark:bg-gray-900 p-2 rounded overflow-auto">
                    {JSON.stringify(log.meta, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
