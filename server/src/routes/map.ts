/**
 * 🔥 Map Route - 지도 연동 API
 * 
 * Week7 핵심: 지역별 구장 지도 표시
 */

import { Router } from "express";
import { prisma } from "../data/prisma";

const router = Router();

/**
 * GET /api/map/grounds
 * 지역별 구장 목록 (지도용)
 */
router.get("/grounds", async (req: any, res) => {
  try {
    const region = req.region || (req.query.region as string) || "seoul";

    const grounds = await prisma.ground.findMany({
      where: { region },
    });

    // 최저 가격 계산 (슬롯 기준)
    const groundsWithPrice = await Promise.all(
      grounds.map(async (ground) => {
        const slots = await prisma.slot.findMany({
          where: {
            groundId: ground.id,
            status: "OPEN",
            startAt: { gte: new Date() },
          },
          orderBy: { price: "asc" },
          take: 1,
        });

        const priceFrom = slots.length > 0 ? slots[0].price : 0;

        return {
          id: ground.id,
          name: ground.name,
          address: ground.address,
          lat: ground.lat,
          lng: ground.lng,
          priceFrom,
          region: ground.region,
        };
      })
    );

    res.json(groundsWithPrice);
  } catch (error) {
    console.error("[GET /map/grounds]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * GET /api/map/grounds/nearby
 * 근처 구장 검색
 */
router.get("/grounds/nearby", async (req: any, res) => {
  try {
    const region = req.region || (req.query.region as string) || "seoul";
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const radius = parseFloat(req.query.radius as string) || 5; // km

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: "lat and lng required" });
    }

    const grounds = await prisma.ground.findMany({
      where: { region },
    });

    // 거리 계산 (간단한 하버사인 공식)
    const nearbyGrounds = grounds
      .map((ground) => {
        const distance = calculateDistance(lat, lng, ground.lat, ground.lng);
        return {
          ...ground,
          distance,
        };
      })
      .filter((g) => g.distance <= radius)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 20); // 최대 20개

    res.json(nearbyGrounds);
  } catch (error) {
    console.error("[GET /map/grounds/nearby]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * 거리 계산 (하버사인 공식)
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // 지구 반지름 (km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default router;
