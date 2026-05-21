# 🧭 M 단계 — 2주 실행 스프린트 플랜

> **설계 끝났고, 2주 안에 결과를 만드는 루트만 남았다**

**작성일**: 2024년  
**버전**: 1.0.0

---

## 🎯 스프린트 목표 (하나만)

**채팅 → 상품 제안 → 거래 완료 → 후기(평점)**

**이 흐름을 실사용 가능하게 만든다.**

---

## 📅 Day 1–2: 기반 고정 (깨지면 안 되는 것)

### 작업 목록

#### 1. Firestore/Storage Rules 최종 적용

**작업:**
- [ ] `chats/{chatId}` - participants 검증
- [ ] `chats/{chatId}/messages/{messageId}` - 참여자만 읽기/쓰기
- [ ] `deals/{dealId}` - 거래 참여자만 읽기, 완료는 판매자만
- [ ] `reviews/{reviewId}` - 읽기만 가능, 수정/삭제 금지
- [ ] Storage `chats/{chatId}/{fileName}` - 참여자만 업로드

**체크:**
```javascript
// Firestore Rules 검증
match /chats/{chatId}/messages/{messageId} {
  allow read: if request.auth != null
    && request.auth.uid in get(/databases/$(database)/documents/chats/$(chatId)).data.participants;
}
```

#### 2. 권한 가드 서버 기준 통과

**작업:**
- [ ] Deal 완료 API에 `sellerId === request.uid` 가드
- [ ] 메시지 전송 API에 `participants.includes(uid)` 가드
- [ ] 후기 작성 API에 `deal 참여자` 가드
- [ ] 프론트 조건은 UX용 (보안 아님) 확인

**체크:**
```typescript
// 서버 기준 가드
const completeDeal = async (dealId: string) => {
  const deal = await getDoc(doc(db, "deals", dealId));
  if (deal.data()?.sellerId !== auth.currentUser.uid) {
    throw new Error("Only seller can complete deal");
  }
  // ... 처리
};
```

#### 3. 이미지 업로드 E2E 확인

**작업:**
- [ ] 채팅 참여자만 업로드 가능 확인
- [ ] 비참여자 업로드 시도 → 실패 확인
- [ ] 업로드 성공률 100% 확인

**체크:**
- [ ] 비참여자 접근 0
- [ ] 업로드 실패율 0

---

## 📅 Day 3–5: 핵심 플로우 구현

### 작업 목록

#### 1. 상품 카드 메시지

**작업:**
- [ ] 상품 카드 메시지 컴포넌트
- [ ] `message.type === "product"` 처리
- [ ] 상품 정보 표시 (이미지, 제목, 가격)

**구현:**
```typescript
// 상품 카드 메시지
{message.type === "product" && (
  <ProductCard
    productId={message.productId}
    onComplete={() => completeDeal(dealId)}
  />
)}
```

#### 2. Deal 생성/완료/취소

**작업:**
- [ ] 상품 제안 시 `message + deal` 트랜잭션 생성
- [ ] 거래 완료 API (판매자만)
- [ ] 거래 취소 API (완료 전만)
- [ ] Deal 상태 전이 확인

**구현:**
```typescript
// 상품 제안 시 트랜잭션
const sendProductMessage = async (chatId: string, productId: string) => {
  await runTransaction(db, async (tx) => {
    // 1. 메시지 생성
    const messageRef = doc(collection(db, `chats/${chatId}/messages`));
    tx.set(messageRef, { type: "product", productId, ... });
    
    // 2. Deal 생성
    const dealRef = doc(collection(db, "deals"));
    tx.set(dealRef, { chatId, productId, status: "proposed", ... });
  });
};
```

#### 3. 시스템 메시지 자동 삽입

**작업:**
- [ ] 거래 완료 시 시스템 메시지
- [ ] 거래 취소 시 시스템 메시지
- [ ] 시스템 메시지 UI (다른 스타일)

**구현:**
```typescript
// 거래 완료 시
await addDoc(collection(db, `chats/${chatId}/messages`), {
  type: "system_status",
  text: "✅ 이 상품의 거래가 완료되었습니다",
  dealId: dealId,
});
```

**완료 기준:**
- [ ] 어떤 상품이 거래됐는지 1초 내 인지

---

## 📅 Day 6–7: 후기 & 신뢰 최소선

### 작업 목록

#### 1. 거래 완료 후 후기 CTA

**작업:**
- [ ] 거래 완료 시 CTA 표시
- [ ] "이번 거래는 어떠셨나요? [후기 남기기]"
- [ ] 이미 후기 작성했으면 숨김

**구현:**
```typescript
{dealStatus === "completed" && !hasUserReviewed && (
  <div className="review-cta">
    <p>이번 거래는 어떠셨나요?</p>
    <button onClick={() => setShowReviewModal(true)}>
      후기 남기기
    </button>
  </div>
)}
```

#### 2. 평점 저장 (텍스트 없음)

**작업:**
- [ ] 후기 모달 (평점만, 텍스트 없음)
- [ ] 평점 1~5 선택
- [ ] Review 생성 API
- [ ] 중복 체크 (deal당 1회)

**구현:**
```typescript
const createReview = async (dealId: string, rating: number) => {
  // 중복 체크
  const existing = await getDocs(
    query(
      collection(db, "reviews"),
      where("dealId", "==", dealId),
      where("fromUserId", "==", auth.currentUser.uid)
    )
  );
  
  if (!existing.empty) {
    throw new Error("Already reviewed");
  }
  
  // Review 생성
  await addDoc(collection(db, "reviews"), {
    dealId,
    fromUserId: auth.currentUser.uid,
    toUserId: targetUserId,
    rating,
    createdAt: serverTimestamp(),
  });
};
```

#### 3. 평점 표시 규칙 적용 (3건 미만 숨김)

**작업:**
- [ ] 사용자 평점 계산 (서버)
- [ ] 거래 3건 미만 → 평점 숨김
- [ ] 평점 표시 형식: "⭐ 4.6 · 거래 12건"

**구현:**
```typescript
{user.totalReviews >= 3 ? (
  <div>⭐ {user.averageRating} · 거래 {user.totalReviews}건</div>
) : (
  <div>아직 거래 이력이 많지 않은 사용자입니다</div>
)}
```

**완료 기준:**
- [ ] 악용 없이 평점 남김 가능

---

## 📅 Day 8–9: 안전장치 & UX 마감

### 작업 목록

#### 1. 차단/신고 연결

**작업:**
- [ ] 차단 기능 연결 (기존 기능 활용)
- [ ] 신고 기능 연결 (기존 기능 활용)
- [ ] 차단 후 재진입 불가 확인

**체크:**
- [ ] 차단된 사용자 채팅 접근 불가
- [ ] 신고 후 상태 피드백

#### 2. 실패 UX (토스트/재시도)

**작업:**
- [ ] API 실패 시 토스트 메시지
- [ ] 재시도 버튼 (선택적)
- [ ] 로딩 상태 표시

**구현:**
```typescript
try {
  await completeDeal(dealId);
  setToastMessage("거래가 완료되었습니다");
} catch (error) {
  setToastMessage("거래 완료에 실패했습니다. 다시 시도해주세요.");
}
```

#### 3. 모바일 터치/스크롤 검증

**작업:**
- [ ] 버튼 터치 영역 44x44px 확인
- [ ] 스크롤 부드러움 확인
- [ ] 키보드 열림 시 레이아웃 확인

**완료 기준:**
- [ ] "안 눌린 느낌" 0

---

## 📅 Day 10: 출시 체크 & 계측

### 작업 목록

#### 1. 핵심 이벤트 로그 6개

**작업:**
- [ ] 거래 제안 (deal.proposed)
- [ ] 거래 완료 (deal.completed)
- [ ] 거래 취소 (deal.cancelled)
- [ ] 후기 작성 (review.created)
- [ ] 차단 (user.blocked)
- [ ] 신고 (report.created)

**구현:**
```typescript
// 이벤트 로그
const logEvent = (event: string, data: any) => {
  // Analytics 또는 Firestore에 기록
  addDoc(collection(db, "events"), {
    event,
    data,
    timestamp: serverTimestamp(),
  });
};
```

#### 2. 30일 관찰 지표 대시보드

**작업:**
- [ ] 거래 성사율 계산
- [ ] 채팅 → 거래 전환율 계산
- [ ] 후기 작성률 계산
- [ ] 차단/신고 비율 계산
- [ ] 7일 재방문율 계산

**구현:**
```typescript
// 대시보드 컴포넌트
const MetricsDashboard = () => {
  const metrics = useMetrics(); // 30일 관찰 지표
  
  return (
    <div>
      <MetricCard title="거래 성사율" value={metrics.dealCompletionRate} />
      <MetricCard title="후기 작성률" value={metrics.reviewRate} />
      {/* ... */}
    </div>
  );
};
```

#### 3. 롤백 플래그 확인

**작업:**
- [ ] 기능 플래그 설정
- [ ] 롤백 가능 여부 확인
- [ ] 이전 빌드 보관

**완료 기준:**
- [ ] 숫자로 다음 행동 결정 가능

---

## 🧠 스프린트 금기

### ❌ 기능 추가

- ❌ 새로운 기능 추가
- ❌ "이것도 있으면 좋을 것 같아" 제안 거부

### ❌ 리팩토링 욕심

- ❌ 코드 구조 개선 욕심
- ❌ "나중에 더 좋게" 미루기

### ❌ 지표 늘리기

- ❌ 지표 6개 이상 추가
- ❌ "이것도 보면 좋을 것 같아" 거부

---

## 🏁 스프린트 종료 판정

### 완료 기준

- [ ] 거래 성사율 측정 가능
- [ ] 후기 작성 가능
- [ ] 운영介入 없이 버팀

### 판정

**👉 되면 출시. 안 되면 컷.**

---

## 📊 일일 체크리스트

### 매일 확인

- [ ] 전날 작업 완료 여부
- [ ] 오늘 작업 우선순위
- [ ] 블로커 확인

### 매일 회고

- [ ] 완료한 것
- [ ] 막힌 것
- [ ] 내일 계획

---

## 🎯 스프린트 성공 기준

### 최소 기준

- ✅ 거래 생성 → 완료 플로우 동작
- ✅ 후기 작성 가능
- ✅ 권한 가드 통과
- ✅ 핵심 지표 측정 가능

### 이상적 기준

- ✅ 거래 성사율 10% 이상
- ✅ 후기 작성률 30% 이상
- ✅ "안 눌린 느낌" 0
- ✅ 운영 개입 없이 버팀

---

## 🏁 다음 선택

### N → 스프린트 태스크를 Jira/Notion 티켓으로 분해

**포함 내용:**
- 각 태스크를 티켓으로 변환
- 우선순위 설정
- 담당자 할당

### I → 여기서 멈추고 바로 구현

**이유:**
- 스프린트 계획 완료 ✅
- 바로 실행 가능 ✅

---

**작성일**: 2024년  
**버전**: 1.0.0  
**담당자**: 개발팀

