/**
 * 🔥 감사 로그 조회 UX (L-5)
 * 
 * 엔터프라이즈 요구사항 충족:
 * - 날짜
 * - 액션
 * - 요약(summary)
 * - actor
 * - 필터: 기간 / 액션 타입 / actor
 * - 페이지네이션 필수
 */

import { useEffect, useState } from "react";
import type { QueryDocumentSnapshot } from "firebase/firestore";
import { collection, query, orderBy, limit, where, getDocs, Timestamp, startAfter } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Calendar, Filter, User, Search } from "lucide-react";

interface AuditLog {
  id: string;
  actorUid: string;
  actorRole?: string;
  teamId?: string;
  targetUid?: string;
  targetType?: "member" | "team" | "invite" | "plan" | "other";
  action: string;
  summary: string; // 🔥 자연어 설명
  metadata?: {
    before?: any;
    after?: any;
    [key: string]: any;
  };
  ua?: string;
  ipHash?: string;
  createdAt: Timestamp | Date;
}

const ACTIONS = [
  "team.create",
  "team.delete",
  "team.owner.transfer",
  "team.plan.change",
  "member.join",
  "member.leave",
  "member.remove",
  "member.role.change",
  "invite.create",
  "invite.use",
  "invite.revoke",
];

export default function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // 필터
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [teamIdFilter, setTeamIdFilter] = useState<string>("");
  const [actorFilter, setActorFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const PAGE_SIZE = 50;

  // 🔥 L-5: 감사 로그 조회 (페이지네이션)
  const fetchLogs = async (reset = false) => {
    try {
      setLoading(true);

      let q = query(
        collection(db, "auditLogs"),
        orderBy("createdAt", "desc"),
        limit(PAGE_SIZE)
      );

      // 필터 적용
      if (actionFilter !== "all") {
        q = query(q, where("action", "==", actionFilter));
      }
      if (teamIdFilter) {
        q = query(q, where("teamId", "==", teamIdFilter));
      }

      if (!reset && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setHasMore(false);
        return;
      }

      const logsList: AuditLog[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt || new Date(),
      } as AuditLog));

      // 클라이언트 필터링 (actor, 날짜)
      let filteredLogs = logsList;
      if (actorFilter) {
        filteredLogs = filteredLogs.filter((log) =>
          log.actorUid.toLowerCase().includes(actorFilter.toLowerCase())
        );
      }
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        filteredLogs = filteredLogs.filter((log) => {
          const logDate = log.createdAt instanceof Date ? log.createdAt : new Date(log.createdAt);
          return logDate >= fromDate;
        });
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        filteredLogs = filteredLogs.filter((log) => {
          const logDate = log.createdAt instanceof Date ? log.createdAt : new Date(log.createdAt);
          return logDate <= toDate;
        });
      }

      if (reset) {
        setLogs(filteredLogs);
      } else {
        setLogs((prev) => [...prev, ...filteredLogs]);
      }

      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (error) {
      console.error("❌ [AuditLogViewer] 조회 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(true);
  }, [actionFilter, teamIdFilter]);

  const formatDate = (date: Date | Timestamp) => {
    const d = date instanceof Date ? date : date.toDate();
    return d.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatAction = (action: string) => {
    const actionMap: Record<string, string> = {
      "team.create": "팀 생성",
      "team.delete": "팀 삭제",
      "team.owner.transfer": "Owner 이전",
      "team.plan.change": "플랜 변경",
      "member.join": "멤버 합류",
      "member.leave": "멤버 탈퇴",
      "member.remove": "멤버 강퇴",
      "member.role.change": "역할 변경",
      "invite.create": "초대 생성",
      "invite.use": "초대 사용",
      "invite.revoke": "초대 취소",
    };
    return actionMap[action] || action;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">감사 로그</h1>

        {/* 필터 */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                액션 타입
              </label>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="all">전체</option>
                {ACTIONS.map((action) => (
                  <option key={action} value={action}>
                    {formatAction(action)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                팀 ID
              </label>
              <input
                type="text"
                value={teamIdFilter}
                onChange={(e) => setTeamIdFilter(e.target.value)}
                placeholder="팀 ID 검색"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                행위자 (Actor)
              </label>
              <input
                type="text"
                value={actorFilter}
                onChange={(e) => setActorFilter(e.target.value)}
                placeholder="UID 검색"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  시작일
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  종료일
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          <button
            onClick={() => fetchLogs(true)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
          >
            필터 적용
          </button>
        </div>

        {/* 로그 목록 */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">로그 목록</h2>
          </div>

          {loading && logs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">불러오는 중...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">로그가 없습니다.</div>
          ) : (
            <div className="divide-y divide-gray-200">
              {logs.map((log) => (
                <div key={log.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                          {formatAction(log.action)}
                        </span>
                        <span className="text-sm text-gray-600">
                          {formatDate(log.createdAt)}
                        </span>
                      </div>

                      {/* 🔥 L-1: summary (자연어 설명) */}
                      <p className="text-sm text-gray-900 mb-2">{log.summary}</p>

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>Actor: {log.actorUid.slice(0, 8)}...</span>
                          {log.actorRole && (
                            <span className="text-gray-400">({log.actorRole})</span>
                          )}
                        </div>
                        {log.teamId && (
                          <span>Team: {log.teamId.slice(0, 8)}...</span>
                        )}
                        {log.targetUid && (
                          <span>Target: {log.targetUid.slice(0, 8)}...</span>
                        )}
                      </div>

                      {/* 메타데이터 (before/after) */}
                      {log.metadata && (log.metadata.before || log.metadata.after) && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-500 cursor-pointer">
                            변경 상세 보기
                          </summary>
                          <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                            {log.metadata.before && (
                              <div className="mb-2">
                                <strong>Before:</strong>
                                <pre className="mt-1 text-gray-700">
                                  {JSON.stringify(log.metadata.before, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.metadata.after && (
                              <div>
                                <strong>After:</strong>
                                <pre className="mt-1 text-gray-700">
                                  {JSON.stringify(log.metadata.after, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 페이지네이션 */}
          {hasMore && (
            <div className="p-4 border-t border-gray-200 text-center">
              <button
                onClick={() => fetchLogs(false)}
                disabled={loading}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 text-sm font-medium"
              >
                {loading ? "불러오는 중..." : "더 보기"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

