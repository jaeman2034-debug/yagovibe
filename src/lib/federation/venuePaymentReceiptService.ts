/**
 * PR4-1 — Receipt upload → OCR → verify → admin review.
 * Never sets paymentStatus=CONFIRMED from OCR alone.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { httpsCallable } from "firebase/functions";
import { db, functions, storage } from "@/lib/firebase";
import { parseVenuePaymentOcrText } from "@/lib/federation/venuePaymentOcrParse";
import { verifyVenuePaymentReceipt } from "@/lib/federation/venuePaymentVerify";
import type {
  VenuePaymentOcrResult,
  VenuePaymentReceipt,
  VenuePaymentReceiptStatus,
  VenuePaymentVerificationStatus,
} from "@/lib/federation/venuePaymentReceiptTypes";
import type { VenuePaymentService } from "@/lib/federation/payment/venuePaymentService";
import {
  claimVenueReservationPayment,
  confirmVenueReservationPayment,
  finalizeVenueReservation,
  getVenueReservation,
  listFederationManagerUids,
} from "@/lib/federation/venueReservationService";
import type { VenueReservation } from "@/lib/federation/venueReservationTypes";
import { getVenueNotificationProvider } from "@/lib/notifications/notificationProvider";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

function parseReceipt(
  id: string,
  raw: Record<string, unknown>
): VenuePaymentReceipt {
  const ocrRaw = (raw.ocrResult || {}) as Record<string, unknown>;
  const ocrResult: VenuePaymentOcrResult = {
    bankName: typeof ocrRaw.bankName === "string" ? ocrRaw.bankName : null,
    amount: typeof ocrRaw.amount === "number" ? ocrRaw.amount : null,
    depositedAt: typeof ocrRaw.depositedAt === "string" ? ocrRaw.depositedAt : null,
    senderName: typeof ocrRaw.senderName === "string" ? ocrRaw.senderName : null,
    transactionId:
      typeof ocrRaw.transactionId === "string" ? ocrRaw.transactionId : null,
    rawText: typeof ocrRaw.rawText === "string" ? ocrRaw.rawText : "",
    reservationCodeHint:
      typeof ocrRaw.reservationCodeHint === "string"
        ? ocrRaw.reservationCodeHint
        : null,
  };
  const status = String(raw.status || "PENDING_REVIEW") as VenuePaymentReceiptStatus;
  const verificationStatus = (
    raw.verificationStatus === "MATCH" ? "MATCH" : "REVIEW_REQUIRED"
  ) as VenuePaymentVerificationStatus;
  const prev =
    typeof raw.previousStatus === "string"
      ? (raw.previousStatus as VenuePaymentReceiptStatus)
      : null;
  const nextStatus =
    typeof raw.newStatus === "string"
      ? (raw.newStatus as VenuePaymentReceiptStatus)
      : null;

  return {
    id,
    federationSlug: String(raw.federationSlug || ""),
    reservationId: String(raw.reservationId || ""),
    shortReservationCode: String(raw.shortReservationCode || ""),
    teamId: String(raw.teamId || ""),
    teamName: String(raw.teamName || ""),
    venueName: String(raw.venueName || ""),
    bookingDate: String(raw.bookingDate || ""),
    startTime: String(raw.startTime || ""),
    endTime: String(raw.endTime || ""),
    expectedAmount: Number(raw.expectedAmount) || 0,
    receiptImageUrl: String(raw.receiptImageUrl || ""),
    receiptStoragePath: String(raw.receiptStoragePath || ""),
    contentType: String(raw.contentType || ""),
    ocrResult,
    verificationStatus,
    verificationReasons: Array.isArray(raw.verificationReasons)
      ? raw.verificationReasons.map(String)
      : [],
    status,
    uploadedBy: String(raw.uploadedBy || ""),
    uploadedAt: raw.uploadedAt,
    reviewedBy: (raw.reviewedBy as string | null) ?? null,
    reviewedAt: raw.reviewedAt,
    previousStatus: prev,
    newStatus: nextStatus,
    rejectReason: (raw.rejectReason as string | null) ?? null,
    schemaVersion: 1,
    updatedAt: raw.updatedAt,
  };
}

async function assertFederationManagerForPayment(
  federationSlug: string,
  adminUid: string
): Promise<void> {
  const managers = await listFederationManagerUids(federationSlug);
  if (!managers.includes(adminUid)) {
    throw new Error("협회 관리자(owner/admin)만 승인·반려할 수 있습니다.");
  }
}

async function appendReceiptReviewAudit(input: {
  federationSlug: string;
  receipt: VenuePaymentReceipt;
  reservation: VenueReservation;
  adminUid: string;
  previousStatus: VenuePaymentReceiptStatus;
  newStatus: VenuePaymentReceiptStatus;
  decision: "APPROVE" | "REJECT";
  rejectReason?: string | null;
}): Promise<void> {
  const logRef = doc(
    collection(db, "federations", input.federationSlug, "venueAllocationChangeLogs")
  );
  await setDoc(logRef, {
    federationId: input.federationSlug,
    changeType:
      input.decision === "APPROVE"
        ? "PAYMENT_RECEIPT_APPROVE"
        : "PAYMENT_RECEIPT_REJECT",
    venueId: input.reservation.venueId || input.receipt.venueName,
    bookingDate: input.receipt.bookingDate,
    startTime: input.receipt.startTime,
    endTime: input.receipt.endTime,
    slotAllocationId: input.receipt.reservationId,
    reservationId: input.receipt.reservationId,
    teamId: input.receipt.teamId,
    shortReservationCode: input.receipt.shortReservationCode,
    receiptId: input.receipt.id,
    createdBy: input.adminUid,
    createdAt: serverTimestamp(),
    reviewedBy: input.adminUid,
    reviewedAt: serverTimestamp(),
    previousStatus: input.previousStatus,
    newStatus: input.newStatus,
    changedByUid: input.adminUid,
    reasonText: input.rejectReason ?? null,
    paymentStatusAfter:
      input.decision === "APPROVE" ? "CONFIRMED" : "UNCONFIRMED",
    confirmStatusAfter:
      input.decision === "APPROVE" ? "FINALIZED" : "PENDING_PAYMENT",
  });
}

export async function getVenuePaymentReceipt(
  federationSlug: string,
  receiptId: string
): Promise<VenuePaymentReceipt | null> {
  const snap = await getDoc(
    doc(db, "federations", federationSlug, "venuePaymentReceipts", receiptId)
  );
  if (!snap.exists()) return null;
  return parseReceipt(snap.id, snap.data() as Record<string, unknown>);
}

export async function listReceiptsForReservation(
  federationSlug: string,
  reservationId: string
): Promise<VenuePaymentReceipt[]> {
  const q = query(
    collection(db, "federations", federationSlug, "venuePaymentReceipts"),
    where("reservationId", "==", reservationId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => parseReceipt(d.id, d.data() as Record<string, unknown>));
}

export async function listPendingPaymentReceiptReviews(
  federationSlug: string
): Promise<VenuePaymentReceipt[]> {
  const q = query(
    collection(db, "federations", federationSlug, "venuePaymentReceipts"),
    where("status", "==", "PENDING_REVIEW")
  );
  const snap = await getDocs(q);
  const rows = snap.docs.map((d) =>
    parseReceipt(d.id, d.data() as Record<string, unknown>)
  );
  return rows.sort((a, b) => a.bookingDate.localeCompare(b.bookingDate));
}

async function runOcr(imageUrl: string): Promise<string> {
  const extractCallable = httpsCallable<
    { imageUrls: string[] },
    { text?: string; error?: string }
  >(functions, "extractTextFromImages");
  const snap = await extractCallable({ imageUrls: [imageUrl] });
  const text = String(snap.data?.text || "").trim();
  if (!text && snap.data?.error) {
    throw new Error(String(snap.data.error));
  }
  return text;
}

async function notifyManagersReceipt(input: {
  federationSlug: string;
  reservation: VenueReservation;
  receipt: VenuePaymentReceipt;
  uploaderUid: string;
}): Promise<void> {
  const notify = getVenueNotificationProvider();
  const managers = await listFederationManagerUids(input.federationSlug);
  const amount =
    input.receipt.ocrResult.amount != null
      ? `${input.receipt.ocrResult.amount.toLocaleString("ko-KR")}원`
      : formatWon(input.reservation.totalAmount);
  const timeLabel = input.receipt.ocrResult.depositedAt
    ? input.receipt.ocrResult.depositedAt.slice(11, 16)
    : "시각 미추출";
  const detailPath = `${input.reservation.detailPath}?receipt=${encodeURIComponent(input.receipt.id)}`;

  await Promise.all(
    managers
      .filter((uid) => uid !== input.uploaderUid)
      .map((userId) =>
        notify.send({
          userId,
          title: "입금 영수증이 접수되었습니다",
          message: `${input.reservation.teamName} · ${amount} · ${timeLabel}`,
          body: [
            input.reservation.teamName,
            "",
            "입금 영수증이 접수되었습니다.",
            "",
            "금액",
            amount,
            "",
            "시간",
            timeLabel,
            "",
            `검증: ${input.receipt.verificationStatus}`,
            "",
            "[영수증 보기] · 관리자 보드에서 [승인] / [반려]",
          ].join("\n"),
          link: `/federations/${encodeURIComponent(input.federationSlug)}/admin?tab=venues&receipt=${encodeURIComponent(input.receipt.id)}`,
          pushDedupKey: `venue_payment_receipt_${input.federationSlug}_${input.receipt.id}_${userId}`,
          teamId: input.reservation.teamId,
          teamName: input.reservation.teamName,
          payload: {
            reservationId: input.reservation.reservationId,
            receiptId: input.receipt.id,
            verificationStatus: input.receipt.verificationStatus,
            detailPath,
          },
        })
      )
  );
}

function formatWon(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "금액 미정";
  return `${n.toLocaleString("ko-KR")}원`;
}

export async function submitVenuePaymentReceipt(input: {
  federationSlug: string;
  reservationId: string;
  uploadedBy: string;
  file: File;
}): Promise<{ receipt: VenuePaymentReceipt; reservation: VenueReservation }> {
  if (!input.uploadedBy.trim()) throw new Error("로그인이 필요합니다.");
  const file = input.file;
  if (!file) throw new Error("영수증 파일을 선택하세요.");
  const contentType = file.type || "application/octet-stream";
  if (!ALLOWED_TYPES.has(contentType)) {
    throw new Error("이미지(JPEG/PNG/WebP) 또는 PDF만 업로드할 수 있습니다.");
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("파일은 8MB 이하여야 합니다.");
  }

  const reservation = await getVenueReservation(
    input.federationSlug,
    input.reservationId
  );
  if (!reservation) throw new Error("예약을 찾을 수 없습니다.");
  if (reservation.paymentStatus === "CONFIRMED") {
    throw new Error("이미 입금 확인된 예약입니다.");
  }
  if (reservation.confirmStatus === "FINALIZED") {
    throw new Error("이미 확정된 예약입니다.");
  }

  const receiptRef = doc(
    collection(db, "federations", input.federationSlug, "venuePaymentReceipts")
  );
  const ext =
    contentType === "application/pdf"
      ? "pdf"
      : contentType.includes("png")
        ? "png"
        : contentType.includes("webp")
          ? "webp"
          : "jpg";
  const storagePath = `federations/${input.federationSlug}/venuePaymentReceipts/${input.reservationId}/${receiptRef.id}.${ext}`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file, { contentType });
  const receiptImageUrl = await getDownloadURL(storageRef);

  let rawText = "";
  let ocrFailed = false;
  try {
    if (contentType.startsWith("image/")) {
      rawText = await runOcr(receiptImageUrl);
    } else {
      // PDF OCR optional — REVIEW_REQUIRED without structured fields
      rawText = "";
      ocrFailed = true;
    }
  } catch (e) {
    console.warn("[submitVenuePaymentReceipt] OCR failed — continue as REVIEW_REQUIRED", e);
    rawText = "";
    ocrFailed = true;
  }

  const ocrResult = parseVenuePaymentOcrText(rawText);
  let siblings: VenuePaymentReceipt[] = [];
  try {
    siblings = await listReceiptsForReservation(
      input.federationSlug,
      input.reservationId
    );
  } catch (e) {
    console.warn("[submitVenuePaymentReceipt] sibling list skipped", e);
  }
  const verified = ocrFailed || !String(rawText || "").trim()
    ? {
        verificationStatus: "REVIEW_REQUIRED" as const,
        reasons: [
          ocrFailed && contentType.startsWith("image/")
            ? "OCR 처리에 실패했습니다. 관리자 검토가 필요합니다."
            : "OCR 결과가 없거나 읽을 수 없습니다. 관리자 검토가 필요합니다.",
        ],
      }
    : verifyVenuePaymentReceipt({
        expectedAmount: reservation.totalAmount,
        shortReservationCode: reservation.shortReservationCode,
        ocr: ocrResult,
        siblingReceipts: siblings,
        currentReceiptId: receiptRef.id,
      });

  const payload = {
    schemaVersion: 1 as const,
    federationSlug: input.federationSlug,
    reservationId: reservation.reservationId,
    shortReservationCode: reservation.shortReservationCode,
    teamId: reservation.teamId,
    teamName: reservation.teamName,
    venueName: reservation.venueName,
    bookingDate: reservation.bookingDate,
    startTime: reservation.startTime,
    endTime: reservation.endTime,
    expectedAmount: reservation.totalAmount,
    receiptImageUrl,
    receiptStoragePath: storagePath,
    contentType,
    ocrResult,
    verificationStatus: verified.verificationStatus,
    verificationReasons: verified.reasons,
    status: "PENDING_REVIEW" as const,
    uploadedBy: input.uploadedBy,
    uploadedAt: serverTimestamp(),
    reviewedBy: null,
    reviewedAt: null,
    rejectReason: null,
    updatedAt: serverTimestamp(),
  };

  await setDoc(receiptRef, payload);

  // Claim path (PAYMENT_CLAIMED alias) — never CONFIRMED
  const { reservation: afterClaim } = await claimVenueReservationPayment({
    federationSlug: input.federationSlug,
    reservationId: reservation.reservationId,
    claimantUid: input.uploadedBy,
    depositedAtLocal: ocrResult.depositedAt,
    latestReceiptId: receiptRef.id,
    paymentReceiptVerificationStatus: verified.verificationStatus,
    skipManagerNotify: true,
  });

  const receipt = parseReceipt(receiptRef.id, {
    ...payload,
    uploadedAt: new Date().toISOString(),
  });

  try {
    await notifyManagersReceipt({
      federationSlug: input.federationSlug,
      reservation: afterClaim,
      receipt,
      uploaderUid: input.uploadedBy,
    });
  } catch (e) {
    console.warn("[submitVenuePaymentReceipt] manager notify skipped", e);
  }

  return { receipt, reservation: afterClaim };
}

/**
 * Admin approve: CONFIRMED then FINALIZED (explicit admin click — not OCR auto).
 * Admin reject: receipt REJECTED only; payment stays UNCONFIRMED.
 */
export async function reviewVenuePaymentReceipt(input: {
  federationSlug: string;
  receiptId: string;
  adminUid: string;
  decision: "APPROVE" | "REJECT";
  rejectReason?: string | null;
}): Promise<{ receipt: VenuePaymentReceipt; reservation: VenueReservation }> {
  if (!input.adminUid.trim()) throw new Error("관리자 권한이 필요합니다.");
  await assertFederationManagerForPayment(input.federationSlug, input.adminUid);

  const receipt = await getVenuePaymentReceipt(input.federationSlug, input.receiptId);
  if (!receipt) throw new Error("영수증을 찾을 수 없습니다.");
  if (receipt.status === "APPROVED" || receipt.status === "REJECTED") {
    const reservation = await getVenueReservation(
      input.federationSlug,
      receipt.reservationId
    );
    if (!reservation) throw new Error("예약을 찾을 수 없습니다.");
    return { receipt, reservation };
  }

  const previousStatus = receipt.status;
  const receiptRef = doc(
    db,
    "federations",
    input.federationSlug,
    "venuePaymentReceipts",
    input.receiptId
  );

  const reservationBefore = await getVenueReservation(
    input.federationSlug,
    receipt.reservationId
  );
  if (!reservationBefore) throw new Error("예약을 찾을 수 없습니다.");

  if (input.decision === "REJECT") {
    const reason = String(input.rejectReason || "").trim() || "서류 확인 불가";
    const newStatus: VenuePaymentReceiptStatus = "REJECTED";
    await updateDoc(receiptRef, {
      status: newStatus,
      reviewedBy: input.adminUid,
      reviewedAt: serverTimestamp(),
      previousStatus,
      newStatus,
      rejectReason: reason,
      updatedAt: serverTimestamp(),
    });
    try {
      await appendReceiptReviewAudit({
        federationSlug: input.federationSlug,
        receipt,
        reservation: reservationBefore,
        adminUid: input.adminUid,
        previousStatus,
        newStatus,
        decision: "REJECT",
        rejectReason: reason,
      });
    } catch (e) {
      console.warn("[reviewVenuePaymentReceipt] audit skipped", e);
    }

    const next = await getVenuePaymentReceipt(input.federationSlug, input.receiptId);
    const reservation = reservationBefore;
    if (!next) throw new Error("반려 처리 후 조회에 실패했습니다.");

    try {
      const notify = getVenueNotificationProvider();
      if (reservation.createdByUid) {
        await notify.send({
          userId: reservation.createdByUid,
          title: "입금 영수증이 반려되었습니다",
          message: `예약번호 ${reservation.shortReservationCode} · ${reason}`,
          body: "영수증을 다시 업로드해 주세요. 입금 확인은 협회 승인 후에만 완료됩니다.",
          link: reservation.detailPath,
          pushDedupKey: `venue_payment_receipt_reject_${input.federationSlug}_${input.receiptId}`,
          teamId: reservation.teamId,
          teamName: reservation.teamName,
        });
      }
    } catch (e) {
      console.warn("[reviewVenuePaymentReceipt] reject notify skipped", e);
    }

    return { receipt: next, reservation };
  }

  // APPROVE — federation manager gate only (rules also block non-managers)
  const newStatus: VenuePaymentReceiptStatus = "APPROVED";
  await updateDoc(receiptRef, {
    status: newStatus,
    reviewedBy: input.adminUid,
    reviewedAt: serverTimestamp(),
    previousStatus,
    newStatus,
    rejectReason: null,
    updatedAt: serverTimestamp(),
  });

  try {
    await appendReceiptReviewAudit({
      federationSlug: input.federationSlug,
      receipt,
      reservation: reservationBefore,
      adminUid: input.adminUid,
      previousStatus,
      newStatus,
      decision: "APPROVE",
    });
  } catch (e) {
    console.warn("[reviewVenuePaymentReceipt] audit skipped", e);
  }

  await confirmVenueReservationPayment({
    federationSlug: input.federationSlug,
    reservationId: receipt.reservationId,
    adminUid: input.adminUid,
  });
  const reservation = await finalizeVenueReservation({
    federationSlug: input.federationSlug,
    reservationId: receipt.reservationId,
    adminUid: input.adminUid,
  });

  const next = await getVenuePaymentReceipt(input.federationSlug, input.receiptId);
  if (!next) throw new Error("승인 처리 후 영수증 조회에 실패했습니다.");
  return { receipt: next, reservation };
}

export class ReceiptEvidenceVenuePaymentService implements VenuePaymentService {
  submitDepositEvidence(input: {
    federationSlug: string;
    reservationId: string;
    uploadedBy: string;
    file: File;
  }) {
    return submitVenuePaymentReceipt(input);
  }

  reviewDepositEvidence(input: {
    federationSlug: string;
    receiptId: string;
    adminUid: string;
    decision: "APPROVE" | "REJECT";
    rejectReason?: string | null;
  }) {
    return reviewVenuePaymentReceipt(input);
  }
}

export const venuePaymentService: VenuePaymentService =
  new ReceiptEvidenceVenuePaymentService();
