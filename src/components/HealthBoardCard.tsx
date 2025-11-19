import React, { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, AlertTriangle, CheckCircle, Clock, XCircle } from "lucide-react";

interface WorkflowStats {
  week?: string;
  total?: number;
  success?: number;
  error?: number;
  successRate?: string;
  avgDuration?: number;
  topErrors?: string[];
  generatedAt?: any;
  createdAt?: any;
}

export default function HealthBoardCard() {
  const [stats, setStats] = useState<WorkflowStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "workflowStats", "weekly"),
      (snap) => {
        if (snap.exists()) {
          setStats(snap.data() as WorkflowStats);
        } else {
          setStats(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error("헬스보드 구독 오류:", error);
        setStats(null);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return "날짜 없음";

    try {
      if (timestamp.toDate) {
        const d = timestamp.toDate();
        return `${d.getFullYear()}년 ${String(d.getMonth() + 1).padStart(2, "0")}월 ${String(d.getDate()).padStart(2, "0")}일`;
      } else if (timestamp.seconds) {
        const d = new Date(timestamp.seconds * 1000);
        return `${d.getFullYear()}년 ${String(d.getMonth() + 1).padStart(2, "0")}월 ${String(d.getDate()).padStart(2, "0")}일`;
      } else if (typeof timestamp === "number") {
        const d = new Date(timestamp);
        return `${d.getFullYear()}년 ${String(d.getMonth() + 1).padStart(2, "0")}월 ${String(d.getDate()).padStart(2, "0")}일`;
      }
      return "날짜 파싱 실패";
    } catch (e) {
      return "날짜 오류";
    }
  };

  const successRateNum = stats?.successRate ? parseFloat(stats.successRate) : 0;
  const successRateColor =
    successRateNum >= 95 ? "text-emerald-600 dark:text-emerald-400" : successRateNum >= 80 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400";

  return (
    <Card className="border border-neutral-200 dark:border-gray-700 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
          <Activity className="h-5 w-5 text-emerald-500 dark:text-emerald-400" /> AI 리포트 헬스보드
        </CardTitle>
        <CardDescription className="text-gray-600 dark:text-gray-400">
          Functions 실행 통계 및 오류 현황 {stats?.week && `(${stats.week} 기준)`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : !stats ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Activity className="h-8 w-8 text-neutral-400 dark:text-gray-500 mb-2" />
            <p className="text-sm text-neutral-500 dark:text-gray-400">
              헬스보드 데이터가 없습니다.
            </p>
            <p className="text-xs text-neutral-400 dark:text-gray-500 mt-1">
              매주 월요일 08:00에 자동으로 생성됩니다.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 통계 카드 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-neutral-50 dark:bg-gray-800 rounded-lg p-4 text-center border border-neutral-200 dark:border-gray-700">
                <p className="text-xs text-neutral-500 dark:text-gray-400 mb-1 flex items-center justify-center gap-1">
                  <Activity className="h-3 w-3" /> 총 실행
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total || 0}</p>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4 text-center border border-emerald-200 dark:border-emerald-800">
                <p className="text-xs text-neutral-500 dark:text-gray-400 mb-1 flex items-center justify-center gap-1">
                  <CheckCircle className="h-3 w-3" /> 성공률
                </p>
                <p className={`text-2xl font-bold ${successRateColor}`}>
                  {stats.successRate || "0.0"}%
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-neutral-500 dark:text-gray-400 mb-1 flex items-center justify-center gap-1">
                  <Clock className="h-3 w-3" /> 평균 지연
                </p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {stats.avgDuration ? `${Math.round(stats.avgDuration)}ms` : "-"}
                </p>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-center border border-red-200 dark:border-red-800">
                <p className="text-xs text-neutral-500 dark:text-gray-400 mb-1 flex items-center justify-center gap-1">
                  <XCircle className="h-3 w-3" /> 오류
                </p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {stats.error || 0}
                </p>
              </div>
            </div>

            {/* 성공/실패 비율 */}
            {stats.total && stats.total > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-gray-400">
                  <span>성공</span>
                  <span>{stats.success || 0} / {stats.total}</span>
                </div>
                <div className="w-full bg-neutral-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${((stats.success || 0) / stats.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* 주요 오류 */}
            {stats.topErrors && stats.topErrors.length > 0 && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <p className="font-semibold text-sm flex items-center gap-2 mb-2 text-red-700 dark:text-red-400">
                  <AlertTriangle className="h-4 w-4" /> 주요 오류 (최근 3건)
                </p>
                <ul className="list-disc list-inside space-y-1 text-xs text-red-600 dark:text-red-400">
                  {stats.topErrors.map((e: string, i: number) => (
                    <li key={i} className="truncate">{e}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* 생성 일시 */}
            {stats.generatedAt || stats.createdAt ? (
              <p className="text-xs text-neutral-400 dark:text-gray-500 text-center">
                생성일: {formatDate(stats.generatedAt || stats.createdAt)}
              </p>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

