# Cursor 개발자 지시문

## YAGO Activity 시스템 안정화 + 다음 단계 개발

---

## 1. 현재 시스템 상태 (확인 완료)

YAGO Activity 시스템은 다음 구조로 정상 동작하고 있습니다.

### Home → Sport Activity 이동

**예**:
```
Home → 축구 클릭
```

**라우팅**:
```
/activity?sport=soccer
```

**정상 작동 확인됨** ✅

---

### Activity 페이지 필터 구조

**URL Query**:
```
/activity?sport=soccer
```

**Firestore Query**:
```typescript
query(
  collection(db, "activities"),
  where("visibility", "==", "public"),
  where("sport", "==", sportParam),
  orderBy("createdAt", "desc"),
  limit(20)
)
```

---

### Activity 탭 구조

**Activity 페이지 상단 필터**:
```
전체
거래
팀
이벤트
```

**각 탭은 `type` 필터로 동작**:

- **전체**: `type != "system"` (클라이언트 필터링)
- **거래**: `type == "equipment_created"`
- **팀**: `type in ["team_created", "recruit_created"]`
- **이벤트**: `type == "team_event"`

---

## 2. Firestore 데이터 규칙 (중요)

### 현재 문제

현재 DB에 `sport` 값이 **두 가지로 저장**되어 있습니다.

**잘못된 예**:
```json
{
  "sport": "축구"  // ❌ 한글
}
```

**정상 예**:
```json
{
  "sport": "soccer"  // ✅ 영문 코드
}
```

**문제**: Firestore 필터가 정상 동작하려면 `sport` 값을 **영문 코드로 통일**해야 합니다.

---

### sport 코드 표준

```
soccer        (축구)
baseball      (야구)
basketball    (농구)
volleyball    (배구)
running       (러닝)
badminton     (배드민턴)
climbing      (클라이밍)
swimming      (수영)
tennis        (테니스)
golf          (골프)
cycling       (사이클)
```

**Activity 생성 시 반드시 위 코드 사용**

**예**:
```typescript
sport: "soccer"
```

---

### 기존 데이터 마이그레이션

**파일**: `scripts/migrateActivitySports.ts` (새로 생성)

```typescript
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const sportMapping: Record<string, string> = {
  "축구": "soccer",
  "야구": "baseball",
  "농구": "basketball",
  "배구": "volleyball",
  "러닝": "running",
  "배드민턴": "badminton",
  "클라이밍": "climbing",
  "수영": "swimming",
  "테니스": "tennis",
  "골프": "golf",
  "사이클": "cycling",
};

async function migrateActivitySports() {
  const activitiesRef = collection(db, "activities");
  const snapshot = await getDocs(activitiesRef);
  
  let updatedCount = 0;
  let skippedCount = 0;
  
  for (const activityDoc of snapshot.docs) {
    const data = activityDoc.data();
    const currentSport = data.sport;
    
    // 한글 sport 값이면 영문으로 변환
    if (sportMapping[currentSport]) {
      await updateDoc(doc(db, "activities", activityDoc.id), {
        sport: sportMapping[currentSport],
      });
      console.log(`✅ [Migration] Activity ${activityDoc.id} sport 업데이트: ${currentSport} → ${sportMapping[currentSport]}`);
      updatedCount++;
    } else {
      skippedCount++;
    }
  }
  
  console.log(`✅ [Migration] 완료: ${updatedCount}개 업데이트, ${skippedCount}개 스킵`);
}

// 실행 (한 번만)
// migrateActivitySports().catch(console.error);
```

---

## 3. ActivityFeed Query 구조

**파일**: `src/features/activity/ActivityFeed.tsx`

**현재 구현** (이미 올바르게 구현됨):
```typescript
const [searchParams] = useSearchParams();
const sportParam = searchParams.get("sport");

const activitiesConditions: any[] = [];
activitiesConditions.push(where("visibility", "==", "public"));

// 🔥 sport 필터 추가 (sport 파라미터가 있을 때만)
if (sportParam) {
  activitiesConditions.push(where("sport", "==", sportParam.toLowerCase().trim()));
}

// 🔥 탭별 필터 적용
if (activeFilter === "all" || activeFilter === "전체") {
  // 전체 탭: Firestore 쿼리에서는 != 조건 제거
  // 클라이언트에서 system 타입 필터링
} else if (activeFilter === "market" || activeFilter === "거래") {
  activitiesConditions.push(where("type", "==", "equipment_created"));
} else if (activeFilter === "team" || activeFilter === "팀") {
  activitiesConditions.push(where("type", "in", ["team_created", "recruit_created"]));
} else if (activeFilter === "event" || activeFilter === "이벤트") {
  activitiesConditions.push(where("type", "==", "team_event"));
}

// 🔥 정렬 및 제한
activitiesConditions.push(orderBy("createdAt", "desc"));
activitiesConditions.push(limit(20));

const activitiesQuery = query(
  collection(db, "activities"),
  ...activitiesConditions
);
```

**상태**: ✅ 이미 올바르게 구현됨

---

## 4. ActivityCard 클릭 기능 추가 (다음 단계)

현재 ActivityCard는 클릭 이동 기능이 있습니다. 하지만 **Activity 상세 페이지**가 없어서 라우팅이 완성되지 않았습니다.

### 현재 라우팅 구조

**ActivityCard.tsx** (이미 구현됨):
```typescript
// collection 기반 라우팅 (1순위)
if (collection === "marketPosts") {
  navigate(`/sports/${sport}/market/${postId}`);
} else if (collection === "recruitPosts") {
  navigate(`/sports/${sport}/recruit/${postId}`);
}
// ... 기타
```

**상태**: ✅ 이미 구현됨

---

## 5. Activity 상세 페이지 생성 (다음 단계)

### 새 페이지 생성

**파일**: `src/pages/activity/ActivityDetailPage.tsx` (새로 생성)

**라우팅**: `src/App.tsx`에 추가

```typescript
<Route
  path="/activity/:id"
  element={
    <ProtectedRoute>
      <ActivityDetailPage />
    </ProtectedRoute>
  }
/>
```

---

### ActivityDetail 기본 구조

```typescript
import { useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useEffect, useState } from "react";

export default function ActivityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [activity, setActivity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadActivity = async () => {
      if (!id) {
        setError("Activity ID가 없습니다.");
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, "activities", id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          setError("Activity를 찾을 수 없습니다.");
          setLoading(false);
          return;
        }

        setActivity({
          id: docSnap.id,
          ...docSnap.data(),
        });
        setLoading(false);
      } catch (err: any) {
        console.error("❌ [ActivityDetail] 로드 실패:", err);
        setError(err.message || "Activity를 불러올 수 없습니다.");
        setLoading(false);
      }
    };

    loadActivity();
  }, [id]);

  if (loading) {
    return <div>로딩 중...</div>;
  }

  if (error) {
    return <div>에러: {error}</div>;
  }

  if (!activity) {
    return <div>Activity를 찾을 수 없습니다.</div>;
  }

  return (
    <div className="activity-detail">
      {/* UI 구성 */}
    </div>
  );
}
```

---

### 화면 구성

**ActivityDetail UI**:
```
┌─────────────────────────┐
│ 썸네일 이미지              │
├─────────────────────────┤
│ 제목                      │
│ 작성자                    │
│ 스포츠                    │
│ 생성일                    │
├─────────────────────────┤
│ 내용 (summary)            │
├─────────────────────────┤
│ 좋아요 (likeCount)        │
│ 댓글 (commentCount)       │
├─────────────────────────┤
│ 댓글 목록                 │
├─────────────────────────┤
│ 채팅 이동 버튼             │
└─────────────────────────┘
```

---

## 6. ActivityDetail Firestore 구조

**activities 문서 예**:
```json
{
  "id": "activityId",
  "title": "축구화 판매",
  "summary": "10000원",
  "sport": "soccer",
  "type": "equipment_created",
  "refId": "postId",
  "refType": "market",
  "collection": "marketPosts",
  "postId": "postId",
  "thumbnailUrl": "https://...",
  "likeCount": 0,
  "commentCount": 0,
  "createdAt": "timestamp",
  "visibility": "public",
  "authorId": "userId"
}
```

---

## 7. Activity 댓글 기능 준비

### 다음 단계에서 사용할 컬렉션

**컬렉션**: `activityComments`

**구조**:
```json
activityComments/{commentId}
{
  "activityId": "activityId",
  "authorId": "userId",
  "authorName": "userName",
  "content": "댓글 내용",
  "createdAt": "timestamp"
}
```

---

## 8. Activity 좋아요 구조

### activities 문서

**필드**:
```json
{
  "likeCount": 0
}
```

### 별도 컬렉션

**컬렉션**: `activityLikes`

**구조**:
```json
activityLikes/{likeId}
{
  "activityId": "activityId",
  "userId": "userId",
  "createdAt": "timestamp"
}
```

**복합 인덱스 필요**:
```
Collection: activityLikes
Fields:
  - activityId (Ascending)
  - createdAt (Descending)
```

---

## 9. 다음 개발 단계

### 개발 순서

#### 1단계: ActivityCard 클릭 이동 ✅

**상태**: 이미 구현됨 (collection 기반 라우팅)

---

#### 2단계: ActivityDetail 페이지 ⏳

**작업**:
- `ActivityDetailPage.tsx` 생성
- 라우팅 추가 (`/activity/:id`)
- Activity 데이터 로드
- 기본 UI 구성

---

#### 3단계: 댓글 시스템 ⏳

**작업**:
- `activityComments` 컬렉션 구조 설계
- 댓글 작성 기능
- 댓글 목록 표시
- 댓글 삭제 기능 (작성자만)

---

#### 4단계: 좋아요 기능 ⏳

**작업**:
- `activityLikes` 컬렉션 구조 설계
- 좋아요 토글 기능
- `likeCount` 실시간 업데이트
- 좋아요 상태 표시

---

#### 5단계: 실시간 Activity Feed ⏳

**작업**:
- `onSnapshot`으로 실시간 업데이트
- 새 Activity 자동 표시
- 좋아요/댓글 수 실시간 반영

---

## 최종 목표 구조

```
Home
 └ 스포츠 선택
    └ /activity?sport=soccer

Activity Feed
 ├ 전체
 ├ 거래
 ├ 팀
 └ 이벤트
    └ ActivityCard 클릭
       └ /activity/:id

Activity Detail
 ├ 댓글
 ├ 좋아요
 └ 채팅 이동
    └ /sports/:sport/market/:postId
```

---

## 중요 체크사항

개발 시 반드시 확인:

1. ✅ **sport 값은 영문 코드** (`soccer`, `basketball`, etc.)
2. ✅ **Firestore index 유지** (복합 인덱스 확인)
3. ✅ **ActivityFeed pagination 유지** (무한 스크롤)
4. ✅ **ActivityCard 클릭 이동 구현** (이미 완료)
5. ⏳ **ActivityDetail 페이지 생성** (다음 단계)
6. ⏳ **댓글 시스템 구현** (다음 단계)
7. ⏳ **좋아요 기능 구현** (다음 단계)

---

## 현재 프로젝트 상태

| 기능 | 상태 |
|------|------|
| Home 시스템 | ✅ 완료 |
| Sport 필터 | ✅ 완료 |
| Activity Feed | ✅ 완료 |
| Firestore 구조 | ✅ 안정 |
| ActivityCard 라우팅 | ✅ 완료 |
| ActivityDetail | ⏳ 다음 단계 |
| 댓글 시스템 | ⏳ 다음 단계 |
| 좋아요 기능 | ⏳ 다음 단계 |

---

## 🔥 다음 단계 개발 우선순위

### 우선순위 1: ActivityDetail 페이지

**작업**:
1. `ActivityDetailPage.tsx` 생성
2. 라우팅 추가
3. Activity 데이터 로드
4. 기본 UI 구성

**예상 시간**: 2-3시간

---

### 우선순위 2: 댓글 시스템

**작업**:
1. `activityComments` 컬렉션 구조 설계
2. 댓글 작성 기능
3. 댓글 목록 표시

**예상 시간**: 3-4시간

---

### 우선순위 3: 좋아요 기능

**작업**:
1. `activityLikes` 컬렉션 구조 설계
2. 좋아요 토글 기능
3. `likeCount` 실시간 업데이트

**예상 시간**: 2-3시간

---

### 우선순위 4: 실시간 Activity Feed

**작업**:
1. `onSnapshot`으로 실시간 업데이트
2. 새 Activity 자동 표시

**예상 시간**: 1-2시간

---

## 📋 작업 체크리스트

### 현재 단계

- [x] ActivityFeed sport 필터 구현
- [x] Activity 탭 필터 구현
- [x] ActivityCard 라우팅 구현
- [x] System activity 숨기기
- [ ] **sport 값 통일** (마이그레이션 필요)

### 다음 단계

- [ ] ActivityDetail 페이지 생성
- [ ] ActivityDetail 라우팅 추가
- [ ] ActivityDetail UI 구성
- [ ] 댓글 시스템 구현
- [ ] 좋아요 기능 구현
- [ ] 실시간 Activity Feed

---

이 지시문을 따라 작업하면 **YAGO Activity 시스템이 완전히 안정화**되고, **다음 단계 개발**까지 정상 구현됩니다.
