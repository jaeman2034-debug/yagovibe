# 🔴 ActivityCreate 페이지 쿼리 제거 지시문 (최종)

## 문제

ActivityCreate 페이지에서 ActivityFeed 쿼리가 실행되고 있음.

작성 페이지에서는 목록 쿼리가 실행되면 안 됨.

이로 인해:
- Firestore 인덱스 오류 반복 발생
- 콘솔 무한 로그
- 불필요한 DB 요청 발생
- 성능 저하

---

## ✅ 확인 완료

### ScheduleCreatePage.tsx
- ✅ ActivityFeed 쿼리 없음
- ✅ 디버그 로그 추가 완료

### ScheduleDetailPage.tsx
- ✅ ActivityFeed 쿼리 없음
- ✅ 일정 상세 조회만 수행 (정상)

### EventsPage.tsx
- ✅ ActivityFeed 쿼리 없음
- ✅ 일정 목록 조회만 수행 (정상)

---

## 📋 수정 지시

### 1️⃣ ActivityCreate에서 ActivityFeed 관련 코드 제거

다음 항목이 있으면 제거:

- `useEffect` 내부 Firestore query (activityLogs 조회)
- `onSnapshot` 구독 (activityLogs 구독)
- `getDocs` 호출 (activityLogs 조회)
- `ActivityFeed` import

즉:

```typescript
// ❌ 제거
import ActivityFeed from "@/features/activity/ActivityFeed";
import ActivityFeedComponent from "@/features/activity/ActivityFeed";

// ❌ 제거
useEffect(() => {
  const q = query(collection(db, "activityLogs"), ...);
  const snap = await getDocs(q);
  // ...
}, []);

// ❌ 제거
useEffect(() => {
  const unsubscribe = onSnapshot(
    query(collection(db, "activityLogs"), ...),
    (snap) => { ... }
  );
  return () => unsubscribe();
}, []);
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

## 🔍 확인 방법

### 브라우저 콘솔 확인

1. FAB 클릭 → ActivityCreate 이동
2. 콘솔 확인:
   - ✅ `[ScheduleCreatePage] ActivityCreate mounted` 로그 확인
   - ❌ `[ActivityFeed]` 로그 없어야 함
   - ❌ `activityLogs` 쿼리 로그 없어야 함
   - ❌ Firestore 인덱스 오류 없어야 함

### Network 탭 확인

1. ActivityCreate 페이지 진입
2. Network 탭 → Firestore 필터
3. 확인:
   - ❌ `activityLogs` 컬렉션 요청 없어야 함
   - ✅ `teams`, `teamSchedules` 등 필요한 요청만 있어야 함

---

## 📋 최종 확인 체크리스트

개발자는 아래 항목 전부 확인할 것:

- [x] ScheduleCreatePage 디버그 로그 추가 완료
- [ ] ScheduleCreatePage에서 ActivityFeed import 제거 (없으면 스킵)
- [ ] ScheduleCreatePage에서 activityLogs 쿼리 제거 (없으면 스킵)
- [ ] 브라우저 콘솔에서 Firestore 오류 확인
- [ ] Network 탭에서 불필요한 요청 확인

---

## 🎯 기대 결과

수정 후:

- ✅ FAB 클릭 → ActivityCreate 이동
- ✅ 콘솔 Firestore 오류 없음
- ✅ DB 요청 없음 (필요한 요청만)
- ✅ 폼만 표시

---

## ⚠️ 주의사항

- ActivityCreate는 **작성 전용** 페이지
- 목록 조회는 `/activity/feed`에서만 수행
- 작성 완료 후 ActivityFeed로 리다이렉트하면 자동 반영됨

---

## 다음 단계

원하면 다음 단계로:
👉 "Activity 저장 → ActivityFeed 자동 반영 구조" 설계
