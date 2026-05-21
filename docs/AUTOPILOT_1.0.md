# 🚀 무인 운영 오토파일럿 1.0

> **목표**: 지표 보고 스스로 움직이는 시스템

---

## 🎯 핵심 기능

### 1. CTR 하락 → 스토리 자동 교체
- **조건**: CTR < 2%
- **액션**: 가장 낮은 점수 스토리 만료 → 새 구장 예약 스토리 생성

### 2. Reserve CR 하락 → 할인 자동 ON
- **조건**: Reserve CR < 18%
- **액션**: 할인 캠페인 자동 생성

### 3. PayFail 급등 → 결제 보호 모드
- **조건**: PayFail Rate > 5%
- **액션**: 결제 보호 모드 활성화 (로깅 강화, 재시도 증가)

### 4. FillRate 부족 → 슬롯 보충 필요
- **조건**: FillRate < 100%
- **액션**: 운영자에게 슬롯 부족 알림

### 5. 팀 가입 부족 → 모집 스토리 부스팅
- **조건**: 일 가입 < 2명
- **액션**: 모집 스토리 우선순위 상승 (최대 2개)

### 6. 취소율 급등 → 운영자 알림
- **조건**: 취소율 > 12%
- **액션**: Critical 알림 발송

---

## 📋 룰 엔진

### Signal 타입
```typescript
type Signal = {
  ctr: number;           // Story CTR
  reserveCr: number;     // Reserve Conversion Rate
  payFail: number;       // Payment Fail Rate
  fillRate: number;      // Story Fill Rate (0-1)
  teamJoins: number;     // Daily team joins
  cancelRate: number;    // Cancellation rate
};
```

### Action 타입
```typescript
type Action =
  | { type: "REPLACE_STORY"; reason: string }
  | { type: "DISCOUNT_ON"; reason: string }
  | { type: "PAY_PROTECT"; reason: string }
  | { type: "NEED_SLOT"; reason: string }
  | { type: "BOOST_RECRUIT"; reason: string }
  | { type: "ALERT_OPERATOR"; reason: string; severity: "warning" | "critical" };
```

### 액션 우선순위
1. **PAY_PROTECT** (최우선)
2. **ALERT_OPERATOR**
3. **REPLACE_STORY**
4. **NEED_SLOT**
5. **DISCOUNT_ON**
6. **BOOST_RECRUIT**

---

## 🔄 실행 흐름

### 1. Signal 수집
```typescript
// 최신 KPI 조회
const kpi = await prisma.dailyKpi.findFirst({
  where: { region },
  orderBy: { date: "desc" },
});

// Signal 구성
const signal: Signal = {
  ctr: kpi.storyCtr || 0,
  reserveCr: kpi.bookingCr || 0,
  payFail: payFailRate,
  fillRate,
  teamJoins,
  cancelRate,
};
```

### 2. 액션 결정
```typescript
const actions = decideAction(signal);
const prioritizedActions = prioritizeActions(actions);
```

### 3. 액션 실행
```typescript
for (const action of prioritizedActions) {
  await executeAction(action, region);
}
```

---

## ⏰ 스케줄링

### 30분마다 실행
```typescript
setInterval(async () => {
  try {
    await runAutopilotAllRegions();
  } catch (error) {
    console.error("[SCHEDULED] Autopilot error:", error);
  }
}, 30 * 60 * 1000); // 30분마다
```

### 지원 지역
- seoul
- busan
- incheon
- daegu
- gwangju

---

## 📊 액션 상세

### 1. REPLACE_STORY
```typescript
// 가장 낮은 점수 스토리 만료
await prisma.story.update({
  where: { id: lowStory.id },
  data: { status: "EXPIRED" },
});

// 새 구장 예약 스토리 생성
await prisma.story.create({
  data: {
    region,
    source: "OPS",
    category: "구장",
    title: "오늘 예약 가능한 구장",
    subtitle: "지금 바로 예약하고 경기하세요",
    status: "PUBLISHED",
    priority: 80,
    score: 50,
    ctaType: "book_ground",
  },
});
```

### 2. DISCOUNT_ON
```typescript
// 할인 캠페인 생성
await prisma.campaign.create({
  data: {
    region,
    trigger: "discount",
    msgA: "오늘 예약 10% 할인",
    msgB: "지금만 10% 혜택",
    status: "ACTIVE",
  },
});
```

### 3. PAY_PROTECT
```typescript
// 결제 보호 모드 활성화
// - PG 재시도 횟수 증가
// - 웹훅 타임아웃 증가
// - 결제 로그 상세 기록
```

### 4. NEED_SLOT
```typescript
// 운영자에게 슬롯 부족 알림
await prisma.eventLog.create({
  data: {
    eventName: "autopilot_action",
    metadata: JSON.stringify({
      action: "NEED_SLOT",
      reason,
      alert: true,
    }),
  },
});
```

### 5. BOOST_RECRUIT
```typescript
// 모집 스토리 우선순위 상승 (최대 2개)
for (const story of recruitStories.slice(0, 2)) {
  await prisma.story.update({
    where: { id: story.id },
    data: {
      priority: Math.min(story.priority + 20, 100),
      score: Math.min((story.score || 0) + 10, 100),
    },
  });
}
```

### 6. ALERT_OPERATOR
```typescript
// Critical 알림 발송
await prisma.eventLog.create({
  data: {
    eventName: "autopilot_action",
    metadata: JSON.stringify({
      action: "ALERT_OPERATOR",
      reason,
      severity: "critical",
    }),
  },
});
```

---

## 📝 로깅

### 액션 로그
모든 액션은 `EventLog`에 기록됩니다:

```typescript
await prisma.eventLog.create({
  data: {
    eventName: "autopilot_action",
    region,
    metadata: JSON.stringify({
      action: "REPLACE_STORY",
      reason,
      oldStoryId: lowStory?.id,
      newStoryId: newStory.id,
    }),
  },
});
```

### 콘솔 로그
```
[AUTO] 오토파일럿 실행 시작: seoul
[AUTO] seoul Signal: { ctr: '2.50%', reserveCr: '22.00%', ... }
[AUTO] seoul 실행할 액션 2개:
  1. REPLACE_STORY: CTR 1.50% < 2% 임계값
  2. DISCOUNT_ON: Reserve CR 15.00% < 18% 임계값
[AUTO] seoul 액션 실행 완료: REPLACE_STORY
[AUTO] seoul 액션 실행 완료: DISCOUNT_ON
[AUTO] seoul 오토파일럿 실행 완료
```

---

## ✅ 성공 기준

### 자동화 목표
- **CTR 하락**: 즉시 스토리 교체 (2분 이내)
- **CR 하락**: 할인 캠페인 자동 생성 (5분 이내)
- **PayFail 급등**: 결제 보호 모드 즉시 활성화
- **슬롯 부족**: 운영자 알림 즉시 발송

### 사람 개입 최소화
- **이전**: 운영자가 매일 지표 확인 → 수동 액션
- **이후**: 시스템이 자동 감지 → 자동 액션 → 운영자는 Critical만 확인

---

## 🚨 주의사항

### 1. 액션 실패 처리
- 액션 실패해도 다음 액션 계속 실행
- 오류는 콘솔에 기록

### 2. 중복 실행 방지
- 할인 캠페인: 이미 활성화된 캠페인이 있으면 스킵
- 스토리 교체: 최소 1개는 유지

### 3. 임계값 조정
- `domain/autopilot.rules.ts`에서 임계값 수정 가능
- 운영 데이터 기반으로 점진적 조정 권장

---

## 🔧 설정

### 임계값 변경
```typescript
// domain/autopilot.rules.ts
if (signal.ctr < 0.02) {  // 2% → 원하는 값으로 변경
  actions.push({ type: "REPLACE_STORY", ... });
}
```

### 실행 주기 변경
```typescript
// index.ts
setInterval(async () => {
  await runAutopilotAllRegions();
}, 30 * 60 * 1000); // 30분 → 원하는 주기로 변경
```

---

## 📈 다음 단계

### 무인 운영 모드 2.0 (향후)
- **ML 기반 예측**: 지표 하락 전 예방 액션
- **A/B 테스트 자동화**: 실험 결과 기반 자동 최적화
- **개인화 자동화**: 사용자별 맞춤 액션

---

## 🎁 최종 상태

우리가 만든 전체 라인:

1. ✅ 스토리 혼합D
2. ✅ 시즌 자동
3. ✅ 예약·결제·정산
4. ✅ AB·개인화
5. ✅ 마케팅
6. ✅ 대시보드
7. ✅ **오토파일럿** ← **완료**

➡ **실제 프로덕트 완결**
