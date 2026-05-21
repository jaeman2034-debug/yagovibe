# ⚡ 30분 부스트 로직 빠른 시작 가이드

**목표**: 게시 후 24시간 내 1채팅 80% 달성  
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
- ✅ `onNewPostCreated` - 게시물 생성 시 부스트 적용
- ✅ `onChatCreated` - 채팅 발생 시 추적
- ✅ `checkBoostExpiry` - 부스트 만료 체크 (1분마다)

---

### 2. Firestore 인덱스 생성

```javascript
// Firestore Console → Indexes → Create Index

// 인덱스 1: 부스트 활성 게시물 조회
Collection: market
Fields:
  - boostActive (Ascending)
  - boostEndTime (Descending)
  - imageQuality (Ascending)

// 인덱스 2: 부스트 만료 체크
Collection: market
Fields:
  - boostActive (Ascending)
  - boostEndTime (Ascending)
```

---

### 3. 클라이언트 배포

```bash
# 루트 디렉토리에서
npm run build
npm run deploy
```

**확인할 컴포넌트**:
- ✅ `BoostBadge` - 부스트 배지 표시
- ✅ `EquipmentCard` - 부스트 배지 통합

---

## 📊 운영 설정값

### 기본 설정 (변경 불필요)

```typescript
BOOST_DURATION_MS = 30 * 60 * 1000; // 30분
BOOST_WEIGHT = 0.7; // +70%
MIN_IMAGE_QUALITY = 90; // 최소 품질 점수
```

### 조정 가능한 설정

```typescript
// functions/src/market/newPostBoost.ts 수정
const BOOST_DURATION_MS = 30 * 60 * 1000; // 30분 → 60분으로 변경 가능
const BOOST_WEIGHT = 0.7; // +70% → +100%로 변경 가능
const MIN_IMAGE_QUALITY = 90; // 90점 → 85점으로 변경 가능
```

---

## 🔍 모니터링 쿼리 (즉시 실행 가능)

### 1. 현재 활성 부스트 게시물

```typescript
// Firestore Console → Query
Collection: market
Where:
  - boostActive == true
  - boostEndTime > now()
  - imageQuality >= 90
Order by: boostEndTime (desc)
Limit: 50
```

---

### 2. 24시간 채팅 발생률

```typescript
// Cloud Functions → Logs에서 확인
// 또는 Firestore Console에서 수동 계산

// 24시간 내 생성된 게시물
Collection: market
Where:
  - createdAt >= (24시간 전)

// 채팅 발생 게시물
Collection: market
Where:
  - createdAt >= (24시간 전)
  - boostChatCount > 0

// 채팅 발생률 = (채팅 발생 게시물 수 / 전체 게시물 수) × 100
```

---

### 3. 부스트 적용률

```typescript
// 24시간 내 생성된 게시물 중 부스트 적용된 것
Collection: market
Where:
  - createdAt >= (24시간 전)
  - boostActive == true
  - imageQuality >= 90

// 부스트 적용률 = (부스트 적용 게시물 수 / 전체 게시물 수) × 100
```

---

## ⚠️ 예외 처리 확인

### 1. 이미지 품질 미달

**확인 방법**:
```typescript
// Firestore Console → Query
Collection: market
Where:
  - createdAt >= (24시간 전)
  - imageQuality < 90
```

**예상 결과**: 부스트 미적용 게시물 목록

---

### 2. 저품질 반복 게시물

**확인 방법**:
```typescript
// Cloud Functions → Logs에서 확인
// 또는 Firestore Console에서 수동 계산

// 저품질 게시물 3회 이상 작성자
Collection: market
Where:
  - imageQuality < 90
  - createdAt >= (30일 전)
Group by: authorId
Count: >= 3
```

**예상 결과**: 검수 큐에 자동 등록됨

---

## 💬 사용자 문구 (복사-붙여넣기)

### 게시물 등록 완료 화면

```tsx
// 부스트 적용 시
<div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
  <p className="text-sm font-medium text-orange-800">
    🚀 신상품 부스트가 적용되었습니다!
  </p>
  <p className="text-xs text-orange-600 mt-1">
    30분 동안 추천 피드 상단에 노출됩니다.
  </p>
</div>

// 부스트 미적용 시
<div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
  <p className="text-sm font-medium text-yellow-800">
    ⚠️ 신상품 부스트 미적용
  </p>
  <p className="text-xs text-yellow-600 mt-1">
    이미지 품질이 90점 미만입니다. 더 선명한 사진을 올려주세요.
  </p>
</div>
```

---

### 게시물 카드 배지

```tsx
// BoostBadge 컴포넌트 사용
<BoostBadge
  boostActive={post.boostActive}
  boostEndTime={post.boostEndTime?.toDate()}
  boostChatCount={post.boostChatCount}
/>
```

---

## 📈 KPI 측정 (매일 00:00)

### 1. 24시간 채팅 발생률

**목표**: ≥27%  
**측정 방법**: Cloud Functions 로그 또는 Firestore 쿼리

---

### 2. 부스트 적용률

**목표**: ≥60%  
**측정 방법**: Firestore 쿼리

---

### 3. 부스트 효과

**목표**: 부스트 게시물 채팅 발생률 > 일반 게시물 +20%  
**측정 방법**: 부스트 게시물 vs 일반 게시물 채팅 발생률 비교

---

## 🚨 알람 설정

### 1. 24시간 채팅 발생률 < 27%

```typescript
// Cloud Functions → Alerts → Create Alert
Metric: 24h_chat_rate
Threshold: < 27
Action: Email/Slack 알림
```

---

### 2. 저품질 반복 게시물 > 10명

```typescript
// Cloud Functions → Alerts → Create Alert
Metric: repeated_low_quality_users
Threshold: > 10
Action: Email/Slack 알림
```

---

## ✅ 배포 후 확인 사항

- [ ] `onNewPostCreated` 함수 배포 완료
- [ ] `onChatCreated` 함수 배포 완료
- [ ] `checkBoostExpiry` 함수 배포 완료
- [ ] Firestore 인덱스 생성 완료
- [ ] `BoostBadge` 컴포넌트 배포 완료
- [ ] 게시물 등록 시 부스트 적용 확인
- [ ] 게시물 카드에 부스트 배지 표시 확인
- [ ] 24시간 채팅 발생률 측정 시작

---

**30분 부스트 로직 빠른 시작 가이드 완성**
