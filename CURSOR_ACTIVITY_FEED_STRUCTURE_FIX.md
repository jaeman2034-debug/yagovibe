# ActivityFeed 구조 수정 지시문

## 문제

현재 ActivityFeed는 Firestore query 단계에서 `sport` 필터를 적용하고 있습니다.

이 구조 때문에 `/activity`와 `/activity?sport=soccer`에서 데이터 흐름이 깨지고 있습니다.

---

## 수정 구조

### 1️⃣ Firestore query 수정

**기존 (문제 코드)**:
```typescript
query(
  collection(db, "activities"),
  where("visibility", "==", "public"),
  where("sport", "==", sportParam),  // ❌ 삭제
  where("refType", "==", "market"),   // 탭 필터
  orderBy("createdAt", "desc"),
  limit(20)
)
```

**수정 (정답 코드)**:
```typescript
query(
  collection(db, "activities"),
  where("visibility", "==", "public"),
  // 🔥 sport 필터 제거 - 항상 전체 데이터 가져오기
  // 🔥 탭 필터도 제거 - 클라이언트에서 처리
  orderBy("createdAt", "desc"),
  limit(30)  // 더 많은 데이터 가져오기 (클라이언트 필터링 대비)
)
```

**Activity는 항상 전체 데이터를 가져옵니다.**

---

### 2️⃣ sport 필터는 UI에서 처리

**파일**: `src/features/activity/ActivityFeed.tsx`

**위치**: 데이터 로드 후, 렌더링 전

**필터 로직**:
```typescript
const [searchParams] = useSearchParams();
const sportParam = searchParams.get("sport");

// 🔥 Firestore에서 가져온 전체 데이터
const allActivities = items; // 또는 activities

// 🔥 sport 필터 적용 (클라이언트 사이드)
let filteredActivities = allActivities;

if (sportParam) {
  filteredActivities = filteredActivities.filter(
    (a) => a.sport === sportParam.toLowerCase().trim()
  );
}
```

---

### 3️⃣ 탭 필터 적용

**기존 구조 유지** (refType 기준):
```typescript
if (tab === "trade" || tab === "거래") {
  return activity.refType === "market";
}

if (tab === "team" || tab === "팀") {
  return activity.refType === "teams";
}

if (tab === "event" || tab === "이벤트") {
  return activity.refType === "events";
}
```

---

### 4️⃣ 최종 필터 구조

**파일**: `src/features/activity/ActivityFeed.tsx`

**위치**: 렌더링 전 (약 490줄 근처)

**코드**:
```typescript
// 🔥 최종 필터링: sport + 탭 필터
const filteredActivities = items
  // 1. system 타입 제외
  .filter((a) => {
    const activityType = (a as any).type || "";
    return activityType !== "system";
  })
  // 2. sport 필터 (URL 파라미터가 있을 때만)
  .filter((a) => {
    if (!sportParam) return true;
    return a.sport === sportParam.toLowerCase().trim();
  })
  // 3. 탭 필터 (refType 기준)
  .filter((a) => {
    if (activeFilter === "all" || activeFilter === "전체") return true;
    if (activeFilter === "market" || activeFilter === "거래") {
      return (a as any).refType === "market";
    }
    if (activeFilter === "team" || activeFilter === "팀") {
      return (a as any).refType === "teams";
    }
    if (activeFilter === "event" || activeFilter === "이벤트") {
      return (a as any).refType === "events";
    }
    return true;
  });
```

---

## 수정 위치

### 1. 초기 로드 쿼리 (useEffect 내부)

**파일**: `src/features/activity/ActivityFeed.tsx`

**위치**: 약 82-118줄

**수정**:
```typescript
// 🔥 activities 컬렉션에서 Activity 조회 (전체 데이터)
const activitiesConditions: any[] = [];

// 🔥 전체 커뮤니티 피드: visibility == "public"만 조회
activitiesConditions.push(where("visibility", "==", "public"));

// 🔥 sport 필터 제거 - 클라이언트에서 처리
// 🔥 탭 필터 제거 - 클라이언트에서 처리

// 🔥 정렬 및 제한 추가
activitiesConditions.push(orderBy("createdAt", "desc"));
activitiesConditions.push(limit(30)); // 더 많은 데이터 가져오기

// 🔥 쿼리 구성: activities 컬렉션 사용
const activitiesQuery = query(
  collection(db, "activities"),
  ...activitiesConditions
);
```

---

### 2. 무한스크롤 쿼리 (loadMore 함수)

**파일**: `src/features/activity/ActivityFeed.tsx`

**위치**: 약 310-350줄

**수정**: 동일한 로직 적용

```typescript
// 🔥 activities 컬렉션에서 Activity 조회 (전체 데이터)
const activitiesConditions: any[] = [];

// 🔥 전체 커뮤니티 피드: visibility == "public"만 조회
activitiesConditions.push(where("visibility", "==", "public"));

// 🔥 sport 필터 제거 - 클라이언트에서 처리
// 🔥 탭 필터 제거 - 클라이언트에서 처리

// 🔥 정렬, startAfter, 제한 추가
activitiesConditions.push(orderBy("createdAt", "desc"));
activitiesConditions.push(startAfter(currentLastDoc));
activitiesConditions.push(limit(30)); // 더 많은 데이터 가져오기
```

---

### 3. 클라이언트 필터링 (렌더링 전)

**파일**: `src/features/activity/ActivityFeed.tsx`

**위치**: 약 490줄 (렌더링 부분)

**수정**:
```typescript
// 🔥 URL에서 sport 파라미터 읽기
const [searchParams] = useSearchParams();
const sportParam = searchParams.get("sport");

// 🔥 최종 필터링: system 제외 + sport + 탭 필터
const filteredActivities = items
  // 1. system 타입 제외
  .filter((a) => {
    const activityType = (a as any).type || "";
    return activityType !== "system";
  })
  // 2. sport 필터 (URL 파라미터가 있을 때만)
  .filter((a) => {
    if (!sportParam) return true;
    return a.sport === sportParam.toLowerCase().trim();
  })
  // 3. 탭 필터 (refType 기준)
  .filter((a) => {
    if (activeFilter === "all" || activeFilter === "전체") return true;
    if (activeFilter === "market" || activeFilter === "거래") {
      return (a as any).refType === "market";
    }
    if (activeFilter === "team" || activeFilter === "팀") {
      return (a as any).refType === "teams";
    }
    if (activeFilter === "event" || activeFilter === "이벤트") {
      return (a as any).refType === "events";
    }
    return true;
  });

// 🔥 필터링된 데이터 렌더링
{filteredActivities.length === 0 ? (
  <div className="text-center text-gray-400 py-10">
    활동이 없습니다
  </div>
) : (
  <>
    {filteredActivities.map((item) => (
      <ActivityCard key={item.id} item={item} />
    ))}
    
    {/* 무한스크롤 트리거 */}
    {hasMore && (
      <div ref={loadMoreRef} className="py-4 text-center">
        {loadingMore ? (
          <div className="text-sm text-gray-400">더 불러오는 중...</div>
        ) : (
          <div className="text-sm text-gray-400">스크롤하여 더 보기</div>
        )}
      </div>
    )}
  </>
)}
```

---

## 기대 결과

### `/activity` (전체 스포츠)
- 축구 팀
- 배구 공
- 야구 가방
- 축구화

### `/activity?sport=soccer` (축구만)
- 축구 팀
- 축구화

### `/activity?sport=soccer` + 거래 탭
- 축구화

### `/activity?sport=soccer` + 팀 탭
- 야고 축구 FC

---

## Firestore 인덱스

다음 인덱스만 필요합니다 (sport 필터 제거로 인덱스 단순화):

```
Collection: activities
Fields:
  - visibility (Ascending)
  - createdAt (Descending)
```

**복잡한 복합 인덱스 불필요** ✅

---

## 테스트 체크리스트

수정 후 다음을 확인하세요:

- [ ] `/activity`에서 모든 스포츠 Activity 표시
- [ ] `/activity?sport=soccer`에서 축구 Activity만 표시
- [ ] `/activity?sport=soccer` + 거래 탭에서 `refType === "market"`만 표시
- [ ] `/activity?sport=soccer` + 팀 탭에서 `refType === "teams"`만 표시
- [ ] `/activity?sport=soccer` + 이벤트 탭에서 `refType === "events"`만 표시
- [ ] system 타입 Activity는 UI에서 숨김 처리
- [ ] 무한스크롤 정상 작동

---

## 현재 프로젝트 진행 상태

| 기능 | 상태 |
|------|------|
| Home 시스템 | ✅ 완료 |
| Sport 필터 | ✅ 완료 |
| Activity Feed | ⏳ 90% (수정 필요) |
| Activity 필터 | ⏳ 수정 필요 |
| Activity Detail | ⏳ 다음 단계 |
| 댓글 시스템 | ⏳ 다음 단계 |
| 좋아요 시스템 | ⏳ 다음 단계 |

---

## 다음 개발 순서 (강력 추천)

### 1️⃣ Activity Detail
- 경로: `/activity/:id`
- 구성:
  - 제목
  - 이미지
  - 본문
  - 댓글
  - 좋아요
  - 채팅 이동

### 2️⃣ 댓글 시스템
- Firestore 컬렉션: `activityComments`

### 3️⃣ 좋아요 시스템
- Firestore 컬렉션: `activityLikes`

---

## ActivityCard 클릭 동작 확인

**질문**: "지금 Activity 카드 클릭하면 클릭 이동 없음 이 상태냐? 아니면 `/activity/:id` 상세페이지 이동이 이미 있냐?"

**답변**: **클릭 이동 없음**이 아닙니다. 현재는 **원본 게시글로 이동**합니다.

### 현재 동작
- ActivityCard 클릭 시 원본 게시글로 이동
- 예: `/sports/soccer/market/:postId`
- 예: `/sports/soccer/recruit/:postId`
- 예: `/sports/soccer/match/:postId`

### 확인 코드
```typescript
// src/features/activity/ActivityCard.tsx (92-221줄)
const handleClick = () => {
  // collection 기반 라우팅
  switch (collection) {
    case "marketPosts":
      navigate(`/sports/${sport}/market/${postId}`);
      return;
    // ...
  }
  
  // type 기반 라우팅 (fallback)
  switch (item.type) {
    case "equipment_created":
      navigate(`/sports/${sport}/market/${postId}`);
      return;
    // ...
  }
};
```

**`/activity/:id`로 이동하는 코드는 없습니다.**

---

이 지시문을 따라 수정하면 ActivityFeed가 클라이언트 사이드 필터링으로 정상 작동합니다.
