/**
 * 🔥 Ground Route - 구장/슬롯/예약 API
 * 
 * Week3 핵심: 구장 도메인 + 예약 락 + 중복결제 방지
 */

import { Router } from "express";
import { prisma } from "../data/prisma";
import { lockSlot, checkDoublePayment, checkReservationExpiry } from "../domain/reserve.service";
import { cachedGrounds } from "../cache/ground.cache";

const router = Router();

/**
 * GET /api/ground
 * 구장 목록 조회
 */
router.get("/", async (req: any, res) => {
  try {
    const region = req.region || (req.query.region as string) || "seoul";

    const grounds = await cachedGrounds(
      region,
      async () => {
        return await prisma.ground.findMany({
          where: { region },
          orderBy: { name: "asc" },
        });
      },
      60_000 // 60초 캐시
    );

    res.setHeader("Cache-Control", "public, max-age=30");
    res.json(grounds);
  } catch (error) {
    console.error("[GET /ground]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * GET /api/ground/:groundId
 * 구장 상세 조회
 */
router.get("/:groundId", async (req, res) => {
  try {
    const { groundId } = req.params;

    const ground = await prisma.ground.findUnique({
      where: { id: groundId },
    });

    if (!ground) {
      return res.status(404).json({ error: "not_found" });
    }

    res.json(ground);
  } catch (error) {
    console.error("[GET /ground/:groundId]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * GET /api/ground/:groundId/slots
 * 슬롯 조회
 */
router.get("/:groundId/slots", async (req, res) => {
  try {
    const { groundId } = req.params;
    const { date } = req.query;

    const where: any = { groundId };

    // 날짜 필터 (선택)
    if (date) {
      const targetDate = new Date(date as string);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

      where.startAt = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    const slots = await prisma.slot.findMany({
      where,
      orderBy: { startAt: "asc" },
    });

    res.json(slots);
  } catch (error) {
    console.error("[GET /ground/:groundId/slots]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * POST /api/ground/reserve
 * 예약 생성 (5분 락)
 */
router.post("/reserve", async (req, res) => {
  try {
    const { slotId, userId } = req.body;

    if (!slotId || !userId) {
      return res.status(400).json({ error: "slotId and userId required" });
    }

    // 슬롯 락
    await lockSlot(slotId);

    const slot = await prisma.slot.findUnique({
      where: { id: slotId },
    });

    if (!slot) {
      return res.status(404).json({ error: "slot_not_found" });
    }

    // 예약 생성
    const reservation = await prisma.reservation.create({
      data: {
        id: `r_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        slotId,
        userId,
        amount: slot.price,
        status: "READY",
      },
    });

    // 로그
    await prisma.eventLog.create({
      data: {
        eventName: "reserve_create",
        payload: JSON.stringify({
          reservationId: reservation.id,
          slotId,
          userId,
          amount: slot.price,
        }),
        userId,
        region: slot.groundId.split("_")[0], // 임시: groundId에서 region 추출
      },
    });

    res.status(201).json(reservation);
  } catch (error: any) {
    console.error("[POST /ground/reserve]", error);

    if (error.message === "slot_not_found" || error.message === "not_available") {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * GET /api/ground/reservation/:id
 * 예약 조회
 */
router.get("/reservation/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        // Prisma 관계가 설정되어 있다면
        // slot: { include: { ground: true } }
      },
    });

    if (!reservation) {
      return res.status(404).json({ error: "not_found" });
    }

    // 슬롯 정보 포함
    const slot = await prisma.slot.findUnique({
      where: { id: reservation.slotId },
    });

    res.json({
      ...reservation,
      slot,
    });
  } catch (error) {
    console.error("[GET /ground/reservation/:id]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * POST /api/ground/pay/webhook
 * 결제 승인 웹훅 (레거시 - /api/pay/webhook로 리다이렉트 권장)
 * 
 * @deprecated Use /api/pay/webhook instead
 */
router.post("/pay/webhook", async (req, res) => {
  // /api/pay/webhook로 리다이렉트
  res.status(301).json({
    message: "This endpoint is deprecated. Use /api/pay/webhook instead",
    redirect: "/api/pay/webhook",
  });
});

/**
 * POST /api/ground/reservation/:id/cancel
 * 예약 취소
 */
router.post("/reservation/:id/cancel", async (req, res) => {
  try {
    const { id } = req.params;

    const reservation = await prisma.reservation.findUnique({
      where: { id },
    });

    if (!reservation) {
      return res.status(404).json({ error: "not_found" });
    }

    if (reservation.status === "PAID") {
      return res.status(400).json({ error: "cannot_cancel_paid_reservation" });
    }

    if (reservation.status === "CANCEL") {
      return res.status(400).json({ error: "already_cancelled" });
    }

    // 예약 취소
    await prisma.reservation.update({
      where: { id },
      data: { status: "CANCEL" },
    });

    // 슬롯 해제
    await prisma.slot.update({
      where: { id: reservation.slotId },
      data: { status: "OPEN" },
    });

    res.json({ ok: true, message: "Reservation cancelled" });
  } catch (error) {
    console.error("[POST /ground/reservation/:id/cancel]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

export default router;
