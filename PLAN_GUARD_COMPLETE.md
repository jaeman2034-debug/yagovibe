# 🔥 플랜 가드 시스템 완료

## ✅ 구현 완료 사항

### 1️⃣ 플랜 타입 정의 (`src/types/plan.ts`)
- ✅ `PlanType`: "free" | "pro" | "academy_pro"
- ✅ `PlanLimits`: 각 플랜별 제한 사항 정의
- ✅ `PLAN_LIMITS`: 플랜별 기능 제한 상수
- ✅ `hasFeature()`: 기능 체크 헬퍼
- ✅ `getPlanDisplayName()`: 플랜 이름 표시

### 2️⃣ 팀 플랜 조회 훅 (`src/hooks/useTeamPlan.ts`)
- ✅ `useTeamPlan`: teamId로 플랜 정보 조회
- ✅ 최적화: teams 컬렉션 단일 문서 조회
- ✅ 캐싱: teamId 변경 시에만 재조회
- ✅ 기본값: "free"

### 3️⃣ 플랜 가드 컴포넌트 (`src/components/plan/PlanGuard.tsx`)
- ✅ `PlanGuard`: 플랜 제한 페이지 가드
- ✅ Pro 플랜 필요 시 Paywall 자동 표시
- ✅ Free 플랜에서는 제한된 페이지 접근 차단

### 4️⃣ 플랜 기능 래퍼 (`src/components/plan/PlanFeature.tsx`)
- ✅ `PlanFeature`: 플랜 제한 기능 래퍼
- ✅ Free 플랜에서는 기능 비활성화 + 업그레이드 CTA
- ✅ Pro 플랜에서는 정상 기능 제공

## 📋 플랜 제한 사항

### Free 플랜
- 최대 멤버: 20명
- 최대 관리자: 1명
- ❌ 자동 미납 알림
- ❌ 회비 결제 링크 생성
- ❌ 출석 통계 보기
- ❌ 여러 관리자
- ❌ 고급 리포트
- ❌ 커스텀 브랜딩

### Pro 플랜
- 최대 멤버: 100명
- 최대 관리자: 10명
- ✅ 자동 미납 알림
- ✅ 회비 결제 링크 생성
- ✅ 출석 통계 보기
- ✅ 여러 관리자
- ✅ 고급 리포트
- ❌ 커스텀 브랜딩

### Academy Pro 플랜
- 최대 멤버: 500명
- 최대 관리자: 20명
- ✅ 모든 Pro 기능
- ✅ 커스텀 브랜딩

## 🚀 사용 예제

### 예제 1: 페이지 레벨 가드 (PlanGuard)

```tsx
import { PlanGuard } from "@/components/plan/PlanGuard";

// 출석 통계 페이지 (Pro 필요)
function AttendanceStatsPage() {
  return (
    <PlanGuard requiredPlan="pro" trigger="attendance_stats">
      <AttendanceStats />
    </PlanGuard>
  );
}

// 회비 결제 링크 페이지 (Pro 필요)
function PaymentLinkPage() {
  return (
    <PlanGuard requiredPlan="pro" trigger="payment_link">
      <PaymentLinkGenerator />
    </PlanGuard>
  );
}
```

### 예제 2: 기능 레벨 가드 (PlanFeature)

```tsx
import { PlanFeature } from "@/components/plan/PlanFeature";

// 출석 통계 기능 (Pro 필요)
function TeamDashboard() {
  return (
    <div>
      <h1>팀 대시보드</h1>
      
      {/* Free: 비활성화 + 업그레이드 CTA */}
      {/* Pro: 정상 기능 */}
      <PlanFeature feature="allowAttendanceStats" trigger="attendance_stats">
        <AttendanceStats />
      </PlanFeature>
    </div>
  );
}

// 회비 결제 링크 기능 (Pro 필요)
function TeamSettings() {
  return (
    <div>
      <PlanFeature feature="allowPaymentLinks" trigger="payment_link">
        <PaymentLinkGenerator />
      </PlanFeature>
    </div>
  );
}
```

### 예제 3: 라우터 통합

```tsx
// src/App.tsx
import { PlanGuard } from "@/components/plan/PlanGuard";

<Route 
  path="/sports/:type/team/attendance" 
  element={
    <ProtectedRoute>
      <PlanGuard requiredPlan="pro" trigger="attendance_stats">
        <TeamAttendancePage />
      </PlanGuard>
    </ProtectedRoute>
  } 
/>
```

### 예제 4: 조건부 렌더링

```tsx
import { useTeamPlan } from "@/hooks/useTeamPlan";
import { hasFeature } from "@/types/plan";

function TeamPage() {
  const { teamId } = useParams();
  const { plan, loading } = useTeamPlan(teamId);
  
  if (loading) return <Loading />;
  
  const canUseAdvancedFeatures = hasFeature(plan, "allowAdvancedReports");
  
  return (
    <div>
      {canUseAdvancedFeatures && <AdvancedReports />}
      {!canUseAdvancedFeatures && <UpgradeCTA />}
    </div>
  );
}
```

## 🔄 기존 코드 통합

### Paywall 컴포넌트 활용
기존 `Paywall` 컴포넌트를 그대로 사용:
- `PlanGuard`와 `PlanFeature`가 자동으로 `Paywall` 표시
- 트리거 타입 자동 전달
- Analytics 자동 추적

### TeamContext 통합
`TeamContext`의 `plan` 필드와 호환:
```tsx
const { plan } = useTeam(); // TeamContext
const { plan: planFromHook } = useTeamPlan(teamId); // useTeamPlan
// 둘 다 동일한 PlanType 반환
```

## 📊 플랜 체크 플로우

```
사용자 접근
  ↓
PlanGuard / PlanFeature
  ↓
useTeamPlan(teamId) → teams/{teamId} 조회
  ↓
plan 확인
  ↓
┌─────────────┬──────────────┐
│ Free 플랜   │ Pro/Pro+     │
│             │              │
│ → Paywall   │ → 정상 기능  │
│   표시      │              │
└─────────────┴──────────────┘
```

## 🧪 테스트 체크리스트

- [ ] Free 플랜 팀 → Pro 기능 접근 시 Paywall 표시
- [ ] Pro 플랜 팀 → Pro 기능 정상 접근
- [ ] teamId 변경 시 플랜 정보 자동 갱신
- [ ] 로딩 상태 정상 표시
- [ ] 에러 처리 (팀 없음, 네트워크 오류)

## 🎯 다음 단계

1. ✅ 플랜 가드 시스템 완료
2. 🔄 실제 페이지에 PlanGuard 적용
3. 🔄 팀 전환 UX 최적화 (다음 단계)

---

**구현 완료**: 플랜 가드 시스템이 준비되었습니다! 🎉
