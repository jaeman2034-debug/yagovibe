# 🔥 실전 구현 로드맵

**상태**: ✅ 코드 준비 완료, 배포 대기  
**우선순위**: 코어 안정 레이어 5개 기능 즉시 배포

---

## 📦 배포 패키지 구성

### ✅ 1. 코어 안정 엔진 (완료)
**파일**: `functions/src/market/coreStabilityEngine.ts`

**기능**:
- ✅ 부스트 계산 (`calculateBoost`)
- ✅ 가격 규율 체크 (`checkPriceRule`)
- ✅ 채팅 권한 체크 (`checkChatPermission`)
- ✅ 에스크로 필요 여부 체크 (`checkEscrowRequired`)
- ✅ CS 자동 라우팅 (`routeCSIssue`)

---

### ✅ 2. 통합 게시물 처리기 (완료)
**파일**: `functions/src/market/integratedPostProcessor.ts`

**트리거**:
- `onMarketPostCreated` - 게시물 생성 시
- `onMarketPostUpdated` - 게시물 업데이트 시

**처리 내용**:
1. 부스트 계산 및 적용
2. 가격 규율 체크 (가이드 가격 대비 ±20%/40%/60%/80%)
3. 지역별 가격 통계 기반 추가 체크 (2σ 이상)
4. 작성자 인증 상태 저장 (피드 점수 계산용)

---

### ✅ 3. 통합 거래 처리기 (완료)
**파일**: `functions/src/market/integratedTradeProcessor.ts`

**트리거**:
- `onTradeCreated` - 거래 생성 시

**처리 내용**:
1. 구매자 채팅 권한 체크 (미인증 시 거래 취소)
2. 판매자 채팅 권한 체크 (미인증 시 거래 취소)
3. 에스크로 필요 여부 체크 (위험도 0.5 이상 시 필수)

---

### ✅ 4. 통합 CS 자동 라우터 (완료)
**파일**: `functions/src/cs/integratedCSRouter.ts`

**트리거**:
- `onDisputeCreated` - 분쟁 생성 시

**처리 내용**:
1. 이슈 타입 자동 분류 (PRICE, STATE, DELIVERY, PAYMENT, OTHER)
2. CS 자동 라우팅 (템플릿 자동 응답 또는 상담원 연결)
3. 자동 응답 발송 (상담원 불필요 시)

---

## 🚀 배포 순서

### STEP 1: 코어 엔진 배포
```bash
cd functions
npm run build
firebase deploy --only functions:onMarketPostCreated,functions:onMarketPostUpdated
```

**검증**:
- 게시물 생성 시 부스트 적용 확인
- 가격 규율 체크 동작 확인

---

### STEP 2: 거래 처리기 배포
```bash
firebase deploy --only functions:onTradeCreated
```

**검증**:
- 거래 생성 시 에스크로 체크 동작 확인
- 미인증 사용자 거래 취소 확인

---

### STEP 3: CS 라우터 배포
```bash
firebase deploy --only functions:onDisputeCreated
```

**검증**:
- 분쟁 생성 시 자동 분류 확인
- 템플릿 자동 응답 발송 확인

---

### STEP 4: 전체 배포
```bash
firebase deploy
```

---

## 🧪 검증 시나리오

### 시나리오 1: 미인증 → 채팅 불가 ✅

**준비**:
1. 미인증 사용자 계정 생성
2. 게시물 생성

**실행**:
1. 미인증 사용자로 채팅 시도
2. `useChatLimit` 훅에서 `canChat: false` 반환 확인
3. Firestore Rules에서 채팅 메시지 작성 차단 확인

**예상 결과**:
- ✅ 채팅 버튼 비활성화
- ✅ 메시지 작성 불가
- ✅ "인증이 필요합니다" 메시지 표시

---

### 시나리오 2: 저품질 → 부스트 X ✅

**준비**:
1. 이미지 품질 < 95인 게시물 생성

**실행**:
1. `onMarketPostCreated` 트리거 확인
2. `calculateBoost` 함수 실행
3. `boostActive: false` 설정 확인

**예상 결과**:
- ✅ `market/{postId}.boostActive = false`
- ✅ `market/{postId}.boostBlocked = true`
- ✅ `market/{postId}.boostBlockReason = "IMAGE_QUALITY_LOW"`

---

### 시나리오 3: 고가+저평판 → 에스크로 ✅

**준비**:
1. 가격 20만원 이상 게시물
2. 평판 < 3.5인 판매자
3. 거래 생성

**실행**:
1. `onTradeCreated` 트리거 확인
2. `checkEscrowRequired` 함수 실행
3. `escrowRequired: true` 설정 확인

**예상 결과**:
- ✅ `trades/{tradeId}.escrowRequired = true`
- ✅ `trades/{tradeId}.escrowForced = true`
- ✅ `trades/{tradeId}.escrowReason` 포함

---

### 시나리오 4: 이상가격 → 노출 감소 ✅

**준비**:
1. 가이드 가격 대비 ±20% 초과 게시물 생성

**실행**:
1. `onMarketPostCreated` 트리거 확인
2. `checkPriceRule` 함수 실행
3. `exposurePenalty: 0.3` 설정 확인
4. 피드 점수 계산 시 페널티 적용 확인

**예상 결과**:
- ✅ `market/{postId}.priceRuleResult = "DOWN"`
- ✅ `market/{postId}.exposurePenalty = 0.3`
- ✅ `market/{postId}.priceAnomaly = true`
- ✅ 피드 점수 -30% 감소

---

### 시나리오 5: CS 자동 응답 ✅

**준비**:
1. 가격 분쟁 생성

**실행**:
1. `onDisputeCreated` 트리거 확인
2. 이슈 타입 자동 분류 확인 (PRICE)
3. 템플릿 자동 응답 발송 확인

**예상 결과**:
- ✅ `disputes/{disputeId}.issueType = "PRICE"`
- ✅ `disputes/{disputeId}.botResponded = true`
- ✅ `disputes/{disputeId}.stage = "AUTO_RESPONDED"`
- ✅ 자동 응답 메시지 저장

---

## 📊 모니터링 지표

### 1. 부스트 적용률
```typescript
const boostedPosts = await db
  .collection("market")
  .where("boostActive", "==", true)
  .get();

const boostRate = boostedPosts.size / totalPosts.size;
// 목표: ≥30%
```

### 2. 가격 규율 적용률
```typescript
const priceAnomalyPosts = await db
  .collection("market")
  .where("priceAnomaly", "==", true)
  .get();

const anomalyRate = priceAnomalyPosts.size / totalPosts.size;
// 목표: ≤10%
```

### 3. 에스크로 적용률
```typescript
const escrowTrades = await db
  .collection("trades")
  .where("escrowRequired", "==", true)
  .get();

const escrowRate = escrowTrades.size / totalTrades.size;
// 목표: ≥40%
```

### 4. CS 자동 처리율
```typescript
const autoResolvedDisputes = await db
  .collection("disputes")
  .where("botResponded", "==", true)
  .get();

const autoProcessRate = autoResolvedDisputes.size / totalDisputes.size;
// 목표: ≥99%
```

---

## 🔧 트러블슈팅

### 문제 1: Functions 배포 실패

**원인**: TypeScript 컴파일 에러  
**해결**:
```bash
cd functions
npm run build
# 에러 확인 후 수정
```

### 문제 2: 트리거 동작 안 함

**원인**: Firestore Rules 차단  
**해결**:
```bash
# Rules 확인
firebase firestore:rules:get
# Rules 배포
firebase deploy --only firestore:rules
```

### 문제 3: 부스트 미적용

**원인**: 이미지 품질 점수 없음  
**해결**:
- 게시물에 `imageQuality` 필드 추가
- 이미지 품질 분석 함수 실행 확인

---

## 📝 배포 후 확인

### 즉시 확인 (배포 직후)
- [ ] Functions 로그 확인 (Cloud Console)
- [ ] 첫 게시물 생성 테스트
- [ ] 첫 거래 생성 테스트
- [ ] 첫 분쟁 생성 테스트

### 24시간 후 확인
- [ ] 부스트 적용률 확인
- [ ] 가격 규율 적용률 확인
- [ ] 에스크로 적용률 확인
- [ ] CS 자동 처리율 확인

---

**실전 구현 로드맵 완성**
