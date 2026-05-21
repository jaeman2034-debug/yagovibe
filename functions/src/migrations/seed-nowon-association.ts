import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

// 🔥 에뮬레이터 강제 차단 (핵심)
delete process.env.FIRESTORE_EMULATOR_HOST;
delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
delete process.env.FIREBASE_STORAGE_EMULATOR_HOST;

// 🔥 프로젝트 강제 지정
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: "yago-vibe-spt",
  });
}

// ✅ 2. Firestore 가져오기
const db = admin.firestore();

// 🔥 디버그: 실제 사용 중인 프로젝트 ID 확인
console.log("🔥 PROJECT ID:", admin.app().options.projectId);

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
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
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
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
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
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
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
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
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
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
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
        createdAt: admin.firestore.Timestamp.fromDate(new Date("2024-01-01")),
        updatedAt: admin.firestore.Timestamp.now(),
      },
      {
        id: "team-gangbuk-fc",
        name: "강북FC",
        status: "MEMBER",
        associationId: associationId,
        ownerUid: "user-sample-2",
        sportType: "football",
        createdAt: admin.firestore.Timestamp.fromDate(new Date("2024-02-01")),
        updatedAt: admin.firestore.Timestamp.now(),
      },
      {
        id: "team-gongneung-fc",
        name: "공릉FC",
        status: "MEMBER",
        associationId: associationId,
        ownerUid: "user-sample-3",
        sportType: "football",
        createdAt: admin.firestore.Timestamp.fromDate(new Date("2024-03-01")),
        updatedAt: admin.firestore.Timestamp.now(),
      },
      // 비회원팀 3개
      {
        id: "team-dongbu-fc",
        name: "동부FC",
        status: "NON_MEMBER",
        associationId: associationId,
        ownerUid: "user-sample-4",
        sportType: "football",
        createdAt: admin.firestore.Timestamp.fromDate(new Date("2024-04-01")),
        updatedAt: admin.firestore.Timestamp.now(),
      },
      {
        id: "team-jungang-fc",
        name: "중앙FC",
        status: "NON_MEMBER",
        associationId: associationId,
        ownerUid: "user-sample-5",
        sportType: "football",
        createdAt: admin.firestore.Timestamp.fromDate(new Date("2024-05-01")),
        updatedAt: admin.firestore.Timestamp.now(),
      },
      {
        id: "team-bukbu-fc",
        name: "북부FC",
        status: "NON_MEMBER",
        associationId: associationId,
        ownerUid: "user-sample-6",
        sportType: "football",
        createdAt: admin.firestore.Timestamp.fromDate(new Date("2024-06-01")),
        updatedAt: admin.firestore.Timestamp.now(),
      },
      // 아카데미 2개
      {
        id: "team-nowon-youth",
        name: "노원유스",
        status: "ACADEMY",
        associationId: associationId,
        ownerUid: "user-sample-7",
        sportType: "football",
        createdAt: admin.firestore.Timestamp.fromDate(new Date("2024-07-01")),
        updatedAt: admin.firestore.Timestamp.now(),
      },
      {
        id: "team-silver-fc",
        name: "실버축구단",
        status: "ACADEMY",
        associationId: associationId,
        ownerUid: "user-sample-8",
        sportType: "football",
        createdAt: admin.firestore.Timestamp.fromDate(new Date("2024-08-01")),
        updatedAt: admin.firestore.Timestamp.now(),
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
    const bookings = [
      {
        id: "booking-1",
        teamId: "team-nowon-fc",
        facilityId: "facility-army-academy",
        date: "2025-01-27",
        time: "09:00",
        dateTime: admin.firestore.Timestamp.fromDate(new Date("2025-01-27T09:00:00Z")),
        status: "APPROVED",
        actionType: "APPLY",
        requestedAt: admin.firestore.Timestamp.fromDate(new Date("2025-01-20T10:00:00Z")),
        requestedBy: "user-sample-1",
        processedAt: admin.firestore.Timestamp.fromDate(new Date("2025-01-20T11:00:00Z")),
        createdAt: admin.firestore.Timestamp.fromDate(new Date("2025-01-20T10:00:00Z")),
        updatedAt: admin.firestore.Timestamp.fromDate(new Date("2025-01-20T11:00:00Z")),
      },
      {
        id: "booking-2",
        teamId: "team-gangbuk-fc",
        facilityId: "facility-army-academy",
        date: "2025-01-27",
        time: "10:00",
        dateTime: admin.firestore.Timestamp.fromDate(new Date("2025-01-27T10:00:00Z")),
        status: "APPROVED",
        actionType: "APPLY",
        requestedAt: admin.firestore.Timestamp.fromDate(new Date("2025-01-21T10:00:00Z")),
        requestedBy: "user-sample-2",
        processedAt: admin.firestore.Timestamp.fromDate(new Date("2025-01-21T11:00:00Z")),
        createdAt: admin.firestore.Timestamp.fromDate(new Date("2025-01-21T10:00:00Z")),
        updatedAt: admin.firestore.Timestamp.fromDate(new Date("2025-01-21T11:00:00Z")),
      },
      {
        id: "booking-3",
        teamId: "team-gongneung-fc",
        facilityId: "facility-gyeonggi-mechanical",
        date: "2025-01-27",
        time: "09:00",
        dateTime: admin.firestore.Timestamp.fromDate(new Date("2025-01-27T09:00:00Z")),
        status: "APPROVED",
        actionType: "APPLY",
        requestedAt: admin.firestore.Timestamp.fromDate(new Date("2025-01-22T10:00:00Z")),
        requestedBy: "user-sample-3",
        processedAt: admin.firestore.Timestamp.fromDate(new Date("2025-01-22T11:00:00Z")),
        createdAt: admin.firestore.Timestamp.fromDate(new Date("2025-01-22T10:00:00Z")),
        updatedAt: admin.firestore.Timestamp.fromDate(new Date("2025-01-22T11:00:00Z")),
      },
      {
        id: "booking-4",
        teamId: "team-nowon-youth",
        facilityId: "facility-seoul-tech",
        date: "2025-01-28",
        time: "10:00",
        dateTime: admin.firestore.Timestamp.fromDate(new Date("2025-01-28T10:00:00Z")),
        status: "PENDING",
        actionType: "REQUEST",
        requestedAt: admin.firestore.Timestamp.fromDate(new Date("2025-01-27T10:00:00Z")),
        requestedBy: "user-sample-7",
        createdAt: admin.firestore.Timestamp.fromDate(new Date("2025-01-27T10:00:00Z")),
        updatedAt: admin.firestore.Timestamp.fromDate(new Date("2025-01-27T10:00:00Z")),
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
    
    console.log("\n✅ Seed data migration completed successfully!");
    console.log(`   - Project ID: ${admin.app().options.projectId}`);
    console.log(`   - Association: ${associationId}`);
    console.log(`   - Facilities: ${facilities.length}`);
    console.log(`   - Teams: ${teams.length}`);
    console.log(`   - Bookings: ${bookings.length}`);
    console.log(`\n🔥 Check Firestore Console: https://console.firebase.google.com/project/${admin.app().options.projectId}/firestore\n`);

  } catch (error) {
    logger.error(`❌ Seed data migration failed: ${error}`);
    console.error("❌ Seed data migration failed:", error);
    throw error;
  }
}

// 직접 실행 시
if (require.main === module) {
  seedNowonAssociation()
    .then(() => {
      console.log("✅ Seed data migration completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Seed data migration failed:", error);
      process.exit(1);
    });
}

