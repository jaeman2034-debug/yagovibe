# 🚀 30분 부스트 로직 구현 가이드

**목표**: 등록 직후 노출 지연 해소, 30분 내 채팅 발생률 ≥22%  
**조건**: 이미지 품질 ≥90점  
**효과**: 추천 가중치 +70%

---

## 📊 로직 구조

### 부스트 조건

```typescript
interface BoostCondition {
  timeWindow: number; // 30분 (밀리초)
  imageQuality: number; // 90점 이상
  boostWeight: number; // +70%
}
```

### 부스트 적용 규칙

1. **시간 조건**: 게시물 생성 후 30분 이내
2. **품질 조건**: 이미지 품질 점수 ≥90
3. **가중치**: 추천 점수에 +70% 부스트

---

## 🔧 Cloud Function 구현

### 게시물 생성 시 부스트 적용

```typescript
// functions/src/market/newPostBoost.ts

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { db, FieldValue, Timestamp } from "../firebase";

const BOOST_DURATION_MS = 30 * 60 * 1000; // 30분
const BOOST_WEIGHT = 0.7; // +70%
const MIN_IMAGE_QUALITY = 90;

/**
 * 새 게시물 생성 시 30분 부스트 적용
 */
export const onNewPostCreated = onDocumentCreated(
  "market/{postId}",
  async (event) => {
    const post = event.data?.data();
    if (!post) return;

    const postId = event.params.postId;
    const createdAt = post.createdAt?.toDate() || new Date();
    const boostEndTime = new Date(createdAt.getTime() + BOOST_DURATION_MS);

    // 이미지 품질 체크
    const imageQuality = post.imageQuality || 0;
    if (imageQuality < MIN_IMAGE_QUALITY) {
      logger.info("[onNewPostCreated] 이미지 품질 미달, 부스트 미적용:", {
        postId,
        imageQuality,
      });
      return;
    }

    // 부스트 정보 저장
    await db.collection("market").doc(postId).update({
      boostActive: true,
      boostWeight: BOOST_WEIGHT,
      boostStartTime: Timestamp.fromDate(createdAt),
      boostEndTime: Timestamp.fromDate(boostEndTime),
      updatedAt: FieldValue.serverTimestamp(),
    });

    logger.info("[onNewPostCreated] 30분 부스트 적용:", {
      postId,
      boostEndTime: boostEndTime.toISOString(),
    });
  }
);
```

---

### 추천 피드에서 부스트 반영

```typescript
// functions/src/market/feedEngine.ts

import { db, Timestamp } from "../firebase";

/**
 * 추천 피드 점수 계산 (부스트 반영)
 */
export async function calculateFeedScore(
  post: any,
  userProfile: any
): Promise<number> {
  const now = new Date();
  const boostEndTime = post.boostEndTime?.toDate();

  // 기본 점수 계산
  let score = 0;

  // 1. 관심사 유사도 (40%)
  const interestSimilarity = calculateInterestSimilarity(post, userProfile);
  score += interestSimilarity * 0.4;

  // 2. 거리 (20%)
  const distance = calculateDistance(post.location, userProfile.location);
  const distanceScore = Math.max(0, 1 - distance / 10); // 10km 기준
  score += distanceScore * 0.2;

  // 3. 평판 (20%)
  const reputation = post.authorReputation || 0;
  score += (reputation / 10) * 0.2; // 10점 만점 기준

  // 4. 최신성 (10%)
  const recency = calculateRecency(post.createdAt);
  score += recency * 0.1;

  // 5. 전환율 (10%)
  const conversionRate = post.conversionRate || 0;
  score += conversionRate * 0.1;

  // 🔥 30분 부스트 적용
  if (post.boostActive && boostEndTime && now < boostEndTime) {
    const boostMultiplier = 1 + post.boostWeight; // 1.7배
    score = score * boostMultiplier;
    
    logger.info("[calculateFeedScore] 부스트 적용:", {
      postId: post.id,
      originalScore: score / boostMultiplier,
      boostedScore: score,
      boostWeight: post.boostWeight,
    });
  }

  return parseFloat(score.toFixed(4));
}

function calculateInterestSimilarity(post: any, userProfile: any): number {
  // 관심사 유사도 계산 로직
  // (기존 구현 활용)
  return 0.8; // 예시
}

function calculateDistance(loc1: any, loc2: any): number {
  // 거리 계산 로직
  // (기존 구현 활용)
  return 2.5; // km, 예시
}

function calculateRecency(createdAt: any): number {
  const now = new Date();
  const created = createdAt?.toDate() || now;
  const hoursAgo = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
  
  // 24시간 기준 최신성 점수
  return Math.max(0, 1 - hoursAgo / 24);
}
```

---

### 부스트 만료 체크 (스케줄러)

```typescript
// functions/src/market/boostExpiry.ts

import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import { db, FieldValue, Timestamp } from "../firebase";

/**
 * 부스트 만료 체크 (1분마다)
 */
export const checkBoostExpiry = onSchedule(
  { schedule: "* * * * *", timeZone: "Asia/Seoul" },
  async () => {
    const now = Timestamp.now();
    const nowDate = now.toDate();

    // 만료된 부스트 찾기
    const expiredBoosts = await db
      .collection("market")
      .where("boostActive", "==", true)
      .where("boostEndTime", "<=", now)
      .get();

    if (expiredBoosts.empty) {
      logger.info("[checkBoostExpiry] 만료된 부스트 없음");
      return;
    }

    // 부스트 비활성화
    const batch = db.batch();
    expiredBoosts.docs.forEach((doc) => {
      batch.update(doc.ref, {
        boostActive: false,
        boostWeight: 0,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();

    logger.info("[checkBoostExpiry] 부스트 만료 처리:", {
      count: expiredBoosts.size,
    });
  }
);
```

---

## 📊 측정 지표

### KPI 쿼리

```typescript
// functions/src/analytics/boostMetrics.ts

import { db, Timestamp } from "../firebase";

/**
 * 30분 내 채팅 발생률 계산
 * 목표: ≥22%
 */
export async function getChatRateWithin30Min(
  startDate: Date,
  endDate: Date
): Promise<number> {
  const start = Timestamp.fromDate(startDate);
  const end = Timestamp.fromDate(endDate);

  // 부스트 적용된 게시물 수
  const boostedPosts = await db
    .collection("market")
    .where("boostActive", "==", true)
    .where("createdAt", ">=", start)
    .where("createdAt", "<=", end)
    .get();

  const boostedPostIds = boostedPosts.docs.map(d => d.id);

  // 30분 내 채팅 발생 수
  const chats = await db
    .collection("chatRooms")
    .where("createdAt", ">=", start)
    .where("createdAt", "<=", end)
    .get();

  const chatsWithin30Min = chats.docs.filter((doc) => {
    const chat = doc.data();
    const postId = chat.postId;
    const chatCreatedAt = chat.createdAt?.toDate();
    const postCreatedAt = chat.postCreatedAt?.toDate();

    if (!postId || !chatCreatedAt || !postCreatedAt) return false;

    const timeDiff = chatCreatedAt.getTime() - postCreatedAt.getTime();
    const within30Min = timeDiff <= 30 * 60 * 1000;

    return boostedPostIds.includes(postId) && within30Min;
  });

  const chatRate = boostedPosts.size > 0
    ? (chatsWithin30Min.length / boostedPosts.size) * 100
    : 0;

  return parseFloat(chatRate.toFixed(2));
}
```

---

## 🎨 UI 문구

### 게시물 카드에 부스트 표시

```tsx
// src/components/market/PostCard.tsx

import { Clock, TrendingUp } from "lucide-react";

interface PostCardProps {
  post: any;
}

export default function PostCard({ post }: PostCardProps) {
  const isBoosted = post.boostActive && 
    new Date() < (post.boostEndTime?.toDate() || new Date());

  return (
    <div className="relative">
      {/* 부스트 배지 */}
      {isBoosted && (
        <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-orange-500 text-white text-xs font-medium rounded-full">
          <TrendingUp className="w-3 h-3" />
          <span>신상품 부스트</span>
        </div>
      )}

      {/* 게시물 내용 */}
      <div className="p-4">
        {/* ... 게시물 내용 ... */}
      </div>
    </div>
  );
}
```

---

### 부스트 타이머 표시

```tsx
// src/components/market/BoostTimer.tsx

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface BoostTimerProps {
  boostEndTime: Date;
}

export default function BoostTimer({ boostEndTime }: BoostTimerProps) {
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const diff = boostEndTime.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft("부스트 종료");
        return;
      }

      const minutes = Math.floor(diff / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${minutes}분 ${seconds}초 남음`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [boostEndTime]);

  return (
    <div className="flex items-center gap-1 text-xs text-orange-600">
      <Clock className="w-3 h-3" />
      <span>{timeLeft}</span>
    </div>
  );
}
```

---

## 🔔 알람 설정

### 부스트 효과 모니터링

```typescript
// functions/src/analytics/boostAlerts.ts

import { getChatRateWithin30Min } from "./boostMetrics";

/**
 * 부스트 효과 알람 체크
 */
export async function checkBoostEffectiveness(): Promise<void> {
  const now = new Date();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const chatRate = await getChatRateWithin30Min(weekStart, now);

  // 목표: ≥22%
  if (chatRate < 22) {
    const message = `⚠️ [부스트 효과 부족] 30분 내 채팅 발생률: ${chatRate}% (목표: ≥22%)`;
    
    // Slack, 이메일 알림 전송
    await sendAlert(message, "warning");
    
    logger.warn("[checkBoostEffectiveness] 부스트 효과 부족:", {
      chatRate,
      target: 22,
    });
  }
}
```

---

## 📋 실행 체크리스트

### Week 1: 구현

- [ ] Day 1-2: 부스트 로직 구현 (`onNewPostCreated`)
- [ ] Day 3-4: 추천 피드 부스트 반영 (`calculateFeedScore`)
- [ ] Day 5-7: 부스트 만료 체크 스케줄러 (`checkBoostExpiry`)

### Week 2: 측정 및 최적화

- [ ] Day 8-10: 측정 지표 구현 (`getChatRateWithin30Min`)
- [ ] Day 11-14: UI 문구 추가 + 알람 설정

---

## 🎯 예상 효과

### 전환율 개선

- 30분 내 채팅 발생률: 15% → 22% (+47%)
- 등록→거래 전환율: 32% → 35% (+9%)

### 사용자 경험 개선

- 신상품 노출 속도: 평균 2시간 → 30분 (-75%)
- 첫 채팅까지 시간: 평균 4시간 → 1시간 (-75%)

---

**30분 부스트 로직 구현 가이드 완성**
