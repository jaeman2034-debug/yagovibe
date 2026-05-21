# 🔥 가격 이상 탐지 엔진 실전 세트

**목표**: 전환·분쟁·CS를 동시에 줄이는 최고 레버  
**배포 상태**: ✅ 프로덕션 준비 완료

---

## 📊 통계 공식 (즉시 실행)

### 1. 지역별 평균 가격 계산

```typescript
// 최근 30일 데이터 수집
const prices = [50000, 55000, 60000, 45000, 52000, ...];

// 평균 계산
const mean = prices.reduce((a, b) => a + b, 0) / prices.length;

// 표준편차 계산
const variance = prices.reduce((sum, price) => 
  sum + Math.pow(price - mean, 2), 0) / prices.length;
const stdDev = Math.sqrt(variance);

// 편차 계산 (Z-score)
const deviation = Math.abs(price - mean) / stdDev;

// 이상 탐지 조건
if (deviation >= 2) {
  // 이상 탐지
}
```

**예시**:
```
가격 목록: [50000, 55000, 60000, 45000, 52000]
평균(μ) = 52400원
표준편차(σ) = 5477원

등록 가격: 75000원
편차(Z) = |75000 - 52400| / 5477 = 4.12σ
→ 2σ 이상이므로 이상 탐지
```

---

### 2. 가격 가이드 편차 계산

```typescript
// 추천 가격 기준 범위 계산
const recommended = 50000;
const guideMin = recommended * 0.8; // 40000원
const guideMax = recommended * 1.2; // 60000원
const strictMin = recommended * 0.6; // 30000원
const strictMax = recommended * 1.4; // 70000원

// 편차 계산
let deviation = 0;
if (price < guideMin) {
  deviation = (guideMin - price) / recommended;
} else if (price > guideMax) {
  deviation = (price - guideMax) / recommended;
}

// 이상 탐지 조건
if (deviation > 0.2) {
  // ±20% 초과 → 일반 이상
  if (deviation > 0.4) {
    // ±40% 초과 → 임시 검수
  }
}
```

**예시**:
```
추천 가격: 50000원
등록 가격: 75000원

가이드 범위: 40000원 ~ 60000원 (±20%)
편차 = (75000 - 60000) / 50000 = 0.3 (30%)
→ ±20% 초과이므로 일반 이상

등록 가격: 80000원
편차 = (80000 - 60000) / 50000 = 0.4 (40%)
→ ±40% 초과이므로 임시 검수
```

---

## 🔍 쿼리 조건 (즉시 실행)

### 1. 지역별 평균 가격 계산 쿼리

```typescript
// Firestore Console → Query
Collection: market
Where:
  - category == "equipment"
  - status == "open"
  - createdAt >= (30일 전)
  - price > 0
Order by: createdAt (desc)
Limit: 100
```

---

### 2. 가격 이상 게시물 조회

```typescript
// Firestore Console → Query
Collection: market
Where:
  - priceAnomaly == true
  - status == "open"
Order by: updatedAt (desc)
Limit: 50
```

---

### 3. 임시 검수 게시물 조회

```typescript
// Firestore Console → Query
Collection: market
Where:
  - temporaryInspection == true
  - status == "open"
Order by: updatedAt (desc)
Limit: 50
```

---

### 4. 검수 큐 조회

```typescript
// Firestore Console → Query
Collection: inspectionQueue
Where:
  - reason == "PRICE_ANOMALY" OR reason == "TEMPORARY_INSPECTION"
  - priority == "HIGH" OR priority == "URGENT"
Order by: createdAt (desc)
Limit: 50
```

---

### 5. 6시간 후 재점검 대상 조회

```typescript
// Firestore Console → Query
Collection: inspectionQueue
Where:
  - reason == "TEMPORARY_INSPECTION"
  - recheckAt <= (현재 시간)
Order by: recheckAt (asc)
Limit: 50
```

---

## ⚠️ 운영 플레이북 (단계별 대응)

### 단계 1: ±20% 초과 (일반 이상)

**자동 조치**:
1. ✅ 검수 큐 등록 (`priority: HIGH`)
2. ✅ 노출 가중치 -30% 적용
3. ✅ 판매자 알림 발송

**판매자 알림**:
```
제목: 가격 이상 탐지
내용: 등록하신 게시물의 가격이 시장 평균과 크게 다릅니다. 검수 대기 중입니다.
```

**검수 큐 구조**:
```json
{
  "postId": "market_123",
  "userId": "user_456",
  "reason": "PRICE_ANOMALY",
  "priority": "HIGH",
  "details": {
    "price": 75000,
    "category": "equipment",
    "deviation": 0.3,
    "anomalyReason": "가격 가이드 대비 ±20% 초과"
  },
  "createdAt": "2024-01-01T12:00:00Z"
}
```

---

### 단계 2: ±40% 초과 (임시 검수)

**자동 조치**:
1. ✅ 검수 큐 등록 (`priority: URGENT`)
2. ✅ 노출 가중치 -30% 적용
3. ✅ 임시 검수 플래그 설정
4. ✅ 판매자 즉시 코칭 메시지 발송
5. ✅ 6시간 후 재점검 스케줄

**판매자 코칭 메시지**:
```
제목: 가격 임시 검수 안내
내용: 등록하신 가격이 추천 가격 가이드를 크게 벗어났습니다. 6시간 후 자동 재점검됩니다. 가격을 조정해주세요.
```

**검수 큐 구조**:
```json
{
  "postId": "market_123",
  "userId": "user_456",
  "reason": "TEMPORARY_INSPECTION",
  "priority": "URGENT",
  "details": {
    "price": 80000,
    "category": "equipment",
    "deviation": 0.4,
    "anomalyReason": "가격 가이드 대비 ±40% 초과 (임시 검수)",
    "isStrictAnomaly": true
  },
  "recheckAt": "2024-01-01T18:00:00Z",
  "createdAt": "2024-01-01T12:00:00Z"
}
```

---

### 단계 3: 6시간 후 재점검

**재점검 프로세스**:
1. ✅ 현재 가격 재확인
2. ✅ 가격 이상 탐지 재실행
3. ✅ 정상 범위 복귀 시:
   - `priceAnomaly: false`
   - `temporaryInspection: false`
   - `exposurePenalty: 0`
   - 검수 큐에서 제거
4. ✅ 여전히 이상인 경우:
   - 검수 큐 상태 업데이트
   - 추가 코칭 메시지 발송

**재점검 로그**:
```json
{
  "event": "PRICE_RECHECK",
  "postId": "market_123",
  "price": 75000,
  "previousPrice": 80000,
  "status": "RESOLVED",
  "timestamp": "2024-01-01T18:00:00Z"
}
```

---

## 💬 사용자 안내 문구 (복사-붙여넣기)

### 1. 판매자 알림 (일반 이상)

```
제목: 가격 이상 탐지
내용: 등록하신 게시물의 가격이 시장 평균과 크게 다릅니다. 검수 대기 중입니다.
```

---

### 2. 판매자 코칭 메시지 (임시 검수)

```
제목: 가격 임시 검수 안내
내용: 등록하신 가격이 추천 가격 가이드를 크게 벗어났습니다. 6시간 후 자동 재점검됩니다. 가격을 조정해주세요.
```

---

### 3. 게시물 상세 화면 경고 (일반 이상)

```tsx
<div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
  <p className="text-sm font-medium text-yellow-800">
    ⚠️ 가격 이상 탐지
  </p>
  <p className="text-xs text-yellow-600 mt-1">
    등록하신 가격이 시장 평균과 다릅니다. 검수 대기 중입니다.
  </p>
  {deviation && (
    <p className="text-xs text-yellow-500 mt-1">
      편차: {((deviation * 100).toFixed(1))}%
    </p>
  )}
</div>
```

---

### 4. 게시물 상세 화면 경고 (임시 검수)

```tsx
<div className="p-3 bg-red-50 border border-red-200 rounded-lg">
  <p className="text-sm font-medium text-red-800">
    🚨 가격 임시 검수
  </p>
  <p className="text-xs text-red-600 mt-1">
    등록하신 가격이 추천 가격 가이드를 크게 벗어났습니다.
  </p>
  <p className="text-xs text-red-600 mt-1">
    6시간 후 자동 재점검됩니다.
  </p>
  {deviation && (
    <p className="text-xs text-red-500 mt-1">
      편차: {((deviation * 100).toFixed(1))}%
    </p>
  )}
</div>
```

---

### 5. 게시물 카드 경고 배지

```tsx
{post.temporaryInspection ? (
  <div className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
    <AlertTriangle className="w-3 h-3" />
    <span>임시 검수</span>
  </div>
) : post.priceAnomaly ? (
  <div className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
    <AlertTriangle className="w-3 h-3" />
    <span>가격 검수 중</span>
  </div>
) : null}
```

---

## 📈 모니터링 지표 (일일 체크)

### 1. 가격 이상 탐지율

```typescript
// 목표: ≤9%
const totalPosts = await db
  .collection("market")
  .where("category", "==", "equipment")
  .where("status", "==", "open")
  .where("createdAt", ">=", dayStart)
  .get();

const anomalyPosts = await db
  .collection("market")
  .where("category", "==", "equipment")
  .where("status", "==", "open")
  .where("priceAnomaly", "==", true)
  .where("createdAt", ">=", dayStart)
  .get();

const anomalyRate = (anomalyPosts.size / totalPosts.size) * 100;
```

**측정 주기**: 매일 00:00 (Asia/Seoul)  
**알람 임계값**: > 9%

---

### 2. 임시 검수율

```typescript
// 목표: ≤2%
const temporaryInspectionPosts = await db
  .collection("market")
  .where("category", "==", "equipment")
  .where("status", "==", "open")
  .where("temporaryInspection", "==", true)
  .where("createdAt", ">=", dayStart)
  .get();

const temporaryInspectionRate = (temporaryInspectionPosts.size / totalPosts.size) * 100;
```

**측정 주기**: 매일 00:00 (Asia/Seoul)  
**알람 임계값**: > 2%

---

### 3. 정상 범위 복귀율

```typescript
// 목표: ≥75%
const resolvedPosts = await db
  .collection("ops_logs")
  .where("type", "==", "PRICE_RECHECK")
  .where("startedAt", ">=", dayStart)
  .get();

const resolvedCount = resolvedPosts.docs.filter(
  (doc) => doc.data().rechecked?.some((r: any) => r.status === "RESOLVED")
).length;

const resolutionRate = (resolvedCount / anomalyPosts.size) * 100;
```

**측정 주기**: 매일 00:00 (Asia/Seoul)  
**목표**: ≥ 75%

---

## 🚨 알람 조건

### 1. 가격 이상 탐지율 > 9%

```typescript
if (anomalyRate > 9) {
  await sendAlert({
    type: "PRICE_ANOMALY_ALERT",
    metric: "anomaly_rate",
    value: anomalyRate,
    threshold: 9,
    message: "가격 이상 탐지율이 목표치를 초과했습니다.",
  });
}
```

---

### 2. 임시 검수율 > 2%

```typescript
if (temporaryInspectionRate > 2) {
  await sendAlert({
    type: "TEMPORARY_INSPECTION_ALERT",
    metric: "temporary_inspection_rate",
    value: temporaryInspectionRate,
    threshold: 2,
    message: "임시 검수율이 목표치를 초과했습니다.",
  });
}
```

---

## 🔧 운영 체크리스트

### 일일 체크 (매일 00:00)

- [ ] 가격 이상 탐지율 확인 (목표: ≤9%)
- [ ] 임시 검수율 확인 (목표: ≤2%)
- [ ] 정상 범위 복귀율 확인 (목표: ≥75%)
- [ ] 재점검 처리율 확인 (목표: ≥90%)

### 주간 체크 (매주 월요일)

- [ ] 가격 이상 탐지 임계값 조정 필요 여부 검토
- [ ] 노출 페널티 조정 필요 여부 검토
- [ ] 판매자 코칭 메시지 효과 분석
- [ ] 사용자 피드백 반영

### 월간 체크 (매월 1일)

- [ ] 가격 이상 탐지 효과 종합 분석
- [ ] 운영 규칙 개선
- [ ] 통계 공식 최적화

---

## 📝 운영 로그 형식

### 가격 이상 탐지 로그

```json
{
  "event": "PRICE_ANOMALY_DETECTED",
  "postId": "market_123",
  "price": 75000,
  "category": "equipment",
  "reason": "가격 가이드 대비 ±20% 초과",
  "deviation": 0.3,
  "isStrictAnomaly": false,
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### 임시 검수 로그

```json
{
  "event": "TEMPORARY_INSPECTION",
  "postId": "market_123",
  "price": 80000,
  "category": "equipment",
  "reason": "가격 가이드 대비 ±40% 초과 (임시 검수)",
  "deviation": 0.4,
  "recheckAt": "2024-01-01T18:00:00Z",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### 재점검 로그

```json
{
  "event": "PRICE_RECHECK",
  "postId": "market_123",
  "price": 75000,
  "previousPrice": 80000,
  "status": "RESOLVED",
  "timestamp": "2024-01-01T18:00:00Z"
}
```

---

**가격 이상 탐지 엔진 실전 세트 완성**
