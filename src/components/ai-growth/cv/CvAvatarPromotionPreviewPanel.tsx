/**
 * CV-1 I11-3-1 — Avatar Promotion Preview + SoT Compare (no write)
 */
import { ArrowRightLeft, GitCompare, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { AVATAR_TIER_LABELS, badgeMetaById } from "@/lib/ai-growth/avatarGrowthEngine";
import { growthLevelLabel } from "@/lib/ai-growth/growthAvatarLevel";
import type {
  AvatarPromotionPreviewCompareResultDto,
  AvatarPromotionPreviewSnapshotDto,
  AvatarPromotionPreviewValidationStatusDto,
  AvatarTierDto,
} from "@/lib/academy/academyCvAvatarPromotionPreviewReadTypes";
import { CvAvatarPromotionValidationPanel } from "@/components/ai-growth/cv/CvAvatarPromotionValidationPanel";
import { CvAvatarPromotionWritePanel } from "@/components/ai-growth/cv/CvAvatarPromotionWritePanel";
import {
  avatarPromotionValidationBadgeClass,
  avatarPromotionValidationBadgeLabel,
} from "@/components/ai-growth/cv/cvAvatarPromotionValidationUi";

type Props = {
  teamId: string;
  mediaId: string;
  linkId: string | null;
  promotionRuleVersion: string;
  previews: AvatarPromotionPreviewSnapshotDto[];
  compare: AvatarPromotionPreviewCompareResultDto | null;
  onReviewed?: () => void;
};

function compareKindClass(kind: string): string {
  switch (kind) {
    case "match":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "missing":
      return "border-amber-200 bg-amber-50 text-amber-950";
    case "changed":
      return "border-violet-200 bg-violet-50 text-violet-900";
    case "no_sot":
      return "border-slate-200 bg-slate-50 text-slate-800";
    default:
      return "border-gray-200 bg-gray-50 text-gray-800";
  }
}

function tierLine(tier: AvatarTierDto): string {
  const meta = AVATAR_TIER_LABELS[tier];
  return `${meta.emoji} ${meta.labelKo}`;
}

function validationBadgeClass(status: AvatarPromotionPreviewValidationStatusDto): string {
  return avatarPromotionValidationBadgeClass(status);
}

export function CvAvatarPromotionPreviewPanel({
  teamId,
  mediaId,
  linkId,
  promotionRuleVersion,
  previews,
  compare,
  onReviewed,
}: Props) {
  const latest = previews[0] ?? null;

  return (
    <div
      className="rounded-lg border border-teal-200 bg-teal-50/40 px-3 py-2 text-xs text-gray-900"
      data-testid="cv-avatar-promotion-preview-panel"
    >
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-teal-900">
        <ArrowRightLeft className="h-3.5 w-3.5" />
        Avatar Promotion Preview (I11-3-1)
      </p>
      {linkId ? (
        <p className="mt-1 font-mono text-[10px] text-teal-800">
          linkId: {linkId.slice(0, 12)}… · rule {promotionRuleVersion} · source cv_avatar_promotion
        </p>
      ) : null}

      {!latest ? (
        <p className="mt-2 text-[11px] text-gray-600">
          avatarPromotionPreview 없음 — validated avatarDraft 후 1:1 매핑됩니다.
        </p>
      ) : (
        <div className="mt-2 space-y-2 rounded-md border border-teal-100 bg-white/80 px-2 py-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-teal-300 bg-teal-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-teal-950">
              {latest.status}
            </span>
            <span
              className={cn(
                "rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                validationBadgeClass(latest.validationStatus)
              )}
            >
              {avatarPromotionValidationBadgeLabel(latest.validationStatus)}
            </span>
            <span className="text-[12px] font-bold text-teal-900">
              Level {growthLevelLabel(latest.proposedLevel as 1 | 2 | 3 | 4 | 5)} ·{" "}
              {tierLine(latest.proposedTier)}
            </span>
            <span className="text-[11px] text-teal-800">OVR {latest.proposedOvr}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-[10px]">
            <div>
              <p className="text-gray-500">vision</p>
              <p className="font-mono">{latest.proposedVision}</p>
            </div>
            <div>
              <p className="text-gray-500">pressure</p>
              <p className="font-mono">{latest.proposedPressure}</p>
            </div>
            <div>
              <p className="text-gray-500">recovery</p>
              <p className="font-mono">{latest.proposedRecovery}</p>
            </div>
          </div>
          {latest.proposedBadges.length > 0 ? (
            <ul className="flex flex-wrap gap-1">
              {latest.proposedBadges.map((id) => {
                const meta = badgeMetaById(id);
                return (
                  <li
                    key={id}
                    className="rounded border border-teal-200 bg-teal-50 px-1.5 py-0.5 text-[10px] text-teal-950"
                  >
                    {meta.emoji} {meta.labelKo}
                  </li>
                );
              })}
            </ul>
          ) : null}
          <p className="font-mono text-[10px] text-gray-700">
            avatarDraftId: {latest.avatarDraftId.slice(0, 10)}…
          </p>
          {latest.currentAvatarSnapshot ? (
            <p className="rounded border border-slate-100 bg-slate-50/80 px-2 py-1 text-[9px] text-slate-800">
              <Sparkles className="mr-1 inline h-3 w-3" />
              Current snapshot · Level {latest.currentAvatarSnapshot.level} ·{" "}
              {tierLine(latest.currentAvatarSnapshot.tier)} · badges{" "}
              {latest.currentAvatarSnapshot.badges.length}
            </p>
          ) : (
            <p className="text-[9px] text-gray-500">current Avatar SoT 없음 (preview 시점)</p>
          )}
          <p className="text-[9px] font-semibold text-teal-900">
            Avatar Promotion Preview ≠ playerGrowthAvatar write (I11-3-3 Apply)
          </p>
          {linkId ? (
            <>
              <CvAvatarPromotionValidationPanel
                teamId={teamId}
                mediaId={mediaId}
                linkId={linkId}
                preview={latest}
                onReviewed={onReviewed}
              />
              <CvAvatarPromotionWritePanel
                teamId={teamId}
                mediaId={mediaId}
                linkId={linkId}
                preview={latest}
                onPromoted={onReviewed}
              />
            </>
          ) : null}
        </div>
      )}

      {compare ? (
        <div className="mt-3 rounded-md border border-violet-200 bg-violet-50/50 px-2 py-1.5">
          <p className="flex items-center gap-1 text-[10px] font-semibold uppercase text-violet-900">
            <GitCompare className="h-3 w-3" />
            Proposed vs Current Avatar SoT (read-only)
          </p>
          {compare.currentAvatar ? (
            <p className="mt-1 font-mono text-[10px] text-gray-700">
              playerId: {compare.currentAvatar.playerId.slice(0, 12)}… · Level{" "}
              {compare.currentAvatar.level} · {tierLine(compare.currentAvatar.tier)}
            </p>
          ) : (
            <p className="mt-1 text-[10px] text-gray-600">current Avatar SoT 없음 (read-only)</p>
          )}
          <p className="mt-1 text-[10px] text-gray-700">
            match {compare.summary.match} · changed {compare.summary.changed} · noSot{" "}
            {compare.summary.noSot}
          </p>
          <ul className="mt-2 space-y-1">
            {compare.entries.map((e) => (
              <li
                key={e.key}
                className={cn(
                  "rounded border px-2 py-0.5 font-mono text-[9px]",
                  compareKindClass(e.kind)
                )}
              >
                {e.kind} · {e.key} {e.current ?? "—"} → {e.proposed ?? "—"}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mt-2 text-[10px] text-gray-500">
        I11-3-1 Avatar Promotion Preview · playerGrowthAvatar · Parent 금지 (I11 LOCK).
      </p>
    </div>
  );
}
