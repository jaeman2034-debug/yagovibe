/**
 * CV-1 I7 J5 — Internal Growth links preview (Signals + History)
 */
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { callExtractApprovedCvSignals } from "@/lib/academy/academyCvCallables";
import { loadCvGrowthLinksContext } from "@/lib/academy/academyCvGrowthLinksRead";
import { CvSignalsPreviewCard } from "@/components/ai-growth/cv/CvSignalsPreviewCard";
import { CvGrowthLinksHistoryList } from "@/components/ai-growth/cv/CvGrowthLinksHistoryList";
import { CvGrowthLinkReviewPanel } from "@/components/ai-growth/cv/CvGrowthLinkReviewPanel";
import { CvInterpretationCandidatesPreview } from "@/components/ai-growth/cv/CvInterpretationCandidatesPreview";
import { CvGrowthSignalsValidationPreview } from "@/components/ai-growth/cv/CvGrowthSignalsValidationPreview";
import { CvFiiDraftPreview } from "@/components/ai-growth/cv/CvFiiDraftPreview";
import { CvOvrDraftPreview } from "@/components/ai-growth/cv/CvOvrDraftPreview";
import { CvPromotionValidationPreview } from "@/components/ai-growth/cv/CvPromotionValidationPreview";
import { CvAvatarDraftPreview } from "@/components/ai-growth/cv/CvAvatarDraftPreview";
import { loadCvInterpretationPreviewContext } from "@/lib/academy/academyCvInterpretationRead";
import { loadCvGrowthSignalsPreviewContext } from "@/lib/academy/academyCvGrowthSignalsRead";
import { loadCvGrowthSignalsCompareContext } from "@/lib/academy/academyCvGrowthSignalsCompareRead";
import {
  loadCvFiiDraftCompareContext,
  loadCvFiiDraftPreviewContext,
} from "@/lib/academy/academyCvFiiDraftRead";
import {
  loadCvOvrDraftCompareContext,
  loadCvOvrDraftPreviewContext,
} from "@/lib/academy/academyCvOvrDraftRead";
import {
  loadCvPromotionPreviewCompareContext,
  loadCvPromotionPreviewContext,
} from "@/lib/academy/academyCvPromotionPreviewRead";
import { loadCvAvatarDraftPreviewContext, loadCvAvatarDraftCompareContext } from "@/lib/academy/academyCvAvatarDraftRead";
import {
  loadCvAvatarPromotionPreviewCompareContext,
  loadCvAvatarPromotionPreviewContext,
} from "@/lib/academy/academyCvAvatarPromotionPreviewRead";
import { CvAvatarPromotionPreviewPanel } from "@/components/ai-growth/cv/CvAvatarPromotionPreviewPanel";
import type { CvGrowthLinkSnapshotDto } from "@/lib/academy/academyCvGrowthLinksTypes";
import type { InterpretationCandidateSnapshotDto } from "@/lib/academy/academyCvInterpretationReadTypes";
import type {
  FiiDraftCompareResultDto,
  FiiDraftSnapshotDto,
} from "@/lib/academy/academyCvFiiDraftReadTypes";
import type {
  OvrDraftCompareResultDto,
  OvrDraftSnapshotDto,
} from "@/lib/academy/academyCvOvrDraftReadTypes";
import type {
  PromotionPreviewCompareResultDto,
  PromotionPreviewSnapshotDto,
} from "@/lib/academy/academyCvPromotionPreviewReadTypes";
import type { AvatarDraftSnapshotDto, AvatarDraftCompareResultDto } from "@/lib/academy/academyCvAvatarDraftReadTypes";
import type {
  AvatarPromotionPreviewCompareResultDto,
  AvatarPromotionPreviewSnapshotDto,
} from "@/lib/academy/academyCvAvatarPromotionPreviewReadTypes";
import type {
  GrowthSignalCompareResultDto,
  GrowthSignalSnapshotDto,
} from "@/lib/academy/academyCvGrowthSignalsReadTypes";

function logCvLoadError(step: string, error: unknown): void {
  const firebaseErr =
    error && typeof error === "object" ? (error as { code?: string; message?: string }) : null;
  console.error(`[ACADEMY-CV] ${step} failed`, {
    code: firebaseErr?.code,
    message: firebaseErr?.message ?? (error instanceof Error ? error.message : String(error)),
    error,
  });
}

async function runCvLoadStep<T>(step: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    logCvLoadError(step, error);
    return null;
  }
}

type Props = {
  teamId: string;
  mediaId: string;
  refreshKey?: number;
  enabled?: boolean;
  cvActiveRunId?: string;
  cvRunReviewStatus?: string;
};

export function CvGrowthInternalSection({
  teamId,
  mediaId,
  refreshKey = 0,
  enabled = true,
  cvActiveRunId,
  cvRunReviewStatus,
}: Props) {
  const [extracting, setExtracting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<
    Awaited<ReturnType<typeof loadCvGrowthLinksContext>>["history"]
  >([]);
  const [signals, setSignals] = useState<
    Awaited<ReturnType<typeof loadCvGrowthLinksContext>>["signals"]
  >([]);
  const [latestLinkId, setLatestLinkId] = useState<string | undefined>();
  const [latestLink, setLatestLink] = useState<CvGrowthLinkSnapshotDto | null>(null);
  const [interpretationLinkId, setInterpretationLinkId] = useState<string | null>(null);
  const [interpretationLinkAccepted, setInterpretationLinkAccepted] = useState(false);
  const [interpretationCandidates, setInterpretationCandidates] = useState<
    InterpretationCandidateSnapshotDto[]
  >([]);
  const [growthSignalsLinkId, setGrowthSignalsLinkId] = useState<string | null>(null);
  const [growthSignalsRuleVersion, setGrowthSignalsRuleVersion] = useState("i9-1-v0.1");
  const [growthSignalDrafts, setGrowthSignalDrafts] = useState<GrowthSignalSnapshotDto[]>([]);
  const [growthSignalsCompare, setGrowthSignalsCompare] = useState<GrowthSignalCompareResultDto | null>(
    null
  );
  const [fiiDraftLinkId, setFiiDraftLinkId] = useState<string | null>(null);
  const [fiiPromotionRuleVersion, setFiiPromotionRuleVersion] = useState("i9-3-v0.1");
  const [fiiEngineVersion, setFiiEngineVersion] = useState("v1.0.0");
  const [fiiDrafts, setFiiDrafts] = useState<FiiDraftSnapshotDto[]>([]);
  const [fiiDraftCompare, setFiiDraftCompare] = useState<FiiDraftCompareResultDto | null>(null);
  const [ovrDraftLinkId, setOvrDraftLinkId] = useState<string | null>(null);
  const [ovrRuleVersion, setOvrRuleVersion] = useState("i10-1-v0.1");
  const [ovrFiiEngineVersion, setOvrFiiEngineVersion] = useState("v1.0.0");
  const [ovrPromotionRuleVersion, setOvrPromotionRuleVersion] = useState("i9-3-v0.1");
  const [ovrDrafts, setOvrDrafts] = useState<OvrDraftSnapshotDto[]>([]);
  const [ovrDraftCompare, setOvrDraftCompare] = useState<OvrDraftCompareResultDto | null>(null);
  const [promotionPreviewLinkId, setPromotionPreviewLinkId] = useState<string | null>(null);
  const [promotionRuleVersion, setPromotionRuleVersion] = useState("i10-3-v0.1");
  const [promotionPreviews, setPromotionPreviews] = useState<PromotionPreviewSnapshotDto[]>([]);
  const [promotionPreviewCompare, setPromotionPreviewCompare] =
    useState<PromotionPreviewCompareResultDto | null>(null);
  const [avatarDraftLinkId, setAvatarDraftLinkId] = useState<string | null>(null);
  const [avatarRuleVersion, setAvatarRuleVersion] = useState("i11-1-v0.1");
  const [avatarDraftPlayerId, setAvatarDraftPlayerId] = useState<string | null>(null);
  const [avatarDrafts, setAvatarDrafts] = useState<AvatarDraftSnapshotDto[]>([]);
  const [avatarDraftCompare, setAvatarDraftCompare] = useState<AvatarDraftCompareResultDto | null>(
    null
  );
  const [avatarPromotionPreviewLinkId, setAvatarPromotionPreviewLinkId] = useState<string | null>(
    null
  );
  const [avatarPromotionRuleVersion, setAvatarPromotionRuleVersion] = useState("i11-3-1-v0.1");
  const [avatarPromotionPreviews, setAvatarPromotionPreviews] = useState<
    AvatarPromotionPreviewSnapshotDto[]
  >([]);
  const [avatarPromotionPreviewCompare, setAvatarPromotionPreviewCompare] =
    useState<AvatarPromotionPreviewCompareResultDto | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const ctx = await loadCvGrowthLinksContext(teamId, mediaId);
      setHistory(ctx.history);
      setSignals(ctx.signals);
      setLatestLinkId(ctx.latestLink?.linkId);
      setLatestLink(ctx.latestLink);
      console.info("[ACADEMY-CV] J5 growth links loaded", {
        teamId,
        mediaId,
        cvActiveRunId: cvActiveRunId ?? null,
        cvRunReviewStatus: cvRunReviewStatus ?? null,
        historyCount: ctx.history.length,
        signalCount: ctx.signals.length,
      });
      const acceptedLink =
        ctx.history.find((h) => h.reviewStatus === "accepted") ?? ctx.latestLink;
      if (acceptedLink?.linkId && acceptedLink.reviewStatus === "accepted") {
        const linkId = acceptedLink.linkId;
        setInterpretationLinkAccepted(true);

        setInterpretationLinkId(linkId);

        const interpretation = await runCvLoadStep("interpretationPreview", () =>
          loadCvInterpretationPreviewContext(teamId, mediaId, linkId)
        );
        setInterpretationCandidates(interpretation?.candidates ?? []);

        const growthPreview = await runCvLoadStep("growthSignalsPreview", () =>
          loadCvGrowthSignalsPreviewContext(teamId, mediaId, linkId)
        );
        setGrowthSignalsLinkId(growthPreview?.linkId ?? null);
        setGrowthSignalsRuleVersion(growthPreview?.mappingRuleVersion ?? "i8-2-v0.1");
        setGrowthSignalDrafts(growthPreview?.signals ?? []);

        const compareCtx = await runCvLoadStep("growthSignalsCompare", () =>
          loadCvGrowthSignalsCompareContext(teamId, mediaId, linkId)
        );
        setGrowthSignalsCompare(compareCtx?.compare ?? null);

        const fiiPreview = await runCvLoadStep("fiiDraftPreview", () =>
          loadCvFiiDraftPreviewContext(teamId, mediaId, linkId)
        );
        setFiiDraftLinkId(fiiPreview?.linkId ?? null);
        setFiiPromotionRuleVersion(fiiPreview?.promotionRuleVersion ?? "i9-3-v0.1");
        setFiiEngineVersion(fiiPreview?.fiiEngineVersion ?? "v1.0.0");
        setFiiDrafts(fiiPreview?.drafts ?? []);

        const fiiCompareCtx = await runCvLoadStep("fiiDraftCompare", () =>
          loadCvFiiDraftCompareContext(teamId, mediaId, linkId)
        );
        setFiiDraftCompare(fiiCompareCtx?.compare ?? null);

        const ovrPreview = await runCvLoadStep("ovrDraftPreview", () =>
          loadCvOvrDraftPreviewContext(teamId, mediaId, linkId)
        );
        setOvrDraftLinkId(ovrPreview?.linkId ?? null);
        setOvrRuleVersion(ovrPreview?.ovrRuleVersion ?? "i10-1-v0.1");
        setOvrFiiEngineVersion(ovrPreview?.fiiEngineVersion ?? "v1.0.0");
        setOvrPromotionRuleVersion(ovrPreview?.promotionRuleVersion ?? "i9-3-v0.1");
        setOvrDrafts(ovrPreview?.drafts ?? []);

        const ovrCompareCtx = await runCvLoadStep("ovrDraftCompare", () =>
          loadCvOvrDraftCompareContext(teamId, mediaId, linkId)
        );
        setOvrDraftCompare(ovrCompareCtx?.compare ?? null);

        const promoPreview = await runCvLoadStep("promotionPreview", () =>
          loadCvPromotionPreviewContext(teamId, mediaId, linkId)
        );
        setPromotionPreviewLinkId(promoPreview?.linkId ?? null);
        setPromotionRuleVersion(promoPreview?.promotionRuleVersion ?? "i10-3-v0.1");
        setPromotionPreviews(promoPreview?.previews ?? []);

        const promoCompareCtx = await runCvLoadStep("promotionPreviewCompare", () =>
          loadCvPromotionPreviewCompareContext(teamId, mediaId, linkId)
        );
        setPromotionPreviewCompare(promoCompareCtx?.compare ?? null);

        const avatarPreview = await runCvLoadStep("avatarDraftPreview", () =>
          loadCvAvatarDraftPreviewContext(teamId, mediaId, linkId)
        );
        setAvatarDraftLinkId(avatarPreview?.linkId ?? null);
        setAvatarRuleVersion(avatarPreview?.avatarRuleVersion ?? "i11-1-v0.1");
        setAvatarDraftPlayerId(avatarPreview?.playerId ?? null);
        setAvatarDrafts(avatarPreview?.drafts ?? []);

        const avatarCompareCtx = await runCvLoadStep("avatarDraftCompare", () =>
          loadCvAvatarDraftCompareContext(teamId, mediaId, linkId)
        );
        setAvatarDraftCompare(avatarCompareCtx?.compare ?? null);

        const avatarPromoPreview = await runCvLoadStep("avatarPromotionPreview", () =>
          loadCvAvatarPromotionPreviewContext(teamId, mediaId, linkId)
        );
        setAvatarPromotionPreviewLinkId(avatarPromoPreview?.linkId ?? null);
        setAvatarPromotionRuleVersion(avatarPromoPreview?.promotionRuleVersion ?? "i11-3-1-v0.1");
        setAvatarPromotionPreviews(avatarPromoPreview?.previews ?? []);

        const avatarPromoCompareCtx = await runCvLoadStep("avatarPromotionPreviewCompare", () =>
          loadCvAvatarPromotionPreviewCompareContext(teamId, mediaId, linkId)
        );
        setAvatarPromotionPreviewCompare(avatarPromoCompareCtx?.compare ?? null);
      } else {
        setInterpretationLinkId(null);
        setInterpretationLinkAccepted(false);
        setInterpretationCandidates([]);
        setGrowthSignalsLinkId(null);
        setGrowthSignalDrafts([]);
        setGrowthSignalsCompare(null);
        setFiiDraftLinkId(null);
        setFiiDrafts([]);
        setFiiDraftCompare(null);
        setOvrDraftLinkId(null);
        setOvrDrafts([]);
        setOvrDraftCompare(null);
        setPromotionPreviewLinkId(null);
        setPromotionPreviews([]);
        setPromotionPreviewCompare(null);
        setAvatarDraftLinkId(null);
        setAvatarDraftPlayerId(null);
        setAvatarDrafts([]);
        setAvatarDraftCompare(null);
        setAvatarPromotionPreviewLinkId(null);
        setAvatarPromotionPreviews([]);
        setAvatarPromotionPreviewCompare(null);
      }
    } catch (e) {
      logCvLoadError("growthLinksContext", e);
      setError("CV growth links를 불러오지 못했습니다.");
      setHistory([]);
      setSignals([]);
      setLatestLinkId(undefined);
      setLatestLink(null);
      setInterpretationLinkId(null);
      setInterpretationCandidates([]);
      setGrowthSignalsLinkId(null);
      setGrowthSignalDrafts([]);
      setGrowthSignalsCompare(null);
      setFiiDraftLinkId(null);
      setFiiDrafts([]);
      setFiiDraftCompare(null);
      setOvrDraftLinkId(null);
      setOvrDrafts([]);
      setOvrDraftCompare(null);
      setPromotionPreviewLinkId(null);
      setPromotionPreviews([]);
      setPromotionPreviewCompare(null);
      setAvatarDraftLinkId(null);
      setAvatarDraftPlayerId(null);
      setAvatarDrafts([]);
      setAvatarDraftCompare(null);
      setAvatarPromotionPreviewLinkId(null);
      setAvatarPromotionPreviews([]);
      setAvatarPromotionPreviewCompare(null);
    } finally {
      setLoading(false);
    }
  }, [cvActiveRunId, cvRunReviewStatus, enabled, mediaId, teamId]);

  async function handleExtractSignals() {
    if (!cvActiveRunId || extracting) return;
    setExtracting(true);
    setError(null);
    try {
      const result = await callExtractApprovedCvSignals({
        teamId,
        mediaId,
        runId: cvActiveRunId,
      });
      console.info("[ACADEMY-CV] J3 manual extraction OK", {
        mediaId,
        linkId: result.linkId,
        created: result.created,
      });
      await refresh();
    } catch (e) {
      logCvLoadError("extractApprovedCvSignals", e);
      setError(
        e instanceof Error ? e.message : "Signal extraction(J3)에 실패했습니다."
      );
    } finally {
      setExtracting(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [refresh, refreshKey]);

  if (!enabled) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-violet-100 bg-violet-50/40 px-3 py-2 text-xs text-gray-600">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        CV Signals (J5) 로딩…
      </div>
    );
  }

  if (error && history.length === 0) {
    return (
      <div className="space-y-2 rounded-lg border border-violet-200 bg-violet-50/30 px-3 py-2 text-xs">
        <p className="font-semibold text-violet-900">CV Signals Preview (J5)</p>
        <p className="rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-red-800">
          {error}
          {" · "}
          <code className="font-mono text-[10px]">getCvGrowthLinksContext</code> 배포 확인
        </p>
      </div>
    );
  }

  if (history.length === 0) {
    const approvedWithoutLinks = cvRunReviewStatus === "approved" && Boolean(cvActiveRunId);
    return (
      <div
        className="rounded-lg border border-dashed border-violet-200 bg-violet-50/20 px-3 py-2 text-xs text-gray-600"
        data-testid="cv-j5-empty"
      >
        <p className="font-semibold text-violet-900">CV Signals Preview (J5)</p>
        <p className="mt-1 font-mono text-[10px] text-violet-800">mediaId: {mediaId}</p>
        <p className="mt-1">
          cvGrowthLinks 없음 — approved CV run에 대해{" "}
          <strong>Signal Extraction (J3)</strong> 후 표시됩니다.
        </p>
        {approvedWithoutLinks ? (
          <div className="mt-2 space-y-1">
            <p className="text-[11px] text-violet-900">
              cvRun <span className="font-mono">{cvActiveRunId!.slice(0, 12)}…</span> · APPROVED
            </p>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="border-violet-300 text-violet-900"
              disabled={extracting}
              onClick={() => void handleExtractSignals()}
            >
              {extracting ? (
                <>
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  Signal Extraction…
                </>
              ) : (
                "Signal Extraction (J3) 실행"
              )}
            </Button>
          </div>
        ) : null}
        {error ? (
          <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-red-800">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-2" data-testid="cv-growth-internal-section">
      <CvSignalsPreviewCard signals={signals} linkId={latestLinkId} />
      <CvGrowthLinksHistoryList history={history} />
      {latestLink ? (
        <CvGrowthLinkReviewPanel
          teamId={teamId}
          mediaId={mediaId}
          link={latestLink}
          onReviewed={() => void refresh()}
        />
      ) : null}
      <CvInterpretationCandidatesPreview
        teamId={teamId}
        mediaId={mediaId}
        linkId={interpretationLinkId}
        linkAccepted={interpretationLinkAccepted}
        candidates={interpretationCandidates}
        onReviewed={() => void refresh()}
      />
      <CvGrowthSignalsValidationPreview
        teamId={teamId}
        mediaId={mediaId}
        linkId={growthSignalsLinkId}
        mappingRuleVersion={growthSignalsRuleVersion}
        signals={growthSignalDrafts}
        interpretationCandidates={interpretationCandidates}
        compare={growthSignalsCompare}
        onReviewed={() => void refresh()}
      />
      <CvFiiDraftPreview
        linkId={fiiDraftLinkId}
        promotionRuleVersion={fiiPromotionRuleVersion}
        fiiEngineVersion={fiiEngineVersion}
        drafts={fiiDrafts}
        growthSignals={growthSignalDrafts}
        compare={fiiDraftCompare}
      />
      <CvOvrDraftPreview
        teamId={teamId}
        mediaId={mediaId}
        linkId={ovrDraftLinkId}
        ovrRuleVersion={ovrRuleVersion}
        fiiEngineVersion={ovrFiiEngineVersion}
        promotionRuleVersion={ovrPromotionRuleVersion}
        drafts={ovrDrafts}
        fiiDrafts={fiiDrafts}
        compare={ovrDraftCompare}
        onReviewed={() => void refresh()}
      />
      <CvPromotionValidationPreview
        teamId={teamId}
        mediaId={mediaId}
        linkId={promotionPreviewLinkId}
        promotionRuleVersion={promotionRuleVersion}
        previews={promotionPreviews}
        compare={promotionPreviewCompare}
        onReviewed={() => void refresh()}
      />
      <CvAvatarDraftPreview
        teamId={teamId}
        mediaId={mediaId}
        linkId={avatarDraftLinkId}
        avatarRuleVersion={avatarRuleVersion}
        playerId={avatarDraftPlayerId}
        drafts={avatarDrafts}
        compare={avatarDraftCompare}
        onReviewed={() => void refresh()}
      />
      <CvAvatarPromotionPreviewPanel
        teamId={teamId}
        mediaId={mediaId}
        linkId={avatarPromotionPreviewLinkId}
        promotionRuleVersion={avatarPromotionRuleVersion}
        previews={avatarPromotionPreviews}
        compare={avatarPromotionPreviewCompare}
        onReviewed={() => void refresh()}
      />
      <p className="text-[10px] text-gray-500">
        playerGrowthAvatar · Parent · Guardian · playerGrowthHistory 금지 (I11 LOCK).
      </p>
    </div>
  );
}
