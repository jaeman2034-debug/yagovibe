# 🧠 K 단계 — MVP 치명적 리스크 TOP 5 & 대응

> **"지금 안 터지면, 출시 후 터지는 것들"**

**작성일**: 2024년  
**버전**: 1.0.0

---

## 🎯 목적

**출시 후 큰 사고를 미리 잘라낸다**

- 기능 추가 ❌
- 사고 예방 ⭕

---

## 1️⃣ 권한 경계 붕괴 (가장 위험)

### 리스크

- 채팅 참여자 아닌 사람이 이미지 업로드
- 메시지 읽기
- 거래 완료 버튼이 판매자 외에 노출

### 체크

#### Storage Rules: participants 검증 있음?

```javascript
// ✅ 올바른 예
match /chats/{chatId}/{fileName} {
  allow write: if request.auth != null
    && request.auth.uid in
      get(/databases/$(database)/documents/chats/$(chatId)).data.participants;
}

// ❌ 나쁜 예
allow write: if request.auth != null;  // 모든 인증 사용자 가능
```

#### Deal 완료 API: sellerId === request.uid 가드?

```typescript
// ✅ 올바른 예
const completeDeal = async (dealId: string) => {
  const deal = await getDoc(doc(db, "deals", dealId));
  
  // 서버 기준 가드
  if (deal.data()?.sellerId !== auth.currentUser.uid) {
    throw new Error("Only seller can complete deal");
  }
  
  // ... 거래 완료 처리
};

// ❌ 나쁜 예
// 프론트에서만 체크
if (user.uid === product.ownerId) {
  // 버튼 표시
}
```

### 대응

- ✅ **서버 기준 단일 가드**
- ⚠️ **프론트 조건은 보조만**

**체크리스트:**
- [ ] Storage Rules에 participants 검증 있음
- [ ] Deal 완료 API에 sellerId 가드 있음
- [ ] Firestore Rules에 권한 체크 있음
- [ ] 프론트 조건은 UX용 (보안 아님)

---

## 2️⃣ 거래-메시지 불일치 (증거 꼬임)

### 리스크

- 상품 카드 메시지는 있는데 deal이 없거나 반대
- 거래 완료했는데 메시지에 기록 없음
- 증거 추적 불가능

### 체크

#### 상품 제안 시 트랜잭션으로 message + deal 생성?

```typescript
// ✅ 올바른 예
const sendProductMessage = async (chatId: string, productId: string) => {
  await runTransaction(db, async (tx) => {
    // 1. 메시지 생성
    const messageRef = doc(collection(db, `chats/${chatId}/messages`));
    tx.set(messageRef, {
      type: "product",
      productId,
      // ... 기타 필드
    });
    
    // 2. Deal 생성
    const dealRef = doc(collection(db, "deals"));
    tx.set(dealRef, {
      chatId,
      productId,
      status: "proposed",
      // ... 기타 필드
    });
  });
};

// ❌ 나쁜 예
// 메시지만 생성, deal은 나중에
await addDoc(collection(db, `chats/${chatId}/messages`), {...});
// deal 생성 실패 시 불일치 발생
```

#### 시스템 메시지로 상태 명확화?

```typescript
// 거래 완료 시 시스템 메시지 추가
await addDoc(collection(db, `chats/${chatId}/messages`), {
  type: "system_status",
  text: "✅ 이 상품의 거래가 완료되었습니다",
  dealId: dealId,  // deal 연결
});
```

### 대응

- ✅ **둘 중 하나 실패 시 롤백 (트랜잭션)**
- ✅ **시스템 메시지로 상태 명확화**

**체크리스트:**
- [ ] 상품 제안 시 message + deal 트랜잭션으로 생성
- [ ] 거래 완료 시 시스템 메시지 추가
- [ ] 거래 취소 시 시스템 메시지 추가
- [ ] 모든 deal 상태 변경에 메시지 기록

---

## 3️⃣ 평점 세탁 (초기 서비스 킬러)

### 리스크

- 동일 상대 반복 거래
- 소액 셀프 거래로 점수 부풀림
- 신뢰도 왜곡

### 체크

#### 동일 상대 가중치 ↓ 로직?

```typescript
// ✅ 올바른 예
const calculateRatingWithDuplicatePenalty = (reviews: Review[]) => {
  const groups = groupBy(reviews, 'fromUserId');
  
  let weightedSum = 0;
  let totalWeight = 0;
  
  groups.forEach((ratings, fromUserId) => {
    ratings.forEach((rating, index) => {
      // 첫 번째만 1.0, 나머지 0.5
      const weight = index === 0 ? 1.0 : 0.5;
      weightedSum += rating * weight;
      totalWeight += weight;
    });
  });
  
  return weightedSum / totalWeight;
};

// ❌ 나쁜 예
// 모든 거래 동일 가중치
const average = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
```

#### 거래 3건 미만 평점 숨김?

```typescript
// ✅ 올바른 예
{user.totalReviews >= 3 ? (
  <div>⭐ {user.averageRating} · 거래 {user.totalReviews}건</div>
) : (
  <div>아직 거래 이력이 많지 않은 사용자입니다</div>
)}
```

### 대응

- ✅ **점수는 표시 정책으로 막는다**
- ✅ **계산은 서버에서만**

**체크리스트:**
- [ ] 동일 상대 반복 거래 가중치 ↓ 로직 구현
- [ ] 거래 3건 미만 평점 숨김
- [ ] 평점 계산은 서버에서만 (클라이언트 계산 금지)
- [ ] 평점 표시 형식: "⭐ 4.6 · 거래 12건" (거래 수 필수)

---

## 4️⃣ 이미지/증거 유실 (분쟁 시 치명)

### 리스크

- 사용자가 메시지 삭제
- 이미지 만료/권한 변경
- 분쟁 시 증거 없음

### 체크

#### deletedForUserIds soft-delete?

```typescript
// ✅ 올바른 예
// 메시지 삭제는 실제 삭제가 아니라 숨김
const deleteMessage = async (messageId: string, userId: string) => {
  const messageRef = doc(db, `chats/${chatId}/messages`, messageId);
  const message = await getDoc(messageRef);
  
  const deletedForUserIds = message.data()?.deletedForUserIds || [];
  
  // 사용자에게만 숨김 (서버에는 보관)
  await updateDoc(messageRef, {
    deletedForUserIds: [...deletedForUserIds, userId],
  });
};

// ❌ 나쁜 예
// 실제 삭제
await deleteDoc(messageRef);  // 증거 유실
```

#### Storage 파일 보존 기간 정책?

```typescript
// Storage 파일은 삭제하지 않음
// 또는 일정 기간 보관 (예: 1년)
// 만료 정책은 Cloud Function으로 관리
```

### 대응

- ✅ **서버에는 보존**
- ✅ **사용자 UI에서는 숨김**

**체크리스트:**
- [ ] 메시지 삭제는 soft-delete (deletedForUserIds)
- [ ] 이미지는 Storage에 보존
- [ ] 운영자는 삭제된 메시지도 볼 수 있음
- [ ] Storage 파일 만료 정책 (선택적)

---

## 5️⃣ 운영 폭발 트리거 (CS 지옥)

### 리스크

- "환불 요청" 기대
- "분쟁 처리" 버튼 노출
- 운영자 개입 기대 증가

### 체크

#### 분쟁/환불 버튼 없음?

```typescript
// ✅ 올바른 예
// 분쟁 버튼 없음
<div className="action-buttons">
  <button onClick={() => handleReport()}>신고</button>
  <button onClick={() => handleBlock()}>차단</button>
  <button onClick={() => handleReview()}>후기 남기기</button>
</div>

// ❌ 나쁜 예
<button onClick={() => requestDispute()}>분쟁 요청</button>
<button onClick={() => requestRefund()}>환불 요청</button>
```

#### 신고/차단/후기로만 해결?

```typescript
// ✅ 올바른 예
// 사용자가 스스로 해결할 수 있는 도구만 제공
- 신고: 악성 행위 신고
- 차단: 상대방 차단
- 후기: 거래 후기 작성

// 운영자 개입은 최후 수단
```

### 대응

- ✅ **기능을 넣지 않는 게 대응**
- ✅ **공지/가이드로 기대치 관리**

**체크리스트:**
- [ ] 분쟁 버튼 없음
- [ ] 환불 버튼 없음
- [ ] 운영자 문의 버튼 없음
- [ ] 공지/가이드로 기대치 관리

---

## 🧠 천재 포인트 하나

### 초기 서비스의 리스크는 '못 해서'가 아니라 '괜히 해서' 생긴다

**지금 MVP 컷은 아주 잘 됐다.**

---

## 📌 최종 출격 전 체크 (YES면 배포)

### 1️⃣ 권한은 서버 기준으로 막혀 있는가?

**체크:**
- [ ] Storage Rules에 participants 검증
- [ ] Deal 완료 API에 sellerId 가드
- [ ] Firestore Rules에 권한 체크
- [ ] 프론트 조건은 UX용 (보안 아님)

**👉 YES면 통과**

---

### 2️⃣ 거래/후기/이미지가 **하나의 기준점(deal)**에 묶였는가?

**체크:**
- [ ] 상품 제안 시 message + deal 트랜잭션
- [ ] 후기는 dealId로 귀속
- [ ] 거래 완료 시 시스템 메시지
- [ ] 모든 상태 변경에 메시지 기록

**👉 YES면 통과**

---

### 3️⃣ 사용자가 스스로 문제를 피할 수 있는가?

**체크:**
- [ ] 차단 기능
- [ ] 신고 기능
- [ ] 차단 후 재진입 불가
- [ ] 분쟁 버튼 없음 (자체 해결)

**👉 YES면 통과**

---

### 4️⃣ 운영자가 개입 안 해도 버티는가?

**체크:**
- [ ] 신고/차단으로 자체 해결 가능
- [ ] 메시지 로그 보관 (증거)
- [ ] 환불 버튼 없음
- [ ] 분쟁 버튼 없음

**👉 YES면 통과**

---

## 🎯 최종 판정

### 전부 YES면

👉 **지금 당장 구현 & 출시해도 된다.**

---

## 🏁 다음 선택

### I → 여기서 멈추고 구현 집중 (강력 추천)

**이유:**
- 설계 완료 ✅
- 범위 명확 ✅
- 리스크 점검 완료 ✅
- 바로 구현 가능 ✅

### J → 2주 MVP 일정 쪼개기

**포함 내용:**
- 구현 순서
- 우선순위
- 일정 추정

### L → 출시 후 30일 관찰 지표 설계

**포함 내용:**
- 핵심 지표
- 관찰 포인트
- 개선 기준

---

**작성일**: 2024년  
**버전**: 1.0.0  
**담당자**: 개발팀

