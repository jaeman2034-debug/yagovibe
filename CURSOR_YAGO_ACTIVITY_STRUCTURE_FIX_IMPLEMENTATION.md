# 🔥 Cursor 개발자: YAGO Activity 구조 수정 구현 가이드

## 현재 상태 분석

### ✅ 이미 구현된 부분

1. **Activity 생성**: EquipmentForm, RecruitForm, MatchForm에서 activities 컬렉션에 저장
2. **Activity 조회**: ActivityFeed에서 activities 컬렉션만 조회
3. **Activity 라우팅**: ActivityCard에서 type 기반 라우팅

### ❌ 수정 필요한 부분

1. **Activity 생성 시 `collection` 필드 누락**
   - 현재: `refType: "market"` 사용
   - 필요: `collection: "marketPosts"` 추가

2. **ActivityCard 라우팅이 `collection` 기반이 아님**
   - 현재: `type` 기반 라우팅
   - 필요: `collection` 기반 라우팅 + 레거시 지원

---

## 1️⃣ Activity 생성 코드 수정

### EquipmentForm.tsx 수정

**파일**: `src/features/market/components/forms/EquipmentForm.tsx`

**위치**: 약 400-420줄

**Before (현재)**:
```typescript
const activityDataRaw = {
  type: "equipment_created" as const,
  refType: "market" as const,
  refId: docRef.id,
  authorId: user.uid,
  title: title.trim(),
  summary: description?.trim() || (price ? `${Number(price).toLocaleString()}원` : undefined),
  thumbnailUrl: imageUrls[0] || undefined,
  visibility: "public" as const,
  likeCount: 0,
  commentCount: 0,
  createdAt: serverTimestamp(),
  sport: sport?.toLowerCase().trim() || "soccer",
  category: "equipment",
};
```

**After (수정 후)**:
```typescript
const activityDataRaw = {
  type: "equipment_created" as const,
  refType: "market" as const, // 레거시 지원
  refId: docRef.id, // 레거시 지원 (postId와 동일)
  postId: docRef.id, // 새 필드
  collection: "marketPosts", // 🔥 새 필드 추가
  authorId: user.uid,
  userId: user.uid, // 레거시 지원
  title: title.trim(),
  summary: description?.trim() || (price ? `${Number(price).toLocaleString()}원` : undefined),
  thumbnailUrl: imageUrls[0] || undefined,
  visibility: "public" as const,
  likeCount: 0,
  commentCount: 0,
  createdAt: serverTimestamp(),
  sport: sport?.toLowerCase().trim() || "soccer",
  category: "equipment",
};
```

---

### RecruitForm.tsx 수정

**파일**: `src/features/market/components/forms/RecruitForm.tsx`

**위치**: 약 220-240줄

**Before (현재)**:
```typescript
const activityDataRaw = {
  type: "recruit_created" as const,
  refType: "recruit" as const,
  refId: docRef.id,
  // ... 기타 필드
};
```

**After (수정 후)**:
```typescript
const activityDataRaw = {
  type: "recruit_created" as const,
  refType: "recruit" as const, // 레거시 지원
  refId: docRef.id, // 레거시 지원
  postId: docRef.id, // 🔥 새 필드 추가
  collection: "recruitPosts", // 🔥 새 필드 추가
  authorId: user.uid,
  userId: user.uid, // 레거시 지원
  // ... 기타 필드
};
```

---

### MatchForm.tsx 수정

**파일**: `src/features/market/components/forms/MatchForm.tsx`

**위치**: 약 240-260줄

**Before (현재)**:
```typescript
const activityDataRaw = {
  type: "match_created" as const,
  refType: "market" as const,
  refId: docRef.id,
  // ... 기타 필드
};
```

**After (수정 후)**:
```typescript
const activityDataRaw = {
  type: "match_created" as const,
  refType: "market" as const, // 레거시 지원
  refId: docRef.id, // 레거시 지원
  postId: docRef.id, // 🔥 새 필드 추가
  collection: "matchPosts", // 🔥 새 필드 추가
  authorId: user.uid,
  userId: user.uid, // 레거시 지원
  // ... 기타 필드
};
```

---

## 2️⃣ ActivityCard 라우팅 수정

### ActivityCard.tsx 수정

**파일**: `src/features/activity/ActivityCard.tsx`

**위치**: 약 92-150줄

**Before (현재)**:
```typescript
const handleClick = (e?: React.MouseEvent) => {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  const postId = item.refId || item.sourceId;
  const refType = item.sourceType || "market";
  const sport = item.sport || "soccer";

  switch (item.type) {
    case "equipment_created":
    case "market_created":
      navigate(`/sports/${sport}/market/${postId}`);
      break;
    case "recruit_created":
      navigate(`/sports/${sport}/recruit/${postId}`);
      break;
    // ... 기타
  }
};
```

**After (수정 후)**:
```typescript
const handleClick = (e?: React.MouseEvent) => {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  // 🔥 postId 추출 (우선순위: postId > refId > sourceId)
  const postId = (item as any).postId || item.refId || item.sourceId;
  
  if (!postId) {
    console.error("❌ [ActivityCard] postId가 없습니다:", item);
    alert("게시글 ID를 찾을 수 없습니다.");
    return;
  }

  // 🔥 sport 추출
  const sport = item.sport || "soccer";

  // 🔥 collection 기반 라우팅 (우선)
  const collection = (item as any).collection;
  
  if (collection) {
    switch (collection) {
      case "marketPosts":
        navigate(`/sports/${sport}/market/${postId}`);
        return;
      case "recruitPosts":
        navigate(`/sports/${sport}/recruit/${postId}`);
        return;
      case "matchPosts":
        navigate(`/sports/${sport}/match/${postId}`);
        return;
      case "teamPosts":
        navigate(`/sports/${sport}/team/${postId}`);
        return;
      case "eventPosts":
        navigate(`/sports/${sport}/event/${postId}`);
        return;
      default:
        console.warn("⚠️ [ActivityCard] 알 수 없는 collection:", collection);
        // 레거시 라우팅으로 fallback
        break;
    }
  }

  // 🔥 레거시 지원: type 기반 라우팅 (collection이 없을 때)
  switch (item.type) {
    case "equipment_created":
    case "market_created":
      navigate(`/sports/${sport}/market/${postId}`);
      break;
    case "recruit_created":
      navigate(`/sports/${sport}/recruit/${postId}`);
      break;
    case "match_created":
      navigate(`/sports/${sport}/match/${postId}`);
      break;
    case "team_created":
      navigate(`/sports/${sport}/team/${postId}`);
      break;
    case "team_event":
      navigate(`/sports/${sport}/event/${postId}`);
      break;
    default:
      console.warn("⚠️ [ActivityCard] 알 수 없는 activity type:", item.type);
      break;
  }
};
```

---

## 3️⃣ ActivityCard 타입 정의 수정

**파일**: `src/features/activity/ActivityCard.tsx`

**위치**: 약 12-28줄

**Before (현재)**:
```typescript
type Props = {
  item: {
    id: string;
    type: string;
    title: string;
    summary?: string;
    sourceId?: string;
    sourceType?: string;
    refId?: string;
    sport?: string;
    category?: string;
    thumbnail?: string;
    thumbnailUrl?: string;
    createdAt?: any;
    address?: string;
  };
};
```

**After (수정 후)**:
```typescript
type Props = {
  item: {
    id: string;
    type: string;
    title: string;
    summary?: string;
    sourceId?: string; // 레거시 지원
    sourceType?: string; // 레거시 지원
    refId?: string; // 레거시 지원
    postId?: string; // 🔥 새 필드
    collection?: string; // 🔥 새 필드
    sport?: string;
    category?: string;
    thumbnail?: string; // 레거시 지원
    thumbnailUrl?: string;
    createdAt?: any;
    address?: string;
  };
};
```

---

## 4️⃣ ActivityFeed 조회 로직 확인

**파일**: `src/features/activity/ActivityFeed.tsx`

**확인 사항**: activities 컬렉션만 조회하는지 확인

**✅ 올바른 코드 (이미 구현됨)**:
```typescript
const activitiesQuery = query(
  collection(db, "activities"),
  where("visibility", "==", "public"),
  // ... 필터 조건
  orderBy("createdAt", "desc"),
  limit(20)
);
```

**❌ 잘못된 코드 (제거 필요)**:
```typescript
// 이런 코드가 있다면 제거
const marketQuery = query(collection(db, "marketPosts"), ...);
const recruitQuery = query(collection(db, "recruitPosts"), ...);
```

---

## 5️⃣ 작업 체크리스트

### Activity 생성 코드 수정

- [ ] `EquipmentForm.tsx`: `collection: "marketPosts"`, `postId` 추가
- [ ] `RecruitForm.tsx`: `collection: "recruitPosts"`, `postId` 추가
- [ ] `MatchForm.tsx`: `collection: "matchPosts"`, `postId` 추가

### ActivityCard 라우팅 수정

- [ ] `ActivityCard.tsx`: `collection` 기반 라우팅 구현
- [ ] `ActivityCard.tsx`: 레거시 `type` 기반 라우팅 지원
- [ ] `ActivityCard.tsx`: 타입 정의에 `postId`, `collection` 추가

### ActivityFeed 조회 확인

- [ ] `ActivityFeed.tsx`: activities 컬렉션만 조회하는지 확인
- [ ] marketPosts/recruitPosts 직접 조회 코드 제거 (있다면)

---

## 6️⃣ 테스트 시나리오

### 시나리오 1: Equipment 글 작성

1. `/sports/soccer/market/write`에서 Equipment 글 작성
2. Firestore 확인:
   - `marketPosts` 컬렉션에 게시글 저장됨
   - `activities` 컬렉션에 Activity 생성됨
   - Activity에 `collection: "marketPosts"`, `postId` 포함됨

### 시나리오 2: Activity Feed 표시

1. `/activity?sport=soccer` 접속
2. 전체 탭: "공공공", "야고 축구 FC" 모두 표시
3. 거래 탭: "공공공"만 표시
4. 팀 탭: "야고 축구 FC"만 표시

### 시나리오 3: Activity 클릭 라우팅

1. Activity 카드 클릭
2. `collection` 기반으로 올바른 상세 페이지로 이동
   - `collection: "marketPosts"` → `/sports/soccer/market/:postId`
   - `collection: "recruitPosts"` → `/sports/soccer/recruit/:postId`
   - `collection: "matchPosts"` → `/sports/soccer/match/:postId`

---

## 7️⃣ 레거시 데이터 마이그레이션 (선택사항)

기존 Activity 데이터에 `collection` 필드가 없는 경우를 대비한 마이그레이션 스크립트:

```typescript
// 마이그레이션 스크립트 (한 번만 실행)
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

async function migrateActivities() {
  const activitiesRef = collection(db, "activities");
  const snapshot = await getDocs(activitiesRef);
  
  const updates = snapshot.docs.map(async (activityDoc) => {
    const data = activityDoc.data();
    
    // collection 필드가 없으면 추가
    if (!data.collection) {
      let collectionName = "marketPosts"; // 기본값
      
      // type 기반으로 collection 결정
      if (data.type === "equipment_created" || data.type === "market_created") {
        collectionName = "marketPosts";
      } else if (data.type === "recruit_created") {
        collectionName = "recruitPosts";
      } else if (data.type === "match_created") {
        collectionName = "matchPosts";
      } else if (data.type === "team_created") {
        collectionName = "teamPosts";
      } else if (data.type === "team_event") {
        collectionName = "eventPosts";
      }
      
      // postId도 추가 (refId가 있으면)
      const updates: any = {
        collection: collectionName,
      };
      
      if (data.refId && !data.postId) {
        updates.postId = data.refId;
      }
      
      await updateDoc(doc(db, "activities", activityDoc.id), updates);
      console.log(`✅ [Migration] Activity ${activityDoc.id} 업데이트 완료`);
    }
  });
  
  await Promise.all(updates);
  console.log("✅ [Migration] 모든 Activity 마이그레이션 완료");
}
```

---

이 수정을 완료하면 **Activity 구조가 완전히 안정화**됩니다.
