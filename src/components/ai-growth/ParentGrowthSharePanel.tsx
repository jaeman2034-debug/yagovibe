import { useMemo, useState } from "react";
import { Copy, Download, MessageCircle, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buildParentDeliveryShareMessage } from "@/lib/ai-growth/buildParentDeliveryShareMessage";
import type { GrowthScoreResult } from "@/lib/ai-growth/growthScore";
import {
  buildShareUrlFromDelivery,
  markGrowthReportSharedAt,
} from "@/lib/ai-growth/growthReportDelivery";
import type { GrowthReportDelivery } from "@/lib/ai-growth/playerGrowthHistoryTypes";
import { useParentDeliveryPanel } from "@/hooks/useParentDeliveryPanel";
import { describeAutoSendSettings } from "@/lib/parent-delivery/parentDeliveryLogic";
import { sendParentDelivery } from "@/lib/parent-delivery/sendParentDelivery";
import {
  callSendParentDeliveryAlimtalk,
} from "@/lib/parent-delivery/callSendParentDeliveryAlimtalk";
import { shareParentGrowthReportKakaoOrWebShare } from "@/services/kakaoShare";
import { ParentDeliveryContactForm } from "@/components/ai-growth/ParentDeliveryContactForm";

export type ParentGrowthSharePanelProps = {
  teamId: string;
  playerId: string;
  sessionDocId: string | null;
  playerName: string;
  growthScore: GrowthScoreResult | null;
  shareUrl: string | null;
  delivery: GrowthReportDelivery | null;
  onDownloadPdf: () => Promise<void>;
  onDeliveryUpdated?: (delivery: GrowthReportDelivery) => void;
  pdfDownloadPending?: boolean;
  deliveryPending?: boolean;
  className?: string;
};

/** Parent Delivery MVP + v2 — 수동 공유 · 자동 발송(Mock) · 발송 이력 */
export function ParentGrowthSharePanel({
  teamId,
  playerId,
  sessionDocId,
  playerName,
  growthScore,
  shareUrl,
  delivery,
  onDownloadPdf,
  onDeliveryUpdated,
  pdfDownloadPending = false,
  deliveryPending = false,
  className,
}: ParentGrowthSharePanelProps) {
  const [copyPending, setCopyPending] = useState(false);
  const [kakaoPending, setKakaoPending] = useState(false);
  const [resendPending, setResendPending] = useState(false);

  const { settings, logs, loading: panelLoading, settingsPending, refresh, toggleAutoSend } =
    useParentDeliveryPanel(teamId, sessionDocId);

  const ready = Boolean(shareUrl && delivery && sessionDocId);
  const shareMessage = useMemo(() => {
    if (!shareUrl) return null;
    return buildParentDeliveryShareMessage({
      playerName,
      shareUrl,
      growthScore,
    });
  }, [playerName, shareUrl, growthScore]);

  async function markSharedIfNeeded() {
    if (!delivery || !sessionDocId || delivery.sharedAt != null) return;
    try {
      await markGrowthReportSharedAt(teamId, sessionDocId, delivery);
      onDeliveryUpdated?.({ ...delivery, sharedAt: Date.now() });
    } catch (error) {
      console.warn("[ParentGrowthSharePanel] sharedAt update failed", error);
    }
  }

  async function handleCopyMessage() {
    if (!shareMessage) return;
    setCopyPending(true);
    try {
      await navigator.clipboard.writeText(shareMessage.clipText);
      await markSharedIfNeeded();
      toast.success("학부모 전달 문구를 복사했어요. 카카오톡에 붙여넣기 하세요.");
    } catch {
      toast.error("문구 복사에 실패했어요.");
    } finally {
      setCopyPending(false);
    }
  }

  async function handleKakaoShare() {
    if (!shareUrl || !shareMessage) return;
    setKakaoPending(true);
    try {
      const result = await shareParentGrowthReportKakaoOrWebShare({
        shareUrl,
        title: shareMessage.title,
        description: shareMessage.summary.replace(/\n\n/g, "\n"),
        clipText: shareMessage.clipText,
      });
      if (result.channel === "cancelled") return;
      await markSharedIfNeeded();
      if (result.channel === "kakao") {
        toast.success("카카오톡 공유 창을 열었어요.");
      } else if (result.channel === "web_share") {
        toast.success("공유 메뉴를 열었어요.");
      } else {
        toast.success("전달 문구를 복사했어요. 카카오톡에 붙여넣기 하세요.");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "카카오톡 공유에 실패했어요."
      );
    } finally {
      setKakaoPending(false);
    }
  }

  async function handleMockResend() {
    if (!shareUrl || !shareMessage || !sessionDocId) return;
    setResendPending(true);
    try {
      try {
        const alimtalk = await callSendParentDeliveryAlimtalk({
          teamId,
          playerId,
          sessionId: sessionDocId,
          displayName: playerName,
        });
        if (alimtalk.configured && !alimtalk.skipped) {
          await refresh();
          if (alimtalk.status === "sent") {
            toast.success("알림톡 발송 이력에 기록했어요.");
          } else {
            toast.error(alimtalk.error ?? "알림톡 발송에 실패했어요.");
          }
          return;
        }
      } catch (error) {
        console.warn("[ParentGrowthSharePanel] alimtalk resend failed", error);
      }

      const result = await sendParentDelivery({
        teamId,
        playerId,
        sessionId: sessionDocId,
        shareUrl,
        clipText: shareMessage.clipText,
        channel: "kakao",
        mode: "manual",
      });
      await refresh();
      if (result.log.status === "sent") {
        toast.success("발송 이력에 기록했어요. (Mock — 실제 알림톡은 v2.1)");
      } else {
        toast.error(result.log.error ?? "발송에 실패했어요.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "재발송에 실패했어요.");
    } finally {
      setResendPending(false);
    }
  }

  async function handlePdfDownload() {
    if (delivery?.pdfDownloadUrl) {
      const anchor = document.createElement("a");
      anchor.href = delivery.pdfDownloadUrl;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.download = delivery.pdfFilename || "성장리포트.pdf";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      toast.success("PDF 다운로드를 시작했어요.");
      return;
    }
    await onDownloadPdf();
  }

  return (
    <div
      className={cn(
        "rounded-xl border-2 border-emerald-400 bg-gradient-to-br from-emerald-50 via-white to-teal-50/80 px-4 py-4 shadow-sm",
        className
      )}
      data-testid="parent-delivery-panel"
    >
      <div className="flex items-start gap-2">
        <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
        <div className="min-w-0 flex-1">
          <h4 className="text-base font-black text-emerald-950">학부모 전달</h4>
          <p className="mt-0.5 text-xs leading-relaxed text-emerald-900">
            수동 공유(카카오·복사·PDF)는 항상 사용할 수 있습니다. 자동 발송은 Mock
            Provider(v2) — 실제 알림톡은 v2.1입니다.
          </p>
        </div>
      </div>

      <div
        className="mt-3 rounded-lg border border-emerald-200 bg-white/80 px-3 py-2.5"
        data-testid="parent-delivery-auto-settings"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-bold text-emerald-950">자동 발송 (Mock)</p>
            <p className="text-[10px] text-emerald-800">
              {panelLoading ? "설정 불러오는 중…" : describeAutoSendSettings(settings)}
            </p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-emerald-900">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-emerald-300"
              checked={settings.autoSendEnabled}
              disabled={settingsPending || panelLoading}
              data-testid="parent-delivery-auto-toggle"
              onChange={(e) => void toggleAutoSend(e.target.checked)}
            />
            활성화
          </label>
        </div>
      </div>

      <ParentDeliveryContactForm
        teamId={teamId}
        playerId={playerId}
        playerName={playerName}
        className="mt-3"
      />

      {deliveryPending ? (
        <p className="mt-3 text-sm text-emerald-800">PDF 업로드 · 공유 링크 생성 중…</p>
      ) : !ready ? (
        <p className="mt-3 rounded-lg border border-emerald-200 bg-white/80 px-3 py-2.5 text-xs text-emerald-900">
          <strong>훈련 세션 저장</strong>을 먼저 실행하면 학부모 전달 링크가 생성됩니다.
        </p>
      ) : (
        <>
          {shareMessage ? (
            <pre
              className="mt-3 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg border border-emerald-200 bg-white/90 px-3 py-2.5 font-sans text-[11px] leading-relaxed text-emerald-950"
              data-testid="parent-delivery-message-preview"
            >
              {shareMessage.clipText}
            </pre>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="default"
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
              disabled={kakaoPending}
              data-testid="parent-delivery-kakao"
              onClick={() => void handleKakaoShare()}
            >
              <MessageCircle className="h-3.5 w-3.5" aria-hidden />
              {kakaoPending ? "공유 중…" : "카카오톡 공유"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5 border-emerald-300 text-emerald-900"
              disabled={copyPending}
              data-testid="parent-delivery-copy"
              onClick={() => void handleCopyMessage()}
            >
              <Copy className="h-3.5 w-3.5" aria-hidden />
              {copyPending ? "복사 중…" : "전달 문구 복사"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5 border-emerald-300 text-emerald-900"
              disabled={pdfDownloadPending}
              data-testid="parent-delivery-pdf"
              onClick={() => void handlePdfDownload()}
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              {pdfDownloadPending ? "PDF 생성 중…" : "PDF 다운로드"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5 border-emerald-300 text-emerald-900"
              disabled={resendPending}
              data-testid="parent-delivery-resend"
              onClick={() => void handleMockResend()}
            >
              <Send className="h-3.5 w-3.5" aria-hidden />
              {resendPending ? "기록 중…" : "재발송 (Mock)"}
            </Button>
          </div>
          {delivery.sharedAt ? (
            <p className="mt-2 text-[10px] text-emerald-700">
              수동 전달 기록: {new Date(delivery.sharedAt).toLocaleString("ko-KR")}
            </p>
          ) : null}
          {logs.length > 0 ? (
            <div className="mt-3 rounded-lg border border-emerald-100 bg-white/90 px-3 py-2" data-testid="parent-delivery-log-list">
              <p className="text-[10px] font-bold uppercase text-emerald-800">발송 이력</p>
              <ul className="mt-1.5 space-y-1">
                {logs.map((log) => (
                  <li key={log.deliveryId} className="text-[10px] text-emerald-900">
                    <span className="font-semibold">{log.status}</span>
                    {" · "}
                    {log.channel}
                    {log.sentAt
                      ? ` · ${new Date(log.sentAt).toLocaleString("ko-KR")}`
                      : ""}
                    {log.error ? ` · ${log.error}` : ""}
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="mt-1 h-7 gap-1 px-1 text-[10px] text-emerald-800"
                onClick={() => void refresh()}
              >
                <RefreshCw className="h-3 w-3" aria-hidden />
                새로고침
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

/** Session doc with delivery → full share URL */
export function shareUrlFromSessionDelivery(
  delivery: GrowthReportDelivery | undefined
): string | null {
  if (!delivery?.sharePath) return null;
  return buildShareUrlFromDelivery(delivery);
}
