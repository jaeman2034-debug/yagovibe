// src/pages/team/TeamAuditLogPage.tsx
// 🔥 레벨 2: 감사 로그 & 임원 변경 이력 (분쟁 방지)

import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTeam } from "@/context/TeamContext";
import { collection, query, orderBy, getDocs, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface AuditLog {
  id: string;
  actorId: string;
  actorName?: string;
  action: "ROLE_CHANGE" | "FEE_OVERRIDE" | "ATTENDANCE_PENALTY" | "STATUS_CHANGE" | "MEMBER_ADD" | "MEMBER_REMOVE";
  targetMemberId: string;
  targetMemberName?: string;
  before: any;
  after: any;
  reason?: string;
  createdAt: Date;
}

export default function TeamAuditLogPage() {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const { myTeam } = useTeam();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "ROLE_CHANGE" | "FEE_OVERRIDE" | "ATTENDANCE_PENALTY">("all");

  // 🔥 감사 로그 조회
  useEffect(() => {
    if (!myTeam?.id) return;

    const fetchLogs = async () => {
      try {
        const logsQuery = query(
          collection(db, "teams", myTeam.id, "auditLogs"),
          orderBy("createdAt", "desc"),
          limit(100)
        );
        const snapshot = await getDocs(logsQuery);
        const logsList: AuditLog[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          logsList.push({
            id: doc.id,
            actorId: data.actorId || "",
            actorName: data.actorName || "시스템",
            action: data.action || "STATUS_CHANGE",
            targetMemberId: data.targetMemberId || "",
            targetMemberName: data.targetMemberName || "",
            before: data.before || {},
            after: data.after || {},
            reason: data.reason,
            createdAt: data.createdAt?.toDate() || new Date(),
          });
        });
        setLogs(logsList);
      } catch (error) {
        console.error("감사 로그 조회 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [myTeam?.id]);

  const filteredLogs = logs.filter((log) => {
    if (filter === "all") return true;
    return log.action === filter;
  });

  const getActionLabel = (action: string) => {
    switch (action) {
      case "ROLE_CHANGE":
        return "역할 변경";
      case "FEE_OVERRIDE":
        return "회비 수동 변경";
      case "ATTENDANCE_PENALTY":
        return "출석 패널티";
      case "STATUS_CHANGE":
        return "상태 변경";
      case "MEMBER_ADD":
        return "회원 추가";
      case "MEMBER_REMOVE":
        return "회원 제거";
      default:
        return action;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-none md:mx-auto md:max-w-4xl py-6">
        <div className="mb-6">
          <button
            onClick={() => navigate(`/sports/${type}/team`)}
            className="text-blue-600 hover:text-blue-700 mb-4"
          >
            ← 뒤로
          </button>
          <h1 className="text-2xl font-bold text-gray-900">감사 로그</h1>
        </div>

        {/* 필터 */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1 rounded text-sm ${
                filter === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              전체
            </button>
            <button
              onClick={() => setFilter("ROLE_CHANGE")}
              className={`px-3 py-1 rounded text-sm ${
                filter === "ROLE_CHANGE"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              역할 변경
            </button>
            <button
              onClick={() => setFilter("FEE_OVERRIDE")}
              className={`px-3 py-1 rounded text-sm ${
                filter === "FEE_OVERRIDE"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              회비 변경
            </button>
            <button
              onClick={() => setFilter("ATTENDANCE_PENALTY")}
              className={`px-3 py-1 rounded text-sm ${
                filter === "ATTENDANCE_PENALTY"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              출석 패널티
            </button>
          </div>
        </div>

        {/* 로그 리스트 */}
        <div className="space-y-4">
          {filteredLogs.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <p className="text-gray-500">감사 로그가 없습니다.</p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                      {getActionLabel(log.action)}
                    </span>
                    {log.targetMemberName && (
                      <span className="ml-2 text-sm text-gray-600">
                        대상: {log.targetMemberName}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {log.createdAt.toLocaleString("ko-KR")}
                  </span>
                </div>

                {/* 변경 내용 */}
                <div className="mt-3 space-y-2">
                  {log.action === "ROLE_CHANGE" && (
                    <div className="text-sm">
                      <span className="text-gray-600">변경 전:</span>{" "}
                      <span className="font-medium">{log.before.role || "없음"}</span>
                      {" → "}
                      <span className="text-gray-600">변경 후:</span>{" "}
                      <span className="font-medium">{log.after.role || "없음"}</span>
                    </div>
                  )}

                  {log.action === "FEE_OVERRIDE" && (
                    <div className="text-sm">
                      <span className="text-gray-600">변경 전:</span>{" "}
                      <span className="font-medium">{log.before.feePlan || "없음"}</span>
                      {" → "}
                      <span className="text-gray-600">변경 후:</span>{" "}
                      <span className="font-medium">{log.after.feePlan || "없음"}</span>
                    </div>
                  )}

                  {log.action === "ATTENDANCE_PENALTY" && (
                    <div className="text-sm">
                      <span className="text-gray-600">패널티 점수:</span>{" "}
                      <span className="font-medium">{log.before.penaltyPoints || 0}</span>
                      {" → "}
                      <span className="font-medium">{log.after.penaltyPoints || 0}</span>
                      {log.reason && (
                        <span className="ml-2 text-gray-500">({log.reason})</span>
                      )}
                    </div>
                  )}

                  {log.reason && log.action !== "ATTENDANCE_PENALTY" && (
                    <p className="text-sm text-gray-500">사유: {log.reason}</p>
                  )}
                </div>

                <div className="mt-2 text-xs text-gray-400">
                  처리자: {log.actorName}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

