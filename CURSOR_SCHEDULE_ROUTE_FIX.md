# 🔥 Cursor 개발자 수정 지시문: Schedule 라우트 404 수정

## 📋 문제

`/sports/soccer/schedule/write` 경로로 이동 시 404 에러 발생.

**원인**: React Router에 해당 경로가 등록되지 않음.

---

## ✅ 수정 방법

### 옵션 1: 라우트 추가 (권장)

`App.tsx`에 다음 라우트를 추가:

```tsx
// ScheduleCreatePage import 추가 (이미 있으면 생략)
const ScheduleCreatePage = lazy(() => import("./pages/activity/ScheduleCreatePage"));

// 라우트 추가
<Route 
  path="/sports/:sport/schedule/write" 
  element={
    <ProtectedRoute>
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>}>
        <ScheduleCreatePage />
      </Suspense>
    </ProtectedRoute>
  } 
/>
```

### 옵션 2: CreateModal 경로 수정

만약 실제 경로가 `/activity/schedule/create`라면:

```tsx
// CreateModal.tsx
path: `/activity/schedule/create?sport=${currentSport}`,
```

---

## 🔍 확인 사항

### 1. ScheduleCreatePage 위치 확인
- 파일: `src/pages/activity/ScheduleCreatePage.tsx`
- 이 파일이 존재하는지 확인

### 2. 라우트 등록 확인
- `App.tsx`에서 `/sports/:sport/schedule/write` 라우트가 있는지 확인
- 없으면 추가 필요

### 3. CreateModal 경로 확인
- 현재: `/sports/${sport}/schedule/write`
- 실제 라우트와 일치하는지 확인

---

## 📋 수정 체크리스트

- [ ] `ScheduleCreatePage` import 확인
- [ ] `/sports/:sport/schedule/write` 라우트 추가
- [ ] `ProtectedRoute`로 감싸기
- [ ] `Suspense` fallback 추가
- [ ] CreateModal 경로와 일치하는지 확인

---

## 🚀 빠른 수정 (App.tsx)

다음 코드를 `/sports/:sport/market/:postId` 라우트 근처에 추가:

```tsx
{/* 🔥 일정 작성 페이지 */}
<Route 
  path="/sports/:sport/schedule/write" 
  element={
    <ProtectedRoute>
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>}>
        <ScheduleCreatePage />
      </Suspense>
    </ProtectedRoute>
  } 
/>
```

---

## ⚠️ 참고사항

### 기존 일정 관련 라우트
- `/sports/{type}/team/schedule/new`: 팀 일정 생성 (팀 내부)
- `/activity/schedule/create`: Activity 일정 생성

### 새로운 라우트
- `/sports/:sport/schedule/write`: 종목별 일정 작성 (CreateModal에서 사용)

---

이 수정으로 **일정 만들기 버튼 클릭 시 404 에러가 해결**됩니다.
