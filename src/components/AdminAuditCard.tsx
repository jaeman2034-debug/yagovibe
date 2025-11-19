import React, { useEffect, useState } from "react";
import { collection, orderBy, query, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield } from "lucide-react";

interface AuditLog {
  id: string;
  uid: string;
  email: string;
  displayName?: string;
  action: string;
  details?: string;
  metadata?: Record<string, any>;
  createdAt?: any;
  timestamp?: number;
}

export default function AdminAuditCard() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "auditLogs"), orderBy("createdAt", "desc"), limit(10));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as AuditLog[];

        setLogs(data);
        setLoading(false);
      },
      (error) => {
        console.error("Audit Log 구독 오류:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
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

  return (
    <Card className="border border-neutral-200 dark:border-gray-700 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
          <Shield className="h-5 w-5 text-indigo-500 dark:text-indigo-400" /> 관리자 활동 로그
        </CardTitle>
        <CardDescription className="text-gray-600 dark:text-gray-400">
          최근 10개의 관리자 활동 기록
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
          <p className="text-sm text-neutral-500 dark:text-gray-400">최근 활동 기록이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="border-b border-neutral-200 dark:border-gray-700 pb-3 last:border-0"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-gray-900 dark:text-white">
                        {log.displayName || log.email}
                      </span>
                      <span className="text-xs text-neutral-500 dark:text-gray-400">
                        ({log.email})
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{log.action}</p>
                    {log.details && (
                      <p className="text-xs text-neutral-500 dark:text-gray-400 mt-1">
                        {log.details}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-neutral-400 dark:text-gray-500 whitespace-nowrap">
                    {formatDate(log.createdAt || log.timestamp)}
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

