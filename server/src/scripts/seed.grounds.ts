/**
 * 🔥 Seed Grounds - 초기 구장 데이터 삽입
 * 
 * npx tsx src/scripts/seed.grounds.ts
 */

import { prisma } from "../data/prisma";

async function main() {
  console.log("🌱 Seeding grounds...");

  // 기존 데이터 삭제 (개발용)
  await prisma.reservation.deleteMany({});
  await prisma.slot.deleteMany({});
  await prisma.ground.deleteMany({});

  // 구장 생성
  const grounds = [
    {
      id: "ground_seoul_1",
      region: "seoul",
      name: "노원구 풋살장",
      address: "서울시 노원구 상계동 123",
      lat: 37.6542,
      lng: 127.0568,
    },
    {
      id: "ground_seoul_2",
      region: "seoul",
      name: "강남구 축구장",
      address: "서울시 강남구 역삼동 456",
      lat: 37.5000,
      lng: 127.0364,
    },
    {
      id: "ground_busan_1",
      region: "busan",
      name: "해운대구 풋살장",
      address: "부산시 해운대구 우동 789",
      lat: 35.1631,
      lng: 129.1636,
    },
  ];

  for (const ground of grounds) {
    await prisma.ground.create({
      data: ground,
    });

    // 각 구장에 슬롯 생성 (오늘부터 7일간)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let day = 0; day < 7; day++) {
      const date = new Date(today);
      date.setDate(date.getDate() + day);

      // 오전 9시부터 오후 10시까지 2시간 단위
      for (let hour = 9; hour < 22; hour += 2) {
        const startAt = new Date(date);
        startAt.setHours(hour, 0, 0, 0);

        const endAt = new Date(date);
        endAt.setHours(hour + 2, 0, 0, 0);

        await prisma.slot.create({
          data: {
            id: `slot_${ground.id}_${day}_${hour}`,
            groundId: ground.id,
            startAt,
            endAt,
            price: 50000 + Math.floor(Math.random() * 30000), // 5만원 ~ 8만원
            status: "OPEN",
          },
        });
      }
    }
  }

  console.log("✅ Seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
