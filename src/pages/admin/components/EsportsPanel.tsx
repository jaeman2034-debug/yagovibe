import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardSummary, getDashboardHealth, getDashboardStories } from "../api/adminApi";

export default function EsportsPanel() {
  const [summary, setSummary] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [stories, setStories] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getDashboardSummary(),
      getDashboardHealth(),
      getDashboardStories(),
    ])
      .then(([s, h, st]) => {
        setSummary(s);
        setHealth(h);
        setStories(st);
        setError(null); // 성공 시 에러 초기화
      })
      .catch((e) => {
        console.error("❌ [EsportsPanel] API 호출 실패:", e);
        setError(e.message || "데이터를 불러오는데 실패했습니다.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>🎮 e스포츠 관제</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            데이터를 불러오는 중...
          </div>
        )}

        {error && (
          <div className="text-red-600 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-200 dark:border-red-800">
            ⚠️ API 오류: {error}
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-2xl font-bold">
              {stories?.summary?.total ?? 0}
            </div>
            <div className="text-sm text-muted-foreground">스토리 수</div>
            {stories?.summary && (
              <div className="text-xs text-muted-foreground mt-1">
                발행: {stories.summary.PUBLISHED ?? 0} | 초안: {stories.summary.DRAFT ?? 0}
              </div>
            )}
          </div>

          <div>
            <div className="text-2xl font-bold">
              {health?.storyFillRate !== undefined 
                ? `${(health.storyFillRate * 100).toFixed(0)}%` 
                : "-"}
            </div>
            <div className="text-sm text-muted-foreground">채움률</div>
            {health?.activeStories !== undefined && (
              <div className="text-xs text-muted-foreground mt-1">
                활성: {health.activeStories}개
              </div>
            )}
          </div>

          <div>
            <div className="text-2xl font-bold">
              {summary?.risk?.currentCtr !== undefined
                ? `${(summary.risk.currentCtr * 100).toFixed(2)}%`
                : "-"}
            </div>
            <div className="text-sm text-muted-foreground">CTR</div>
            {summary?.risk?.isLowCtr !== undefined && (
              <div className={`text-xs mt-1 ${
                summary.risk.isLowCtr ? "text-red-600" : "text-green-600"
              }`}>
                {summary.risk.isLowCtr ? "⚠️ 낮은 CTR" : "✅ 정상"}
              </div>
            )}
          </div>
        </div>
        )}

        {/* 추가 정보 (데이터 있을 때만 표시) */}
        {!loading && !error && summary && (
          <div className="grid grid-cols-2 gap-3 pt-2 border-t">
            <div className="text-xs text-muted-foreground">
              API 에러: <span className="font-semibold">{summary.risk?.apiError ?? 0}건</span>
            </div>
            <div className="text-xs text-muted-foreground">
              낮은 CTR 스토리: <span className="font-semibold">{summary.risk?.lowCtrStories?.length ?? 0}개</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
