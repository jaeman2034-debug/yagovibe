# 📊 KPI 대시보드 쿼리 세트

**목표**: 실시간 모니터링, 데이터 기반 의사결정  
**대상**: 전환율, 리텐션, 수익화 지표  
**업데이트 주기**: 실시간 (1분 간격)

---

## 🎯 핵심 KPI 정의

### Tier 1: 전환율 지표 (최우선)

1. **등록→거래 전환율** (목표: ≥33%)
2. **이미지 포함률** (목표: ≥98%)
3. **AI 제목 채택률** (목표: ≥75%)

### Tier 2: 리텐션 지표

4. **DAU/MAU** (목표: ≥40%)
5. **주간 재방문율** (목표: ≥3.5회)
6. **노쇼율** (목표: ≤5%)

### Tier 3: 수익화 지표

7. **ARPU** (목표: ≥2,000원)
8. **광고 CTR** (목표: ≥2.5%)
9. **월 매출** (목표: ≥2.3억원)

---

## 📊 Firestore 쿼리

### KPI #1: 등록→거래 전환율

```typescript
// functions/src/analytics/kpiQueries.ts

import { db, Timestamp } from "../firebase";

/**
 * 등록→거래 전환율 계산
 * 목표: ≥33%
 */
export async function getRegistrationToTradeConversionRate(
  startDate: Date,
  endDate: Date
): Promise<number> {
  const start = Timestamp.fromDate(startDate);
  const end = Timestamp.fromDate(endDate);

  // 등록 완료 수
  const registrations = await db
    .collection("market")
    .where("createdAt", ">=", start)
    .where("createdAt", "<=", end)
    .get();

  const registrationCount = registrations.size;

  // 거래 생성 수 (등록된 아이템 기준)
  const trades = await db
    .collection("trades")
    .where("createdAt", ">=", start)
    .where("createdAt", "<=", end)
    .get();

  const tradeCount = trades.size;

  // 전환율 계산
  const conversionRate = registrationCount > 0 
    ? (tradeCount / registrationCount) * 100 
    : 0;

  return parseFloat(conversionRate.toFixed(2));
}
```

**실시간 쿼리**:
```sql
-- Firestore 쿼리 (의사 코드)
SELECT 
  COUNT(DISTINCT market.id) as registrations,
  COUNT(DISTINCT trades.id) as trades,
  (COUNT(DISTINCT trades.id) / COUNT(DISTINCT market.id)) * 100 as conversion_rate
FROM market
LEFT JOIN trades ON trades.itemId = market.id
WHERE market.createdAt >= @startDate
  AND market.createdAt <= @endDate
```

---

### KPI #2: 이미지 포함률

```typescript
/**
 * 이미지 포함률 계산
 * 목표: ≥98%
 */
export async function getImageInclusionRate(
  startDate: Date,
  endDate: Date
): Promise<number> {
  const start = Timestamp.fromDate(startDate);
  const end = Timestamp.fromDate(endDate);

  // 전체 등록 수
  const allRegistrations = await db
    .collection("market")
    .where("createdAt", ">=", start)
    .where("createdAt", "<=", end)
    .get();

  // 이미지 포함 등록 수
  const withImages = allRegistrations.docs.filter(
    (doc) => {
      const data = doc.data();
      return data.images && Array.isArray(data.images) && data.images.length > 0;
    }
  );

  const inclusionRate = allRegistrations.size > 0
    ? (withImages.length / allRegistrations.size) * 100
    : 0;

  return parseFloat(inclusionRate.toFixed(2));
}
```

---

### KPI #3: AI 제목 채택률

```typescript
/**
 * AI 제목 채택률 계산
 * 목표: ≥75%
 */
export async function getAITitleAdoptionRate(
  startDate: Date,
  endDate: Date
): Promise<number> {
  const start = Timestamp.fromDate(startDate);
  const end = Timestamp.fromDate(endDate);

  // 전체 등록 수
  const allRegistrations = await db
    .collection("market")
    .where("createdAt", ">=", start)
    .where("createdAt", "<=", end)
    .get();

  // AI 제목 채택 수 (aiTitleUsed 필드 또는 제목 유사도 기반)
  const withAITitle = allRegistrations.docs.filter(
    (doc) => {
      const data = doc.data();
      return data.aiTitleUsed === true || data.titleSource === "AI";
    }
  );

  const adoptionRate = allRegistrations.size > 0
    ? (withAITitle.length / allRegistrations.size) * 100
    : 0;

  return parseFloat(adoptionRate.toFixed(2));
}
```

---

### KPI #4: DAU/MAU

```typescript
/**
 * DAU/MAU 계산
 * 목표: ≥40%
 */
export async function getDAUMAURatio(): Promise<number> {
  const now = new Date();
  const todayStart = new Date(now.setHours(0, 0, 0, 0));
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const today = Timestamp.fromDate(todayStart);
  const month = Timestamp.fromDate(monthStart);

  // DAU: 오늘 활성 사용자
  const dau = await db
    .collection("userEvents")
    .where("timestamp", ">=", today)
    .select("userId")
    .get();

  const dauCount = new Set(dau.docs.map(d => d.data().userId)).size;

  // MAU: 이번 달 활성 사용자
  const mau = await db
    .collection("userEvents")
    .where("timestamp", ">=", month)
    .select("userId")
    .get();

  const mauCount = new Set(mau.docs.map(d => d.data().userId)).size;

  // DAU/MAU 비율
  const ratio = mauCount > 0 ? (dauCount / mauCount) * 100 : 0;

  return parseFloat(ratio.toFixed(2));
}
```

---

### KPI #5: 주간 재방문율

```typescript
/**
 * 주간 재방문율 계산
 * 목표: ≥3.5회
 */
export async function getWeeklyReturnRate(): Promise<number> {
  const now = new Date();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const week = Timestamp.fromDate(weekStart);

  // 주간 활성 사용자
  const weeklyUsers = await db
    .collection("userEvents")
    .where("timestamp", ">=", week)
    .select("userId")
    .get();

  const userIds = Array.from(new Set(weeklyUsers.docs.map(d => d.data().userId)));

  // 사용자별 방문 횟수 계산
  const visitCounts = userIds.map(async (userId) => {
    const visits = await db
      .collection("userEvents")
      .where("userId", "==", userId)
      .where("timestamp", ">=", week)
      .where("eventType", "==", "APP_OPEN")
      .get();

    return visits.size;
  });

  const counts = await Promise.all(visitCounts);
  const avgVisits = counts.length > 0
    ? counts.reduce((a, b) => a + b, 0) / counts.length
    : 0;

  return parseFloat(avgVisits.toFixed(2));
}
```

---

### KPI #6: 노쇼율

```typescript
/**
 * 노쇼율 계산
 * 목표: ≤5%
 */
export async function getNoShowRate(
  startDate: Date,
  endDate: Date
): Promise<number> {
  const start = Timestamp.fromDate(startDate);
  const end = Timestamp.fromDate(endDate);

  // 전체 거래 수
  const allTrades = await db
    .collection("trades")
    .where("createdAt", ">=", start)
    .where("createdAt", "<=", end)
    .where("type", "==", "DIRECT_TRADE")
    .get();

  // 노쇼 거래 수
  const noShowTrades = allTrades.docs.filter(
    (doc) => {
      const data = doc.data();
      return data.noShow === true || data.status === "NO_SHOW";
    }
  );

  const noShowRate = allTrades.size > 0
    ? (noShowTrades.length / allTrades.size) * 100
    : 0;

  return parseFloat(noShowRate.toFixed(2));
}
```

---

### KPI #7: ARPU

```typescript
/**
 * ARPU (Average Revenue Per User) 계산
 * 목표: ≥2,000원
 */
export async function getARPU(
  startDate: Date,
  endDate: Date
): Promise<number> {
  const start = Timestamp.fromDate(startDate);
  const end = Timestamp.fromDate(endDate);

  // 총 수익 (거래 수수료 + 광고 + 보관/검수)
  const trades = await db
    .collection("trades")
    .where("createdAt", ">=", start)
    .where("createdAt", "<=", end)
    .where("status", "==", "CONFIRMED")
    .get();

  const tradeRevenue = trades.docs.reduce((sum, doc) => {
    const data = doc.data();
    return sum + (data.fee || 0);
  }, 0);

  const ads = await db
    .collection("adClicks")
    .where("timestamp", ">=", start)
    .where("timestamp", "<=", end)
    .get();

  const adRevenue = ads.docs.reduce((sum, doc) => {
    const data = doc.data();
    return sum + (data.cpc || 0);
  }, 0);

  const totalRevenue = tradeRevenue + adRevenue;

  // 활성 사용자 수
  const activeUsers = await db
    .collection("userEvents")
    .where("timestamp", ">=", start)
    .where("timestamp", "<=", end)
    .select("userId")
    .get();

  const userCount = new Set(activeUsers.docs.map(d => d.data().userId)).size;

  // ARPU 계산
  const arpu = userCount > 0 ? totalRevenue / userCount : 0;

  return parseFloat(arpu.toFixed(2));
}
```

---

### KPI #8: 광고 CTR

```typescript
/**
 * 광고 CTR (Click-Through Rate) 계산
 * 목표: ≥2.5%
 */
export async function getAdCTR(
  startDate: Date,
  endDate: Date
): Promise<number> {
  const start = Timestamp.fromDate(startDate);
  const end = Timestamp.fromDate(endDate);

  // 광고 노출 수
  const impressions = await db
    .collection("adImpressions")
    .where("timestamp", ">=", start)
    .where("timestamp", "<=", end)
    .get();

  const impressionCount = impressions.size;

  // 광고 클릭 수
  const clicks = await db
    .collection("adClicks")
    .where("timestamp", ">=", start)
    .where("timestamp", "<=", end)
    .get();

  const clickCount = clicks.size;

  // CTR 계산
  const ctr = impressionCount > 0
    ? (clickCount / impressionCount) * 100
    : 0;

  return parseFloat(ctr.toFixed(2));
}
```

---

### KPI #9: 월 매출

```typescript
/**
 * 월 매출 계산
 * 목표: ≥2.3억원
 */
export async function getMonthlyRevenue(
  year: number,
  month: number
): Promise<number> {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);

  const start = Timestamp.fromDate(monthStart);
  const end = Timestamp.fromDate(monthEnd);

  // 거래 수수료
  const trades = await db
    .collection("trades")
    .where("createdAt", ">=", start)
    .where("createdAt", "<=", end)
    .where("status", "==", "CONFIRMED")
    .get();

  const tradeRevenue = trades.docs.reduce((sum, doc) => {
    const data = doc.data();
    return sum + (data.fee || 0);
  }, 0);

  // 광고 수익
  const ads = await db
    .collection("adClicks")
    .where("timestamp", ">=", start)
    .where("timestamp", "<=", end)
    .get();

  const adRevenue = ads.docs.reduce((sum, doc) => {
    const data = doc.data();
    return sum + (data.cpc || 0);
  }, 0);

  // 보관/검수 수익
  const services = await db
    .collection("services")
    .where("createdAt", ">=", start)
    .where("createdAt", "<=", end)
    .get();

  const serviceRevenue = services.docs.reduce((sum, doc) => {
    const data = doc.data();
    return sum + (data.fee || 0);
  }, 0);

  const totalRevenue = tradeRevenue + adRevenue + serviceRevenue;

  return totalRevenue;
}
```

---

## 📊 통합 대시보드 쿼리

### 모든 KPI 한 번에 조회

```typescript
/**
 * 모든 KPI 통합 조회
 */
export async function getAllKPIs(): Promise<KPIDashboard> {
  const now = new Date();
  const todayStart = new Date(now.setHours(0, 0, 0, 0));
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    conversionRate,
    imageInclusionRate,
    aiTitleAdoptionRate,
    dauMauRatio,
    weeklyReturnRate,
    noShowRate,
    arpu,
    adCTR,
    monthlyRevenue,
  ] = await Promise.all([
    getRegistrationToTradeConversionRate(weekStart, now),
    getImageInclusionRate(weekStart, now),
    getAITitleAdoptionRate(weekStart, now),
    getDAUMAURatio(),
    getWeeklyReturnRate(),
    getNoShowRate(weekStart, now),
    getARPU(monthStart, now),
    getAdCTR(weekStart, now),
    getMonthlyRevenue(now.getFullYear(), now.getMonth() + 1),
  ]);

  return {
    conversion: {
      registrationToTrade: conversionRate,
      imageInclusion: imageInclusionRate,
      aiTitleAdoption: aiTitleAdoptionRate,
    },
    retention: {
      dauMau: dauMauRatio,
      weeklyReturn: weeklyReturnRate,
      noShow: noShowRate,
    },
    revenue: {
      arpu,
      adCTR,
      monthlyRevenue,
    },
    timestamp: Timestamp.now(),
  };
}

interface KPIDashboard {
  conversion: {
    registrationToTrade: number;
    imageInclusion: number;
    aiTitleAdoption: number;
  };
  retention: {
    dauMau: number;
    weeklyReturn: number;
    noShow: number;
  };
  revenue: {
    arpu: number;
    adCTR: number;
    monthlyRevenue: number;
  };
  timestamp: any;
}
```

---

## 🔔 알림 시스템

### KPI 임계값 알림

```typescript
/**
 * KPI 임계값 체크 및 알림
 */
export async function checkKPIThresholds(): Promise<void> {
  const kpis = await getAllKPIs();

  const alerts: string[] = [];

  // 전환율 임계값 체크
  if (kpis.conversion.registrationToTrade < 33) {
    alerts.push(`⚠️ 등록→거래 전환율이 목표(33%) 미달: ${kpis.conversion.registrationToTrade}%`);
  }

  if (kpis.conversion.imageInclusion < 98) {
    alerts.push(`⚠️ 이미지 포함률이 목표(98%) 미달: ${kpis.conversion.imageInclusion}%`);
  }

  if (kpis.conversion.aiTitleAdoption < 75) {
    alerts.push(`⚠️ AI 제목 채택률이 목표(75%) 미달: ${kpis.conversion.aiTitleAdoption}%`);
  }

  // 리텐션 임계값 체크
  if (kpis.retention.dauMau < 40) {
    alerts.push(`⚠️ DAU/MAU가 목표(40%) 미달: ${kpis.retention.dauMau}%`);
  }

  if (kpis.retention.weeklyReturn < 3.5) {
    alerts.push(`⚠️ 주간 재방문율이 목표(3.5회) 미달: ${kpis.retention.weeklyReturn}회`);
  }

  if (kpis.retention.noShow > 5) {
    alerts.push(`⚠️ 노쇼율이 목표(5%) 초과: ${kpis.retention.noShow}%`);
  }

  // 수익화 임계값 체크
  if (kpis.revenue.arpu < 2000) {
    alerts.push(`⚠️ ARPU가 목표(2,000원) 미달: ${kpis.revenue.arpu}원`);
  }

  if (kpis.revenue.adCTR < 2.5) {
    alerts.push(`⚠️ 광고 CTR이 목표(2.5%) 미달: ${kpis.revenue.adCTR}%`);
  }

  if (kpis.revenue.monthlyRevenue < 230000000) {
    alerts.push(`⚠️ 월 매출이 목표(2.3억원) 미달: ${kpis.revenue.monthlyRevenue.toLocaleString()}원`);
  }

  // 알림 전송
  if (alerts.length > 0) {
    await sendAlerts(alerts);
  }
}

/**
 * 알림 전송
 */
async function sendAlerts(alerts: string[]): Promise<void> {
  // Slack, 이메일, 푸시 알림 등
  console.log("🚨 KPI 알림:", alerts);
}
```

---

## 📈 실시간 대시보드 Cloud Function

```typescript
// functions/src/analytics/kpiDashboard.ts

import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import { getAllKPIs, checkKPIThresholds } from "./kpiQueries";
import { db, FieldValue } from "../firebase";

/**
 * KPI 대시보드 업데이트 (1분마다)
 */
export const updateKPIDashboard = onSchedule(
  { schedule: "* * * * *", timeZone: "Asia/Seoul" },
  async () => {
    try {
      const kpis = await getAllKPIs();

      // KPI 대시보드 문서 업데이트
      await db.collection("kpi_dashboard").doc("current").set({
        ...kpis,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // KPI 임계값 체크
      await checkKPIThresholds();

      logger.info("[updateKPIDashboard] KPI 대시보드 업데이트 완료");
    } catch (error: any) {
      logger.error("[updateKPIDashboard] 오류:", error);
    }
  }
);
```

---

## 🎯 대시보드 UI 스키마

### Firestore 데이터 구조

```typescript
// kpi_dashboard/current
{
  conversion: {
    registrationToTrade: 33.5,  // 목표: ≥33%
    imageInclusion: 98.2,        // 목표: ≥98%
    aiTitleAdoption: 76.8,       // 목표: ≥75%
  },
  retention: {
    dauMau: 42.3,                // 목표: ≥40%
    weeklyReturn: 3.7,           // 목표: ≥3.5회
    noShow: 4.2,                 // 목표: ≤5%
  },
  revenue: {
    arpu: 2150,                  // 목표: ≥2,000원
    adCTR: 2.8,                  // 목표: ≥2.5%
    monthlyRevenue: 245000000,    // 목표: ≥2.3억원
  },
  timestamp: Timestamp,
  updatedAt: Timestamp,
}
```

---

## 📊 클라이언트 대시보드 컴포넌트

```typescript
// src/components/admin/KPIDashboard.tsx

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function KPIDashboard() {
  const [kpis, setKPIs] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "kpi_dashboard", "current"),
      (snapshot) => {
        if (snapshot.exists()) {
          setKPIs(snapshot.data());
        }
      }
    );

    return () => unsubscribe();
  }, []);

  if (!kpis) return <div>로딩 중...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">KPI 대시보드</h1>

      {/* 전환율 지표 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">전환율 지표</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-white rounded-lg shadow">
            <p className="text-sm text-gray-600">등록→거래 전환율</p>
            <p className={`text-2xl font-bold ${
              kpis.conversion.registrationToTrade >= 33 ? "text-green-600" : "text-red-600"
            }`}>
              {kpis.conversion.registrationToTrade}%
            </p>
            <p className="text-xs text-gray-500">목표: ≥33%</p>
          </div>
          <div className="p-4 bg-white rounded-lg shadow">
            <p className="text-sm text-gray-600">이미지 포함률</p>
            <p className={`text-2xl font-bold ${
              kpis.conversion.imageInclusion >= 98 ? "text-green-600" : "text-red-600"
            }`}>
              {kpis.conversion.imageInclusion}%
            </p>
            <p className="text-xs text-gray-500">목표: ≥98%</p>
          </div>
          <div className="p-4 bg-white rounded-lg shadow">
            <p className="text-sm text-gray-600">AI 제목 채택률</p>
            <p className={`text-2xl font-bold ${
              kpis.conversion.aiTitleAdoption >= 75 ? "text-green-600" : "text-red-600"
            }`}>
              {kpis.conversion.aiTitleAdoption}%
            </p>
            <p className="text-xs text-gray-500">목표: ≥75%</p>
          </div>
        </div>
      </section>

      {/* 리텐션 지표 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">리텐션 지표</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-white rounded-lg shadow">
            <p className="text-sm text-gray-600">DAU/MAU</p>
            <p className={`text-2xl font-bold ${
              kpis.retention.dauMau >= 40 ? "text-green-600" : "text-red-600"
            }`}>
              {kpis.retention.dauMau}%
            </p>
            <p className="text-xs text-gray-500">목표: ≥40%</p>
          </div>
          <div className="p-4 bg-white rounded-lg shadow">
            <p className="text-sm text-gray-600">주간 재방문율</p>
            <p className={`text-2xl font-bold ${
              kpis.retention.weeklyReturn >= 3.5 ? "text-green-600" : "text-red-600"
            }`}>
              {kpis.retention.weeklyReturn}회
            </p>
            <p className="text-xs text-gray-500">목표: ≥3.5회</p>
          </div>
          <div className="p-4 bg-white rounded-lg shadow">
            <p className="text-sm text-gray-600">노쇼율</p>
            <p className={`text-2xl font-bold ${
              kpis.retention.noShow <= 5 ? "text-green-600" : "text-red-600"
            }`}>
              {kpis.retention.noShow}%
            </p>
            <p className="text-xs text-gray-500">목표: ≤5%</p>
          </div>
        </div>
      </section>

      {/* 수익화 지표 */}
      <section>
        <h2 className="text-xl font-semibold mb-4">수익화 지표</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-white rounded-lg shadow">
            <p className="text-sm text-gray-600">ARPU</p>
            <p className={`text-2xl font-bold ${
              kpis.revenue.arpu >= 2000 ? "text-green-600" : "text-red-600"
            }`}>
              {kpis.revenue.arpu.toLocaleString()}원
            </p>
            <p className="text-xs text-gray-500">목표: ≥2,000원</p>
          </div>
          <div className="p-4 bg-white rounded-lg shadow">
            <p className="text-sm text-gray-600">광고 CTR</p>
            <p className={`text-2xl font-bold ${
              kpis.revenue.adCTR >= 2.5 ? "text-green-600" : "text-red-600"
            }`}>
              {kpis.revenue.adCTR}%
            </p>
            <p className="text-xs text-gray-500">목표: ≥2.5%</p>
          </div>
          <div className="p-4 bg-white rounded-lg shadow">
            <p className="text-sm text-gray-600">월 매출</p>
            <p className={`text-2xl font-bold ${
              kpis.revenue.monthlyRevenue >= 230000000 ? "text-green-600" : "text-red-600"
            }`}>
              {(kpis.revenue.monthlyRevenue / 100000000).toFixed(1)}억원
            </p>
            <p className="text-xs text-gray-500">목표: ≥2.3억원</p>
          </div>
        </div>
      </section>
    </div>
  );
}
```

---

## 🎯 실행 계획

### Week 1: 쿼리 구현
- Day 1-2: 전환율 지표 쿼리 (#1, #2, #3)
- Day 3-4: 리텐션 지표 쿼리 (#4, #5, #6)
- Day 5-7: 수익화 지표 쿼리 (#7, #8, #9)

### Week 2: 대시보드 구축
- Day 8-10: 통합 쿼리 + 스케줄러
- Day 11-14: UI 컴포넌트 + 알림 시스템

---

**KPI 대시보드 쿼리 세트 완성**
