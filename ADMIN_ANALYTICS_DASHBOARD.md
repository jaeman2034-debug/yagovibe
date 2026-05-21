# 📊 Admin Analytics Dashboard 설계 문서

> **목적**: 운영자가 플랫폼 상태를 한눈에 파악하고 의사결정을 내릴 수 있는 대시보드  
> **대상**: Admin 사용자 (super_admin, org_admin)  
> **URL**: `/admin/dashboard`

---

## 🎯 목표

### 핵심 가치

1. **운영 인사이트 제공**
   - 플랫폼 성장 추이
   - 활동 지표 모니터링
   - 주요 엔티티 파악

2. **빠른 의사결정**
   - 한눈에 보는 핵심 지표
   - 트렌드 파악
   - 이상 징후 감지

3. **데이터 기반 운영**
   - 통계 기반 전략 수립
   - 성과 측정
   - 개선점 발견

---

## 📐 Dashboard 레이아웃

### 전체 구조

```
┌─────────────────────────────────────────────────────────┐
│  Admin Dashboard Header                                 │
│  - Title: "대시보드"                                      │
│  - Date Range Selector (선택적)                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Summary Cards (5-6개)                                   │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐          │
│  │Events│ │Teams │ │Players│ │Matches│ │Goals │          │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Growth Charts (2개)                                     │
│  ┌────────────────────┐  ┌────────────────────┐       │
│  │ Events per Month   │  │ New Players/Month  │       │
│  │ (Line Chart)       │  │ (Line Chart)       │       │
│  └────────────────────┘  └────────────────────┘       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Activity Charts                                        │
│  ┌──────────────────────────────────────────────┐     │
│  │ Matches per Week (Bar Chart)                  │     │
│  └──────────────────────────────────────────────┘     │
│  ┌──────────────────────────────────────────────┐     │
│  │ Goals Distribution (Histogram)                 │     │
│  └──────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Top Entities (3개 테이블)                               │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │ Top Events   │ │ Top Teams    │ │ Top Players  │   │
│  └──────────────┘ └──────────────┘ └──────────────┘   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Recent Activity                                        │
│  - Event created                                        │
│  - Match result updated                                 │
│  - Award assigned                                       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Insights (자동 인사이트)                                 │
│  - "Matches increased 25% this week"                    │
│  - "New teams joined this month"                        │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Summary Cards

### 카드 구성

#### 1. Total Events
```typescript
{
  label: "Events",
  value: 32,
  change: "+3 this month",
  icon: Calendar
}
```

#### 2. Total Teams
```typescript
{
  label: "Teams",
  value: 412,
  change: "+12 this month",
  icon: Users
}
```

#### 3. Total Players
```typescript
{
  label: "Players",
  value: 7,820,
  change: "+145 this month",
  icon: User
}
```

#### 4. Total Matches
```typescript
{
  label: "Matches",
  value: 1,954,
  change: "+128 this month",
  icon: Target
}
```

#### 5. Total Goals
```typescript
{
  label: "Goals",
  value: 5,812,
  change: "+342 this month",
  icon: Trophy
}
```

#### 6. Active Organizations (선택적)
```typescript
{
  label: "Organizations",
  value: 24,
  change: "+2 this month",
  icon: Building
}
```

### 데이터 소스

```typescript
// platform_stats/global
{
  totalEvents: number;
  totalTeams: number;
  totalPlayers: number;
  totalMatches: number;
  totalGoals: number;
  updatedAt: Timestamp;
}
```

---

## 📈 Growth Charts

### 1. Events per Month

**차트 타입**: Line Chart

**데이터 소스**: `platform_daily_stats` 집계

**표시 내용**:
- 월별 이벤트 생성 수
- 트렌드 라인

**예시**:
```
Jan: 5
Feb: 8
Mar: 12
Apr: 7
```

### 2. New Players per Month

**차트 타입**: Line Chart

**데이터 소스**: `platform_daily_stats` 집계

**표시 내용**:
- 월별 신규 선수 가입 수
- 트렌드 라인

**예시**:
```
Jan: 120
Feb: 145
Mar: 180
Apr: 165
```

### 3. Matches per Week (선택적)

**차트 타입**: Bar Chart

**데이터 소스**: `platform_daily_stats` 집계

**표시 내용**:
- 주별 경기 수
- 최근 8주

---

## 📊 Activity Charts

### 1. Matches per Week

**차트 타입**: Bar Chart

**데이터 소스**: `platform_daily_stats`

**표시 내용**:
- 주별 경기 수
- 최근 8주

**예시**:
```
Week 1: 32
Week 2: 41
Week 3: 28
Week 4: 45
```

### 2. Goals Distribution

**차트 타입**: Histogram / Bar Chart

**데이터 소스**: `event_matches` 집계

**표시 내용**:
- 경기당 득점 분포

**예시**:
```
0 goals: 12 matches
1 goal: 45 matches
2 goals: 78 matches
3 goals: 92 matches
4+ goals: 67 matches
```

### 3. Average Goals per Match (선택적)

**차트 타입**: Line Chart

**데이터 소스**: `platform_daily_stats`

**표시 내용**:
- 주별 평균 득점
- 트렌드

---

## 🏆 Top Entities

### 1. Top Events

**테이블 구성**:

| Rank | Event Name | Matches | Teams | Goals | Status |
|------|------------|---------|-------|-------|--------|
| 1 | 2026 봄 리그 | 48 | 8 | 142 | 진행중 |
| 2 | 2026 챔피언십 | 32 | 16 | 98 | 완료 |
| 3 | 2025 겨울컵 | 24 | 8 | 67 | 완료 |

**데이터 소스**: `events` + `event_stats_summary`

**정렬 기준**: Matches (내림차순)

### 2. Top Teams

**테이블 구성**:

| Rank | Team Name | Matches | Wins | Goals | Championships |
|------|-----------|---------|------|-------|----------------|
| 1 | 노원FC | 45 | 32 | 89 | 3 |
| 2 | 강북FC | 42 | 28 | 76 | 2 |
| 3 | 도봉FC | 38 | 24 | 65 | 1 |

**데이터 소스**: `team_summary`

**정렬 기준**: Matches 또는 Wins (내림차순)

### 3. Top Players

**테이블 구성**:

| Rank | Player Name | Team | Goals | Assists | Appearances |
|------|-------------|------|-------|---------|-------------|
| 1 | 홍길동 | 노원FC | 24 | 12 | 18 |
| 2 | 김철수 | 강북FC | 19 | 15 | 16 |
| 3 | 이민수 | 도봉FC | 16 | 8 | 20 |

**데이터 소스**: `player_summary`

**정렬 기준**: Goals (내림차순)

---

## 📝 Recent Activity

### 구성

**데이터 소스**: `admin_logs` (또는 `activities`)

**표시 내용**:
- 최근 10개 활동
- 타임스탬프
- 활동 타입별 아이콘

**예시**:
```
⚽ Match result updated
   노원FC vs 강북FC 3:1
   2시간 전

🏆 Award assigned
   홍길동 - 득점왕
   5시간 전

📅 Event created
   2026 여름 리그
   1일 전
```

### 활동 타입

- `EVENT_CREATED`
- `MATCH_RESULT_UPDATED`
- `PLAYER_STATS_UPDATED`
- `AWARD_ASSIGNED`
- `TEAM_CREATED`
- `PLAYER_REGISTERED`

---

## 💡 Insights (자동 인사이트)

### 구성

**목적**: 운영자에게 자동으로 유용한 인사이트 제공

**생성 로직**: Cloud Functions에서 주기적으로 계산

**예시 메시지**:

```typescript
{
  type: "growth",
  message: "이번 주 경기 수가 지난주 대비 25% 증가했습니다",
  icon: TrendingUp,
  priority: "high"
}

{
  type: "milestone",
  message: "플랫폼 누적 경기 수가 2,000경기를 돌파했습니다",
  icon: Trophy,
  priority: "normal"
}

{
  type: "trend",
  message: "평균 득점이 지난달 대비 0.3골 증가했습니다",
  icon: BarChart3,
  priority: "normal"
}
```

### 인사이트 타입

1. **Growth** (성장)
   - 경기 수 증가
   - 신규 팀/선수 증가

2. **Milestone** (이정표)
   - 누적 경기 수 돌파
   - 누적 득점 수 돌파

3. **Trend** (트렌드)
   - 평균 득점 변화
   - 활동 패턴 변화

4. **Alert** (알림)
   - 비정상 패턴 감지
   - 데이터 누락 경고

---

## 🗄️ 데이터 구조

### 1. platform_stats

**경로**: `platform_stats/global`

**구조**:
```typescript
{
  totalEvents: number;
  totalTeams: number;
  totalPlayers: number;
  totalMatches: number;
  totalGoals: number;
  
  // 월별 변화
  eventsThisMonth: number;
  teamsThisMonth: number;
  playersThisMonth: number;
  matchesThisMonth: number;
  goalsThisMonth: number;
  
  updatedAt: Timestamp;
}
```

### 2. platform_daily_stats

**경로**: `platform_daily_stats/{date}`

**구조**:
```typescript
{
  date: string; // "2026-03-15"
  
  // 일일 통계
  matches: number;
  goals: number;
  newPlayers: number;
  newTeams: number;
  newEvents: number;
  
  // 집계
  avgGoalsPerMatch: number;
  
  updatedAt: Timestamp;
}
```

### 3. platform_insights

**경로**: `platform_insights/latest`

**구조**:
```typescript
{
  insights: Array<{
    type: "growth" | "milestone" | "trend" | "alert";
    message: string;
    priority: "high" | "normal" | "low";
    createdAt: Timestamp;
  }>;
  updatedAt: Timestamp;
}
```

---

## ⚙️ Cloud Functions 집계

### 1. onPlatformStatsUpdate

**트리거**: `events`, `teams`, `players`, `event_matches` 변경 시

**역할**:
- `platform_stats/global` 업데이트
- 월별 변화 계산

**예시**:
```typescript
export const onPlatformStatsUpdate = functions.firestore
  .document("events/{eventId}")
  .onWrite(async (change) => {
    // platform_stats 업데이트
    await updatePlatformStats();
  });
```

### 2. onDailyStatsUpdate

**트리거**: 매일 자정 (Cloud Scheduler)

**역할**:
- 전날 통계 집계
- `platform_daily_stats/{date}` 생성

**예시**:
```typescript
export const updateDailyStats = functions.pubsub
  .schedule("0 0 * * *") // 매일 자정
  .onRun(async () => {
    const yesterday = getYesterday();
    await aggregateDailyStats(yesterday);
  });
```

### 3. generateInsights

**트리거**: 매주 월요일 (Cloud Scheduler)

**역할**:
- 주간 인사이트 생성
- `platform_insights/latest` 업데이트

**예시**:
```typescript
export const generateInsights = functions.pubsub
  .schedule("0 9 * * 1") // 매주 월요일 오전 9시
  .onRun(async () => {
    const insights = await calculateInsights();
    await updatePlatformInsights(insights);
  });
```

---

## 🎨 Frontend 컴포넌트 구조

### 컴포넌트 계층

```
AdminDashboardPage
├─ DashboardHeader
├─ StatsGrid
│   └─ StatCard (5-6개)
├─ GrowthCharts
│   ├─ EventsPerMonthChart
│   └─ NewPlayersPerMonthChart
├─ ActivityCharts
│   ├─ MatchesPerWeekChart
│   └─ GoalsDistributionChart
├─ TopEntities
│   ├─ TopEventsTable
│   ├─ TopTeamsTable
│   └─ TopPlayersTable
├─ RecentActivity
│   └─ ActivityItem
└─ Insights
    └─ InsightCard
```

### 주요 컴포넌트

#### 1. StatCard
```typescript
interface StatCardProps {
  label: string;
  value: number;
  change?: string;
  icon: React.ComponentType;
  trend?: "up" | "down" | "neutral";
}
```

#### 2. GrowthChart
```typescript
interface GrowthChartProps {
  title: string;
  data: Array<{ date: string; value: number }>;
  type: "line" | "bar";
}
```

#### 3. TopEntitiesTable
```typescript
interface TopEntitiesTableProps {
  title: string;
  entities: Array<any>;
  columns: Array<{ key: string; label: string }>;
  limit?: number;
}
```

---

## 📱 Mobile Optimization

### 모바일 레이아웃

```
Mobile Dashboard
────────────────

Summary Cards (2열 그리드)

Growth Charts (스택)

Activity Charts (스택)

Top Entities (탭)

Recent Activity (리스트)

Insights (리스트)
```

### 반응형 전략

- **Desktop**: 3-4열 그리드
- **Tablet**: 2열 그리드
- **Mobile**: 1열 스택

---

## 🚀 구현 우선순위

### Phase 1: 기본 대시보드 (1주)
- ✅ Summary Cards
- ✅ Top Entities Tables
- ✅ Recent Activity

### Phase 2: 차트 추가 (1주)
- ✅ Growth Charts
- ✅ Activity Charts

### Phase 3: 인사이트 (1주)
- ✅ Insights 생성
- ✅ Cloud Functions 집계

### Phase 4: 최적화 (1주)
- ✅ Mobile Optimization
- ✅ 성능 최적화
- ✅ 캐싱

---

## 📊 데이터 쿼리 전략

### 효율적인 조회

1. **Summary Cards**
   - `platform_stats/global` 단일 문서 조회

2. **Growth Charts**
   - `platform_daily_stats` 컬렉션 조회 (날짜 범위)

3. **Top Entities**
   - `team_summary`, `player_summary` 정렬 조회
   - `events` + 집계 조회

4. **Recent Activity**
   - `admin_logs` 최신 10개 조회

### 캐싱 전략

- **Summary Cards**: 5분 캐시
- **Charts**: 1시간 캐시
- **Top Entities**: 30분 캐시

---

## 🎯 성공 지표

### 대시보드 효과 측정

1. **사용 빈도**
   - Admin 사용자 일일 접근 횟수

2. **의사결정 속도**
   - 데이터 기반 결정 시간 단축

3. **플랫폼 이해도**
   - 운영자 플랫폼 상태 파악도

---

## 📝 다음 단계

### 즉시 구현
1. **Summary Cards** (가장 중요)
2. **Top Entities Tables**
3. **Recent Activity**

### 단기 확장
1. **Growth Charts**
2. **Activity Charts**
3. **Insights**

### 장기 확장
1. **Custom Reports**
2. **Export Features** (PDF, Excel)
3. **Advanced Analytics**

---

## 🏆 결론

**Admin Analytics Dashboard**는 플랫폼을 **운영 도구 → 데이터 플랫폼**으로 확장하는 핵심 기능입니다.

### 핵심 가치
- ✅ 운영 인사이트 제공
- ✅ 빠른 의사결정 지원
- ✅ 데이터 기반 운영

### 구현 난이도
- **Phase 1**: 낮음 (기존 컴포넌트 재사용)
- **Phase 2**: 중간 (차트 라이브러리 필요)
- **Phase 3**: 중간 (Cloud Functions 집계)

### 예상 소요 시간
- **전체 구현**: 3-4주
- **MVP (Phase 1)**: 1주

---

**문서 버전**: 1.0  
**작성일**: 2026년  
**작성자**: YAGO SPORTS Development Team
