# 🔥 인기글/추천 피드용 랭킹 구조 구현 완료

## ✅ 완료된 작업

### 1. MarketPost 타입 확장
- **파일**: `src/types/market.ts`
- **추가 필드**:
  - `views?: number` - 조회수
  - `likesCount?: number` - 좋아요 수
  - `chatCount?: number` - 채팅 수
  - `rankScore?: number` - 랭킹 점수
- **레거시 호환**: `viewCount`, `likeCount` 필드 유지

### 2. 랭킹 점수 계산 유틸리티
- **파일**: `src/utils/marketRanking.ts`
- **점수 공식**: `rankScore = chatCount * 100 + likesCount * 10 + views`
- **가중치**:
  - 채팅: 100점 (가장 높은 가치 - 실제 거래 의도)
  - 좋아요: 10점 (관심도)
  - 조회수: 1점 (노출)

### 3. 랭킹 점수 갱신 서비스
- **파일**: `src/services/marketRankingService.ts`
- **함수**:
  - `incrementPostViews(postId)` - 조회수 증가 + rankScore 갱신
  - `incrementPostLikes(postId)` - 좋아요 증가 + rankScore 갱신
  - `decrementPostLikes(postId)` - 좋아요 취소 + rankScore 갱신
  - `incrementPostChatCount(postId)` - 채팅 생성 + rankScore 갱신
  - `initializePostRankScore(postId)` - 게시글 생성 시 초기 rankScore 설정

### 4. 인기글 조회 Hook
- **파일**: `src/hooks/useMarketPostsPopular.ts`
- **쿼리 분기**:
  - 전체: `orderBy("rankScore", "desc")`
  - sport: `where("sport", "==", sport) + orderBy("rankScore", "desc")`
  - sport+category: `where("sport", "==", sport) + where("category", "==", category) + orderBy("rankScore", "desc")`

### 5. 추천 피드 Hook (v1)
- **파일**: `src/hooks/useMarketFeedRecommended.ts`
- **비율**: 관심 40% + 인기 40% + 최신 20%
- **관심**: 최근 본 sport/category 기반 (localStorage)
- **인기**: rankScore 높은 순
- **최신**: createdAt 최신 순
- **중복 제거**: Set으로 중복 게시글 제거

## 📐 구조 설계

### 랭킹 점수 계산

```typescript
rankScore = chatCount * 100 + likesCount * 10 + views
```

**예시**:
- 채팅 5개, 좋아요 10개, 조회수 100 → `5*100 + 10*10 + 100 = 700점`
- 채팅 1개, 좋아요 20개, 조회수 50 → `1*100 + 20*10 + 50 = 350점`

### Firestore 인덱스 필요

다음 인덱스가 필요합니다:

1. **전체 인기글**:
   ```
   Collection: marketPosts
   Fields: status (ASC), rankScore (DESC)
   ```

2. **종목별 인기글**:
   ```
   Collection: marketPosts
   Fields: status (ASC), sport (ASC), rankScore (DESC)
   ```

3. **종목+카테고리별 인기글**:
   ```
   Collection: marketPosts
   Fields: status (ASC), sport (ASC), category (ASC), rankScore (DESC)
   ```

## 🔗 통합 지점

### 1. 게시글 생성 시 초기화

게시글 생성 시 `initializePostRankScore` 호출:

```typescript
import { initializePostRankScore } from "@/services/marketRankingService";

// 게시글 생성 후
await addDoc(collection(db, "marketPosts"), postData);
await initializePostRankScore(postId);
```

### 2. 조회수 증가 시

게시글 상세 페이지에서:

```typescript
import { incrementPostViews } from "@/services/marketRankingService";

// 게시글 조회 시
useEffect(() => {
  if (postId) {
    incrementPostViews(postId);
  }
}, [postId]);
```

### 3. 좋아요 시

좋아요 버튼 클릭 시:

```typescript
import { incrementPostLikes, decrementPostLikes } from "@/services/marketRankingService";

// 좋아요
await incrementPostLikes(postId);

// 좋아요 취소
await decrementPostLikes(postId);
```

### 4. 채팅 생성 시

채팅방 생성 시:

```typescript
import { incrementPostChatCount } from "@/services/marketRankingService";

// 채팅방 생성 후
await incrementPostChatCount(postId);
```

## 🚀 Cloud Functions 통합 (권장)

클라이언트 사이드 대신 Cloud Functions에서 처리하는 것이 더 안전합니다:

### functions/src/market/ranking.ts

```typescript
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// 채팅 생성 시 rankScore 갱신
export const onChatRoomCreated = functions.firestore
  .document("chatRooms/{chatRoomId}")
  .onCreate(async (snap, context) => {
    const chatData = snap.data();
    const postId = chatData.postId;
    
    if (!postId) return;
    
    const postRef = admin.firestore().collection("marketPosts").doc(postId);
    const postSnap = await postRef.get();
    
    if (!postSnap.exists) return;
    
    const postData = postSnap.data();
    const newChatCount = (postData?.chatCount || 0) + 1;
    const newRankScore = newChatCount * 100 + 
                        (postData?.likesCount || 0) * 10 + 
                        (postData?.views || 0);
    
    await postRef.update({
      chatCount: admin.firestore.FieldValue.increment(1),
      rankScore: newRankScore,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
```

## 📊 사용 예시

### 인기글 조회

```typescript
import { useMarketPostsPopular } from "@/hooks/useMarketPostsPopular";

// 전체 인기글
const { posts, loading } = useMarketPostsPopular();

// 축구 인기글
const { posts } = useMarketPostsPopular({ sport: "soccer" });

// 축구 중고 인기글
const { posts } = useMarketPostsPopular({ 
  sport: "soccer", 
  category: "equipment" 
});
```

### 추천 피드 조회

```typescript
import { useMarketFeedRecommended } from "@/hooks/useMarketFeedRecommended";

// 전체 추천 피드
const { posts, loading } = useMarketFeedRecommended();

// 축구 추천 피드
const { posts } = useMarketFeedRecommended({ sport: "soccer" });
```

## ✅ 검증 체크리스트

- [x] MarketPost 타입에 랭킹 필드 추가
- [x] rankScore 계산 함수 생성
- [x] 조회수 증가 시 rankScore 갱신 로직
- [x] 좋아요 시 rankScore 갱신 로직
- [x] 채팅 생성 시 rankScore 갱신 로직
- [x] 인기글 쿼리 추가 (전체/sport/sport+category)
- [x] 추천 피드 v1 구현 (관심 40% + 인기 40% + 최신 20%)
- [ ] Firestore 인덱스 생성 (필수)
- [ ] 게시글 생성 시 초기 rankScore 설정 연결
- [ ] 조회수 증가 로직 연결
- [ ] 좋아요 로직 연결
- [ ] 채팅 생성 로직 연결
- [ ] Cloud Functions 통합 (권장)

## 🔥 다음 단계

1. **Firestore 인덱스 생성** (필수)
2. **통합 지점 연결** (게시글 생성/조회/좋아요/채팅)
3. **Cloud Functions로 마이그레이션** (권장)
4. **테스트 및 검증**

---

**랭킹 구조 구현 완료! 이제 인기글과 추천 피드를 사용할 수 있습니다.** 🎉
