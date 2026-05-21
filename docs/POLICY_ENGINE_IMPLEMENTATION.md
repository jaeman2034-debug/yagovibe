# 🔐 Policy Engine 구현 가이드

**생성일**: 2025-01-27  
**목적**: 실제 Firestore 데이터와 연결된 Policy Engine 구현  
**기준**: 시드 데이터 기반 (assoc-nowon-football)

---

## ✅ 구현 완료 항목

### 1. 핵심 타입 정의

**파일**: `src/types/policy.ts`

- ✅ `TeamStatus` enum (MEMBER, NON_MEMBER, ACADEMY, PENDING)
- ✅ `FacilityAccessPolicy` enum (ASSOCIATION_PRIORITY, ASSOCIATION_MANAGED, PUBLIC_OPEN)
- ✅ `BookingPermission` enum (APPLY, REQUEST, WAITLIST, VIEW_ONLY)
- ✅ `PermissionDecision` interface
- ✅ 타입 가드 함수
- ✅ 디스플레이 라벨 및 색상 매핑

### 2. 권한 매트릭스

**파일**: `src/utils/bookingPermissionMatrix.ts`

- ✅ `BOOKING_PERMISSION_MATRIX` - O(1) 권한 조회
- ✅ `getBookingPermission()` - 권한 계산 함수
- ✅ `PERMISSION_MESSAGE_MAP` - 메시지 매핑
- ✅ `REASON_MESSAGE_MAP` - 상세 메시지 매핑
- ✅ 헬퍼 함수 (canApplyBooking, canWaitlist, isViewOnly)

---

## 🔄 다음 구현 단계

### 3. Firestore 데이터 조회 (필요)

**예상 파일**: `src/utils/policyResolver.ts`

```typescript
// 팀 상태 조회
export async function resolveTeamStatus(teamId: string): Promise<TeamStatus>

// 시설 접근 정책 조회
export async function resolveFacilityAccessPolicy(facilityId: string): Promise<FacilityAccessPolicy>

// 통합 권한 조회
export async function getBookingPermissionForFacility(
  teamId: string,
  facilityId: string
): Promise<PermissionDecision>
```

### 4. API 엔드포인트 (Cloud Functions)

**예상 파일**: `functions/src/api/getBookingPermission.ts`

```typescript
// POST /api/policy/booking-permission
export const getBookingPermission = onCall(async (req) => {
  const { teamId, facilityId } = req.data;
  // Policy Engine 로직 실행
});
```

### 5. 프론트엔드 Hook

**예상 파일**: `src/hooks/useBookingPermission.ts`

```typescript
// 팀 + 시설 → 권한 조회 Hook
export function useBookingPermission(teamId: string, facilityId: string)
```

---

## 📊 현재 데이터 구조 (Firestore)

### Teams 컬렉션

```typescript
teams/{teamId}
{
  id: string;
  name: string;
  status: "MEMBER" | "NON_MEMBER" | "ACADEMY" | "PENDING";
  associationId?: string;
  ownerUid: string;
  sportType: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Facilities 컬렉션

```typescript
facilities/{facilityId}
{
  id: string;
  name: string;
  location?: string;
  accessPolicy: "ASSOCIATION_PRIORITY" | "ASSOCIATION_MANAGED" | "PUBLIC_OPEN";
  surfaceType: "ARTIFICIAL" | "NATURAL";
  capacity?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Associations 컬렉션

```typescript
associations/{associationId}/config/policy
{
  associationPriorityFacilities: string[]; // facilityId 배열
  associationManagedFacilities?: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## 🧪 테스트 시나리오

### 시나리오 1: 회원팀 → 협회 우선 시설

- **팀**: team-nowon-fc (MEMBER)
- **시설**: facility-army-academy (ASSOCIATION_PRIORITY)
- **예상 권한**: APPLY
- **예상 메시지**: "우선 배정 대상입니다"

### 시나리오 2: 비회원팀 → 협회 우선 시설

- **팀**: team-dongbu-fc (NON_MEMBER)
- **시설**: facility-army-academy (ASSOCIATION_PRIORITY)
- **예상 권한**: VIEW_ONLY
- **예상 메시지**: "잔여 시간대만 이용 가능"
- **예상 CTA**: showConversionCTA = true

### 시나리오 3: 아카데미 → 협회 우선 시설

- **팀**: team-nowon-youth (ACADEMY)
- **시설**: facility-seoul-tech (ASSOCIATION_PRIORITY)
- **예상 권한**: REQUEST
- **예상 메시지**: "협회 선대관 일정 내 배정됩니다"

---

## ✅ 검증 완료

- ✅ 타입 정의 완료
- ✅ 권한 매트릭스 완료
- ✅ 헬퍼 함수 완료
- ✅ Firestore 데이터 구조 확인 완료

**다음 단계**: Firestore 데이터 조회 로직 구현 → API 엔드포인트 → 프론트엔드 Hook

---

**이 문서는 Policy Engine 구현의 현재 상태와 다음 단계를 명확히 정의합니다.**

