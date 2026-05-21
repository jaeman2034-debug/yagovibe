/**
 * 경영용 PDF 리포트 HTTP 엔드포인트
 */

import { onRequest } from "firebase-functions/v2/https";
import { generateExecutivePdf } from "./generateExecutivePdf";

export const executiveReport = onRequest(async (req, res) => {
  try {
    // CORS 처리
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    const { tenantId, from, to } = req.body ?? {};

    if (!tenantId || !from || !to) {
      return res.status(400).json({ ok: false, error: "tenantId/from/to required" });
    }

    const result = await generateExecutivePdf({
      tenantId,
      from: new Date(from),
      to: new Date(to),
    });

    res.json({ ok: true, ...result });
  } catch (e: any) {
    console.error("executiveReport error:", e);
    res.status(500).json({ ok: false, error: e?.message ?? "error" });
  }
});










