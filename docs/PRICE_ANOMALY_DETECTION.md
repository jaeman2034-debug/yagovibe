# 🔥 가격 이상 탐지 엔진 설계

**목표**: 가이드 ±20% 초과 → 노출 -30% + 경고 UI  
**배포 상태**: ✅ 프로덕션 준비 완료

---

## 📊 탐지 공식

### 1. 지역별 평균 가격 대비 2σ 이상 벗어난 경우

```
편차 = |가격 - 지역 평균| / 표준편차

조건:
✅ 편차 ≥ 2σ (표준편차 2배)
✅ 카테고리: equipment
✅ 가격 > 0
```

**예시**:
```
지역 평균: 50,000원
표준편차: 10,000원
등록 가격: 75,000원

편차 = |75,000 - 50,000| / 10,000 = 2.5σ
→ 2σ 이상이므로 이상 탐지
```

---

### 2. 가격 가이드 대비 ±20% 초과

```
가이드 최소 = 추천 가격 × (1 - 0.2) = 추천 가격 × 0.8
가이드 최대 = 추천 가격 × (1 + 0.2) = 추천 가격 × 1.2

조건:
✅ 가격 < 가이드 최소 또는 가격 > 가이드 최대
✅ 가이드 정보 존재
```

**예시**:
```
추천 가격: 50,000원
가이드 범위: 40,000원 ~ 60,000원
등록 가격: 70,000원

→ 가이드 범위 초과이므로 이상 탐지
```

---

## 🔍 쿼리 조건

### 1. 지역별 평균 가격 계산

```typescript
// 최근 30일 유사 카테고리 게시물 조회
const daysAgo = Timestamp.fromDate(
  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
);

const postsSnap = await db
  .collection("market")
  .where("category", "==", category)
  .where("status", "==", "open")
  .where("createdAt", ">=", daysAgo)
  .where("price", ">", 0)
  .limit(100)
  .get();
```

---

### 2. 가격 이상 탐지 쿼리

```typescript
// 가격 이상 게시물 조회
const anomalyPosts = await db
  .collection("market")
  .where("priceAnomaly", "==", true)
  .where("status", "==", "open")
  .orderBy("updatedAt", "desc")
  .limit(50)
  .get();
```

---

### 3. 검수 큐 조회

```typescript
// 가격 이상 검수 큐 조회
const inspectionQueue = await db
  .collection("inspectionQueue")
  .where("reason", "==", "PRICE_ANOMALY")
  .where("priority", "==", "HIGH")
  .orderBy("createdAt", "desc")
  .limit(50)
  .get();
```

---

## ⚠️ 운영 규칙

### 1. 탐지 조건

**필수 조건**:
- ✅ 카테고리: `equipment` (중고 장비만)
- ✅ 가격 > 0
- ✅ 상태: `open`

**탐지 기준**:
- ✅ 지역 평균 대비 2σ 이상 벗어남
- ✅ 가격 가이드 대비 ±20% 초과

---

### 2. 자동 조치

**즉시 조치**:
1. 검수 큐 자동 등록 (`inspectionQueue`)
2. 노출 가중치 -30% 적용 (`exposurePenalty: 0.3`)
3. 판매자 알림 발송

**검수 큐 구조**:
```typescript
{
  postId: string;
  userId: string;
  reason: "PRICE_ANOMALY";
  details: {
    price: number;
    category: string;
    location?: string;
    deviation: number;
    anomalyReason: string;
  };
  priority: "HIGH";
  createdAt: Timestamp;
}
```

---

### 3. 노출 페널티 적용

```typescript
// 추천 피드 점수 계산 시
if (post.priceAnomaly === true && post.exposurePenalty) {
  const penalty = post.exposurePenalty || 0.3; // 기본 -30%
  totalScore = totalScore * (1 - penalty); // -30% 감소
}
```

---

### 4. 정상 범위 복귀 시

**자동 해제**:
- 가격 수정 후 정상 범위로 복귀
- `priceAnomaly: false`
- `exposurePenalty: 0`

---

## 💬 사용자 문구

### 1. 판매자 알림 (게시물 등록 시)

```
제목: 가격 이상 탐지
내용: 등록하신 게시물의 가격이 시장 평균과 크게 다릅니다. 검수 대기 중입니다.
```

---

### 2. 판매자 알림 (가격 수정 시)

```
제목: 가격 이상 탐지
내용: 수정하신 가격이 시장 평균과 크게 다릅니다. 검수 대기 중입니다.
```

---

### 3. 게시물 상세 화면 경고

```tsx
<PriceWarning
  priceAnomaly={post.priceAnomaly}
  priceAnomalyReason={post.priceAnomalyReason}
  priceAnomalyDeviation={post.priceAnomalyDeviation}
/>
```

**표시 문구**:
- "등록하신 가격이 시장 평균보다 높습니다. 검수 대기 중입니다."
- "등록하신 가격이 시장 평균보다 낮습니다. 검수 대기 중입니다."
- "등록하신 가격이 추천 가격 가이드를 벗어났습니다. 검수 대기 중입니다."

---

### 4. 게시물 카드 경고 배지

```tsx
{post.priceAnomaly && (
  <div className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
    <AlertTriangle className="w-3 h-3" />
    <span>가격 검수 중</span>
  </div>
)}
```

---

## 📈 모니터링 지표

### 1. 가격 이상 탐지율

```typescript
// 목표: ≤13% (가이드 이탈)
const anomalyRate = (anomalyPosts.length / totalPosts.length) * 100;
```

**측정 주기**: 매일 00:00 (Asia/Seoul)  
**알람 임계값**: > 13%

---

### 2. 검수 큐 대기 시간

```typescript
// 평균 검수 대기 시간
const avgWaitTime = inspectionQueue.docs.reduce((sum, doc) => {
  const createdAt = doc.data().createdAt.toDate();
  const now = new Date();
  return sum + (now.getTime() - createdAt.getTime());
}, 0) / inspectionQueue.size;
```

**측정 주기**: 매일 00:00 (Asia/Seoul)  
**목표**: 평균 24시간 이내

---

### 3. 가격 이상 해제율

```typescript
// 가격 수정 후 정상 범위 복귀 비율
const resolutionRate = (resolvedPosts.length / anomalyPosts.length) * 100;
```

**측정 주기**: 매일 00:00 (Asia/Seoul)  
**목표**: ≥ 70%

---

## 🚨 알람 조건

### 1. 가격 이상 탐지율 > 13%

```typescript
if (anomalyRate > 13) {
  await sendAlert({
    type: "PRICE_ANOMALY_ALERT",
    metric: "anomaly_rate",
    value: anomalyRate,
    threshold: 13,
    message: "가격 이상 탐지율이 목표치를 초과했습니다.",
  });
}
```

---

### 2. 검수 큐 대기 시간 > 48시간

```typescript
if (avgWaitTime > 48 * 60 * 60 * 1000) {
  await sendAlert({
    type: "INSPECTION_QUEUE_ALERT",
    metric: "avg_wait_time",
    value: avgWaitTime,
    threshold: 48 * 60 * 60 * 1000,
    message: "검수 큐 대기 시간이 48시간을 초과했습니다.",
  });
}
```

---

## 🔧 운영 체크리스트

### 일일 체크

- [ ] 가격 이상 탐지율 확인 (목표: ≤13%)
- [ ] 검수 큐 대기 시간 확인 (목표: 평균 24시간 이내)
- [ ] 가격 이상 해제율 확인 (목표: ≥70%)

### 주간 체크

- [ ] 가격 이상 탐지 임계값 조정 필요 여부 검토
- [ ] 노출 페널티 조정 필요 여부 검토
- [ ] 사용자 피드백 반영

### 월간 체크

- [ ] 가격 이상 탐지 효과 종합 분석
- [ ] 운영 규칙 개선

---

## 📝 운영 로그 형식

### 가격 이상 탐지 로그

```json
{
  "event": "PRICE_ANOMALY_DETECTED",
  "postId": "market_123",
  "price": 75000,
  "category": "equipment",
  "reason": "지역 평균 대비 고가",
  "deviation": 2.5,
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### 검수 큐 등록 로그

```json
{
  "event": "INSPECTION_QUEUE_ADDED",
  "postId": "market_123",
  "userId": "user_456",
  "reason": "PRICE_ANOMALY",
  "priority": "HIGH",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

---

**가격 이상 탐지 엔진 설계 완성**
