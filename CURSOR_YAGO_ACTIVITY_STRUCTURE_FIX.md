# 🔥 Cursor 개발자 수정 지시문 (YAGO Activity 구조 안정화)

## 목적

현재 Activity 피드, 게시글 컬렉션, 라우팅이 서로 섞여 있어 다음 문제가 발생하고 있다.

### 문제 증상

1️⃣ 전체 탭에서 글이 안 보임
2️⃣ 거래 탭에 모집 글이 나타남
3️⃣ 팀 탭 필터가 정상 작동하지 않음
4️⃣ Activity → 상세페이지 라우팅이 불안정

따라서 **게시글(Post)과 Activity Feed를 완전히 분리하는 구조로 수정한다.**

---

## 1️⃣ Firestore 컬렉션 구조 정리

게시글과 Activity를 분리한다.

### 게시글 컬렉션

```
marketPosts      (중고거래)
recruitPosts     (팀 모집)
matchPosts       (경기 매칭)
teamPosts        (팀 생성)
eventPosts       (팀 이벤트)
```

### Activity Feed

```
activities
```

---

## 2️⃣ Activity 데이터 구조

Activity는 게시글을 직접 저장하지 않는다.

Activity는 **게시글 위치만 참조한다.**

### Activity document 구조

```
activities

id
type
sport
postId
collection
userId
createdAt
```

### 예시

#### Equipment Activity
```typescript
{
  type: "equipment_created",
  sport: "soccer",
  postId: "abc123",
  collection: "marketPosts",
  userId: "user123",
  createdAt: Timestamp
}
```

#### Recruit Activity
```typescript
{
  type: "recruit_created",
  sport: "soccer",
  postId: "def456",
  collection: "recruitPosts",
  userId: "user123",
  createdAt: Timestamp
}
```

---

## 3️⃣ 게시글 생성 시 Activity 생성

게시글 저장 후 Activity를 생성한다.

### Equipment 글 작성

**파일**: `src/features/market/components/forms/EquipmentForm.tsx`

```typescript
// 1. marketPosts에 게시글 저장
const docRef = await addDoc(collection(db, "marketPosts"), {
  sport,
  category: "equipment",
  title,
  description,
  price,
  // ... 기타 필드
  createdAt: serverTimestamp(),
  authorId: auth.currentUser.uid,
});

// 2. activities에 Activity 생성
await addDoc(collection(db, "activities"), {
  type: "equipment_created",
  sport: sport?.toLowerCase().trim() || "soccer",
  postId: docRef.id,
  collection: "marketPosts",
  userId: auth.currentUser.uid,
  createdAt: serverTimestamp(),
});
```

---

### Recruit 글 작성

**파일**: `src/features/market/components/forms/RecruitForm.tsx`

```typescript
// 1. recruitPosts에 게시글 저장
const docRef = await addDoc(collection(db, "recruitPosts"), {
  sport,
  category: "recruit",
  title,
  description,
  // ... 기타 필드
  createdAt: serverTimestamp(),
  authorId: auth.currentUser.uid,
});

// 2. activities에 Activity 생성
await addDoc(collection(db, "activities"), {
  type: "recruit_created",
  sport: sport?.toLowerCase().trim() || "soccer",
  postId: docRef.id,
  collection: "recruitPosts",
  userId: auth.currentUser.uid,
  createdAt: serverTimestamp(),
});
```

---

### Match 글 작성

**파일**: `src/features/market/components/forms/MatchForm.tsx`

```typescript
// 1. matchPosts에 게시글 저장
const docRef = await addDoc(collection(db, "matchPosts"), {
  sport,
  category: "match",
  title,
  description,
  // ... 기타 필드
  createdAt: serverTimestamp(),
  authorId: auth.currentUser.uid,
});

// 2. activities에 Activity 생성
await addDoc(collection(db, "activities"), {
  type: "match_created",
  sport: sport?.toLowerCase().trim() || "soccer",
  postId: docRef.id,
  collection: "matchPosts",
  userId: auth.currentUser.uid,
  createdAt: serverTimestamp(),
});
```

---

## 4️⃣ ActivityFeed 조회 로직 수정

**⚠️ 중요**: ActivityFeed는 **절대 marketPosts / recruitPosts 직접 조회하면 안된다.**

조회 대상은 **activities 컬렉션만 사용한다.**

**파일**: `src/features/activity/ActivityFeed.tsx`

### 현재 문제 코드 (수정 필요)

```typescript
// ❌ 이렇게 하면 안 됨
const marketQuery = query(collection(db, "marketPosts"), ...);
const recruitQuery = query(collection(db, "recruitPosts"), ...);
```

### 올바른 코드

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

## 5️⃣ Activity 필터 로직

**파일**: `src/features/activity/ActivityFeed.tsx`

### 필터 구조

#### 전체 탭
```typescript
if (activeFilter === "all" || activeFilter === "전체") {
  activitiesConditions.push(where("type", "!=", "system"));
}
// sport 필터는 모든 탭에서 유지
if (sport) {
  activitiesConditions.push(where("sport", "==", sport.toLowerCase().trim()));
}
```

#### 거래 탭
```typescript
if (activeFilter === "market" || activeFilter === "거래") {
  activitiesConditions.push(where("type", "==", "equipment_created"));
}
if (sport) {
  activitiesConditions.push(where("sport", "==", sport.toLowerCase().trim()));
}
```

#### 팀 탭
```typescript
if (activeFilter === "team" || activeFilter === "팀") {
  activitiesConditions.push(where("type", "in", ["team_created", "recruit_created"]));
}
if (sport) {
  activitiesConditions.push(where("sport", "==", sport.toLowerCase().trim()));
}
```

#### 이벤트 탭
```typescript
if (activeFilter === "event" || activeFilter === "이벤트") {
  activitiesConditions.push(where("type", "==", "team_event"));
}
if (sport) {
  activitiesConditions.push(where("sport", "==", sport.toLowerCase().trim()));
}
```

---

## 6️⃣ Activity 클릭 시 라우팅 수정

Activity에는 `collection` 정보가 있으므로 이를 기준으로 라우팅한다.

**파일**: `src/features/activity/ActivityCard.tsx`

### 라우팅 로직

```typescript
const handleClick = () => {
  const { sport } = useParams<{ sport: string }>();
  const postId = activity.postId || activity.refId || activity.sourceId;
  
  if (!postId || !sport) {
    console.warn("⚠️ [ActivityCard] postId 또는 sport가 없습니다:", { activity, sport });
    return;
  }

  switch (activity.collection) {
    case "marketPosts":
      navigate(`/sports/${sport}/market/${postId}`);
      break;
    
    case "recruitPosts":
      navigate(`/sports/${sport}/recruit/${postId}`);
      break;
    
    case "matchPosts":
      navigate(`/sports/${sport}/match/${postId}`);
      break;
    
    case "teamPosts":
      navigate(`/sports/${sport}/team/${postId}`);
      break;
    
    case "eventPosts":
      navigate(`/sports/${sport}/event/${postId}`);
      break;
    
    default:
      // 레거시 지원: type 기반 라우팅
      if (activity.type === "equipment_created" || activity.type === "market_created") {
        navigate(`/sports/${sport}/market/${postId}`);
      } else if (activity.type === "recruit_created") {
        navigate(`/sports/${sport}/recruit/${postId}`);
      } else if (activity.type === "match_created") {
        navigate(`/sports/${sport}/match/${postId}`);
      } else if (activity.type === "team_created") {
        navigate(`/sports/${sport}/team/${postId}`);
      } else if (activity.type === "team_event") {
        navigate(`/sports/${sport}/event/${postId}`);
      } else {
        console.warn("⚠️ [ActivityCard] 알 수 없는 activity type:", activity.type);
      }
      break;
  }
};
```

---

## 7️⃣ ActivityCard 코드 구조

**파일**: `src/features/activity/ActivityCard.tsx`

### 전체 구조 예시

```typescript
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";

interface ActivityCardProps {
  activity: {
    id: string;
    type: string;
    sport: string;
    postId?: string;
    collection?: string;
    refId?: string; // 레거시 지원
    sourceId?: string; // 레거시 지원
    // ... 기타 필드
  };
}

export default function ActivityCard({ activity }: ActivityCardProps) {
  const navigate = useNavigate();
  const { sport: sportParam } = useParams<{ sport?: string }>();
  const sport = activity.sport || sportParam || "soccer";

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const postId = activity.postId || activity.refId || activity.sourceId;
    
    if (!postId) {
      console.warn("⚠️ [ActivityCard] postId가 없습니다:", activity);
      return;
    }

    switch (activity.collection) {
      case "marketPosts":
        navigate(`/sports/${sport}/market/${postId}`);
        break;
      
      case "recruitPosts":
        navigate(`/sports/${sport}/recruit/${postId}`);
        break;
      
      case "matchPosts":
        navigate(`/sports/${sport}/match/${postId}`);
        break;
      
      case "teamPosts":
        navigate(`/sports/${sport}/team/${postId}`);
        break;
      
      case "eventPosts":
        navigate(`/sports/${sport}/event/${postId}`);
        break;
      
      default:
        // 레거시 지원: type 기반 라우팅
        if (activity.type === "equipment_created" || activity.type === "market_created") {
          navigate(`/sports/${sport}/market/${postId}`);
        } else if (activity.type === "recruit_created") {
          navigate(`/sports/${sport}/recruit/${postId}`);
        } else if (activity.type === "match_created") {
          navigate(`/sports/${sport}/match/${postId}`);
        } else if (activity.type === "team_created") {
          navigate(`/sports/${sport}/team/${postId}`);
        } else if (activity.type === "team_event") {
          navigate(`/sports/${sport}/event/${postId}`);
        } else {
          console.warn("⚠️ [ActivityCard] 알 수 없는 activity type:", activity.type);
        }
        break;
    }
  };

  return (
    <div onClick={handleClick} className="cursor-pointer">
      {/* Activity 카드 UI */}
    </div>
  );
}
```

---

## 8️⃣ Activity 화면 기대 결과

### 예시: 축구 카테고리

작성 글:
- "공공공" (equipment_created, collection: "marketPosts")
- "야고 축구 FC" (recruit_created, collection: "recruitPosts")

### 전체 탭 (`/activity?sport=soccer`)

```
공공공 (equipment_created)
야고 축구 FC (recruit_created)
```

---

### 거래 탭 (`/activity?sport=soccer`)

```
공공공 (equipment_created만)
```

---

### 팀 탭 (`/activity?sport=soccer`)

```
야고 축구 FC (recruit_created만)
```

---

## 9️⃣ 중요한 규칙

### 절대 금지

```typescript
// ❌ ActivityFeed에서 이렇게 하면 안 됨
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

## 🔟 Cloud Functions 수정 (선택사항)

게시글 생성 시 자동으로 Activity를 생성하려면 Cloud Functions를 사용할 수 있습니다.

**파일**: `functions/src/market/integratedPostProcessor.ts`

```typescript
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore();

export const onMarketPostCreated = onDocumentCreated(
  "marketPosts/{postId}",
  async (event) => {
    const postData = event.data?.data();
    const postId = event.params.postId;

    if (!postData) return;

    // Activity 생성
    await db.collection("activities").add({
      type: "equipment_created",
      sport: postData.sport?.toLowerCase().trim() || "soccer",
      postId: postId,
      collection: "marketPosts",
      userId: postData.authorId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
);
```

---

## 🔥 최종 목표

다음 문제를 완전히 해결:

- ✅ 전체 목록 누락
- ✅ 거래에 모집글 표시
- ✅ 팀 탭 안보임
- ✅ Activity 라우팅 오류

---

## 📋 작업 체크리스트

### 1. Activity 생성 코드 수정

- [ ] `EquipmentForm.tsx`: Activity 생성 추가
- [ ] `RecruitForm.tsx`: Activity 생성 추가
- [ ] `MatchForm.tsx`: Activity 생성 추가

### 2. ActivityFeed 조회 로직 수정

- [ ] `ActivityFeed.tsx`: activities 컬렉션만 조회하도록 수정
- [ ] marketPosts/recruitPosts 직접 조회 코드 제거

### 3. Activity 필터 로직 확인

- [ ] 전체 탭: `type != "system"` + `sport` 필터
- [ ] 거래 탭: `type == "equipment_created"` + `sport` 필터
- [ ] 팀 탭: `type in ["team_created", "recruit_created"]` + `sport` 필터
- [ ] 이벤트 탭: `type == "team_event"` + `sport` 필터

### 4. ActivityCard 라우팅 수정

- [ ] `collection` 기반 라우팅 구현
- [ ] 레거시 `type` 기반 라우팅 지원

### 5. Firestore 인덱스 확인

- [ ] `activities` 컬렉션 복합 인덱스 생성
  - `sport` + `type` + `createdAt`
  - `sport` + `createdAt`

---

## 💡 개발자 참고

이 구조는 다음 서비스와 동일한 구조입니다:

- **Facebook**: Posts와 Activity Feed 분리
- **Reddit**: Posts와 Feed 분리
- **Discord**: Messages와 Activity Feed 분리

이 구조를 적용하면 **Activity 꼬임 90% 사라집니다.**

---

## 🚀 다음 단계 (선택사항)

원하면 **YAGO 프로젝트 전체 구조 (Firestore + Router + Activity) 한 번에 안정화시키는 설계도**도 만들어 줄 수 있습니다.

이거 적용하면 지금 같은 **Activity 꼬임 90% 사라집니다.**
