# Cursor 수정 지시문

## 파일

`src/features/activity/ActivityFeed.tsx`

## 문제

현재 Activity 페이지는 `sport` query parameter를 지원해야 합니다.

**URL 예**:
```
/activity?sport=soccer
```

`sport` 값이 있을 경우 Firestore query에 sport 필터를 추가해야 합니다.

---

## 현재 코드 확인

**확인 필요**: 현재 코드에서 `sport` 파라미터를 이미 처리하고 있는지 확인

**예상 위치**: 약 47-51줄 (URL 파라미터 읽기 부분)

---

## 수정 방법

### 1️⃣ URL에서 sport 파라미터 읽기

**위치**: `ActivityFeed.tsx` 상단 (약 47줄)

**현재 코드 확인 필요**:
```typescript
const [searchParams] = useSearchParams();
const sportParam = searchParams.get("sport");
```

**이미 구현되어 있다면**: 다음 단계로 진행

**없다면 추가**:
```typescript
import { useSearchParams } from "react-router-dom";

// 컴포넌트 내부
const [searchParams] = useSearchParams();
const sportParam = searchParams.get("sport");
```

---

### 2️⃣ Firestore 쿼리에 sport 필터 추가

**위치**: `loadInitial` 함수 (약 85줄 근처)

**수정 코드**:

```typescript
const loadInitial = async () => {
  try {
    setLoading(true);
    setError(null);
    setActivities([]);
    setLastDoc(null);

    const activitiesConditions: any[] = [];

    // 🔥 visibility 필터 (항상 적용)
    activitiesConditions.push(where("visibility", "==", "public"));

    // 🔥 sport 필터 추가 (sport 파라미터가 있을 때만)
    const sportParam = searchParams.get("sport");
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

    // 🔥 정렬 및 제한 추가
    activitiesConditions.push(orderBy("createdAt", "desc"));
    activitiesConditions.push(limit(20));

    // 🔥 쿼리 구성
    const activitiesQuery = query(
      collection(db, "activities"),
      ...activitiesConditions
    );

    const snapshot = await getDocs(activitiesQuery);
    
    // ... 기존 처리 로직
  } catch (err: any) {
    // ... 에러 처리
  }
};
```

---

### 3️⃣ loadMore 함수에도 동일 적용

**위치**: `loadMore` 함수 (약 310줄 근처)

**동일한 수정 적용**:

```typescript
const loadMore = async () => {
  // ... 기존 코드

  const activitiesConditions: any[] = [];
  activitiesConditions.push(where("visibility", "==", "public"));

  // 🔥 sport 필터 추가 (sport 파라미터가 있을 때만)
  const sportParam = searchParams.get("sport");
  if (sportParam) {
    activitiesConditions.push(where("sport", "==", sportParam.toLowerCase().trim()));
  }

  // ... 나머지 필터 로직
};
```

---

## 최종 구조 (서비스 구조)

### 홈

```
/home
```

### 스포츠 클릭

```
/activity?sport=soccer
```

### ActivityFeed

```
축구 활동만 표시
```

---

## 최종 구조 (YAGO 서비스)

```
Home
 ├ 스포츠 선택
 │
 ├ 축구
 │    /activity?sport=soccer
 │
 ├ 농구
 │    /activity?sport=basketball
 │
 ├ 배구
 │    /activity?sport=volleyball
 │
 └ 러닝
      /activity?sport=running
```

---

## 📋 작업 체크리스트

- [ ] `ActivityFeed.tsx`에서 `useSearchParams`로 sport 파라미터 읽기
- [ ] `loadInitial` 함수에서 sport 필터 추가
- [ ] `loadMore` 함수에서 sport 필터 추가
- [ ] `/activity?sport=soccer` 접속 시 축구 활동만 표시 확인
- [ ] `/activity` 접속 시 모든 종목 활동 표시 확인

---

## 🔥 다음 작업 (중요)

지금 YAGO 프로젝트에서 다음으로 반드시 해야 할 것:

1. ✅ **sport ActivityFeed 필터 완성** (지금 단계)
2. ✅ **ActivityCard 클릭 라우팅 안정화** (이미 완료)
3. ⏳ **Activity pagination**
4. ⏳ **실시간 Activity (onSnapshot)**

---

이 수정으로 **sport 파라미터 기반 Activity 필터링**이 완성됩니다.
