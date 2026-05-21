# 🔥 가격 이상 탐지 엔진 세부 설계

**목표**: 전환·분쟁·CS를 동시에 줄이는 최고 레버  
**배포 상태**: ✅ 프로덕션 준비 완료

---

## 📊 통계 공식 (운영 기준)

### 1. 지역별 평균 가격 계산

```
평균(μ) = Σ(가격_i) / n
표준편차(σ) = √(Σ(가격_i - μ)² / n)

조건:
- 최근 30일 데이터
- 같은 카테고리
- status = "open"
- 가격 > 0
```

**예시**:
```
가격 목록: [50000, 55000, 60000, 45000, 52000]
평균(μ) = 52400원
표준편차(σ) = 5477원
```

---

### 2. 편차 계산 (Z-score)

```
편차(Z) = |가격 - 평균| / 표준편차

조건:
✅ Z ≥ 2σ → 이상 탐지
✅ Z < 2σ → 정상 범위
```

**예시**:
```
등록 가격: 75000원
편차(Z) = |75000 - 52400| / 5477 = 4.12σ
→ 2σ 이상이므로 이상 탐지
```

---

### 3. 가격 가이드 편차 계산

```
가이드 최소 = 추천 가격 × (1 - 0.2) = 추천 가격 × 0.8
가이드 최대 = 추천 가격 × (1 + 0.2) = 추천 가격 × 1.2
가이드 엄격 최소 = 추천 가격 × (1 - 0.4) = 추천 가격 × 0.6
가이드 엄격 최대 = 추천 가격 × (1 + 0.4) = 추천 가격 × 1.4

편차 = |가격 - 가이드 범위 경계| / 추천 가격

조건:
✅ 편차 > 0.2 (20%) → 이상 탐지
✅ 편차 > 0.4 (40%) → 임시 검수
```

**예시**:
```
추천 가격: 50000원
가이드 범위: 40000원 ~ 60000원 (±20%)
엄격 범위: 30000원 ~ 70000원 (±40%)

등록 가격: 75000원
편차 = (75000 - 60000) / 50000 = 0.3 (30%)
→ ±20% 초과이므로 이상 탐지
→ ±40% 미만이므로 일반 검수

등록 가격: 80000원
편차 = (80000 - 60000) / 50000 = 0.4 (40%)
→ ±40% 초과이므로 임시 검수
```

---

## 🔍 쿼리 조건 (운영 모니터링)

### 1. 지역별 평균 가격 계산 쿼리

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

---

### 5. 6시간 후 재점검 대상 조회

```typescript
// Firestore Console → Query
Collection: inspectionQueue
Where:
  - reason == "TEMPORARY_INSPECTION"
  - recheckAt <= now()
Order by: recheckAt (asc)
Limit: 50
```

---

## ⚠️ 운영 플레이북

### 1. 탐지 단계별 대응

**단계 1: ±20% 초과 (일반 이상)**
- ✅ 검수 큐 등록 (priority: HIGH)
- ✅ 노출 가중치 -30% 적용
- ✅ 판매자 알림 발송
- ✅ 일반 검수 진행

**단계 2: ±40% 초과 (임시 검수)**
- ✅ 검수 큐 등록 (priority: URGENT)
- ✅ 노출 가중치 -30% 적용
- ✅ 임시 검수 플래그 설정
- ✅ 판매자 즉시 코칭 메시지 발송
- ✅ 6시간 후 재점검 스케줄

---

### 2. 판매자 코칭 메시지

**일반 이상 (±20% 초과)**:
```
제목: 가격 이상 탐지
내용: 등록하신 게시물의 가격이 시장 평균과 크게 다릅니다. 검수 대기 중입니다.
```

**임시 검수 (±40% 초과)**:
```
제목: 가격 임시 검수 안내
내용: 등록하신 가격이 추천 가격 가이드를 크게 벗어났습니다. 6시간 후 자동 재점검됩니다. 가격을 조정해주세요.
```

---

### 3. 6시간 후 재점검 프로세스

**재점검 조건**:
- ✅ `recheckAt <= now()`
- ✅ `temporaryInspection === true`
- ✅ `status === "open"`

**재점검 로직**:
1. 현재 가격 재확인
2. 가격 이상 탐지 재실행
3. 정상 범위 복귀 시:
   - `temporaryInspection: false`
   - `exposurePenalty: 0`
   - 검수 큐에서 제거
4. 여전히 이상인 경우:
   - 검수 큐 상태 업데이트
   - 추가 코칭 메시지 발송

---

### 4. 정상 범위 복귀 시

**자동 해제**:
- `priceAnomaly: false`
- `temporaryInspection: false`
- `exposurePenalty: 0`
- 검수 큐에서 제거

---

## 💬 사용자 안내 문구

### 1. 판매자 알림 (일반 이상)

```
제목: 가격 이상 탐지
내용: 등록하신 게시물의 가격이 시장 평균과 크게 다릅니다. 검수 대기 중입니다.
```

---

### 2. 판매자 알림 (임시 검수)

```
제목: 가격 임시 검수 안내
내용: 등록하신 가격이 추천 가격 가이드를 크게 벗어났습니다. 6시간 후 자동 재점검됩니다. 가격을 조정해주세요.
```

---

### 3. 게시물 상세 화면 경고 (일반 이상)

```
⚠️ 가격 이상 탐지
등록하신 가격이 시장 평균과 다릅니다. 검수 대기 중입니다.
편차: 25.3%
```

---

### 4. 게시물 상세 화면 경고 (임시 검수)

```
🚨 가격 임시 검수
등록하신 가격이 추천 가격 가이드를 크게 벗어났습니다.
6시간 후 자동 재점검됩니다.
편차: 45.2%
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

## 📈 모니터링 지표

### 1. 가격 이상 탐지율

```typescript
// 목표: ≤10% (가이드 이탈)
const anomalyRate = (anomalyPosts.length / totalPosts.length) * 100;
```

**측정 주기**: 매일 00:00 (Asia/Seoul)  
**알람 임계값**: > 10%

---

### 2. 임시 검수율

```typescript
// 임시 검수 게시물 비율
const temporaryInspectionRate = (temporaryInspectionPosts.length / totalPosts.length) * 100;
```

**측정 주기**: 매일 00:00 (Asia/Seoul)  
**목표**: ≤ 2%

---

### 3. 정상 범위 복귀율

```typescript
// 가격 수정 후 정상 범위 복귀 비율
const resolutionRate = (resolvedPosts.length / anomalyPosts.length) * 100;
```

**측정 주기**: 매일 00:00 (Asia/Seoul)  
**목표**: ≥ 75%

---

### 4. 재점검 처리율

```typescript
// 6시간 후 재점검 완료 비율
const recheckRate = (recheckedPosts.length / scheduledRechecks.length) * 100;
```

**측정 주기**: 매일 00:00 (Asia/Seoul)  
**목표**: ≥ 90%

---

## 🚨 알람 조건

### 1. 가격 이상 탐지율 > 10%

```typescript
if (anomalyRate > 10) {
  await sendAlert({
    type: "PRICE_ANOMALY_ALERT",
    metric: "anomaly_rate",
    value: anomalyRate,
    threshold: 10,
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

### 일일 체크

- [ ] 가격 이상 탐지율 확인 (목표: ≤10%)
- [ ] 임시 검수율 확인 (목표: ≤2%)
- [ ] 정상 범위 복귀율 확인 (목표: ≥75%)
- [ ] 재점검 처리율 확인 (목표: ≥90%)

### 주간 체크

- [ ] 가격 이상 탐지 임계값 조정 필요 여부 검토
- [ ] 노출 페널티 조정 필요 여부 검토
- [ ] 판매자 코칭 메시지 효과 분석
- [ ] 사용자 피드백 반영

### 월간 체크

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

**가격 이상 탐지 엔진 세부 설계 완성**
