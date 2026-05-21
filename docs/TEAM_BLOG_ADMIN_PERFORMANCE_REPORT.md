# 📈 팀 블로그 관리자용 성과 리포트 UI 설계

## 📋 목적
"왜 Pro를 써야 하는지" 숫자로 설득하는 관리자 대시보드 UI

---

## 1️⃣ 리포트 카드 구성 (위에서 아래 순서)

### 카드 1: 핵심 성과 요약

```
┌─────────────────────────────────────────┐
│ 📊 팀 블로그 성과 (최근 7일)            │
│                                         │
│ 👀 방문자     42명                      │
│ 👆 CTA 클릭   11회                      │
│ 📝 블로그 조회 67회                      │
│ 🙋 가입 요청   3건                       │
└─────────────────────────────────────────┘
```

**데이터 소스:**
- `page_view_team_blog` 이벤트 집계
- `click_primary_cta` 이벤트 집계
- `click_blog_post` 이벤트 집계
- `click_join_team` 이벤트 집계

---

### 카드 2: 전환율 분석

```
┌─────────────────────────────────────────┐
│ 🎯 전환율 분석                           │
│                                         │
│ 방문 → CTA 클릭    26.2%                │
│ CTA → 가입 요청    27.3%                │
│ 가입 요청 → 승인   66.7%                 │
│                                         │
│ 💡 Pro로 업그레이드하면                  │
│    전환율이 평균 15% 향상됩니다          │
└─────────────────────────────────────────┘
```

**계산 공식:**
- 방문 → CTA 클릭: `click_primary_cta / page_view_team_blog * 100`
- CTA → 가입 요청: `click_join_team / click_primary_cta * 100`
- 가입 요청 → 승인: `membership_pending / click_join_team * 100`

---

### 카드 3: Pro 전환 기회

```
┌─────────────────────────────────────────┐
│ 💎 Pro로 더 키울 수 있는 기회            │
│                                         │
│ 🔍 검색 노출 강화                        │
│    현재: 월 120회                       │
│    Pro: 월 350회 예상                   │
│                                         │
│ 📝 자동 포스팅                           │
│    현재: 월 2개 (무료)                  │
│    Pro: 주 3회 (월 12개)                │
│                                         │
│ 📊 상세 통계                             │
│    현재: 기본 통계만                     │
│    Pro: 방문자 분석 + 전환 경로          │
└─────────────────────────────────────────┘
```

**조건부 표시:**
- `last7dVisitors >= 30` 일 때만 표시
- 또는 `click_join_team >= 3` 일 때만 표시

---

### 카드 4: 경쟁 팀 비교 (선택)

```
┌─────────────────────────────────────────┐
│ 📊 비슷한 팀과 비교                      │
│                                         │
│ 우리 팀                                 │
│ 방문자: 42명 (7일)                      │
│ 가입 요청: 3건                           │
│                                         │
│ Pro 팀 평균                             │
│ 방문자: 89명 (7일)                      │
│ 가입 요청: 7건                           │
│                                         │
│ 💡 Pro 팀은 평균 2.1배 더 많은 방문자   │
└─────────────────────────────────────────┘
```

**조건부 표시:**
- Pro 플랜 사용 팀이 10개 이상일 때만 표시

---

## 2️⃣ Pro 전환 유도 메시지 (카드별)

### 메시지 1: 성과 기반

```
🔥 이 팀 블로그가 반응을 얻고 있어요!

지난 7일간 42명이 방문했고,
가입 요청 3건이 들어왔습니다.

Pro로 업그레이드하면:
• 검색 노출 강화 (더 많은 방문자)
• 자동 홍보 (SNS 공유 최적화)
• 상세 통계 (방문자 분석)

[ 🚀 Pro 계속 사용하기 ]
```

---

### 메시지 2: 기회 비용 기반

```
💡 지금 Pro로 전환하면

이번 달 방문자 42명 × 2.1배 = 88명 예상
가입 요청 3건 × 2.3배 = 7건 예상

월 19,000원으로
팀 홍보 효과를 2배 이상 높일 수 있어요.

[ 🚀 Pro 시작하기 ]
```

---

### 메시지 3: 시간 절약 기반

```
🤖 AI가 대신 관리해드릴까요?

지금까지 블로그 관리를 위해
주 2시간씩 투자하셨다면,

Pro로 전환하면:
• 자동 포스팅 (시간 절약)
• 자동 홍보 (노력 절약)
• 자동 통계 (분석 절약)

월 19,000원 = 시간당 1,583원

[ 🚀 Pro로 관리 맡기기 ]
```

---

## 3️⃣ 리포트 UI 컴포넌트 구조

### AdminPerformanceReport 컴포넌트

```typescript
interface AdminPerformanceReportProps {
  teamId: string;
  teamSlug: string;
  period: '7d' | '30d';
  metrics: {
    visitors: number;
    ctaClicks: number;
    blogViews: number;
    joinRequests: number;
    approvals: number;
  };
  conversionRates: {
    visitToCTA: number;
    ctaToJoin: number;
    joinToApproval: number;
  };
  proOpportunities: {
    searchBoost: number;
    autoPosting: number;
    detailedStats: boolean;
  };
  showComparison?: boolean;
  comparisonData?: {
    proTeamAvg: {
      visitors: number;
      joinRequests: number;
    };
  };
}
```

---

## 4️⃣ 카드별 상세 문구

### 카드 1: 핵심 성과 요약

**제목:**
```
📊 팀 블로그 성과 (최근 {period})
```

**메트릭:**
```
👀 방문자     {visitors}명
👆 CTA 클릭   {ctaClicks}회
📝 블로그 조회 {blogViews}회
🙋 가입 요청   {joinRequests}건
```

**기간 선택:**
```
[ 최근 7일 ] [ 최근 30일 ]
```

---

### 카드 2: 전환율 분석

**제목:**
```
🎯 전환율 분석
```

**메트릭:**
```
방문 → CTA 클릭    {visitToCTA}%
CTA → 가입 요청    {ctaToJoin}%
가입 요청 → 승인   {joinToApproval}%
```

**인사이트:**
```
💡 Pro로 업그레이드하면
   전환율이 평균 15% 향상됩니다
```

---

### 카드 3: Pro 전환 기회

**제목:**
```
💎 Pro로 더 키울 수 있는 기회
```

**기회 1:**
```
🔍 검색 노출 강화
   현재: 월 {currentSearch}회
   Pro: 월 {proSearch}회 예상
```

**기회 2:**
```
📝 자동 포스팅
   현재: 월 2개 (무료)
   Pro: 주 3회 (월 12개)
```

**기회 3:**
```
📊 상세 통계
   현재: 기본 통계만
   Pro: 방문자 분석 + 전환 경로
```

---

### 카드 4: 경쟁 팀 비교

**제목:**
```
📊 비슷한 팀과 비교
```

**우리 팀:**
```
방문자: {ourVisitors}명 (7일)
가입 요청: {ourJoinRequests}건
```

**Pro 팀 평균:**
```
방문자: {proAvgVisitors}명 (7일)
가입 요청: {proAvgJoinRequests}건
```

**인사이트:**
```
💡 Pro 팀은 평균 {multiplier}배 더 많은 방문자
```

---

## 5️⃣ Pro 전환 CTA 버튼

### Primary CTA

**텍스트:**
```
🚀 Pro 계속 사용하기
```

**스타일:**
- 배경: Primary 색상 (#1E7F43)
- 텍스트: 흰색
- 크기: 큰 버튼 (48px 높이)

---

### Secondary CTA

**텍스트:**
```
기능 더 알아보기
```

**스타일:**
- 배경: 흰색
- 테두리: 1px solid Border
- 텍스트: Primary 색상

---

## 6️⃣ 조건부 표시 규칙

### 카드 3 (Pro 전환 기회)

**표시 조건:**
- `visitors >= 30` (최근 7일)
- OR `joinRequests >= 3` (최근 7일)

**숨김 조건:**
- 이미 Pro 플랜 사용 중
- `visitors < 10` AND `joinRequests < 1`

---

### 카드 4 (경쟁 팀 비교)

**표시 조건:**
- Pro 플랜 사용 팀이 10개 이상
- AND 우리 팀이 Free 플랜

**숨김 조건:**
- Pro 플랜 사용 팀이 10개 미만
- OR 이미 Pro 플랜 사용 중

---

## 7️⃣ 데이터 수집 로직

### 메트릭 계산

```typescript
// 방문자 수 (최근 7일)
const visitors = await countEvents('page_view_team_blog', {
  teamId,
  startDate: sevenDaysAgo,
  endDate: now,
});

// CTA 클릭 수
const ctaClicks = await countEvents('click_primary_cta', {
  teamId,
  startDate: sevenDaysAgo,
  endDate: now,
});

// 가입 요청 수
const joinRequests = await countEvents('click_join_team', {
  teamId,
  startDate: sevenDaysAgo,
  endDate: now,
});

// 전환율 계산
const visitToCTA = (ctaClicks / visitors) * 100;
const ctaToJoin = (joinRequests / ctaClicks) * 100;
```

---

## 8️⃣ 실제 사용 예시

### 시나리오: 방문자 42명, 가입 요청 3건

**표시되는 카드:**
1. ✅ 핵심 성과 요약
2. ✅ 전환율 분석
3. ✅ Pro 전환 기회 (조건 충족: visitors >= 30)
4. ❌ 경쟁 팀 비교 (Pro 팀 10개 미만 또는 조건 불충족)

**Pro 전환 메시지:**
```
🔥 이 팀 블로그가 반응을 얻고 있어요!

지난 7일간 42명이 방문했고,
가입 요청 3건이 들어왔습니다.

Pro로 업그레이드하면:
• 검색 노출 강화 (더 많은 방문자)
• 자동 홍보 (SNS 공유 최적화)
• 상세 통계 (방문자 분석)

[ 🚀 Pro 계속 사용하기 ]
```

---

## 9️⃣ 구현 체크리스트

### 프론트엔드

- [ ] AdminPerformanceReport 컴포넌트
- [ ] 메트릭 카드 4개
- [ ] 전환율 계산 로직
- [ ] Pro 전환 CTA 버튼
- [ ] 조건부 표시 로직

### 백엔드

- [ ] Analytics 이벤트 집계 API
- [ ] 전환율 계산 로직
- [ ] Pro 팀 평균 데이터 조회
- [ ] 조건부 표시 판단 로직

---

## 🔟 다음 단계

1. AdminPerformanceReport 컴포넌트 구현
2. Analytics 이벤트 집계 API 구현
3. Pro 전환 CTA 연동

