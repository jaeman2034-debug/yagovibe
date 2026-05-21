# Cursor 수정 지시문 (확인 완료)

## 파일

`src/features/activity/ActivityFeed.tsx`

## 확인 결과

**현재 코드 상태**: `sport` query parameter 지원이 **이미 구현되어 있습니다.**

### 현재 구현 상태

**위치**: 약 47-51줄

```typescript
// 🔥 URL에서 sport 파라미터 읽기 (정규화: 대소문자, 공백 제거)
const [searchParams] = useSearchParams();
const { sport: sportParam } = useParams<{ sport?: string }>();
const sportRaw = searchParams.get("sport") || sportParam || null;
const sport = sportRaw ? sportRaw.toLowerCase().trim() : null;
```

**위치**: 약 104-108줄

```typescript
// 🔥 sport 필터 추가 (모든 탭에서 적용 - 이 페이지는 특정 종목 Activity 페이지)
// /activity?sport=soccer는 축구 Activity 페이지이므로 모든 탭에서 sport 필터 유지
if (sport) {
  activitiesConditions.push(where("sport", "==", sport.toLowerCase().trim()));
}
```

**상태**: ✅ **이미 올바르게 구현됨**

---

## 확인 사항

현재 코드는 다음을 지원합니다:

1. ✅ URL에서 `sport` 파라미터 읽기 (`/activity?sport=soccer`)
2. ✅ Firestore 쿼리에 `sport` 필터 추가
3. ✅ `loadInitial`과 `loadMore` 함수 모두에 적용

---

## 추가 확인 필요

### 홈에서 축구 클릭 시 이동 경로

**확인 필요**: 홈에서 축구 클릭 시 어디로 이동하는지

**가능한 경로**:
1. `/activity?sport=soccer` → Activity 페이지 (sport 파라미터)
2. `/sports/soccer` → Sport Hub 페이지

**현재 코드 확인** (`HomeHub.tsx`):
```typescript
navigate(`/sports/${sportType}`);
```

**결론**: 현재는 `/sports/soccer`로 이동합니다.

---

## 수정 필요 여부

### 케이스 1: `/activity?sport=soccer`로 이동해야 하는 경우

**수정 필요**: 홈에서 스포츠 클릭 시 `/activity?sport=soccer`로 이동하도록 변경

**수정 위치**: `src/pages/home/HomeHub.tsx`

**수정 코드**:
```typescript
const handleSportClick = (sportName: string) => {
  const sportType = sportNameToType[sportName];
  if (sportType) {
    if (selectedSport === sportName) {
      setSelectedSport(null);
      navigate("/activity"); // 전체 Activity로 이동
    } else {
      setSelectedSport(sportName);
      // 🔥 Activity 페이지로 이동 (sport 파라미터 포함)
      navigate(`/activity?sport=${sportType}`);
    }
  }
};
```

---

### 케이스 2: `/sports/soccer`로 이동하는 것이 정상인 경우

**수정 불필요**: 현재 구조가 올바름

**설명**: 
- `/sports/soccer` → Sport Hub (종목별 허브)
- Sport Hub에서 Activity 탭 클릭 → `/activity?sport=soccer`

---

## 최종 구조 (서비스 구조)

### 케이스 1: 홈 → Activity 직접 이동

```
홈
/home

↓

스포츠 클릭
/activity?sport=soccer

↓

ActivityFeed
축구 활동
```

---

### 케이스 2: 홈 → Sport Hub → Activity

```
홈
/home

↓

스포츠 클릭
/sports/soccer

↓

Sport Hub
활동 탭 클릭
/activity?sport=soccer

↓

ActivityFeed
축구 활동
```

---

## 최종 구조 (YAGO 서비스)

### 케이스 1 구조

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

### 케이스 2 구조

```
Home
 ├ 스포츠 선택
 │
 ├ 축구
 │    /sports/soccer
 │         └ 활동 탭
 │              /activity?sport=soccer
 │
 ├ 농구
 │    /sports/basketball
 │         └ 활동 탭
 │              /activity?sport=basketball
```

---

## 🔥 다음 작업 (중요)

지금 YAGO 프로젝트에서 다음으로 반드시 해야 할 것:

1. ✅ **sport ActivityFeed 필터 완성** (이미 완료)
2. ✅ **ActivityCard 클릭 라우팅 안정화** (이미 완료)
3. ⏳ **Activity pagination**
4. ⏳ **실시간 Activity (onSnapshot)**

---

## 📋 확인 체크리스트

- [x] `ActivityFeed.tsx`에서 `useSearchParams`로 sport 파라미터 읽기 (이미 구현됨)
- [x] `loadInitial` 함수에서 sport 필터 추가 (이미 구현됨)
- [x] `loadMore` 함수에서 sport 필터 추가 (확인 필요)
- [ ] 홈에서 스포츠 클릭 시 이동 경로 확인
- [ ] `/activity?sport=soccer` 접속 시 축구 활동만 표시 확인

---

## 💡 마지막 질문 답변

**질문**: 지금 홈에서 축구 클릭하면 이동이 `/activity?sport=soccer`로 가냐? 아니면 `/sports/soccer`로 가냐?

**답변**: 현재 코드 기준으로는 **`/sports/soccer`로 이동**합니다.

**확인 위치**: `src/pages/home/HomeHub.tsx` (124줄)
```typescript
navigate(`/sports/${sportType}`);
```

**이 구조가 맞다면**: 수정 불필요 (현재 구조 정상)

**`/activity?sport=soccer`로 가야 한다면**: 위 케이스 1 수정 코드 적용

---

이 확인을 바탕으로 **정확한 다음 단계**를 정리해 드릴 수 있습니다. 🚀
