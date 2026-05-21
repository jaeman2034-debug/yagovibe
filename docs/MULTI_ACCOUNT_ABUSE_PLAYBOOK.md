# 🔥 멀티계정·재게시 어뷰징 룰셋 운영 플레이북

**목표**: 멀티계정 우회 부스트, 이미지 재사용, 제목 변형, 가격 급등락, 계정 교차 게시 탐지 및 제재  
**배포 상태**: ✅ 프로덕션 준비 완료

---

## 📊 탐지 조건표

### 1. 동일 IP/기기 24h 2회 초과

**탐지 조건**:
```typescript
동일 IP 주소 또는 디바이스 ID에서 24시간 내 부스트 횟수 >= 2회
```

**판정 기준**:
- ✅ 동일 IP/기기에서 부스트 횟수 >= 2회 → 부스트 제외
- ✅ `boostBlocked: true`, `boostBlockReason: "IP_DEVICE_LIMIT_24H"`

**예시**:
```
IP 192.168.1.1:
- 게시물 A: 부스트 활성 (12:00)
- 게시물 B: 부스트 활성 (14:00)
→ 2회 초과, 게시물 B 부스트 제외
```

---

### 2. 이미지 해시 중복

**탐지 조건**:
```typescript
최근 30일 내 동일 이미지 해시 >= 1개
```

**판정 기준**:
- ✅ 이미지 해시 일치 → 병합 검수 큐 등록
- ✅ `mergeInspection: true`, `reason: "IMAGE_HASH_DUPLICATE_MERGE"`

**예시**:
```
게시물 A: 이미지 해시 [abc123, def456]
게시물 B: 이미지 해시 [abc123, xyz789]
→ abc123 일치, 병합 검수 등록
```

---

### 3. 제목 유사도 85%↑ → 재게시 차단

**탐지 조건**:
```typescript
최근 7일 내 유사 제목 >= 1개
AND 제목 유사도 >= 85%
```

**판정 기준**:
- ✅ 제목 유사도 >= 85% → 게시물 차단
- ✅ `status: "blocked"`, `blockReason: "TITLE_SIMILARITY_BLOCK"`

**예시**:
```
게시물 1: "나이키 축구화 판매"
게시물 2: "나이키 축구화 판매합니다"
→ 유사도 90%, 게시물 2 차단
```

---

### 4. 가격 급등락 패턴

**탐지 조건**:
```typescript
동일 작성자 30일 내 가격 변동성 >= 50%
```

**판정 기준**:
- ✅ 가격 변동성 (표준편차 / 평균) >= 50% → 급등락 패턴 탐지
- ✅ `abuseFlags.priceVolatility: true`

**예시**:
```
작성자 A의 최근 게시물 가격:
- 게시물 1: 50,000원
- 게시물 2: 150,000원
- 게시물 3: 30,000원
→ 변동성 80%, 급등락 패턴 탐지
```

---

### 5. 계정 교차 게시

**탐지 조건**:
```typescript
최근 7일 내 유사 패턴 게시물 작성 계정 >= 2개
AND (제목 유사도 >= 80% OR 이미지 50% 이상 일치)
```

**판정 기준**:
- ✅ 2계정 이상에서 유사 패턴 → 계정 교차 게시 탐지
- ✅ `abuseFlags.crossAccountPosting: true`

**예시**:
```
계정 A: "나이키 축구화 판매" (이미지 abc123)
계정 B: "나이키 축구화 판매" (이미지 abc123)
→ 2계정 이상, 계정 교차 게시 탐지
```

---

## 🎯 점수 모델

### 어뷰징 점수 계산

```typescript
점수 = 0
+ IP/기기 제한 초과: +20점
+ 이미지 해시 중복: +25점
+ 제목 유사도 차단: +30점
+ 가격 급등락: +15점
+ 계정 교차 게시: +30점

임계값: 70점 이상 → 어뷰징 플래그 설정
```

**점수 예시**:
```
케이스 1: IP/기기 제한 초과 + 이미지 해시 중복
= 20 + 25 = 45점 → 어뷰징 플래그 없음

케이스 2: 제목 유사도 차단 + 계정 교차 게시
= 30 + 30 = 60점 → 어뷰징 플래그 없음

케이스 3: 제목 유사도 차단 + 계정 교차 게시 + 이미지 해시 중복
= 30 + 30 + 25 = 85점 → 어뷰징 플래그 설정
```

---

## ⚠️ 제재 단계표

### 단계 1: 부스트 제외

**조건**: 동일 IP/기기 24h 2회 초과

**자동 조치**:
1. ✅ `boostBlocked: true` 설정
2. ✅ `boostBlockReason: "IP_DEVICE_LIMIT_24H"` 기록
3. ✅ 부스트 자동 제외

**해제 조건**: 24시간 경과 후 자동 해제

---

### 단계 2: 병합 검수 큐 등록

**조건**: 이미지 해시 중복

**자동 조치**:
1. ✅ 검수 큐 자동 등록 (`priority: HIGH`)
2. ✅ `reason: "IMAGE_HASH_DUPLICATE_MERGE"`
3. ✅ 중복 게시물 목록 포함

**해제 조건**: 검수 완료 후 수동 해제

---

### 단계 3: 게시물 차단

**조건**: 제목 유사도 85%↑

**자동 조치**:
1. ✅ `status: "blocked"` 설정
2. ✅ `blockReason: "TITLE_SIMILARITY_BLOCK"` 기록
3. ✅ 유사 게시물 목록 포함

**해제 조건**: 검수 완료 후 수동 해제

---

### 단계 4: 어뷰징 플래그 설정

**조건**: 어뷰징 점수 >= 70점

**자동 조치**:
1. ✅ `abuseDetected: true` 설정
2. ✅ `abuseScore` 기록
3. ✅ `abuseFlags` 배열에 플래그 기록

**해제 조건**: 검수 완료 후 수동 해제

---

## 💬 사용자 안내 문구

### 1. IP/기기 제한 초과 안내

```
제목: 부스트 제한 안내
내용: 동일 기기에서 24시간 내 2회 이상 부스트를 사용할 수 없습니다. 24시간 후 다시 시도해주세요.
```

---

### 2. 이미지 해시 중복 안내

```
제목: 이미지 중복 안내
내용: 등록하신 이미지가 다른 게시물에서 사용된 것으로 확인되었습니다. 병합 검수가 진행됩니다.
```

---

### 3. 제목 유사도 차단 안내

```
제목: 게시물 차단 안내
내용: 유사한 제목의 게시물이 반복 등록되어 게시물이 차단되었습니다. 고유한 제목으로 다시 등록해주세요.
```

---

### 4. 가격 급등락 패턴 안내

```
제목: 가격 변동 패턴 안내
내용: 등록하신 가격이 최근 게시물과 크게 다릅니다. 시장 가격을 참고하여 가격을 조정해주세요.
```

---

### 5. 계정 교차 게시 안내

```
제목: 계정 교차 게시 안내
내용: 유사한 패턴의 게시물이 여러 계정에서 등록된 것으로 확인되었습니다. 검수 대기 중입니다.
```

---

## 🔧 예외 정책

### 1. 정상적인 재게시 허용

**예외 조건**:
- ✅ 판매 완료 후 30일 경과한 게시물
- ✅ 가격/상태 변경 후 재등록
- ✅ 검수 완료 후 정상 게시물

**처리 방법**:
```typescript
// 판매 완료 후 30일 경과한 게시물은 재게시 허용
const soldAt = post.soldAt?.toDate();
if (soldAt && (Date.now() - soldAt.getTime()) > 30 * 24 * 60 * 60 * 1000) {
  // 재게시 허용
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
  const relaxedThreshold = TITLE_SIMILARITY_BLOCK_THRESHOLD * 1.2; // 20% 완화
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

### 1. 멀티계정 어뷰징 탐지율

```typescript
// 목표: ≤2%
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
**알람 임계값**: > 2%

---

### 2. IP/기기 부스트 제한율

```typescript
// 목표: ≤1%
const boostBlockedPosts = await db
  .collection("market")
  .where("boostBlocked", "==", true)
  .where("boostBlockReason", "==", "IP_DEVICE_LIMIT_24H")
  .where("createdAt", ">=", dayStart)
  .get();

const boostBlockRate = (boostBlockedPosts.size / totalPosts.size) * 100;
```

**측정 주기**: 매일 00:00 (Asia/Seoul)  
**알람 임계값**: > 1%

---

### 3. 제목 유사도 차단율

```typescript
// 목표: ≤0.5%
const blockedPosts = await db
  .collection("market")
  .where("status", "==", "blocked")
  .where("blockReason", "==", "TITLE_SIMILARITY_BLOCK")
  .where("createdAt", ">=", dayStart)
  .get();

const blockRate = (blockedPosts.size / totalPosts.size) * 100;
```

**측정 주기**: 매일 00:00 (Asia/Seoul)  
**알람 임계값**: > 0.5%

---

## 🚨 알람 조건

### 1. 멀티계정 어뷰징 탐지율 > 2%

```typescript
if (abuseRate > 2) {
  await sendAlert({
    type: "MULTI_ACCOUNT_ABUSE_ALERT",
    metric: "abuse_rate",
    value: abuseRate,
    threshold: 2,
    message: "멀티계정 어뷰징 탐지율이 목표치를 초과했습니다.",
  });
}
```

---

### 2. IP/기기 부스트 제한율 > 1%

```typescript
if (boostBlockRate > 1) {
  await sendAlert({
    type: "IP_DEVICE_BOOST_LIMIT_ALERT",
    metric: "boost_block_rate",
    value: boostBlockRate,
    threshold: 1,
    message: "IP/기기 부스트 제한율이 목표치를 초과했습니다.",
  });
}
```

---

## 🔧 운영 체크리스트

### 일일 체크 (매일 00:00)

- [ ] 멀티계정 어뷰징 탐지율 확인 (목표: ≤2%)
- [ ] IP/기기 부스트 제한율 확인 (목표: ≤1%)
- [ ] 제목 유사도 차단율 확인 (목표: ≤0.5%)

### 주간 체크 (매주 월요일)

- [ ] 어뷰징 탐지 임계값 조정 필요 여부 검토
- [ ] 예외 정책 조정 필요 여부 검토
- [ ] 사용자 피드백 반영

### 월간 체크 (매월 1일)

- [ ] 어뷰징 탐지 효과 종합 분석
- [ ] 운영 규칙 개선

---

## 📝 운영 로그 형식

### IP/기기 부스트 제한 로그

```json
{
  "event": "IP_DEVICE_BOOST_LIMIT_EXCEEDED",
  "postId": "market_123",
  "userId": "user_456",
  "deviceId": "device_789",
  "ipAddress": "192.168.1.1",
  "boostCount": 2,
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### 제목 유사도 차단 로그

```json
{
  "event": "TITLE_SIMILARITY_BLOCKED",
  "postId": "market_123",
  "userId": "user_456",
  "similarPosts": ["market_111", "market_222"],
  "similarity": 0.9,
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### 계정 교차 게시 로그

```json
{
  "event": "CROSS_ACCOUNT_POSTING_DETECTED",
  "postId": "market_123",
  "userId": "user_456",
  "accountCount": 2,
  "similarPosts": ["market_111", "market_222"],
  "timestamp": "2024-01-01T12:00:00Z"
}
```

---

**멀티계정·재게시 어뷰징 룰셋 운영 플레이북 완성**
