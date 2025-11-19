import React, { useEffect, useState } from "react";
import { collection, orderBy, query, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Star, ThumbsUp, AlertCircle, Lightbulb } from "lucide-react";

interface BetaFeedback {
  id: string;
  email?: string;
  user?: string;
  rating?: number;
  what?: string;
  issue?: string;
  idea?: string;
  source?: string;
  createdAt?: any;
  timestamp?: number;
}

export default function BetaFeedbackCard() {
  const [rows, setRows] = useState<BetaFeedback[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "betaFeedback"), orderBy("createdAt", "desc"), limit(20));

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as BetaFeedback[];
        setRows(data);
        setLoading(false);
      },
      (error) => {
        console.error("피드백 구독 오류:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
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

  const renderStars = (rating: number | null | undefined) => {
    if (!rating) return "-";
    return "★".repeat(Math.min(rating, 5)) + "☆".repeat(Math.max(0, 5 - rating));
  };

  return (
    <Card className="border border-neutral-200 dark:border-gray-700 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
          <MessageSquare className="h-5 w-5 text-purple-500 dark:text-purple-400" /> 베타 피드백
        </CardTitle>
        <CardDescription className="text-gray-600 dark:text-gray-400">
          최근 20개 피드백 (Slack + 웹)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageSquare className="h-8 w-8 text-neutral-400 dark:text-gray-500 mb-2" />
            <p className="text-sm text-neutral-500 dark:text-gray-400">피드백이 아직 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <div
                key={r.id}
                className="border border-neutral-200 dark:border-gray-700 rounded-lg p-3 bg-neutral-50 dark:bg-gray-800/50"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {r.rating !== null && r.rating !== undefined && (
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          {renderStars(r.rating)}
                        </span>
                      </div>
                    )}
                    <span className="text-xs text-neutral-500 dark:text-gray-400">
                      {r.user || r.email || "익명"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.source && (
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                        {r.source === "slack" ? "Slack" : "Web"}
                      </span>
                    )}
                    <span className="text-xs text-neutral-400 dark:text-gray-500">
                      {formatDate(r.createdAt || r.timestamp)}
                    </span>
                  </div>
                </div>

                {r.what && (
                  <div className="flex items-start gap-2 mt-2">
                    <ThumbsUp className="h-4 w-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-700 dark:text-gray-300 flex-1">{r.what}</p>
                  </div>
                )}

                {r.issue && (
                  <div className="flex items-start gap-2 mt-2">
                    <AlertCircle className="h-4 w-4 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-600 dark:text-red-400 flex-1">{r.issue}</p>
                  </div>
                )}

                {r.idea && (
                  <div className="flex items-start gap-2 mt-2">
                    <Lightbulb className="h-4 w-4 text-indigo-500 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-indigo-600 dark:text-indigo-400 flex-1">{r.idea}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

