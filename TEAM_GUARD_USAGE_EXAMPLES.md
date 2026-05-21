# 🔥 TeamGuard 사용 예제 (정본 코드)

## ✅ 구현 완료

### 1️⃣ 공통 Guard 로직
- `src/utils/guardTeamAccess.ts`: members → team 순서로 읽기 (Firestore read 최소화)

### 2️⃣ React Router Guard 래퍼
- `src/components/guard/TeamGuard.tsx`: 자동 리디렉션 + Paywall 표시

### 3️⃣ 팀 선택 페이지
- `src/pages/select-team/SelectTeamPage.tsx`: team_members 1쿼리 + 즉시 이동

### 4️⃣ Guard 쿼리 훅
- `src/hooks/useGuardQuery.ts`: 데이터 페칭 + 캐싱

## 🚀 사용 예제

### 예제 1: 기본 팀 페이지 (플랜 체크 없음)

```tsx
// src/App.tsx
import { TeamGuard } from "@/components/guard/TeamGuard";

<Route 
  path="/t/:teamId" 
  element={
    <ProtectedRoute>
      <TeamGuard>
        <TeamDashboard />
      </TeamGuard>
    </ProtectedRoute>
  } 
/>
```

### 예제 2: Pro 플랜 필요 페이지

```tsx
// 출석 통계 (Pro 필요)
<Route 
  path="/t/:teamId/attendance" 
  element={
    <ProtectedRoute>
      <TeamGuard requiredPlan="pro" trigger="attendance_stats">
        <TeamAttendancePage />
      </TeamGuard>
    </ProtectedRoute>
  } 
/>

// 회비 결제 링크 (Pro 필요)
<Route 
  path="/t/:teamId/fees" 
  element={
    <ProtectedRoute>
      <TeamGuard requiredPlan="pro" trigger="payment_link">
        <TeamFeePaymentPage />
      </TeamGuard>
    </ProtectedRoute>
  } 
/>
```

### 예제 3: 기존 라우트에 적용

```tsx
// 기존: /sports/:type/team/attendance
// 변경: TeamGuard 추가
<Route 
  path="/sports/:type/team/attendance" 
  element={
    <ProtectedRoute>
      <TeamGuard requiredPlan="pro" trigger="attendance_stats">
        <TeamAttendancePage />
      </TeamGuard>
    </ProtectedRoute>
  } 
/>
```

### 예제 4: 컴포넌트 내부에서 Guard 결과 사용

```tsx
import { useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { useGuardQuery } from "@/hooks/useGuardQuery";

function TeamDashboard() {
  const { teamId } = useParams<{ teamId: string }>();
  const { user } = useAuth();
  const { data, loading } = useGuardQuery(user?.uid, teamId, "pro");

  if (loading) return <Loading />;
  
  if (data?.type === "ok") {
    const { role, plan } = data;
    // role, plan 사용
    return <Dashboard role={role} plan={plan} />;
  }

  return null; // Guard가 리디렉션 처리
}
```

## 📊 Guard 플로우

```
사용자 접근 → /t/:teamId/attendance
  ↓
TeamGuard
  ↓
useGuardQuery(uid, teamId, "pro")
  ↓
guardTeamAccess()
  ├─ 1) members 확인 (teams/{teamId}/members/{uid})
  ├─ 2) 플랜 확인 (teams/{teamId}.plan) - 필요시만
  └─ 결과 반환
  ↓
┌─────────────┬──────────────┬──────────────┐
│ needLogin   │ needTeam     │ needUpgrade  │
│ → /login    │ → /select-team│ → Paywall   │
└─────────────┴──────────────┴──────────────┘
```

## 🔄 팀 전환 플로우

```
1. /select-team 접속
   ↓
2. useMyTeams() → team_members 1쿼리
   ↓
3. 팀 목록 표시
   ↓
4. 팀 클릭
   ↓
5. localStorage.setItem("currentTeamId", teamId)
   ↓
6. navigate(`/t/${teamId}`, { replace: true })
```

## 🎯 팀 기억 우선순위

1. **URL teamId** (가장 우선)
2. `localStorage.currentTeamId`
3. `users/{uid}.lastTeamId`
4. `team_members` 첫 팀

## ⚡ 최적화 포인트

### 1. Firestore Read 최소화
- ✅ members → team 순서 (member 없으면 team 읽기 스킵)
- ✅ 플랜 체크는 필요한 페이지에서만
- ✅ Guard 결과 캐싱 (teamId 변경 시에만 재조회)

### 2. URL 기반 상태 관리
- ✅ 상태 의존 ❌
- ✅ URL teamId가 단일 진실
- ✅ 새로고침/직접 접근 모두 안전

### 3. 멀티 플랜 UX
- ✅ 진입 전에 가드 (접근 후 에러 ❌)
- ✅ Paywall은 막혔을 때만 표시
- ✅ 업그레이드 이유 명확하게

## 📋 체크리스트

- [x] guardTeamAccess 구현 (members → team 순서)
- [x] TeamGuard 컴포넌트
- [x] useGuardQuery 훅
- [x] SelectTeamPage (팀 선택)
- [ ] 실제 페이지에 TeamGuard 적용
- [ ] 팀 전환 시 lastTeamId 업데이트 로직

## 🔗 다음 단계

1. **실제 페이지에 적용**
   - `/t/:teamId/attendance` → Pro 필요
   - `/t/:teamId/fees` → Pro 필요
   
2. **팀 전환 최적화**
   - 팀 이동 시 `users/{uid}.lastTeamId` 업데이트
   - 서버 함수로 구현 (server only write)

---

**구현 완료**: 정본 코드 준비 완료! 🎉
