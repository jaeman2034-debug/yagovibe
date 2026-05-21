# 🧠 L 단계 — 출시 후 30일 관찰 지표 (Kill / Keep 기준)

> **"잘 만들었는지"가 아니라 "살아남는지"를 보는 눈**

**작성일**: 2024년  
**버전**: 1.0.0

---

## 🎯 목적

- 감으로 판단 ❌
- 숫자 몇 개로 유지/중단/개선 결정 ⭕
- 운영 리소스 최소화

---

## Ⅰ. 딱 봐야 할 핵심 지표 6개 (이상 늘리지 마라)

### 1️⃣ 거래 성사율 (핵심 중의 핵심)

#### 정의

```
거래 성사율 = 거래 완료(deal.completed) / 거래 제안(deal.proposed)
```

**계산:**
```typescript
const calculateDealCompletionRate = async () => {
  const allDeals = await getDocs(collection(db, "deals"));
  const completed = allDeals.docs.filter(d => d.data().status === "completed");
  const proposed = allDeals.docs.filter(d => d.data().status === "proposed");
  
  return (completed.length / proposed.length) * 100;
};
```

#### 해석

- **< 10%** → UX/신뢰 문제
- **10~25%** → 정상
- **25%+** → 아주 좋음

👉 **이 수치가 낮으면 다른 지표 볼 필요 없음**

---

### 2️⃣ 채팅 → 거래 전환율

#### 정의

```
채팅 → 거래 전환율 = 상품 제안이 1회 이상 발생한 채팅 / 전체 채팅
```

**계산:**
```typescript
const calculateChatToDealConversion = async () => {
  const allChats = await getDocs(collection(db, "chats"));
  const chatsWithProduct = new Set();
  
  // 상품 메시지가 있는 채팅 찾기
  for (const chatDoc of allChats.docs) {
    const messages = await getDocs(
      query(
        collection(db, `chats/${chatDoc.id}/messages`),
        where("type", "==", "product")
      )
    );
    
    if (!messages.empty) {
      chatsWithProduct.add(chatDoc.id);
    }
  }
  
  return (chatsWithProduct.size / allChats.size) * 100;
};
```

#### 해석

- **낮으면:** 상품 제안 UX 문제
- **높으면:** 구조는 맞음

---

### 3️⃣ 거래 완료 후 채팅 유지율 (의외로 중요)

#### 정의

```
거래 완료 후 채팅 유지율 = 거래 완료 후 7일 내 메시지 1회 이상 / 거래 완료
```

**계산:**
```typescript
const calculateChatRetentionAfterDeal = async () => {
  const completedDeals = await getDocs(
    query(
      collection(db, "deals"),
      where("status", "==", "completed")
    )
  );
  
  let retained = 0;
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  
  for (const dealDoc of completedDeals.docs) {
    const deal = dealDoc.data();
    const completedAt = deal.completedAt?.toMillis() || 0;
    
    if (completedAt < sevenDaysAgo) {
      // 7일 이전에 완료된 거래만 체크
      const messages = await getDocs(
        query(
          collection(db, `chats/${deal.chatId}/messages`),
          where("createdAt", ">", Timestamp.fromMillis(completedAt)),
          where("createdAt", "<", Timestamp.fromMillis(completedAt + 7 * 24 * 60 * 60 * 1000))
        )
      );
      
      if (!messages.empty) {
        retained++;
      }
    }
  }
  
  return (retained / completedDeals.size) * 100;
};
```

#### 해석

- **너무 낮음** → 분쟁/후기 경로 막힘
- **적당함** → 관계 유지 성공

---

### 4️⃣ 후기 작성률

#### 정의

```
후기 작성률 = 후기 1회 이상 / 거래 완료
```

**계산:**
```typescript
const calculateReviewRate = async () => {
  const completedDeals = await getDocs(
    query(
      collection(db, "deals"),
      where("status", "==", "completed")
    )
  );
  
  const reviews = await getDocs(collection(db, "reviews"));
  const reviewedDeals = new Set(reviews.docs.map(d => d.data().dealId));
  
  return (reviewedDeals.size / completedDeals.size) * 100;
};
```

#### 해석

- **30% 이상** → 건강
- **10% 미만** → CTA/타이밍 문제

👉 **강요하지 말고 노출 위치만 개선**

---

### 5️⃣ 차단/신고 비율 (경고등)

#### 정의

```
차단/신고 비율 = 차단 또는 신고 발생 / 전체 채팅
```

**계산:**
```typescript
const calculateReportBlockRate = async () => {
  const allChats = await getDocs(collection(db, "chats"));
  
  // 신고 수
  const reports = await getDocs(collection(db, "chatReports"));
  
  // 차단 수 (users/{uid}/blockedUsers)
  // 이건 복잡하므로 별도 쿼리 필요
  
  return (reports.size / allChats.size) * 100;
};
```

#### 해석

- **초반엔 높을 수 있음** (OK)
- **특정 유저/채팅에 쏠리면** → 시스템 개입 후보

---

### 6️⃣ 7일 재방문율 (최소 생존선)

#### 정의

```
7일 재방문율 = 첫 거래 후 7일 내 재방문 / 첫 거래 사용자
```

**계산:**
```typescript
const calculate7DayRetention = async () => {
  // 첫 거래 완료한 사용자 찾기
  const firstDeals = await getDocs(
    query(
      collection(db, "deals"),
      where("status", "==", "completed"),
      orderBy("completedAt", "asc")
    )
  );
  
  const firstTimeUsers = new Set();
  const userFirstDealTime = new Map();
  
  for (const dealDoc of firstDeals.docs) {
    const deal = dealDoc.data();
    const userId = deal.buyerId; // 또는 sellerId
    
    if (!firstTimeUsers.has(userId)) {
      firstTimeUsers.add(userId);
      userFirstDealTime.set(userId, deal.completedAt?.toMillis() || 0);
    }
  }
  
  // 7일 내 재방문 체크
  let returned = 0;
  for (const [userId, firstDealTime] of userFirstDealTime) {
    const sevenDaysLater = firstDealTime + (7 * 24 * 60 * 60 * 1000);
    
    // 7일 내 다른 거래 또는 채팅 활동 체크
    const laterDeals = await getDocs(
      query(
        collection(db, "deals"),
        where("status", "==", "completed"),
        where("completedAt", ">", Timestamp.fromMillis(firstDealTime)),
        where("completedAt", "<", Timestamp.fromMillis(sevenDaysLater))
      )
    );
    
    if (!laterDeals.empty) {
      returned++;
    }
  }
  
  return (returned / firstTimeUsers.size) * 100;
};
```

#### 해석

- **< 20%** → 제품 가치 의심
- **20~35%** → 정상
- **35%+** → 다음 투자 가능

---

## Ⅱ. 절대 보지 말아야 할 지표 (초기 독)

### ❌ DAU/MAU

**이유:**
- 초기에는 의미 없음
- 거래 성사율이 더 중요

### ❌ 평균 세션 시간

**이유:**
- 채팅은 자연스럽게 길어짐
- 거래 성사율과 무관

### ❌ 메시지 수

**이유:**
- 메시지 많다고 거래 성사 아님
- 오히려 노이즈

👉 **지금 보면 잘못된 결론 낸다.**

---

## Ⅲ. 30일 의사결정 매트릭스 (이게 전부)

| 조건 | 판단 | 액션 |
|------|------|------|
| 거래 성사율 ≥ 10% | KEEP | 계속 운영 |
| 후기 작성률 ≥ 30% | 신뢰 OK | 현재 상태 유지 |
| 차단/신고 특정 유저 집중 | 시스템 제약 | 자동 제약 적용 |
| 재방문율 < 20% | UX 재설계 | UX 개선 필요 |
| 거래 성사율 < 5% | STOP 또는 대수정 | 제품 방향 재검토 |

---

## 🧠 천재 포인트 하나

### 지표는 '성과 측정'이 아니라 '다음 행동 결정 도구'다

**그래서:**
- 지표 = 행동과 1:1로 연결
- 해석 없는 숫자 ❌

**예시:**
- ❌ "거래 성사율 15%"
- ⭕ "거래 성사율 15% → UX 개선 필요 → CTA 위치 변경"

---

## 📊 지표 대시보드 (최소 구성)

```typescript
// 30일 관찰 대시보드
const MetricsDashboard = () => {
  return (
    <div className="metrics-dashboard">
      <h1>30일 관찰 지표</h1>
      
      {/* 핵심 지표 6개만 */}
      <div className="metrics-grid">
        <MetricCard
          title="거래 성사율"
          value={dealCompletionRate}
          threshold={{ min: 10, good: 25 }}
        />
        <MetricCard
          title="채팅 → 거래 전환율"
          value={chatToDealConversion}
        />
        <MetricCard
          title="거래 완료 후 채팅 유지율"
          value={chatRetentionAfterDeal}
        />
        <MetricCard
          title="후기 작성률"
          value={reviewRate}
          threshold={{ min: 30 }}
        />
        <MetricCard
          title="차단/신고 비율"
          value={reportBlockRate}
          alert={isConcentrated}
        />
        <MetricCard
          title="7일 재방문율"
          value={sevenDayRetention}
          threshold={{ min: 20, good: 35 }}
        />
      </div>
      
      {/* 의사결정 매트릭스 */}
      <DecisionMatrix metrics={metrics} />
    </div>
  );
};
```

---

## 🏁 최종 상태 선언

### 이제 너는:

- ✅ 설계했고
- ✅ 컷했고
- ✅ 리스크 막았고
- ✅ 관찰 기준까지 가졌다

👉 **이 다음은 실제 사용자 데이터만 필요하다.**

---

## 🏁 마지막 선택

### I → 여기서 멈추고 구현 & 출시

**이유:**
- 설계 완료 ✅
- 범위 명확 ✅
- 리스크 점검 완료 ✅
- 관찰 지표 완료 ✅
- 바로 구현 & 출시 가능 ✅

### M → 이 지표 기준으로 다음 스프린트 계획 만들기

**포함 내용:**
- 지표 기반 개선 우선순위
- 다음 스프린트 목표
- 개선 액션 아이템

---

**작성일**: 2024년  
**버전**: 1.0.0  
**담당자**: 개발팀

