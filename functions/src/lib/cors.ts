/**
 * 🔥 CORS 헬퍼 함수
 * Phase 1-4: QR 검증 + Cloud Functions
 */

import type { Request, Response } from "express";

export const cors =
  (handler: (req: Request, res: Response) => Promise<void> | void) =>
  async (req: Request, res: Response): Promise<void> => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    await handler(req, res);
  };

