# 🚀 30분 부스트 로직 실전 설계

**목표**: 게시 후 24시간 안에 최소 1채팅을 80% 매물에 강제  
**조건**: 이미지 품질 ≥90점  
**효과**: 추천 가중치 +70%

---

## 📊 가중 공식

### 기본 추천 점수

```
기본 점수 = 
  관심사 유사도 × 0.4
+ 거리 점수 × 0.2
+ 평판 점수 × 0.2
+ 최신성 점수 × 0.1
+ 전환율 점수 × 0.1
```

### 부스트 적용 공식

```
최종 점수 = 기본 점수 × (1 + 부스트 가중치)

조건:
- boostActive === true
- 현재 시간 < boostEndTime
- 이미지 품질 ≥ 90점

부스트 가중치 = 0.7 (+70%)
최종 배수 = 1.7배
```

### 예시 계산

```
기본 점수: 0.65
부스트 적용: 0.65 × 1.7 = 1.105
```

---

## 🔥 Firestore 쿼리 구조

### 게시물 문서 구조

```typescript
// market/{postId}
{
  // 기본 필드
  title: string;
  images: string[];
  imageQuality: number; // 0-100
  
  // 부스트 필드
  boostActive: boolean;
  boostWeight: number; // 0.7
  boostStartTime: Timestamp;
  boostEndTime: Timestamp;
  boostChatCount: number; // 채팅 발생 횟수
  
  // 메타데이터
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 부스트 활성 게시물 조회 쿼리

```typescript
// 추천 피드에서 부스트 게시물 우선 조회
const boostedPosts = await db
  .collection("market")
  .where("boostActive", "==", true)
  .where("boostEndTime", ">", Timestamp.now())
  .where("imageQuality", ">=", 90)
  .orderBy("boostEndTime", "desc") // 만료 임박 순
  .limit(20)
  .get();
```

### 부스트 만료 체크 쿼리

```typescript
// 만료된 부스트 찾기
const expiredBoosts = await db
  .collection("market")
  .where("boostActive", "==", true)
  .where("boostEndTime", "<=", Timestamp.now())
  .limit(100)
  .get();
```

---

## ⚠️ 예외 규칙

### 1. 이미지 품질 미달

```typescript
if (imageQuality < 90) {
  // 부스트 미적용
  return;
}
```

**예외 처리**:
- 이미지 품질 90 미만 → 부스트 미적용
- 이미지 없음 → 부스트 미적용
- 품질 분석 실패 → 부스트 미적용

---

### 2. 저품질 반복 게시물

```typescript
// 저품질 게시물 3회 이상 → 검수 큐 자동 등록
if (user.lowQualityCount >= 3) {
  await db.collection("inspectionQueue").add({
    postId,
    userId,
    reason: "REPEATED_LOW_QUALITY",
    priority: "HIGH",
    createdAt: FieldValue.serverTimestamp(),
  });
}
```

**예외 처리**:
- 저품질 게시물 3회 이상 → 검수 큐 자동 등록
- 검수 완료 전까지 부스트 미적용

---

### 3. 부스트 중복 방지

```typescript
// 이미 부스트가 활성화된 경우 재적용 방지
if (post.boostActive && post.boostEndTime > now) {
  logger.info("[onNewPostCreated] 이미 부스트 활성화됨:", { postId });
  return;
}
```

**예외 처리**:
- 이미 부스트 활성화 → 재적용 방지
- 부스트 만료 전 재생성 방지

---

### 4. 채팅 발생 시 부스트 유지

```typescript
// 1회 채팅 발생 시 부스트 가중 해제 (선택적)
// 실제로는 부스트를 유지하는 것이 더 나을 수 있음
if (post.boostChatCount === 0 && chatCreated) {
  // 부스트는 유지하되, 가중치를 조정할 수 있음
  // 예: boostWeight: 0.7 → 0.3 (부스트 감소)
}
```

**예외 처리**:
- 1회 채팅 발생 시 부스트 유지 (가중치 조정 가능)
- 채팅 카운트 증가만 기록

---

## 🎨 UI 문구

### 부스트 배지

```tsx
// 신상품 부스트 배지
<div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500 text-white text-xs font-medium rounded-full">
  <TrendingUp className="w-3 h-3" />
  <span>신상품 부스트</span>
  <span className="mx-1">•</span>
  <Clock className="w-3 h-3" />
  <span>{timeLeft}</span>
</div>
```

**문구**:
- "신상품 부스트" (기본)
- "X분 Y초 남음" (타이머)
- "채팅 X회" (채팅 발생 시)

---

### 부스트 안내 메시지

```tsx
// 게시물 등록 완료 시
<div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
  <p className="text-sm font-medium text-orange-800">
    🚀 신상품 부스트가 적용되었습니다!
  </p>
  <p className="text-xs text-orange-600 mt-1">
    30분 동안 추천 피드 상단에 노출됩니다.
  </p>
</div>
```

**문구**:
- "신상품 부스트가 적용되었습니다!"
- "30분 동안 추천 피드 상단에 노출됩니다."
- "이미지 품질이 우수하여 부스트가 자동 적용되었습니다."

---

### 부스트 미적용 안내

```tsx
// 이미지 품질 미달 시
<div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
  <p className="text-sm font-medium text-yellow-800">
    ⚠️ 신상품 부스트 미적용
  </p>
  <p className="text-xs text-yellow-600 mt-1">
    이미지 품질이 90점 미만입니다. 더 선명한 사진을 올려주세요.
  </p>
</div>
```

**문구**:
- "신상품 부스트 미적용"
- "이미지 품질이 90점 미만입니다."
- "더 선명한 사진을 올려주세요."

---

## 🔧 구현 세부사항

### 부스트 적용 로직

```typescript
// functions/src/market/newPostBoost.ts

const BOOST_DURATION_MS = 30 * 60 * 1000; // 30분
const BOOST_WEIGHT = 0.7; // +70%
const MIN_IMAGE_QUALITY = 90;

// 게시물 생성 시
if (imageQuality >= MIN_IMAGE_QUALITY) {
  await db.collection("market").doc(postId).update({
    boostActive: true,
    boostWeight: BOOST_WEIGHT,
    boostStartTime: Timestamp.fromDate(createdAt),
    boostEndTime: Timestamp.fromDate(boostEndTime),
    boostChatCount: 0,
  });
}
```

---

### 추천 피드 부스트 반영

```typescript
// functions/src/market/feedEngine.ts

export function calculateFeedScore(
  user: UserProfile,
  post: PostData,
  userEmbedding?: number[]
): number {
  // 기본 점수 계산
  let totalScore = /* ... 기본 점수 계산 ... */;

  // 🔥 30분 부스트 적용
  const now = new Date();
  const boostEndTime = (post as any).boostEndTime?.toDate?.() || 
    ((post as any).boostEndTime?.seconds ? 
      new Date((post as any).boostEndTime.seconds * 1000) : null);

  if ((post as any).boostActive && boostEndTime && now < boostEndTime) {
    const boostMultiplier = 1 + ((post as any).boostWeight || 0.7);
    totalScore = totalScore * boostMultiplier;
  }

  return totalScore;
}
```

---

### 부스트 만료 체크

```typescript
// functions/src/market/boostExpiry.ts

export const checkBoostExpiry = onSchedule(
  { schedule: "* * * * *", timeZone: "Asia/Seoul" },
  async () => {
    const now = Timestamp.now();
    
    const expiredBoosts = await db
      .collection("market")
      .where("boostActive", "==", true)
      .where("boostEndTime", "<=", now)
      .limit(100)
      .get();

    const batch = db.batch();
    expiredBoosts.docs.forEach((doc) => {
      batch.update(doc.ref, {
        boostActive: false,
        boostWeight: 0,
      });
    });

    await batch.commit();
  }
);
```

---

## 📈 측정 지표

### 24시간 채팅 발생률

```typescript
// 목표: ≥26%

const posts24h = await db
  .collection("market")
  .where("createdAt", ">=", dayStart)
  .where("createdAt", "<=", now)
  .get();

const postsWithChat = posts24h.docs.filter((doc) => {
  const post = doc.data();
  return post.boostChatCount > 0;
});

const chatRate = (postsWithChat.length / posts24h.size) * 100;
```

---

## 🎯 예상 효과

### 전환율 개선

- 24시간 채팅 발생률: 15% → 26% (+73%)
- 등록→거래 전환율: 32% → 37% (+16%)

### 사용자 경험 개선

- 신상품 노출 속도: 평균 2시간 → 30분 (-75%)
- 첫 채팅까지 시간: 평균 4시간 → 1시간 (-75%)

---

## 🚨 예외 처리 체크리스트

- [ ] 이미지 품질 90 미만 → 부스트 미적용
- [ ] 이미지 없음 → 부스트 미적용
- [ ] 저품질 반복 3회 → 검수 큐 자동 등록
- [ ] 부스트 중복 방지
- [ ] 부스트 만료 자동 처리
- [ ] 채팅 발생 시 추적

---

**30분 부스트 로직 실전 설계 완성**
