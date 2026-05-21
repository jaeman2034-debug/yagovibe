/**
 * 🔥 Pay Route - 결제 API
 * 
 * Week3 핵심: 결제 요청/승인/취소
 */

import { Router } from "express";
import { startPayment, approvePayment, cancelPayment } from "../domain/pay.service";
import { retryPgWebhook } from "../domain/fallback.rules";

const router = Router();

/**
 * POST /api/pay/request
 * 결제 요청
 */
router.post("/request", async (req, res) => {
  try {
    const { reservationId, pg } = req.body;

    if (!reservationId) {
      return res.status(400).json({ error: "reservationId required" });
    }

    const result = await startPayment(reservationId, pg || "mock");

    res.json(result);
  } catch (error: any) {
    console.error("[POST /pay/request]", error);

    if (
      error.message === "reservation_not_found" ||
      error.message === "reservation_not_ready"
    ) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * POST /api/pay/webhook
 * PG 웹훅 (승인)
 */
router.post("/webhook", async (req, res) => {
  try {
    const { reservationId, pgTid } = req.body;

    if (!reservationId) {
      return res.status(400).json({ error: "reservationId required" });
    }

    // PG 웹훅 재시도 (최대 3회)
    const result = await retryPgWebhook(
      () => approvePayment(reservationId, pgTid),
      3
    );

    res.json({ ok: true, ...result });
  } catch (error: any) {
    console.error("[POST /pay/webhook]", error);

    if (
      error.message === "reservation_not_found" ||
      error.message === "already_paid" ||
      error.message === "reservation_cancelled" ||
      error.message === "payment_not_found" ||
      error.message.includes("payment_approval_failed")
    ) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * POST /api/pay/cancel
 * 결제 취소
 */
router.post("/cancel", async (req, res) => {
  try {
    const { reservationId, reason } = req.body;

    if (!reservationId) {
      return res.status(400).json({ error: "reservationId required" });
    }

    const result = await cancelPayment(reservationId, reason);

    res.json({ ok: true, ...result });
  } catch (error: any) {
    console.error("[POST /pay/cancel]", error);

    if (
      error.message === "reservation_not_found" ||
      error.message === "reservation_not_paid" ||
      error.message === "payment_not_found" ||
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
