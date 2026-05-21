# Cursor 수정 지시문

## 파일

`src/features/activity/ActivityFeed.tsx`

## 문제

현재 전체 탭에서 다음과 같은 Firestore 쿼리를 사용하고 있습니다:

```typescript
where("type", "!=", "system")
```

**Firestore 규칙**: `!=` 조건을 사용할 경우 반드시 `orderBy("type")`가 필요합니다.

현재 `orderBy`가 없어 쿼리가 실패하고 결과가 빈 배열이 됩니다.

---

## 확인 결과

**코드 확인 결과**: `where("type", "!=", "system")` 코드가 **2곳에 존재합니다.**

1. **101줄**: `loadInitial` 함수
2. **330줄**: `loadMore` 함수

---

## 수정 방법 (추천)

`!=` 조건을 **Firestore 쿼리에서 제거**하고, 필터는 **클라이언트에서 처리**합니다.

---

### 수정 1: loadInitial 함수 (87-102줄)

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

### 수정 2: 쿼리 결과 처리 (클라이언트 필터링)

**위치**: 약 120줄 근처 (쿼리 실행 후)

**Before (현재)**:
```typescript
const activitiesSnap = await getDocs(activitiesQuery);

// 🔥 activities 문서를 Activity 형식으로 변환
const activitiesListResults = await Promise.allSettled(
  activitiesSnap.docs.map(async (d) => {
    // ... 변환 로직
  })
);
```

**After (수정 후)**:
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

### 수정 3: loadMore 함수 (316-331줄)

**Before (현재 - 문제 코드)**:
```typescript
if (activeFilter !== "all" && activeFilter !== "전체") {
  // ... 거래/팀/이벤트 탭 필터
} else {
  // 🔥 전체 탭: system 타입 제외 (❌ Firestore != 쿼리 실패)
  activitiesConditions.push(where("type", "!=", "system"));
}
```

**After (수정 후)**:
```typescript
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

**그리고 쿼리 실행 후** (약 349줄 근처):

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

## 📋 작업 체크리스트

- [ ] `loadInitial` 함수에서 `where("type", "!=", "system")` 제거
- [ ] `loadInitial` 함수에서 전체 탭인 경우 클라이언트 필터링 추가
- [ ] `loadMore` 함수에서 `where("type", "!=", "system")` 제거
- [ ] `loadMore` 함수에서 전체 탭인 경우 클라이언트 필터링 추가
- [ ] 전체 탭에서 모든 Activity 표시 확인 (system 제외)
- [ ] 브라우저 콘솔에서 쿼리 성공 로그 확인

---

## 🔍 확인 사항

수정 후 브라우저 콘솔에서 다음 로그를 확인하세요:

```
🔥 [ActivityFeed] 전체 탭 클라이언트 필터링: {
  totalDocs: 3,
  filteredDocs: 3,
  systemCount: 0
}
```

이 로그가 나타나면 **수정이 성공**한 것입니다.

---

이 수정으로 **전체 탭에서 Activity가 정상적으로 표시**됩니다.
