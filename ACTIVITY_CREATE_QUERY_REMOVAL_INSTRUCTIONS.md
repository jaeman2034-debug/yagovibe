# 🔴 ActivityCreate 페이지 쿼리 제거 지시문

## 문제

ActivityCreate 페이지에서 ActivityFeed 쿼리가 실행되고 있음.

작성 페이지에서는 목록 쿼리가 실행되면 안 됨.

이로 인해:
- Firestore 인덱스 오류 반복 발생
- 콘솔 무한 로그
- 불필요한 DB 요청 발생
- 성능 저하

---

## 수정 요구

### 1️⃣ ActivityCreate에서 ActivityFeed 관련 코드 제거

다음 항목이 있으면 제거:

- `useEffect` 내부 Firestore query
- `onSnapshot` 구독
- `getDocs` 호출
- `ActivityFeed` import

즉:

```typescript
// ❌ 제거
import ActivityFeed from ...
```

### 2️⃣ ActivityCreate는 폼 전용 페이지로 변경

구조:

```
ActivityCreatePage
 ├ Form
 ├ Submit handler
 └ Redirect after save
```

목록 로드 코드 절대 포함하지 말 것

### 3️⃣ ActivityFeed는 ActivityPage에서만 실행

다음 페이지에서만 허용:

- `/activity` (ActivityFeed 페이지)
- `/activity/feed` (ActivityFeed 페이지)

다른 페이지에서는 쿼리 금지

### 4️⃣ ActivityCreate 진입 시 쿼리 실행 여부 체크

디버그 로그 추가:

```typescript
useEffect(() => {
  console.log("✅ [ScheduleCreatePage] ActivityCreate mounted - 쿼리 실행 없음");
}, []);
```

그리고 Firestore 호출 로그가 없는지 확인

---

## 확인된 파일

### ✅ ScheduleCreatePage.tsx
- 현재 상태: ActivityFeed 쿼리 없음 ✅
- 디버그 로그 추가 완료 ✅

### 확인 필요 파일
다음 파일들도 확인 필요:

- `src/pages/activity/ActivityRouter.tsx` - 라우터에서 ActivityFeed import 확인
- `src/pages/activity/EventsPage.tsx` - ActivityFeed 쿼리 확인
- `src/pages/activity/ScheduleDetailPage.tsx` - ActivityFeed 쿼리 확인

---

## 수정 체크리스트

- [x] ScheduleCreatePage 디버그 로그 추가
- [ ] ActivityRouter에서 ActivityFeed import 확인
- [ ] EventsPage에서 ActivityFeed 쿼리 확인
- [ ] ScheduleDetailPage에서 ActivityFeed 쿼리 확인
- [ ] 모든 Activity 관련 페이지에서 불필요한 쿼리 제거

---

## 기대 결과

수정 후:

- ✅ FAB 클릭 → ActivityCreate 이동
- ✅ 콘솔 Firestore 오류 없음
- ✅ DB 요청 없음
- ✅ 폼만 표시

---

## 다음 단계

원하면 다음 단계로:
👉 "Activity 저장 → ActivityFeed 자동 반영 구조" 설계
