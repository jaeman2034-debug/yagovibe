# 🌱 시드 데이터 마이그레이션 스크립트 (노원구축구협회 기준)

**생성일**: 2025-01-27  
**목적**: Policy Engine 및 전환 UX 테스트를 위한 초기 데이터 생성  
**대상**: 노원구축구협회 및 관련 시설/팀 샘플 데이터

---

## 📋 시드 데이터 구성

1. **협회**: 노원구축구협회
2. **시설**: 협회 우선 대관 시설 3개 (육사, 경기기계공고, 과기대)
3. **팀**: 회원팀 3개, 비회원팀 3개, 아카데미 2개
4. **정책 설정**: 협회 정책 설정

---

## 🔧 마이그레이션 스크립트

### functions/src/migrations/seed-nowon-association.ts

```typescript
import { getFirestore } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";

const db = getFirestore();

/**
 * 노원구축구협회 시드 데이터 생성
 * 
 * 실행 방법:
 *   npx ts-node functions/src/migrations/seed-nowon-association.ts
 */
export async function seedNowonAssociation(): Promise<void> {
  try {
    logger.info("Starting seed data migration for Nowon Football Association...");

    // 1. 협회 생성
    const associationId = "assoc-nowon-football";
    const associationRef = db.doc(`associations/${associationId}`);
    
    await associationRef.set({
      id: associationId,
      name: "노원구축구협회",
      description: "서울특별시 노원구 축구협회",
      region: "노원구",
      adminUids: [], // 실제 운영 시 관리자 UID 추가
      createdAt: new Date(),
      updatedAt: new Date(),
    }, { merge: true });
    
    logger.info(`✅ Created association: ${associationId}`);

    // 2. 협회 우선 대관 시설 생성
    const facilities = [
      {
        id: "facility-army-academy",
        name: "육군사관학교 축구장",
        location: "서울특별시 노원구 공릉로 574",
        description: "11인제 인조잔디 축구장",
        accessPolicy: "ASSOCIATION_PRIORITY",
        surfaceType: "ARTIFICIAL",
        capacity: 22,
        parkingAvailable: true,
        parkingCapacity: 20,
        imageUrl: "https://example.com/army-academy.jpg",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "facility-gyeonggi-mechanical",
        name: "경기기계공업고등학교 축구장",
        location: "서울특별시 노원구",
        description: "11인제 인조잔디 축구장",
        accessPolicy: "ASSOCIATION_PRIORITY",
        surfaceType: "ARTIFICIAL",
        capacity: 22,
        parkingAvailable: true,
        parkingCapacity: 15,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "facility-seoul-tech",
        name: "서울과학기술대학교 운동장",
        location: "서울특별시 노원구 공릉로 232",
        description: "11인제 인조잔디 축구장",
        accessPolicy: "ASSOCIATION_PRIORITY",
        surfaceType: "ARTIFICIAL",
        capacity: 22,
        parkingAvailable: true,
        parkingCapacity: 30,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const facilitiesBatch = db.batch();
    facilities.forEach((facility) => {
      const ref = db.doc(`facilities/${facility.id}`);
      facilitiesBatch.set(ref, facility, { merge: true });
    });
    await facilitiesBatch.commit();
    
    logger.info(`✅ Created ${facilities.length} association priority facilities`);

    // 3. 협회 정책 설정
    const policyRef = db.doc(`associations/${associationId}/config/policy`);
    await policyRef.set({
      associationPriorityFacilities: facilities.map((f) => f.id),
      associationManagedFacilities: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }, { merge: true });
    
    logger.info(`✅ Created policy config for association: ${associationId}`);

    // 4. 샘플 팀 생성
    const teams = [
      // 회원팀 3개
      {
        id: "team-nowon-fc",
        name: "노원FC",
        status: "MEMBER",
        associationId: associationId,
        ownerUid: "user-sample-1", // 실제 운영 시 실제 UID로 변경
        sportType: "football",
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date(),
      },
      {
        id: "team-gangbuk-fc",
        name: "강북FC",
        status: "MEMBER",
        associationId: associationId,
        ownerUid: "user-sample-2",
        sportType: "football",
        createdAt: new Date("2024-02-01"),
        updatedAt: new Date(),
      },
      {
        id: "team-gongneung-fc",
        name: "공릉FC",
        status: "MEMBER",
        associationId: associationId,
        ownerUid: "user-sample-3",
        sportType: "football",
        createdAt: new Date("2024-03-01"),
        updatedAt: new Date(),
      },
      // 비회원팀 3개
      {
        id: "team-dongbu-fc",
        name: "동부FC",
        status: "NON_MEMBER",
        associationId: associationId,
        ownerUid: "user-sample-4",
        sportType: "football",
        createdAt: new Date("2024-04-01"),
        updatedAt: new Date(),
      },
      {
        id: "team-jungang-fc",
        name: "중앙FC",
        status: "NON_MEMBER",
        associationId: associationId,
        ownerUid: "user-sample-5",
        sportType: "football",
        createdAt: new Date("2024-05-01"),
        updatedAt: new Date(),
      },
      {
        id: "team-bukbu-fc",
        name: "북부FC",
        status: "NON_MEMBER",
        associationId: associationId,
        ownerUid: "user-sample-6",
        sportType: "football",
        createdAt: new Date("2024-06-01"),
        updatedAt: new Date(),
      },
      // 아카데미 2개
      {
        id: "team-nowon-youth",
        name: "노원유스",
        status: "ACADEMY",
        associationId: associationId,
        ownerUid: "user-sample-7",
        sportType: "football",
        createdAt: new Date("2024-07-01"),
        updatedAt: new Date(),
      },
      {
        id: "team-silver-fc",
        name: "실버축구단",
        status: "ACADEMY",
        associationId: associationId,
        ownerUid: "user-sample-8",
        sportType: "football",
        createdAt: new Date("2024-08-01"),
        updatedAt: new Date(),
      },
    ];

    const teamsBatch = db.batch();
    teams.forEach((team) => {
      const ref = db.doc(`teams/${team.id}`);
      teamsBatch.set(ref, team, { merge: true });
    });
    await teamsBatch.commit();
    
    logger.info(`✅ Created ${teams.length} teams (${teams.filter(t => t.status === "MEMBER").length} members, ${teams.filter(t => t.status === "NON_MEMBER").length} non-members, ${teams.filter(t => t.status === "ACADEMY").length} academies)`);

    // 5. 샘플 대관 데이터 (회원팀 대관 기록)
    const now = new Date();
    const bookings = [
      {
        id: "booking-1",
        teamId: "team-nowon-fc",
        facilityId: "facility-army-academy",
        date: "2025-01-27",
        time: "09:00",
        dateTime: new Date("2025-01-27T09:00:00Z"),
        status: "APPROVED",
        actionType: "APPLY",
        requestedAt: new Date("2025-01-20T10:00:00Z"),
        requestedBy: "user-sample-1",
        processedAt: new Date("2025-01-20T11:00:00Z"),
        createdAt: new Date("2025-01-20T10:00:00Z"),
        updatedAt: new Date("2025-01-20T11:00:00Z"),
      },
      {
        id: "booking-2",
        teamId: "team-gangbuk-fc",
        facilityId: "facility-army-academy",
        date: "2025-01-27",
        time: "10:00",
        dateTime: new Date("2025-01-27T10:00:00Z"),
        status: "APPROVED",
        actionType: "APPLY",
        requestedAt: new Date("2025-01-21T10:00:00Z"),
        requestedBy: "user-sample-2",
        processedAt: new Date("2025-01-21T11:00:00Z"),
        createdAt: new Date("2025-01-21T10:00:00Z"),
        updatedAt: new Date("2025-01-21T11:00:00Z"),
      },
      {
        id: "booking-3",
        teamId: "team-gongneung-fc",
        facilityId: "facility-gyeonggi-mechanical",
        date: "2025-01-27",
        time: "09:00",
        dateTime: new Date("2025-01-27T09:00:00Z"),
        status: "APPROVED",
        actionType: "APPLY",
        requestedAt: new Date("2025-01-22T10:00:00Z"),
        requestedBy: "user-sample-3",
        processedAt: new Date("2025-01-22T11:00:00Z"),
        createdAt: new Date("2025-01-22T10:00:00Z"),
        updatedAt: new Date("2025-01-22T11:00:00Z"),
      },
      {
        id: "booking-4",
        teamId: "team-nowon-youth",
        facilityId: "facility-seoul-tech",
        date: "2025-01-28",
        time: "10:00",
        dateTime: new Date("2025-01-28T10:00:00Z"),
        status: "PENDING",
        actionType: "REQUEST",
        requestedAt: new Date("2025-01-27T10:00:00Z"),
        requestedBy: "user-sample-7",
        createdAt: new Date("2025-01-27T10:00:00Z"),
        updatedAt: new Date("2025-01-27T10:00:00Z"),
      },
    ];

    const bookingsBatch = db.batch();
    bookings.forEach((booking) => {
      const ref = db.doc(`bookings/${booking.id}`);
      bookingsBatch.set(ref, booking, { merge: true });
    });
    await bookingsBatch.commit();
    
    logger.info(`✅ Created ${bookings.length} sample bookings`);

    logger.info("✅ Seed data migration completed successfully!");
    logger.info(`   - Association: ${associationId}`);
    logger.info(`   - Facilities: ${facilities.length}`);
    logger.info(`   - Teams: ${teams.length}`);
    logger.info(`   - Bookings: ${bookings.length}`);

  } catch (error) {
    logger.error(`❌ Seed data migration failed: ${error}`);
    throw error;
  }
}

// 직접 실행 시
if (require.main === module) {
  import("firebase-admin").then((admin) => {
    if (!admin.apps.length) {
      admin.initializeApp();
    }
    seedNowonAssociation()
      .then(() => {
        logger.info("Migration completed successfully");
        process.exit(0);
      })
      .catch((error) => {
        logger.error("Migration failed:", error);
        process.exit(1);
      });
  });
}
```

---

## 🚀 실행 방법

### 1. 개발 환경에서 실행

```bash
# Firebase Admin SDK 초기화 필요
cd functions
npm install
npx ts-node src/migrations/seed-nowon-association.ts
```

### 2. Cloud Function으로 실행 (선택)

```typescript
// functions/src/index.ts

import { onRequest } from "firebase-functions/v2/https";
import { seedNowonAssociation } from "./migrations/seed-nowon-association";

export const seedNowonData = onRequest(
  {
    region: "asia-northeast3",
    cors: true,
  },
  async (req, res) => {
    // 관리자 권한 확인
    if (req.headers.authorization !== `Bearer ${process.env.ADMIN_SECRET}`) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }

    try {
      await seedNowonAssociation();
      res.json({ success: true, message: "Seed data created successfully" });
    } catch (error) {
      console.error("Seed data creation failed:", error);
      res.status(500).json({ error: "Failed to create seed data" });
    }
  }
);
```

### 3. Firebase CLI로 실행

```bash
# Firebase Functions에 배포 후
curl -X POST \
  https://asia-northeast3-yago-vibe-spt.cloudfunctions.net/seedNowonData \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET"
```

---

## 📊 생성되는 데이터 요약

### 협회
- **노원구축구협회** (assoc-nowon-football)

### 시설 (협회 우선 대관)
1. **육군사관학교 축구장** (facility-army-academy)
2. **경기기계공업고등학교 축구장** (facility-gyeonggi-mechanical)
3. **서울과학기술대학교 운동장** (facility-seoul-tech)

### 팀
- **회원팀** (3개)
  - 노원FC (team-nowon-fc)
  - 강북FC (team-gangbuk-fc)
  - 공릉FC (team-gongneung-fc)

- **비회원팀** (3개)
  - 동부FC (team-dongbu-fc)
  - 중앙FC (team-jungang-fc)
  - 북부FC (team-bukbu-fc)

- **아카데미** (2개)
  - 노원유스 (team-nowon-youth)
  - 실버축구단 (team-silver-fc)

### 대관 기록
- 회원팀 대관: 3건 (APPROVED)
- 아카데미 대관 요청: 1건 (PENDING)

---

## ✅ 검증 체크리스트

시드 데이터 생성 후 다음을 확인하세요:

- [ ] 협회 문서 생성 확인
- [ ] 시설 3개 생성 확인 (accessPolicy: ASSOCIATION_PRIORITY)
- [ ] 협회 정책 설정 확인 (associationPriorityFacilities)
- [ ] 팀 8개 생성 확인 (회원 3, 비회원 3, 아카데미 2)
- [ ] 대관 기록 생성 확인
- [ ] Firestore 인덱스 생성 확인

---

## 🔄 데이터 초기화 (재실행 시)

스크립트는 `merge: true` 옵션을 사용하므로:
- 이미 존재하는 문서는 업데이트됨
- 존재하지 않는 문서는 생성됨
- 완전 초기화가 필요한 경우, 수동으로 삭제 후 재실행

```typescript
// 완전 초기화 스크립트 (별도)
export async function clearNowonData(): Promise<void> {
  // 주의: 실제 운영 데이터 삭제 주의!
  // 개발/테스트 환경에서만 사용
  
  const associationId = "assoc-nowon-football";
  
  // 팀 삭제
  const teams = await db.collection("teams")
    .where("associationId", "==", associationId)
    .get();
  
  const batch = db.batch();
  teams.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  
  // ... 기타 컬렉션 삭제
}
```

---

## 📝 주의사항

1. **실제 운영 환경에서는 사용하지 마세요**
   - 개발/테스트 환경에서만 사용
   - 실제 사용자 데이터와 충돌 방지

2. **ownerUid 업데이트**
   - `user-sample-*`는 샘플 값입니다
   - 실제 사용자 UID로 변경 필요

3. **관리자 UID 설정**
   - `associations/{id}/adminUids` 배열에 실제 관리자 UID 추가

4. **Firestore 인덱스**
   - 시드 데이터 생성 전에 `firestore.indexes.json` 배포 확인

---

**이 시드 데이터 마이그레이션 스크립트는 Policy Engine과 전환 UX 테스트를 위한 완전한 샘플 데이터를 생성합니다.**

