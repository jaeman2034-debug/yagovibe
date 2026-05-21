# YAGO Activity 시스템 완전 안정화 - ActivityFactory 패턴

## 🎯 목표

Activity 생성 로직을 **중앙화**하여 앞으로 문제 90%를 방지합니다.

---

## 🔥 문제 원인

현재 Activity 생성 로직이 여러 곳에 분산되어 있습니다:

- `RecruitForm.tsx`
- `RecruitCreatePage.tsx`
- `EquipmentForm.tsx`
- `MatchForm.tsx`
- `TeamCreate.tsx` (예상)

**결과**: 각 파일마다 refType을 다르게 설정하여 일관성 없는 데이터 생성

---

## ✅ 해결책: ActivityFactory 패턴

**중앙화된 Activity 생성 함수**를 만들어 모든 Activity 생성이 일관되게 처리되도록 합니다.

---

## 📁 파일 구조

```
src/
└── services/
    └── activity/
        └── activityFactory.ts  (새로 생성)
```

---

## 🔧 ActivityFactory 구현

### 파일: `src/services/activity/activityFactory.ts`

```typescript
/**
 * 🔥 ActivityFactory - Activity 생성 중앙화
 * 
 * 역할:
 * - 모든 Activity 생성 로직 통합
 * - refType 자동 매핑
 * - 일관된 데이터 구조 보장
 */

import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cleanFirestoreData } from "@/utils/firestoreHelpers";
import type { ActivityType, ActivityRefType } from "@/types/activity";

/**
 * Activity 생성 파라미터
 */
interface CreateActivityParams {
  type: ActivityType;
  refId: string;
  authorId: string;
  title: string;
  summary?: string;
  thumbnailUrl?: string;
  sport?: string;
  teamId?: string;
  category?: string;
}

/**
 * type → refType 자동 매핑
 */
function getRefType(type: ActivityType): ActivityRefType {
  switch (type) {
    // 거래 관련
    case "equipment_created":
    case "market_created":
      return "market";
    
    // 팀 관련
    case "recruit_created":
    case "team_created":
      return "teams";
    
    // 이벤트 관련
    case "team_event":
      return "events";
    
    // 공지
    case "team_notice":
      return "notices";
    
    default:
      console.warn(`⚠️ [ActivityFactory] 알 수 없는 type: ${type}, "market"으로 처리`);
      return "market";
  }
}

/**
 * 🔥 Activity 생성 (통합 함수)
 */
export async function createActivity(params: CreateActivityParams): Promise<string> {
  try {
    const { type, refId, authorId, title, summary, thumbnailUrl, sport, teamId, category } = params;

    // 🔥 refType 자동 매핑
    const refType = getRefType(type);

    // 🔥 Activity 데이터 구성
    const activityDataRaw = {
      // v1 스키마 필수 필드
      type,
      refType,
      refId,
      authorId,
      title: title.trim(),
      summary: summary?.trim() || undefined,
      thumbnailUrl: thumbnailUrl || undefined,
      visibility: "public" as const,
      likeCount: 0,
      commentCount: 0,
      createdAt: serverTimestamp(),
      
      // 호환성 필드
      sport: sport?.toLowerCase().trim() || "soccer",
      teamId: teamId || undefined,
      category: category || undefined,
    };

    // 🔥 undefined 값 제거
    const activityData = cleanFirestoreData(activityDataRaw);

    // 🔥 Firestore에 저장
    const activityRef = await addDoc(collection(db, "activities"), activityData);

    console.log("✅ [ActivityFactory] Activity 생성 완료:", {
      activityId: activityRef.id,
      type,
      refType,
      refId,
      sport,
    });

    return activityRef.id;
  } catch (error: any) {
    console.error("❌ [ActivityFactory] Activity 생성 실패:", {
      error,
      code: error?.code,
      message: error?.message,
      params,
    });
    throw error;
  }
}

/**
 * 🔥 팀 모집 Activity 생성
 */
export async function createTeamRecruitActivity(params: {
  recruitId: string;
  authorId: string;
  teamId?: string;
  teamName: string;
  position: string[];
  slots: number;
  description?: string;
  thumbnailUrl?: string;
  sport: string;
}): Promise<string> {
  const { recruitId, authorId, teamName, position, slots, description, thumbnailUrl, sport, teamId } = params;

  return createActivity({
    type: "recruit_created",
    refId: recruitId,
    authorId,
    title: `${teamName} - ${position.join(", ")} 모집`,
    summary: description?.trim() || `모집 인원: ${slots}명`,
    thumbnailUrl,
    sport,
    teamId,
    category: "recruit",
  });
}

/**
 * 🔥 장비 거래 Activity 생성
 */
export async function createEquipmentActivity(params: {
  postId: string;
  authorId: string;
  title: string;
  description?: string;
  price?: number;
  thumbnailUrl?: string;
  sport: string;
}): Promise<string> {
  const { postId, authorId, title, description, price, thumbnailUrl, sport } = params;

  return createActivity({
    type: "equipment_created",
    refId: postId,
    authorId,
    title: title.trim(),
    summary: description?.trim() || (price ? `${Number(price).toLocaleString()}원` : undefined),
    thumbnailUrl,
    sport,
    category: "equipment",
  });
}

/**
 * 🔥 경기 매칭 Activity 생성
 */
export async function createMatchActivity(params: {
  postId: string;
  authorId: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  sport: string;
}): Promise<string> {
  const { postId, authorId, title, description, thumbnailUrl, sport } = params;

  return createActivity({
    type: "match_created",
    refId: postId,
    authorId,
    title: title.trim(),
    summary: description?.trim() || undefined,
    thumbnailUrl,
    sport,
    category: "match",
  });
}

/**
 * 🔥 팀 생성 Activity 생성
 */
export async function createTeamActivity(params: {
  teamId: string;
  authorId: string;
  teamName: string;
  sport: string;
  thumbnailUrl?: string;
}): Promise<string> {
  const { teamId, authorId, teamName, sport, thumbnailUrl } = params;

  return createActivity({
    type: "team_created",
    refId: teamId,
    authorId,
    title: `${teamName} 팀이 생성되었습니다`,
    summary: `새로운 ${sport} 팀이 생성되었습니다`,
    thumbnailUrl,
    sport,
    teamId,
  });
}

/**
 * 🔥 팀 이벤트 Activity 생성
 */
export async function createTeamEventActivity(params: {
  eventId: string;
  authorId: string;
  teamId: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  sport: string;
}): Promise<string> {
  const { eventId, authorId, teamId, title, description, thumbnailUrl, sport } = params;

  return createActivity({
    type: "team_event",
    refId: eventId,
    authorId,
    title: title.trim(),
    summary: description?.trim() || undefined,
    thumbnailUrl,
    sport,
    teamId,
  });
}
```

---

## 📝 기존 코드 수정

### 1. RecruitForm.tsx 수정

**기존 코드 (221-238줄)**:
```typescript
const activityDataRaw = {
  type: "recruit_created" as const,
  refType: "recruit" as const,  // ❌
  // ...
};
const activityRef = await addDoc(collection(db, "activities"), activityData);
```

**수정 코드**:
```typescript
import { createTeamRecruitActivity } from "@/services/activity/activityFactory";

// Activity 생성
try {
  await createTeamRecruitActivity({
    recruitId: docRef.id,
    authorId: user.uid,
    teamId: undefined, // 필요시 추가
    teamName: title.trim(),
    position: selectedPositions,
    slots: Number(people),
    description: description.trim(),
    thumbnailUrl: imageUrls[0],
    sport: sport?.toLowerCase().trim() || "soccer",
  });
} catch (err: any) {
  console.error("❌ [RecruitForm] activities 생성 실패:", err);
  // activities 실패해도 업로드는 성공으로 처리
}
```

---

### 2. RecruitCreatePage.tsx 수정

**기존 코드 (165-183줄)**:
```typescript
const activityData = {
  type: "recruit_created" as ActivityType,
  refType: "recruit" as const,  // ❌
  // ...
};
await addDoc(collection(db, "activities"), activityData);
```

**수정 코드**:
```typescript
import { createTeamRecruitActivity } from "@/services/activity/activityFactory";

// Activity 생성
try {
  await createTeamRecruitActivity({
    recruitId,
    authorId: auth.currentUser.uid,
    teamId,
    teamName: teamName || "팀",
    position,
    slots: Number(slots),
    description: description?.trim(),
    thumbnailUrl: undefined, // 필요시 추가
    sport: teamSportType || "soccer",
  });
} catch (err) {
  console.warn("⚠️ [RecruitCreatePage] activity 생성 실패 (무시):", err);
}
```

---

### 3. EquipmentForm.tsx 수정

**기존 코드 (400-420줄)**:
```typescript
const activityDataRaw = {
  type: "equipment_created" as const,
  refType: "market" as const,
  // ...
};
const activityRef = await addDoc(collection(db, "activities"), activityData);
```

**수정 코드**:
```typescript
import { createEquipmentActivity } from "@/services/activity/activityFactory";

// Activity 생성
try {
  await createEquipmentActivity({
    postId: docRef.id,
    authorId: user.uid,
    title: title.trim(),
    description: description?.trim(),
    price: Number(price),
    thumbnailUrl: imageUrls[0],
    sport: sport?.toLowerCase().trim() || "soccer",
  });
} catch (err: any) {
  console.error("❌ [EquipmentForm] activities 생성 실패:", err);
  // activities 실패해도 업로드는 성공으로 처리
}
```

---

### 4. MatchForm.tsx 수정

**기존 코드 (240-260줄)**:
```typescript
const activityDataRaw = {
  type: "match_created" as const,
  refType: "market" as const,
  // ...
};
const activityRef = await addDoc(collection(db, "activities"), activityData);
```

**수정 코드**:
```typescript
import { createMatchActivity } from "@/services/activity/activityFactory";

// Activity 생성
try {
  await createMatchActivity({
    postId: docRef.id,
    authorId: user.uid,
    title: title.trim(),
    description: description?.trim(),
    thumbnailUrl: imageUrls[0],
    sport: sport?.toLowerCase().trim() || "soccer",
  });
} catch (err: any) {
  console.error("❌ [MatchForm] activities 생성 실패:", err);
  // activities 실패해도 업로드는 성공으로 처리
}
```

---

## 🎯 ActivityFactory 장점

### 1. 일관성 보장
- 모든 Activity가 동일한 구조로 생성
- refType 자동 매핑으로 실수 방지

### 2. 유지보수 용이
- Activity 생성 로직이 한 곳에 집중
- 수정 시 한 파일만 변경

### 3. 확장성
- 새로운 Activity 타입 추가 시 Factory에만 추가
- 기존 코드 변경 최소화

### 4. 테스트 용이
- Factory 함수만 테스트하면 됨
- 각 폼 컴포넌트는 Factory 호출만 확인

---

## 📋 수정 체크리스트

### ActivityFactory 생성
- [ ] `src/services/activity/activityFactory.ts` 생성
- [ ] `createActivity` 통합 함수 구현
- [ ] `getRefType` 매핑 함수 구현
- [ ] 타입별 생성 함수 구현

### 기존 코드 수정
- [ ] `RecruitForm.tsx` 수정
- [ ] `RecruitCreatePage.tsx` 수정
- [ ] `EquipmentForm.tsx` 수정
- [ ] `MatchForm.tsx` 수정

### 테스트
- [ ] 팀 모집 Activity 생성 시 `refType: "teams"` 확인
- [ ] 장비 거래 Activity 생성 시 `refType: "market"` 확인
- [ ] 경기 매칭 Activity 생성 시 `refType: "market"` 확인
- [ ] ActivityFeed 필터 정상 작동 확인

---

## 🔥 최종 목표

**Activity 시스템이 앞으로 절대 안 깨지는 구조**를 만듭니다.

- ✅ 중앙화된 Activity 생성
- ✅ 자동 refType 매핑
- ✅ 일관된 데이터 구조
- ✅ 유지보수 용이

---

이 지시문을 따라 작업하면 Activity 시스템이 완전히 안정화됩니다.
