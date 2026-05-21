/**
 * 🔥 플랫폼 활동 패널 - 관리자 대시보드
 * 
 * 목적: "오늘 야고가 실제로 살아있는지" 한눈에 확인
 * 
 * CTR과 완전히 분리된 레이어:
 * - CTR: 콘텐츠 반응 지표 (story_impression, story_click)
 * - ActivityLog: 플랫폼 생존 지표 (페이지뷰, 기능 사용, 팀 활동 등)
 */

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardActivity, type DashboardActivity } from "../api/adminApi";
import { AlertCircle, TrendingUp, Users, MousePointerClick } from "lucide-react";

export default function ActivityPanel() {
  const [activity, setActivity] = useState<DashboardActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getDashboardActivity();
        setActivity(data);
      } catch (err) {
        console.error("❌ [ActivityPanel] 데이터 로드 실패:", err);
        setError(err instanceof Error ? err.message : "데이터를 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>📊 플랫폼 활동</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground text-sm">
            데이터를 불러오는 중...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>📊 플랫폼 활동</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-600 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-200 dark:border-red-800">
            ⚠️ API 오류: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!activity) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          플랫폼 활동
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 기본 활동 지표 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border p-4">
            <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
              <Users className="h-3 w-3" />
              오늘 활성 유저
            </div>
            <div className="text-2xl font-bold">{activity.summary.dau}</div>
            <div className="text-xs text-muted-foreground mt-1">DAU</div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
              <MousePointerClick className="h-3 w-3" />
              총 페이지뷰
            </div>
            <div className="text-2xl font-bold">{activity.summary.pageViews}</div>
            <div className="text-xs text-muted-foreground mt-1">오늘 발생</div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-sm text-muted-foreground mb-1">총 이벤트</div>
            <div className="text-2xl font-bold">{activity.summary.totalEvents}</div>
            <div className="text-xs text-muted-foreground mt-1">모든 활동 합계</div>
          </div>
        </div>

        {/* 기능별 클릭 TOP5 */}
        {activity.topEvents.length > 0 && (
          <div className="rounded-lg border p-4">
            <div className="text-sm font-semibold mb-3">기능별 클릭 TOP5</div>
            <div className="space-y-2">
              {activity.topEvents.map((item, idx) => (
                <div key={item.event} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-6">#{idx + 1}</span>
                    <span className="text-sm font-medium">{item.event}</span>
                  </div>
                  <span className="text-sm font-bold">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 종목 선택 분포 */}
        {Object.keys(activity.sportDistribution).length > 0 && (
          <div className="rounded-lg border p-4">
            <div className="text-sm font-semibold mb-3">종목 선택 분포</div>
            <div className="space-y-2">
              {Object.entries(activity.sportDistribution)
                .sort(([, a], [, b]) => b - a)
                .map(([sport, count]) => (
                  <div key={sport} className="flex items-center justify-between">
                    <span className="text-sm">{sport}</span>
                    <span className="text-sm font-bold">{count}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* 팀 활동 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground mb-1">팀 가입</div>
            <div className="text-lg font-semibold">{activity.team.joins}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground mb-1">팀 생성 클릭</div>
            <div className="text-lg font-semibold">{activity.team.createClicks}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground mb-1">팀 페이지 조회</div>
            <div className="text-lg font-semibold">{activity.team.views}</div>
          </div>
        </div>

        {/* 마켓 & 커뮤니케이션 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground mb-2">🛒 마켓</div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>조회</span>
                <span className="font-semibold">{activity.market.views}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>상품 클릭</span>
                <span className="font-semibold">{activity.market.itemClicks}</span>
              </div>
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground mb-2">💬 커뮤니케이션</div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>채팅 진입</span>
                <span className="font-semibold">{activity.communication.chatOpens}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>알림 클릭</span>
                <span className="font-semibold">{activity.communication.notiClicks}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 검색 */}
        {activity.search.count > 0 && (
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground mb-1">🔍 검색</div>
            <div className="text-lg font-semibold">{activity.search.count}회</div>
          </div>
        )}

        {/* 마지막 업데이트 */}
        {activity.timestamp && (
          <div className="text-xs text-muted-foreground text-center pt-2 border-t">
            마지막 업데이트: {new Date(activity.timestamp).toLocaleString("ko-KR")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
