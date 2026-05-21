# 🔥 부스트 어뷰징 탐지 룰셋 운영 플레이북

**목표**: 품질을 지키며 전환을 유지하는 핵심 레버  
**배포 상태**: ✅ 프로덕션 준비 완료

---

## 📊 패턴 정의

### 1. FREQUENT_POSTING (빈번한 게시)

**패턴 설명**:
- 동일 계정이 24시간 내 부스트 게시물을 3회 이상 생성
- 낚시 매물 반복 생성으로 부스트 남용

**탐지 기준**:
```typescript
24시간 내 부스트 횟수 >= 3회
```

**예시**:
```
사용자 A:
- 10:00 부스트 게시물 1
- 14:00 부스트 게시물 2
- 18:00 부스트 게시물 3
→ 3회 도달, 다음 게시물부터 부스트 제외
```

---

### 2. LOW_QUALITY_SPAM (저품질 스팸)

**패턴 설명**:
- 30일 내 게시물 5회 이상
- 저품질 비율 60% 이상
- 반복적인 저품질 게시물로 플랫폼 품질 저하

**탐지 기준**:
```typescript
30일 내 게시물 수 >= 5회
AND 저품질 비율 >= 60%
```

**예시**:
```
사용자 B:
- 30일 내 게시물: 6회
- 저품질 게시물: 4회 (품질 < 90)
- 저품질 비율: 66.7%
→ 반복 패턴 감지, 72h 정지
```

---

### 3. DUPLICATE_CONTENT (중복 콘텐츠)

**패턴 설명**:
- 동일 제목/이미지 반복 게시
- 짧은 시간 내 유사 게시물 다수 생성

**탐지 기준**:
```typescript
제목 유사도 > 90%
OR 이미지 해시 동일
```

**예시**:
```
사용자 C:
- 게시물 1: "나이키 축구화 판매"
- 게시물 2: "나이키 축구화 판매" (제목 동일)
→ 중복 콘텐츠 감지, 부스트 제외
```

---

## 🔍 탐지 조건 (즉시 실행)

### 1. 24시간 내 부스트 횟수 체크

```typescript
// Firestore Console → Query
Collection: market
Where:
  - authorId == {userId}
  - boostActive == true
  - boostStartTime >= (24시간 전 Timestamp)
```

**Cloud Functions 코드**:
```typescript
const twentyFourHoursAgo = Timestamp.fromDate(
  new Date(Date.now() - 24 * 60 * 60 * 1000)
);

const recentBoostedPosts = await db
  .collection("market")
  .where("authorId", "==", authorId)
  .where("boostActive", "==", true)
  .where("boostStartTime", ">=", twentyFourHoursAgo)
  .get();

const boostCount24h = recentBoostedPosts.size;

if (boostCount24h >= 3) {
  // 부스트 제외
}
```

---

### 2. 반복 패턴 감지

```typescript
// Firestore Console → Query
Collection: market
Where:
  - authorId == {userId}
  - createdAt >= (30일 전 Timestamp)
```

**Cloud Functions 코드**:
```typescript
const thirtyDaysAgo = Timestamp.fromDate(
  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
);

const recentPosts = await db
  .collection("market")
  .where("authorId", "==", authorId)
  .where("createdAt", ">=", thirtyDaysAgo)
  .get();

const postCount30d = recentPosts.size;
const lowQualityPosts = recentPosts.docs.filter(
  (doc) => (doc.data().imageQuality || 0) < 90
).length;

const lowQualityRate = postCount30d > 0 ? lowQualityPosts / postCount30d : 0;

if (postCount30d >= 5 && lowQualityRate >= 0.6) {
  // 반복 패턴 감지, 72h 정지
}
```

---

### 3. 사용자 정지 상태 확인

```typescript
// Firestore Console → Query
Collection: users
Document: {userId}
Fields:
  - suspendedUntil (Timestamp)
  - suspensionReason (string)
```

**Cloud Functions 코드**:
```typescript
const userRef = db.collection("users").doc(authorId);
const userSnap = await userRef.get();

if (userSnap.exists) {
  const userData = userSnap.data() as any;
  const suspendedUntil = userData.suspendedUntil?.toDate?.() || 
    (userData.suspendedUntil?.seconds ? 
      new Date(userData.suspendedUntil.seconds * 1000) : null);

  if (suspendedUntil && suspendedUntil > new Date()) {
    // 정지 중, 부스트 제외
  }
}
```

---

## ⚠️ 제재 단계표

### 단계 1: 부스트 제외 (24시간)

**조건**: 24시간 내 부스트 3회 초과

**자동 조치**:
1. ✅ `boostBlocked: true` 설정
2. ✅ `boostBlockReason: "FREQUENT_POSTING_24H"` 기록
3. ✅ 부스트 미적용

**해제 조건**: 24시간 경과 후 자동 해제

**사용자 안내**:
```
제목: 부스트 제한 안내
내용: 24시간 내 부스트 횟수를 초과했습니다. 내일 다시 시도해주세요.
```

---

### 단계 2: 경고 + 검수 큐 등록

**조건**: 반복 패턴 감지 (30일 내 5회 이상 + 저품질 60%)

**자동 조치**:
1. ✅ 검수 큐 자동 등록 (`priority: HIGH`)
2. ✅ `boostBlocked: true` 설정
3. ✅ `boostBlockReason: "ABUSE_PATTERN_DETECTED"` 기록

**해제 조건**: 검수 완료 후 수동 해제

**사용자 안내**:
```
제목: 게시물 품질 개선 안내
내용: 반복적인 저품질 게시물이 감지되었습니다. 더 나은 품질의 게시물을 올려주세요.
```

---

### 단계 3: 72시간 정지

**조건**: 반복 패턴 감지 (30일 내 5회 이상 + 저품질 60%)

**자동 조치**:
1. ✅ `suspendedUntil: 72시간 후` 설정
2. ✅ `suspensionReason: "BOOST_ABUSE_PATTERN"` 기록
3. ✅ `suspensionCount` 증가
4. ✅ 부스트 제외
5. ✅ CS 검수 큐 자동 연결

**해제 조건**: 72시간 경과 후 자동 해제

**사용자 안내**:
```
제목: 계정 일시 정지 안내
내용: 반복적인 저품질 게시물 패턴이 감지되어 72시간 동안 게시물 등록이 제한됩니다.
```

---

## 💬 사용자 안내 문구 (복사-붙여넣기)

### 1. 부스트 제외 안내 (24h 3회 초과)

```
제목: 부스트 제한 안내
내용: 24시간 내 부스트 횟수를 초과했습니다. 내일 다시 시도해주세요.
```

---

### 2. 반복 패턴 경고

```
제목: 게시물 품질 개선 안내
내용: 반복적인 저품질 게시물이 감지되었습니다. 더 나은 품질의 게시물을 올려주세요.
```

---

### 3. 72시간 정지 안내

```
제목: 계정 일시 정지 안내
내용: 반복적인 저품질 게시물 패턴이 감지되어 72시간 동안 게시물 등록이 제한됩니다.
```

---

### 4. 게시물 카드 부스트 제외 표시

```tsx
{post.boostBlocked && (
  <div className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
    <AlertCircle className="w-3 h-3" />
    <span>부스트 제한</span>
  </div>
)}
```

---

### 5. 게시물 등록 완료 화면 (부스트 제외 시)

```tsx
<div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
  <p className="text-sm font-medium text-yellow-800">
    ⚠️ 부스트 제한 안내
  </p>
  <p className="text-xs text-yellow-600 mt-1">
    24시간 내 부스트 횟수를 초과했습니다. 내일 다시 시도해주세요.
  </p>
</div>
```

---

## 📈 모니터링 지표 (일일 체크)

### 1. 부스트 제외율

```typescript
// 목표: ≤5%
const dayStart = Timestamp.fromDate(
  new Date(new Date().setHours(0, 0, 0, 0))
);

const totalPosts = await db
  .collection("market")
  .where("createdAt", ">=", dayStart)
  .get();

const blockedPosts = await db
  .collection("market")
  .where("boostBlocked", "==", true)
  .where("createdAt", ">=", dayStart)
  .get();

const blockRate = (blockedPosts.size / totalPosts.size) * 100;
```

**측정 주기**: 매일 00:00 (Asia/Seoul)  
**알람 임계값**: > 5%

---

### 2. 반복 패턴 감지율

```typescript
// 목표: ≤2%
const suspendedUsers = await db
  .collection("users")
  .where("suspensionReason", "==", "BOOST_ABUSE_PATTERN")
  .where("suspendedUntil", ">", Timestamp.now())
  .get();

const totalUsers = await db
  .collection("users")
  .where("createdAt", ">=", thirtyDaysAgo)
  .get();

const patternRate = (suspendedUsers.size / totalUsers.size) * 100;
```

**측정 주기**: 매일 00:00 (Asia/Seoul)  
**알람 임계값**: > 2%

---

## 🚨 알람 조건

### 1. 부스트 제외율 > 5%

```typescript
if (blockRate > 5) {
  await sendAlert({
    type: "BOOST_BLOCK_ALERT",
    metric: "boost_block_rate",
    value: blockRate,
    threshold: 5,
    message: "부스트 제외율이 목표치를 초과했습니다.",
  });
}
```

---

### 2. 반복 패턴 감지율 > 2%

```typescript
if (patternRate > 2) {
  await sendAlert({
    type: "ABUSE_PATTERN_ALERT",
    metric: "abuse_pattern_rate",
    value: patternRate,
    threshold: 2,
    message: "반복 패턴 감지율이 목표치를 초과했습니다.",
  });
}
```

---

## 🔧 운영 체크리스트

### 일일 체크 (매일 00:00)

- [ ] 부스트 제외율 확인 (목표: ≤5%)
- [ ] 반복 패턴 감지율 확인 (목표: ≤2%)
- [ ] 정지 사용자 수 확인

### 주간 체크 (매주 월요일)

- [ ] 부스트 제한 임계값 조정 필요 여부 검토
- [ ] 반복 패턴 임계값 조정 필요 여부 검토
- [ ] 사용자 피드백 반영

### 월간 체크 (매월 1일)

- [ ] 부스트 어뷰징 효과 종합 분석
- [ ] 운영 규칙 개선

---

## 📝 운영 로그 형식

### 부스트 제외 로그

```json
{
  "event": "BOOST_BLOCKED",
  "postId": "market_123",
  "userId": "user_456",
  "reason": "FREQUENT_POSTING_24H",
  "boostCount24h": 3,
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### 반복 패턴 감지 로그

```json
{
  "event": "ABUSE_PATTERN_DETECTED",
  "userId": "user_456",
  "postCount30d": 6,
  "lowQualityRate": 0.67,
  "suspensionEndTime": "2024-01-04T12:00:00Z",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

---

**부스트 어뷰징 탐지 룰셋 운영 플레이북 완성**
