# 🔥 가격 이상 탐지 엔진 운영 플레이북

**목표**: 전환·분쟁·CS를 동시에 줄이는 최고 레버  
**배포 상태**: ✅ 프로덕션 준비 완료

---

## 📊 통계 계산식 (즉시 실행)

### 1. 지역별 평균 가격 계산

```typescript
// Step 1: 최근 30일 데이터 수집
const prices = [50000, 55000, 60000, 45000, 52000, ...];

// Step 2: 평균 계산
const mean = prices.reduce((a, b) => a + b, 0) / prices.length;

// Step 3: 분산 계산
const variance = prices.reduce((sum, price) => 
  sum + Math.pow(price - mean, 2), 0) / prices.length;

// Step 4: 표준편차 계산
const stdDev = Math.sqrt(variance);

// Step 5: 편차 계산 (Z-score)
const deviation = Math.abs(price - mean) / stdDev;

// Step 6: 이상 탐지 판정
if (deviation >= 2) {
  // 이상 탐지 (2σ 이상)
}
```

**예시 계산**:
```
입력: [50000, 55000, 60000, 45000, 52000]
평균(μ) = 52400원
분산 = 30000000
표준편차(σ) = 5477원

등록 가격: 75000원
편차(Z) = |75000 - 52400| / 5477 = 4.12σ
→ 2σ 이상이므로 이상 탐지
```

---

### 2. 가격 가이드 편차 계산

```typescript
// Step 1: 추천 가격 기준 범위 계산
const recommended = 50000;
const guideMin = recommended * 0.8; // 40000원 (±20% 최소)
const guideMax = recommended * 1.2; // 60000원 (±20% 최대)
const strictMin = recommended * 0.6; // 30000원 (±40% 최소)
const strictMax = recommended * 1.4; // 70000원 (±40% 최대)

// Step 2: 편차 계산
let deviation = 0;
if (price < guideMin) {
  deviation = (guideMin - price) / recommended; // 저가 편차
} else if (price > guideMax) {
  deviation = (price - guideMax) / recommended; // 고가 편차
}

// Step 3: 이상 탐지 판정
if (deviation > 0.2) {
  // ±20% 초과 → 일반 이상
  if (deviation > 0.4) {
    // ±40% 초과 → 임시 검수
  }
}
```

**예시 계산**:
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

## 🔍 Firestore 쿼리 조건 (즉시 실행)

### 1. 지역별 평균 가격 계산 쿼리

```typescript
// Firestore Console → Query
Collection: market
Where:
  - category == "equipment"
  - status == "open"
  - createdAt >= (30일 전 Timestamp)
  - price > 0
Order by: createdAt (desc)
Limit: 100
```

**Cloud Functions 코드**:
```typescript
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

### 2. 가격 이상 게시물 조회 쿼리

```typescript
// Firestore Console → Query
Collection: market
Where:
  - priceAnomaly == true
  - status == "open"
Order by: updatedAt (desc)
Limit: 50
```

**Cloud Functions 코드**:
```typescript
const anomalyPosts = await db
  .collection("market")
  .where("priceAnomaly", "==", true)
  .where("status", "==", "open")
  .orderBy("updatedAt", "desc")
  .limit(50)
  .get();
```

---

### 3. 임시 검수 게시물 조회 쿼리

```typescript
// Firestore Console → Query
Collection: market
Where:
  - temporaryInspection == true
  - status == "open"
Order by: updatedAt (desc)
Limit: 50
```

**Cloud Functions 코드**:
```typescript
const temporaryInspectionPosts = await db
  .collection("market")
  .where("temporaryInspection", "==", true)
  .where("status", "==", "open")
  .orderBy("updatedAt", "desc")
  .limit(50)
  .get();
```

---

### 4. 검수 큐 조회 쿼리

```typescript
// Firestore Console → Query
Collection: inspectionQueue
Where:
  - reason == "PRICE_ANOMALY" OR reason == "TEMPORARY_INSPECTION"
  - priority == "HIGH" OR priority == "URGENT"
Order by: createdAt (desc)
Limit: 50
```

**Cloud Functions 코드**:
```typescript
// 일반 이상
const normalQueue = await db
  .collection("inspectionQueue")
  .where("reason", "==", "PRICE_ANOMALY")
  .where("priority", "==", "HIGH")
  .orderBy("createdAt", "desc")
  .limit(50)
  .get();

// 임시 검수
const urgentQueue = await db
  .collection("inspectionQueue")
  .where("reason", "==", "TEMPORARY_INSPECTION")
  .where("priority", "==", "URGENT")
  .orderBy("createdAt", "desc")
  .limit(50)
  .get();
```

---

### 5. 6시간 후 재점검 대상 조회 쿼리

```typescript
// Firestore Console → Query
Collection: inspectionQueue
Where:
  - reason == "TEMPORARY_INSPECTION"
  - recheckAt <= (현재 시간 Timestamp)
Order by: recheckAt (asc)
Limit: 50
```

**Cloud Functions 코드**:
```typescript
const now = Timestamp.now();
const recheckQueue = await db
  .collection("inspectionQueue")
  .where("reason", "==", "TEMPORARY_INSPECTION")
  .where("recheckAt", "<=", now)
  .orderBy("recheckAt", "asc")
  .limit(50)
  .get();
```

---

## ⚠️ 운영 의사결정 표

### 가격 이상 탐지 의사결정 트리

| 조건 | 편차 범위 | 조치 | 우선순위 | 재점검 |
|------|----------|------|---------|--------|
| 지역 평균 대비 | Z ≥ 2σ | 검수 큐 등록 + 노출 -30% | HIGH | - |
| 가격 가이드 | 0.2 < 편차 ≤ 0.4 | 검수 큐 등록 + 노출 -30% | HIGH | - |
| 가격 가이드 | 편차 > 0.4 | 임시 검수 + 노출 -30% | URGENT | 6시간 후 |
| 정상 범위 복귀 | 편차 ≤ 0.2 | 자동 해제 | - | - |

---

### 판매자 알림 의사결정 표

| 상황 | 제목 | 내용 | 발송 시점 |
|------|------|------|----------|
| 일반 이상 (±20% 초과) | 가격 이상 탐지 | 등록하신 게시물의 가격이 시장 평균과 크게 다릅니다. 검수 대기 중입니다. | 즉시 |
| 임시 검수 (±40% 초과) | 가격 임시 검수 안내 | 등록하신 가격이 추천 가격 가이드를 크게 벗어났습니다. 6시간 후 자동 재점검됩니다. 가격을 조정해주세요. | 즉시 |
| 재점검 후 정상 복귀 | 가격 정상화 완료 | 가격이 정상 범위로 복귀했습니다. 검수가 완료되었습니다. | 재점검 시 |
| 재점검 후 여전히 이상 | 가격 재점검 결과 | 가격이 여전히 이상 범위입니다. 검수를 계속 진행합니다. | 재점검 시 |

---

### 검수 큐 우선순위 의사결정 표

| 우선순위 | 조건 | 처리 시간 | 자동 조치 |
|---------|------|----------|----------|
| URGENT | ±40% 초과 (임시 검수) | 즉시 | 6시간 후 재점검 |
| HIGH | ±20% 초과 (일반 이상) | 24시간 이내 | - |
| NORMAL | 기타 검수 사유 | 48시간 이내 | - |

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
// 목표: ≤8%
const dayStart = Timestamp.fromDate(
  new Date(new Date().setHours(0, 0, 0, 0))
);

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
**알람 임계값**: > 8%

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

### 1. 가격 이상 탐지율 > 8%

```typescript
if (anomalyRate > 8) {
  await sendAlert({
    type: "PRICE_ANOMALY_ALERT",
    metric: "anomaly_rate",
    value: anomalyRate,
    threshold: 8,
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

- [ ] 가격 이상 탐지율 확인 (목표: ≤8%)
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

**가격 이상 탐지 엔진 운영 플레이북 완성**
