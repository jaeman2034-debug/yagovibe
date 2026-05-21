# YAGO Activity 시스템 정리 및 다음 단계 개발 지시문

## 1. 현재 시스템 상태 (확인 완료)

현재 YAGO 프로젝트의 Activity 시스템은 다음 기능이 정상 동작합니다.

### Home → 스포츠 Activity 이동

홈 화면에서 스포츠 클릭 시:

```
/activity?sport=soccer
```

형태로 정상 이동합니다.

**예**:
```
축구 → /activity?sport=soccer
야구 → /activity?sport=baseball
농구 → /activity?sport=basketball
```

**라우팅 정상** ✅

---

### Activity 페이지 구조

**상단 필터**:
```
전체
거래
팀
이벤트
```

**각 탭은 Activity `type` 기반으로 필터링**:

- **전체**: 모든 Activity (system 제외, 클라이언트 필터링)
- **거래**: `type == "equipment_created"`
- **팀**: `type in ["team_created", "recruit_created"]`
- **이벤트**: `type == "team_event"`

---

## 2. 현재 문제 (Firestore 데이터 구조)

Firestore `activities` 컬렉션에서 `sport` 값이 **두 가지 형태로 섞여 있습니다**.

### 예

**정상**:
```json
{
  "sport": "soccer"  // ✅ 영문 코드
}
```

**잘못된 값**:
```json
{
  "sport": "축구"  // ❌ 한글
}
```

**현재 ActivityFeed 쿼리**:
```typescript
where("sport", "==", "soccer")
```

**따라서**:
```
sport: "축구"
```

문서는 조회되지 않습니다.

---

## 3. 해결 규칙 (중요)

Activity 저장 시 `sport` 값은 **반드시 영문 코드 사용**

### 표준 sport 코드

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

**예**:
```typescript
sport: "soccer"  // ✅ 올바름
```

**한글 사용 금지**:
```typescript
sport: "축구"  // ❌ 잘못됨
```

---

## 4. ActivityFeed 쿼리 구조 (확정)

**파일**: `src/features/activity/ActivityFeed.tsx`

**현재 구현** (이미 올바르게 구현됨):
```typescript
const [searchParams] = useSearchParams();
const sportParam = searchParams.get("sport");

const activitiesConditions: any[] = [];
activitiesConditions.push(where("visibility", "==", "public"));

if (sportParam) {
  activitiesConditions.push(where("sport", "==", sportParam.toLowerCase().trim()));
}

// 탭별 필터 적용
if (activeFilter === "all" || activeFilter === "전체") {
  // 전체 탭: 클라이언트에서 system 필터링
} else if (activeFilter === "market" || activeFilter === "거래") {
  activitiesConditions.push(where("type", "==", "equipment_created"));
} else if (activeFilter === "team" || activeFilter === "팀") {
  activitiesConditions.push(where("type", "in", ["team_created", "recruit_created"]));
} else if (activeFilter === "event" || activeFilter === "이벤트") {
  activitiesConditions.push(where("type", "==", "team_event"));
}

activitiesConditions.push(orderBy("createdAt", "desc"));
activitiesConditions.push(limit(20));

const activitiesQuery = query(
  collection(db, "activities"),
  ...activitiesConditions
);
```

**이 구조 유지** ✅

---

## 다음 개발 단계

### 현재 상태

| 기능 | 상태 |
|------|------|
| Home 시스템 | ✅ 완료 |
| Sport 필터 | ✅ 완료 |
| Activity Feed | ✅ 완료 |
| Firestore 구조 | ✅ 안정 |
| ActivityCard 라우팅 | ✅ 완료 |

### 다음 개발

```
ActivityDetail
댓글 시스템
좋아요 기능
```

---

## 5. Activity 카드 클릭 → 상세 페이지 이동

**현재 상태**: ActivityCard는 이미 라우팅 기능이 있지만, **Activity 상세 페이지가 없어서** 완성되지 않았습니다.

**목표**: ActivityCard 클릭 시 `/activity/:activityId`로 이동

**예**:
```
/activity/I8vDPYed5003N2IeORcV
```

---

### ActivityCard.tsx 수정

**파일**: `src/features/activity/ActivityCard.tsx`

**현재 코드 확인 필요**: 이미 collection 기반 라우팅이 구현되어 있는지 확인

**추가 필요**: Activity 상세 페이지 라우팅 옵션

**수정 코드** (기존 라우팅에 추가):
```typescript
const handleClick = (e?: React.MouseEvent) => {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  // 🔥 Activity 상세 페이지로 이동 (새 기능)
  navigate(`/activity/${item.id}`);
};
```

**또는 기존 라우팅 유지하고 상세 페이지 옵션 추가**:
```typescript
// 기존: collection 기반 라우팅 (게시글 상세)
// 추가: Activity 상세 페이지 라우팅 옵션
// 사용자가 선택할 수 있도록 하거나, 기본값으로 Activity 상세 페이지 사용
```

---

## 6. Activity 상세 페이지 생성

### 새 페이지 생성

**파일**: `src/pages/activity/ActivityDetailPage.tsx` (새로 생성)

**라우팅 추가**: `src/App.tsx`

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

### Firestore 데이터 조회

**기본 구조**:
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

        const activityData = {
          id: docSnap.id,
          ...docSnap.data(),
        };

        setActivity(activityData);
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
    return <div className="min-h-screen flex items-center justify-center">로딩 중...</div>;
  }

  if (error) {
    return <div className="min-h-screen flex items-center justify-center">에러: {error}</div>;
  }

  if (!activity) {
    return <div className="min-h-screen flex items-center justify-center">Activity를 찾을 수 없습니다.</div>;
  }

  return (
    <div className="activity-detail">
      {/* UI 구성 */}
    </div>
  );
}
```

---

### 상세 페이지 UI 구성

**ActivityDetail 화면**:
```
┌─────────────────────────┐
│ ← 뒤로가기                │
├─────────────────────────┤
│ [썸네일 이미지]            │
├─────────────────────────┤
│ 제목                      │
│ 작성자                    │
│ 스포츠                    │
│ 생성일                    │
├─────────────────────────┤
│ 본문 내용 (summary)        │
├─────────────────────────┤
│ 좋아요 (likeCount)        │
│ 댓글 (commentCount)       │
├─────────────────────────┤
│ 댓글 목록                 │
├─────────────────────────┤
│ [채팅 이동 버튼]           │
│ [원본 게시글 이동 버튼]      │
└─────────────────────────┘
```

---

## 7. Firestore Activity 문서 구조

**activities 컬렉션**:
```json
activities/{activityId}
{
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
  "authorId": "userId",
  "authorName": "userName"
}
```

---

## 8. 댓글 시스템 준비

### 새 컬렉션

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

**복합 인덱스 필요**:
```
Collection: activityComments
Fields:
  - activityId (Ascending)
  - createdAt (Descending)
```

---

## 9. 좋아요 시스템

### Activity 문서

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

**또는**:
```
Collection: activityLikes
Fields:
  - activityId (Ascending)
  - userId (Ascending)
```

(중복 좋아요 방지용)

---

## 10. 다음 개발 순서

### 1단계: ActivityDetail 페이지 구현 ⏳

**작업**:
- `ActivityDetailPage.tsx` 생성
- 라우팅 추가 (`/activity/:id`)
- Activity 데이터 로드
- 기본 UI 구성

**예상 시간**: 2-3시간

---

### 2단계: Activity 댓글 시스템 ⏳

**작업**:
- `activityComments` 컬렉션 구조 설계
- 댓글 작성 기능
- 댓글 목록 표시
- 댓글 삭제 기능 (작성자만)

**예상 시간**: 3-4시간

---

### 3단계: Activity 좋아요 기능 ⏳

**작업**:
- `activityLikes` 컬렉션 구조 설계
- 좋아요 토글 기능
- `likeCount` 실시간 업데이트
- 좋아요 상태 표시

**예상 시간**: 2-3시간

---

### 4단계: Activity 실시간 Feed (onSnapshot) ⏳

**작업**:
- `onSnapshot`으로 실시간 업데이트
- 새 Activity 자동 표시
- 좋아요/댓글 수 실시간 반영

**예상 시간**: 1-2시간

---

### 5단계: Activity 무한스크롤 ⏳

**작업**:
- `startAfter` 기반 pagination
- 무한 스크롤 구현

**예상 시간**: 1시간

**상태**: 이미 구현되어 있을 수 있음 (확인 필요)

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

1. ✅ **sport 값은 영문 코드 사용** (`soccer`, `basketball`, etc.)
2. ✅ **Firestore index 유지** (복합 인덱스 확인)
3. ✅ **ActivityFeed pagination 유지** (무한 스크롤)
4. ✅ **ActivityCard 클릭 이동 구현** (이미 완료)
5. ⏳ **ActivityDetail 페이지 생성** (다음 단계)
6. ⏳ **댓글 시스템 구현** (다음 단계)
7. ⏳ **좋아요 기능 구현** (다음 단계)

---

## 📋 작업 체크리스트

### 현재 단계 (완료)

- [x] ActivityFeed sport 필터 구현
- [x] Activity 탭 필터 구현
- [x] ActivityCard 라우팅 구현
- [x] System activity 숨기기
- [ ] **sport 값 통일** (마이그레이션 필요)

### 다음 단계 (개발 필요)

- [ ] ActivityDetail 페이지 생성
- [ ] ActivityDetail 라우팅 추가
- [ ] ActivityDetail UI 구성
- [ ] 댓글 시스템 구현
- [ ] 좋아요 기능 구현
- [ ] 실시간 Activity Feed

---

이 지시문을 따라 작업하면 **YAGO Activity 시스템이 완전히 안정화**되고, **다음 단계 개발**까지 정상 구현됩니다.
