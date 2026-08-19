/**
 * PR1 — Reservation Detail (read-only fields).
 * PR2 — Member 「입금 확인 요청」 CTA (claim ≠ CONFIRMED).
 * PR4-1 / Sprint 2-2 — Receipt upload + ops status timeline + refund policy copy.
 */

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { doc, getDoc } from "firebase/firestore";
import { FederationHeader } from "@/components/federation/FederationHeader";
import { VenuePaymentReceiptUpload } from "@/components/federation/VenuePaymentReceiptUpload";
import { VenueRefundPolicyNote } from "@/components/federation/VenueRefundPolicyNote";
import { useAuth } from "@/context/AuthProvider";
import { db } from "@/lib/firebase";
import {
  claimVenueReservationPayment,
  getVenueReservation,
  resolveVenueDepositAccountGuide,
} from "@/lib/federation/venueReservationService";
import {
  isPaymentClaimed,
  type VenueReservation,
} from "@/lib/federation/venueReservationTypes";
import {
  buildVenueOpsTimeline,
  resolveVenueOpsStatus,
} from "@/lib/federation/venueReservationOpsStatus";
import { isGenericDepositAccountGuide } from "@/lib/federation/venueDepositAccount";
import { getVenuePaymentReceipt } from "@/lib/federation/venuePaymentReceiptService";
import type { VenuePaymentReceipt } from "@/lib/federation/venuePaymentReceiptTypes";

function formatWon(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "협회 안내 / 확정 예정";
  return `${n.toLocaleString("ko-KR")}원`;
}

export default function FederationVenueReservationDetailPage() {
  const { federationSlug = "", reservationId = "" } = useParams<{
    federationSlug: string;
    reservationId: string;
  }>();
  const { user } = useAuth();
  const [reservation, setReservation] = useState<VenueReservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [depositedAtLocal, setDepositedAtLocal] = useState("");
  const [displayBankGuide, setDisplayBankGuide] = useState("");
  const [latestReceipt, setLatestReceipt] = useState<VenuePaymentReceipt | null>(null);
  const [showLegacyClaim, setShowLegacyClaim] = useState(false);
  const [fedMeta, setFedMeta] = useState<{ name: string; region: string; logoUrl?: string }>({
    name: federationSlug,
    region: "",
  });

  useEffect(() => {
    if (!federationSlug) return;
    getDoc(doc(db, "federations", federationSlug)).then((snap) => {
      if (!snap.exists()) return;
      const d = snap.data() as Record<string, unknown>;
      setFedMeta({
        name: String(d.name || federationSlug),
        region: String(d.region || ""),
        logoUrl: typeof d.logoUrl === "string" ? d.logoUrl : undefined,
      });
    });
  }, [federationSlug]);

  useEffect(() => {
    let cancelled = false;
    if (!federationSlug || !reservationId) {
      setLoading(false);
      setErr("예약 정보를 찾을 수 없습니다.");
      return;
    }
    setLoading(true);
    setErr(null);
    getVenueReservation(federationSlug, reservationId)
      .then((r) => {
        if (cancelled) return;
        if (!r) {
          setErr("예약을 찾을 수 없습니다.");
          setReservation(null);
        } else {
          setReservation(r);
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setErr(e instanceof Error ? e.message : "예약 조회에 실패했습니다.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [federationSlug, reservationId]);

  useEffect(() => {
    let cancelled = false;
    if (!reservation) {
      setDisplayBankGuide("");
      return;
    }
    if (!isGenericDepositAccountGuide(reservation.bankAccountGuide)) {
      setDisplayBankGuide(reservation.bankAccountGuide);
      return;
    }
    resolveVenueDepositAccountGuide({
      federationSlug: reservation.federationSlug || federationSlug,
      venueId: reservation.venueId,
      venueName: reservation.venueName,
    })
      .then((guide) => {
        if (!cancelled) setDisplayBankGuide(guide);
      })
      .catch(() => {
        if (!cancelled) setDisplayBankGuide(reservation.bankAccountGuide);
      });
    return () => {
      cancelled = true;
    };
  }, [reservation, federationSlug]);

  // Sprint 2-2 — load latest receipt for member display
  useEffect(() => {
    let cancelled = false;
    const rid = reservation?.latestReceiptId?.trim();
    if (!federationSlug || !rid) {
      setLatestReceipt(null);
      return;
    }
    getVenuePaymentReceipt(federationSlug, rid)
      .then((r) => {
        if (!cancelled) setLatestReceipt(r);
      })
      .catch(() => {
        if (!cancelled) setLatestReceipt(null);
      });
    return () => {
      cancelled = true;
    };
  }, [federationSlug, reservation?.latestReceiptId]);

  const qrUrl = useMemo(() => {
    if (!reservation?.detailPath) return "";
    if (typeof window === "undefined") return reservation.detailPath;
    return `${window.location.origin.replace(/\/$/, "")}${reservation.detailPath}`;
  }, [reservation?.detailPath]);

  const ops = useMemo(
    () =>
      reservation
        ? resolveVenueOpsStatus(reservation)
        : null,
    [reservation]
  );
  const timeline = useMemo(
    () => (reservation ? buildVenueOpsTimeline(reservation) : []),
    [reservation]
  );

  const claimed = reservation ? isPaymentClaimed(reservation) : false;
  const canUploadReceipt =
    !!user &&
    !!reservation &&
    reservation.paymentStatus === "UNCONFIRMED" &&
    reservation.confirmStatus !== "FINALIZED";
  const canClaim = canUploadReceipt && !claimed;

  async function onClaim() {
    if (!user || !reservation) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const { reservation: next, claimed: didClaim } = await claimVenueReservationPayment({
        federationSlug,
        reservationId: reservation.reservationId,
        claimantUid: user.uid,
        depositedAtLocal: depositedAtLocal || null,
      });
      setReservation(next);
      setMsg(
        didClaim
          ? "입금 확인 요청을 보냈습니다. 협회 통장 확인 전까지는 입금 완료가 아닙니다."
          : "이미 입금 확인 요청이 접수된 예약입니다."
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "입금 확인 요청에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <FederationHeader
        federation={{
          id: federationSlug,
          name: fedMeta.name,
          slug: federationSlug,
          logoUrl: fedMeta.logoUrl,
          region: fedMeta.region,
        }}
      />
      <main className="mx-auto max-w-lg px-4 py-6">
        <Link
          to={`/federations/${encodeURIComponent(federationSlug)}/venues`}
          className="mb-4 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          구장 목록
        </Link>

        <h1 className="text-xl font-semibold tracking-tight text-slate-900">예약 상세</h1>
        <p className="mt-1 text-sm text-slate-500">배정 완료 후 발급된 예약 정보입니다.</p>

        {loading && <p className="mt-8 text-sm text-slate-500">불러오는 중…</p>}
        {err && !loading && (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {err}
          </p>
        )}
        {msg && (
          <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            {msg}
          </p>
        )}

        {reservation && !loading && ops && (
          <div className="mt-6 space-y-6">
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-slate-500">예약번호</dt>
                <dd className="mt-0.5 text-lg font-semibold tracking-wide text-slate-900">
                  {reservation.shortReservationCode}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">팀명</dt>
                <dd className="mt-0.5 font-medium text-slate-900">{reservation.teamName}</dd>
              </div>
              <div>
                <dt className="text-slate-500">구장</dt>
                <dd className="mt-0.5 font-medium text-slate-900">{reservation.venueName}</dd>
              </div>
              <div>
                <dt className="text-slate-500">날짜</dt>
                <dd className="mt-0.5 font-medium text-slate-900">{reservation.bookingDate}</dd>
              </div>
              <div>
                <dt className="text-slate-500">시간</dt>
                <dd className="mt-0.5 font-medium text-slate-900">
                  {reservation.startTime} – {reservation.endTime}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">금액</dt>
                <dd className="mt-0.5 font-medium text-slate-900">
                  {formatWon(reservation.totalAmount)}
                  {(reservation.baseAmount > 0 || reservation.lightingAmount > 0) && (
                    <span className="mt-1 block text-xs font-normal text-slate-500">
                      기본 {formatWon(reservation.baseAmount)}
                      {reservation.lightingAmount > 0
                        ? ` · 조명 ${formatWon(reservation.lightingAmount)}`
                        : ""}
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">입금계좌 · 예금주</dt>
                <dd className="mt-0.5 whitespace-pre-wrap font-medium text-slate-900">
                  {displayBankGuide || reservation.bankAccountGuide}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">입금기한</dt>
                <dd className="mt-0.5 font-medium text-slate-900">
                  {reservation.paymentDeadlineLabel}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">입금·확정 상태</dt>
                <dd className="mt-0.5 font-medium text-slate-900">{ops.memberLabel}</dd>
                <p className="mt-1 text-xs text-slate-500">{ops.memberHint}</p>
              </div>
            </dl>

            <ol className="flex flex-wrap gap-2" aria-label="예약 진행 단계">
              {timeline.map((step) => (
                <li
                  key={step.id}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    step.done
                      ? step.current
                        ? "bg-slate-900 text-white"
                        : "bg-emerald-100 text-emerald-900"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {step.label}
                </li>
              ))}
            </ol>

            {latestReceipt && (
              <section
                className="rounded-md border border-slate-200 bg-white p-3"
                aria-label="제출된 영수증"
              >
                <h2 className="text-sm font-semibold text-slate-900">제출된 영수증</h2>
                <p className="mt-1 text-xs text-slate-500">
                  증거 자료입니다. 검증 결과만으로 입금·예약이 자동 승인되지 않습니다.
                </p>
                <div className="mt-2 flex flex-wrap items-start gap-3">
                  {latestReceipt.receiptImageUrl ? (
                    <a
                      href={latestReceipt.receiptImageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block shrink-0"
                    >
                      {/\.pdf($|\?)/i.test(latestReceipt.receiptImageUrl) ? (
                        <span className="inline-flex h-20 w-20 items-center justify-center rounded border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700">
                          PDF
                        </span>
                      ) : (
                        <img
                          src={latestReceipt.receiptImageUrl}
                          alt="제출 영수증"
                          className="h-20 w-20 rounded border border-slate-200 object-cover"
                        />
                      )}
                    </a>
                  ) : null}
                  <div className="min-w-0 flex-1 text-xs text-slate-700">
                    <p>
                      검증:{" "}
                      <span
                        className={
                          latestReceipt.verificationStatus === "MATCH"
                            ? "font-semibold text-emerald-700"
                            : "font-semibold text-amber-700"
                        }
                      >
                        {latestReceipt.verificationStatus}
                      </span>
                      {" · "}상태 {latestReceipt.status}
                    </p>
                    {latestReceipt.ocrResult.amount != null ? (
                      <p className="mt-0.5">
                        OCR 금액 {latestReceipt.ocrResult.amount.toLocaleString("ko-KR")}원
                      </p>
                    ) : null}
                    <a
                      href={latestReceipt.receiptImageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block font-semibold text-sky-800 underline"
                    >
                      원본 열기
                    </a>
                  </div>
                </div>
              </section>
            )}

            {canUploadReceipt && user && (
              <VenuePaymentReceiptUpload
                federationSlug={federationSlug}
                reservation={reservation}
                uploadedBy={user.uid}
                onDone={({ reservation: next, receipt }) => {
                  setReservation(next);
                  setLatestReceipt(receipt);
                  setMsg(
                    `영수증이 접수되었습니다 (검증 ${receipt.verificationStatus}). 협회 승인 전까지 입금·예약은 확정되지 않습니다.`
                  );
                }}
              />
            )}

            {canClaim && user && (
              <div className="space-y-2">
                <button
                  type="button"
                  className="text-xs text-slate-500 underline"
                  onClick={() => setShowLegacyClaim((v) => !v)}
                >
                  {showLegacyClaim
                    ? "영수증 없이 요청 접기"
                    : "영수증 없이 입금 확인만 요청"}
                </button>
                {showLegacyClaim && (
                  <div className="space-y-3 rounded-md border border-slate-200 bg-white p-3">
                    <label className="block text-sm">
                      <span className="text-slate-600">입금 시각 (선택)</span>
                      <input
                        type="datetime-local"
                        value={depositedAtLocal}
                        onChange={(e) => setDepositedAtLocal(e.target.value)}
                        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void onClaim()}
                      className="w-full rounded-md border border-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-900 disabled:opacity-50"
                    >
                      {busy ? "요청 중…" : "입금 확인 요청"}
                    </button>
                    <p className="text-xs text-slate-500">
                      이 요청은 입금 신고일 뿐입니다. 협회가 통장을 확인하기 전까지 입금
                      완료로 처리되지 않습니다.
                    </p>
                  </div>
                )}
              </div>
            )}

            {!user && reservation.paymentStatus === "UNCONFIRMED" && (
              <p className="border-t border-slate-200 pt-4 text-sm text-slate-600">
                영수증 등록·입금 확인 요청을 보내려면{" "}
                <Link to="/login" className="underline">
                  로그인
                </Link>
                이 필요합니다.
              </p>
            )}

            {ops.stage === "CLAIMED" && (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                입금 확인 요청이 접수되었습니다. 협회 관리자가 통장을 확인하기 전까지 입금
                완료가 아닙니다.
              </p>
            )}

            <VenueRefundPolicyNote variant="member" />

            {qrUrl && (
              <div className="border-t border-slate-200 pt-6">
                <p className="text-sm font-medium text-slate-800">예약 확인 QR</p>
                <p className="mt-1 text-xs text-slate-500">
                  이 QR은 예약 상세 페이지 링크만 포함합니다.
                </p>
                <div className="mt-4 flex justify-center bg-white p-4">
                  <QRCodeSVG value={qrUrl} size={180} level="M" includeMargin />
                </div>
                <p className="mt-2 break-all text-center text-xs text-slate-400">{qrUrl}</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
