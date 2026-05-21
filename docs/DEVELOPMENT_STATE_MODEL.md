# 🧩 개발 컴포넌트 / API 상태 모델 분해

**생성일**: 2025-01-27  
**목적**: UX 설계를 코드로 바로 옮길 수 있는 상태 모델로 변환  
**원칙**: 권한·대관·전환을 조건문이 아닌 정책(Policy)으로 관리

---

## 1️⃣ 상태 모델 정의 (TypeScript)

### TeamStatus Enum

```typescript
// src/types/teamStatus.ts

/**
 * 팀 상태 (협회 소속 및 회원 여부)
 */
export enum TeamStatus {
  /** 회원팀 (연 240만원 납부, 운동장 우선 대관) */
  MEMBER = "MEMBER",
  
  /** 비회원팀 (회비 없음, 잔여 대관만 가능) */
  NON_MEMBER = "NON_MEMBER",
  
  /** 아카데미/파트너 (비회원, 발전기금 100~200만원, 협회 통해 대관) */
  ACADEMY = "ACADEMY",
  
  /** 전환 문의 중 (비회원 → 회원 전환 요청 접수됨) */
  PENDING = "PENDING",
}

/**
 * TeamStatus 타입 가드
 */
export function isTeamStatus(value: string): value is TeamStatus {
  return Object.values(TeamStatus).includes(value as TeamStatus);
}

/**
 * TeamStatus 디스플레이 이름
 */
export const TEAM_STATUS_LABELS: Record<TeamStatus, string> = {
  [TeamStatus.MEMBER]: "회원팀",
  [TeamStatus.NON_MEMBER]: "비회원팀",
  [TeamStatus.ACADEMY]: "아카데미",
  [TeamStatus.PENDING]: "전환 문의 중",
};

/**
 * TeamStatus 색상 (디자인 시스템)
 */
export const TEAM_STATUS_COLORS: Record<TeamStatus, {
  icon: string;
  bg: string;
  border: string;
  text: string;
  button: string;
}> = {
  [TeamStatus.MEMBER]: {
    icon: "🟢",
    bg: "#ECFDF5",
    border: "#059669",
    text: "#059669",
    button: "#059669",
  },
  [TeamStatus.NON_MEMBER]: {
    icon: "⚪",
    bg: "#F9FAFB",
    border: "#E5E7EB",
    text: "#6B7280",
    button: "#6B7280",
  },
  [TeamStatus.ACADEMY]: {
    icon: "🔵",
    bg: "#EFF6FF",
    border: "#2563EB",
    text: "#2563EB",
    button: "#2563EB",
  },
  [TeamStatus.PENDING]: {
    icon: "⚪",
    bg: "#FEF3C7",
    border: "#F59E0B",
    text: "#92400E",
    button: "#F59E0B",
  },
};
```

---

### FacilityAccessPolicy Enum

```typescript
// src/types/facility.ts

/**
 * 시설 접근 정책 (협회 우선권 및 대관 방식)
 */
export enum FacilityAccessPolicy {
  /** 협회 우선 대관 (육사/경기기계공고/과기대 - 협회 선대관 자산) */
  ASSOCIATION_PRIORITY = "ASSOCIATION_PRIORITY",
  
  /** 협회 배정 (아카데미 대상) */
  ASSOCIATION_MANAGED = "ASSOCIATION_MANAGED",
  
  /** 일반 공공 (모든 팀 동일 접근) */
  PUBLIC_OPEN = "PUBLIC_OPEN",
}

/**
 * FacilityAccessPolicy 타입 가드
 */
export function isFacilityAccessPolicy(value: string): value is FacilityAccessPolicy {
  return Object.values(FacilityAccessPolicy).includes(value as FacilityAccessPolicy);
}

/**
 * FacilityAccessPolicy 디스플레이 이름
 */
export const FACILITY_ACCESS_POLICY_LABELS: Record<FacilityAccessPolicy, string> = {
  [FacilityAccessPolicy.ASSOCIATION_PRIORITY]: "협회 우선 대관 시설",
  [FacilityAccessPolicy.ASSOCIATION_MANAGED]: "협회 배정 시설",
  [FacilityAccessPolicy.PUBLIC_OPEN]: "일반 대관 시설",
};
```

---

### BookingPermission Enum

```typescript
// src/types/booking.ts

/**
 * 대관 권한 액션 타입
 */
export enum BookingPermission {
  /** 대관 신청 가능 (회원팀의 모든 시설, 일반 시설) */
  APPLY = "APPLY",
  
  /** 협회 승인 요청 (아카데미의 협회 배정 시설) */
  REQUEST = "REQUEST",
  
  /** 대기 신청 (비회원팀의 협회 우선 시설) */
  WAITLIST = "WAITLIST",
  
  /** 보기만 가능 (비회원팀의 협회 우선 시설, 전환 문의 중) */
  VIEW_ONLY = "VIEW_ONLY",
}

/**
 * BookingPermission 타입 가드
 */
export function isBookingPermission(value: string): value is BookingPermission {
  return Object.values(BookingPermission).includes(value as BookingPermission);
}

/**
 * BookingPermission 디스플레이 이름
 */
export const BOOKING_PERMISSION_LABELS: Record<BookingPermission, string> = {
  [BookingPermission.APPLY]: "대관 신청",
  [BookingPermission.REQUEST]: "대관 요청",
  [BookingPermission.WAITLIST]: "대기 신청",
  [BookingPermission.VIEW_ONLY]: "보기만 가능",
};
```

---

## 2️⃣ BookingPermission 매트릭스 (핵심 정책)

```typescript
// src/utils/bookingPermissionMatrix.ts

import { TeamStatus } from "@/types/teamStatus";
import { FacilityAccessPolicy } from "@/types/facility";
import { BookingPermission } from "@/types/booking";

/**
 * 팀 상태 + 시설 정책 → 대관 권한 매트릭스
 * 
 * 이 매트릭스 하나로 모든 UX 분기 자동화
 */
export const BOOKING_PERMISSION_MATRIX: Record<
  TeamStatus,
  Record<FacilityAccessPolicy, BookingPermission>
> = {
  [TeamStatus.MEMBER]: {
    [FacilityAccessPolicy.ASSOCIATION_PRIORITY]: BookingPermission.APPLY,
    [FacilityAccessPolicy.ASSOCIATION_MANAGED]: BookingPermission.APPLY,
    [FacilityAccessPolicy.PUBLIC_OPEN]: BookingPermission.APPLY,
  },
  [TeamStatus.ACADEMY]: {
    [FacilityAccessPolicy.ASSOCIATION_PRIORITY]: BookingPermission.REQUEST,
    [FacilityAccessPolicy.ASSOCIATION_MANAGED]: BookingPermission.REQUEST,
    [FacilityAccessPolicy.PUBLIC_OPEN]: BookingPermission.APPLY,
  },
  [TeamStatus.NON_MEMBER]: {
    [FacilityAccessPolicy.ASSOCIATION_PRIORITY]: BookingPermission.VIEW_ONLY,
    [FacilityAccessPolicy.ASSOCIATION_MANAGED]: BookingPermission.WAITLIST,
    [FacilityAccessPolicy.PUBLIC_OPEN]: BookingPermission.APPLY,
  },
  [TeamStatus.PENDING]: {
    [FacilityAccessPolicy.ASSOCIATION_PRIORITY]: BookingPermission.VIEW_ONLY,
    [FacilityAccessPolicy.ASSOCIATION_MANAGED]: BookingPermission.WAITLIST,
    [FacilityAccessPolicy.PUBLIC_OPEN]: BookingPermission.APPLY,
  },
};

/**
 * 팀 상태와 시설 정책으로 대관 권한 조회
 * 
 * @param teamStatus - 팀 상태
 * @param facilityPolicy - 시설 접근 정책
 * @returns 대관 권한
 */
export function getBookingPermission(
  teamStatus: TeamStatus,
  facilityPolicy: FacilityAccessPolicy
): BookingPermission {
  return BOOKING_PERMISSION_MATRIX[teamStatus][facilityPolicy];
}

/**
 * 대관 가능 여부 확인
 */
export function canApplyBooking(permission: BookingPermission): boolean {
  return permission === BookingPermission.APPLY || permission === BookingPermission.REQUEST;
}

/**
 * 대기 신청 가능 여부 확인
 */
export function canWaitlist(permission: BookingPermission): boolean {
  return permission === BookingPermission.WAITLIST;
}

/**
 * 보기만 가능 여부 확인
 */
export function isViewOnly(permission: BookingPermission): boolean {
  return permission === BookingPermission.VIEW_ONLY;
}
```

---

## 3️⃣ 전환 플로우 상태 변화

```typescript
// src/utils/teamConversion.ts

import { TeamStatus } from "@/types/teamStatus";

/**
 * 전환 플로우 상태 전이 규칙
 * 
 * stateDiagram-v2
 *   NON_MEMBER --> PENDING: 전환 문의
 *   PENDING --> MEMBER: 협회 승인
 *   MEMBER --> NON_MEMBER: 탈퇴/만료
 */

/**
 * 전환 가능한 상태인지 확인
 */
export function canConvertToMember(currentStatus: TeamStatus): boolean {
  return currentStatus === TeamStatus.NON_MEMBER;
}

/**
 * 전환 문의 가능 여부
 */
export function canRequestConversion(currentStatus: TeamStatus): boolean {
  return canConvertToMember(currentStatus);
}

/**
 * 승인 가능한 상태인지 확인
 */
export function canApproveConversion(currentStatus: TeamStatus): boolean {
  return currentStatus === TeamStatus.PENDING;
}

/**
 * 전환 상태 변경 (비회원 → 전환 문의 중)
 */
export function transitionToPending(currentStatus: TeamStatus): TeamStatus {
  if (!canRequestConversion(currentStatus)) {
    throw new Error(`Cannot transition from ${currentStatus} to PENDING`);
  }
  return TeamStatus.PENDING;
}

/**
 * 전환 승인 (전환 문의 중 → 회원)
 */
export function approveConversion(currentStatus: TeamStatus): TeamStatus {
  if (!canApproveConversion(currentStatus)) {
    throw new Error(`Cannot approve conversion from ${currentStatus}`);
  }
  return TeamStatus.MEMBER;
}

/**
 * 전환 취소 또는 탈퇴 (회원 → 비회원)
 */
export function cancelMembership(currentStatus: TeamStatus): TeamStatus {
  if (currentStatus === TeamStatus.MEMBER) {
    return TeamStatus.NON_MEMBER;
  }
  if (currentStatus === TeamStatus.PENDING) {
    return TeamStatus.NON_MEMBER;
  }
  return currentStatus;
}
```

---

## 4️⃣ 핵심 API 스펙 (초안)

```typescript
// src/types/api.ts

import { TeamStatus } from "@/types/teamStatus";
import { FacilityAccessPolicy } from "@/types/facility";
import { BookingPermission } from "@/types/booking";

/**
 * 팀 정보 응답
 */
export interface TeamResponse {
  id: string;
  name: string;
  status: TeamStatus;
  associationId?: string; // 협회 ID (소속인 경우)
  conversionRequestedAt?: string; // 전환 문의 일시 (ISO 8601)
  conversionRequestMemo?: string; // 전환 문의 메모
}

/**
 * 시설 정보 응답
 */
export interface FacilityResponse {
  id: string;
  name: string;
  location: string;
  accessPolicy: FacilityAccessPolicy;
  imageUrl?: string;
  description?: string;
}

/**
 * 대관 권한 조회 요청
 */
export interface BookingPermissionRequest {
  teamId: string;
  facilityId: string;
}

/**
 * 대관 권한 조회 응답
 */
export interface BookingPermissionResponse {
  canApply: boolean;
  permission: BookingPermission;
  message?: string; // 상태 메시지 (예: "잔여 시간대만 이용 가능")
  showConversionCTA?: boolean; // 회원팀 전환 CTA 표시 여부
}

/**
 * 전환 문의 요청
 */
export interface ConversionRequest {
  teamId: string;
  memo?: string; // 추가 메모 (선택)
}

/**
 * 전환 문의 응답
 */
export interface ConversionResponse {
  success: boolean;
  newStatus: TeamStatus; // PENDING
  requestedAt: string; // ISO 8601
}
```

---

### API 엔드포인트 명세

```typescript
// src/api/teams.ts

import { TeamResponse, ConversionRequest, ConversionResponse } from "@/types/api";

/**
 * GET /api/teams/{teamId}
 * 팀 상태 조회
 */
export async function getTeam(teamId: string): Promise<TeamResponse> {
  // 구현...
}

/**
 * POST /api/teams/{teamId}/conversion
 * 전환 문의
 */
export async function requestConversion(
  teamId: string,
  request: ConversionRequest
): Promise<ConversionResponse> {
  // 구현...
}
```

```typescript
// src/api/facilities.ts

import { FacilityResponse } from "@/types/api";

/**
 * GET /api/facilities/{facilityId}
 * 시설 정보 조회
 */
export async function getFacility(facilityId: string): Promise<FacilityResponse> {
  // 구현...
}
```

```typescript
// src/api/bookings.ts

import { BookingPermissionRequest, BookingPermissionResponse } from "@/types/api";

/**
 * POST /api/bookings/permission
 * 대관 가능 여부 조회
 */
export async function getBookingPermission(
  request: BookingPermissionRequest
): Promise<BookingPermissionResponse> {
  // 구현...
}
```

---

## 5️⃣ 프론트 컴포넌트 Props/State 명세 (확정안)

### 공통 원칙

- ✅ 권한 판단은 컴포넌트 밖 (API/Policy Engine)
- ✅ 컴포넌트는 결과만 받아서 렌더링
- ❌ if/else 남발 → ✅ enum + map 구조

---

### 1️⃣ OrganizationContextBar 컴포넌트

```typescript
// src/components/OrganizationContextBar.tsx

import { TeamStatus } from "@/types/teamStatus";

/**
 * OrganizationContextBar Props
 * 현재 조직 컨텍스트 표시 및 협회/내 팀 전환
 */
export interface OrganizationContextBarProps {
  /** 현재 선택된 조직 */
  currentOrganization: {
    id: string;
    name: string;
    type: "ASSOCIATION" | "TEAM";
  };
  
  /** 조직 목록 (드롭다운용) */
  organizations: Array<{
    id: string;
    name: string;
    type: "ASSOCIATION" | "TEAM";
    teamStatus?: TeamStatus; // 팀인 경우에만
  }>;
  
  /** 조직 변경 핸들러 */
  onChange: (organizationId: string) => void;
  
  /** 커스텀 클래스명 */
  className?: string;
}

/**
 * UX 규칙:
 * - 협회 선택 시 → 협회 하위 구조 노출
 * - 팀 선택 시 → 팀 단독 컨텍스트
 */
```

**사용 예시**:

```tsx
<OrganizationContextBar
  currentOrganization={{
    id: "assoc-1",
    name: "노원구축구협회",
    type: "ASSOCIATION",
  }}
  organizations={[
    { id: "assoc-1", name: "노원구축구협회", type: "ASSOCIATION" },
    { id: "team-1", name: "동부FC", type: "TEAM", teamStatus: TeamStatus.MEMBER },
  ]}
  onChange={(id) => handleOrganizationChange(id)}
/>
```

---

### 2️⃣ FacilityCard 컴포넌트

```typescript
// src/components/FacilityCard.tsx

import { FacilityAccessPolicy } from "@/types/facility";
import { BookingPermission } from "@/types/booking";

/**
 * FacilityCard Props
 * 운동장 리스트 카드 - 협회 우선 자산 시각화 핵심
 */
export interface FacilityCardProps {
  /** 시설 정보 */
  facility: {
    id: string;
    name: string;
    location?: string;
    surfaceType: "ARTIFICIAL" | "NATURAL";
    accessPolicy: FacilityAccessPolicy;
    imageUrl?: string;
  };
  
  /** 대관 권한 (Policy Engine에서 계산된 결과) */
  permission: {
    actionType: BookingPermission;
  };
  
  /** 이번 주 대관 현황 (선택) */
  bookingSummary?: {
    member: number;
    academy: number;
    nonMember: number;
    total: number;
  };
  
  /** 클릭 핸들러 */
  onClick: () => void;
  
  /** 커스텀 클래스명 */
  className?: string;
}

/**
 * 렌더 규칙:
 * - ASSOCIATION_PRIORITY → 3px 보더 + 좌측 세로 바 (#059669)
 * - permission.actionType === VIEW_ONLY → CTA 숨김 (비활성화 스타일)
 */
```

**사용 예시**:

```tsx
<FacilityCard
  facility={{
    id: "facility-1",
    name: "육군사관학교 축구장",
    location: "서울특별시 노원구",
    surfaceType: "ARTIFICIAL",
    accessPolicy: FacilityAccessPolicy.ASSOCIATION_PRIORITY,
  }}
  permission={{
    actionType: BookingPermission.VIEW_ONLY,
  }}
  bookingSummary={{
    member: 4,
    academy: 1,
    nonMember: 0,
    total: 5,
  }}
  onClick={() => navigate(`/facilities/facility-1`)}
/>
```

---

### 3️⃣ TeamTypeStatusCard 컴포넌트

```typescript
// src/components/TeamTypeStatusCard.tsx

import { TeamStatus } from "@/types/teamStatus";

/**
 * TeamTypeStatusCard Props
 * 회원/비회원/아카데미 상태 메시지 + CTA
 */
export interface TeamTypeStatusCardProps {
  /** 팀 상태 */
  teamStatus: TeamStatus;
  
  /** 상태 메시지 (선택, 기본값은 STATUS_MESSAGE_MAP 사용) */
  message?: string;
  
  /** CTA 버튼 (선택, 팀 상태에 따라 자동 생성) */
  cta?: {
    label: string;
    onClick: () => void;
    variant?: "primary" | "secondary";
  };
  
  /** 추가 CTA (비회원팀 전환 안내 등) */
  secondaryCta?: {
    label: string;
    onClick: () => void;
  };
  
  /** 커스텀 클래스명 */
  className?: string;
}

/**
 * 상태 메시지 매핑 (고정)
 * 컴포넌트 내부에서 자동 사용
 */
export const STATUS_MESSAGE_MAP: Record<TeamStatus, string> = {
  [TeamStatus.MEMBER]: "우선 배정 대상입니다",
  [TeamStatus.ACADEMY]: "협회 선대관 일정 내 배정됩니다",
  [TeamStatus.NON_MEMBER]: "잔여 시간대만 이용 가능",
  [TeamStatus.PENDING]: "전환 문의 처리 중입니다",
};

/**
 * CTA 라벨 매핑 (선택)
 */
export const STATUS_CTA_MAP: Partial<Record<TeamStatus, string>> = {
  [TeamStatus.MEMBER]: "대관 신청",
  [TeamStatus.ACADEMY]: "대관 요청",
  [TeamStatus.NON_MEMBER]: "대기 신청",
};
```

**사용 예시**:

```tsx
// 회원팀
<TeamTypeStatusCard
  teamStatus={TeamStatus.MEMBER}
  cta={{
    label: "대관 신청",
    onClick: () => handleBookingApply(),
  }}
/>

// 비회원팀
<TeamTypeStatusCard
  teamStatus={TeamStatus.NON_MEMBER}
  cta={{
    label: "대기 신청",
    onClick: () => handleWaitlist(),
  }}
  secondaryCta={{
    label: "회원팀 전환 안내",
    onClick: () => openConversionModal(),
  }}
/>
```

---

### 4️⃣ BookingCalendarSlot 컴포넌트

```typescript
// src/components/BookingCalendarSlot.tsx

import { BookingPermission } from "@/types/booking";

/**
 * BookingCalendarSlot Props
 * 대관 캘린더 슬롯 - 클릭 가능 여부 판단
 */
export interface BookingCalendarSlotProps {
  /** 시간대 (예: "09:00") */
  timeRange: string;
  
  /** 날짜 (ISO 8601) */
  date: string;
  
  /** 대관 권한 (Policy Engine에서 계산된 결과) */
  permission: {
    actionType: BookingPermission;
  };
  
  /** 슬롯 상태 (현재 배정 상태) */
  slotStatus?: "available" | "member" | "academy" | "nonMember" | "booked";
  
  /** 액션 핸들러 (클릭 시) */
  onAction: (timeRange: string, date: string, permission: BookingPermission) => void;
  
  /** 커스텀 클래스명 */
  className?: string;
}

/**
 * UX 규칙:
 * - VIEW_ONLY → 클릭 가능, 액션 없음 (정보 노출 모달)
 * - WAITLIST → 대기 신청 모달
 * - APPLY → 대관 신청 모달
 * - REQUEST → 대관 요청 모달
 * - 색상은 actionType 기준 (🟢/🔵/⚪)
 */
```

**사용 예시**:

```tsx
<BookingCalendarSlot
  timeRange="09:00"
  date="2025-01-27"
  permission={{
    actionType: BookingPermission.VIEW_ONLY,
  }}
  slotStatus="member"
  onAction={(time, date, permission) => {
    if (permission === BookingPermission.VIEW_ONLY) {
      showInfoModal("회원팀은 이 시간대 우선 배정 가능");
    } else {
      handleBookingAction(time, date, permission);
    }
  }}
/>
```

---

### 5️⃣ MemberConversionModal 컴포넌트

```typescript
// src/components/MemberConversionModal.tsx

/**
 * MemberConversionModal Props
 * 비회원 → 회원 전환 UX STEP 2: 가치 확인
 */
export interface MemberConversionModalProps {
  /** 모달 열림 여부 */
  isOpen: boolean;
  
  /** 혜택 목록 (체크리스트) */
  benefits: string[];
  
  /** 연회비 (텍스트) */
  fee: string;
  
  /** 확인 핸들러 (전환 문의로 이동) */
  onConfirm: () => void;
  
  /** 닫기 핸들러 */
  onClose: () => void;
  
  /** 커스텀 클래스명 */
  className?: string;
}

/**
 * 기본 혜택 목록 (기본값)
 */
export const DEFAULT_CONVERSION_BENEFITS = [
  "협회 우선 대관 시설 이용",
  "잔여 대기 없음",
  "협회 대회 참가 가능",
];
```

**사용 예시**:

```tsx
<MemberConversionModal
  isOpen={isConversionModalOpen}
  benefits={DEFAULT_CONVERSION_BENEFITS}
  fee="연회비 240만원"
  onConfirm={() => {
    setConversionModalOpen(false);
    setConversionRequestFormOpen(true);
  }}
  onClose={() => setConversionModalOpen(false)}
/>
```

---

### 6️⃣ ConversionRequestForm 컴포넌트

```typescript
// src/components/ConversionRequestForm.tsx

/**
 * ConversionRequestForm Props
 * 비회원 → 회원 전환 UX STEP 3: 문의
 */
export interface ConversionRequestFormProps {
  /** 팀명 (자동 입력, 수정 불가) */
  teamName: string;
  
  /** 담당자 연락처 (자동 입력, 수정 불가) */
  contactPhone: string;
  
  /** 제출 핸들러 */
  onSubmit: (memo?: string) => Promise<void>;
  
  /** 취소 핸들러 */
  onCancel: () => void;
  
  /** 커스텀 클래스명 */
  className?: string;
}
```

---

### 7️⃣ 전역 상태 (최소화)

```typescript
// src/store/appStore.ts (Zustand 예시)

import { create } from "zustand";
import { TeamStatus } from "@/types/teamStatus";

/**
 * Global Store (최소화)
 * 팀 상태 변경 시 UI 자동 갱신
 */
export interface AppState {
  /** 현재 팀 상태 */
  currentTeamStatus: TeamStatus | null;
  
  /** 현재 조직 ID */
  currentOrganizationId: string | null;
  
  /** 팀 상태 설정 */
  setTeamStatus: (status: TeamStatus | null) => void;
  
  /** 조직 ID 설정 */
  setOrganizationId: (id: string | null) => void;
  
  /** 상태 초기화 */
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentTeamStatus: null,
  currentOrganizationId: null,
  
  setTeamStatus: (status) => set({ currentTeamStatus: status }),
  setOrganizationId: (id) => set({ currentOrganizationId: id }),
  
  reset: () => set({
    currentTeamStatus: null,
    currentOrganizationId: null,
  }),
}));

/**
 * 팀 상태 변경 시:
 * - UI 자동 갱신
 * - 캘린더/시설 카드 즉시 반영
 */
```

**사용 예시**:

```tsx
import { useAppStore } from "@/store/appStore";
import { TeamStatus } from "@/types/teamStatus";

function TeamStatusUpdater() {
  const { setTeamStatus } = useAppStore();
  
  useEffect(() => {
    // API에서 팀 상태 조회
    fetchTeamStatus().then((status) => {
      setTeamStatus(status); // 자동으로 모든 컴포넌트 갱신
    });
  }, []);
}
```

---

### FacilityCard 컴포넌트

```typescript
// src/components/FacilityCard.tsx

import { FacilityAccessPolicy } from "@/types/facility";
import { TeamStatus } from "@/types/teamStatus";

/**
 * FacilityCard Props
 * accessPolicy + teamStatus로 배지/보더 결정
 */
export interface FacilityCardProps {
  /** 시설 ID */
  facilityId: string;
  
  /** 시설명 */
  name: string;
  
  /** 위치 */
  location: string;
  
  /** 시설 접근 정책 */
  accessPolicy: FacilityAccessPolicy;
  
  /** 현재 팀 상태 (선택, 권한별 UI 분기용) */
  teamStatus?: TeamStatus;
  
  /** 이번 주 대관 수 */
  bookingCount?: number;
  
  /** 대관 상세 (회원/아카데미/비회원) */
  bookingDetails?: {
    member: number;
    academy: number;
    nonMember: number;
  };
  
  /** 상세 보기 핸들러 */
  onDetail?: (facilityId: string) => void;
  
  /** 커스텀 클래스명 */
  className?: string;
}

/**
 * FacilityCard State (내부)
 */
export interface FacilityCardState {
  /** 배지 표시 여부 */
  showBadge: boolean;
  
  /** 배지 텍스트 */
  badgeText: string;
  
  /** 배지 색상 */
  badgeColor: string;
  
  /** 보더 색상 */
  borderColor: string;
  
  /** 보더 두께 */
  borderWidth: number;
  
  /** 배경색 */
  backgroundColor: string;
  
  /** 좌측 세로 바 표시 여부 (협회 우선 대관 시설) */
  showLeftBar: boolean;
  
  /** 비활성화 여부 (비회원팀이 협회 우선 시설 접근 시) */
  isDisabled: boolean;
}
```

**사용 예시**:

```tsx
<FacilityCard
  facilityId="facility-1"
  name="육군사관학교 축구장"
  location="서울특별시 노원구"
  accessPolicy={FacilityAccessPolicy.ASSOCIATION_PRIORITY}
  teamStatus={TeamStatus.NON_MEMBER}
  bookingCount={5}
  bookingDetails={{ member: 4, academy: 1, nonMember: 0 }}
  onDetail={(id) => navigate(`/facilities/${id}`)}
/>
```

---

### BookingCalendarSlot 컴포넌트

```typescript
// src/components/BookingCalendarSlot.tsx

import { BookingPermission } from "@/types/booking";
import { TeamStatus } from "@/types/teamStatus";

/**
 * BookingCalendarSlot Props
 * permission 결과로 클릭/비활성 분기
 */
export interface BookingCalendarSlotProps {
  /** 시간대 (예: "09:00") */
  time: string;
  
  /** 날짜 (ISO 8601) */
  date: string;
  
  /** 대관 권한 */
  permission: BookingPermission;
  
  /** 현재 팀 상태 */
  teamStatus: TeamStatus;
  
  /** 슬롯 상태 */
  slotStatus: "available" | "member" | "academy" | "nonMember" | "booked";
  
  /** 슬롯 클릭 핸들러 */
  onClick?: (time: string, date: string) => void;
  
  /** 커스텀 클래스명 */
  className?: string;
}

/**
 * BookingCalendarSlot State (내부)
 */
export interface BookingCalendarSlotState {
  /** 배경색 */
  backgroundColor: string;
  
  /** 보더색 */
  borderColor: string;
  
  /** 보더 스타일 */
  borderStyle: "solid" | "dashed";
  
  /** 아이콘 */
  icon: string;
  
  /** 클릭 가능 여부 */
  isClickable: boolean;
  
  /** 비활성화 여부 */
  isDisabled: boolean;
  
  /** 툴팁 메시지 */
  tooltipMessage?: string;
}
```

**사용 예시**:

```tsx
<BookingCalendarSlot
  time="09:00"
  date="2025-01-27"
  permission={BookingPermission.VIEW_ONLY}
  teamStatus={TeamStatus.NON_MEMBER}
  slotStatus="member"
  onClick={(time, date) => handleSlotClick(time, date)}
/>
```

---

### OrganizationContextBar 컴포넌트

```typescript
// src/components/OrganizationContextBar.tsx

/**
 * OrganizationContextBar Props
 * 조직 컨텍스트 전환 (협회 / 내 팀)
 */
export interface OrganizationContextBarProps {
  /** 현재 선택된 조직 컨텍스트 */
  currentContext: "association" | "myTeam";
  
  /** 조직 목록 */
  organizations: Array<{
    id: string;
    name: string;
    type: "association" | "team";
  }>;
  
  /** 조직 컨텍스트 변경 핸들러 */
  onContextChange: (context: "association" | "myTeam") => void;
  
  /** 조직 선택 핸들러 (드롭다운) */
  onOrganizationSelect?: (organizationId: string) => void;
  
  /** 커스텀 클래스명 */
  className?: string;
}

/**
 * OrganizationContextBar State (내부)
 */
export interface OrganizationContextBarState {
  /** 드롭다운 열림 여부 */
  isDropdownOpen: boolean;
  
  /** 선택된 조직 */
  selectedOrganization: {
    id: string;
    name: string;
    type: "association" | "team";
  } | null;
}
```

**사용 예시**:

```tsx
<OrganizationContextBar
  currentContext="association"
  organizations={[
    { id: "assoc-1", name: "노원구축구협회", type: "association" },
    { id: "team-1", name: "내 팀", type: "team" },
  ]}
  onContextChange={(context) => setCurrentContext(context)}
  onOrganizationSelect={(id) => handleOrganizationSelect(id)}
/>
```

---

### ConversionModal 컴포넌트

```typescript
// src/components/ConversionModal.tsx

import { TeamStatus } from "@/types/teamStatus";

/**
 * ConversionModal Props
 * 회원팀 전환 모달 (STEP 2: 가치 확인)
 */
export interface ConversionModalProps {
  /** 열림 여부 */
  open: boolean;
  
  /** 닫기 핸들러 */
  onClose: () => void;
  
  /** 현재 팀 상태 */
  currentStatus: TeamStatus;
  
  /** 전환 문의 핸들러 */
  onRequestConversion: (memo?: string) => Promise<void>;
  
  /** 커스텀 클래스명 */
  className?: string;
}

/**
 * ConversionModal State (내부)
 */
export interface ConversionModalState {
  /** 추가 메모 입력값 */
  memo: string;
  
  /** 전환 문의 로딩 중 */
  isRequesting: boolean;
  
  /** 에러 메시지 */
  errorMessage?: string;
}
```

---

### ConversionRequestForm 컴포넌트

```typescript
// src/components/ConversionRequestForm.tsx

/**
 * ConversionRequestForm Props
 * 전환 문의 폼 (STEP 3: 문의)
 */
export interface ConversionRequestFormProps {
  /** 팀명 (자동 입력) */
  teamName: string;
  
  /** 담당자 연락처 (자동 입력) */
  contactPhone: string;
  
  /** 전환 문의 제출 핸들러 */
  onSubmit: (memo?: string) => Promise<void>;
  
  /** 취소 핸들러 */
  onCancel: () => void;
  
  /** 커스텀 클래스명 */
  className?: string;
}

/**
 * ConversionRequestForm State (내부)
 */
export interface ConversionRequestFormState {
  /** 추가 메모 입력값 */
  memo: string;
  
  /** 제출 로딩 중 */
  isSubmitting: boolean;
  
  /** 에러 메시지 */
  errorMessage?: string;
}
```

---

## 6️⃣ 상태 관리 (React Context/Hooks)

```typescript
// src/context/TeamStatusContext.tsx

import { TeamStatus } from "@/types/teamStatus";
import { BookingPermission } from "@/types/booking";
import { FacilityAccessPolicy } from "@/types/facility";

/**
 * TeamStatusContext 타입
 */
export interface TeamStatusContextType {
  /** 현재 팀 상태 */
  teamStatus: TeamStatus | null;
  
  /** 팀 ID */
  teamId: string | null;
  
  /** 협회 ID */
  associationId: string | null;
  
  /** 대관 권한 조회 */
  getBookingPermission: (facilityPolicy: FacilityAccessPolicy) => BookingPermission;
  
  /** 전환 문의 */
  requestConversion: (memo?: string) => Promise<void>;
  
  /** 상태 새로고침 */
  refresh: () => Promise<void>;
}

/**
 * useTeamStatus Hook
 */
export function useTeamStatus(): TeamStatusContextType {
  // 구현...
}
```

---

## 7️⃣ 컴포넌트 통합 예시

```typescript
// src/pages/FacilityDetailPage.tsx

import { useTeamStatus } from "@/context/TeamStatusContext";
import { getBookingPermission } from "@/utils/bookingPermissionMatrix";
import { TeamTypeStatusCard } from "@/components/TeamTypeStatusCard";
import { FacilityCard } from "@/components/FacilityCard";

export function FacilityDetailPage() {
  const { teamStatus, getBookingPermission } = useTeamStatus();
  const facility = useFacility(); // 시설 정보 조회
  
  if (!teamStatus || !facility) {
    return <Loading />;
  }
  
  const permission = getBookingPermission(facility.accessPolicy);
  
  return (
    <div>
      <FacilityCard
        facilityId={facility.id}
        name={facility.name}
        location={facility.location}
        accessPolicy={facility.accessPolicy}
        teamStatus={teamStatus}
      />
      
      <TeamTypeStatusCard
        teamStatus={teamStatus}
        bookingPermission={permission}
        facilityName={facility.name}
        onBookingApply={() => handleBookingApply()}
        onWaitlistApply={() => handleWaitlist()}
        onConversionGuide={() => openConversionModal()}
      />
    </div>
  );
}
```

---

## ✅ 검증 완료

### 반드시 지켜야 할 것

- ✅ 조건문이 아닌 정책(Policy)으로 관리 (매트릭스 기반)
- ✅ 타입 안전성 (TypeScript enum + 타입 가드)
- ✅ 컴포넌트 Props/State 명확히 정의
- ✅ 상태 모델과 UX 설계 일치

### 하지 말 것

- ❌ 하드코딩된 조건문 (`if (teamStatus === "MEMBER")`)
- ❌ 중복된 권한 로직
- ❌ 타입 없이 string 사용

---

**이 상태 모델 설계는 프론트/백엔드 동시 개발 가능한 수준의 명세를 포함합니다.**

**다음 단계**: API 스펙 상세화 (OpenAPI 수준) 또는 백엔드 권한 엔진 설계

