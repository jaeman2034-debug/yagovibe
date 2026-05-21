# 🧱 G 단계 — API & DB 스키마 (실구현용)

> **바로 구현 가능한 최소·정답 세트**

**작성일**: 2024년  
**버전**: 1.0.0

---

## Ⅰ. Firestore 컬렉션 설계 (정답)

### 1️⃣ chats

```typescript
// 컬렉션: chats/{chatId}
interface Chat {
  participants: string[];        // [uidA, uidB]
  createdAt: Timestamp;
}
```

**파일 경로**: `chats/{chatId}`

**인덱스:**
- `participants` (array-contains)

---

### 2️⃣ messages

```typescript
// 컬렉션: chats/{chatId}/messages/{messageId}
interface Message {
  chatId: string;
  senderId: string;
  type: "text" | "image" | "product" | "system_status";
  text?: string;
  imageUrl?: string;
  productId?: string;
  createdAt: Timestamp;
  deletedForUserIds?: string[];  // soft-delete (증거 보관용)
}
```

**파일 경로**: `chats/{chatId}/messages/{messageId}`

**인덱스:**
- `chatId` + `createdAt` (복합 인덱스)

**🔑 모든 맥락은 message에 남긴다 (증거/히스토리)**

---

### 3️⃣ deals

```typescript
// 컬렉션: deals/{dealId}
interface Deal {
  chatId: string;
  productId: string;
  sellerId: string;
  buyerId: string;
  status: "proposed" | "completed" | "cancelled";
  createdAt: Timestamp;
  completedAt?: Timestamp;
  cancelledAt?: Timestamp;
  cancelledBy?: string;
}
```

**파일 경로**: `deals/{dealId}`

**인덱스:**
- `chatId` + `status`
- `sellerId` + `status`
- `buyerId` + `status`

---

### 4️⃣ reviews

```typescript
// 컬렉션: reviews/{reviewId}
interface Review {
  dealId: string;
  fromUserId: string;
  toUserId: string;
  rating: number;   // 1~5
  comment?: string;  // 옵션 (초기에는 숨김)
  createdAt: Timestamp;
}
```

**파일 경로**: `reviews/{reviewId}`

**인덱스:**
- `dealId` + `fromUserId` (중복 체크용)
- `toUserId` + `createdAt` (평점 계산용)

---

### 5️⃣ users (신뢰 지표 - 계산 필드)

```typescript
// 컬렉션: users/{userId}
interface User {
  uid: string;
  displayName: string;
  photoURL?: string;
  
  // 신뢰 지표 (계산 필드)
  averageRating?: number;      // 평균 평점 (소수점 1자리)
  totalReviews?: number;        // 총 후기 수
  recentRating?: number;        // 최근 30일 가중치 평점
  trustLevel?: "NEW" | "RISING" | "TRUSTED" | "VERIFIED";
  
  // 시스템 제약 (내부 처리)
  systemRestrictions?: {
    exposureReduced?: boolean;
    newDealLimited?: boolean;
    reason?: string;
    appliedAt?: Timestamp;
  };
  
  ratingUpdatedAt?: Timestamp;
}
```

**파일 경로**: `users/{userId}`

---

## Ⅱ. Firebase Storage 경로 & Rules

### 📁 업로드 경로

```
chats/{chatId}/{timestamp}_{filename}
```

**예시:**
```
chats/chat123/1704067200000_image.jpg
```

---

### 🔐 Storage Rules (실서비스 기준)

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // 채팅 이미지 업로드
    match /chats/{chatId}/{fileName} {
      // 읽기: 인증된 사용자 모두 가능
      allow read: if request.auth != null;
      
      // 쓰기: 채팅 참여자만 가능
      allow write: if request.auth != null
        && request.auth.uid in
          get(/databases/$(database)/documents/chats/$(chatId)).data.participants;
    }
  }
}
```

---

## Ⅲ. 핵심 API 엔드포인트

### 🔹 메시지 전송

```typescript
// POST /api/messages
interface SendMessageRequest {
  chatId: string;
  type: "text" | "image" | "product" | "system_status";
  text?: string;
  imageUrl?: string;
  productId?: string;
}

// Response
interface SendMessageResponse {
  messageId: string;
  createdAt: Timestamp;
}
```

**구현:**
```typescript
// Cloud Function 또는 클라이언트 직접 호출
const sendMessage = async (request: SendMessageRequest) => {
  // 권한 체크: 채팅 참여자인지 확인
  const chat = await getDoc(doc(db, "chats", request.chatId));
  if (!chat.data()?.participants.includes(auth.currentUser.uid)) {
    throw new Error("Unauthorized");
  }
  
  // 메시지 생성
  const messageRef = await addDoc(
    collection(db, `chats/${request.chatId}/messages`),
    {
      chatId: request.chatId,
      senderId: auth.currentUser.uid,
      type: request.type,
      text: request.text,
      imageUrl: request.imageUrl,
      productId: request.productId,
      createdAt: serverTimestamp(),
    }
  );
  
  // 상품 제안인 경우 deal 생성
  if (request.type === "product" && request.productId) {
    await createDeal(request.chatId, request.productId);
  }
  
  return { messageId: messageRef.id };
};
```

---

### 🔹 거래 생성 (상품 제안 시)

```typescript
// POST /api/deals
interface CreateDealRequest {
  chatId: string;
  productId: string;
  sellerId: string;
  buyerId: string;
}

// Response
interface CreateDealResponse {
  dealId: string;
  status: "proposed";
  createdAt: Timestamp;
}
```

**구현:**
```typescript
const createDeal = async (request: CreateDealRequest) => {
  // 권한 체크: 판매자만 가능
  const product = await getDoc(doc(db, "marketProducts", request.productId));
  if (product.data()?.ownerId !== auth.currentUser.uid) {
    throw new Error("Only seller can create deal");
  }
  
  // deal 생성
  const dealRef = await addDoc(collection(db, "deals"), {
    chatId: request.chatId,
    productId: request.productId,
    sellerId: request.sellerId,
    buyerId: request.buyerId,
    status: "proposed",
    createdAt: serverTimestamp(),
  });
  
  return { dealId: dealRef.id, status: "proposed" };
};
```

---

### 🔹 거래 완료 (판매자만)

```typescript
// POST /api/deals/{dealId}/complete
interface CompleteDealResponse {
  dealId: string;
  status: "completed";
  completedAt: Timestamp;
}
```

**구현:**
```typescript
const completeDeal = async (dealId: string) => {
  const dealRef = doc(db, "deals", dealId);
  const deal = await getDoc(dealRef);
  
  // 권한 체크: 판매자만 가능
  if (deal.data()?.sellerId !== auth.currentUser.uid) {
    throw new Error("Only seller can complete deal");
  }
  
  // 상태 변경
  await updateDoc(dealRef, {
    status: "completed",
    completedAt: serverTimestamp(),
  });
  
  // 채팅에 시스템 메시지 추가
  await addDoc(
    collection(db, `chats/${deal.data().chatId}/messages`),
    {
      chatId: deal.data().chatId,
      senderId: "system",
      type: "system_status",
      text: "✅ 이 상품의 거래가 완료되었습니다",
      createdAt: serverTimestamp(),
    }
  );
  
  return { dealId, status: "completed" };
};
```

---

### 🔹 거래 취소 (완료 전)

```typescript
// POST /api/deals/{dealId}/cancel
interface CancelDealResponse {
  dealId: string;
  status: "cancelled";
  cancelledAt: Timestamp;
}
```

**구현:**
```typescript
const cancelDeal = async (dealId: string) => {
  const dealRef = doc(db, "deals", dealId);
  const deal = await getDoc(dealRef);
  
  // 거래 완료 전인지 확인
  if (deal.data()?.status === "completed") {
    throw new Error("Cannot cancel completed deal");
  }
  
  // 권한 체크: 거래 참여자만 가능
  const dealData = deal.data();
  if (
    dealData.sellerId !== auth.currentUser.uid &&
    dealData.buyerId !== auth.currentUser.uid
  ) {
    throw new Error("Unauthorized");
  }
  
  // 상태 변경
  await updateDoc(dealRef, {
    status: "cancelled",
    cancelledBy: auth.currentUser.uid,
    cancelledAt: serverTimestamp(),
  });
  
  // 채팅에 시스템 메시지 추가
  await addDoc(
    collection(db, `chats/${dealData.chatId}/messages`),
    {
      chatId: dealData.chatId,
      senderId: "system",
      type: "system_status",
      text: "⚠️ 거래가 취소되었습니다",
      createdAt: serverTimestamp(),
    }
  );
  
  return { dealId, status: "cancelled" };
};
```

---

### 🔹 후기 작성 (거래당 1회)

```typescript
// POST /api/reviews
interface CreateReviewRequest {
  dealId: string;
  rating: number;  // 1~5
  comment?: string;
}

// Response
interface CreateReviewResponse {
  reviewId: string;
  createdAt: Timestamp;
}
```

**구현:**
```typescript
const createReview = async (request: CreateReviewRequest) => {
  const deal = await getDoc(doc(db, "deals", request.dealId));
  const dealData = deal.data();
  
  // 권한 체크: 거래 참여자만 가능
  if (
    dealData.sellerId !== auth.currentUser.uid &&
    dealData.buyerId !== auth.currentUser.uid
  ) {
    throw new Error("Unauthorized");
  }
  
  // 거래 완료 여부 확인
  if (dealData.status !== "completed") {
    throw new Error("Can only review completed deals");
  }
  
  // 중복 체크: 이미 후기 작성했는지
  const existing = await getDocs(
    query(
      collection(db, "reviews"),
      where("dealId", "==", request.dealId),
      where("fromUserId", "==", auth.currentUser.uid)
    )
  );
  
  if (!existing.empty) {
    throw new Error("Already reviewed this deal");
  }
  
  // 본인에게는 불가
  const toUserId =
    dealData.sellerId === auth.currentUser.uid
      ? dealData.buyerId
      : dealData.sellerId;
  
  if (toUserId === auth.currentUser.uid) {
    throw new Error("Cannot review yourself");
  }
  
  // Review 생성
  const reviewRef = await addDoc(collection(db, "reviews"), {
    dealId: request.dealId,
    fromUserId: auth.currentUser.uid,
    toUserId,
    rating: request.rating,
    comment: request.comment || null,
    createdAt: serverTimestamp(),
  });
  
  // 사용자 평점 재계산
  await recalculateUserRating(toUserId);
  
  return { reviewId: reviewRef.id };
};
```

---

## Ⅳ. Firestore Rules 핵심 가드

### 전체 Rules 예시

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ============================================
    // 1. Chats
    // ============================================
    match /chats/{chatId} {
      // 읽기: 참여자만
      allow read: if request.auth != null
        && request.auth.uid in resource.data.participants;
      
      // 생성: 인증된 사용자
      allow create: if request.auth != null;
      
      // 수정: 참여자만
      allow update: if request.auth != null
        && request.auth.uid in resource.data.participants;
      
      // ============================================
      // 2. Messages
      // ============================================
      match /messages/{messageId} {
        // 읽기: 채팅 참여자만
        allow read: if request.auth != null
          && request.auth.uid in get(/databases/$(database)/documents/chats/$(chatId)).data.participants;
        
        // 생성: 채팅 참여자만
        allow create: if request.auth != null
          && request.auth.uid in get(/databases/$(database)/documents/chats/$(chatId)).data.participants;
        
        // 수정: 작성자만 (soft-delete용)
        allow update: if request.auth != null
          && request.auth.uid == resource.data.senderId;
      }
    }
    
    // ============================================
    // 3. Deals
    // ============================================
    match /deals/{dealId} {
      // 읽기: 거래 참여자만
      allow read: if request.auth != null
        && (request.auth.uid == resource.data.sellerId
            || request.auth.uid == resource.data.buyerId);
      
      // 생성: 인증된 사용자
      allow create: if request.auth != null;
      
      // 수정: 거래 완료는 판매자만
      allow update: if request.auth != null
        && (request.auth.uid == resource.data.sellerId
            || request.auth.uid == resource.data.buyerId)
        && (!request.resource.data.diff(resource.data).affectedKeys().hasAny(['status', 'completedAt'])
            || (request.resource.data.status == 'completed'
                && request.auth.uid == resource.data.sellerId));
    }
    
    // ============================================
    // 4. Reviews
    // ============================================
    match /reviews/{reviewId} {
      // 읽기: 인증된 사용자 모두 가능
      allow read: if request.auth != null;
      
      // 생성: 거래 참여자만, 중복 체크는 서버에서
      allow create: if request.auth != null;
      
      // 수정/삭제: 금지
      allow update, delete: if false;
    }
    
    // ============================================
    // 5. Users
    // ============================================
    match /users/{userId} {
      // 읽기: 인증된 사용자 모두 가능
      allow read: if request.auth != null;
      
      // 수정: 본인만 (신뢰 지표는 서버에서 계산)
      allow update: if request.auth != null
        && request.auth.uid == userId;
    }
  }
}
```

### 핵심 가드 요약

#### 거래 완료 권한

```javascript
allow update: if request.auth.uid == resource.data.sellerId
  && request.resource.data.status == 'completed';
```

#### 후기 작성 권한

```javascript
// Firestore Rules에서는 기본 체크만
// 중복 체크는 서버 로직에서 처리
allow create: if request.auth != null;
```

---

## Ⅴ. MVP 컷 기준 (지금 안 해도 되는 것)

### ❌ MVP에서 제외

- ❌ 환불 로직
- ❌ 분쟁 버튼
- ❌ 텍스트 후기 공개 (평점만)
- ❌ 자동 제재 (시스템 제약)
- ❌ 운영자 대시보드
- ❌ 분쟁 관리 시스템

### ⭕ MVP에 포함

- ⭕ 거래 생성/완료/취소
- ⭕ 후기 작성 (평점만)
- ⭕ 신뢰 지표 계산 (기본 평점)
- ⭕ 신고/차단 (기존 기능)
- ⭕ 채팅 메시지 증거 보관

---

## 🏁 현재 상태 판정

### ✅ 완료된 설계

- [x] 설계 → 코드 직결 가능 ✅
- [x] 권한/보안 경계 명확 ✅
- [x] MVP 범위 명확 ✅

### 🎯 이제 진짜 구현만 남았다

👉 **바로 구현 가능한 최소·정답 세트 완성**

---

**작성일**: 2024년  
**버전**: 1.0.0  
**담당자**: 개발팀

