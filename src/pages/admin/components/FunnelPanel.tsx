/**
 * 🔥 전환 퍼널 패널 - 투자자/대표용 핵심 지표 (실시간 버전)
 * 
 * 목적: "유저가 행동으로 이어지는가" 한눈에 확인
 * 
 * 퍼널 단계:
 * 1. SPORT_SELECTED (종목 선택)
 * 2. story_impression (스토리 노출)
 * 3. story_click (스토리 클릭)
 * 4. TEAM_VIEW / MARKET_VIEW (핵심 페이지 진입)
 * 5. TEAM_JOIN (핵심 행동)
 * 
 * 🔥 실시간 onSnapshot 방식:
 * - Firestore activityLogs, eventLogs 컬렉션 실시간 구독
 * - 오늘 날짜 기준 필터링
 * - 클라이언트에서 실시간 집계 및 CTR 계산
 */

import { useEffect, useState, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { collection, query, where, onSnapshot, Timestamp, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TrendingUp, TrendingDown, AlertCircle, Target } from "lucide-react";

interface FunnelData {
  step1_sportSelected: number;
  step2_storyImpression: number;
  step3_storyClick: number;
  step4_activationViews: number;
  step5_teamJoin: number;
  kpi: {
    ctr: number;
    activationRate: number;
    deepConversion: number;
  };
  lowCtrStories: Array<{
    storyId: string;
    impressions: number;
    clicks: number;
    ctr: number;
  }>;
  summaryComment: string;
  timestamp: string;
}

export default function FunnelPanel() {
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // 🔥 재연결 시도 횟수 (useRef로 관리하여 클로저 문제 방지)
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;

  useEffect(() => {
    // 오늘 날짜 시작 시간 (00:00:00)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = Timestamp.fromDate(today);

    let activityLogs: any[] = [];
    let eventLogs: any[] = [];
    let unsubEvent: (() => void) | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    // 🔥 ActivityLog 실시간 구독 (SPORT_SELECTED, TEAM_VIEW, TEAM_JOIN 등)
    const activityQuery = query(
      collection(db, "activityLogs"),
      where("createdAt", ">=", todayTimestamp),
      orderBy("createdAt", "desc")
    );

    const unsubActivity = onSnapshot(
      activityQuery,
      (snap) => {
        // 🔥 재연결 성공
        if (reconnectAttemptsRef.current > 0) {
          console.log(`✅ [FunnelPanel] ActivityLog 재연결 성공 (시도: ${reconnectAttemptsRef.current})`);
          reconnectAttemptsRef.current = 0;
        }
        setIsConnected(true);
        setError(null);

        // 🔥 중복 방지: 문서 ID 기준으로 중복 제거
        const newLogs = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        
        // 기존 로그와 병합 (중복 제거)
        const existingIds = new Set(activityLogs.map((log) => log.id));
        const uniqueNewLogs = newLogs.filter((log) => !existingIds.has(log.id));
        activityLogs = [...activityLogs, ...uniqueNewLogs];
        
        processFunnelData();
      },
      (err) => {
        console.error("❌ [FunnelPanel] ActivityLog 구독 실패:", err);
        setIsConnected(false);
        
        // 🔥 재연결 시도
        reconnectAttemptsRef.current += 1;
        if (reconnectAttemptsRef.current <= MAX_RECONNECT_ATTEMPTS) {
          console.log(`🔄 [FunnelPanel] 재연결 시도 ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS}`);
          // onSnapshot은 자동으로 재연결을 시도하므로 여기서는 로그만 남김
        } else {
          setError(err.message || "ActivityLog 구독 실패 (재연결 시도 초과)");
          setLoading(false);
        }
      }
    );

    // 🔥 EventLog 실시간 구독 (story_impression, story_click)
    const eventQuery = query(
      collection(db, "eventLogs"),
      where("createdAt", ">=", todayTimestamp),
      where("eventName", "in", ["story_impression", "story_click"]),
      orderBy("createdAt", "desc")
    );

    unsubEvent = onSnapshot(
      eventQuery,
      (eventSnap) => {
        // 🔥 재연결 성공
        if (reconnectAttemptsRef.current > 0) {
          console.log(`✅ [FunnelPanel] EventLog 재연결 성공 (시도: ${reconnectAttemptsRef.current})`);
          reconnectAttemptsRef.current = 0;
        }
        setIsConnected(true);
        setError(null);

        // 🔥 중복 방지: 문서 ID 기준으로 중복 제거
        const newLogs = eventSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        
        // 기존 로그와 병합 (중복 제거)
        const existingIds = new Set(eventLogs.map((log) => log.id));
        const uniqueNewLogs = newLogs.filter((log) => !existingIds.has(log.id));
        eventLogs = [...eventLogs, ...uniqueNewLogs];
        
        processFunnelData();
      },
      (err) => {
        console.error("❌ [FunnelPanel] EventLog 구독 실패:", err);
        setIsConnected(false);
        
        // 🔥 재연결 시도
        reconnectAttemptsRef.current += 1;
        if (reconnectAttemptsRef.current <= MAX_RECONNECT_ATTEMPTS) {
          console.log(`🔄 [FunnelPanel] 재연결 시도 ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS}`);
          // onSnapshot은 자동으로 재연결을 시도하므로 여기서는 로그만 남김
        } else {
          setError(err.message || "EventLog 구독 실패 (재연결 시도 초과)");
          setLoading(false);
        }
      }
    );

    // 🔥 두 구독의 데이터를 합쳐서 퍼널 계산
    function processFunnelData() {
      try {
        setLoading(false);
        setError(null);

        // 퍼널 단계별 카운트
        const sportSelected = activityLogs.filter(
          (log) => log.event === "SPORT_SELECTED" || log.event === "SPORT_SELECT"
        ).length;

        const storyImpressions = eventLogs.filter(
          (log) => log.eventName === "story_impression"
        ).length;

        const storyClicks = eventLogs.filter(
          (log) => log.eventName === "story_click"
        ).length;

        const teamViews = activityLogs.filter(
          (log) => log.event === "TEAM_VIEW"
        ).length;

        const marketViews = activityLogs.filter(
          (log) => log.event === "MARKET_VIEW"
        ).length;

        const teamJoins = activityLogs.filter(
          (log) => log.event === "TEAM_JOIN"
        ).length;

        const activationViews = teamViews + marketViews;

        // KPI 계산
        const ctr = storyImpressions > 0 ? storyClicks / storyImpressions : 0;
        const activationRate = sportSelected > 0 ? activationViews / sportSelected : 0;
        const deepConversion = storyClicks > 0 ? teamJoins / storyClicks : 0;

        // 낮은 CTR 스토리 Top5 계산
        const storyStats: Record<string, { impressions: number; clicks: number }> = {};
        eventLogs.forEach((log: any) => {
          try {
            const payload = typeof log.payload === "string" ? JSON.parse(log.payload) : log.payload || {};
            const storyId = payload.storyId || "unknown";
            if (!storyStats[storyId]) {
              storyStats[storyId] = { impressions: 0, clicks: 0 };
            }
            if (log.eventName === "story_impression") {
              storyStats[storyId].impressions++;
            } else if (log.eventName === "story_click") {
              storyStats[storyId].clicks++;
            }
          } catch {
            // payload 파싱 실패 시 무시
          }
        });

        const lowCtrStories = Object.entries(storyStats)
          .map(([storyId, stats]) => ({
            storyId,
            impressions: stats.impressions,
            clicks: stats.clicks,
            ctr: stats.impressions > 0 ? stats.clicks / stats.impressions : 0,
          }))
          .filter((s) => s.impressions >= 3)
          .sort((a, b) => a.ctr - b.ctr)
          .slice(0, 5);

        // 자동 코멘트 생성
        const comments = [];
        if (ctr > 0) {
          comments.push(`오늘 스토리 CTR ${(ctr * 100).toFixed(1)}%`);
        }
        if (activationRate > 0) {
          comments.push(`종목선택 대비 팀/마켓 조회 전환 ${(activationRate * 100).toFixed(1)}%`);
        }
        if (deepConversion > 0) {
          comments.push(`스토리 클릭 대비 팀 가입 전환 ${(deepConversion * 100).toFixed(1)}%`);
        }
        const summaryComment = comments.length > 0 ? comments.join(", ") : "데이터 수집 중";

        setFunnel({
          step1_sportSelected: sportSelected,
          step2_storyImpression: storyImpressions,
          step3_storyClick: storyClicks,
          step4_activationViews: activationViews,
          step5_teamJoin: teamJoins,
          kpi: {
            ctr,
            activationRate,
            deepConversion,
          },
          lowCtrStories,
          summaryComment,
          timestamp: new Date().toISOString(),
        });

        console.log(`✅ [FunnelPanel] 실시간 업데이트:`, {
          sportSelected,
          storyImpressions,
          storyClicks,
          activationViews,
          teamJoins,
          ctr: (ctr * 100).toFixed(1) + "%",
        });
      } catch (err) {
        console.error("❌ [FunnelPanel] 데이터 처리 실패:", err);
        setError(err instanceof Error ? err.message : "데이터 처리 중 오류가 발생했습니다.");
        setLoading(false);
      }
    }

    return () => {
      unsubActivity();
      if (unsubEvent) unsubEvent();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      reconnectAttemptsRef.current = 0; // 초기화
    };
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            오늘 성장 퍼널
          </CardTitle>
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
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            오늘 성장 퍼널
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-600 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-200 dark:border-red-800">
            ⚠️ API 오류: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!funnel) {
    return null;
  }

  // 퍼널 단계별 전환율 계산
  const conversion1to2 = funnel.step1_sportSelected > 0
    ? (funnel.step2_storyImpression / funnel.step1_sportSelected) * 100
    : 0;
  const conversion2to3 = funnel.step2_storyImpression > 0
    ? (funnel.step3_storyClick / funnel.step2_storyImpression) * 100
    : 0;
  const conversion3to4 = funnel.step3_storyClick > 0
    ? (funnel.step4_activationViews / funnel.step3_storyClick) * 100
    : 0;
  const conversion4to5 = funnel.step4_activationViews > 0
    ? (funnel.step5_teamJoin / funnel.step4_activationViews) * 100
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          오늘 성장 퍼널
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 퍼널 시각화 */}
        <div className="space-y-3">
          {/* Step 1: 종목 선택 */}
          <div className="flex items-center gap-4">
            <div className="w-32 text-sm font-medium">1. 종목 선택</div>
            <div className="flex-1 bg-gray-100 rounded-full h-8 relative">
              <div
                className="bg-blue-500 h-full rounded-full flex items-center justify-end pr-2"
                style={{ width: "100%" }}
              >
                <span className="text-white text-xs font-semibold px-2">
                  {funnel.step1_sportSelected}
                </span>
              </div>
            </div>
            <div className="w-20 text-right text-sm font-semibold">
              100%
            </div>
          </div>

          {/* Step 2: 스토리 노출 */}
          <div className="flex items-center gap-4">
            <div className="w-32 text-sm font-medium">2. 스토리 노출</div>
            <div className="flex-1 bg-gray-100 rounded-full h-8 relative">
              <div
                className="bg-green-500 h-full rounded-full flex items-center justify-end pr-2"
                style={{
                  width: `${Math.min((funnel.step2_storyImpression / funnel.step1_sportSelected) * 100, 100)}%`,
                }}
              >
                <span className="text-white text-xs font-semibold px-2">
                  {funnel.step2_storyImpression}
                </span>
              </div>
            </div>
            <div className="w-20 text-right text-sm font-semibold">
              {conversion1to2.toFixed(1)}%
            </div>
          </div>

          {/* Step 3: 스토리 클릭 */}
          <div className="flex items-center gap-4">
            <div className="w-32 text-sm font-medium">3. 스토리 클릭</div>
            <div className="flex-1 bg-gray-100 rounded-full h-8 relative">
              <div
                className="bg-yellow-500 h-full rounded-full flex items-center justify-end pr-2"
                style={{
                  width: `${Math.min((funnel.step3_storyClick / funnel.step1_sportSelected) * 100, 100)}%`,
                }}
              >
                <span className="text-white text-xs font-semibold px-2">
                  {funnel.step3_storyClick}
                </span>
              </div>
            </div>
            <div className="w-20 text-right text-sm font-semibold">
              {conversion2to3.toFixed(1)}% (CTR)
            </div>
          </div>

          {/* Step 4: 핵심 페이지 진입 */}
          <div className="flex items-center gap-4">
            <div className="w-32 text-sm font-medium">4. 팀/마켓 조회</div>
            <div className="flex-1 bg-gray-100 rounded-full h-8 relative">
              <div
                className="bg-orange-500 h-full rounded-full flex items-center justify-end pr-2"
                style={{
                  width: `${Math.min((funnel.step4_activationViews / funnel.step1_sportSelected) * 100, 100)}%`,
                }}
              >
                <span className="text-white text-xs font-semibold px-2">
                  {funnel.step4_activationViews}
                </span>
              </div>
            </div>
            <div className="w-20 text-right text-sm font-semibold">
              {conversion3to4.toFixed(1)}%
            </div>
          </div>

          {/* Step 5: 팀 가입 */}
          <div className="flex items-center gap-4">
            <div className="w-32 text-sm font-medium">5. 팀 가입</div>
            <div className="flex-1 bg-gray-100 rounded-full h-8 relative">
              <div
                className="bg-red-500 h-full rounded-full flex items-center justify-end pr-2"
                style={{
                  width: `${Math.min((funnel.step5_teamJoin / funnel.step1_sportSelected) * 100, 100)}%`,
                }}
              >
                <span className="text-white text-xs font-semibold px-2">
                  {funnel.step5_teamJoin}
                </span>
              </div>
            </div>
            <div className="w-20 text-right text-sm font-semibold">
              {conversion4to5.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* 핵심 KPI */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
          <div className="rounded-lg border p-4">
            <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              스토리 CTR
            </div>
            <div className="text-2xl font-bold">
              {(funnel.kpi.ctr * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              클릭/노출 비율
            </div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
              <Target className="h-3 w-3" />
              활성화율
            </div>
            <div className="text-2xl font-bold">
              {(funnel.kpi.activationRate * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              종목선택 → 팀/마켓 조회
            </div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
              <TrendingDown className="h-3 w-3" />
              심화 전환
            </div>
            <div className="text-2xl font-bold">
              {(funnel.kpi.deepConversion * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              스토리 클릭 → 팀 가입
            </div>
          </div>
        </div>

        {/* 자동 코멘트 */}
        <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4 border border-blue-200 dark:border-blue-800">
          <div className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
            📊 오늘 요약
          </div>
          <div className="text-sm text-blue-700 dark:text-blue-300">
            {funnel.summaryComment}
          </div>
        </div>

        {/* 낮은 CTR 스토리 Top5 */}
        {funnel.lowCtrStories.length > 0 && (
          <div className="rounded-lg border p-4">
            <div className="text-sm font-semibold mb-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              낮은 CTR 스토리 Top5 (개선 필요)
            </div>
            <div className="space-y-2">
              {funnel.lowCtrStories.map((story, idx) => (
                <div key={story.storyId} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-6">#{idx + 1}</span>
                    <span className="font-medium">{story.storyId}</span>
                    <span className="text-xs text-muted-foreground">
                      (노출: {story.impressions}, 클릭: {story.clicks})
                    </span>
                  </div>
                  <span className="text-sm font-bold text-red-600">
                    {(story.ctr * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 연결 상태 및 마지막 업데이트 */}
        <div className="text-xs text-muted-foreground text-center pt-2 border-t space-y-1">
          {isConnected ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>실시간 구독 중</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center gap-2 text-red-600">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span>연결 끊김</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 text-orange-600">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
              <span>연결 중...</span>
            </div>
          )}
          {funnel.timestamp && (
            <div>
              마지막 업데이트: {new Date(funnel.timestamp).toLocaleString("ko-KR")}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
