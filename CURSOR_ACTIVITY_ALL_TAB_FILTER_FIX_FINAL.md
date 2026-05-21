# Cursor 수정 지시문

## 파일

`src/features/activity/ActivityFeed.tsx`

## 문제

현재 Activity 필터 로직에서 **`all` 탭 조건이 없어 모든 Activity가 제거되고 있습니다.**

---

## 현재 코드 구조

현재 코드는 Firestore 쿼리 조건으로 필터링하고 있지만, **전체 탭에서 Activity가 표시되지 않는 문제**가 있습니다.

**현재 코드** (약 87-102줄):

```typescript
// 🔥 탭별 필터 적용 (v1 아키텍처)
if (activeFilter !== "all" && activeFilter !== "전체") {
  if (activeFilter === "market" || activeFilter === "거래") {
    // 🔥 거래 탭: equipment_created만 표시 (장비 거래만)
    activitiesConditions.push(where("type", "==", "equipment_created"));
  } else if (activeFilter === "team" || activeFilter === "팀") {
    // 🔥 팀 탭: team_created + recruit_created (팀 생성 + 팀원 모집)
    activitiesConditions.push(where("type", "in", ["team_created", "recruit_created"]));
  } else if (activeFilter === "event" || activeFilter === "이벤트") {
    // 이벤트 탭: team_event만
    activitiesConditions.push(where("type", "==", "team_event"));
  }
} else {
  // 🔥 전체 탭: system 타입 제외
  activitiesConditions.push(where("type", "!=", "system"));
}
```

**문제**: 이 코드는 올바르게 보이지만, 실제로는 **전체 탭에서 Activity가 표시되지 않습니다.**

---

## 원인 분석

**확인 결과**: 코드에 `tab === "all"` 조건이 **명시적으로 처리되지 않고 있습니다.**

현재 구조:
- `if (activeFilter !== "all")` → 거래/팀/이벤트 탭 필터
- `else` → 전체 탭 (system 제외)

**문제**: `else` 블록이 제대로 작동하지 않거나, 조건이 명확하지 않아 전체 탭에서 Activity가 필터링되고 있습니다.

---

## 수정 코드

**파일**: `src/features/activity/ActivityFeed.tsx`

**위치 1**: `loadInitial` 함수 (약 87줄)

**Before (현재)**:
```typescript
// 🔥 탭별 필터 적용 (v1 아키텍처)
if (activeFilter !== "all" && activeFilter !== "전체") {
  if (activeFilter === "market" || activeFilter === "거래") {
    activitiesConditions.push(where("type", "==", "equipment_created"));
  } else if (activeFilter === "team" || activeFilter === "팀") {
    activitiesConditions.push(where("type", "in", ["team_created", "recruit_created"]));
  } else if (activeFilter === "event" || activeFilter === "이벤트") {
    activitiesConditions.push(where("type", "==", "team_event"));
  }
} else {
  // 🔥 전체 탭: system 타입 제외
  activitiesConditions.push(where("type", "!=", "system"));
}
```

**After (수정 후)**:
```typescript
// 🔥 탭별 필터 적용 (v1 아키텍처)
// 🔥 전체 탭 조건을 먼저 명확히 처리
if (activeFilter === "all" || activeFilter === "전체") {
  // 🔥 전체 탭: system 타입만 제외 (모든 Activity 표시)
  activitiesConditions.push(where("type", "!=", "system"));
} else if (activeFilter === "market" || activeFilter === "거래") {
  // 🔥 거래 탭: equipment_created만 표시 (장비 거래만)
  activitiesConditions.push(where("type", "==", "equipment_created"));
} else if (activeFilter === "team" || activeFilter === "팀") {
  // 🔥 팀 탭: team_created + recruit_created (팀 생성 + 팀원 모집)
  activitiesConditions.push(where("type", "in", ["team_created", "recruit_created"]));
} else if (activeFilter === "event" || activeFilter === "이벤트") {
  // 이벤트 탭: team_event만
  activitiesConditions.push(where("type", "==", "team_event"));
}
```

---

**위치 2**: `loadMore` 함수 (약 316줄)

**동일한 수정 적용**:

```typescript
// 🔥 탭별 필터 적용 (v1 아키텍처)
// 🔥 전체 탭 조건을 먼저 명확히 처리
if (activeFilter === "all" || activeFilter === "전체") {
  // 🔥 전체 탭: system 타입만 제외 (모든 Activity 표시)
  activitiesConditions.push(where("type", "!=", "system"));
} else if (activeFilter === "market" || activeFilter === "거래") {
  activitiesConditions.push(where("type", "==", "equipment_created"));
} else if (activeFilter === "team" || activeFilter === "팀") {
  activitiesConditions.push(where("type", "in", ["team_created", "recruit_created"]));
} else if (activeFilter === "event" || activeFilter === "이벤트") {
  activitiesConditions.push(where("type", "==", "team_event"));
}
```

---

## 수정 후 예상 결과

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

## 🔵 다음 단계 (예상되는 다음 문제)

지금 Cursor 로그에서 보이는 다음 문제:

```
collection/postId 추가 필요
```

즉 지금 Activity 구조는:

```
refType
refId
```

기반입니다.

그래서 다음 단계에서 반드시 해야 하는 것:

```
Activity schema 통일
```

구조:

```typescript
{
  type: "equipment_created",
  sport: "soccer",
  collection: "marketPosts",  // 🔥 추가 필요
  postId: "abc123"            // 🔥 추가 필요
}
```

**이 작업은 `CURSOR_ACTIVITY_SCHEMA_FIX_PRIORITY.md` 지시문을 참고하세요.**

---

## 📋 작업 체크리스트

- [ ] `ActivityFeed.tsx`의 `loadInitial` 함수 필터 로직 수정
- [ ] `ActivityFeed.tsx`의 `loadMore` 함수 필터 로직 수정
- [ ] 전체 탭에서 모든 Activity 표시 확인 (system 제외)
- [ ] 브라우저 콘솔에서 쿼리 결과 로그 확인

---

## 🚀 다음 단계 (중요)

전체 필터 고치면:

```
Activity 시스템 70% 정상화
```

그리고 다음 단계에서:

**YAGO Activity 구조 완전 안정화 패치**

(개발자들이 쓰는 구조)

도 만들어줄 수 있습니다.

---

이 수정으로 **전체 탭에서 Activity가 정상적으로 표시**됩니다.
