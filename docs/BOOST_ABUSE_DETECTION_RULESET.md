# 🔥 부스트 어뷰징 탐지 룰셋

**목표**: 전환은 유지하면서 품질을 지키는 핵심 레버  
**배포 상태**: ✅ 프로덕션 준비 완료

---

## 📊 어뷰징 패턴 정의

### 1. FREQUENT_POSTING (빈번한 게시)

**패턴**:
- 24시간 내 부스트 횟수 3회 초과
- 동일 계정 반복 게시

**탐지 조건**:
```typescript
const boostCount24h = recentBoostedPosts.size;
if (boostCount24h >= 3) {
  // 부스트 제외
}
```

**제재**: 부스트 제외 (24시간)

---

### 2. LOW_QUALITY_SPAM (저품질 스팸)

**패턴**:
- 30일 내 게시물 5회 이상
- 저품질 비율 60% 이상

**탐지 조건**:
```typescript
const postCount30d = recentPosts.size;
const lowQualityRate = lowQualityPosts / postCount30d;

if (postCount30d >= 5 && lowQualityRate >= 0.6) {
  // 반복 패턴 감지
}
```

**제재**: 72시간 정지 + 부스트 제외

---

### 3. DUPLICATE_CONTENT (중복 콘텐츠)

**패턴**:
- 동일 제목/이미지 반복 게시
- 짧은 시간 내 유사 게시물 다수

**탐지 조건**:
```typescript
// 제목 유사도 체크
const titleSimilarity = calculateSimilarity(newTitle, existingTitles);
if (titleSimilarity > 0.9) {
  // 중복 콘텐츠 감지
}
```

**제재**: 부스트 제외 + 경고

---

## 🔍 탐지 조건

### 1. 24시간 내 부스트 횟수 체크

```typescript
// Firestore Console → Query
Collection: market
Where:
  - authorId == {userId}
  - boostActive == true
  - boostStartTime >= (24시간 전)
```

**조건**:
- ✅ 3회 이상 → 부스트 제외
- ✅ 3회 미만 → 부스트 허용

---

### 2. 반복 패턴 감지

```typescript
// Firestore Console → Query
Collection: market
Where:
  - authorId == {userId}
  - createdAt >= (30일 전)
```

**조건**:
- ✅ 30일 내 5회 이상 + 저품질 비율 60% 이상 → 72h 정지
- ✅ 그 외 → 정상 처리

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

**조건**:
- ✅ `suspendedUntil > now()` → 부스트 제외
- ✅ `suspendedUntil <= now()` → 부스트 허용

---

## ⚠️ 제재 단계표

### 단계 1: 부스트 제외 (24시간)

**조건**: 24시간 내 부스트 3회 초과

**조치**:
- ✅ `boostBlocked: true`
- ✅ `boostBlockReason: "FREQUENT_POSTING_24H"`
- ✅ 부스트 미적용

**해제**: 24시간 경과 후 자동 해제

---

### 단계 2: 경고 + 검수 큐 등록

**조건**: 반복 패턴 감지 (30일 내 5회 이상 + 저품질 60%)

**조치**:
- ✅ 검수 큐 자동 등록
- ✅ `priority: "HIGH"`
- ✅ 판매자 경고 메시지

**해제**: 검수 완료 후 수동 해제

---

### 단계 3: 72시간 정지

**조건**: 반복 패턴 감지 (30일 내 5회 이상 + 저품질 60%)

**조치**:
- ✅ `suspendedUntil: 72시간 후`
- ✅ `suspensionReason: "BOOST_ABUSE_PATTERN"`
- ✅ 부스트 제외
- ✅ CS 검수 큐 자동 연결

**해제**: 72시간 경과 후 자동 해제

---

## 💬 사용자 안내 문구

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

## 📈 모니터링 지표

### 1. 부스트 제외율

```typescript
// 목표: ≤5%
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

### 일일 체크

- [ ] 부스트 제외율 확인 (목표: ≤5%)
- [ ] 반복 패턴 감지율 확인 (목표: ≤2%)
- [ ] 정지 사용자 수 확인

### 주간 체크

- [ ] 부스트 제한 임계값 조정 필요 여부 검토
- [ ] 반복 패턴 임계값 조정 필요 여부 검토
- [ ] 사용자 피드백 반영

### 월간 체크

- [ ] 부스트 어뷰징 효과 종합 분석
- [ ] 운영 규칙 개선

---

**부스트 어뷰징 탐지 룰셋 완성**
