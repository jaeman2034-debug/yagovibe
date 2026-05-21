/**
 * 🔥 Cancel Route - 취소 API
 * 
 * Week3 핵심: 취소/부분환불 + 정산 보정
 */

import { Router } from "express";
import { cancelReservation, canCancelReservation } from "../domain/cancel.service";

const router = Router();

/**
 * GET /api/cancel/check/:reservationId
 * 취소 가능 여부 체크
 */
router.get("/check/:reservationId", async (req, res) => {
  try {
    const { reservationId } = req.params;

    const result = await canCancelReservation(reservationId);

    res.json(result);
  } catch (error) {
    console.error("[GET /cancel/check/:reservationId]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * POST /api/cancel
 * 예약 취소 (환불 + 정산 보정)
 */
router.post("/", async (req, res) => {
  try {
    const { reservationId, reason } = req.body;

    if (!reservationId) {
      return res.status(400).json({ error: "reservationId required" });
    }

    const result = await cancelReservation(reservationId, reason);

    res.json({
      ok: true,
      ...result,
      message: `환불 완료: ${result.refundAmount.toLocaleString()}원 (${(result.rate * 100).toFixed(0)}%)`,
    });
  } catch (error: any) {
    console.error("[POST /cancel]", error);

    if (
      error.message === "reservation_not_found" ||
      error.message === "reservation_not_paid" ||
      error.message === "slot_not_found" ||
      error.message.includes("payment_cancel_failed")
    ) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

export default router;
