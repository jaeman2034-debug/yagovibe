# 🧠 C 단계 — 후기 점수가 프로필에 어떻게 반영될까?

> **"사람을 믿을 수 있는가" 문제를 건드리는 설계**

**작성일**: 2024년  
**버전**: 1.0.0

---

## 🎯 핵심 질문

**"이 사람을 믿을 수 있는가?"를 숫자 하나로 판단하게 해도 되는가?**

### 대답: 아니다.

**그래서 단순 평균은 쓰면 안 된다.**

### ❌ 최악의 설계 (절대 금지)

```
⭐ 4.3 / 5.0
```

**이렇게만 보여주면:**
- 거래 1번 + 5점 → 고평가
- 악성 유저가 셀프 거래로 점수 세탁
- 한 번의 분쟁이 전체 신뢰 붕괴

👉 **초기 서비스 대부분 여기서 망함**

### ✅ 정답 원칙

**후기는 "신뢰의 힌트"이지 "판결"이 아니다**

### ❌ 단순 평균의 문제

```typescript
// 나쁜 예
averageRating = sum(ratings) / count(ratings)
```

**문제점:**
- 최근 거래와 오래된 거래가 동일하게 반영
- 악성 리뷰 1개가 평점을 크게 왜곡
- 거래 수가 적을 때 신뢰도 낮음
- 분산 정보 없음 (⭐⭐⭐⭐⭐ + ⭐ = 위험 신호)

---

## ✅ 정답 구조 (플랫폼급)

### 🔹 다층 신뢰 지표

```typescript
// users 컬렉션 (계산 필드)
user {
  // 기본 평점
  averageRating?: number        // 평균 평점
  totalReviews?: number          // 총 후기 수
  
  // 신뢰 지표 (추가)
  recentRating?: number         // 최근 10개 거래 평점 (가중치 높음)
  verifiedRating?: number       // 검증된 거래만 평점 (최소 3개 거래)
  ratingTrend?: "up" | "stable" | "down"  // 평점 추이
  
  // 신뢰도 등급
  trustLevel?: "NEW" | "RISING" | "TRUSTED" | "VERIFIED"
}
```

---

## 🧩 신뢰 지표 설계

### 1️⃣ 기본 평점 (모든 거래)

```typescript
// 모든 후기의 평균
const calculateAverageRating = async (userId: string) => {
  const reviews = await getDocs(
    query(
      collection(db, "reviews"),
      where("toUserId", "==", userId)
    )
  );
  
  if (reviews.empty) return null;
  
  let total = 0;
  reviews.forEach((doc) => {
    total += doc.data().rating;
  });
  
  return Math.round((total / reviews.size) * 10) / 10; // 소수점 1자리
};
```

**용도:** 기본 신뢰 지표

### 2️⃣ 최근 거래 가중치 (실전용 공식)

```typescript
// 최근 30일 거래 = 가중치 1.5, 이전 거래 = 가중치 1.0
const calculateWeightedRating = async (userId: string) => {
  const reviews = await getDocs(
    query(
      collection(db, "reviews"),
      where("toUserId", "==", userId),
      orderBy("createdAt", "desc")
    )
  );
  
  if (reviews.empty) return null;
  
  const now = Date.now();
  const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
  
  let weightedSum = 0;
  let totalWeight = 0;
  
  reviews.forEach((doc) => {
    const review = doc.data();
    const createdAt = review.createdAt.toMillis();
    
    // 최근 30일 거래 = 가중치 1.5, 이전 = 1.0
    const weight = createdAt >= thirtyDaysAgo ? 1.5 : 1.0;
    
    weightedSum += review.rating * weight;
    totalWeight += weight;
  });
  
  return Math.round((weightedSum / totalWeight) * 10) / 10;
};
```

**용도:** 최근 행동 반영 (예전 착한 사람 ≠ 지금 착한 사람)

### 3️⃣ 최소 거래 수 조건 (핵심 방어)

```typescript
// 거래 3건 미만 → 점수 숨김
const shouldShowRating = (totalReviews: number) => {
  return totalReviews >= 3;
};
```

**표시:**
- 3건 미만: "아직 거래 이력이 많지 않은 사용자입니다"
- 3건 이상: 평점 표시

**용도:** 신뢰 조작 70% 차단

👉 **이거 하나로 신뢰 조작 70% 차단**

### 4️⃣ 평균 + 분산 같이 본다 (중요)

```typescript
// 평균만 보면 위험: ⭐⭐⭐⭐⭐ + ⭐ = 평균 3.0 (위험 신호)
const calculateRatingWithVariance = async (userId: string) => {
  const reviews = await getDocs(
    query(
      collection(db, "reviews"),
      where("toUserId", "==", userId)
    )
  );
  
  if (reviews.empty) return null;
  
  const ratings = reviews.docs.map(doc => doc.data().rating);
  const average = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
  
  // 분산 계산
  const variance = ratings.reduce((sum, r) => 
    sum + Math.pow(r - average, 2), 0) / ratings.length;
  const stdDev = Math.sqrt(variance);
  
  // 분산이 크면 위험 신호 (하지만 직접 노출하지 않음)
  const isHighVariance = stdDev > 1.5;
  
  return {
    average: Math.round(average * 10) / 10,
    count: ratings.length,
    isHighVariance, // 내부 판단용
  };
};
```

**표시 규칙:**
- ❌ 분산 수치 직접 노출
- ⭕ 거래 수를 함께 노출

**예시:**
- 평균 ⭐ 4.8, 하지만 ⭐⭐⭐⭐⭐ + ⭐ → 위험 신호
- 프로필에는: "⭐ 4.5 (거래 12건)" 표시

**용도:** 분산 정보를 거래 수로 암시

---

## 🎨 신뢰도 등급 시스템

### Trust Level 계산

```typescript
const calculateTrustLevel = (
  totalReviews: number,
  averageRating: number,
  recentRating?: number,
  verifiedRating?: number
): "NEW" | "RISING" | "TRUSTED" | "VERIFIED" => {
  // NEW: 후기 없음 또는 1~2개
  if (totalReviews === 0 || totalReviews < 3) {
    return "NEW";
  }
  
  // RISING: 3~9개, 평점 4.0 이상
  if (totalReviews < 10 && averageRating >= 4.0) {
    return "RISING";
  }
  
  // TRUSTED: 10개 이상, 평점 4.0 이상
  if (totalReviews >= 10 && averageRating >= 4.0) {
    return "TRUSTED";
  }
  
  // VERIFIED: 20개 이상, 평점 4.5 이상, 검증된 평점 있음
  if (
    totalReviews >= 20 &&
    averageRating >= 4.5 &&
    verifiedRating &&
    verifiedRating >= 4.5
  ) {
    return "VERIFIED";
  }
  
  // 기본값
  return totalReviews >= 3 ? "RISING" : "NEW";
};
```

### Trust Level 표시

```typescript
// 프로필에 표시
const TrustBadge = ({ trustLevel, averageRating, totalReviews }) => {
  const badges = {
    NEW: { text: "신규", color: "gray", icon: "🆕" },
    RISING: { text: "성장 중", color: "blue", icon: "📈" },
    TRUSTED: { text: "신뢰", color: "green", icon: "✅" },
    VERIFIED: { text: "검증됨", color: "purple", icon: "⭐" },
  };
  
  const badge = badges[trustLevel] || badges.NEW;
  
  return (
    <div className={`trust-badge ${badge.color}`}>
      <span>{badge.icon}</span>
      <span>{badge.text}</span>
      <span>{averageRating?.toFixed(1)}</span>
      <span>({totalReviews})</span>
    </div>
  );
};
```

---

## 📊 UI 표시 전략 (정답)

### ❌ 이렇게 쓰지 마라

```
⭐ 4.7
```

### ⭕ 이렇게 써라

```
⭐ 4.7 · 거래 12건
```

**보조 문구:**
"최근 거래 기준으로 산정됩니다"

👉 **숫자를 믿게 하지 말고, 맥락을 보게 하라**

### 1️⃣ 프로필 카드

```typescript
// 사용자 프로필 카드
<div className="user-profile-card">
  <div className="avatar">{user.photoURL}</div>
  <div className="name">{user.displayName}</div>
  
  {/* 평점 표시 (3건 미만이면 숨김) */}
  {user.totalReviews >= 3 ? (
    <div className="rating-display">
      <div className="stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={star <= Math.round(user.averageRating || 0) ? "filled" : "empty"}
          >
            ⭐
          </span>
        ))}
      </div>
      {/* ⭐ 4.7 · 거래 12건 형식 */}
      <div className="rating-text">
        <span className="rating-value">{user.averageRating?.toFixed(1)}</span>
        <span className="separator"> · </span>
        <span className="review-count">거래 {user.totalReviews}건</span>
      </div>
      <div className="rating-note text-xs text-gray-500">
        최근 거래 기준으로 산정됩니다
      </div>
    </div>
  ) : (
    <div className="rating-placeholder text-sm text-gray-500">
      아직 거래 이력이 많지 않은 사용자입니다
    </div>
  )}
  
  {/* 점수 클릭 → 거래 이력 요약 */}
  <button
    onClick={() => setShowReviewHistory(true)}
    className="text-sm text-blue-600 hover:underline"
  >
    거래 이력 보기
  </button>
</div>
```

### 2️⃣ 채팅 헤더

```typescript
// 채팅방 헤더에 신뢰도 표시
<div className="chat-header">
  <div className="user-info">
    <span className="name">{otherUser.displayName}</span>
    {otherUser.trustLevel && (
      <TrustBadge
        trustLevel={otherUser.trustLevel}
        averageRating={otherUser.averageRating}
        totalReviews={otherUser.totalReviews}
        size="small"
      />
    )}
  </div>
</div>
```

### 3️⃣ 상품 상세 페이지

```typescript
// 판매자 정보에 신뢰도 표시
<div className="seller-info">
  <div className="seller-name">{seller.displayName}</div>
  <TrustBadge
    trustLevel={seller.trustLevel}
    averageRating={seller.averageRating}
    totalReviews={seller.totalReviews}
  />
</div>
```

---

## 🔄 평점 재계산 전략

### 1️⃣ 실시간 재계산 (후기 생성 시)

```typescript
// 후기 생성 시 즉시 재계산
const createReview = async (
  dealId: string,
  fromUserId: string,
  toUserId: string,
  rating: number
) => {
  // Review 생성
  await addDoc(collection(db, "reviews"), {
    dealId,
    fromUserId,
    toUserId,
    rating,
    createdAt: serverTimestamp(),
  });
  
  // 즉시 재계산 (Cloud Function 또는 클라이언트)
  await recalculateUserRating(toUserId);
};
```

### 2️⃣ 배치 재계산 (Cloud Function)

```typescript
// functions/src/recalculateRatings.ts
export const recalculateAllRatings = functions
  .region("asia-northeast3")
  .pubsub
  .schedule("every 24 hours")
  .onRun(async (context) => {
    // 모든 사용자의 평점 재계산
    const users = await db.collection("users").get();
    
    for (const userDoc of users.docs) {
      const userId = userDoc.id;
      await recalculateUserRating(userId);
    }
  });
```

### 3️⃣ 재계산 함수

```typescript
const recalculateUserRating = async (userId: string) => {
  // 모든 후기 조회
  const reviews = await getDocs(
    query(
      collection(db, "reviews"),
      where("toUserId", "==", userId),
      orderBy("createdAt", "desc")
    )
  );
  
  if (reviews.empty) {
    // 후기 없으면 필드 제거
    await updateDoc(doc(db, "users", userId), {
      averageRating: FieldValue.delete(),
      totalReviews: 0,
      recentRating: FieldValue.delete(),
      verifiedRating: FieldValue.delete(),
      ratingTrend: FieldValue.delete(),
      trustLevel: "NEW",
    });
    return;
  }
  
  // 기본 평점
  const totalRating = reviews.docs.reduce(
    (sum, doc) => sum + doc.data().rating,
    0
  );
  const averageRating = Math.round((totalRating / reviews.size) * 10) / 10;
  
  // 최근 평점 (최근 10개)
  const recent10 = reviews.docs.slice(0, 10);
  const recentRating = calculateRecentRating(recent10);
  
  // 검증된 평점 (최소 3개)
  const verifiedRating = reviews.size >= 3 ? averageRating : null;
  
  // 평점 추이
  const ratingTrend = calculateRatingTrend(reviews.docs);
  
  // 신뢰도 등급
  const trustLevel = calculateTrustLevel(
    reviews.size,
    averageRating,
    recentRating,
    verifiedRating
  );
  
  // users 컬렉션 업데이트
  await updateDoc(doc(db, "users", userId), {
    averageRating,
    totalReviews: reviews.size,
    recentRating: recentRating || FieldValue.delete(),
    verifiedRating: verifiedRating || FieldValue.delete(),
    ratingTrend: ratingTrend || FieldValue.delete(),
    trustLevel,
    updatedAt: serverTimestamp(),
  });
};
```

---

## 🧠 천재 포인트 하나

### 프로필 점수는 '결론'이 아니라 "이 사람을 더 알아볼지 말지"의 힌트다

**그래서:**
- 점수 클릭 → 거래 이력 요약
- 후기 텍스트는 선택적
- 숫자만 보여주지 않고 맥락을 함께 제공

### 1️⃣ 최소 거래 수 조건

**3개 미만:** 점수 숨김

**이유:**
- 악성 리뷰 1개가 평점을 크게 왜곡하는 것 방지
- 충분한 데이터가 있을 때만 신뢰도 표시
- 신뢰 조작 70% 차단

### 2️⃣ 최근 거래 가중치

**최근 30일 = 가중치 1.5, 이전 = 1.0**

**이유:**
- 예전 착한 사람 ≠ 지금 착한 사람
- 최근 행동이 더 중요

### 3️⃣ 평균 + 분산 같이 본다

**분산 수치 직접 노출 ❌**  
**거래 수를 함께 노출 ⭕**

**이유:**
- ⭐⭐⭐⭐⭐ + ⭐ = 평균 3.0 (위험 신호)
- 거래 수가 많을수록 신뢰도 높음
- 숫자를 믿게 하지 말고 맥락을 보게 함

### 4️⃣ 동일 상대 반복 거래 가중치 ↓

**같은 사람과 5번 거래해도 첫 번째만 1.0, 나머지 0.5**

**이유:**
- 셀프 세탁 방지
- 다양한 사람과의 거래가 더 신뢰도 높음

### 5️⃣ 차단/신고는 점수에 반영 안 함

**점수는 신뢰 지표, 신고는 운영 판단용**

**이유:**
- 섞으면 법적/정책 리스크
- 점수는 후기만으로 계산

---

## 🔐 악성 유저 방어 설계 (핵심)

### 1️⃣ 동일 상대 반복 거래 가중치 ↓

```typescript
// 같은 사람과 5번 거래해도 5번 다 반영 ❌
const calculateRatingWithDuplicatePenalty = async (userId: string) => {
  const reviews = await getDocs(
    query(
      collection(db, "reviews"),
      where("toUserId", "==", userId)
    )
  );
  
  // 같은 fromUserId와의 거래 그룹화
  const reviewGroups = new Map<string, number[]>();
  
  reviews.forEach((doc) => {
    const review = doc.data();
    const fromUserId = review.fromUserId;
    
    if (!reviewGroups.has(fromUserId)) {
      reviewGroups.set(fromUserId, []);
    }
    reviewGroups.get(fromUserId)!.push(review.rating);
  });
  
  // 같은 사람과의 거래는 첫 번째만 가중치 1.0, 나머지는 0.5
  let weightedSum = 0;
  let totalWeight = 0;
  
  reviewGroups.forEach((ratings, fromUserId) => {
    ratings.forEach((rating, index) => {
      const weight = index === 0 ? 1.0 : 0.5; // 첫 번째만 1.0, 나머지 0.5
      weightedSum += rating * weight;
      totalWeight += weight;
    });
  });
  
  return Math.round((weightedSum / totalWeight) * 10) / 10;
};
```

**용도:** 셀프 세탁 방지

### 2️⃣ 차단/신고 기록은 점수에 직접 반영 ❌

```typescript
// 점수는 신뢰 지표, 신고는 운영 판단용
// 섞으면 법적/정책 리스크

// ❌ 나쁜 예
const badRating = averageRating - (reportCount * 0.5);

// ✅ 좋은 예
// 점수는 점수대로, 신고는 별도 표시
const userProfile = {
  reputationScore: calculateRating(...), // 후기만으로 계산
  reportCount: 2,                        // 별도 표시
  // 점수에 직접 반영하지 않음
};
```

**원칙:**
- 점수는 신뢰 지표
- 신고는 운영 판단용
- 섞으면 법적/정책 리스크

### 3️⃣ 최소 거래 수 조건

```typescript
// 3개 미만이면 신뢰도 표시 안 함
if (totalReviews < 3) {
  return null; // 점수 숨김
}
```

### 4️⃣ 악성 리뷰 필터링

```typescript
// 극단적 평점 (1점 또는 5점만) 필터링
const filterExtremeRatings = (reviews: Review[]) => {
  const allRatings = reviews.map(r => r.rating);
  const isAllExtreme = 
    allRatings.every(r => r === 1) || 
    allRatings.every(r => r === 5);
  
  if (isAllExtreme && reviews.length < 5) {
    // 의심스러운 패턴 → 신뢰도 낮춤
    return null;
  }
  
  return calculateRating(...);
};
```

---

## 📊 데이터 모델 상세

### Users 컬렉션 (계산 필드)

```typescript
user {
  // 기본 정보
  uid: string
  displayName: string
  photoURL?: string
  
  // 신뢰 지표 (계산 필드)
  averageRating?: number        // 평균 평점 (소수점 1자리)
  totalReviews?: number          // 총 후기 수
  recentRating?: number          // 최근 10개 평점 (가중치)
  verifiedRating?: number        // 검증된 평점 (최소 3개)
  ratingTrend?: "up" | "stable" | "down"
  trustLevel: "NEW" | "RISING" | "TRUSTED" | "VERIFIED"
  
  // 업데이트 시간
  ratingUpdatedAt?: Timestamp
}
```

### Reviews 컬렉션

```typescript
review {
  id: string
  dealId: string
  fromUserId: string
  toUserId: string
  rating: 1 | 2 | 3 | 4 | 5
  comment?: string
  createdAt: Timestamp
}
```

---

## 🎨 UI 컴포넌트

### TrustBadge 컴포넌트

```typescript
interface TrustBadgeProps {
  trustLevel: "NEW" | "RISING" | "TRUSTED" | "VERIFIED";
  averageRating?: number;
  totalReviews?: number;
  size?: "small" | "medium" | "large";
}

export const TrustBadge: React.FC<TrustBadgeProps> = ({
  trustLevel,
  averageRating,
  totalReviews,
  size = "medium",
}) => {
  const badges = {
    NEW: { text: "신규", color: "gray", icon: "🆕" },
    RISING: { text: "성장 중", color: "blue", icon: "📈" },
    TRUSTED: { text: "신뢰", color: "green", icon: "✅" },
    VERIFIED: { text: "검증됨", color: "purple", icon: "⭐" },
  };
  
  const badge = badges[trustLevel];
  const sizeClass = {
    small: "text-xs px-2 py-1",
    medium: "text-sm px-3 py-1.5",
    large: "text-base px-4 py-2",
  }[size];
  
  // NEW는 표시 안 함 (또는 회색으로만)
  if (trustLevel === "NEW") {
    return null; // 또는 회색 배지
  }
  
  return (
    <div className={`inline-flex items-center gap-1 rounded-full ${badge.color}-bg ${sizeClass}`}>
      <span>{badge.icon}</span>
      <span className="font-medium">{badge.text}</span>
      {averageRating && (
        <>
          <span className="text-yellow-500">⭐</span>
          <span>{averageRating.toFixed(1)}</span>
        </>
      )}
      {totalReviews && (
        <span className="text-gray-500">({totalReviews})</span>
      )}
    </div>
  );
};
```

---

## 📌 여기까지 왔을 때 상태

### ✅ 완료된 설계

- [x] 단순 평균 금지 (⭐ 4.7 형식 대신 ⭐ 4.7 · 거래 12건)
- [x] 최소 거래 수 조건 (3개 미만 → 점수 숨김)
- [x] 최근 거래 가중치 (30일 이내 = 1.5, 이전 = 1.0)
- [x] 평균 + 분산 (거래 수로 암시)
- [x] 동일 상대 반복 거래 가중치 ↓ (셀프 세탁 방지)
- [x] 차단/신고는 점수에 반영 안 함 (법적 리스크 방지)
- [x] 점수는 "힌트"이지 "판결"이 아님

### 🎯 이제 이 앱은

👉 **사람을 숫자로 단죄하지 않는 구조다.**

**후기 악용 리스크 ↓↓↓**  
**신뢰 신호는 살아 있음**  
**초기 서비스에도 안전**

---

## 🏁 다음 단계

### D️⃣ 분쟁 발생 시 운영介入은 어디까지?
- 분쟁 처리 프로세스
- 운영자 개입 기준
- 자동 해결 vs 수동 개입

---

**작성일**: 2024년  
**버전**: 1.0.0  
**담당자**: 개발팀

