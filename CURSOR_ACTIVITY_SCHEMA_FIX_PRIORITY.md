# ✅ Cursor 개발자 수정 지시문 (필수: Activity 스키마 정상화 → Feed/라우팅 정리)

## 0) 목표

Activity 문서가 **반드시** 아래 2개 필드를 가지게 만들 것:

- `collection: "marketPosts" | "recruitPosts" | "matchPosts" | "teams" | "events"` (또는 프로젝트에서 쓰는 정확한 컬렉션명)
- `postId: string` (해당 게시글 doc id)

레거시 호환을 위해 `refType/refId`는 남겨도 되지만, **Feed/라우팅은 collection/postId를 1순위로 사용**하게 전환.

---

## 1) Activity 생성부 수정 (가장 먼저)

### 대상 파일

- `src/features/market/components/forms/EquipmentForm.tsx`
- `src/features/market/components/forms/RecruitForm.tsx`
- `src/features/market/components/forms/MatchForm.tsx`
- (추가로 team/event 생성하는 곳이 있으면 동일 적용)

### 수정 규칙

1. 게시글 생성 후 `docRef.id`를 얻으면, Activity 생성 payload에 아래를 반드시 포함
2. `postId = docRef.id`
3. `collection`은 "실제 저장된 게시글 컬렉션"을 정확히 넣기

---

### 예시 (EquipmentForm.tsx)

**파일**: `src/features/market/components/forms/EquipmentForm.tsx`

**위치**: 약 400줄 근처 (Activity 생성 부분)

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
  collection: "marketPosts",      // ✅ equipment는 marketPosts
  postId: docRef.id,              // ✅ 필수
  // 레거시 필드 유지 (호환성)
  refType: "market" as const,
  refId: docRef.id,
  authorId: user.uid,
  // ... 기타 필드
  category: "equipment",
};
```

---

### 예시 (RecruitForm.tsx)

**파일**: `src/features/market/components/forms/RecruitForm.tsx`

**위치**: 약 218줄 근처 (Activity 생성 부분)

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
  collection: "recruitPosts",     // ✅ recruit는 recruitPosts
  postId: docRef.id,              // ✅ 필수
  // 레거시 필드 유지 (호환성)
  refType: "recruit" as const,
  refId: docRef.id,
  authorId: user.uid,
  // ... 기타 필드
  category: "recruit",
};
```

---

### 예시 (MatchForm.tsx)

**파일**: `src/features/market/components/forms/MatchForm.tsx`

**위치**: 약 240줄 근처 (Activity 생성 부분)

**Before (현재)**:
```typescript
const activityDataRaw = {
  type: "match_created" as const,
  refType: "market" as const,  // ❌ 잘못됨 (match여야 함)
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
  collection: "matchPosts",        // ✅ match는 matchPosts
  postId: docRef.id,              // ✅ 필수
  // 레거시 필드 유지 (호환성)
  refType: "match" as const,      // ✅ "market"에서 "match"로 수정
  refId: docRef.id,
  authorId: user.uid,
  // ... 기타 필드
  category: "match",
};
```

---

**⚠️ 중요**: 지금 화면에서 "전체 탭이 텅 비는 현상"은 필터 문제가 아니라, activity 문서가 기대한 필드가 없어(Undefined) 이후 로직에서 걸러지거나 라우팅이 실패하는 케이스가 큼.

---

## 2) ActivityFeed 쿼리 조건 점검 (필터는 단순하게)

**파일**: `src/features/activity/ActivityFeed.tsx`

### 원칙

- `activeFilter === "all"`(전체) 일 때는 type 조건만 최소로:
  - `where("type", "!=", "system")` 정도만 (프로젝트 정책에 맞게)
- `sport` 필터는 **전체 탭에서도 적용할지/말지 UX 정책을 먼저 확정**

### 정책 선택

**정책 A (추천: 축구 페이지면 축구만 보여줌)**

```typescript
// 모든 탭에서 sport 필터 적용
if (sport) {
  activitiesConditions.push(where("sport", "==", sport.toLowerCase().trim()));
}
```

**정책 B (전체 탭은 모든 종목)**

```typescript
// 전체 탭이 아닐 때만 sport 필터 적용
if (sport && activeFilter !== "all" && activeFilter !== "전체") {
  activitiesConditions.push(where("sport", "==", sport.toLowerCase().trim()));
}
```

**👉 현재 프로젝트는 정책 A를 사용 중입니다. (`/activity?sport=soccer`는 축구 Activity 페이지이므로 모든 탭에서 sport 필터 적용)**

### 수정 코드

**위치**: `loadInitial` 함수 (약 85줄) 및 `loadMore` 함수 (약 310줄)

**현재 코드는 이미 올바르게 구현되어 있습니다**:

```typescript
// 🔥 탭별 필터 적용
if (activeFilter !== "all" && activeFilter !== "전체") {
  if (activeFilter === "market" || activeFilter === "거래") {
    activitiesConditions.push(where("type", "==", "equipment_created"));
  } else if (activeFilter === "team" || activeFilter === "팀") {
    activitiesConditions.push(where("type", "in", ["team_created", "recruit_created"]));
  } else if (activeFilter === "event" || activeFilter === "이벤트") {
    activitiesConditions.push(where("type", "==", "team_event"));
  }
} else {
  // 🔥 전체 탭: system 타입만 제외
  activitiesConditions.push(where("type", "!=", "system"));
}

// 🔥 sport 필터 추가 (모든 탭에서 적용 - 정책 A)
if (sport) {
  activitiesConditions.push(where("sport", "==", sport.toLowerCase().trim()));
}
```

**⚠️ 참고**: "공공공"이 진짜 soccer로 저장됐는지(activity.sport / 게시글 sport)부터 같이 확인해야 함.

---

## 3) ActivityCard 라우팅은 `collection/postId` 1순위로 고정

**파일**: `src/features/activity/ActivityCard.tsx`

**위치**: `handleClick` 함수 (약 92줄)

### 규칙

1. `collection && postId` 있으면 그걸로 라우트 생성
2. 없으면 레거시 `refType/refId`로 fallback

### 수정 코드

**Before (현재)**:
```typescript
const handleClick = (e?: React.MouseEvent) => {
  const postId = item.refId || item.sourceId;
  const sport = item.sport || "soccer";

  switch (item.type) {
    case "equipment_created":
      navigate(`/sports/${sport}/market/${postId}`);
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

  // 🔥 레거시 지원: type 기반 라우팅 (collection이 없을 때)
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

## 4) 이미 쌓인 기존 activity 마이그레이션(임시라도 꼭)

지금까지 생성된 activity 문서는 `collection/postId`가 없어서 계속 꼬임.

**간단한 마이그레이션 스크립트/일회성 Admin 페이지**로 보정:

### 규칙

- `postId = refId` (refId가 있으면)
- `collection`은 `type` 또는 `refType` 기준으로 채움
  - `equipment_created` → `marketPosts`
  - `recruit_created` → `recruitPosts`
  - `match_created` → `matchPosts`
  - `team_created` → `teamPosts` 또는 `teams`
  - `team_event` → `eventPosts` 또는 `events`

### 마이그레이션 스크립트

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

**⚠️ 주의**: 이 스크립트는 한 번만 실행하세요. 실행 전에 백업을 권장합니다.

---

## 5) 디버그 로그(필수)

### ActivityFeed에서 쿼리 조건/결과 count 로그

**파일**: `src/features/activity/ActivityFeed.tsx`

**위치**: `loadInitial` 함수 내부 (약 114줄 근처)

**추가 코드**:

```typescript
const snapshot = await getDocs(activitiesQuery);

// 🔥 디버그 로그 추가
console.log("🔥 [ActivityFeed] query results:", {
  queryConditions: activitiesConditions.map(c => {
    // where 조건을 문자열로 변환
    if (c.type === "where") {
      return `where(${c.fieldPath}, ${c.opStr}, ${c.value})`;
    }
    return c.toString();
  }),
  sportFilter: sport,
  typeFilter: activeFilter,
  resultCount: snapshot.size,
  activities: snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      type: data.type,
      sport: data.sport,
      collection: data.collection,
      postId: data.postId,
      refType: data.refType, // 레거시
      refId: data.refId,     // 레거시
      title: data.title,
    };
  }),
});
```

---

### ActivityCard 클릭 시 최종 path 로그

**파일**: `src/features/activity/ActivityCard.tsx`

**위치**: `handleClick` 함수 내부

**추가 코드** (이미 위 3)에서 포함됨):

```typescript
console.log("🔥 [ActivityCard] 클릭됨:", {
  type: item.type,
  sport: item.sport,
  collection: (item as any).collection,
  postId: (item as any).postId,
  refType: item.sourceType, // 레거시
  refId: item.refId,         // 레거시
  fullItem: item,
});

// 라우팅 전
console.log("✅ [ActivityCard] 최종 라우팅 경로:", finalPath);
```

---

## ✅ "안 꼬이게" 하는 결론

1. **필터부터 건드리지 말고 Activity 스키마를 먼저 고정(collection/postId)**
2. Feed/라우팅은 **collection/postId 기준**으로 단일화
3. 기존 데이터는 **마이그레이션**해서 "새 스키마"로 맞춰라

→ 이 순서 아니면 계속 "어떤 탭은 나오고 어떤 탭은 비고, 라우터가 바뀐 것처럼 보이는" 증상이 반복됨.

---

## 📋 작업 체크리스트

### 1. Activity 생성 코드 수정 (가장 먼저)

- [ ] `EquipmentForm.tsx`: `collection: "marketPosts"`, `postId` 추가
- [ ] `RecruitForm.tsx`: `collection: "recruitPosts"`, `postId` 추가
- [ ] `MatchForm.tsx`: `collection: "matchPosts"`, `postId` 추가, `refType: "match"` 수정

### 2. ActivityCard 라우팅 수정

- [ ] `collection` 기반 라우팅 구현 (1순위)
- [ ] 레거시 `type` 기반 라우팅 지원 (fallback)
- [ ] 디버그 로그 추가

### 3. 기존 데이터 마이그레이션

- [ ] 마이그레이션 스크립트 작성
- [ ] 실행 및 결과 확인

### 4. 디버그 로그 추가

- [ ] ActivityFeed 쿼리 결과 로그
- [ ] ActivityCard 클릭 로그

---

**이 순서대로 작업하면 Activity 시스템이 완전히 안정화됩니다.**
