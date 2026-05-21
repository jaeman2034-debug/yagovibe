# 🧠 A 단계 — 거래 완료 이후 후기(리뷰) 설계

> **플랫폼 신뢰의 시작점** | 거래 → 신뢰 → 재거래 루프

**작성일**: 2024년  
**버전**: 1.0.0

---

## 🎯 핵심 질문

**후기는 '사람'에 남길까, '거래'에 남길까?**

### ❌ 흔한 오답

- 사용자 프로필에 바로 후기 남김
- 채팅 종료 시 자동 리뷰 요청
- 거래 맥락 없는 평가

👉 **거래 맥락 없는 평가는 무조건 분쟁 난다.**

---

## ✅ 정답 구조 (플랫폼급)

### 🔹 후기의 소유권은 Deal

```typescript
// reviews 컬렉션
review {
  id: string
  dealId: string        // ⭐ 핵심: 거래에 귀속
  fromUserId: string    // 후기 작성자
  toUserId: string      // 후기 대상자
  rating: 1 | 2 | 3 | 4 | 5
  comment?: string      // 옵션 (초기에는 숨김)
  createdAt: Timestamp
}
```

**파일 경로**: `reviews/{reviewId}`

### 🔹 Deal 구조 (확장)

```typescript
// deals 컬렉션
deal {
  id: string
  chatId: string
  productId: string
  sellerId: string
  buyerId: string
  status: "proposed" | "completed" | "cancelled"
  completedAt?: Timestamp
  createdAt: Timestamp
}
```

**파일 경로**: `deals/{dealId}`

### 🔹 사용자 평점 (누적 결과물)

```typescript
// users 컬렉션 (계산 필드)
user {
  // ... 기존 필드
  averageRating?: number      // 평균 평점 (계산)
  totalReviews?: number        // 총 후기 수 (계산)
  // ⚠️ 직접 저장하지 않음, reviews에서 계산
}
```

👉 **후기는 거래에 귀속**  
👉 **사용자 평점은 누적 결과물**

---

## 🧩 UX 흐름 (자연스러운 타이밍)

### 1️⃣ 거래 완료

**상품 카드에 "거래 완료됨" 표시**

```typescript
// 상품 카드 메시지 내부
{dealStatus === "completed" && (
  <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-sm">
    ✅ 이 상품의 거래가 완료되었습니다
  </div>
)}
```

### 2️⃣ 채팅 하단에 가벼운 CTA

**"이번 거래는 어떠셨나요?"**

```typescript
// 채팅 하단 (입력창 위)
{dealStatus === "completed" && !hasUserReviewed && (
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
    <p className="text-sm text-gray-700 mb-2">
      이번 거래는 어떠셨나요?
    </p>
    <button
      onClick={() => setShowReviewModal(true)}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 active:scale-[0.96] transition-all"
    >
      후기 남기기
    </button>
  </div>
)}
```

**원칙:**
- ❌ 즉시 강요 X
- ⭕ 선택적 + 나중에도 가능

---

## 🔐 권한 설계

### 누가 후기를 남길 수 있나?

**구매자 & 판매자 모두 후기 가능**

**단,**
- 본인에게는 불가
- 한 거래당 1회

```typescript
// 권한 체크
const canReview = async (dealId: string, userId: string) => {
  // 1. 거래 참여자인지 확인
  const deal = await getDoc(doc(db, "deals", dealId));
  if (!deal.exists()) return false;
  
  const dealData = deal.data();
  const isParticipant = 
    dealData.sellerId === userId || 
    dealData.buyerId === userId;
  
  if (!isParticipant) return false;
  
  // 2. 이미 후기를 남겼는지 확인
  const existingReview = await getDocs(
    query(
      collection(db, "reviews"),
      where("dealId", "==", dealId),
      where("fromUserId", "==", userId)
    )
  );
  
  if (!existingReview.empty) return false;
  
  // 3. 본인에게는 불가
  const targetUserId = 
    dealData.sellerId === userId 
      ? dealData.buyerId 
      : dealData.sellerId;
  
  return true; // ✅ 후기 가능
};
```

### 버튼 표시 조건

```typescript
// 후기 버튼 표시 조건
const shouldShowReviewButton = 
  dealStatus === "completed" &&
  !hasUserReviewed &&
  canReview(dealId, user.uid);

if (shouldShowReviewButton) {
  // 후기 버튼 표시
}
```

---

## 🧠 천재 포인트 하나

### 평점은 보이되, 코멘트는 숨겨라 (초기엔)

**평점 → 신뢰 지표**  
**코멘트 → 분쟁 유발 가능성 ↑**

#### 초기 설계

```typescript
// 후기 모달 (초기 버전)
<Modal>
  <h2>이번 거래는 어떠셨나요?</h2>
  
  {/* 평점 선택 (필수) */}
  <div className="rating-selector">
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        onClick={() => setRating(star)}
        className={rating >= star ? "filled" : "empty"}
      >
        ⭐
      </button>
    ))}
  </div>
  
  {/* 코멘트 (옵션 - 초기에는 숨김) */}
  {showCommentOption && (
    <textarea
      placeholder="선택사항: 거래 후기를 남겨주세요"
      value={comment}
      onChange={(e) => setComment(e.target.value)}
    />
  )}
  
  <button onClick={submitReview} disabled={!rating}>
    후기 남기기
  </button>
</Modal>
```

**표시 규칙:**
- ✅ 평점: 항상 표시 (⭐⭐⭐⭐☆)
- ❌ 코멘트: 초기에는 숨김 또는 옵션

---

## 🎯 후기와 차단/신고의 관계

### 후기 ❌ = 불만 없음이 아님

**후기가 없어도:**
- 차단 가능
- 신고 가능
- 불만 표현 가능

### 차단/신고 ⭕ = 후기 없이도 신호

**운영 판단은 후기 + 신고 로그 같이 봐야 함**

```typescript
// 운영자 대시보드에서 보는 정보
const userProfile = {
  averageRating: 4.2,        // 후기 평점
  totalReviews: 15,          // 총 후기 수
  reportCount: 2,            // 신고 횟수
  blockedBy: 1,              // 차단당한 횟수
  // → 종합 판단
};
```

---

## 📊 데이터 모델 상세

### 1️⃣ Deal 생성 (거래 완료 시)

```typescript
const createDeal = async (
  chatId: string,
  productId: string,
  sellerId: string,
  buyerId: string
) => {
  const dealRef = doc(collection(db, "deals"));
  await setDoc(dealRef, {
    chatId,
    productId,
    sellerId,
    buyerId,
    status: "completed",
    completedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  });
  
  return dealRef.id;
};
```

### 2️⃣ Review 생성

```typescript
const createReview = async (
  dealId: string,
  fromUserId: string,
  toUserId: string,
  rating: number,
  comment?: string
) => {
  // 권한 체크
  if (!(await canReview(dealId, fromUserId))) {
    throw new Error("후기를 남길 수 없습니다.");
  }
  
  // 중복 체크
  const existing = await getDocs(
    query(
      collection(db, "reviews"),
      where("dealId", "==", dealId),
      where("fromUserId", "==", fromUserId)
    )
  );
  
  if (!existing.empty) {
    throw new Error("이미 후기를 남기셨습니다.");
  }
  
  // Review 생성
  await addDoc(collection(db, "reviews"), {
    dealId,
    fromUserId,
    toUserId,
    rating,
    comment: comment || null,
    createdAt: serverTimestamp(),
  });
  
  // 사용자 평점 재계산 (Cloud Function 또는 클라이언트)
  await recalculateUserRating(toUserId);
};
```

### 3️⃣ 사용자 평점 재계산

```typescript
const recalculateUserRating = async (userId: string) => {
  // 해당 사용자에 대한 모든 후기 조회
  const reviews = await getDocs(
    query(
      collection(db, "reviews"),
      where("toUserId", "==", userId)
    )
  );
  
  if (reviews.empty) return;
  
  // 평균 계산
  let totalRating = 0;
  reviews.forEach((doc) => {
    totalRating += doc.data().rating;
  });
  
  const averageRating = totalRating / reviews.size;
  
  // users 컬렉션 업데이트 (계산 필드)
  await updateDoc(doc(db, "users", userId), {
    averageRating: Math.round(averageRating * 10) / 10, // 소수점 1자리
    totalReviews: reviews.size,
    updatedAt: serverTimestamp(),
  });
};
```

---

## 🔄 전체 플로우

### 거래 완료 → 후기 → 신뢰

```
1. 판매자가 "거래 완료" 버튼 클릭
   ↓
2. deal 생성 (status: "completed")
   ↓
3. 채팅에 시스템 메시지: "✅ 이 상품의 거래가 완료되었습니다"
   ↓
4. 상품 카드에 "거래 완료됨" 표시
   ↓
5. 채팅 하단에 CTA: "이번 거래는 어떠셨나요? [후기 남기기]"
   ↓
6. 사용자가 후기 남기기 클릭
   ↓
7. 후기 모달 열림 (평점 선택)
   ↓
8. review 생성
   ↓
9. 사용자 평점 재계산
   ↓
10. 프로필에 평점 반영 (⭐⭐⭐⭐☆)
```

---

## 🎨 UI 컴포넌트 설계

### 1️⃣ 거래 완료 표시 (상품 카드 내부)

```typescript
// ChatBubble 또는 ProductCard 컴포넌트 내부
{message.type === "product" && dealStatus === "completed" && (
  <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-2 text-sm text-green-800">
    ✅ 이 상품의 거래가 완료되었습니다
  </div>
)}
```

### 2️⃣ 후기 CTA (채팅 하단)

```typescript
// ChatInput 위에 표시
{dealStatus === "completed" && 
 !hasUserReviewed && 
 canReview && (
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2 animate-fadeIn">
    <p className="text-sm text-gray-700 mb-2">
      이번 거래는 어떠셨나요?
    </p>
    <button
      onClick={() => setShowReviewModal(true)}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 active:scale-[0.96] transition-all"
    >
      후기 남기기
    </button>
  </div>
)}
```

### 3️⃣ 후기 모달

```typescript
{showReviewModal && (
  <Modal onClose={() => setShowReviewModal(false)}>
    <h2>이번 거래는 어떠셨나요?</h2>
    
    {/* 평점 선택 */}
    <div className="flex gap-2 justify-center my-4">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => setRating(star)}
          className={`text-3xl ${
            rating >= star 
              ? "text-yellow-400" 
              : "text-gray-300"
          } hover:scale-110 transition-transform`}
        >
          ⭐
        </button>
      ))}
    </div>
    
    {/* 코멘트 (옵션 - 나중에 추가) */}
    {showCommentOption && (
      <textarea
        placeholder="선택사항: 거래 후기를 남겨주세요"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className="w-full p-3 border rounded-lg"
        rows={3}
      />
    )}
    
    <div className="flex gap-3 mt-4">
      <button
        onClick={() => setShowReviewModal(false)}
        className="flex-1 py-2 border rounded-lg"
      >
        나중에
      </button>
      <button
        onClick={handleSubmitReview}
        disabled={!rating}
        className="flex-1 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-300"
      >
        후기 남기기
      </button>
    </div>
  </Modal>
)}
```

---

## 🔐 Firestore Rules

### Reviews 컬렉션

```javascript
match /reviews/{reviewId} {
  // 읽기: 인증된 사용자 모두 가능
  allow read: if request.auth != null;
  
  // 생성: 거래 참여자만 가능
  allow create: if request.auth != null &&
                 // 거래 참여자인지 확인 (서버에서 검증 필요)
                 request.resource.data.fromUserId == request.auth.uid &&
                 // 본인에게는 불가
                 request.resource.data.fromUserId != request.resource.data.toUserId;
  
  // 수정/삭제: 작성자만 가능 (또는 금지)
  allow update, delete: if false; // 후기 수정/삭제 금지
}
```

### Deals 컬렉션

```javascript
match /deals/{dealId} {
  // 읽기: 거래 참여자만 가능
  allow read: if request.auth != null &&
              (resource.data.sellerId == request.auth.uid ||
               resource.data.buyerId == request.auth.uid);
  
  // 생성: 서버만 (또는 거래 완료 시)
  allow create: if request.auth != null;
  
  // 수정: 서버만
  allow update: if false;
  
  // 삭제: 금지
  allow delete: if false;
}
```

---

## 📌 여기까지 왔을 때 상태 판정

### ✅ 완료된 설계

- [x] 거래 단위 명확 (deal 컬렉션)
- [x] 후기 귀속 명확 (review.dealId)
- [x] 악용 가능성 최소화 (한 거래당 1회, 본인 불가)
- [x] 확장 가능성 열림 (신뢰 → 재거래 루프)

### 🎯 이제 이 앱은

👉 **거래 → 신뢰 → 재거래 루프를 만들 수 있다.**

---

## 🏁 다음 선택 (자동 대기)

### B️⃣ 거래 완료 후 채팅을 닫을까, 유지할까?
- 채팅 상태 관리
- 거래 완료 후 채팅 접근 권한

### C️⃣ 후기 점수가 프로필에 어떻게 반영될까?
- 평점 표시 위치
- 신뢰 지표 시각화

### D️⃣ 분쟁 발생 시 운영介入은 어디까지?
- 분쟁 처리 프로세스
- 운영자 개입 기준

---

**작성일**: 2024년  
**버전**: 1.0.0  
**담당자**: 개발팀

