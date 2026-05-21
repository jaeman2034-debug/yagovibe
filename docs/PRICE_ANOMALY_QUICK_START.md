# ⚡ 가격 이상 탐지 엔진 빠른 시작 가이드

**목표**: 가이드 ±20% 초과 → 노출 -30% + 경고 UI  
**배포 시간**: 5분

---

## 🚀 배포 체크리스트

### 1. Cloud Functions 배포

```bash
# functions 디렉토리에서
cd functions
npm run deploy
```

**확인할 함수**:
- ✅ `onMarketPriceCreated` - 게시물 생성 시 가격 이상 탐지
- ✅ `onMarketPriceUpdated` - 가격 수정 시 가격 이상 탐지
- ✅ `priceAnomalyCheckJob` - 주기적 가격 이상 체크 (매일 새벽 3시)

---

### 2. Firestore 인덱스 생성

```javascript
// Firestore Console → Indexes → Create Index

// 인덱스 1: 가격 이상 게시물 조회
Collection: market
Fields:
  - priceAnomaly (Ascending)
  - status (Ascending)
  - updatedAt (Descending)

// 인덱스 2: 검수 큐 조회
Collection: inspectionQueue
Fields:
  - reason (Ascending)
  - priority (Ascending)
  - createdAt (Descending)
```

---

### 3. 클라이언트 배포

```bash
# 루트 디렉토리에서
npm run build
npm run deploy
```

**확인할 컴포넌트**:
- ✅ `PriceWarning` - 가격 경고 UI 컴포넌트

---

## 📊 운영 설정값

### 기본 설정 (변경 불필요)

```typescript
PRICE_DEVIATION_THRESHOLD = 2; // 2σ (표준편차 2배)
EXPOSURE_PENALTY = 0.3; // 노출 -30%
PRICE_GUIDE_TOLERANCE = 0.2; // 가이드 ±20% 허용 범위
```

### 조정 가능한 설정

```typescript
// functions/src/market/priceAnomalyDetection.ts 수정
const PRICE_DEVIATION_THRESHOLD = 2; // 2σ → 1.5σ로 변경 가능
const EXPOSURE_PENALTY = 0.3; // -30% → -50%로 변경 가능
const PRICE_GUIDE_TOLERANCE = 0.2; // ±20% → ±15%로 변경 가능
```

---

## 🔍 모니터링 쿼리 (즉시 실행 가능)

### 1. 현재 가격 이상 게시물

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

### 2. 가격 이상 탐지율

```typescript
// Cloud Functions → Logs에서 확인
// 또는 Firestore Console에서 수동 계산

// 전체 equipment 게시물
Collection: market
Where:
  - category == "equipment"
  - status == "open"
  - createdAt >= (24시간 전)

// 가격 이상 게시물
Collection: market
Where:
  - category == "equipment"
  - status == "open"
  - priceAnomaly == true
  - createdAt >= (24시간 전)

// 가격 이상 탐지율 = (가격 이상 게시물 수 / 전체 게시물 수) × 100
```

---

### 3. 검수 큐 대기 시간

```typescript
// 검수 큐 조회
Collection: inspectionQueue
Where:
  - reason == "PRICE_ANOMALY"
  - priority == "HIGH"
Order by: createdAt (desc)
Limit: 50

// 평균 대기 시간 = (현재 시간 - createdAt)의 평균
```

---

## ⚠️ 예외 처리 확인

### 1. 가격 이상 탐지 조건

**확인 방법**:
```typescript
// Firestore Console → Query
Collection: market
Where:
  - category == "equipment"
  - status == "open"
  - priceAnomaly == true
```

**예상 결과**: 가격 이상 게시물 목록

---

### 2. 검수 큐 자동 등록

**확인 방법**:
```typescript
// Firestore Console → Query
Collection: inspectionQueue
Where:
  - reason == "PRICE_ANOMALY"
  - priority == "HIGH"
Order by: createdAt (desc)
Limit: 50
```

**예상 결과**: 검수 큐에 자동 등록된 게시물 목록

---

## 💬 사용자 문구 (복사-붙여넣기)

### 게시물 상세 화면 경고

```tsx
import PriceWarning from "@/components/market/PriceWarning";

// 사용 예시
<PriceWarning
  priceAnomaly={post.priceAnomaly}
  priceAnomalyReason={post.priceAnomalyReason}
  priceAnomalyDeviation={post.priceAnomalyDeviation}
/>
```

---

### 게시물 카드 경고 배지

```tsx
{post.priceAnomaly && (
  <div className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
    <AlertTriangle className="w-3 h-3" />
    <span>가격 검수 중</span>
  </div>
)}
```

---

## 📈 KPI 측정 (매일 00:00)

### 1. 가격 이상 탐지율

**목표**: ≤13%  
**측정 방법**: Cloud Functions 로그 또는 Firestore 쿼리

---

### 2. 검수 큐 대기 시간

**목표**: 평균 24시간 이내  
**측정 방법**: Firestore 쿼리

---

### 3. 가격 이상 해제율

**목표**: ≥70%  
**측정 방법**: 가격 수정 후 정상 범위 복귀 비율

---

## 🚨 알람 설정

### 1. 가격 이상 탐지율 > 13%

```typescript
// Cloud Functions → Alerts → Create Alert
Metric: price_anomaly_rate
Threshold: > 13
Action: Email/Slack 알림
```

---

### 2. 검수 큐 대기 시간 > 48시간

```typescript
// Cloud Functions → Alerts → Create Alert
Metric: inspection_queue_wait_time
Threshold: > 48 hours
Action: Email/Slack 알림
```

---

## ✅ 배포 후 확인 사항

- [ ] `onMarketPriceCreated` 함수 배포 완료
- [ ] `onMarketPriceUpdated` 함수 배포 완료
- [ ] `priceAnomalyCheckJob` 함수 배포 완료
- [ ] Firestore 인덱스 생성 완료
- [ ] `PriceWarning` 컴포넌트 배포 완료
- [ ] 게시물 등록 시 가격 이상 탐지 확인
- [ ] 가격 수정 시 가격 이상 탐지 확인
- [ ] 검수 큐 자동 등록 확인
- [ ] 노출 페널티 적용 확인
- [ ] 판매자 알림 발송 확인

---

**가격 이상 탐지 엔진 빠른 시작 가이드 완성**
