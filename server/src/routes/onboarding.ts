/**
 * 🔥 Onboarding Route - 지역 온보딩 API
 * 
 * Week7 핵심: 지역 선택 및 온보딩 플로우
 */

import { Router } from "express";
import { REGION_NAMES, isValidRegion } from "../domain/region.query";

const router = Router();

/**
 * GET /api/onboarding/regions
 * 사용 가능한 지역 목록 조회
 */
router.get("/regions", (req, res) => {
  const regions = Object.entries(REGION_NAMES).map(([id, name]) => ({
    id,
    name,
  }));

  res.json(regions);
});

/**
 * POST /api/onboarding/select
 * 지역 선택 (온보딩 완료)
 */
router.post("/select", (req, res) => {
  try {
    const { region, userId } = req.body;

    if (!region) {
      return res.status(400).json({ error: "region required" });
    }

    if (!isValidRegion(region)) {
      return res.status(400).json({ error: "invalid region" });
    }

    // 실제 운영 시: 사용자 프로필에 지역 저장
    // await prisma.userProfile.update({
    //   where: { id: userId },
    //   data: { region },
    // });

    res.json({
      ok: true,
      region,
      message: "Region selected successfully",
    });
  } catch (error) {
    console.error("[POST /onboarding/select]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * GET /api/onboarding/detect
 * 사용자 위치 기반 지역 자동 감지 (stub)
 */
router.get("/detect", async (req, res) => {
  try {
    // 실제 구현 시: GPS/IP 기반 지역 감지
    // const lat = req.query.lat as string;
    // const lng = req.query.lng as string;
    // const detectedRegion = await detectRegionFromLocation(lat, lng);

    // Stub: 기본값 반환
    const detectedRegion = "seoul";

    res.json({
      region: detectedRegion,
      name: REGION_NAMES[detectedRegion],
      confidence: 0.8, // 신뢰도 (stub)
    });
  } catch (error) {
    console.error("[GET /onboarding/detect]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

export default router;
