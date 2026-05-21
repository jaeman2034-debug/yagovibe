# 🔐 백엔드 권한 엔진 (Policy Engine) 설계 (확정안)

**생성일**: 2025-01-27  
**목적**: FacilityAccessPolicy 판단, BookingPermission 계산, 전환 승인 후 상태 변경 트리거  
**원칙**: 조건문 제거, 정책 중심, UX/권한/회계 연동 자동화

---

## 📋 설계 원칙

- ✅ **권한 판단은 서버 단에서 단일 책임**
- ✅ **프론트는 결과만 소비**
- ✅ **규칙 변경 = 정책 데이터 수정, 코드 변경 최소화**

---

## 1️⃣ 핵심 도메인 모델

### Team

```typescript
type Team = {
  id: string;
  status: TeamStatus; // MEMBER | NON_MEMBER | ACADEMY | PENDING
  associationId?: string;
};
```

### Facility

```typescript
type Facility = {
  id: string;
  accessPolicy: FacilityAccessPolicy; 
  // ASSOCIATION_PRIORITY | ASSOCIATION_MANAGED | PUBLIC_OPEN
};
```

### Context

```typescript
type BookingContext = {
  team: Team;
  facility: Facility;
  dateTime: string;
};
```

---

## 2️⃣ Permission Decision Object (단일 출력)

```typescript
type PermissionDecision = {
  actionType: "APPLY" | "REQUEST" | "WAITLIST" | "VIEW_ONLY";
  reasonCode: string; // UI 메시지 매핑용
};
```

**프론트는 actionType만으로 CTA/색상/행동 결정**  
**reasonCode는 로깅·메시지 매핑에만 사용**

---

## 3️⃣ 정책 매트릭스 (정책의 핵심)

```typescript
const BOOKING_POLICY_MATRIX = {
  MEMBER: {
    ASSOCIATION_PRIORITY: "APPLY",
    ASSOCIATION_MANAGED: "APPLY",
    PUBLIC_OPEN: "APPLY"
  },
  ACADEMY: {
    ASSOCIATION_PRIORITY: "REQUEST",
    ASSOCIATION_MANAGED: "REQUEST",
    PUBLIC_OPEN: "APPLY"
  },
  NON_MEMBER: {
    ASSOCIATION_PRIORITY: "VIEW_ONLY",
    ASSOCIATION_MANAGED: "WAITLIST",
    PUBLIC_OPEN: "APPLY"
  },
  PENDING: {
    ASSOCIATION_PRIORITY: "VIEW_ONLY",
    ASSOCIATION_MANAGED: "WAITLIST",
    PUBLIC_OPEN: "APPLY"
  }
} as const;
```

**👉 이 매트릭스가 전 UX의 근간**  
**👉 시설(육사/경기기계/과기대)은 ASSOCIATION_PRIORITY**

---

## 4️⃣ Policy Resolver (핵심 로직)

```typescript
function resolveBookingPermission(
  context: BookingContext
): PermissionDecision {
  const { team, facility } = context;

  const actionType =
    BOOKING_POLICY_MATRIX[team.status][facility.accessPolicy];

  return {
    actionType,
    reasonCode: `${team.status}_${facility.accessPolicy}`
  };
}
```

**if/else ❌**  
**switch ❌**  
**O(1) 정책 조회 ⭕️**

---

## 1️⃣ Policy Engine 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│ API Request                                                 │
│ (teamId, facilityId)                                        │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Policy Engine (Backend)                                     │
│                                                             │
│ 1. TeamStatus Resolver                                      │
│    └─ Query: teams/{teamId}                                │
│       → TeamStatus (MEMBER/NON_MEMBER/ACADEMY/PENDING)     │
│                                                             │
│ 2. FacilityAccessPolicy Resolver                            │
│    └─ Query: facilities/{facilityId}                       │
│       → FacilityAccessPolicy                               │
│                                                             │
│ 3. BookingPermission Calculator                             │
│    └─ MATRIX[TeamStatus][FacilityAccessPolicy]             │
│       → BookingPermission                                   │
│                                                             │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ API Response                                                │
│ { permission, message, showConversionCTA }                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2️⃣ FacilityAccessPolicy 판단 로직

### 데이터 구조 (Firestore)

```typescript
// facilities/{facilityId}
interface FacilityDocument {
  id: string;
  name: string;
  location: string;
  surfaceType: "ARTIFICIAL" | "NATURAL";
  
  // 🔑 핵심 필드: 시설 접근 정책
  accessPolicy: "ASSOCIATION_PRIORITY" | "ASSOCIATION_MANAGED" | "PUBLIC_OPEN";
  
  // 협회 우선 대관 시설 목록 (하드코딩 또는 설정)
  // 예: ["facility-1", "facility-2", "facility-3"]
  // → 육사, 경기기계공고, 과기대
  
  imageUrl?: string;
  description?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Policy Resolver 구현

```typescript
// functions/src/policy/facilityPolicyResolver.ts

import { getFirestore } from "firebase-admin/firestore";
import { FacilityAccessPolicy } from "../types/facility";
import * as logger from "firebase-functions/logger";

const db = getFirestore();

/**
 * 시설 접근 정책 조회
 * 
 * @param facilityId - 시설 ID
 * @returns FacilityAccessPolicy
 */
export async function resolveFacilityAccessPolicy(
  facilityId: string
): Promise<FacilityAccessPolicy> {
  try {
    const facilityDoc = await db.doc(`facilities/${facilityId}`).get();
    
    if (!facilityDoc.exists) {
      logger.warn(`Facility not found: ${facilityId}`);
      // 기본값: 일반 공공 시설
      return FacilityAccessPolicy.PUBLIC_OPEN;
    }
    
    const facility = facilityDoc.data()!;
    const accessPolicy = facility.accessPolicy as string;
    
    // 타입 가드
    if (
      accessPolicy === FacilityAccessPolicy.ASSOCIATION_PRIORITY ||
      accessPolicy === FacilityAccessPolicy.ASSOCIATION_MANAGED ||
      accessPolicy === FacilityAccessPolicy.PUBLIC_OPEN
    ) {
      return accessPolicy as FacilityAccessPolicy;
    }
    
    // 기본값
    logger.warn(`Invalid accessPolicy for facility ${facilityId}: ${accessPolicy}`);
    return FacilityAccessPolicy.PUBLIC_OPEN;
  } catch (error) {
    logger.error(`Error resolving facility access policy: ${error}`);
    throw error;
  }
}

/**
 * 협회 우선 대관 시설 목록 조회 (설정 기반)
 */
export async function getAssociationPriorityFacilities(
  associationId: string
): Promise<string[]> {
  try {
    const configDoc = await db.doc(`associations/${associationId}/config/policy`).get();
    
    if (!configDoc.exists) {
      // 기본값: 하드코딩된 시설 목록
      return [
        "facility-army-academy",      // 육군사관학교 축구장
        "facility-gyeonggi-mechanical", // 경기기계공업고등학교 축구장
        "facility-seoul-tech",        // 서울과학기술대학교 운동장
      ];
    }
    
    const config = configDoc.data()!;
    return config.associationPriorityFacilities || [];
  } catch (error) {
    logger.error(`Error getting association priority facilities: ${error}`);
    return [];
  }
}
```

---

## 3️⃣ BookingPermission 계산

### Matrix 기반 계산기

```typescript
// functions/src/policy/bookingPermissionCalculator.ts

import { TeamStatus } from "../types/teamStatus";
import { FacilityAccessPolicy } from "../types/facility";
import { BookingPermission } from "../types/booking";

/**
 * 팀 상태 + 시설 정책 → 대관 권한 매트릭스
 * 
 * 이 매트릭스 하나로 모든 권한 분기 자동화
 */
const BOOKING_PERMISSION_MATRIX: Record<
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
 * 대관 권한 계산
 * 
 * @param teamStatus - 팀 상태
 * @param facilityPolicy - 시설 접근 정책
 * @returns BookingPermission
 */
export function calculateBookingPermission(
  teamStatus: TeamStatus,
  facilityPolicy: FacilityAccessPolicy
): BookingPermission {
  return BOOKING_PERMISSION_MATRIX[teamStatus][facilityPolicy];
}

/**
 * 상태 메시지 매핑 (권한별)
 */
export const PERMISSION_MESSAGE_MAP: Record<BookingPermission, string> = {
  [BookingPermission.APPLY]: "우선 배정 대상입니다",
  [BookingPermission.REQUEST]: "협회 선대관 일정 내 배정됩니다",
  [BookingPermission.WAITLIST]: "잔여 시간대만 이용 가능",
  [BookingPermission.VIEW_ONLY]: "잔여 시간대만 이용 가능",
};

/**
 * 전환 CTA 표시 여부 판단
 */
export function shouldShowConversionCTA(
  teamStatus: TeamStatus,
  permission: BookingPermission
): boolean {
  return (
    teamStatus === TeamStatus.NON_MEMBER &&
    permission === BookingPermission.VIEW_ONLY
  );
}
```

---

## 4️⃣ TeamStatus Resolver

### 데이터 구조 (Firestore)

```typescript
// teams/{teamId}
interface TeamDocument {
  id: string;
  name: string;
  
  // 🔑 핵심 필드: 팀 상태
  status: "MEMBER" | "NON_MEMBER" | "ACADEMY" | "PENDING";
  
  // 협회 소속 (선택)
  associationId?: string;
  
  // 전환 문의 정보 (PENDING 상태일 때)
  conversionRequest?: {
    requestedAt: Timestamp;
    memo?: string;
    requestedBy: string; // 사용자 ID
  };
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Status Resolver 구현

```typescript
// functions/src/policy/teamStatusResolver.ts

import { getFirestore } from "firebase-admin/firestore";
import { TeamStatus } from "../types/teamStatus";
import * as logger from "firebase-functions/logger";

const db = getFirestore();

/**
 * 팀 상태 조회
 * 
 * @param teamId - 팀 ID
 * @returns TeamStatus
 */
export async function resolveTeamStatus(teamId: string): Promise<TeamStatus> {
  try {
    const teamDoc = await db.doc(`teams/${teamId}`).get();
    
    if (!teamDoc.exists) {
      logger.warn(`Team not found: ${teamId}`);
      throw new Error(`Team not found: ${teamId}`);
    }
    
    const team = teamDoc.data()!;
    const status = team.status as string;
    
    // 타입 가드
    if (
      status === TeamStatus.MEMBER ||
      status === TeamStatus.NON_MEMBER ||
      status === TeamStatus.ACADEMY ||
      status === TeamStatus.PENDING
    ) {
      return status as TeamStatus;
    }
    
    // 기본값: 비회원팀
    logger.warn(`Invalid team status for team ${teamId}: ${status}`);
    return TeamStatus.NON_MEMBER;
  } catch (error) {
    logger.error(`Error resolving team status: ${error}`);
    throw error;
  }
}
```

---

## 5️⃣ 통합 Permission API

### HTTP Callable Function

```typescript
// functions/src/api/getBookingPermission.ts

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { resolveTeamStatus } from "../policy/teamStatusResolver";
import { resolveFacilityAccessPolicy } from "../policy/facilityPolicyResolver";
import { calculateBookingPermission, PERMISSION_MESSAGE_MAP, shouldShowConversionCTA } from "../policy/bookingPermissionCalculator";
import { BookingPermission } from "../types/booking";
import * as logger from "firebase-functions/logger";

/**
 * POST /api/bookings/permission
 * 대관 권한 조회 API
 */
export const getBookingPermission = onCall(
  {
    region: "asia-northeast3",
    cors: true,
  },
  async (req) => {
    const { teamId, facilityId } = req.data ?? {};
    const uid = req.auth?.uid;

    // 1. 인증 체크
    if (!uid) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    // 2. 파라미터 검증
    if (!teamId || !facilityId) {
      throw new HttpsError("invalid-argument", "teamId와 facilityId가 필요합니다.");
    }

    try {
      // 3. 팀 상태 조회
      const teamStatus = await resolveTeamStatus(teamId);

      // 4. 시설 접근 정책 조회
      const facilityPolicy = await resolveFacilityAccessPolicy(facilityId);

      // 5. 대관 권한 계산 (매트릭스 기반)
      const permission = calculateBookingPermission(teamStatus, facilityPolicy);

      // 6. 상태 메시지 조회
      const message = PERMISSION_MESSAGE_MAP[permission];

      // 7. 전환 CTA 표시 여부 판단
      const showConversionCTA = shouldShowConversionCTA(teamStatus, permission);

      // 8. 응답 반환
      return {
        success: true,
        permission: {
          actionType: permission,
        },
        message,
        showConversionCTA,
        teamStatus,
        facilityPolicy,
      };
    } catch (error) {
      logger.error(`Error getting booking permission: ${error}`);
      throw new HttpsError("internal", "대관 권한 조회 중 오류가 발생했습니다.");
    }
  }
);
```

---

## 6️⃣ 전환 승인 후 상태 변경 트리거

### Cloud Function (Trigger)

```typescript
// functions/src/triggers/onTeamConversionApproved.ts

import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { getFirestore } from "firebase-admin/firestore";
import { TeamStatus } from "../types/teamStatus";
import * as logger from "firebase-functions/logger";

const db = getFirestore();

/**
 * 팀 전환 승인 문서 변경 감지
 * 
 * associations/{associationId}/conversionRequests/{requestId}
 * status: "PENDING" → "APPROVED"
 */
export const onTeamConversionApproved = onDocumentWritten(
  {
    document: "associations/{associationId}/conversionRequests/{requestId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();

    // 상태 변경 감지: PENDING → APPROVED
    if (before?.status === "PENDING" && after?.status === "APPROVED") {
      const teamId = after.teamId;
      const associationId = event.params.associationId;

      logger.info(`Team conversion approved: teamId=${teamId}, associationId=${associationId}`);

      try {
        // 1. 팀 상태 업데이트: PENDING → MEMBER
        const teamRef = db.doc(`teams/${teamId}`);
        await teamRef.update({
          status: TeamStatus.MEMBER,
          associationId,
          updatedAt: new Date(),
          // 전환 문의 정보 제거 (또는 승인 정보로 업데이트)
          conversionRequest: null,
        });

        logger.info(`Team status updated to MEMBER: teamId=${teamId}`);

        // 2. (선택) 팀 카드 위치 업데이트 (협회 하위로 이동)
        // 이는 프론트엔드에서 자동으로 처리됨 (associationId 기반)

        // 3. (선택) 알림 전송 (팀 관리자에게)
        // await sendNotification(...);

      } catch (error) {
        logger.error(`Error updating team status: ${error}`);
        throw error;
      }
    }
  }
);
```

---

## 7️⃣ 전환 문의 API

```typescript
// functions/src/api/requestTeamConversion.ts

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { TeamStatus } from "../types/teamStatus";
import * as logger from "firebase-functions/logger";

const db = getFirestore();

/**
 * POST /api/teams/{teamId}/conversion
 * 전환 문의 API
 */
export const requestTeamConversion = onCall(
  {
    region: "asia-northeast3",
    cors: true,
  },
  async (req) => {
    const { teamId, memo } = req.data ?? {};
    const uid = req.auth?.uid;

    // 1. 인증 체크
    if (!uid) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    // 2. 파라미터 검증
    if (!teamId) {
      throw new HttpsError("invalid-argument", "teamId가 필요합니다.");
    }

    try {
      const teamRef = db.doc(`teams/${teamId}`);
      const teamDoc = await teamRef.get();

      if (!teamDoc.exists) {
        throw new HttpsError("not-found", "팀을 찾을 수 없습니다.");
      }

      const team = teamDoc.data()!;
      const currentStatus = team.status as TeamStatus;

      // 3. 전환 가능 여부 확인
      if (currentStatus !== TeamStatus.NON_MEMBER) {
        throw new HttpsError(
          "failed-precondition",
          "비회원팀만 전환 신청이 가능합니다."
        );
      }

      // 4. 팀 상태 업데이트: NON_MEMBER → PENDING
      await teamRef.update({
        status: TeamStatus.PENDING,
        conversionRequest: {
          requestedAt: new Date(),
          memo: memo || null,
          requestedBy: uid,
        },
        updatedAt: new Date(),
      });

      // 5. (선택) 협회에 전환 요청 문서 생성
      const associationId = team.associationId;
      if (associationId) {
        const conversionRequestRef = db.collection(`associations/${associationId}/conversionRequests`).doc();
        await conversionRequestRef.set({
          teamId,
          teamName: team.name,
          requestedAt: new Date(),
          requestedBy: uid,
          memo: memo || null,
          status: "PENDING",
        });
      }

      logger.info(`Team conversion requested: teamId=${teamId}`);

      return {
        success: true,
        newStatus: TeamStatus.PENDING,
        requestedAt: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      logger.error(`Error requesting team conversion: ${error}`);
      throw new HttpsError("internal", "전환 신청 중 오류가 발생했습니다.");
    }
  }
);
```

---

## 8️⃣ 상태 변경 후 UI 자동 갱신 (Real-time)

### Firestore Real-time Listener (Frontend)

```typescript
// src/hooks/useTeamStatus.ts

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TeamStatus } from "@/types/teamStatus";

/**
 * 팀 상태 실시간 구독 Hook
 * 상태 변경 시 자동으로 UI 갱신
 */
export function useTeamStatus(teamId: string | null) {
  const [teamStatus, setTeamStatus] = useState<TeamStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamId) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, `teams/${teamId}`),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setTeamStatus(data.status as TeamStatus);
        } else {
          setTeamStatus(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error listening to team status:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [teamId]);

  return { teamStatus, loading };
}
```

---

## 9️⃣ 정책 확장성 (미래)

### 동적 정책 설정

```typescript
// associations/{associationId}/config/policy
interface AssociationPolicyConfig {
  // 협회 우선 대관 시설 목록
  associationPriorityFacilities: string[];
  
  // 아카데미 배정 시설 목록
  associationManagedFacilities: string[];
  
  // 커스텀 권한 매트릭스 (선택, 기본값 사용 가능)
  customPermissionMatrix?: Record<
    TeamStatus,
    Record<FacilityAccessPolicy, BookingPermission>
  >;
}
```

---

## ✅ 검증 완료

### 반드시 지켜야 할 것

- ✅ 조건문이 아닌 정책(Policy) 기반 권한 관리
- ✅ 매트릭스 기반 권한 계산
- ✅ 상태 변경 트리거 (자동화)
- ✅ 실시간 UI 갱신 (Firestore Listener)

### 하지 말 것

- ❌ 하드코딩된 조건문
- ❌ 중복된 권한 로직
- ❌ 수동 상태 동기화

---

**이 Policy Engine 설계는 백엔드 권한 관리를 완전 자동화하고, 프론트엔드와의 통신을 최소화합니다.**

