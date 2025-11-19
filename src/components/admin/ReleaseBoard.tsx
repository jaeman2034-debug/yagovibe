import React, { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, AlertTriangle, FileText, TrendingUp, Clock } from "lucide-react";

interface ReleaseCheck {
  total?: number;
  success?: number;
  errors?: number;
  errorRate?: string;
  successRate?: string;
  sloMet?: boolean;
  errorBudget?: string;
  errorBudgetUsed?: string;
  avgDuration?: number;
  recentErrors?: Array<{ step: string; errorMessage: string }>;
  checkedAt?: any;
  windowDays?: number;
  sloTarget?: number;
}

interface ReleaseNote {
  content?: string;
  version?: string;
  reportCount?: number;
  successCount?: number;
  errorCount?: number;
  avgRating?: string;
  generatedAt?: any;
  createdAt?: any;
}

export default function ReleaseBoard() {
  const [checkData, setCheckData] = useState<ReleaseCheck | null>(null);
  const [note, setNote] = useState<ReleaseNote | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let checkLoaded = false;
    let noteLoaded = false;

    const unsubscribeCheck = onSnapshot(
      doc(db, "releaseChecks", "latest"),
      (snap) => {
        if (snap.exists()) {
          setCheckData(snap.data() as ReleaseCheck);
        } else {
          setCheckData(null);
        }
        checkLoaded = true;
        if (checkLoaded && noteLoaded) {
          setLoading(false);
        }
      },
      (error) => {
        console.error("릴리즈 체크 구독 오류:", error);
        checkLoaded = true;
        if (checkLoaded && noteLoaded) {
          setLoading(false);
        }
      }
    );

    const unsubscribeNote = onSnapshot(
      doc(db, "releaseNotes", "latest"),
      (snap) => {
        if (snap.exists()) {
          setNote(snap.data() as ReleaseNote);
        } else {
          setNote(null);
        }
        noteLoaded = true;
        if (checkLoaded && noteLoaded) {
          setLoading(false);
        }
      },
      (error) => {
        console.error("릴리즈 노트 구독 오류:", error);
        noteLoaded = true;
        if (checkLoaded && noteLoaded) {
          setLoading(false);
        }
      }
    );

    return () => {
      unsubscribeCheck();
      unsubscribeNote();
    };
  }, []);

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return "날짜 없음";

    try {
      if (timestamp.toDate) {
        return timestamp.toDate().toLocaleString("ko-KR");
      } else if (timestamp.seconds) {
        return new Date(timestamp.seconds * 1000).toLocaleString("ko-KR");
      } else if (typeof timestamp === "number") {
        return new Date(timestamp).toLocaleString("ko-KR");
      }
      return "날짜 파싱 실패";
    } catch (e) {
      return "날짜 오류";
    }
  };

  const errorRateNum = checkData?.errorRate ? parseFloat(checkData.errorRate) : 0;
  const errorBudgetUsedNum = checkData?.errorBudgetUsed ? parseFloat(checkData.errorBudgetUsed) : 0;

  return (
    <Card className="border border-neutral-200 dark:border-gray-700 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
          <FileText className="h-5 w-5 text-indigo-500 dark:text-indigo-400" /> 정식 릴리즈 상태
        </CardTitle>
        <CardDescription className="text-gray-600 dark:text-gray-400">
          에러 버짓 · SLO 준수율 및 최근 릴리즈 노트
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : !checkData && !note ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileText className="h-8 w-8 text-neutral-400 dark:text-gray-500 mb-2" />
            <p className="text-sm text-neutral-500 dark:text-gray-400">
              릴리즈 체크 데이터가 없습니다.
            </p>
            <p className="text-xs text-neutral-400 dark:text-gray-500 mt-1">
              매주 월요일 10:00에 자동으로 생성됩니다.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* SLO 및 통계 */}
            {checkData && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-neutral-50 dark:bg-gray-800 rounded-lg p-4 text-center border border-neutral-200 dark:border-gray-700">
                    <p className="text-xs text-neutral-500 dark:text-gray-400 mb-1 flex items-center justify-center gap-1">
                      <TrendingUp className="h-3 w-3" /> 총 실행
                    </p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {checkData.total || 0}
                    </p>
                  </div>

                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-center border border-red-200 dark:border-red-800">
                    <p className="text-xs text-neutral-500 dark:text-gray-400 mb-1 flex items-center justify-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> 오류
                    </p>
                    <p className="text-xl font-bold text-red-600 dark:text-red-400">
                      {checkData.errors || 0}
                    </p>
                  </div>

                  <div
                    className={`rounded-lg p-4 text-center border ${
                      errorRateNum <= 1
                        ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
                        : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                    }`}
                  >
                    <p className="text-xs text-neutral-500 dark:text-gray-400 mb-1">오류율</p>
                    <p
                      className={`text-xl font-bold ${
                        errorRateNum <= 1
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {checkData.errorRate || "0.00"}%
                    </p>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center border border-blue-200 dark:border-blue-800">
                    <p className="text-xs text-neutral-500 dark:text-gray-400 mb-1 flex items-center justify-center gap-1">
                      <Clock className="h-3 w-3" /> SLO 충족
                    </p>
                    {checkData.sloMet ? (
                      <CheckCircle className="mx-auto text-emerald-500 dark:text-emerald-400 h-6 w-6" />
                    ) : (
                      <AlertTriangle className="mx-auto text-red-500 dark:text-red-400 h-6 w-6" />
                    )}
                  </div>
                </div>

                {/* 에러 버짓 */}
                {checkData.errorBudgetUsed && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-gray-400">
                      <span>에러 버짓 사용률</span>
                      <span>{checkData.errorBudgetUsed}%</span>
                    </div>
                    <div className="w-full bg-neutral-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          errorBudgetUsedNum < 50
                            ? "bg-emerald-500"
                            : errorBudgetUsedNum < 80
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                        style={{
                          width: `${Math.min(parseFloat(checkData.errorBudgetUsed || "0"), 100)}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-gray-400">
                      목표: {checkData.sloTarget || 1}% 이하 | 남은 버짓: {checkData.errorBudget || "0.00"}%
                    </p>
                  </div>
                )}

                {/* 최근 오류 */}
                {checkData.recentErrors && checkData.recentErrors.length > 0 && (
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <p className="font-semibold text-sm flex items-center gap-2 mb-2 text-red-700 dark:text-red-400">
                      <AlertTriangle className="h-4 w-4" /> 최근 오류 (상위 5개)
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-xs text-red-600 dark:text-red-400">
                      {checkData.recentErrors.map((e, i) => (
                        <li key={i} className="truncate">
                          [{e.step}] {e.errorMessage}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 체크 시간 */}
                {checkData.checkedAt && (
                  <p className="text-xs text-neutral-400 dark:text-gray-500 text-center">
                    체크 시간: {formatDate(checkData.checkedAt)} | 기준 기간: 최근{" "}
                    {checkData.windowDays || 7}일
                  </p>
                )}
              </div>
            )}

            {/* 릴리즈 노트 */}
            <div className="border-t border-neutral-200 dark:border-gray-700 pt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-sm flex items-center gap-2 text-gray-900 dark:text-white">
                  <FileText className="h-4 w-4" /> 릴리즈 노트
                  {note?.version && (
                    <span className="text-xs px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400">
                      {note.version}
                    </span>
                  )}
                </p>
                {note?.generatedAt && (
                  <span className="text-xs text-neutral-400 dark:text-gray-500">
                    {formatDate(note.generatedAt)}
                  </span>
                )}
              </div>
              {note?.content ? (
                <div className="mt-2 p-4 bg-neutral-50 dark:bg-gray-800 rounded-lg border border-neutral-200 dark:border-gray-700">
                  <pre className="text-sm whitespace-pre-wrap leading-relaxed text-gray-700 dark:text-gray-300 max-h-64 overflow-y-auto font-sans">
                    {note.content}
                  </pre>
                </div>
              ) : (
                <p className="text-sm text-neutral-500 dark:text-gray-400 mt-2">
                  릴리즈 노트가 아직 없습니다.
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

