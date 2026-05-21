# Cursor 수정 지시문

## 파일

`src/features/activity/ActivityFeed.tsx`

## 문제

현재 Activity 필터 로직에서 **전체(all) 탭 조건이 빠져있어 Activity가 모두 제거되고 있습니다.**

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

가능한 원인:

1. **쿼리 조건이 잘못 적용됨**: `activeFilter === "all"`일 때 조건이 제대로 작동하지 않음
2. **클라이언트 사이드 필터링**: 쿼리 결과를 받은 후 추가 필터링이 있어서 모든 Activity가 제거됨
3. **데이터 문제**: Activity 데이터의 `type` 필드가 예상과 다름

---

## 수정 방법

### 방법 1: Firestore 쿼리 조건 명확화 (권장)

**파일**: `src/features/activity/ActivityFeed.tsx`

**위치**: `loadInitial` 함수 (약 87줄) 및 `loadMore` 함수 (약 316줄)

**수정 코드**:

```typescript
// 🔥 탭별 필터 적용 (v1 아키텍처)
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

**변경 사항**:
- `if (activeFilter !== "all")` → `if (activeFilter === "all")`로 변경
- 전체 탭 조건을 **먼저 처리**하도록 수정

---

### 방법 2: 디버그 로그 추가 (문제 진단용)

**위치**: 쿼리 실행 후 (약 114줄 근처)

**추가 코드**:

```typescript
const snapshot = await getDocs(activitiesQuery);

// 🔥 디버그 로그 추가
console.log("🔥 [ActivityFeed] query results:", {
  activeFilter,
  sport,
  queryConditions: activitiesConditions.map(c => {
    if (c.type === "where") {
      return `where(${c.fieldPath}, ${c.opStr}, ${c.value})`;
    }
    return c.toString();
  }),
  resultCount: snapshot.size,
  activities: snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      type: data.type,
      sport: data.sport,
      title: data.title,
    };
  }),
});

if (snapshot.empty) {
  console.warn("⚠️ [ActivityFeed] 조회된 문서가 없습니다. 필터 조건을 확인하세요.");
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

## 추가 확인 사항

### 1. Activity 데이터 확인

Firebase Console에서 `activities` 컬렉션 확인:

- `type` 필드가 올바른지 확인
- `sport` 필드가 올바른지 확인
- `visibility: "public"`인지 확인

### 2. 쿼리 조건 확인

브라우저 콘솔에서 다음 로그 확인:

```
🔥 [ActivityFeed] query results: {
  activeFilter: "all",
  resultCount: 0,  // ← 이게 0이면 문제
  activities: []
}
```

---

## 🔵 다음 단계 (예상되는 다음 문제)

지금 Cursor 로그 보면:

```
collection/postId 추가 필요
```

즉 지금 구조는:

```
refType
refId
```

기반이라 다음 문제 반드시 생깁니다:

```
Activity 클릭 → 상세페이지 오류
```

---

## 🔥 다음 단계: Activity 구조 통일

Activity 구조를 이걸로 통일해야 합니다:

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
- [ ] 디버그 로그 추가
- [ ] 전체 탭에서 모든 Activity 표시 확인 (system 제외)
- [ ] Firebase Console에서 Activity 데이터 확인

---

이 수정으로 **전체 탭에서 Activity가 정상적으로 표시**됩니다.
