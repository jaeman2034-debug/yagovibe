# ActivityFeed 필터 로직 수정 지시문

## 문제

현재 ActivityFeed에서 탭 필터가 `type` 기준으로 동작하고 있습니다.

하지만 Firestore `activities` 문서는 다음 구조를 사용합니다:

- `refType: "market"`
- `refType: "teams"`
- `refType: "events"`

따라서 ActivityFeed의 탭 필터 기준을 `refType`으로 수정해야 합니다.

---

## 수정해야 할 필터 로직

### 파일: `src/features/activity/ActivityFeed.tsx`

### 현재 코드 (문제 코드)

**Firestore 쿼리 조건**:
```typescript
if (activeFilter === "market" || activeFilter === "거래") {
  activitiesConditions.push(where("type", "==", "equipment_created"));
} else if (activeFilter === "team" || activeFilter === "팀") {
  activitiesConditions.push(where("type", "in", ["team_created", "recruit_created"]));
} else if (activeFilter === "event" || activeFilter === "이벤트") {
  activitiesConditions.push(where("type", "==", "team_event"));
}
```

---

### 수정 코드

**Firestore 쿼리 조건**:
```typescript
if (activeFilter === "market" || activeFilter === "거래") {
  // 🔥 거래 탭: refType === "market"
  activitiesConditions.push(where("refType", "==", "market"));
} else if (activeFilter === "team" || activeFilter === "팀") {
  // 🔥 팀 탭: refType === "teams"
  activitiesConditions.push(where("refType", "==", "teams"));
} else if (activeFilter === "event" || activeFilter === "이벤트") {
  // 이벤트 탭: refType === "events"
  activitiesConditions.push(where("refType", "==", "events"));
}
```

**전체 탭**:
```typescript
if (activeFilter === "all" || activeFilter === "전체") {
  // 🔥 전체 탭: system 타입 제외 (클라이언트에서 필터링)
  // Firestore 쿼리에서는 != 조건 제거 (인덱스 문제 방지)
} else {
  // 위의 탭별 필터 적용
}
```

---

## sport 필터 유지

ActivityFeed는 다음 조건으로 Firestore 조회해야 합니다:

```typescript
where("sport", "==", sportParam)
```

**예**:
```
/activity?sport=soccer
```

**쿼리**:
```typescript
query(
  collection(db, "activities"),
  where("visibility", "==", "public"),
  where("sport", "==", sportParam),
  where("refType", "==", "market"), // 탭 필터
  orderBy("createdAt", "desc"),
  limit(20)
)
```

---

## 기대 결과

### `/activity?sport=soccer`

#### 전체 탭
- 야고 축구 FC
- 축구화
- init (system 타입은 클라이언트에서 필터링)

#### 거래 탭
- 축구화
- init (system 타입은 클라이언트에서 필터링)

#### 팀 탭
- 야고 축구 FC

#### 이벤트 탭
- 없음

---

## 수정 위치

### 1. 초기 로드 쿼리 (useEffect 내부)

**파일**: `src/features/activity/ActivityFeed.tsx`

**위치**: 약 88-102줄

**수정**:
```typescript
// 🔥 탭별 필터 적용 (refType 기준)
if (activeFilter !== "all" && activeFilter !== "전체") {
  if (activeFilter === "market" || activeFilter === "거래") {
    // 🔥 거래 탭: refType === "market"
    activitiesConditions.push(where("refType", "==", "market"));
  } else if (activeFilter === "team" || activeFilter === "팀") {
    // 🔥 팀 탭: refType === "teams"
    activitiesConditions.push(where("refType", "==", "teams"));
  } else if (activeFilter === "event" || activeFilter === "이벤트") {
    // 이벤트 탭: refType === "events"
    activitiesConditions.push(where("refType", "==", "events"));
  }
} else {
  // 🔥 전체 탭: system 타입 제외 (클라이언트에서 필터링)
  // Firestore 쿼리에서는 != 조건 제거 (인덱스 문제 방지)
}
```

---

### 2. 무한스크롤 쿼리 (loadMore 함수 내부)

**파일**: `src/features/activity/ActivityFeed.tsx`

**위치**: 약 317-331줄

**수정**: 동일한 로직 적용

```typescript
// 🔥 탭별 필터 적용 (refType 기준)
if (activeFilter !== "all" && activeFilter !== "전체") {
  if (activeFilter === "market" || activeFilter === "거래") {
    // 🔥 거래 탭: refType === "market"
    activitiesConditions.push(where("refType", "==", "market"));
  } else if (activeFilter === "team" || activeFilter === "팀") {
    // 🔥 팀 탭: refType === "teams"
    activitiesConditions.push(where("refType", "==", "teams"));
  } else if (activeFilter === "event" || activeFilter === "이벤트") {
    // 이벤트 탭: refType === "events"
    activitiesConditions.push(where("refType", "==", "events"));
  }
} else {
  // 🔥 전체 탭: system 타입 제외 (클라이언트에서 필터링)
  // Firestore 쿼리에서는 != 조건 제거 (인덱스 문제 방지)
}
```

---

## 클라이언트 필터링 (system 타입 제외)

**파일**: `src/features/activity/ActivityFeed.tsx`

**위치**: 약 500줄 (렌더링 부분)

**현재 코드**:
```typescript
{items
  .filter((activity) => activity.type !== "system")
  .map((item) => (
    <ActivityCard key={item.id} item={item} />
  ))}
```

**수정 코드** (타입 안전성 개선):
```typescript
{items
  .filter((activity) => {
    // system 타입 제외 (클라이언트 필터링)
    const activityType = (activity as any).type || "";
    return activityType !== "system";
  })
  .map((item) => (
    <ActivityCard key={item.id} item={item} />
  ))}
```

---

## Firestore 인덱스 확인

다음 인덱스가 필요합니다:

### 거래 탭
```
Collection: activities
Fields:
  - visibility (Ascending)
  - sport (Ascending)
  - refType (Ascending)
  - createdAt (Descending)
```

### 팀 탭
```
Collection: activities
Fields:
  - visibility (Ascending)
  - sport (Ascending)
  - refType (Ascending)
  - createdAt (Descending)
```

### 이벤트 탭
```
Collection: activities
Fields:
  - visibility (Ascending)
  - sport (Ascending)
  - refType (Ascending)
  - createdAt (Descending)
```

---

## 테스트 체크리스트

수정 후 다음을 확인하세요:

- [ ] `/activity?sport=soccer` 전체 탭에서 모든 Activity 표시
- [ ] `/activity?sport=soccer` 거래 탭에서 `refType === "market"`만 표시
- [ ] `/activity?sport=soccer` 팀 탭에서 `refType === "teams"`만 표시
- [ ] `/activity?sport=soccer` 이벤트 탭에서 `refType === "events"`만 표시
- [ ] system 타입 Activity는 UI에서 숨김 처리
- [ ] sport 필터가 모든 탭에서 정상 작동

---

## 현재 프로젝트 진행 상태

| 기능 | 상태 |
|------|------|
| Home 시스템 | ✅ 완료 |
| Sport 필터 | ✅ 완료 |
| Activity Feed | ✅ 완료 |
| Activity 탭 필터 | ⏳ 수정 필요 |
| Activity Detail | ⏳ 다음 단계 |
| 댓글 시스템 | ⏳ 다음 단계 |
| 좋아요 기능 | ⏳ 다음 단계 |

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

이 지시문을 따라 수정하면 ActivityFeed 필터가 `refType` 기준으로 정상 작동합니다.
