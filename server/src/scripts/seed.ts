/**
 * 🔥 Seed Script - 초기 데이터 삽입
 * 
 * npx tsx src/scripts/seed.ts
 */

import { prisma } from "../data/prisma";
import { seedStories } from "../data/seed.stories";

async function main() {
  console.log("🌱 Seeding database...");

  // 기존 데이터 삭제 (개발용)
  await prisma.story.deleteMany({});
  await prisma.league.deleteMany({});

  // Seed 스토리 삽입
  for (const story of seedStories) {
    await prisma.story.create({
      data: {
        id: story.id,
        region: story.region,
        source: story.source,
        category: story.category,
        title: story.title,
        subtitle: story.subtitle,
        status: story.status,
        startAt: new Date(story.startAt),
        endAt: new Date(story.endAt),
        ctaType: story.ctaType,
        priority: story.priority ?? 50,
        score: story.score ?? 0,
        isVerifiedAuthor: story.isVerifiedAuthor ?? false,
      },
    });
  }

  // Seed 리그 삽입
  await prisma.league.createMany({
    data: [
      {
        id: "l1",
        region: "seoul",
        name: "서울 주말 리그",
        startAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        endAt: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
      },
      {
        id: "l2",
        region: "seoul",
        name: "서울 동부 리그",
        startAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        endAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      },
    ],
  });

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
