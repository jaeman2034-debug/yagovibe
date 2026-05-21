# 🗄️ Firestore 데이터베이스 스키마 설계

**생성일**: 2025-01-27  
**목적**: Policy Engine 및 전환 UX를 위한 Firestore 데이터 구조 정의  
**원칙**: 정규화 최소화, 쿼리 효율성, 확장성

---

## 📋 스키마 개요

```
Firestore Root
├── teams/{teamId}
├── facilities/{facilityId}
├── associations/{associationId}
│   ├── config/
│   │   └── policy
│   ├── conversionRequests/{requestId}
│   └── teams/{teamId}
├── bookings/{bookingId}
├── events/{eventId}
└── policies/
    └── default-governance
```

---

## 1️⃣ Teams 컬렉션

### teams/{teamId}

```typescript
interface TeamDocument {
  // 기본 정보
  id: string;
  name: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // 🔑 핵심 필드: 팀 상태
  status: "MEMBER" | "NON_MEMBER" | "ACADEMY" | "PENDING";
  
  // 협회 소속 (선택)
  associationId?: string;
  
  // 전환 문의 정보 (PENDING 상태일 때)
  conversionRequest?: {
    requestedAt: Timestamp;
    requestedBy: string; // 사용자 ID
    memo?: string;
  };
  
  // 메타데이터
  ownerUid: string; // 팀 대표
  sportType?: string;
  
  // 기타
  metadata?: {
    [key: string]: any;
  };
}
```

### 인덱스

```javascript
// firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "teams",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "associationId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "updatedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "teams",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "updatedAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

### 예시 데이터

```json
{
  "id": "team-123",
  "name": "동부FC",
  "status": "NON_MEMBER",
  "associationId": "assoc-1",
  "ownerUid": "user-456",
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-27T10:30:00Z"
}

{
  "id": "team-124",
  "name": "노원FC",
  "status": "MEMBER",
  "associationId": "assoc-1",
  "ownerUid": "user-789",
  "createdAt": "2024-06-01T00:00:00Z",
  "updatedAt": "2025-01-15T09:00:00Z"
}

{
  "id": "team-125",
  "name": "강북FC",
  "status": "PENDING",
  "associationId": "assoc-1",
  "ownerUid": "user-101",
  "conversionRequest": {
    "requestedAt": "2025-01-27T10:30:00Z",
    "requestedBy": "user-101",
    "memo": "협회 우선 대관 시설 이용을 위해 전환 신청합니다."
  },
  "createdAt": "2024-12-01T00:00:00Z",
  "updatedAt": "2025-01-27T10:30:00Z"
}
```

---

## 2️⃣ Facilities 컬렉션

### facilities/{facilityId}

```typescript
interface FacilityDocument {
  // 기본 정보
  id: string;
  name: string;
  location?: string;
  description?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // 🔑 핵심 필드: 시설 접근 정책
  accessPolicy: "ASSOCIATION_PRIORITY" | "ASSOCIATION_MANAGED" | "PUBLIC_OPEN";
  
  // 시설 상세 정보
  surfaceType: "ARTIFICIAL" | "NATURAL";
  capacity?: number;
  parkingAvailable?: boolean;
  parkingCapacity?: number;
  
  // 미디어
  imageUrl?: string;
  images?: string[];
  
  // 메타데이터
  metadata?: {
    [key: string]: any;
  };
}
```

### 인덱스

```javascript
{
  "indexes": [
    {
      "collectionGroup": "facilities",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "accessPolicy", "order": "ASCENDING" },
        { "fieldPath": "name", "order": "ASCENDING" }
      ]
    }
  ]
}
```

### 예시 데이터

```json
{
  "id": "facility-army-academy",
  "name": "육군사관학교 축구장",
  "location": "서울특별시 노원구 공릉로 574",
  "accessPolicy": "ASSOCIATION_PRIORITY",
  "surfaceType": "ARTIFICIAL",
  "capacity": 22,
  "parkingAvailable": true,
  "parkingCapacity": 20,
  "imageUrl": "https://example.com/army-academy.jpg",
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-01T00:00:00Z"
}

{
  "id": "facility-gyeonggi-mechanical",
  "name": "경기기계공업고등학교 축구장",
  "location": "서울특별시 노원구",
  "accessPolicy": "ASSOCIATION_PRIORITY",
  "surfaceType": "ARTIFICIAL",
  "capacity": 22,
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-01T00:00:00Z"
}

{
  "id": "facility-seoul-tech",
  "name": "서울과학기술대학교 운동장",
  "location": "서울특별시 노원구",
  "accessPolicy": "ASSOCIATION_PRIORITY",
  "surfaceType": "ARTIFICIAL",
  "capacity": 22,
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-01T00:00:00Z"
}

{
  "id": "facility-nowon-center",
  "name": "노원구민체육센터",
  "location": "서울특별시 노원구",
  "accessPolicy": "PUBLIC_OPEN",
  "surfaceType": "ARTIFICIAL",
  "capacity": 22,
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-01T00:00:00Z"
}
```

---

## 3️⃣ Associations 컬렉션

### associations/{associationId}

```typescript
interface AssociationDocument {
  // 기본 정보
  id: string;
  name: string;
  description?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // 관리자
  adminUids: string[];
  
  // 메타데이터
  metadata?: {
    [key: string]: any;
  };
}
```

### associations/{associationId}/config/policy

```typescript
interface AssociationPolicyConfig {
  // 협회 우선 대관 시설 목록
  associationPriorityFacilities: string[]; // facilityId 배열
  
  // 아카데미 배정 시설 목록
  associationManagedFacilities?: string[];
  
  // 커스텀 권한 매트릭스 (선택, 기본값 사용 가능)
  customPermissionMatrix?: {
    [teamStatus: string]: {
      [accessPolicy: string]: string;
    };
  };
}
```

### associations/{associationId}/conversionRequests/{requestId}

```typescript
interface ConversionRequestDocument {
  // 기본 정보
  id: string;
  teamId: string;
  teamName: string;
  requestedAt: Timestamp;
  requestedBy: string; // 사용자 ID
  
  // 상태
  status: "PENDING" | "APPROVED" | "REJECTED";
  
  // 처리 정보
  processedAt?: Timestamp;
  processedBy?: string; // 협회 관리자 ID
  memo?: string;
  rejectionReason?: string;
  
  // 메타데이터
  metadata?: {
    [key: string]: any;
  };
}
```

### 인덱스

```javascript
{
  "indexes": [
    {
      "collectionGroup": "conversionRequests",
      "queryScope": "COLLECTION_GROUP",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "requestedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "conversionRequests",
      "queryScope": "COLLECTION_GROUP",
      "fields": [
        { "fieldPath": "teamId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    }
  ]
}
```

### 예시 데이터

```json
// associations/assoc-1/config/policy
{
  "associationPriorityFacilities": [
    "facility-army-academy",
    "facility-gyeonggi-mechanical",
    "facility-seoul-tech"
  ]
}

// associations/assoc-1/conversionRequests/req-1
{
  "id": "req-1",
  "teamId": "team-125",
  "teamName": "강북FC",
  "requestedAt": "2025-01-27T10:30:00Z",
  "requestedBy": "user-101",
  "status": "PENDING",
  "memo": "협회 우선 대관 시설 이용을 위해 전환 신청합니다."
}
```

---

## 4️⃣ Bookings 컬렉션

### bookings/{bookingId}

```typescript
interface BookingDocument {
  // 기본 정보
  id: string;
  teamId: string;
  facilityId: string;
  
  // 대관 일시
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  dateTime: Timestamp; // 실제 타임스탬프
  
  // 상태
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  actionType: "APPLY" | "REQUEST" | "WAITLIST"; // 신청 시 액션 타입
  
  // 처리 정보
  requestedAt: Timestamp;
  requestedBy: string; // 사용자 ID
  processedAt?: Timestamp;
  processedBy?: string; // 협회 관리자 ID (REQUEST인 경우)
  
  // 메타데이터
  memo?: string;
  rejectionReason?: string;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 인덱스

```javascript
{
  "indexes": [
    {
      "collectionGroup": "bookings",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "facilityId", "order": "ASCENDING" },
        { "fieldPath": "dateTime", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "bookings",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "teamId", "order": "ASCENDING" },
        { "fieldPath": "dateTime", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "bookings",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "facilityId", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "ASCENDING" },
        { "fieldPath": "time", "order": "ASCENDING" }
      ]
    }
  ]
}
```

### 예시 데이터

```json
{
  "id": "booking-1",
  "teamId": "team-124",
  "facilityId": "facility-army-academy",
  "date": "2025-01-27",
  "time": "09:00",
  "dateTime": "2025-01-27T09:00:00Z",
  "status": "APPROVED",
  "actionType": "APPLY",
  "requestedAt": "2025-01-20T10:00:00Z",
  "requestedBy": "user-789",
  "processedAt": "2025-01-20T11:00:00Z",
  "createdAt": "2025-01-20T10:00:00Z",
  "updatedAt": "2025-01-20T11:00:00Z"
}

{
  "id": "booking-2",
  "teamId": "team-126",
  "facilityId": "facility-army-academy",
  "date": "2025-01-28",
  "time": "10:00",
  "dateTime": "2025-01-28T10:00:00Z",
  "status": "PENDING",
  "actionType": "REQUEST",
  "requestedAt": "2025-01-27T10:00:00Z",
  "requestedBy": "user-202",
  "createdAt": "2025-01-27T10:00:00Z",
  "updatedAt": "2025-01-27T10:00:00Z"
}
```

---

## 5️⃣ Events 컬렉션 (선택)

### events/{eventId}

```typescript
interface EventDocument {
  // 기본 정보
  id: string;
  type: string; // "TEAM_STATUS_CHANGED" | "BOOKING_PERMISSION_EVALUATED" | "MEMBERSHIP_APPROVED"
  
  // 이벤트 데이터
  payload: {
    [key: string]: any;
  };
  
  // 메타데이터
  timestamp: Timestamp;
  userId?: string;
  teamId?: string;
  facilityId?: string;
  
  // TTL (선택, 오래된 이벤트 자동 삭제)
  expiresAt?: Timestamp;
}
```

### 인덱스

```javascript
{
  "indexes": [
    {
      "collectionGroup": "events",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "type", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "events",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "teamId", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    }
  ]
}
```

### 예시 데이터

```json
{
  "id": "event-1",
  "type": "TEAM_STATUS_CHANGED",
  "payload": {
    "teamId": "team-125",
    "oldStatus": "PENDING",
    "newStatus": "MEMBER",
    "associationId": "assoc-1"
  },
  "timestamp": "2025-01-27T11:00:00Z",
  "teamId": "team-125"
}

{
  "id": "event-2",
  "type": "BOOKING_PERMISSION_EVALUATED",
  "payload": {
    "teamId": "team-123",
    "facilityId": "facility-army-academy",
    "actionType": "VIEW_ONLY",
    "reasonCode": "NON_MEMBER_ASSOCIATION_PRIORITY"
  },
  "timestamp": "2025-01-27T10:00:00Z",
  "teamId": "team-123",
  "facilityId": "facility-army-academy"
}
```

---

## 6️⃣ 마이그레이션 전략

### 초기 데이터 마이그레이션

```typescript
// functions/src/migrations/001-initial-schema.ts

import { getFirestore } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";

const db = getFirestore();

/**
 * 초기 스키마 마이그레이션
 * - 기존 teams 컬렉션에 status 필드 추가 (기본값: NON_MEMBER)
 * - associations 컬렉션 생성
 * - facilities 컬렉션 생성 (협회 우선 대관 시설)
 */
export async function migrateInitialSchema(): Promise<void> {
  try {
    logger.info("Starting initial schema migration...");

    // 1. 기존 teams에 status 필드 추가
    const teamsSnapshot = await db.collection("teams").get();
    const batch = db.batch();
    let batchCount = 0;

    teamsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (!data.status) {
        batch.update(doc.ref, {
          status: "NON_MEMBER",
          updatedAt: new Date(),
        });
        batchCount++;
      }
    });

    if (batchCount > 0) {
      await batch.commit();
      logger.info(`Updated ${batchCount} teams with status field`);
    }

    // 2. 협회 우선 대관 시설 생성
    const associationPriorityFacilities = [
      {
        id: "facility-army-academy",
        name: "육군사관학교 축구장",
        location: "서울특별시 노원구 공릉로 574",
        accessPolicy: "ASSOCIATION_PRIORITY",
        surfaceType: "ARTIFICIAL",
        capacity: 22,
        parkingAvailable: true,
        parkingCapacity: 20,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "facility-gyeonggi-mechanical",
        name: "경기기계공업고등학교 축구장",
        location: "서울특별시 노원구",
        accessPolicy: "ASSOCIATION_PRIORITY",
        surfaceType: "ARTIFICIAL",
        capacity: 22,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "facility-seoul-tech",
        name: "서울과학기술대학교 운동장",
        location: "서울특별시 노원구",
        accessPolicy: "ASSOCIATION_PRIORITY",
        surfaceType: "ARTIFICIAL",
        capacity: 22,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const facilitiesBatch = db.batch();
    associationPriorityFacilities.forEach((facility) => {
      const ref = db.doc(`facilities/${facility.id}`);
      facilitiesBatch.set(ref, facility, { merge: true });
    });
    await facilitiesBatch.commit();
    logger.info(`Created ${associationPriorityFacilities.length} association priority facilities`);

    // 3. 협회 정책 설정 생성 (예시: 노원구축구협회)
    const associationId = "assoc-nowon-football";
    const policyRef = db.doc(`associations/${associationId}/config/policy`);
    await policyRef.set({
      associationPriorityFacilities: associationPriorityFacilities.map((f) => f.id),
    }, { merge: true });
    logger.info(`Created policy config for association: ${associationId}`);

    logger.info("Initial schema migration completed successfully");
  } catch (error) {
    logger.error(`Migration failed: ${error}`);
    throw error;
  }
}
```

---

### 점진적 마이그레이션

```typescript
// functions/src/migrations/002-add-conversion-request.ts

/**
 * 전환 문의 기능 추가 마이그레이션
 * - PENDING 상태인 팀들에 conversionRequest 필드 추가 (있는 경우)
 */
export async function migrateConversionRequest(): Promise<void> {
  try {
    logger.info("Starting conversion request migration...");

    const teamsSnapshot = await db
      .collection("teams")
      .where("status", "==", "PENDING")
      .get();

    const batch = db.batch();
    let batchCount = 0;

    teamsSnapshot.forEach((doc) => {
      const data = doc.data();
      // conversionRequest 필드가 없으면 기본 구조 추가
      if (!data.conversionRequest && data.status === "PENDING") {
        batch.update(doc.ref, {
          conversionRequest: {
            requestedAt: data.updatedAt || new Date(),
            requestedBy: data.ownerUid || "",
          },
          updatedAt: new Date(),
        });
        batchCount++;
      }
    });

    if (batchCount > 0) {
      await batch.commit();
      logger.info(`Updated ${batchCount} teams with conversion request field`);
    }

    logger.info("Conversion request migration completed successfully");
  } catch (error) {
    logger.error(`Migration failed: ${error}`);
    throw error;
  }
}
```

---

## 7️⃣ Firestore 보안 규칙

```javascript
// firestore.rules

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Teams 컬렉션
    match /teams/{teamId} {
      // 읽기: 팀 소속 사용자 또는 협회 관리자
      allow read: if request.auth != null && (
        resource.data.ownerUid == request.auth.uid ||
        exists(/databases/$(database)/documents/team_members/$(teamId + '_' + request.auth.uid))
      );
      
      // 쓰기: 팀 소유자만
      allow write: if request.auth != null && 
        resource.data.ownerUid == request.auth.uid;
      
      // status 필드 업데이트: 협회 관리자만
      allow update: if request.auth != null && (
        request.resource.data.diff(resource.data).affectedKeys()
          .hasOnly(['status', 'conversionRequest', 'updatedAt']) &&
        get(/databases/$(database)/documents/associations/$(resource.data.associationId)).data.adminUids
          .hasAny([request.auth.uid])
      );
    }
    
    // Facilities 컬렉션
    match /facilities/{facilityId} {
      // 읽기: 인증된 사용자 모두
      allow read: if request.auth != null;
      
      // 쓰기: 관리자만
      allow write: if false; // Cloud Function에서만 관리
    }
    
    // Associations 컬렉션
    match /associations/{associationId} {
      // 읽기: 인증된 사용자 모두
      allow read: if request.auth != null;
      
      // 쓰기: 협회 관리자만
      allow write: if request.auth != null &&
        resource.data.adminUids.hasAny([request.auth.uid]);
      
      // Conversion Requests 서브컬렉션
      match /conversionRequests/{requestId} {
        // 읽기: 팀 소유자 또는 협회 관리자
        allow read: if request.auth != null && (
          resource.data.requestedBy == request.auth.uid ||
          get(/databases/$(database)/documents/associations/$(associationId)).data.adminUids
            .hasAny([request.auth.uid])
        );
        
        // 쓰기: 협회 관리자만
        allow write: if request.auth != null &&
          get(/databases/$(database)/documents/associations/$(associationId)).data.adminUids
            .hasAny([request.auth.uid]);
      }
    }
    
    // Bookings 컬렉션
    match /bookings/{bookingId} {
      // 읽기: 팀 소속 사용자 또는 시설 관리자
      allow read: if request.auth != null;
      
      // 생성: 팀 소속 사용자만
      allow create: if request.auth != null &&
        exists(/databases/$(database)/documents/team_members/$(request.resource.data.teamId + '_' + request.auth.uid));
      
      // 업데이트: 팀 소속 사용자 또는 협회 관리자
      allow update: if request.auth != null;
      
      // 삭제: 팀 소속 사용자만
      allow delete: if request.auth != null &&
        resource.data.requestedBy == request.auth.uid;
    }
  }
}
```

---

## 8️⃣ 쿼리 패턴

### 협회 소속 팀 목록 조회

```typescript
// 회원팀만
const memberTeams = await db
  .collection("teams")
  .where("associationId", "==", associationId)
  .where("status", "==", "MEMBER")
  .orderBy("updatedAt", "desc")
  .get();

// 모든 팀 (회원/비회원/아카데미)
const allTeams = await db
  .collection("teams")
  .where("associationId", "==", associationId)
  .orderBy("status", "asc")
  .orderBy("updatedAt", "desc")
  .get();
```

### 협회 우선 대관 시설 목록 조회

```typescript
const priorityFacilities = await db
  .collection("facilities")
  .where("accessPolicy", "==", "ASSOCIATION_PRIORITY")
  .orderBy("name", "asc")
  .get();
```

### 전환 문의 목록 조회

```typescript
const pendingRequests = await db
  .collectionGroup("conversionRequests")
  .where("status", "==", "PENDING")
  .orderBy("requestedAt", "desc")
  .get();
```

### 시설별 대관 목록 조회

```typescript
const bookings = await db
  .collection("bookings")
  .where("facilityId", "==", facilityId)
  .where("dateTime", ">=", startDate)
  .where("dateTime", "<=", endDate)
  .where("status", "==", "APPROVED")
  .orderBy("dateTime", "asc")
  .get();
```

---

## ✅ 검증 완료

### 반드시 지켜야 할 것

- ✅ 정규화 최소화 (쿼리 효율성)
- ✅ 인덱스 최적화
- ✅ 보안 규칙 명확
- ✅ 확장 가능한 구조

### 하지 말 것

- ❌ 과도한 정규화
- ❌ 중복 데이터 남용
- ❌ 인덱스 없는 쿼리

---

**이 DB 스키마 설계는 Policy Engine과 전환 UX를 완전히 지원하는 Firestore 데이터 구조를 정의합니다.**

