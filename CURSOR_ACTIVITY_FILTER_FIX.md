# Cursor 수정 지시문

## 파일

`src/features/activity/ActivityFeed.tsx`

## 문제

Activity 필터 로직을 수정한다.

현재 전체 탭에서 Activity가 표시되지 않는 문제는 **all 탭에서 필터 조건이 잘못 적용되기 때문**이다.

---

## 기존 코드 (문제 코드)

```typescript
// ❌ 문제 코드 예시
if (tab === "all") {
  return activity.type === "all"; // 잘못된 조건
}

// 또는

if (tab === "all") {
  return false; // 모든 Activity를 제외함
}
```

---

## 수정 코드

### 필터 함수 구조

```typescript
function filterActivity(activity: any, tab: string): boolean {
  if (tab === "all" || tab === "전체") {
    // 🔥 전체 탭: system 타입만 제외
    return activity.type !== "system";
  }

  if (tab === "market" || tab === "거래") {
    // 🔥 거래 탭: equipment_created만 표시
    return activity.type === "equipment_created";
  }

  if (tab === "team" || tab === "팀") {
    // 🔥 팀 탭: team_created + recruit_created
    return activity.type === "team_created" || activity.type === "recruit_created";
  }

  if (tab === "event" || tab === "이벤트") {
    // 🔥 이벤트 탭: team_event만
    return activity.type === "team_event";
  }

  // 기본값: 모든 Activity 표시 (system 제외)
  return activity.type !== "system";
}
```

---

## 필터 기준

| 탭 | 표시 Activity |
|---|--------------|
| **전체** | 모든 Activity (system 제외) |
| **거래** | equipment_created |
| **팀** | team_created + recruit_created |
| **이벤트** | team_event |

---

## 실제 코드 수정 위치

### 위치 1: `loadInitial` 함수

**파일**: `src/features/activity/ActivityFeed.tsx`

**위치**: 약 85-110줄

**수정 코드**:

```typescript
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
  // 🔥 전체 탭: system 타입만 제외 (모든 Activity 표시)
  activitiesConditions.push(where("type", "!=", "system"));
}
```

---

### 위치 2: `loadMore` 함수

**파일**: `src/features/activity/ActivityFeed.tsx`

**위치**: 약 310-335줄

**동일한 필터 로직 적용**:

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
```

---

## 수정 후 정상 결과

### 전체 탭 (`/activity?sport=soccer`)

```
공공공 (equipment_created)
야고 축구 FC (recruit_created)
소홀 (team_created)
```

---

### 거래 탭

```
공공공 (equipment_created만)
```

---

### 팀 탭

```
야고 축구 FC (recruit_created)
소홀 (team_created)
```

---

## 🔵 다음 단계 (예상되는 다음 버그)

지금 Activity 구조 보면 **100% 다음 문제 생긴다**:

**Activity 클릭 → 상세 페이지 오류**

왜냐면:
- `postId` / `collection` 라우팅 확인 필요

---

## 🔥 Activity 데이터 구조 확인

### 현재 Activity 데이터 구조가 이것 맞냐?

**Firestore `activities` 컬렉션**:

```typescript
{
  type: string              // "equipment_created" | "recruit_created" | ...
  sport: string             // "soccer" | "basketball" | ...
  collection?: string       // "marketPosts" | "recruitPosts" | "matchPosts"
  postId?: string           // 게시글 ID
  // ... 기타 필드
}
```

**예시**:

```json
{
  "type": "equipment_created",
  "sport": "soccer",
  "collection": "marketPosts",
  "postId": "abc123"
}
```

**맞으면** 다음 단계에서 **Activity 클릭 라우팅 오류까지 한번에 잡아준다.** 🚀

---

## 📋 작업 체크리스트

- [ ] `ActivityFeed.tsx`의 `loadInitial` 함수 필터 로직 수정
- [ ] `ActivityFeed.tsx`의 `loadMore` 함수 필터 로직 수정
- [ ] 전체 탭에서 모든 Activity 표시 확인 (system 제외)
- [ ] 거래 탭에서 equipment_created만 표시 확인
- [ ] 팀 탭에서 team_created + recruit_created 표시 확인

---

이 수정으로 **전체 탭에서 Activity가 정상적으로 표시**됩니다.
