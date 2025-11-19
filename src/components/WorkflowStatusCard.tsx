import React, { useEffect, useState } from "react";
import { collection, orderBy, limit, query, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, CheckCircle, AlertTriangle, Clock } from "lucide-react";

interface WorkflowLog {
  id: string;
  step: string;
  status: "success" | "error";
  durationMs: number;
  errorMessage?: string;
  metadata?: Record<string, any>;
  timestamp?: any;
  createdAt?: any;
}

export default function WorkflowStatusCard() {
  const [logs, setLogs] = useState<WorkflowLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "workflowLogs"), orderBy("timestamp", "desc"), limit(10));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as WorkflowLog[];
        setLogs(data);
        setLoading(false);
      },
      (error) => {
        console.error("워크플로우 로그 구독 오류:", error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return "날짜 없음";

    try {
      if (timestamp.toDate) {
        // Firestore Timestamp
        return timestamp.toDate().toLocaleString("ko-KR");
      } else if (timestamp.seconds) {
        // Timestamp 객체
        return new Date(timestamp.seconds * 1000).toLocaleString("ko-KR");
      } else if (typeof timestamp === "number") {
        // Unix timestamp (milliseconds)
        return new Date(timestamp).toLocaleString("ko-KR");
      } else {
        return "날짜 파싱 실패";
      }
    } catch (e) {
      return "날짜 오류";
    }
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}초`;
    return `${(ms / 60000).toFixed(1)}분`;
  };

  // 통계 계산
  const successCount = logs.filter((l) => l.status === "success").length;
  const errorCount = logs.filter((l) => l.status === "error").length;
  const avgDuration =
    logs.length > 0 ? logs.reduce((sum, l) => sum + l.durationMs, 0) / logs.length : 0;

  return (
    <Card className="border border-neutral-200 dark:border-gray-700 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
          <Activity className="h-5 w-5 text-emerald-500 dark:text-emerald-400" /> 워크플로우 상태
        </CardTitle>
        <CardDescription className="text-gray-600 dark:text-gray-400">
          최근 10개 실행 로그 · 성공: {successCount} · 실패: {errorCount} · 평균:{" "}
          {formatDuration(avgDuration)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <p className="text-sm text-neutral-500 dark:text-gray-400">기록된 실행 로그가 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className={`flex items-center justify-between py-2 px-3 rounded-lg border ${
                  log.status === "error"
                    ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                    : "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p
                      className={`font-medium text-sm ${
                        log.status === "error"
                          ? "text-red-700 dark:text-red-400"
                          : "text-emerald-700 dark:text-emerald-400"
                      }`}
                    >
                      {log.step}
                    </p>
                    {log.status === "error" ? (
                      <AlertTriangle className="h-4 w-4 text-red-500 dark:text-red-400 flex-shrink-0" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-gray-400">
                    {formatDate(log.timestamp || log.createdAt)}
                  </p>
                  {log.errorMessage && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1 truncate">
                      {log.errorMessage}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Clock className="h-3 w-3 text-neutral-400 dark:text-gray-500" />
                  <span className="text-xs text-neutral-600 dark:text-gray-300 whitespace-nowrap">
                    {formatDuration(log.durationMs)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

