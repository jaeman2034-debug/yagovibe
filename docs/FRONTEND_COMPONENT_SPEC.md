# 🎨 프론트엔드 컴포넌트 Props/State 명세 (확정안)

**생성일**: 2025-01-27  
**목적**: 디자이너 결과물을 개발자가 그대로 코드로 옮길 수 있는 명세  
**원칙**: 권한 판단은 컴포넌트 밖, 컴포넌트는 결과만 렌더링

---

## 📋 공통 원칙

- ✅ **권한 판단은 컴포넌트 밖** (API/Policy Engine)
- ✅ **컴포넌트는 결과만 받아서 렌더링**
- ❌ **if/else 남발** → ✅ **enum + map 구조**

---

## 🔗 컴포넌트 연결 흐름

```
API
  └─ TeamStatus / FacilityAccessPolicy
        ↓
Permission Resolver (Backend Policy Engine)
        ↓
Frontend Components
(조건문 없음, 결과만 렌더)
```

---

## 1️⃣ OrganizationContextBar

### 역할
- 현재 조직 컨텍스트 표시
- 협회 / 내 팀 전환

### Props

```typescript
interface OrganizationContextBarProps {
  currentOrganization: {
    id: string;
    name: string;
    type: "ASSOCIATION" | "TEAM";
  };
  organizations: Array<{
    id: string;
    name: string;
    type: "ASSOCIATION" | "TEAM";
    teamStatus?: TeamStatus;
  }>;
  onChange: (organizationId: string) => void;
}
```

### UX 규칙
- **협회 선택 시** → 협회 하위 구조 노출
- **팀 선택 시** → 팀 단독 컨텍스트

---

## 2️⃣ FacilityCard

### 역할
- 운동장 리스트 카드
- **협회 우선 자산 시각화 핵심**

### Props

```typescript
interface FacilityCardProps {
  facility: {
    id: string;
    name: string;
    surfaceType: "ARTIFICIAL" | "NATURAL";
    accessPolicy: FacilityAccessPolicy;
  };
  permission: {
    actionType: "APPLY" | "REQUEST" | "WAITLIST" | "VIEW_ONLY";
  };
  onClick: () => void;
}
```

### 렌더 규칙
- **ASSOCIATION_PRIORITY** → **3px 보더 + 좌측 세로 바**
- **permission.actionType === VIEW_ONLY** → **CTA 숨김**

---

## 3️⃣ TeamTypeStatusCard

### 역할
- 회원 / 비회원 / 아카데미 상태 메시지 + CTA

### Props

```typescript
interface TeamTypeStatusCardProps {
  teamStatus: TeamStatus;
  message: string;
  cta?: {
    label: string;
    onClick: () => void;
  };
}
```

### 메시지 매핑 (고정)

```typescript
const STATUS_MESSAGE_MAP = {
  MEMBER: "우선 배정 대상입니다",
  ACADEMY: "협회 선대관 일정 내 배정됩니다",
  NON_MEMBER: "잔여 시간대만 이용 가능",
  PENDING: "전환 문의 처리 중입니다"
};
```

---

## 4️⃣ BookingCalendarSlot

### 역할
- 대관 캘린더 슬롯
- 클릭 가능 여부 판단

### Props

```typescript
interface BookingCalendarSlotProps {
  timeRange: string;
  permission: {
    actionType: "APPLY" | "REQUEST" | "WAITLIST" | "VIEW_ONLY";
  };
  onAction: () => void;
}
```

### UX 규칙
- **VIEW_ONLY** → 클릭 가능, 액션 없음 (정보 노출)
- **WAITLIST** → 대기 신청
- **색상은 actionType 기준**

---

## 5️⃣ MemberConversionModal

### 역할
- 비회원 → 회원 전환 UX STEP 2

### Props

```typescript
interface MemberConversionModalProps {
  isOpen: boolean;
  benefits: string[];
  fee: string;
  onConfirm: () => void;
  onClose: () => void;
}
```

---

## 6️⃣ 전역 상태 (최소화)

### Global Store (예: Zustand/Recoil)

```typescript
interface AppState {
  currentTeamStatus: TeamStatus;
  currentOrganizationId: string;
}
```

### 팀 상태 변경 시:
- UI 자동 갱신
- 캘린더/시설 카드 즉시 반영

---

## ✅ 이 단계 완료 의미

- ✅ 디자이너 결과물 → 개발 명세로 완전 변환
- ✅ 프론트/백엔드 병렬 개발 가능
- ✅ UX 변경 시 → 정책만 수정

---

**이 명세는 개발자가 바로 코드로 옮길 수 있는 수준의 상세한 Props/State 정의를 포함합니다.**

