/**
 * CV-1 I11-1/2 — Avatar Draft Preview + Validation + Compare
 */
import { GitCompare, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { AVATAR_TIER_LABELS, badgeMetaById } from "@/lib/ai-growth/avatarGrowthEngine";
import { growthLevelLabel } from "@/lib/ai-growth/growthAvatarLevel";
import type {
  AvatarDraftCompareResultDto,
  AvatarDraftSnapshotDto,
  AvatarDraftValidationStatusDto,
  AvatarTierDto,
} from "@/lib/academy/academyCvAvatarDraftReadTypes";
import { CvAvatarDraftValidationPanel } from "@/components/ai-growth/cv/CvAvatarDraftValidationPanel";

type Props = {
  teamId: string;
  mediaId: string;
  linkId: string | null;
  avatarRuleVersion: string;
  playerId: string | null;
  drafts: AvatarDraftSnapshotDto[];
  compare: AvatarDraftCompareResultDto | null;
  onReviewed?: () => void;
};

function validationBadgeClass(status: AvatarDraftValidationStatusDto): string {
  switch (status) {
    case "validated":
      return "border-emerald-300 bg-emerald-50 text-emerald-900";
    case "rejected":
      return "border-red-300 bg-red-50 text-red-900";
    case "pending":
    default:
      return "border-amber-300 bg-amber-50 text-amber-950";
  }
}

function compareKindClass(kind: string): string {
  switch (kind) {
    case "match":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "missing":
      return "border-amber-200 bg-amber-50 text-amber-950";
    case "extra":
      return "border-red-200 bg-red-50 text-red-900";
    case "changed":
      return "border-violet-200 bg-violet-50 text-violet-900";
    default:
      return "border-gray-200 bg-gray-50 text-gray-800";
  }
}

function tierLine(tier: AvatarTierDto): string {
  const meta = AVATAR_TIER_LABELS[tier];
  return `${meta.emoji} ${meta.labelKo}`;
}

export function CvAvatarDraftPreview({
  teamId,
  mediaId,
  linkId,
  avatarRuleVersion,
  playerId,
  drafts,
  compare,
  onReviewed,
}: Props) {
  if (!linkId) {
    return null;
  }

  const latest = drafts[0];

  return (
    <section
      className="rounded-lg border border-pink-200 bg-pink-50/40 p-3"
      data-testid="cv-avatar-draft-preview"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-pink-700" />
        <h3 className="text-xs font-semibold text-pink-950">Avatar Draft Preview (I11-1)</h3>
      </div>
      <p className="mt-1 text-[10px] text-pink-900/80">
        playerGrowthOvr → avatarDraft · rule {avatarRuleVersion} · player {playerId ?? "—"}
      </p>

      {!latest ? (
        <p className="mt-2 rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-[10px] text-amber-950">
          playerGrowthOvr SoT가 없어 avatarDraft를 생성하지 못했습니다.
        </p>
      ) : (
        <div className="mt-2 space-y-2 rounded-md border border-pink-200 bg-white/80 px-2 py-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase text-pink-900">DRAFT</span>
            <span
              className={cn(
                "rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase",
                validationBadgeClass(latest.validationStatus)
              )}
            >
              {latest.validationStatus}
            </span>
            <span className="font-mono text-[10px] text-gray-600">
              {latest.draftId.slice(0, 12)}…
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px] sm:grid-cols-4">
            <div>
              <p className="text-gray-500">Level</p>
              <p className="font-semibold text-pink-950">
                {growthLevelLabel(latest.level as 1 | 2 | 3 | 4 | 5)}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Tier</p>
              <p className="font-semibold text-pink-950">{tierLine(latest.tier)}</p>
            </div>
            <div>
              <p className="text-gray-500">OVR</p>
              <p className="font-semibold text-pink-950">{latest.ovr}</p>
            </div>
            <div>
              <p className="text-gray-500">input source</p>
              <p className="font-semibold text-pink-950">{latest.inputOvrSource}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-[10px]">
            <div>
              <p className="text-gray-500">vision</p>
              <p className="font-mono">{latest.vision}</p>
            </div>
            <div>
              <p className="text-gray-500">pressure</p>
              <p className="font-mono">{latest.pressure}</p>
            </div>
            <div>
              <p className="text-gray-500">recovery</p>
              <p className="font-mono">{latest.recovery}</p>
            </div>
          </div>
          <div>
            <p className="text-[10px] text-gray-500">proposed badges</p>
            {latest.proposedBadges.length === 0 ? (
              <p className="text-[10px] text-gray-600">—</p>
            ) : (
              <ul className="mt-1 flex flex-wrap gap-1">
                {latest.proposedBadges.map((id) => {
                  const meta = badgeMetaById(id);
                  return (
                    <li
                      key={id}
                      className="rounded border border-pink-200 bg-pink-50 px-1.5 py-0.5 text-[10px] text-pink-950"
                    >
                      {meta.emoji} {meta.labelKo}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <p className="text-[9px] text-gray-500">
            Avatar Draft ≠ playerGrowthAvatar (I11-3 보류)
          </p>
          <CvAvatarDraftValidationPanel
            teamId={teamId}
            mediaId={mediaId}
            linkId={linkId}
            draft={latest}
            onReviewed={onReviewed}
          />
        </div>
      )}

      {compare ? (
        <div className="mt-3 rounded-md border border-violet-200 bg-violet-50/50 px-2 py-1.5">
          <p className="flex items-center gap-1 text-[10px] font-semibold uppercase text-violet-900">
            <GitCompare className="h-3 w-3" />
            What-if Compare (I11-2)
          </p>
          <p className="mt-1 text-[10px] text-gray-700">
            match {compare.summary.match} · missing {compare.summary.missing} · extra{" "}
            {compare.summary.extra} · changed {compare.summary.changed}
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
                {e.kind} · lvl {e.persistedLevel ?? "—"} / {e.simulatedLevel ?? "—"} · ovr{" "}
                {e.persistedOvr ?? "—"} / {e.simulatedOvr ?? "—"}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mt-2 text-[10px] text-gray-500">
        I11-1 Avatar Draft · I11-2 Validation · playerGrowthAvatar · Parent 금지 (I11 LOCK).
      </p>
    </section>
  );
}
