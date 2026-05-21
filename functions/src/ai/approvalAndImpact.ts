// functions/src/ai/approvalAndImpact.ts
import * as admin from "firebase-admin";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onRequest } from "firebase-functions/v2/https";
import { generateApprovalSummary } from "./approvalSummary";
import { generateDailyImpactReport } from "./dailyImpact";

// ✅ 승인요청 생성 시 자동 요약
export const approvalSummaryOnCreate = onDocumentCreated("_approvals/{approvalId}", async (event) => {
  const approvalId = event.params.approvalId as string;
  try {
    await generateApprovalSummary(approvalId);
  } catch (e) {
    console.error("approvalSummaryOnCreate error:", e);
  }
});

// ✅ 수동 호출: 승인 요약 생성
export const approvalSummary = onRequest(async (req, res) => {
  try {
    const { approvalId } = req.body ?? {};
    if (!approvalId) return res.status(400).json({ ok: false, error: "approvalId required" });

    const out = await generateApprovalSummary(approvalId);
    return res.json(out);
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ ok: false, error: e?.message ?? "error" });
  }
});

// ✅ 수동 호출: 일간 리포트 생성
export const dailyImpact = onRequest(async (req, res) => {
  try {
    const { tenantId, date } = req.body ?? {};
    if (!tenantId) return res.status(400).json({ ok: false, error: "tenantId required" });

    const out = await generateDailyImpactReport(tenantId, date);
    return res.json(out);
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ ok: false, error: e?.message ?? "error" });
  }
});

