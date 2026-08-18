import { doc, updateDoc } from "firebase/firestore";
import {
  buildGrowthReportHtml,
  buildGrowthReportPdfFilename,
  type GrowthReportPdfInput,
} from "@/lib/ai-growth/exportGrowthReportPdf";
import { renderHtmlToPdfBlob } from "@/lib/ai-growth/renderHtmlToPdf";
import { postFirebaseCallableHttp } from "@/lib/callable/postFirebaseCallableHttp";
import { buildExternalUrl } from "@/lib/growth/teamInviteShare";
import { auth, db } from "@/lib/firebase";
import {
  GROWTH_REPORT_DELIVERY_SCHEMA_VERSION,
  type GrowthReportDelivery,
} from "@/lib/ai-growth/playerGrowthHistoryTypes";

const PDF_ROOT_ID = "yago-growth-pdf-root";
const GROWTH_PDF_UPLOAD_CALLABLE = "uploadGrowthReportPdf";

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

export type GrowthReportDeliveryResult = {
  delivery: GrowthReportDelivery;
  shareUrl: string;
  filename: string;
};

export function buildGrowthReportStoragePath(teamId: string, sessionDocId: string): string {
  return `teams/${teamId}/growthReports/${sessionDocId}/report.pdf`;
}

export function buildGrowthReportSharePath(teamId: string, sessionDocId: string): string {
  return `/team/${teamId}/growth-report/${sessionDocId}`;
}

/** Parent Delivery · 카카오/복사용 — localhost에서도 공개 도메인 URL */
export function buildGrowthReportShareUrl(teamId: string, sessionDocId: string): string {
  return buildExternalUrl(buildGrowthReportSharePath(teamId, sessionDocId));
}

export function buildShareUrlFromDelivery(delivery: GrowthReportDelivery): string {
  return buildExternalUrl(delivery.sharePath);
}

export async function exportGrowthReportPdfBlob(
  input: GrowthReportPdfInput
): Promise<{ blob: Blob; filename: string }> {
  if (input.metadata.reviewedEventCount === 0 && input.evidenceItems.length === 0) {
    throw new Error("PDF를 만들려면 코치 승인 이벤트가 최소 1건 필요합니다.");
  }
  const filename = buildGrowthReportPdfFilename(input.playerName, input.metadata.generatedAt);
  const html = buildGrowthReportHtml(input);
  const blob = await renderHtmlToPdfBlob(html, filename, PDF_ROOT_ID);
  return { blob, filename };
}

export async function uploadGrowthReportPdf(
  teamId: string,
  sessionDocId: string,
  blob: Blob,
  filename: string
): Promise<{
  storagePath: string;
  downloadUrl: string;
  delivery?: GrowthReportDelivery;
  sharePath?: string;
}> {
  const storagePath = buildGrowthReportStoragePath(teamId, sessionDocId);
  console.info("[growthReportDelivery] upload start (callable)", {
    teamId,
    sessionDocId,
    storagePath,
    bytes: blob.size,
    callable: GROWTH_PDF_UPLOAD_CALLABLE,
  });

  const pdfBase64 = await blobToBase64(blob);
  const result = await postFirebaseCallableHttp<{
    storagePath: string;
    downloadUrl: string;
    delivery?: GrowthReportDelivery;
    sharePath?: string;
  }>(GROWTH_PDF_UPLOAD_CALLABLE, {
    teamId,
    sessionDocId,
    filename,
    pdfBase64,
  });

  console.info("[growthReportDelivery] upload complete (callable)", {
    sessionDocId,
    storagePath: result.storagePath,
    downloadUrl: result.downloadUrl.slice(0, 72),
    deliveryAttached: Boolean(result.delivery),
  });

  return {
    storagePath: result.storagePath,
    downloadUrl: result.downloadUrl,
    delivery: result.delivery,
    sharePath: result.sharePath,
  };
}

export async function attachGrowthReportDelivery(
  teamId: string,
  sessionDocId: string,
  delivery: GrowthReportDelivery
): Promise<void> {
  const sessionRef = doc(db, "teams", teamId, "playerGrowthHistory", sessionDocId);
  await updateDoc(sessionRef, { delivery });
}

export async function markGrowthReportSharedAt(
  teamId: string,
  sessionDocId: string,
  delivery: GrowthReportDelivery
): Promise<void> {
  if (delivery.sharedAt != null) return;
  const sessionRef = doc(db, "teams", teamId, "playerGrowthHistory", sessionDocId);
  const next: GrowthReportDelivery = {
    ...delivery,
    sharedAt: Date.now(),
  };
  await updateDoc(sessionRef, { delivery: next });
}

/** Sprint D-1b — 세션 docId 기준 PDF upload + delivery 메타 + share URL */
export async function deliverGrowthReportForSession(
  teamId: string,
  sessionDocId: string,
  pdfInput: GrowthReportPdfInput,
  notifiedParentUids: string[] = []
): Promise<GrowthReportDeliveryResult> {
  const storagePath = buildGrowthReportStoragePath(teamId, sessionDocId);
  console.info("[growthReportDelivery] start", {
    teamId,
    sessionDocId,
    playerName: pdfInput.playerName,
    storagePath,
  });

  const { blob, filename } = await exportGrowthReportPdfBlob(pdfInput);
  console.info("[growthReportDelivery] pdf blob ready", { sessionDocId, bytes: blob.size, filename });

  const uploadResult = await uploadGrowthReportPdf(teamId, sessionDocId, blob, filename);
  const sharePath =
    uploadResult.sharePath ?? buildGrowthReportSharePath(teamId, sessionDocId);
  const shareUrl = buildGrowthReportShareUrl(teamId, sessionDocId);
  const generatedByUid = auth.currentUser?.uid ?? "coach";

  const delivery: GrowthReportDelivery = uploadResult.delivery ?? {
    schemaVersion: GROWTH_REPORT_DELIVERY_SCHEMA_VERSION,
    pdfStoragePath: uploadResult.storagePath,
    pdfDownloadUrl: uploadResult.downloadUrl,
    pdfGeneratedAt: Date.now(),
    pdfFilename: filename,
    generatedByUid,
    sharePath,
    notifiedParentUids,
    sharedAt: null,
  };

  if (!uploadResult.delivery) {
    console.info("[growthReportDelivery] delivery attach fallback (client)", { sessionDocId });
    await attachGrowthReportDelivery(teamId, sessionDocId, delivery);
  } else {
    console.info("[growthReportDelivery] firestore delivery attached (callable)", {
      sessionDocId,
      sharePath,
    });
  }

  console.info("[growthReportDelivery] complete", {
    sessionDocId,
    sharePath,
    pdfDownloadUrl: delivery.pdfDownloadUrl.slice(0, 72),
  });

  return { delivery, shareUrl, filename };
}
