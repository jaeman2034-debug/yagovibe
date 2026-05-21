# 🔥 멀티 팀 / 멀티 플랜 가드 시스템 완료 (정본 코드)

## ✅ 구현 완료 사항

### 1️⃣ 공통 Guard 로직 (`src/utils/guardTeamAccess.ts`)
```typescript
// 핵심 원칙:
// - members → team 순서로 읽어서 Firestore read 최소화
// - 플랜 체크는 필요한 페이지에서만
// - URL의 teamId가 단일 진실

guardTeamAccess({
  uid,
  teamId,
  requiredPlan?: "pro" | "academy_pro"
}): Promise<GuardResult>
```

**최적화**:
- ✅ members 먼저 확인 (없으면 team 읽기 스킵)
- ✅ 플랜 체크는 requiredPlan 있을 때만
- ✅ 권한 SSOT: `teams/{teamId}/members/{uid}`
- ✅ 플랜 SSOT: `teams/{teamId}.plan`

### 2️⃣ React Router Guard 래퍼 (`src/components/guard/TeamGuard.tsx`)
```tsx
<TeamGuard requiredPlan="pro" trigger="attendance_stats">
  <TeamAttendancePage />
</TeamGuard>
```

**기능**:
- ✅ 자동 리디렉션 (needLogin → /login, needTeam → /select-team)
- ✅ Paywall 표시 (needUpgrade)
- ✅ 로딩 상태 처리

### 3️⃣ 팀 선택 페이지 (`src/pages/select-team/SelectTeamPage.tsx`)
- ✅ team_members 1쿼리로 내 팀 목록 표시
- ✅ 팀 클릭 → 즉시 이동 (상태 의존 ❌ / URL 기반 ⭕️)
- ✅ 마지막 접속 팀 표시
- ✅ 팀 1개만 있으면 자동 선택

### 4️⃣ Guard 쿼리 훅 (`src/hooks/useGuardQuery.ts`)
- ✅ 데이터 페칭 + 캐싱
- ✅ teamId 변경 시에만 재조회

## 🚀 사용 예제

### 예제 1: 기본 팀 페이지 (플랜 체크 없음)
```tsx
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
```

### 예제 3: 기존 라우트에 적용
```tsx
// 기존: /sports/:type/team/attendance
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

## 📊 Guard 플로우

```
사용자 접근
  ↓
TeamGuard
  ↓
useGuardQuery(uid, teamId, requiredPlan)
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
3. `users/{uid}.lastTeamId` (TODO: 서버 함수로 업데이트)
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
- [x] 라우트에 SelectTeamPage 추가
- [ ] 실제 페이지에 TeamGuard 적용 (다음 단계)
- [ ] 팀 전환 시 lastTeamId 업데이트 로직 (다음 단계)

## 🔗 다음 단계

1. **실제 페이지에 TeamGuard 적용**
   - `/sports/:type/team/attendance` → Pro 필요
   - `/sports/:type/team/fees` → Pro 필요
   
2. **팀 전환 최적화**
   - 팀 이동 시 `users/{uid}.lastTeamId` 업데이트
   - 서버 함수로 구현 (server only write)

---

**구현 완료**: 정본 코드 준비 완료! 🎉

**상태**: 실서비스 올려도 되는 구조 완성 ✅
