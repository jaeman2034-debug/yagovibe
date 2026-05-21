/**
 * 🔥 Experiments Route - AB 로그 스텁
 * 
 * Week1~2 API Stub 기준
 */

import { Router } from "express";

const router = Router();

/**
 * POST /api/experiments/log
 * AB 테스트 로그
 */
router.post("/log", (req, res) => {
  try {
    console.log("[EXP_LOG]", JSON.stringify(req.body, null, 2));
    res.json({ ok: true, receivedAt: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * GET /api/experiments/:key/analytics
 * AB 테스트 분석 (스텁)
 */
router.get("/:key/analytics", (req, res) => {
  try {
    const { key } = req.params;
    // Week6에서 실제 구현
    res.json({
      experimentKey: key,
      variantA: { impressions: 0, clicks: 0, ctr: 0 },
      variantB: { impressions: 0, clicks: 0, ctr: 0 },
      winner: null,
      sampleSize: 0,
      confidence: 0,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

export default router;
