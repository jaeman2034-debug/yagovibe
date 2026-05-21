# 🔥 실전 배포 실행 키트

**목표**: 코어 안정 레이어 5개 기능 즉시 배포  
**상태**: ✅ 코드 준비 완료

---

## 📦 배포 패키지 구성

### 1. 코어 안정 엔진
- `functions/src/market/coreStabilityEngine.ts` - 통합 엔진 (부스트, 가격, 인증, 에스크로, CS)

### 2. 통합 처리기
- `functions/src/market/integratedPostProcessor.ts` - 게시물 생성/업데이트 통합 처리
- `functions/src/market/integratedTradeProcessor.ts` - 거래 생성 통합 처리
- `functions/src/cs/integratedCSRouter.ts` - CS 자동 라우팅

### 3. 기존 함수 (활성화)
- `functions/src/market/newPostBoost.ts` - 부스트 로직
- `functions/src/market/priceAnomalyDetection.ts` - 가격 규율
- `functions/src/market/escrow.ts` - 에스크로 시스템
- `functions/src/cs/autoClassification.ts` - CS 자동 분류

---

## 🚀 배포 명령어

### 1. Functions 배포

```bash
cd functions
npm run build
firebase deploy --only functions
```

### 2. Firestore Rules 배포

```bash
firebase deploy --only firestore:rules
```

### 3. 전체 배포

```bash
firebase deploy
```

---

## ✅ 배포 전 체크리스트

### 코드 검증
- [ ] `coreStabilityEngine.ts` 컴파일 확인
- [ ] `integratedPostProcessor.ts` 컴파일 확인
- [ ] `integratedTradeProcessor.ts` 컴파일 확인
- [ ] `integratedCSRouter.ts` 컴파일 확인
- [ ] `index.ts` export 확인

### 환경 변수
- [ ] Firebase 프로젝트 ID 확인
- [ ] Functions 리전 설정 확인 (asia-northeast3)
- [ ] Firestore 데이터베이스 ID 확인

### 의존성
- [ ] `firebase-functions/v2` 설치 확인
- [ ] `firebase-admin` 설치 확인
- [ ] TypeScript 컴파일 확인

---

## 🧪 검증 시나리오

### 시나리오 1: 미인증 → 채팅 불가

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

### 시나리오 2: 저품질 → 부스트 X

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

### 시나리오 3: 고가+저평판 → 에스크로

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

### 시나리오 4: 이상가격 → 노출 감소

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

## 📊 모니터링 포인트

### 1. 부스트 적용률
```typescript
// Firestore 쿼리
const boostedPosts = await db
  .collection("market")
  .where("boostActive", "==", true)
  .get();

const boostRate = boostedPosts.size / totalPosts.size;
// 목표: ≥30%
```

### 2. 가격 규율 적용률
```typescript
// Firestore 쿼리
const priceAnomalyPosts = await db
  .collection("market")
  .where("priceAnomaly", "==", true)
  .get();

const anomalyRate = priceAnomalyPosts.size / totalPosts.size;
// 목표: ≤10%
```

### 3. 에스크로 적용률
```typescript
// Firestore 쿼리
const escrowTrades = await db
  .collection("trades")
  .where("escrowRequired", "==", true)
  .get();

const escrowRate = escrowTrades.size / totalTrades.size;
// 목표: ≥40%
```

### 4. CS 자동 처리율
```typescript
// Firestore 쿼리
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

**실전 배포 실행 키트 완성**
