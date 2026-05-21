/**
 * 🔥 Assoc Sync Route - 협회 동기화 배치
 * 
 * Week2 핵심: 협회 리그 → DB 동기화
 */

import { Router } from "express";
import { syncAssoc, syncAllRegions } from "../jobs/syncAssoc";

const router = Router();

/**
 * POST /api/assoc/sync
 * 협회 데이터 동기화 (단일 지역)
 * 
 * Query: ?region=seoul (기본값: seoul)
 */
router.post("/sync", async (req, res) => {
  try {
    const region = (req.query.region as string) || (req.body.region as string) || "seoul";

    const result = await syncAssoc(region);

    res.json({
      ok: true,
      ...result,
      message: "협회 데이터 동기화 완료",
    });
  } catch (error) {
    console.error("[POST /assoc/sync]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * POST /api/assoc/sync/all
 * 모든 지역 동기화
 */
router.post("/sync/all", async (req, res) => {
  try {
    await syncAllRegions();

    res.json({
      ok: true,
      message: "모든 지역 협회 데이터 동기화 완료",
    });
  } catch (error) {
    console.error("[POST /assoc/sync/all]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

export default router;
