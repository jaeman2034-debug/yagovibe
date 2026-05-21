# 🔍 Activity 스키마 확인 및 완전 해결 패치

## 현재 Activity 생성 코드 확인

### EquipmentForm.tsx (400-420줄)

**현재 저장되는 필드**:

```typescript
const activityDataRaw = {
  type: "equipment_created",
  refType: "market",           // ✅ 있음
  refId: docRef.id,            // ✅ 있음
  authorId: user.uid,
  title: title.trim(),
  summary: ...,
  thumbnailUrl: ...,
  visibility: "public",
  likeCount: 0,
  commentCount: 0,
  createdAt: serverTimestamp(),
  sport: sport?.toLowerCase().trim() || "soccer",  // ✅ 있음
  category: "equipment",
  // ❌ collection: 없음
  // ❌ postId: 없음
};
```

---

### RecruitForm.tsx (218-238줄)

**현재 저장되는 필드**:

```typescript
const activityDataRaw = {
  type: "recruit_created",
  refType: "recruit",          // ✅ 있음
  refId: docRef.id,            // ✅ 있음
  authorId: user.uid,
  // ... 기타 필드
  sport: sport?.toLowerCase().trim() || "soccer",  // ✅ 있음
  category: "recruit",
  // ❌ collection: 없음
  // ❌ postId: 없음
};
```

---

### MatchForm.tsx (240-260줄)

**현재 저장되는 필드**:

```typescript
const activityDataRaw = {
  type: "match_created",
  refType: "market",           // ✅ 있음 (잘못됨, "match"여야 함)
  refId: docRef.id,            // ✅ 있음
  authorId: user.uid,
  // ... 기타 필드
  sport: sport?.toLowerCase().trim() || "soccer",  // ✅ 있음
  category: "match",
  // ❌ collection: 없음
  // ❌ postId: 없음
};
```

---

## 🔴 확인 결과

**현재 Activity 문서 구조**:

```typescript
{
  type: string,              // ✅ 있음
  sport: string,             // ✅ 있음
  refType: string,           // ✅ 있음 (레거시)
  refId: string,             // ✅ 있음 (레거시)
  authorId: string,          // ✅ 있음
  title: string,             // ✅ 있음
  // ... 기타 필드
  collection: undefined,     // ❌ 없음
  postId: undefined,         // ❌ 없음
}
```

---

## 🔴 문제 원인 확정

**문제**: Activity 문서에 `collection`과 `postId` 필드가 없어서:

1. **Feed 필터링 실패**: `collection`/`postId` 기반 로직에서 `undefined`로 인해 필터 탈락
2. **라우팅 실패**: `collection`/`postId` 기반 라우팅에서 `undefined`로 인해 실패
3. **전체 탭 비어있음**: `collection`/`postId` 체크 로직이 있어서 모든 Activity가 필터 탈락

---

## 🔥 완전 해결 패치 (5분짜리)

### 1️⃣ Activity 생성 구조 수정 (가장 먼저)

#### EquipmentForm.tsx 수정

**파일**: `src/features/market/components/forms/EquipmentForm.tsx`

**위치**: 약 400줄

**Before (현재)**:
```typescript
const activityDataRaw = {
  type: "equipment_created" as const,
  refType: "market" as const,
  refId: docRef.id,
  authorId: user.uid,
  // ... 기타 필드
  sport: sport?.toLowerCase().trim() || "soccer",
  category: "equipment",
};
```

**After (수정 후)**:
```typescript
const activityDataRaw = {
  type: "equipment_created" as const,
  sport: sport?.toLowerCase().trim() || "soccer",
  // 🔥 필수 필드 추가
  collection: "marketPosts",      // ✅ 추가
  postId: docRef.id,              // ✅ 추가
  // 레거시 필드 유지 (호환성)
  refType: "market" as const,
  refId: docRef.id,
  authorId: user.uid,
  // ... 기타 필드
  category: "equipment",
};
```

---

#### RecruitForm.tsx 수정

**파일**: `src/features/market/components/forms/RecruitForm.tsx`

**위치**: 약 218줄

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
  sport: sport?.toLowerCase().trim() || "soccer",
  // 🔥 필수 필드 추가
  collection: "recruitPosts",     // ✅ 추가
  postId: docRef.id,              // ✅ 추가
  // 레거시 필드 유지 (호환성)
  refType: "recruit" as const,
  refId: docRef.id,
  authorId: user.uid,
  // ... 기타 필드
  category: "recruit",
};
```

---

#### MatchForm.tsx 수정

**파일**: `src/features/market/components/forms/MatchForm.tsx`

**위치**: 약 240줄

**Before (현재)**:
```typescript
const activityDataRaw = {
  type: "match_created" as const,
  refType: "market" as const,     // ❌ 잘못됨
  refId: docRef.id,
  // ... 기타 필드
};
```

**After (수정 후)**:
```typescript
const activityDataRaw = {
  type: "match_created" as const,
  sport: sport?.toLowerCase().trim() || "soccer",
  // 🔥 필수 필드 추가
  collection: "matchPosts",       // ✅ 추가
  postId: docRef.id,              // ✅ 추가
  // 레거시 필드 유지 (호환성)
  refType: "match" as const,      // ✅ "market"에서 "match"로 수정
  refId: docRef.id,
  authorId: user.uid,
  // ... 기타 필드
  category: "match",
};
```

---

### 2️⃣ ActivityCard 라우팅 수정

**파일**: `src/features/activity/ActivityCard.tsx`

**위치**: `handleClick` 함수 (약 92줄)

**수정 코드**:

```typescript
const handleClick = (e?: React.MouseEvent) => {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  // 🔥 postId 추출 (우선순위: postId > refId > sourceId)
  const postId = (item as any).postId ?? item.refId ?? item.sourceId;
  
  if (!postId) {
    console.error("❌ [ActivityCard] postId가 없습니다:", item);
    alert("게시글 ID를 찾을 수 없습니다.");
    return;
  }

  // 🔥 sport 추출
  const sport = item.sport || "soccer";

  // 🔥 collection 기반 라우팅 (1순위)
  const collection = (item as any).collection;
  
  if (collection && postId) {
    console.log("🔥 [ActivityCard] collection 기반 라우팅:", {
      collection,
      postId,
      sport,
    });

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
      case "teams":
        navigate(`/sports/${sport}/team/${postId}`);
        return;
      case "eventPosts":
      case "events":
        navigate(`/sports/${sport}/event/${postId}`);
        return;
      default:
        console.warn("⚠️ [ActivityCard] 알 수 없는 collection:", collection);
        // 레거시 라우팅으로 fallback
        break;
    }
  }

  // 🔥 레거시 지원: type 기반 라우팅 (2순위, collection이 없을 때)
  console.log("🔥 [ActivityCard] type 기반 라우팅 (레거시):", {
    type: item.type,
    postId,
    sport,
  });

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

### 3️⃣ 기존 데이터 마이그레이션

**파일**: `scripts/migrateActivities.ts` (새로 생성)

```typescript
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

async function migrateActivities() {
  const activitiesRef = collection(db, "activities");
  const snapshot = await getDocs(activitiesRef);
  
  let updatedCount = 0;
  let skippedCount = 0;
  
  for (const activityDoc of snapshot.docs) {
    const data = activityDoc.data();
    
    // 이미 collection과 postId가 있으면 스킵
    if (data.collection && data.postId) {
      console.log(`⏭️ [Migration] 이미 마이그레이션됨: ${activityDoc.id}`);
      skippedCount++;
      continue;
    }
    
    const updates: any = {};
    
    // postId 추가 (refId가 있으면)
    if (!data.postId && data.refId) {
      updates.postId = data.refId;
    }
    
    // collection 추가 (type 기준)
    if (!data.collection) {
      let collectionName = "marketPosts"; // 기본값
      
      if (data.type === "equipment_created" || data.type === "market_created") {
        collectionName = "marketPosts";
      } else if (data.type === "recruit_created") {
        collectionName = "recruitPosts";
      } else if (data.type === "match_created") {
        collectionName = "matchPosts";
      } else if (data.type === "team_created") {
        collectionName = "teamPosts"; // 또는 "teams" (프로젝트에 맞게)
      } else if (data.type === "team_event") {
        collectionName = "eventPosts"; // 또는 "events" (프로젝트에 맞게)
      }
      
      updates.collection = collectionName;
    }
    
    // 업데이트할 필드가 있으면 실행
    if (Object.keys(updates).length > 0) {
      await updateDoc(doc(db, "activities", activityDoc.id), updates);
      console.log(`✅ [Migration] Activity ${activityDoc.id} 업데이트 완료:`, updates);
      updatedCount++;
    } else {
      console.log(`⚠️ [Migration] 업데이트할 필드 없음: ${activityDoc.id}`);
      skippedCount++;
    }
  }
  
  console.log(`✅ [Migration] 완료: ${updatedCount}개 업데이트, ${skippedCount}개 스킵`);
}

// 실행 (한 번만)
// migrateActivities().catch(console.error);
```

---

## 📋 작업 순서 (중요)

**반드시 이 순서대로 작업하세요:**

1. ✅ **Activity 생성 구조 수정** (EquipmentForm, RecruitForm, MatchForm)
2. ✅ **ActivityCard 라우팅 수정**
3. ✅ **기존 데이터 마이그레이션** (스크립트 실행)

**이 순서를 바꾸면 계속 꼬입니다.**

---

## 🔴 이 작업 안 하면 계속 생기는 증상

이 패턴이 계속 반복됩니다:

```
어떤 탭은 나오고
어떤 탭은 비고
라우팅도 가끔 깨짐
```

**해결 방법**: Activity 스키마를 먼저 고정해야 합니다.

---

## ✅ 수정 후 예상 결과

### 전체 탭 (`/activity?sport=soccer`)

```
공공공 (equipment_created, collection: "marketPosts")
야고 축구 FC (recruit_created, collection: "recruitPosts")
소홀 (team_created, collection: "teamPosts")
```

### 거래 탭

```
공공공 (equipment_created만)
```

### 팀 탭

```
야고 축구 FC (recruit_created)
소홀 (team_created)
```

### Activity 클릭

- `collection: "marketPosts"` → `/sports/soccer/market/:postId` ✅
- `collection: "recruitPosts"` → `/sports/soccer/recruit/:postId` ✅
- `collection: "matchPosts"` → `/sports/soccer/match/:postId` ✅

---

이 패치를 적용하면 **Activity 시스템이 완전히 안정화**됩니다.
