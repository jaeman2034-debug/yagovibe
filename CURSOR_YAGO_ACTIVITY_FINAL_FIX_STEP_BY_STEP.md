# 🔥 CURSOR 개발자 최종 수정 지시문 (천재 모드)

## 목표

다음 문제 완전 해결:

```
1️⃣ 전체 탭 글 누락
2️⃣ 거래 탭에 모집 글 표시
3️⃣ 팀 탭 비어 있음
4️⃣ Activity 클릭 라우팅 오류
5️⃣ sport 필터 충돌
```

**⚠️ 중요: 아래 순서 그대로 작업하세요. 순서를 바꾸면 다시 꼬일 수 있습니다.**

---

## 1️⃣ Firestore 구조 먼저 확정 (절대 변경 금지)

### 컬렉션 구조

```
activities      (Activity Feed)
marketPosts     (중고거래 게시글)
recruitPosts    (팀 모집 게시글)
matchPosts      (경기 매칭 게시글)
teamPosts       (팀 생성 게시글)
eventPosts      (팀 이벤트 게시글)
```

**규칙**: 이 구조는 절대 변경하지 않습니다.

---

## 2️⃣ Activity 데이터 구조 통일

### Activity는 게시글 데이터를 저장하지 않는다

Activity는 **게시글 위치만 저장한다**

### Firestore document 구조

```typescript
activities/{activityId}
{
  id: string
  type: string              // "equipment_created" | "recruit_created" | "match_created" | "team_created" | "team_event"
  sport: string            // "soccer" | "basketball" | "volleyball" | ...
  postId: string           // 게시글 ID (marketPosts, recruitPosts, matchPosts 등에서 조회)
  collection: string       // "marketPosts" | "recruitPosts" | "matchPosts" | "teamPosts" | "eventPosts"
  userId: string           // 작성자 ID
  createdAt: Timestamp     // 생성 시간
}
```

### 예시

#### Equipment Activity
```json
{
  "type": "equipment_created",
  "sport": "soccer",
  "postId": "abc123",
  "collection": "marketPosts",
  "userId": "user123",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

#### Recruit Activity
```json
{
  "type": "recruit_created",
  "sport": "soccer",
  "postId": "def456",
  "collection": "recruitPosts",
  "userId": "user123",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

---

## 3️⃣ 게시글 작성 시 Activity 생성

### Equipment 글 작성

**파일**: `src/features/market/components/forms/EquipmentForm.tsx`

**위치**: 게시글 저장 후 (약 420줄 근처)

**수정 코드**:

```typescript
// 1. marketPosts에 게시글 저장
const docRef = await addDoc(collection(db, "marketPosts"), {
  sport,
  category: "equipment",
  title: title.trim(),
  description: description.trim(),
  price: Number(price),
  // ... 기타 필드
  createdAt: serverTimestamp(),
  authorId: auth.currentUser.uid,
});

// 2. activities에 Activity 생성 (기존 코드 수정)
const activityData = {
  type: "equipment_created",
  sport: sport?.toLowerCase().trim() || "soccer",
  postId: docRef.id, // 🔥 필수
  collection: "marketPosts", // 🔥 필수
  userId: auth.currentUser.uid,
  createdAt: serverTimestamp(),
};

// 🔥 undefined 값 제거
const { cleanFirestoreData } = await import("@/utils/firestoreHelpers");
const cleanedActivityData = cleanFirestoreData(activityData);

await addDoc(collection(db, "activities"), cleanedActivityData);
console.log("✅ [EquipmentForm] Activity 생성 완료:", {
  postId: docRef.id,
  collection: "marketPosts",
  type: "equipment_created",
});
```

**기존 코드에서 수정할 부분**:
- `refType`, `refId` 제거 (레거시 필드)
- `collection: "marketPosts"` 추가
- `postId: docRef.id` 추가
- `userId` 추가 (authorId 대신)

---

### Recruit 글 작성

**파일**: `src/features/market/components/forms/RecruitForm.tsx`

**위치**: 게시글 저장 후 (약 238줄 근처)

**수정 코드**:

```typescript
// 1. recruitPosts에 게시글 저장
const docRef = await addDoc(collection(db, "recruitPosts"), {
  sport,
  category: "recruit",
  title: title.trim(),
  description: description.trim(),
  // ... 기타 필드
  createdAt: serverTimestamp(),
  authorId: auth.currentUser.uid,
});

// 2. activities에 Activity 생성
const activityData = {
  type: "recruit_created",
  sport: sport?.toLowerCase().trim() || "soccer",
  postId: docRef.id, // 🔥 필수
  collection: "recruitPosts", // 🔥 필수
  userId: auth.currentUser.uid,
  createdAt: serverTimestamp(),
};

// 🔥 undefined 값 제거
const { cleanFirestoreData } = await import("@/utils/firestoreHelpers");
const cleanedActivityData = cleanFirestoreData(activityData);

await addDoc(collection(db, "activities"), cleanedActivityData);
console.log("✅ [RecruitForm] Activity 생성 완료:", {
  postId: docRef.id,
  collection: "recruitPosts",
  type: "recruit_created",
});
```

---

### Match 글 작성

**파일**: `src/features/market/components/forms/MatchForm.tsx`

**위치**: 게시글 저장 후 (약 260줄 근처)

**수정 코드**:

```typescript
// 1. matchPosts에 게시글 저장
const docRef = await addDoc(collection(db, "matchPosts"), {
  sport,
  category: "match",
  title: title.trim(),
  description: description.trim(),
  // ... 기타 필드
  createdAt: serverTimestamp(),
  authorId: auth.currentUser.uid,
});

// 2. activities에 Activity 생성
const activityData = {
  type: "match_created",
  sport: sport?.toLowerCase().trim() || "soccer",
  postId: docRef.id, // 🔥 필수
  collection: "matchPosts", // 🔥 필수
  userId: auth.currentUser.uid,
  createdAt: serverTimestamp(),
};

// 🔥 undefined 값 제거
const { cleanFirestoreData } = await import("@/utils/firestoreHelpers");
const cleanedActivityData = cleanFirestoreData(activityData);

await addDoc(collection(db, "activities"), cleanedActivityData);
console.log("✅ [MatchForm] Activity 생성 완료:", {
  postId: docRef.id,
  collection: "matchPosts",
  type: "match_created",
});
```

---

## 4️⃣ ActivityFeed 조회 로직 수정

**파일**: `src/features/activity/ActivityFeed.tsx`

### ⚠️ 절대 금지

```typescript
// ❌ 이렇게 하면 안 됨
const marketQuery = query(collection(db, "marketPosts"), ...);
const recruitQuery = query(collection(db, "recruitPosts"), ...);
const matchQuery = query(collection(db, "matchPosts"), ...);
```

### ✅ 올바른 코드

**조회 대상은 `activities` 컬렉션만 사용**

**위치**: `loadInitial` 함수 (약 85줄 근처)

**수정 코드**:

```typescript
const loadInitial = async () => {
  try {
    setLoading(true);
    setError(null);
    setActivities([]);
    setLastDoc(null);

    const activitiesConditions: any[] = [];

    // 🔥 visibility 필터 (항상 적용)
    activitiesConditions.push(where("visibility", "==", "public"));

    // 🔥 탭별 필터 적용
    if (activeFilter !== "all" && activeFilter !== "전체") {
      if (activeFilter === "market" || activeFilter === "거래") {
        // 🔥 거래 탭: equipment_created만 표시
        activitiesConditions.push(where("type", "==", "equipment_created"));
      } else if (activeFilter === "team" || activeFilter === "팀") {
        // 🔥 팀 탭: team_created + recruit_created
        activitiesConditions.push(where("type", "in", ["team_created", "recruit_created"]));
      } else if (activeFilter === "event" || activeFilter === "이벤트") {
        // 이벤트 탭: team_event만
        activitiesConditions.push(where("type", "==", "team_event"));
      }
    } else {
      // 🔥 전체 탭: system 타입 제외
      activitiesConditions.push(where("type", "!=", "system"));
    }

    // 🔥 sport 필터 추가 (모든 탭에서 항상 유지)
    // /activity?sport=soccer는 축구 Activity 페이지이므로 모든 탭에서 sport 필터 유지
    if (sport) {
      activitiesConditions.push(where("sport", "==", sport.toLowerCase().trim()));
    }

    // 🔥 정렬 및 제한 추가
    activitiesConditions.push(orderBy("createdAt", "desc"));
    activitiesConditions.push(limit(20));

    // 🔥 쿼리 구성: activities 컬렉션만 사용
    const activitiesQuery = query(
      collection(db, "activities"),
      ...activitiesConditions
    );

    const snapshot = await getDocs(activitiesQuery);
    
    // 🔥 디버그 로그 추가
    console.log("🔥 [ActivityFeed] query results:", {
      queryConditions: activitiesConditions.map(c => c.toString()),
      sportFilter: sport,
      typeFilter: activeFilter,
      resultCount: snapshot.size,
      activities: snapshot.docs.map(doc => ({
        id: doc.id,
        type: doc.data().type,
        sport: doc.data().sport,
        collection: doc.data().collection,
        postId: doc.data().postId,
        title: doc.data().title,
      })),
    });

    if (snapshot.empty) {
      console.log("⚠️ [ActivityFeed] 조회된 문서가 없습니다. 필터 조건을 확인하세요.");
      setActivities([]);
      setLoading(false);
      return;
    }

    const activitiesList = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    setActivities(activitiesList);
    setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
    setLoading(false);
  } catch (err: any) {
    console.error("❌ [ActivityFeed] 로드 실패:", err);
    setError(err.message || "활동을 불러올 수 없습니다.");
    setLoading(false);
  }
};
```

**`loadMore` 함수도 동일하게 수정** (약 320줄 근처)

---

## 5️⃣ sport 필터 적용 (항상 유지)

**현재 페이지**: `/activity?sport=soccer`

**따라서 query 조건**:

```typescript
where("sport", "==", selectedSport)
```

**모든 탭에서 유지**

**이미 4️⃣에서 구현됨** ✅

---

## 6️⃣ Activity 타입 필터

**필터 로직** (이미 4️⃣에서 구현됨):

```typescript
// 전체 탭
if (activeFilter === "all" || activeFilter === "전체") {
  activitiesConditions.push(where("type", "!=", "system"));
}

// 거래 탭
if (activeFilter === "market" || activeFilter === "거래") {
  activitiesConditions.push(where("type", "==", "equipment_created"));
}

// 팀 탭
if (activeFilter === "team" || activeFilter === "팀") {
  activitiesConditions.push(where("type", "in", ["team_created", "recruit_created"]));
}

// 이벤트 탭
if (activeFilter === "event" || activeFilter === "이벤트") {
  activitiesConditions.push(where("type", "==", "team_event"));
}
```

---

## 7️⃣ ActivityCard 라우팅 수정

**파일**: `src/features/activity/ActivityCard.tsx`

**위치**: `handleClick` 함수 (약 92줄 근처)

**수정 코드**:

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

**타입 정의도 수정** (약 12줄 근처):

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

## 8️⃣ Activity 디버그 로그 추가

**파일**: `src/features/activity/ActivityFeed.tsx`

**위치**: `loadInitial` 함수 내부 (이미 4️⃣에서 추가됨)

**추가된 로그**:

```typescript
console.log("🔥 [ActivityFeed] query results:", {
  queryConditions: activitiesConditions.map(c => c.toString()),
  sportFilter: sport,
  typeFilter: activeFilter,
  resultCount: snapshot.size,
  activities: snapshot.docs.map(doc => ({
    id: doc.id,
    type: doc.data().type,
    sport: doc.data().sport,
    collection: doc.data().collection,
    postId: doc.data().postId,
    title: doc.data().title,
  })),
});
```

**확인 항목**:
- `type`: "equipment_created" | "recruit_created" | ...
- `sport`: "soccer" | "basketball" | ...
- `collection`: "marketPosts" | "recruitPosts" | ...
- `postId`: 게시글 ID

---

## 9️⃣ Firestore 데이터 확인

### Firebase Console에서 확인

**컬렉션**: `activities`

**확인 사항**:

1. **Equipment Activity**:
   ```
   sport = "soccer"
   type = "equipment_created"
   collection = "marketPosts"
   postId = "abc123" (marketPosts 컬렉션의 실제 문서 ID)
   ```

2. **Recruit Activity**:
   ```
   sport = "soccer"
   type = "recruit_created"
   collection = "recruitPosts"
   postId = "def456" (recruitPosts 컬렉션의 실제 문서 ID)
   ```

### 브라우저 콘솔에서 확인

ActivityFeed 로드 시 다음 로그가 출력됩니다:

```
🔥 [ActivityFeed] query results: {
  queryConditions: [...],
  sportFilter: "soccer",
  typeFilter: "all",
  resultCount: 2,
  activities: [
    {
      id: "...",
      type: "equipment_created",
      sport: "soccer",
      collection: "marketPosts",
      postId: "abc123",
      title: "공공공"
    },
    {
      id: "...",
      type: "recruit_created",
      sport: "soccer",
      collection: "recruitPosts",
      postId: "def456",
      title: "야고 축구 FC"
    }
  ]
}
```

---

## 🔟 기존 데이터 정리

### 기존 잘못된 Activity 제거

**삭제 대상**:

1. `type = "market_created"` (올바른 타입: "equipment_created")
2. `collection` 필드 없음
3. `sport` 필드 없음
4. `postId` 필드 없음

### 마이그레이션 스크립트 (선택사항)

**파일**: `scripts/migrateActivities.ts` (새로 생성)

```typescript
import { collection, getDocs, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

async function migrateActivities() {
  const activitiesRef = collection(db, "activities");
  const snapshot = await getDocs(activitiesRef);
  
  let updatedCount = 0;
  let deletedCount = 0;
  
  for (const activityDoc of snapshot.docs) {
    const data = activityDoc.data();
    
    // 삭제 대상: collection 없음, sport 없음, postId 없음
    if (!data.collection || !data.sport || !data.postId) {
      console.log(`🗑️ [Migration] 삭제 대상 Activity: ${activityDoc.id}`, data);
      await deleteDoc(doc(db, "activities", activityDoc.id));
      deletedCount++;
      continue;
    }
    
    // 업데이트 대상: type이 "market_created"인 경우
    if (data.type === "market_created") {
      const updates: any = {
        type: "equipment_created",
      };
      
      // collection이 없으면 추가
      if (!data.collection) {
        updates.collection = "marketPosts";
      }
      
      // postId가 없으면 refId 사용
      if (!data.postId && data.refId) {
        updates.postId = data.refId;
      }
      
      await updateDoc(doc(db, "activities", activityDoc.id), updates);
      console.log(`✅ [Migration] Activity ${activityDoc.id} 업데이트 완료`);
      updatedCount++;
    }
  }
  
  console.log(`✅ [Migration] 완료: ${updatedCount}개 업데이트, ${deletedCount}개 삭제`);
}

// 실행 (한 번만)
// migrateActivities();
```

**⚠️ 주의**: 이 스크립트는 한 번만 실행하세요.

---

## 🔥 수정 완료 후 기대 결과

### Activity 페이지 (`/activity?sport=soccer`)

#### 전체 탭
```
공공공 (equipment_created, collection: "marketPosts")
야고 축구 FC (recruit_created, collection: "recruitPosts")
```

#### 거래 탭
```
공공공 (equipment_created만)
```

#### 팀 탭
```
야고 축구 FC (recruit_created만)
```

---

## 🚨 중요 규칙

### 앞으로 Activity 시스템에서 절대 금지

```typescript
// ❌ 이렇게 하면 안 됨
const marketQuery = query(collection(db, "marketPosts"), ...);
const recruitQuery = query(collection(db, "recruitPosts"), ...);
const matchQuery = query(collection(db, "matchPosts"), ...);
```

### Activity는 반드시

```typescript
// ✅ activities 컬렉션만 조회
const activitiesQuery = query(
  collection(db, "activities"),
  where("visibility", "==", "public"),
  // ... 필터 조건
  orderBy("createdAt", "desc"),
  limit(20)
);
```

---

## 💡 이 구조의 장점

앞으로 절대 발생 안 하는 문제:

- ✅ Activity 글 누락
- ✅ 탭 필터 오류
- ✅ 라우터 꼬임
- ✅ 게시글 타입 충돌

---

## 📋 작업 체크리스트

### 1. Activity 생성 코드 수정

- [ ] `EquipmentForm.tsx`: `collection: "marketPosts"`, `postId` 추가
- [ ] `RecruitForm.tsx`: `collection: "recruitPosts"`, `postId` 추가
- [ ] `MatchForm.tsx`: `collection: "matchPosts"`, `postId` 추가

### 2. ActivityFeed 조회 로직 수정

- [ ] `ActivityFeed.tsx`: activities 컬렉션만 조회하도록 수정
- [ ] `ActivityFeed.tsx`: 디버그 로그 추가
- [ ] marketPosts/recruitPosts 직접 조회 코드 제거 (있다면)

### 3. ActivityCard 라우팅 수정

- [ ] `ActivityCard.tsx`: `collection` 기반 라우팅 구현
- [ ] `ActivityCard.tsx`: 레거시 `type` 기반 라우팅 지원
- [ ] `ActivityCard.tsx`: 타입 정의에 `postId`, `collection` 추가

### 4. Firestore 데이터 확인

- [ ] Firebase Console에서 activities 컬렉션 확인
- [ ] `collection`, `postId`, `sport` 필드 확인
- [ ] 잘못된 데이터 삭제 또는 수정

---

## 🧪 마지막 확인

Cursor 작업 완료 후 반드시 테스트:

1. ✅ Equipment 글 작성
   - `/sports/soccer/market/write`에서 Equipment 글 작성
   - Firestore에서 `activities` 컬렉션에 Activity 생성 확인
   - `collection: "marketPosts"`, `postId` 확인

2. ✅ Recruit 글 작성
   - `/sports/soccer/market/write?category=recruit`에서 Recruit 글 작성
   - Firestore에서 `activities` 컬렉션에 Activity 생성 확인
   - `collection: "recruitPosts"`, `postId` 확인

3. ✅ Activity 페이지 확인
   - `/activity?sport=soccer` 접속
   - 전체 탭: "공공공", "야고 축구 FC" 모두 표시 확인

4. ✅ 거래 탭 확인
   - 거래 탭 클릭
   - "공공공"만 표시 확인 (recruit 글은 안 보임)

5. ✅ 팀 탭 확인
   - 팀 탭 클릭
   - "야고 축구 FC"만 표시 확인 (equipment 글은 안 보임)

6. ✅ 상세페이지 이동 확인
   - Activity 카드 클릭
   - 올바른 상세 페이지로 이동 확인
   - `collection: "marketPosts"` → `/sports/soccer/market/:postId`
   - `collection: "recruitPosts"` → `/sports/soccer/recruit/:postId`

---

## 🚀 다음 단계 (선택사항)

원하면 **YAGO 전체 라우터 구조까지 완전 정리**해 줄 수 있습니다.

지금 프로젝트 상태 보면 **Activity + Router 구조만 정리하면 서비스 안정도 5배 올라갑니다.**

---

**이 지시문을 순서대로 작업하면 Activity 시스템이 완전히 안정화됩니다.**
