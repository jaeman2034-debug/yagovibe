# 🔥 어뷰징 탐지 룰셋 v2 운영 플레이북

**목표**: 이미지 재사용, 제목 변형, 다계정 반복, 패턴 유사 게시 탐지  
**배포 상태**: ✅ 프로덕션 준비 완료

---

## 📊 탐지 조건표

### 1. 이미지 재사용 탐지

**탐지 조건**:
```typescript
최근 30일 내 동일 이미지 해시 >= 1개
```

**판정 기준**:
- ✅ 이미지 해시 일치 → 재사용 탐지
- ✅ 재사용 횟수 >= 1 → 어뷰징 플래그

**예시**:
```
게시물 A: 이미지 해시 [abc123, def456]
게시물 B: 이미지 해시 [abc123, xyz789]
→ abc123 일치, 재사용 탐지
```

---

### 2. 제목 변형 패턴 탐지

**탐지 조건**:
```typescript
동일 작성자 30일 내 유사 제목 >= 2개
AND 제목 유사도 >= 85%
```

**판정 기준**:
- ✅ 제목 유사도 >= 85% → 변형 패턴 탐지
- ✅ 유사 제목 >= 2개 → 어뷰징 플래그

**예시**:
```
게시물 1: "나이키 축구화 판매"
게시물 2: "나이키 축구화 급처"
게시물 3: "나이키 축구화 판매합니다"
→ 유사도 85% 이상, 변형 패턴 탐지
```

---

### 3. 다계정 반복 탐지

**탐지 조건**:
```typescript
동일 패턴 게시물 작성 계정 >= 3개
```

**판정 기준**:
- ✅ 유사 패턴 게시물이 3계정 이상 → 다계정 반복 탐지
- ✅ 디바이스 ID 또는 IP 주소 기반 그룹화

**예시**:
```
계정 A: "나이키 축구화 판매" (이미지 abc123)
계정 B: "나이키 축구화 판매" (이미지 abc123)
계정 C: "나이키 축구화 판매" (이미지 abc123)
→ 3계정 이상, 다계정 반복 탐지
```

---

### 4. 패턴 유사 게시 자동 병합 검수

**탐지 조건**:
```typescript
최근 7일 내 유사 패턴 게시물 >= 1개
AND 종합 유사도 >= 80%
```

**판정 기준**:
- ✅ 제목 유사도 × 0.5 + 이미지 유사도 × 0.5 >= 80% → 패턴 유사
- ✅ 유사 게시물 >= 1개 → 병합 검수 큐 등록

**예시**:
```
게시물 A: 제목 유사도 90%, 이미지 유사도 70%
종합 유사도 = (90% × 0.5) + (70% × 0.5) = 80%
→ 패턴 유사, 병합 검수 등록
```

---

## ⚠️ 제재 단계표

### 단계 1: 어뷰징 플래그 설정

**조건**: 이미지 재사용 OR 제목 변형 OR 패턴 유사

**자동 조치**:
1. ✅ `abuseDetected: true` 설정
2. ✅ `abuseFlags` 배열에 플래그 기록
3. ✅ `abuseDetails`에 상세 정보 저장

**해제 조건**: 검수 완료 후 수동 해제

---

### 단계 2: 병합 검수 큐 등록

**조건**: 패턴 유사도 >= 80%

**자동 조치**:
1. ✅ 검수 큐 자동 등록 (`priority: HIGH`)
2. ✅ `reason: "PATTERN_SIMILARITY_MERGE"`
3. ✅ 유사 게시물 목록 포함

**해제 조건**: 검수 완료 후 수동 해제

---

### 단계 3: 부스트 제외 (연계)

**조건**: `abuseDetected === true`

**자동 조치**:
1. ✅ 부스트 자동 제외
2. ✅ `boostBlocked: true` 설정
3. ✅ `boostBlockReason: "ABUSE_DETECTED"` 기록

**해제 조건**: 검수 완료 후 수동 해제

---

## 💬 운영 문구 (복사-붙여넣기)

### 1. 이미지 재사용 안내

```
제목: 이미지 재사용 안내
내용: 등록하신 이미지가 다른 게시물에서 사용된 것으로 확인되었습니다. 검수 대기 중입니다.
```

---

### 2. 제목 변형 패턴 안내

```
제목: 제목 변형 패턴 안내
내용: 유사한 제목의 게시물이 반복 등록되었습니다. 검수 대기 중입니다.
```

---

### 3. 패턴 유사 게시 병합 안내

```
제목: 유사 게시물 병합 안내
내용: 유사한 패턴의 게시물이 감지되어 병합 검수가 진행됩니다.
```

---

### 4. 게시물 카드 어뷰징 플래그 표시

```tsx
{post.abuseDetected && (
  <div className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
    <AlertTriangle className="w-3 h-3" />
    <span>검수 중</span>
  </div>
)}
```

---

## 🔧 예외 정책

### 1. 정상적인 재사용 허용

**예외 조건**:
- ✅ 판매 완료 후 재등록 (30일 경과)
- ✅ 가격/상태 변경 후 재등록
- ✅ 검수 완료 후 정상 게시물

**처리 방법**:
```typescript
// 판매 완료 후 30일 경과한 게시물은 재사용 허용
const soldAt = post.soldAt?.toDate();
if (soldAt && (Date.now() - soldAt.getTime()) > 30 * 24 * 60 * 60 * 1000) {
  // 재사용 허용
}
```

---

### 2. 브랜드/카테고리별 정상 유사도

**예외 조건**:
- ✅ 동일 브랜드/카테고리 게시물
- ✅ 정상적인 시리즈 제품
- ✅ 검수 완료된 게시물

**처리 방법**:
```typescript
// 동일 브랜드/카테고리는 유사도 임계값 완화
if (post.brand === existingPost.brand && 
    post.category === existingPost.category) {
  const relaxedThreshold = PATTERN_MERGE_THRESHOLD * 1.2; // 20% 완화
}
```

---

### 3. 검수 완료 게시물 제외

**예외 조건**:
- ✅ 검수 큐에서 승인된 게시물
- ✅ 관리자 수동 승인 게시물

**처리 방법**:
```typescript
// 검수 완료된 게시물은 어뷰징 탐지에서 제외
const inspectionStatus = await getInspectionStatus(postId);
if (inspectionStatus === "APPROVED") {
  // 어뷰징 탐지 제외
}
```

---

## 📈 모니터링 지표 (일일 체크)

### 1. 어뷰징 탐지율

```typescript
// 목표: ≤3%
const dayStart = Timestamp.fromDate(
  new Date(new Date().setHours(0, 0, 0, 0))
);

const totalPosts = await db
  .collection("market")
  .where("createdAt", ">=", dayStart)
  .get();

const abusePosts = await db
  .collection("market")
  .where("abuseDetected", "==", true)
  .where("createdAt", ">=", dayStart)
  .get();

const abuseRate = (abusePosts.size / totalPosts.size) * 100;
```

**측정 주기**: 매일 00:00 (Asia/Seoul)  
**알람 임계값**: > 3%

---

### 2. 이미지 재사용율

```typescript
// 목표: ≤2%
const imageReusePosts = abusePosts.docs.filter(
  (doc) => doc.data().abuseFlags?.includes("IMAGE_REUSE")
).length;

const imageReuseRate = (imageReusePosts / totalPosts.size) * 100;
```

**측정 주기**: 매일 00:00 (Asia/Seoul)  
**알람 임계값**: > 2%

---

### 3. 패턴 유사 병합 검수율

```typescript
// 목표: ≤1%
const mergeQueue = await db
  .collection("inspectionQueue")
  .where("reason", "==", "PATTERN_SIMILARITY_MERGE")
  .where("createdAt", ">=", dayStart)
  .get();

const mergeRate = (mergeQueue.size / totalPosts.size) * 100;
```

**측정 주기**: 매일 00:00 (Asia/Seoul)  
**알람 임계값**: > 1%

---

## 🚨 알람 조건

### 1. 어뷰징 탐지율 > 3%

```typescript
if (abuseRate > 3) {
  await sendAlert({
    type: "ABUSE_DETECTION_ALERT",
    metric: "abuse_rate",
    value: abuseRate,
    threshold: 3,
    message: "어뷰징 탐지율이 목표치를 초과했습니다.",
  });
}
```

---

### 2. 이미지 재사용율 > 2%

```typescript
if (imageReuseRate > 2) {
  await sendAlert({
    type: "IMAGE_REUSE_ALERT",
    metric: "image_reuse_rate",
    value: imageReuseRate,
    threshold: 2,
    message: "이미지 재사용율이 목표치를 초과했습니다.",
  });
}
```

---

## 🔧 운영 체크리스트

### 일일 체크 (매일 00:00)

- [ ] 어뷰징 탐지율 확인 (목표: ≤3%)
- [ ] 이미지 재사용율 확인 (목표: ≤2%)
- [ ] 패턴 유사 병합 검수율 확인 (목표: ≤1%)

### 주간 체크 (매주 월요일)

- [ ] 어뷰징 탐지 임계값 조정 필요 여부 검토
- [ ] 예외 정책 조정 필요 여부 검토
- [ ] 사용자 피드백 반영

### 월간 체크 (매월 1일)

- [ ] 어뷰징 탐지 효과 종합 분석
- [ ] 운영 규칙 개선

---

## 📝 운영 로그 형식

### 이미지 재사용 탐지 로그

```json
{
  "event": "IMAGE_REUSE_DETECTED",
  "postId": "market_123",
  "userId": "user_456",
  "reusedCount": 2,
  "similarPosts": ["market_111", "market_222"],
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### 제목 변형 패턴 탐지 로그

```json
{
  "event": "TITLE_VARIATION_DETECTED",
  "postId": "market_123",
  "userId": "user_456",
  "similarTitles": ["market_111", "market_222"],
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### 패턴 유사 병합 검수 로그

```json
{
  "event": "PATTERN_SIMILARITY_MERGE",
  "postId": "market_123",
  "userId": "user_456",
  "similarPosts": ["market_111", "market_222"],
  "overallSimilarity": 0.85,
  "timestamp": "2024-01-01T12:00:00Z"
}
```

---

**어뷰징 탐지 룰셋 v2 운영 플레이북 완성**
