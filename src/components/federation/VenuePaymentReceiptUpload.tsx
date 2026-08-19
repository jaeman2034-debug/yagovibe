/**
 * PR4-1 / Sprint 2-2 — Member deposit evidence upload + claim.
 * CTA: 「영수증 올리고 입금 확인 요청」 (≠ admin CONFIRMED).
 */

import { useState } from "react";
import { venuePaymentService } from "@/lib/federation/venuePaymentReceiptService";
import type { VenuePaymentReceipt } from "@/lib/federation/venuePaymentReceiptTypes";
import type { VenueReservation } from "@/lib/federation/venueReservationTypes";

type Props = {
  federationSlug: string;
  reservation: VenueReservation;
  uploadedBy: string;
  onDone: (next: {
    reservation: VenueReservation;
    receipt: VenuePaymentReceipt;
  }) => void;
};

export function VenuePaymentReceiptUpload({
  federationSlug,
  reservation,
  uploadedBy,
  onDone,
}: Props) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit() {
    if (!file) {
      setErr("영수증 이미지 또는 PDF를 선택하세요.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const result = await venuePaymentService.submitDepositEvidence({
        federationSlug,
        reservationId: reservation.reservationId,
        uploadedBy,
        file,
      });
      setOpen(false);
      setFile(null);
      onDone(result);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "영수증 업로드에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="space-y-2 border-t border-slate-200 pt-6">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full rounded-md bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
        >
          영수증 올리고 입금 확인 요청
        </button>
        <p className="text-xs text-slate-500">
          송금 후 영수증을 올리면 협회에 「입금 확인 요청」이 전달됩니다. OCR·업로드만으로
          입금 완료(CONFIRMED)나 예약 확정이 되지 않습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 border-t border-slate-200 pt-6">
      <h2 className="text-sm font-semibold text-slate-900">영수증 선택</h2>
      <p className="text-xs text-slate-500">
        은행 앱 이체 확인 화면(이미지) 또는 PDF를 업로드하세요.
      </p>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="block w-full text-sm text-slate-700"
      />
      {file && (
        <p className="text-xs text-slate-600">
          선택: {file.name} ({Math.round(file.size / 1024)}KB)
        </p>
      )}
      {err && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {err}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setOpen(false);
            setFile(null);
            setErr(null);
          }}
          className="flex-1 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 disabled:opacity-50"
        >
          취소
        </button>
        <button
          type="button"
          disabled={busy || !file}
          onClick={() => void onSubmit()}
          className="flex-1 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "업로드·OCR 중…" : "업로드"}
        </button>
      </div>
    </div>
  );
}
