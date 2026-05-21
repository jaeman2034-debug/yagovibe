# Cursor 수정 지시문

## 파일

`src/features/activity/ActivityFeed.tsx`

## 문제

현재 전체 탭에서 다음과 같은 Firestore 쿼리를 사용하고 있을 가능성이 높습니다:

```typescript
query(
  collection(db, "activities"),
  where("sport", "==", sport),
  where("type", "!=", "system")
)
```

**Firestore 규칙**: `!=` 조건을 사용할 경우 반드시 `orderBy`가 필요합니다.

지금 쿼리가 실패하여 결과가 빈 배열이 되고 있습니다.

---

## 현재 상태 분석

### 화면 상태

| 탭 | 상태 | 원인 |
|---|------|------|
| 전체 | ❌ 활동이 없습니다 | `!=` 쿼리 실패 |
| 거래 | ✅ 공공공 보임 | `==` 쿼리 정상 |
| 팀 | ✅ 야고 축구 FC / 소홀 보임 | `in` 쿼리 정상 |

### 쿼리 비교

| 탭 | 쿼리 조건 | Firestore 규칙 | 결과 |
|---|----------|---------------|------|
| 전체 | `type != "system"` | ❌ `orderBy` 필요 | 실패 |
| 거래 | `type == "equipment_created"` | ✅ 정상 | 성공 |
| 팀 | `type in [...]` | ✅ 정상 | 성공 |

---

## 수정 방법

`!=` 조건을 **Firestore 쿼리에서 제거**하고, 필터는 **클라이언트에서 처리**합니다.

---

### 위치 1: `loadInitial` 함수

**파일**: `src/features/activity/ActivityFeed.tsx`

**위치**: 약 87-102줄

**Before (현재 - 문제 코드)**:
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
  // 🔥 전체 탭: system 타입 제외 (❌ Firestore != 쿼리 실패)
  activitiesConditions.push(where("type", "!=", "system"));
}
```

**After (수정 후)**:
```typescript
// 🔥 탭별 필터 적용 (v1 아키텍처)
if (activeFilter === "all" || activeFilter === "전체") {
  // 🔥 전체 탭: Firestore 쿼리에서는 != 조건 제거
  // 클라이언트에서 system 타입 필터링
  // (where 조건 추가하지 않음)
} else if (activeFilter === "market" || activeFilter === "거래") {
  // 🔥 거래 탭: equipment_created만 표시
  activitiesConditions.push(where("type", "==", "equipment_created"));
} else if (activeFilter === "team" || activeFilter === "팀") {
  // 🔥 팀 탭: team_created + recruit_created
  activitiesConditions.push(where("type", "in", ["team_created", "recruit_created"]));
} else if (activeFilter === "event" || activeFilter === "이벤트") {
  // 이벤트 탭: team_event만
  activitiesConditions.push(where("type", "==", "team_event"));
}
```

---

### 위치 2: 쿼리 결과 처리 (클라이언트 필터링)

**위치**: 약 120줄 근처 (쿼리 실행 후)

**추가 코드**:

```typescript
const activitiesSnap = await getDocs(activitiesQuery);

// 🔥 전체 탭인 경우 클라이언트에서 system 타입 필터링
let filteredDocs = activitiesSnap.docs;
if (activeFilter === "all" || activeFilter === "전체") {
  filteredDocs = activitiesSnap.docs.filter(doc => {
    const data = doc.data();
    return data.type !== "system";
  });
  
  console.log("🔥 [ActivityFeed] 전체 탭 클라이언트 필터링:", {
    totalDocs: activitiesSnap.docs.length,
    filteredDocs: filteredDocs.length,
    systemCount: activitiesSnap.docs.length - filteredDocs.length,
  });
}

// 🔥 필터링된 문서로 Activity 변환
const activitiesListResults = await Promise.allSettled(
  filteredDocs.map(async (d) => {
    // ... 기존 변환 로직
  })
);
```

---

### 위치 3: `loadMore` 함수

**위치**: 약 316-331줄

**동일한 수정 적용**:

```typescript
// 🔥 탭별 필터 적용 (v1 아키텍처)
if (activeFilter === "all" || activeFilter === "전체") {
  // 🔥 전체 탭: Firestore 쿼리에서는 != 조건 제거
  // 클라이언트에서 system 타입 필터링
} else if (activeFilter === "market" || activeFilter === "거래") {
  activitiesConditions.push(where("type", "==", "equipment_created"));
} else if (activeFilter === "team" || activeFilter === "팀") {
  activitiesConditions.push(where("type", "in", ["team_created", "recruit_created"]));
} else if (activeFilter === "event" || activeFilter === "이벤트") {
  activitiesConditions.push(where("type", "==", "team_event"));
}
```

**그리고 쿼리 실행 후**:

```typescript
const activitiesSnap = await getDocs(activitiesQuery);

// 🔥 전체 탭인 경우 클라이언트에서 system 타입 필터링
let filteredDocs = activitiesSnap.docs;
if (activeFilter === "all" || activeFilter === "전체") {
  filteredDocs = activitiesSnap.docs.filter(doc => {
    const data = doc.data();
    return data.type !== "system";
  });
}

// 🔥 필터링된 문서로 Activity 변환
const activitiesListResults = await Promise.allSettled(
  filteredDocs.map(async (d) => {
    // ... 기존 변환 로직
  })
);
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

## 🔵 다음 단계 (중요)

Cursor 로그에서 나온 문제:

```
collection
postId
```

Activity 구조가 지금:

```
refType
refId
```

인데 다음 단계에서 반드시:

```
collection
postId
```

구조로 통일해야 합니다.

**이 작업은 `CURSOR_ACTIVITY_SCHEMA_FIX_PRIORITY.md` 지시문을 참고하세요.**

---

## 📋 작업 체크리스트

- [ ] `ActivityFeed.tsx`의 `loadInitial` 함수에서 `where("type", "!=", "system")` 제거
- [ ] 전체 탭인 경우 클라이언트에서 system 타입 필터링 추가
- [ ] `loadMore` 함수에도 동일한 수정 적용
- [ ] 전체 탭에서 모든 Activity 표시 확인 (system 제외)
- [ ] 브라우저 콘솔에서 쿼리 성공 로그 확인

---

## 🔍 Firestore 인덱스 확인 (선택사항)

만약 `!=` 조건을 계속 사용하고 싶다면, Firestore 인덱스를 생성해야 합니다:

```
Collection: activities
Fields:
  - type (Ascending)
  - createdAt (Descending)
```

하지만 **권장 방법은 클라이언트 필터링**입니다.

---

이 수정으로 **전체 탭에서 Activity가 정상적으로 표시**됩니다.
