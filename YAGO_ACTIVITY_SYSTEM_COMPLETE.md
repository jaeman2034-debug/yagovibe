# 🔥 YAGO VIBE – Activity 시스템 완성 구조 (버그 0 구조)

## 📋 목표
Activity 시스템을 완전히 안정화하여 버그 없이 확장 가능한 구조로 만듭니다.

### 핵심 원칙
- ✅ **단일 소스 원칙**: `activities` 컬렉션만 사용
- ✅ **일관된 타입 구조**: `type` + `refType` + `refId` 패턴
- ✅ **자동 생성**: ActivityFactory를 통한 일관된 생성
- ✅ **쿼리 최적화**: 인덱스 기반 효율적 쿼리

---

## 1️⃣ Activity 시스템 아키텍처

### 핵심 구조
```
원본 문서 생성 (teams, market, recruitPosts 등)
    ↓
ActivityFactory.createXXXActivity()
    ↓
activities 컬렉션에 Activity 문서 생성
    ↓
ActivityFeed에서 조회 및 표시
```

### 단일 소스 원칙
- **Community Feed는 `activities` 컬렉션만 조회**
- `activityLogs` 컬렉션 사용 금지 (레거시)
- 모든 피드는 `activities`에서 조회

---

## 2️⃣ Activity 타입 시스템

### ActivityType 정의
```typescript
export type ActivityType =
  | "team_created"      // 팀 생성
  | "team_notice"       // 팀 공지
  | "team_event"        // 팀 이벤트
  | "team_recruit"      // 팀 모집
  | "market_created"    // 거래 글 생성 (레거시 호환)
  | "equipment_created" // 장비 거래 생성
  | "recruit_created"   // 모집 생성 (레거시 호환)
  | "match_created";    // 경기 매칭 생성
```

### ActivityRefType 정의
```typescript
export type ActivityRefType =
  | "teams"      // 팀 관련
  | "notices"    // 공지 관련
  | "events"     // 이벤트 관련
  | "market"     // 거래 관련
  | "recruit"    // 모집 관련 (선택사항: "teams"로 통일 가능)
  | "match";     // 경기 매칭 관련 (선택사항: "teams"로 통일 가능)
```

### 타입 매핑 규칙
```typescript
// type → refType 자동 매핑
function getRefType(type: ActivityType): ActivityRefType {
  switch (type) {
    case "team_created":
    case "team_notice":
    case "team_event":
    case "team_recruit":
      return "teams";
    case "market_created":
    case "equipment_created":
      return "market";
    case "recruit_created":
      return "teams"; // 모집은 팀 관련
    case "match_created":
      return "match";
    default:
      return "market"; // 기본값
  }
}
```

---

## 3️⃣ ActivityFactory 패턴

### 목적
- Activity 생성 로직 중앙화
- 일관된 데이터 구조 보장
- 타입 안정성 확보

### 파일 위치
```
src/services/activity/activityFactory.ts
```

### 기본 구조
```typescript
interface BaseActivityInput {
  refId: string;                  // 참조 문서 ID
  authorId: string;               // 작성자 UID
  title: string;                  // 제목
  summary?: string;               // 요약
  thumbnailUrl?: string;          // 썸네일 이미지 URL
  sport?: string;                 // 종목
  category?: string;              // 카테고리
  teamId?: string;                // 팀 ID (팀 관련인 경우)
}

async function createActivity(
  type: ActivityType,
  data: BaseActivityInput
): Promise<string> {
  const refType = getRefType(type);
  
  const activityData: CreateActivityData = {
    type,
    refType,
    refId: data.refId,
    authorId: data.authorId,
    title: data.title,
    summary: data.summary,
    thumbnailUrl: data.thumbnailUrl,
    visibility: "public",
    sport: data.sport?.toLowerCase().trim() || "soccer",
    category: data.category,
    teamId: data.teamId,
    likeCount: 0,
    commentCount: 0,
    createdAt: serverTimestamp(),
  };
  
  const docRef = await addDoc(collection(db, "activities"), activityData);
  return docRef.id;
}
```

### 특화 함수들
```typescript
// 팀 생성 Activity
export async function createTeamCreatedActivity(
  data: BaseActivityInput & { type: "team_created" }
): Promise<string> {
  return createActivity("team_created", { ...data, refType: "teams" });
}

// 팀 모집 Activity
export async function createTeamRecruitActivity(
  data: BaseActivityInput & { type: "recruit_created" }
): Promise<string> {
  return createActivity("recruit_created", { ...data, refType: "teams" });
}

// 거래 글 Activity
export async function createMarketActivity(
  data: BaseActivityInput & { type: "equipment_created" }
): Promise<string> {
  return createActivity("equipment_created", { ...data, refType: "market" });
}

// 경기 매칭 Activity
export async function createMatchActivity(
  data: BaseActivityInput & { type: "match_created" }
): Promise<string> {
  return createActivity("match_created", { ...data, refType: "match" });
}
```

---

## 4️⃣ Activity 생성 규칙

### 규칙 1: 원본 문서 생성 후 즉시 Activity 생성
```typescript
// ✅ 올바른 패턴
const postRef = await addDoc(collection(db, "marketPosts"), postData);
await createMarketActivity({
  refId: postRef.id,
  authorId: userId,
  title: title,
  sport: "soccer",
  type: "equipment_created",
});

// ❌ 잘못된 패턴 (Activity 생성 누락)
const postRef = await addDoc(collection(db, "marketPosts"), postData);
// Activity 생성 없음
```

### 규칙 2: refType은 항상 getRefType()으로 결정
```typescript
// ✅ 올바른 패턴
const refType = getRefType("team_created"); // "teams"

// ❌ 잘못된 패턴 (하드코딩)
const refType = "team"; // 잘못된 값
```

### 규칙 3: sport 값은 항상 영문 코드로 저장
```typescript
// ✅ 올바른 패턴
sport: "soccer"

// ❌ 잘못된 패턴
sport: "축구"
```

### 규칙 4: visibility는 기본값 "public" 사용
```typescript
// ✅ 올바른 패턴
visibility: "public"

// ❌ 잘못된 패턴 (기본값 없음)
// visibility 필드 누락
```

---

## 5️⃣ ActivityFeed 쿼리 구조

### 기본 쿼리 (전체 피드)
```typescript
const activitiesQuery = query(
  collection(db, "activities"),
  where("visibility", "==", "public"),
  orderBy("createdAt", "desc"),
  limit(20)
);
```

### 스포츠 필터 쿼리
```typescript
const activitiesQuery = query(
  collection(db, "activities"),
  where("visibility", "==", "public"),
  where("sport", "==", "soccer"),
  orderBy("createdAt", "desc"),
  limit(20)
);
```

### refType 필터 쿼리 (탭 필터)
```typescript
// 거래 탭
const activitiesQuery = query(
  collection(db, "activities"),
  where("visibility", "==", "public"),
  where("refType", "==", "market"),
  orderBy("createdAt", "desc"),
  limit(20)
);

// 팀 탭
const activitiesQuery = query(
  collection(db, "activities"),
  where("visibility", "==", "public"),
  where("refType", "==", "teams"),
  orderBy("createdAt", "desc"),
  limit(20)
);
```

### 클라이언트 필터링 (보조)
```typescript
// 서버 쿼리로 가져온 데이터를 클라이언트에서 추가 필터링
const filteredActivities = activities
  .filter(activity => activity.type !== "system") // system 타입 제외
  .filter(activity => {
    // 추가 필터링 로직
    if (activeFilter === "team") {
      return activity.refType === "teams" || 
             activity.type === "team_created" ||
             activity.type === "recruit_created";
    }
    return true;
  });
```

---

## 6️⃣ ActivityCard 라우팅 구조

### 라우팅 우선순위
1. **refType + refId** (1순위)
2. **type + refId** (2순위, 레거시 호환)

### 라우팅 로직
```typescript
const handleClick = () => {
  const refId = activity.refId;
  const refType = activity.refType;
  const sport = activity.sport || "soccer";
  
  // 1순위: refType 기반 라우팅
  switch (refType) {
    case "market":
      navigate(`/sports/${sport}/market/${refId}`);
      return;
    case "teams":
      navigate(`/teams/${refId}`);
      return;
    case "events":
      navigate(`/events/${refId}`);
      return;
    default:
      break;
  }
  
  // 2순위: type 기반 라우팅 (레거시 호환)
  switch (activity.type) {
    case "equipment_created":
      navigate(`/sports/${sport}/market/${refId}`);
      return;
    case "recruit_created":
      navigate(`/sports/${sport}/recruit/${refId}`);
      return;
    case "match_created":
      navigate(`/sports/${sport}/match/${refId}`);
      return;
    default:
      navigate(`/sports/${sport}/market/${refId}`); // 기본값
  }
};
```

---

## 7️⃣ Activity 필터링 구조

### 탭별 필터 규칙

#### 전체 탭
```typescript
// 모든 public Activity 표시 (system 제외)
activities.filter(activity => 
  activity.visibility === "public" && 
  activity.type !== "system"
);
```

#### 거래 탭
```typescript
// refType이 "market"인 Activity만 표시
activities.filter(activity => 
  activity.refType === "market"
);
```

#### 팀 탭
```typescript
// refType이 "teams"이거나 team 관련 type인 Activity 표시
activities.filter(activity => 
  activity.refType === "teams" ||
  activity.type === "team_created" ||
  activity.type === "recruit_created" ||
  activity.type?.includes("team")
);
```

#### 이벤트 탭
```typescript
// refType이 "events"인 Activity만 표시
activities.filter(activity => 
  activity.refType === "events"
);
```

---

## 8️⃣ Activity 생성 위치

### 팀 생성 시
**파일**: `src/pages/team/TeamCreateForm.tsx` 또는 팀 생성 로직

```typescript
import { createTeamCreatedActivity } from "@/services/activity/activityFactory";

// 팀 생성 후
await createTeamCreatedActivity({
  refId: teamId,
  authorId: userId,
  teamId: teamId,
  title: `${teamName} 팀이 생성되었습니다`,
  sport: "soccer",
  type: "team_created",
});
```

### 거래 글 작성 시
**파일**: `src/features/market/components/forms/EquipmentForm.tsx`

```typescript
import { createMarketActivity } from "@/services/activity/activityFactory";

// 거래 글 생성 후
await createMarketActivity({
  refId: docRef.id,
  authorId: userId,
  title: title,
  summary: description,
  thumbnailUrl: imageUrls[0],
  sport: "soccer",
  category: "equipment",
  type: "equipment_created",
});
```

### 모집 글 작성 시
**파일**: `src/features/market/components/forms/RecruitForm.tsx`

```typescript
import { createTeamRecruitActivity } from "@/services/activity/activityFactory";

// 모집 글 생성 후
await createTeamRecruitActivity({
  refId: docRef.id,
  authorId: userId,
  teamId: teamId,
  title: `${teamName} - ${position.join(", ")} 모집`,
  summary: `모집 인원: ${slots}명`,
  sport: "soccer",
  type: "recruit_created",
});
```

### 경기 매칭 작성 시
**파일**: `src/features/market/components/forms/MatchForm.tsx`

```typescript
import { createMatchActivity } from "@/services/activity/activityFactory";

// 경기 매칭 생성 후
await createMatchActivity({
  refId: docRef.id,
  authorId: userId,
  teamId: teamId,
  title: `${teamName} - 경기 매칭`,
  summary: `${date} ${time}`,
  sport: "soccer",
  type: "match_created",
});
```

---

## 9️⃣ Activity 삭제 규칙

### 원본 문서 삭제 시 Activity도 삭제
```typescript
// 거래 글 삭제 시
async function deleteMarketPost(postId: string) {
  // 1. 원본 문서 삭제
  await deleteDoc(doc(db, "marketPosts", postId));
  
  // 2. 관련 Activity 삭제
  const activitiesQuery = query(
    collection(db, "activities"),
    where("refType", "==", "market"),
    where("refId", "==", postId)
  );
  const activitiesSnap = await getDocs(activitiesQuery);
  activitiesSnap.forEach(async (activityDoc) => {
    await deleteDoc(activityDoc.ref);
  });
}
```

### 하드 삭제 vs 소프트 삭제
- **하드 삭제**: 문서 완전 삭제 (권장)
- **소프트 삭제**: `status: "deleted"` 필드 추가 (선택사항)

---

## 🔟 Activity 업데이트 규칙

### 원본 문서 수정 시 Activity 업데이트
```typescript
// 거래 글 수정 시
async function updateMarketPost(postId: string, updates: any) {
  // 1. 원본 문서 수정
  await updateDoc(doc(db, "marketPosts", postId), updates);
  
  // 2. 관련 Activity 업데이트
  const activitiesQuery = query(
    collection(db, "activities"),
    where("refType", "==", "market"),
    where("refId", "==", postId)
  );
  const activitiesSnap = await getDocs(activitiesQuery);
  activitiesSnap.forEach(async (activityDoc) => {
    await updateDoc(activityDoc.ref, {
      title: updates.title || activityDoc.data().title,
      summary: updates.description || activityDoc.data().summary,
      updatedAt: serverTimestamp(),
    });
  });
}
```

---

## 1️⃣1️⃣ Activity 통계 관리

### likeCount 관리
```typescript
// 좋아요 추가 시
await updateDoc(activityRef, {
  likeCount: increment(1),
});

// 좋아요 취소 시
await updateDoc(activityRef, {
  likeCount: increment(-1),
});
```

### commentCount 관리
```typescript
// 댓글 추가 시
await updateDoc(activityRef, {
  commentCount: increment(1),
});

// 댓글 삭제 시
await updateDoc(activityRef, {
  commentCount: increment(-1),
});
```

---

## 1️⃣2️⃣ Activity 쿼리 최적화

### 인덱스 기반 쿼리
```typescript
// ✅ 올바른 패턴 (인덱스 사용)
query(
  collection(db, "activities"),
  where("visibility", "==", "public"),
  where("sport", "==", "soccer"),
  orderBy("createdAt", "desc"),
  limit(20)
)

// ❌ 잘못된 패턴 (인덱스 없음)
query(
  collection(db, "activities"),
  where("type", "==", "team_created"),
  where("sport", "==", "soccer"),
  orderBy("createdAt", "desc")
)
```

### 클라이언트 필터링 전략
```typescript
// 1. 서버에서 기본 필터링 (인덱스 활용)
const baseQuery = query(
  collection(db, "activities"),
  where("visibility", "==", "public"),
  where("sport", "==", "soccer"),
  orderBy("createdAt", "desc"),
  limit(30) // 여유있게 가져오기
);

// 2. 클라이언트에서 추가 필터링 (type, refType 등)
const filtered = activities
  .filter(activity => activity.type !== "system")
  .filter(activity => {
    if (activeFilter === "team") {
      return activity.refType === "teams";
    }
    return true;
  })
  .slice(0, 20); // 최종 20개만 표시
```

---

## 1️⃣3️⃣ Activity 데이터 검증

### 생성 시 검증
```typescript
function validateActivityData(data: CreateActivityData): void {
  // 필수 필드 검증
  if (!data.type) throw new Error("Activity type is required");
  if (!data.refType) throw new Error("Activity refType is required");
  if (!data.refId) throw new Error("Activity refId is required");
  if (!data.authorId) throw new Error("Activity authorId is required");
  if (!data.title) throw new Error("Activity title is required");
  
  // 타입 검증
  const validTypes: ActivityType[] = [
    "team_created", "team_notice", "team_event",
    "market_created", "equipment_created",
    "recruit_created", "match_created"
  ];
  if (!validTypes.includes(data.type)) {
    throw new Error(`Invalid activity type: ${data.type}`);
  }
  
  // refType 검증
  const validRefTypes: ActivityRefType[] = [
    "teams", "notices", "events", "market", "recruit", "match"
  ];
  if (!validRefTypes.includes(data.refType)) {
    throw new Error(`Invalid activity refType: ${data.refType}`);
  }
}
```

---

## 1️⃣4️⃣ Activity 마이그레이션

### 기존 activityLogs → activities 마이그레이션
```typescript
async function migrateActivityLogs() {
  const activityLogsSnap = await getDocs(collection(db, "activityLogs"));
  
  for (const logDoc of activityLogsSnap.docs) {
    const logData = logDoc.data();
    
    // activityLogs → activities 변환
    const activityData: CreateActivityData = {
      type: logData.type as ActivityType,
      refType: getRefType(logData.type),
      refId: logData.sourceId || logData.refId,
      authorId: logData.authorId || logData.uid,
      title: logData.title,
      summary: logData.summary,
      thumbnailUrl: logData.thumbnail || logData.thumbnailUrl,
      visibility: "public",
      sport: logData.sport?.toLowerCase().trim() || "soccer",
      likeCount: 0,
      commentCount: 0,
      createdAt: logData.createdAt || serverTimestamp(),
    };
    
    await addDoc(collection(db, "activities"), activityData);
  }
}
```

---

## ✅ Activity 시스템 완성 체크리스트

### 필수 작업
- [ ] ActivityFactory 생성 및 적용
- [ ] 모든 Activity 생성 위치에서 ActivityFactory 사용
- [ ] Activity type 표준 적용
- [ ] Activity refType 표준 적용
- [ ] ActivityFeed 쿼리 최적화
- [ ] ActivityCard 라우팅 구조 적용
- [ ] Firestore Index 생성 및 배포
- [ ] Activity 삭제 규칙 적용
- [ ] Activity 업데이트 규칙 적용

### 선택 작업
- [ ] Activity 통계 관리 (likeCount, commentCount)
- [ ] Activity 데이터 검증 로직 추가
- [ ] 기존 activityLogs 마이그레이션

---

## 📝 참고 사항

### Activity 생성 타이밍
- **즉시 생성**: 원본 문서 생성 직후
- **트랜잭션 사용**: 원본 문서와 Activity를 동시에 생성 (선택사항)

### Activity 중복 방지
- 같은 `refId`에 대한 Activity는 1개만 유지
- 업데이트 시 기존 Activity 수정, 새로 생성하지 않음

### Activity 가시성
- 기본값: `"public"` (커뮤니티 피드 표시)
- 팀 전용: `"team"` (팀 피드만 표시)
- 비공개: `"private"` (작성자만 표시)

---

## 🔗 관련 파일

- ActivityFactory: `src/services/activity/activityFactory.ts`
- Activity 타입: `src/types/activity.ts`
- ActivityFeed: `src/features/activity/ActivityFeed.tsx`
- ActivityCard: `src/features/activity/ActivityCard.tsx`
- Firestore Rules: `firestore.rules`
- Firestore Indexes: `firestore.indexes.json`

---

**작성일**: 2024년
**버전**: 1.0
**상태**: Activity 시스템 완성 구조 (버그 0 구조)
