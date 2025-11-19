import React, { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Sparkles, AlertCircle, Volume2, ExternalLink, FileText } from "lucide-react";

interface WeeklyInsight {
  content?: string;
  ttsUrl?: string;
  pdfUrl?: string;
  generatedAt?: any;
  reportCount?: number;
  createdAt?: any;
}

export default function AIAutoInsightCard() {
  const [insight, setInsight] = useState<WeeklyInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const functionsOrigin =
        import.meta.env.VITE_FUNCTIONS_ORIGIN ||
        "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";

      const response = await fetch(`${functionsOrigin}/generateWeeklyInsight`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`인사이트 생성 실패: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.ok) {
        alert("✅ AI 주간 인사이트 생성 완료! TTS 음성도 자동으로 생성됩니다.");
      } else {
        alert(`⚠️ 인사이트 생성 실패: ${data.error || "알 수 없는 오류"}`);
      }
    } catch (error: any) {
      console.error("인사이트 생성 오류:", error);
      alert(`오류 발생: ${error.message || "알 수 없는 오류"}`);
    } finally {
      setGenerating(false);
    }
  };

  // Firestore 실시간 구독
  useEffect(() => {
    setLoading(true);
    const unsubscribe = onSnapshot(
      doc(db, "insights", "weekly"),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as WeeklyInsight;
          setInsight(data);
        } else {
          setInsight(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error("인사이트 구독 오류:", error);
        setInsight(null);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // JSON 파싱 시도
  const parseContent = (content: string | undefined) => {
    if (!content) return null;

    try {
      // JSON 형식인지 확인
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          trends: parsed.trends || "",
          keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
          predictions: Array.isArray(parsed.predictions) ? parsed.predictions : [],
        };
      }
    } catch (e) {
      // JSON 파싱 실패 시 원본 텍스트 반환
    }

    return null;
  };

  const parsed = parseContent(insight?.content);
  const dateStr = insight?.generatedAt?.toDate
    ? (() => {
        const d = insight.generatedAt.toDate();
        return `${d.getFullYear()}년 ${String(d.getMonth() + 1).padStart(2, "0")}월 ${String(d.getDate()).padStart(2, "0")}일 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      })()
    : insight?.createdAt?.toDate
    ? (() => {
        const d = insight.createdAt.toDate();
        return `${d.getFullYear()}년 ${String(d.getMonth() + 1).padStart(2, "0")}월 ${String(d.getDate()).padStart(2, "0")}일 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      })()
    : null;

  return (
    <Card className="border border-neutral-200 dark:border-gray-700 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
          <Sparkles className="h-5 w-5 text-amber-500 dark:text-amber-400" /> AI 주간 인사이트
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            disabled={generating}
            className="text-xs"
          >
            {generating ? (
              <>
                <RefreshCcw className="h-3 w-3 mr-1 animate-spin" /> 생성 중...
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3 mr-1" /> 생성
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-32 w-full" />
        ) : insight?.content ? (
          <div className="space-y-4">
            {dateStr && (
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-neutral-500 dark:text-gray-400">
                  생성일: {dateStr}
                  {insight.reportCount !== undefined && ` · 리포트 ${insight.reportCount}개 분석`}
                </p>
                <div className="flex items-center gap-2">
                  {insight.ttsUrl && (
                    <>
                      <a
                        href={insight.ttsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                      >
                        <Volume2 className="h-3 w-3" /> 음성 듣기
                      </a>
                      <a
                        href={insight.ttsUrl}
                        download
                        className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                        title="MP3 다운로드"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </>
                  )}
                  {insight.pdfUrl && (
                    <a
                      href={insight.pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                    >
                      <FileText className="h-3 w-3" /> PDF 보기
                    </a>
                  )}
                </div>
              </div>
            )}

            {parsed ? (
              <div className="space-y-4 text-sm">
                {parsed.trends && (
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">📈 주요 트렌드</h4>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {parsed.trends}
                    </p>
                  </div>
                )}

                {parsed.keywords && parsed.keywords.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">🔑 주요 키워드</h4>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                      {parsed.keywords.map((kw: string, idx: number) => (
                        <li key={idx}>{kw}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {parsed.predictions && parsed.predictions.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">🔮 예측 포인트</h4>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                      {parsed.predictions.map((pred: string, idx: number) => (
                        <li key={idx}>{pred}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <pre className="text-sm whitespace-pre-wrap leading-relaxed text-gray-700 dark:text-gray-300 font-sans">
                {insight.content}
              </pre>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-8 w-8 text-neutral-400 dark:text-gray-500 mb-2" />
            <p className="text-sm text-neutral-500 dark:text-gray-400 mb-4">
              AI 인사이트가 아직 생성되지 않았습니다.
            </p>
            <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generating}>
              {generating ? (
                <>
                  <RefreshCcw className="h-3 w-3 mr-1 animate-spin" /> 생성 중...
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3 mr-1" /> 인사이트 생성하기
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

