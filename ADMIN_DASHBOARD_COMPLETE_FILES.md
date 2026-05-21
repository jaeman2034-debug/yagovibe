# 📋 어드민 대시보드 전체 파일 모음 (커서 개발자용)

## 1️⃣ AdminDashboard.tsx (전체 329줄)

```typescript
/**
 * 🔥 Admin 대시보드 - 유저 현황 / 온보딩 퍼널 / SMS 로그
 * 
 * 역할:
 * - 관리자만 접근 가능 (AdminRoute로 보호)
 * - 유저 현황 통계
 * - 온보딩 퍼널 (단계별 이탈률)
 * - SMS 인증 로그 최근 목록
 * - Firestore read-only 안전 조회
 */

import { useEffect, useState, useMemo } from "react";
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  limit,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface UserStats {
  total: number;
  onboarded: number;
  notOnboarded: number;
  byStep: Record<number, number>;
}

interface AuthLog {
  id: string;
  type: string;
  phoneNumber: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: Timestamp | null;
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<AuthLog[]>([]);
  const [loading, setLoading] = useState(true);

  // 🔥 유저 통계 계산
  const userStats: UserStats = useMemo(() => {
    const total = users.length;
    const onboarded = users.filter((u) => u.onboardingCompleted === true).length;
    const notOnboarded = total - onboarded;

    // 단계별 유저 수
    const byStep: Record<number, number> = {};
    users.forEach((u) => {
      const step = u.onboardingStep ?? -1; // -1은 단계 정보 없음
      byStep[step] = (byStep[step] || 0) + 1;
    });

    return {
      total,
      onboarded,
      notOnboarded,
      byStep,
    };
  }, [users]);

  // 🔥 SMS 로그 통계
  const smsStats = useMemo(() => {
    const total = logs.filter((log) => log.type.startsWith("sms_")).length;
    const success = logs.filter((log) => log.type === "sms_success").length;
    const error = logs.filter((log) => log.type === "sms_error").length;
    const request = logs.filter((log) => log.type === "sms_request").length;

    return {
      total,
      success,
      error,
      request,
      successRate: total > 0 ? Math.round((success / total) * 100) : 0,
    };
  }, [logs]);

  useEffect(() => {
    // 🔥 유저 목록 실시간 구독
    const unsubUsers = onSnapshot(
      collection(db, "users"),
      (snap) => {
        setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (error) => {
        console.error("❌ [AdminDashboard] 유저 목록 구독 실패:", error);
        setLoading(false);
      }
    );

    // 🔥 최근 인증 로그 실시간 구독
    const q = query(
      collection(db, "auth_logs"),
      orderBy("createdAt", "desc"),
      limit(100)
    );

    const unsubLogs = onSnapshot(
      q,
      (snap) => {
        setLogs(
          snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })) as AuthLog[]
        );
      },
      (error) => {
        console.error("❌ [AdminDashboard] 로그 구독 실패:", error);
      }
    );

    return () => {
      unsubUsers();
      unsubLogs();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>불러오는 중...</div>
      </div>
    );
  }

  const conversionRate =
    userStats.total > 0
      ? Math.round((userStats.onboarded / userStats.total) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
          >
            새로고침
          </Button>
        </div>

        {/* 📊 유저 현황 */}
        <Card>
          <CardHeader>
            <CardTitle>📊 유저 현황</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <div className="text-2xl font-bold">{userStats.total}</div>
                <div className="text-sm text-muted-foreground">전체 유저</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {userStats.onboarded}
                </div>
                <div className="text-sm text-muted-foreground">온보딩 완료</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {userStats.notOnboarded}
                </div>
                <div className="text-sm text-muted-foreground">온보딩 미완료</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {conversionRate}%
                </div>
                <div className="text-sm text-muted-foreground">전환율</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 📈 온보딩 퍼널 */}
        <Card>
          <CardHeader>
            <CardTitle>📈 온보딩 퍼널</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span>Step 0 (이름 입력)</span>
                <span className="font-bold">
                  {userStats.byStep[0] || 0}명
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Step 1 (목적 선택)</span>
                <span className="font-bold">
                  {userStats.byStep[1] || 0}명
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Step 2 (종목 선택)</span>
                <span className="font-bold">
                  {userStats.byStep[2] || 0}명
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Step 3 (지역 선택)</span>
                <span className="font-bold">
                  {userStats.byStep[3] || 0}명
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Step 4 (완료)</span>
                <span className="font-bold">
                  {userStats.byStep[4] || 0}명
                </span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>단계 정보 없음</span>
                <span className="font-bold">
                  {userStats.byStep[-1] || 0}명
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 📱 SMS 인증 통계 */}
        <Card>
          <CardHeader>
            <CardTitle>📱 SMS 인증 통계 (최근 100건)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <div className="text-2xl font-bold">{smsStats.request}</div>
                <div className="text-sm text-muted-foreground">요청</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {smsStats.success}
                </div>
                <div className="text-sm text-muted-foreground">성공</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {smsStats.error}
                </div>
                <div className="text-sm text-muted-foreground">실패</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {smsStats.successRate}%
                </div>
                <div className="text-sm text-muted-foreground">성공률</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 📋 최근 SMS 인증 로그 */}
        <Card>
          <CardHeader>
            <CardTitle>📋 최근 SMS 인증 로그</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  로그가 없습니다
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            log.type === "sms_success" ||
                            log.type === "verify_success"
                              ? "bg-green-100 text-green-800"
                              : log.type === "sms_error" ||
                                log.type === "verify_error"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {log.type}
                        </span>
                        <span className="text-sm">
                          {log.phoneNumber
                            ? log.phoneNumber.replace(
                                /(\d{3})(\d{4})(\d{4})/,
                                "$1-****-$3"
                              )
                            : "-"}
                        </span>
                      </div>
                      {log.errorCode && (
                        <div className="text-xs text-red-600 mt-1">
                          {log.errorCode}: {log.errorMessage}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {log.createdAt
                        ? new Date(
                            log.createdAt.toMillis()
                          ).toLocaleString("ko-KR")
                        : "-"}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

---

## 2️⃣ AdminHome.tsx (전체 962줄)

**파일 위치**: `src/pages/admin/AdminHome.tsx`

**주요 기능**:
- AI 도우미
- 리포트 통계
- 배포 관리
- 퀵 액션
- Vercel 배포 센터
- 운영자용 AI 도우미

**현재 데이터 소스**: Firestore 직접 조회

**전체 코드는 파일이 너무 길어서 (962줄) 별도로 확인 필요**

---

## 3️⃣ admin.dashboard.ts (백엔드 라우트, 전체 289줄)

```typescript
/**
 * 🔥 Admin Dashboard Route - 대시보드 v2 통합 API
 * 
 * Week6 핵심: KPI 관제 + AB 실험 모니터 + 정산 관리 + 위험 알림
 */

import { Router } from "express";
import { prisma } from "../data/prisma";

const router = Router();

/**
 * GET /api/admin/dashboard/summary
 * 메인 요약 (KPI + 위험 신호)
 */
router.get("/summary", async (req, res) => {
  try {
    const region = (req.query.region as string) || "seoul";
    const date =
      (req.query.date as string) ||
      new Date().toISOString().split("T")[0]; // 오늘 날짜

    // KPI 조회
    const kpi = await prisma.dailyKpi.findUnique({
      where: {
        date_region: {
          date,
          region,
        },
      },
    });

    // 위험 신호: CTR이 낮은 스토리
    const lowCtrStories = await prisma.story.findMany({
      where: {
        region,
        status: "PUBLISHED",
      },
      take: 10,
      orderBy: { createdAt: "desc" },
    });

    // 최근 이벤트 로그에서 CTR 계산 (간단 버전)
    const recentLogs = await prisma.eventLog.findMany({
      where: {
        eventName: { in: ["story_impression", "story_click"] },
        region,
        createdAt: {
          gte: new Date(new Date().getTime() - 24 * 60 * 60 * 1000), // 최근 24시간
        },
      },
      take: 1000,
    });

    const impressions = recentLogs.filter(
      (l) => l.eventName === "story_impression"
    ).length;
    const clicks = recentLogs.filter((l) => l.eventName === "story_click")
      .length;
    const currentCtr = impressions > 0 ? clicks / impressions : 0;

    res.json({
      kpi: kpi
        ? {
            ...kpi,
            createdAt: kpi.createdAt.toISOString(),
          }
        : null,
      risk: {
        lowCtrStories: lowCtrStories.map((s) => s.id),
        apiError: kpi?.apiError || 0,
        currentCtr: currentCtr,
        isLowCtr: currentCtr < 0.01, // 1% 미만
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[GET /admin/dashboard/summary]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * GET /api/admin/dashboard/experiments
 * AB 실험 모니터
 */
router.get("/experiments", async (req, res) => {
  try {
    const exps = await prisma.experiment.findMany({
      orderBy: { createdAt: "desc" },
    });

    // 각 실험의 통계 조회
    const view = await Promise.all(
      exps.map(async (e) => {
        const stats = await prisma.experimentStat.findMany({
          where: { expId: e.id },
        });

        const variantA = stats.find((s) => s.variant === "A");
        const variantB = stats.find((s) => s.variant === "B");

        const impA = variantA?.imp || 0;
        const clickA = variantA?.click || 0;
        const impB = variantB?.imp || 0;
        const clickB = variantB?.click || 0;

        const ctrA = impA > 0 ? clickA / impA : 0;
        const ctrB = impB > 0 ? clickB / impB : 0;

        const uplift = ctrA > 0 ? (ctrB - ctrA) / ctrA : 0;

        return {
          id: e.id,
          status: e.status,
          winner: e.winner,
          startedAt: e.startedAt.toISOString(),
          endedAt: e.endedAt?.toISOString() || null,
          stats: {
            A: {
              imp: impA,
              click: clickA,
              ctr: ctrA,
            },
            B: {
              imp: impB,
              click: clickB,
              ctr: ctrB,
            },
          },
          uplift: uplift,
          totalImp: impA + impB,
          totalClick: clickA + clickB,
        };
      })
    );

    res.json(view);
  } catch (error) {
    console.error("[GET /admin/dashboard/experiments]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * GET /api/admin/dashboard/settlements
 * 정산 관제
 */
router.get("/settlements", async (req, res) => {
  try {
    const ownerId = req.query.ownerId as string | undefined;
    const region = req.query.region as string | undefined;
    const status = req.query.status as string | undefined;

    const where: any = {};
    if (ownerId) where.ownerId = ownerId;
    if (region) where.region = region;
    if (status) where.status = status;

    const items = await prisma.settlementItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const total = items.reduce((sum, item) => sum + item.net, 0);
    const ready = items.filter((i) => i.status === "READY").length;
    const settled = items.filter((i) => i.status === "SETTLED").length;
    const hold = items.filter((i) => i.status === "HOLD").length;

    res.json({
      summary: {
        total,
        ready,
        settled,
        hold,
        totalCount: items.length,
      },
      items: items.map((item) => ({
        ...item,
        usedAt: item.usedAt.toISOString(),
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[GET /admin/dashboard/settlements]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * GET /api/admin/dashboard/health
 * 헬스 체크 (스토리 채움률, 오프라인률, 시드률)
 */
router.get("/health", async (req, res) => {
  try {
    const region = (req.query.region as string) || "seoul";
    const date =
      (req.query.date as string) ||
      new Date().toISOString().split("T")[0];

    const kpi = await prisma.dailyKpi.findUnique({
      where: {
        date_region: {
          date,
          region,
        },
      },
    });

    // 실시간 스토리 채움률 계산
    const activeStories = await prisma.story.count({
      where: {
        region,
        status: "PUBLISHED",
        startAt: { lte: new Date() },
        endAt: { gte: new Date() },
      },
    });

    const storyFillRate = activeStories >= 5 ? 1.0 : activeStories / 5;

    res.json({
      storyFillRate: kpi?.storyFillRate ?? storyFillRate,
      offlineRate: kpi?.offlineRate ?? 0,
      seedRate: kpi?.seedRate ?? 0,
      apiError: kpi?.apiError ?? 0,
      activeStories,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[GET /admin/dashboard/health]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * GET /api/admin/dashboard/stories
 * 스토리 현황 (관제용)
 */
router.get("/stories", async (req, res) => {
  try {
    const region = (req.query.region as string) || "seoul";

    const stories = await prisma.story.findMany({
      where: { region },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const byStatus = {
      PUBLISHED: stories.filter((s) => s.status === "PUBLISHED").length,
      DRAFT: stories.filter((s) => s.status === "DRAFT").length,
      EXPIRED: stories.filter((s) => s.status === "EXPIRED").length,
      REJECTED: stories.filter((s) => s.status === "REJECTED").length,
    };

    res.json({
      summary: {
        total: stories.length,
        ...byStatus,
      },
      stories: stories.map((s) => ({
        ...s,
        startAt: s.startAt.toISOString(),
        endAt: s.endAt.toISOString(),
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[GET /admin/dashboard/stories]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

export default router;
```

---

## 📊 백엔드 API 엔드포인트 요약

### 사용 가능한 엔드포인트

1. **GET `/api/admin/dashboard/summary`**
   - Query: `?region=seoul&date=2026-02-03`
   - Response: KPI + 위험 신호

2. **GET `/api/admin/dashboard/health`**
   - Query: `?region=seoul&date=2026-02-03`
   - Response: 스토리 채움률, 오프라인률, 시드률

3. **GET `/api/admin/dashboard/stories`**
   - Query: `?region=seoul`
   - Response: 스토리 현황 및 상태별 분류

4. **GET `/api/admin/dashboard/experiments`**
   - Response: AB 실험 모니터 데이터

5. **GET `/api/admin/dashboard/settlements`**
   - Query: `?ownerId=xxx&region=seoul&status=READY`
   - Response: 정산 관제 데이터

6. **GET `/api/leagues`**
   - Query: `?region=seoul`
   - Response: 리그 목록

7. **GET `/api/stories`**
   - Query: `?region=seoul`
   - Response: 스토리 목록

---

## 🎯 다음 작업 지시

이제 아키텍트가 다음을 설계할 수 있습니다:

1. **API 클라이언트 레이어** (`src/lib/api/adminApi.ts`)
2. **컴포넌트 분리** (`EsportsPanel.tsx`)
3. **타입 정의** (백엔드 스펙 기준)
4. **점진적 전환 전략** (Firestore → Backend API)

**준비 완료!** 🚀
