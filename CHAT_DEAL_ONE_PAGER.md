# 🧠 채팅 기반 중고거래 ONE-PAGER 설계도

> **팀 공유·미래 리팩토링·의사결정 기준** | 플랫폼급 설계 완성

**작성일**: 2024년  
**버전**: 1.0.0

---

## 🎯 이 설계의 한 줄 정의

**채팅은 사람의 관계이고, 거래는 그 안에서 발생하는 이벤트다.**

---

## Ⅰ. 핵심 도메인 구조 (변하지 않는 뼈대)

### 1️⃣ Chat (관계)

```typescript
chat {
  id: string
  participants: [userIdA, userIdB]
  createdAt: Timestamp
}
```

**핵심:**
- 사람 ↔ 사람
- 상품/거래와 분리

**파일 경로**: `chats/{chatId}`

---

### 2️⃣ Message (대화 이벤트)

```typescript
message {
  id: string
  chatId: string
  senderId: string
  type: "text" | "image" | "product" | "system_status"
  productId?: string      // 상품 제안일 때만
  text?: string
  url?: string
  deletedForUserIds?: string[]  // 증거 보관용 (삭제 ❌, 숨김 ⭕)
  createdAt: Timestamp
}
```

**핵심:**
- 채팅의 모든 맥락은 메시지로 흐른다
- 상품 제안도 메시지의 한 종류

**파일 경로**: `chats/{chatId}/messages/{messageId}`

---

### 3️⃣ Deal (실제 거래) ⭐ 핵심

```typescript
deal {
  id: string
  chatId: string
  productId: string
  sellerId: string
  buyerId: string
  status: "proposed" | "completed" | "cancelled"
  completedAt?: Timestamp
  cancelledAt?: Timestamp
  cancelledBy?: string
  createdAt: Timestamp
}
```

**핵심:**
- 거래의 단위
- 후기, 분쟁, 신뢰의 기준점

**파일 경로**: `deals/{dealId}`

---

### 4️⃣ Review (신뢰 기록)

```typescript
review {
  id: string
  dealId: string        // ⭐ 거래에 귀속
  fromUserId: string
  toUserId: string
  rating: 1 | 2 | 3 | 4 | 5
  comment?: string      // 옵션 (초기에는 숨김)
  createdAt: Timestamp
}
```

**핵심:**
- 사람 ❌
- 거래(deal)에 귀속

**파일 경로**: `reviews/{reviewId}`

---

## Ⅱ. UX 핵심 원칙 (절대 깨지면 안 됨)

### 🔹 채팅

- **거래 완료 후에도 닫지 않는다**
- 상단에 "거래 완료" 상태만 명확히 표시
- 새로운 상품 제안 가능 ⭕

**구현:**
```typescript
// 거래 완료 후 채팅 유지
{dealStatus === "completed" && (
  <div className="fixed top-0 bg-green-50 border-b">
    ✅ 거래 완료됨 - 이 상품의 거래는 종료되었습니다
  </div>
)}
```

---

### 🔹 상품 제안

- 채팅 안에서 카드 형태로 제안
- 여러 상품 제안 가능
- **거래 완료 버튼은 상품 카드 내부에만**

**구현:**
```typescript
// 상품 카드 메시지
{message.type === "product" && (
  <ProductCard product={product}>
    {isSeller && dealStatus !== "completed" && (
      <button onClick={() => completeDeal(productId)}>
        거래 완료
      </button>
    )}
  </ProductCard>
)}
```

---

### 🔹 거래 완료

- **판매자만 가능** (`user.uid === product.ownerId`)
- 완료 시:
  - deal 상태 변경
  - 시스템 메시지 추가

**구현:**
```typescript
const completeDeal = async (productId: string) => {
  // deal 생성
  const dealId = await createDeal(chatId, productId, sellerId, buyerId);
  
  // 시스템 메시지
  await addDoc(collection(db, `chats/${chatId}/messages`), {
    text: "✅ 이 상품의 거래가 완료되었습니다",
    type: "system_status",
  });
};
```

---

### 🔹 취소

- **거래 완료 전만 가능**
- 완료 후엔:
  - 취소 ❌
  - 환불 ❌
  - 대신 신고/후기/차단

**구현:**
```typescript
// 거래 완료 전에만 취소 버튼 표시
{dealStatus === "proposed" && (
  <button onClick={() => cancelDeal()}>
    거래 취소
  </button>
)}
```

---

## Ⅲ. 권한 모델 (보안 기준)

### 🔐 이미지 업로드

**chat participants 기준**

```typescript
// Storage Rules
match /chats/{chatId}/{fileName} {
  allow write: if request.auth != null &&
                 (request.auth.uid in get(/databases/$(database)/documents/chats/$(chatId)).data.participants);
}
```

**상품 소유 여부와 무관**

---

### 🔐 거래 완료

**`product.ownerId === currentUserId`**

```typescript
const canCompleteDeal = (product: Product, userId: string) => {
  return product.ownerId === userId;
};
```

---

### 🔐 후기 작성

**거래 참여자**  
**deal 당 1회**

```typescript
const canReview = async (dealId: string, userId: string) => {
  const deal = await getDoc(doc(db, "deals", dealId));
  const isParticipant = 
    deal.data().sellerId === userId || 
    deal.data().buyerId === userId;
  
  if (!isParticipant) return false;
  
  // 이미 후기 작성했는지 확인
  const existing = await getDocs(
    query(
      collection(db, "reviews"),
      where("dealId", "==", dealId),
      where("fromUserId", "==", userId)
    )
  );
  
  return existing.empty;
};
```

---

## Ⅳ. 신뢰 & 평점 정책 (초기 서비스 안전장치)

### 거래 3건 미만 → 평점 숨김

```typescript
{user.totalReviews >= 3 ? (
  <div>⭐ {user.averageRating} · 거래 {user.totalReviews}건</div>
) : (
  <div>아직 거래 이력이 많지 않은 사용자입니다</div>
)}
```

### 평균 점수 + 거래 수 함께 표시

**표시 형식:**
```
⭐ 4.6 · 거래 12건
```

**❌ "⭐ 4.6"만 표시하지 않음**

---

### 최근 거래 가중치 적용

```typescript
// 최근 30일 거래 = 가중치 1.5, 이전 = 1.0
const calculateWeightedRating = (reviews: Review[]) => {
  const now = Date.now();
  const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
  
  let weightedSum = 0;
  let totalWeight = 0;
  
  reviews.forEach(review => {
    const weight = review.createdAt >= thirtyDaysAgo ? 1.5 : 1.0;
    weightedSum += review.rating * weight;
    totalWeight += weight;
  });
  
  return weightedSum / totalWeight;
};
```

---

### 동일 상대 반복 거래 가중치 ↓

```typescript
// 같은 사람과의 거래는 첫 번째만 1.0, 나머지 0.5
const calculateRatingWithDuplicatePenalty = (reviews: Review[]) => {
  const groups = groupBy(reviews, 'fromUserId');
  
  let weightedSum = 0;
  let totalWeight = 0;
  
  groups.forEach((ratings, fromUserId) => {
    ratings.forEach((rating, index) => {
      const weight = index === 0 ? 1.0 : 0.5;
      weightedSum += rating * weight;
      totalWeight += weight;
    });
  });
  
  return weightedSum / totalWeight;
};
```

---

## Ⅴ. 분쟁 & 운영介入 원칙

### 3단계 모델

#### 1단계: 사용자 주도
- 신고
- 차단
- 후기

**👉 운영介入 ❌**

#### 2단계: 시스템 제약
- 노출 ↓
- 새 거래 제한
- 후기 점수 가중치 ↓

**❌ 정지 / 퇴출 X**  
**⭕ "조용한 제약"**

#### 3단계: 운영介入
- 명백한 사기
- 반복 악성 행위
- 법적 이슈 가능성

**👉 최소, 기록 기반**

---

### ❌ 분쟁 버튼 없음

**❌ "분쟁 요청" 버튼 ❌**  
**❌ "운영자에게 문의" 버튼 ❌**

**⭕ 대신:**
- 신고
- 차단
- 후기

**이 3가지만 제공**

---

### ❌ 운영자 즉시 개입 없음

**운영介入은 "기능"이 아니라 "최후 수단"**

---

## Ⅵ. 플랫폼 책임 경계 (법적 안전선)

| 항목 | 책임 |
|------|------|
| 채팅 제공 | ⭕ |
| 거래 기록 | ⭕ |
| 후기 시스템 | ⭕ |
| 환불/보상 | ❌ |
| 거래 결과 보장 | ❌ |

👉 **이 선 넘으면 법적 플랫폼이 된다.**

---

## 🔄 전체 플로우 (한 눈에)

```
1. 상품 카드 메시지 전송
   ↓
2. deal 생성 (status: "proposed")
   ↓
3. 판매자가 "거래 완료" 클릭
   ↓
4. deal.status = "completed"
   ↓
5. 채팅 상단에 "거래 완료됨" 배지
   ↓
6. 후기 작성 CTA 표시
   ↓
7. 후기 작성 → review 생성
   ↓
8. 신뢰 지표 계산 (평점, 거래 수)
   ↓
9. 분쟁 발생 시 (신고/차단/후기)
   ↓
10. 시스템 자동 제약 또는 운영자 개입
```

---

## 🏁 최종 판정

### 이 설계는:

- ✅ 단기 MVP 가능
- ✅ 장기 확장 가능
- ✅ 분쟁/악용 리스크 낮음
- ✅ 사람 중심 구조

👉 **플랫폼급 설계 완성**

---

**작성일**: 2024년  
**버전**: 1.0.0  
**담당자**: 개발팀

