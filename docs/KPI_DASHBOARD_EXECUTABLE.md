# 📊 KPI 대시보드 실행 세트

**목표**: 실시간 모니터링, 데이터 기반 의사결정  
**업데이트 주기**: 1분마다  
**알람 임계값**: 자동 알림 설정

---

## 🎯 핵심 지표 스키마

### Firestore 데이터 구조

```typescript
// kpi_dashboard/current
{
  // 전환율 지표
  conversion: {
    registrationToTrade: 35.2,    // 목표: ≥35%
    imageInclusion: 98.5,          // 목표: ≥98%
    aiTitleAdoption: 76.8,        // 목표: ≥75%
  },
  
  // 리텐션 지표
  retention: {
    dauMau: 42.3,                 // 목표: ≥40%
    weeklyReturn: 3.7,            // 목표: ≥3.5회
    noShow: 3.8,                  // 목표: ≤4%
  },
  
  // 수익화 지표
  revenue: {
    arpu: 2150,                   // 목표: ≥2,000원
    adCTR: 2.8,                   // 목표: ≥2.5%
    monthlyRevenue: 245000000,    // 목표: ≥2.3억원
  },
  
  // 메타데이터
  timestamp: Timestamp,
  updatedAt: Timestamp,
  version: "1.0.0",
}
```

---

## 📊 Firestore 쿼리 (즉시 사용)

### KPI #1: 등록→거래 전환율

```typescript
// functions/src/analytics/kpiQueries.ts

import { db, Timestamp } from "../firebase";

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

  // 거래 생성 수
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

---

### KPI #2: 이미지 포함률

```typescript
export async function getImageInclusionRate(
  startDate: Date,
  endDate: Date
): Promise<number> {
  const start = Timestamp.fromDate(startDate);
  const end = Timestamp.fromDate(endDate);

  const allRegistrations = await db
    .collection("market")
    .where("createdAt", ">=", start)
    .where("createdAt", "<=", end)
    .get();

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
export async function getAITitleAdoptionRate(
  startDate: Date,
  endDate: Date
): Promise<number> {
  const start = Timestamp.fromDate(startDate);
  const end = Timestamp.fromDate(endDate);

  const allRegistrations = await db
    .collection("market")
    .where("createdAt", ">=", start)
    .where("createdAt", "<=", end)
    .get();

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
export async function getDAUMAURatio(): Promise<number> {
  const now = new Date();
  const todayStart = new Date(now.setHours(0, 0, 0, 0));
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const today = Timestamp.fromDate(todayStart);
  const month = Timestamp.fromDate(monthStart);

  // DAU
  const dau = await db
    .collection("userEvents")
    .where("timestamp", ">=", today)
    .select("userId")
    .get();

  const dauCount = new Set(dau.docs.map(d => d.data().userId)).size;

  // MAU
  const mau = await db
    .collection("userEvents")
    .where("timestamp", ">=", month)
    .select("userId")
    .get();

  const mauCount = new Set(mau.docs.map(d => d.data().userId)).size;

  const ratio = mauCount > 0 ? (dauCount / mauCount) * 100 : 0;

  return parseFloat(ratio.toFixed(2));
}
```

---

### KPI #5: 주간 재방문율

```typescript
export async function getWeeklyReturnRate(): Promise<number> {
  const now = new Date();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const week = Timestamp.fromDate(weekStart);

  const weeklyUsers = await db
    .collection("userEvents")
    .where("timestamp", ">=", week)
    .select("userId")
    .get();

  const userIds = Array.from(new Set(weeklyUsers.docs.map(d => d.data().userId)));

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
export async function getNoShowRate(
  startDate: Date,
  endDate: Date
): Promise<number> {
  const start = Timestamp.fromDate(startDate);
  const end = Timestamp.fromDate(endDate);

  const allTrades = await db
    .collection("trades")
    .where("createdAt", ">=", start)
    .where("createdAt", "<=", end)
    .where("type", "==", "DIRECT_TRADE")
    .get();

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
export async function getARPU(
  startDate: Date,
  endDate: Date
): Promise<number> {
  const start = Timestamp.fromDate(startDate);
  const end = Timestamp.fromDate(endDate);

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

  const totalRevenue = tradeRevenue + adRevenue;

  // 활성 사용자 수
  const activeUsers = await db
    .collection("userEvents")
    .where("timestamp", ">=", start)
    .where("timestamp", "<=", end)
    .select("userId")
    .get();

  const userCount = new Set(activeUsers.docs.map(d => d.data().userId)).size;

  const arpu = userCount > 0 ? totalRevenue / userCount : 0;

  return parseFloat(arpu.toFixed(2));
}
```

---

### KPI #8: 광고 CTR

```typescript
export async function getAdCTR(
  startDate: Date,
  endDate: Date
): Promise<number> {
  const start = Timestamp.fromDate(startDate);
  const end = Timestamp.fromDate(endDate);

  const impressions = await db
    .collection("adImpressions")
    .where("timestamp", ">=", start)
    .where("timestamp", "<=", end)
    .get();

  const impressionCount = impressions.size;

  const clicks = await db
    .collection("adClicks")
    .where("timestamp", ">=", start)
    .where("timestamp", "<=", end)
    .get();

  const clickCount = clicks.size;

  const ctr = impressionCount > 0
    ? (clickCount / impressionCount) * 100
    : 0;

  return parseFloat(ctr.toFixed(2));
}
```

---

### KPI #9: 월 매출

```typescript
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

## 🔔 알람 조건

### 알람 임계값 설정

```typescript
// functions/src/analytics/kpiAlerts.ts

interface AlertThreshold {
  metric: string;
  operator: ">" | "<" | ">=" | "<=";
  value: number;
  severity: "critical" | "warning" | "info";
  channels: ("email" | "slack" | "push")[];
}

const ALERT_THRESHOLDS: AlertThreshold[] = [
  // 전환율 지표
  {
    metric: "conversion.registrationToTrade",
    operator: "<",
    value: 35,
    severity: "critical",
    channels: ["email", "slack"],
  },
  {
    metric: "conversion.imageInclusion",
    operator: "<",
    value: 98,
    severity: "warning",
    channels: ["slack"],
  },
  {
    metric: "conversion.aiTitleAdoption",
    operator: "<",
    value: 75,
    severity: "warning",
    channels: ["slack"],
  },
  
  // 리텐션 지표
  {
    metric: "retention.dauMau",
    operator: "<",
    value: 40,
    severity: "critical",
    channels: ["email", "slack"],
  },
  {
    metric: "retention.weeklyReturn",
    operator: "<",
    value: 3.5,
    severity: "warning",
    channels: ["slack"],
  },
  {
    metric: "retention.noShow",
    operator: ">",
    value: 4,
    severity: "critical",
    channels: ["email", "slack"],
  },
  
  // 수익화 지표
  {
    metric: "revenue.arpu",
    operator: "<",
    value: 2000,
    severity: "warning",
    channels: ["slack"],
  },
  {
    metric: "revenue.adCTR",
    operator: "<",
    value: 2.5,
    severity: "info",
    channels: ["slack"],
  },
  {
    metric: "revenue.monthlyRevenue",
    operator: "<",
    value: 230000000,
    severity: "critical",
    channels: ["email", "slack"],
  },
];

export async function checkKPIAlerts(kpis: any): Promise<void> {
  const alerts: string[] = [];

  for (const threshold of ALERT_THRESHOLDS) {
    const metricValue = getNestedValue(kpis, threshold.metric);
    
    if (metricValue === undefined) continue;

    let shouldAlert = false;
    
    switch (threshold.operator) {
      case "<":
        shouldAlert = metricValue < threshold.value;
        break;
      case ">":
        shouldAlert = metricValue > threshold.value;
        break;
      case "<=":
        shouldAlert = metricValue <= threshold.value;
        break;
      case ">=":
        shouldAlert = metricValue >= threshold.value;
        break;
    }

    if (shouldAlert) {
      const message = `🚨 [${threshold.severity.toUpperCase()}] ${threshold.metric}: ${metricValue} (목표: ${threshold.operator} ${threshold.value})`;
      alerts.push(message);
      
      // 알람 전송
      await sendAlerts(message, threshold.channels, threshold.severity);
    }
  }
}

function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((o, p) => o?.[p], obj);
}

async function sendAlerts(
  message: string,
  channels: string[],
  severity: string
): Promise<void> {
  // Slack, 이메일, 푸시 알림 전송
  console.log(`[${severity}] ${message}`, { channels });
}
```

---

## 📊 대시보드 위젯

### React 컴포넌트

```typescript
// src/components/admin/KPIDashboard.tsx

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface KPIData {
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
  updatedAt: any;
}

export default function KPIDashboard() {
  const [kpis, setKPIs] = useState<KPIData | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "kpi_dashboard", "current"),
      (snapshot) => {
        if (snapshot.exists()) {
          setKPIs(snapshot.data() as KPIData);
        }
      }
    );

    return () => unsubscribe();
  }, []);

  if (!kpis) return <div>로딩 중...</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">KPI 대시보드</h1>

      {/* 전환율 지표 */}
      <section>
        <h2 className="text-xl font-semibold mb-4">전환율 지표</h2>
        <div className="grid grid-cols-3 gap-4">
          <KPICard
            label="등록→거래 전환율"
            value={kpis.conversion.registrationToTrade}
            target={35}
            unit="%"
            higherIsBetter
          />
          <KPICard
            label="이미지 포함률"
            value={kpis.conversion.imageInclusion}
            target={98}
            unit="%"
            higherIsBetter
          />
          <KPICard
            label="AI 제목 채택률"
            value={kpis.conversion.aiTitleAdoption}
            target={75}
            unit="%"
            higherIsBetter
          />
        </div>
      </section>

      {/* 리텐션 지표 */}
      <section>
        <h2 className="text-xl font-semibold mb-4">리텐션 지표</h2>
        <div className="grid grid-cols-3 gap-4">
          <KPICard
            label="DAU/MAU"
            value={kpis.retention.dauMau}
            target={40}
            unit="%"
            higherIsBetter
          />
          <KPICard
            label="주간 재방문율"
            value={kpis.retention.weeklyReturn}
            target={3.5}
            unit="회"
            higherIsBetter
          />
          <KPICard
            label="노쇼율"
            value={kpis.retention.noShow}
            target={4}
            unit="%"
            higherIsBetter={false}
          />
        </div>
      </section>

      {/* 수익화 지표 */}
      <section>
        <h2 className="text-xl font-semibold mb-4">수익화 지표</h2>
        <div className="grid grid-cols-3 gap-4">
          <KPICard
            label="ARPU"
            value={kpis.revenue.arpu}
            target={2000}
            unit="원"
            higherIsBetter
          />
          <KPICard
            label="광고 CTR"
            value={kpis.revenue.adCTR}
            target={2.5}
            unit="%"
            higherIsBetter
          />
          <KPICard
            label="월 매출"
            value={kpis.revenue.monthlyRevenue / 100000000}
            target={2.3}
            unit="억원"
            higherIsBetter
          />
        </div>
      </section>
    </div>
  );
}

interface KPICardProps {
  label: string;
  value: number;
  target: number;
  unit: string;
  higherIsBetter: boolean;
}

function KPICard({ label, value, target, unit, higherIsBetter }: KPICardProps) {
  const isGood = higherIsBetter ? value >= target : value <= target;
  const diff = higherIsBetter ? value - target : target - value;
  const diffPercent = ((diff / target) * 100).toFixed(1);

  return (
    <div className={`p-4 rounded-lg shadow ${
      isGood ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
    }`}>
      <p className="text-sm text-gray-600 mb-2">{label}</p>
      <p className={`text-2xl font-bold mb-1 ${
        isGood ? "text-green-600" : "text-red-600"
      }`}>
        {value.toLocaleString()}{unit}
      </p>
      <p className="text-xs text-gray-500">
        목표: {target.toLocaleString()}{unit} 
        {!isGood && ` (${diffPercent > 0 ? "+" : ""}${diffPercent}% 차이)`}
      </p>
    </div>
  );
}
```

---

## ⚙️ 실시간 업데이트 스케줄러

```typescript
// functions/src/analytics/kpiDashboard.ts

import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import { getAllKPIs, checkKPIAlerts } from "./kpiQueries";
import { db, FieldValue } from "../firebase";

/**
 * KPI 대시보드 업데이트 (1분마다)
 */
export const updateKPIDashboard = onSchedule(
  { schedule: "* * * * *", timeZone: "Asia/Seoul" },
  async () => {
    try {
      const now = new Date();
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const kpis = await getAllKPIs(weekStart, now, monthStart);

      // KPI 대시보드 문서 업데이트
      await db.collection("kpi_dashboard").doc("current").set({
        ...kpis,
        updatedAt: FieldValue.serverTimestamp(),
        version: "1.0.0",
      });

      // KPI 알람 체크
      await checkKPIAlerts(kpis);

      logger.info("[updateKPIDashboard] KPI 대시보드 업데이트 완료", { kpis });
    } catch (error: any) {
      logger.error("[updateKPIDashboard] 오류:", error);
    }
  }
);
```

---

## 🎯 실행 체크리스트

### Week 1: 쿼리 구현

- [ ] Day 1-2: 전환율 지표 쿼리 (#1, #2, #3)
- [ ] Day 3-4: 리텐션 지표 쿼리 (#4, #5, #6)
- [ ] Day 5-7: 수익화 지표 쿼리 (#7, #8, #9)

### Week 2: 대시보드 구축

- [ ] Day 8-10: 통합 쿼리 + 스케줄러
- [ ] Day 11-14: UI 컴포넌트 + 알람 시스템

---

**KPI 대시보드 실행 세트 완성**
