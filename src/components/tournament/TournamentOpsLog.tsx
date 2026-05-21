/**
 * 🔥 운영 로그 컴포넌트
 * 누가 / 언제 / 무엇을 실행했는지 기록
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, User, Activity } from "lucide-react";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useState, useEffect } from "react";

interface TournamentOpsLogProps {
  associationId: string;
  tournamentId: string;
}

interface LogEntry {
  id: string;
  action: string;
  executor: string;
  executorName?: string;
  timestamp: Date;
  details?: string;
}

export function TournamentOpsLog({
  associationId,
  tournamentId,
}: TournamentOpsLogProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 🔥 가드: associationId, tournamentId 확인
    if (!associationId || !tournamentId) {
      setLoading(false);
      return;
    }
    
    const loadLogs = async () => {
      try {
        const logEntries: LogEntry[] = [];

        // 🔥 opsLogs 컬렉션에서 운영 로그 조회
        const opsLogsRef = collection(
          db,
          `associations/${associationId}/tournaments/${tournamentId}/opsLogs`
        );
        const opsLogsQuery = query(opsLogsRef, orderBy("timestamp", "desc"), limit(20));
        const opsLogsSnap = await getDocs(opsLogsQuery);

        opsLogsSnap.docs.forEach((doc) => {
          const data = doc.data();
          if (data.timestamp) {
            logEntries.push({
              id: doc.id,
              action: data.action || "작업 실행",
              executor: data.executorName || data.executor || "시스템",
              timestamp: data.timestamp.toDate(),
              details: data.details || "",
            });
          }
        });

        // 최신순 정렬 (이미 orderBy로 정렬되었지만 안전을 위해)
        logEntries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        setLogs(logEntries);
      } catch (error) {
        console.error("운영 로그 로드 오류:", error);
        // opsLogs 컬렉션이 없거나 인덱스가 없을 수 있으므로 에러는 무시
      } finally {
        setLoading(false);
      }
    };

    loadLogs();
  }, [associationId, tournamentId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-gray-500">로그를 불러오는 중...</p>
        </CardContent>
      </Card>
    );
  }

  if (logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">운영 로그</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 text-center py-4">
            아직 실행된 작업이 없습니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="w-5 h-5" />
          운영 로그
        </CardTitle>
        <p className="text-sm text-gray-600 mt-1">
          대회 운영 중 실행된 작업 내역입니다.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {logs.map((log) => (
            <div
              key={log.id}
              className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <Activity className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm text-gray-900 mb-1">
                    {log.action}
                  </div>
                  {log.details && (
                    <div className="text-sm text-gray-600 mb-2">
                      {log.details}
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span>{log.executor}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{log.timestamp.toLocaleString("ko-KR")}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

