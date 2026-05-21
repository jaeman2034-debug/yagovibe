# 🔥 Cursor 개발자 수정 지시문: Schedule 라우트 404 수정 완료

## ✅ 수정 완료

### 변경 사항

1. **ScheduleCreatePage import 추가**
   ```tsx
   const ScheduleCreatePage = lazy(() => import("./pages/activity/ScheduleCreatePage"));
   ```

2. **라우트 추가**
   ```tsx
   <Route 
     path="/sports/:sport/schedule/write" 
     element={
       <ProtectedRoute>
         <Suspense fallback={...}>
           <ScheduleCreatePage />
         </Suspense>
       </ProtectedRoute>
     } 
   />
   ```

---

## 📋 수정된 파일

### App.tsx
- `ScheduleCreatePage` import 추가 (254줄 근처)
- `/sports/:sport/schedule/write` 라우트 추가 (1277줄 근처)

---

## 🧪 테스트 방법

1. FAB 버튼 클릭 → CreateModal 열기
2. "일정 만들기" 버튼 클릭
3. `/sports/soccer/schedule/write`로 이동하는지 확인
4. 404 에러가 발생하지 않는지 확인
5. ScheduleCreatePage가 정상적으로 렌더링되는지 확인

---

## 🔍 추가 확인 사항

### 다른 라우트도 확인 필요

CreateModal의 다른 버튼들도 동일한 문제가 있을 수 있습니다:

- **팀 만들기**: `/sports/:sport/team/create` ✅ (확인 필요)
- **팀원 모집**: `/sports/:sport/recruit/write` ✅ (확인 필요)
- **경기 매칭**: `/sports/:sport/match/write` ✅ (확인 필요)

---

## 📝 참고사항

### 라우트 순서
더 구체적인 경로가 먼저 와야 합니다:
1. `/sports/:sport/schedule/write` (구체적)
2. `/sports/:sport/market/:postId` (더 구체적)

### ScheduleCreatePage 위치
- 파일: `src/pages/activity/ScheduleCreatePage.tsx`
- 이 페이지는 팀 일정 생성 기능을 제공합니다.

---

이 수정으로 **일정 만들기 버튼 클릭 시 404 에러가 해결**됩니다.
