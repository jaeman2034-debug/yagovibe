# 🚀 30분 부스트 로직 운영 세트

**목표**: 게시 후 24시간 내 1채팅 80% 달성  
**배포 상태**: ✅ 프로덕션 준비 완료

---

## 📊 가중 공식 (운영 기준)

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
최종 점수 = 기본 점수 × (1 + 0.7) = 기본 점수 × 1.7배

조건:
✅ boostActive === true
✅ 현재 시간 < boostEndTime
✅ imageQuality ≥ 90점
```

### 운영 설정값

```typescript
// functions/src/market/newPostBoost.ts
const BOOST_DURATION_MS = 30 * 60 * 1000; // 30분
const BOOST_WEIGHT = 0.7; // +70%
const MIN_IMAGE_QUALITY = 90; // 최소 품질 점수
```

---

## 🔍 쿼리 조건 (운영 모니터링)

### 1. 부스트 활성 게시물 조회

```typescript
// 현재 활성 부스트 게시물
const activeBoosts = await db
  .collection("market")
  .where("boostActive", "==", true)
  .where("boostEndTime", ">", Timestamp.now())
  .where("imageQuality", ">=", 90)
  .orderBy("boostEndTime", "desc")
  .limit(50)
  .get();
```

### 2. 부스트 효과 측정 (24시간 채팅 발생률)

```typescript
// 24시간 내 생성된 게시물 중 부스트 적용된 것
const dayStart = Timestamp.fromDate(
  new Date(new Date().setHours(0, 0, 0, 0))
);

const posts24h = await db
  .collection("market")
  .where("createdAt", ">=", dayStart)
  .get();

// 부스트 적용 게시물
const boostedPosts = posts24h.docs.filter((doc) => {
  const post = doc.data();
  return post.boostActive === true && post.imageQuality >= 90;
});

// 채팅 발생 게시물
const postsWithChat = posts24h.docs.filter((doc) => {
  const post = doc.data();
  return post.boostChatCount > 0;
});

// 24시간 채팅 발생률
const chatRate = (postsWithChat.length / posts24h.size) * 100;
```

### 3. 부스트 만료 체크 (스케줄러)

```typescript
// 1분마다 실행
const expiredBoosts = await db
  .collection("market")
  .where("boostActive", "==", true)
  .where("boostEndTime", "<=", Timestamp.now())
  .limit(100)
  .get();
```

### 4. 저품질 반복 게시물 탐지

```typescript
// 저품질 게시물 3회 이상 작성자
const lowQualityUsers = await db
  .collection("market")
  .where("imageQuality", "<", 90)
  .where("createdAt", ">=", thirtyDaysAgo)
  .get();

// 사용자별 저품질 게시물 수 집계
const userLowQualityCount: Record<string, number> = {};
lowQualityUsers.docs.forEach((doc) => {
  const authorId = doc.data().authorId;
  userLowQualityCount[authorId] = (userLowQualityCount[authorId] || 0) + 1;
});

// 3회 이상 → 검수 큐 등록
for (const [userId, count] of Object.entries(userLowQualityCount)) {
  if (count >= 3) {
    await db.collection("inspectionQueue").add({
      userId,
      reason: "REPEATED_LOW_QUALITY",
      count,
      priority: "HIGH",
      createdAt: FieldValue.serverTimestamp(),
    });
  }
}
```

---

## ⚠️ 예외 규칙 (운영 체크리스트)

### 1. 이미지 품질 미달

```typescript
// ✅ 체크: imageQuality < 90
if (imageQuality < MIN_IMAGE_QUALITY) {
  // 부스트 미적용
  logger.info("[onNewPostCreated] 이미지 품질 미달, 부스트 미적용");
  return;
}
```

**예외 처리**:
- ✅ 이미지 품질 90 미만 → 부스트 미적용
- ✅ 이미지 없음 → 부스트 미적용
- ✅ 품질 분석 실패 → 부스트 미적용

---

### 2. 저품질 반복 게시물

```typescript
// ✅ 체크: 저품질 게시물 3회 이상
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
- ✅ 저품질 게시물 3회 이상 → 검수 큐 자동 등록
- ✅ 검수 완료 전까지 부스트 미적용

---

### 3. 부스트 중복 방지

```typescript
// ✅ 체크: 이미 부스트 활성화된 경우
if (post.boostActive && post.boostEndTime > now) {
  logger.info("[onNewPostCreated] 이미 부스트 활성화됨");
  return;
}
```

**예외 처리**:
- ✅ 이미 부스트 활성화 → 재적용 방지
- ✅ 부스트 만료 전 재생성 방지

---

### 4. 채팅 발생 시 부스트 유지

```typescript
// ✅ 체크: 1회 채팅 발생 시 부스트 유지
if (post.boostActive && post.boostChatCount === 0) {
  await postRef.update({
    boostChatCount: FieldValue.increment(1),
  });
}
```

**예외 처리**:
- ✅ 1회 채팅 발생 시 부스트 유지 (가중치 조정 없음)
- ✅ 채팅 카운트 증가만 기록

---

## 💬 사용자 문구 (운영 표준)

### 1. 부스트 적용 안내 (게시물 등록 완료)

```
🚀 신상품 부스트가 적용되었습니다!
30분 동안 추천 피드 상단에 노출됩니다.
```

**표시 위치**: 게시물 등록 완료 화면

---

### 2. 부스트 미적용 안내 (이미지 품질 미달)

```
⚠️ 신상품 부스트 미적용
이미지 품질이 90점 미만입니다.
더 선명한 사진을 올려주세요.
```

**표시 위치**: 게시물 등록 완료 화면 (품질 미달 시)

---

### 3. 부스트 배지 (게시물 카드)

```
신상품 부스트 • 25분 30초 남음
```

**표시 위치**: 게시물 카드 상단

---

### 4. 부스트 배지 (채팅 발생 시)

```
신상품 부스트 • 20분 15초 남음 • 채팅 1회
```

**표시 위치**: 게시물 카드 상단 (채팅 발생 시)

---

### 5. 부스트 만료 안내 (선택적)

```
부스트가 종료되었습니다.
일반 추천으로 노출됩니다.
```

**표시 위치**: 부스트 만료 시 (선택적)

---

## 📈 모니터링 지표 (운영 KPI)

### 1. 24시간 채팅 발생률

```typescript
// 목표: ≥27%
const chatRate = (postsWithChat.length / posts24h.size) * 100;
```

**측정 주기**: 매일 00:00 (Asia/Seoul)  
**알람 임계값**: < 27%

---

### 2. 부스트 적용률

```typescript
// 부스트 적용 게시물 / 전체 게시물
const boostRate = (boostedPosts.length / posts24h.size) * 100;
```

**측정 주기**: 매일 00:00 (Asia/Seoul)  
**목표**: ≥ 60% (이미지 품질 90 이상 게시물 비율)

---

### 3. 부스트 효과 (채팅 전환율)

```typescript
// 부스트 게시물 채팅 발생률 vs 일반 게시물
const boostedChatRate = (boostedPostsWithChat.length / boostedPosts.length) * 100;
const normalChatRate = (normalPostsWithChat.length / normalPosts.length) * 100;
```

**측정 주기**: 매일 00:00 (Asia/Seoul)  
**목표**: 부스트 게시물 채팅 발생률 > 일반 게시물 +20%

---

### 4. 저품질 반복 게시물 수

```typescript
// 저품질 게시물 3회 이상 작성자 수
const repeatedLowQualityUsers = Object.keys(userLowQualityCount).filter(
  (userId) => userLowQualityCount[userId] >= 3
).length;
```

**측정 주기**: 매일 00:00 (Asia/Seoul)  
**알람 임계값**: > 10명

---

## 🔧 운영 체크리스트

### 일일 체크

- [ ] 24시간 채팅 발생률 확인 (목표: ≥27%)
- [ ] 부스트 적용률 확인 (목표: ≥60%)
- [ ] 부스트 효과 확인 (부스트 vs 일반 채팅 발생률)
- [ ] 저품질 반복 게시물 수 확인 (알람: >10명)

### 주간 체크

- [ ] 부스트 가중치 조정 필요 여부 검토
- [ ] 이미지 품질 임계값 조정 필요 여부 검토
- [ ] 부스트 지속 시간 조정 필요 여부 검토

### 월간 체크

- [ ] 부스트 효과 종합 분석
- [ ] 사용자 피드백 반영
- [ ] 운영 규칙 개선

---

## 🚨 알람 조건

### 1. 24시간 채팅 발생률 < 27%

```typescript
if (chatRate < 27) {
  await sendAlert({
    type: "KPI_ALERT",
    metric: "24h_chat_rate",
    value: chatRate,
    threshold: 27,
    message: "24시간 채팅 발생률이 목표치 미달입니다.",
  });
}
```

---

### 2. 저품질 반복 게시물 > 10명

```typescript
if (repeatedLowQualityUsers > 10) {
  await sendAlert({
    type: "QUALITY_ALERT",
    metric: "repeated_low_quality_users",
    value: repeatedLowQualityUsers,
    threshold: 10,
    message: "저품질 반복 게시물 작성자가 증가했습니다.",
  });
}
```

---

## 📝 운영 로그 형식

### 부스트 적용 로그

```json
{
  "event": "BOOST_APPLIED",
  "postId": "market_123",
  "imageQuality": 95,
  "boostEndTime": "2024-01-01T12:30:00Z",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### 부스트 만료 로그

```json
{
  "event": "BOOST_EXPIRED",
  "postId": "market_123",
  "boostChatCount": 1,
  "timestamp": "2024-01-01T12:30:00Z"
}
```

### 채팅 발생 로그

```json
{
  "event": "BOOST_CHAT_OCCURRED",
  "postId": "market_123",
  "chatRoomId": "chat_456",
  "boostChatCount": 1,
  "timestamp": "2024-01-01T12:15:00Z"
}
```

---

**30분 부스트 로직 운영 세트 완성**
