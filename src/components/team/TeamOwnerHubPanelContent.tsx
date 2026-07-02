import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Loader2, Pencil, Sparkles, UserPlus, Image as ImageIcon, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { TeamCoverPhotoUploader } from "@/components/team/TeamCoverPhotoUploader";
import { TeamOperatorCoachCard } from "@/components/team/TeamOperatorCoachCard";
import { TeamPublicStaffManageSection } from "@/components/team/TeamPublicStaffManageSection";
import { PublicProfileTextareaWithAi } from "@/components/team/PublicProfileTextareaWithAi";
import { TeamProfileScoreCard } from "@/components/team/TeamProfileScoreCard";
import type { TeamProfileScoreResult } from "@/lib/team/profileScore";
import { canViewAIGrowthValidationConsole } from "@/lib/academy/aiGrowthValidationSelectors";
import { normalizeMemberRole } from "@/lib/team/academyMemberRole";
import { teamAiAnalysisLitePath } from "@/lib/team/teamAiAnalysisLite";
import AIGrowthValidationConsole from "@/pages/team/AIGrowthValidationConsole";
import { TeamGrowthCoachShell } from "@/components/ai-growth/TeamGrowthCoachShell";

export type TeamOwnerHubPanelContentProps = {
  dark?: boolean;
  teamId: string;
  team: Record<string, unknown> | null;
  coverUrl: string | null;
  onCoverUpdated: () => void;
  isActiveMember: boolean;
  recentMatchCount21d: number;
  teamName: string;
  onOpenScheduleCreate: () => void;
  showStaffManage: boolean;
  onStaffUpdated: () => void;
  staffManageRef?: React.RefObject<HTMLDivElement | null>;
  onInviteMembers: () => void;
  onOpenMediaTab: () => void;
  onOpenProfileEdit: () => void;
  profileEditMode: boolean;
  saveProfileBusy: boolean;
  profileScoreResult: TeamProfileScoreResult | null;
  selectionAiToneHint?: string;
  draftDescription: string;
  setDraftDescription: (v: string) => void;
  draftHighlightsText: string;
  setDraftHighlightsText: (v: string) => void;
  draftRecruitMessage: string;
  setDraftRecruitMessage: (v: string) => void;
  captainMessageEditOpen: boolean;
  setCaptainMessageEditOpen: (v: boolean) => void;
  draftCaptainMessage: string;
  setDraftCaptainMessage: (v: string) => void;
  captainMessageSaveBusy: boolean;
  onSaveCaptainMessage: () => void;
  canUseOwnerAiCopy: boolean;
  brandingBusy: boolean;
  fieldDiffBusy: boolean;
  onAiFillAll: () => void;
  onAiIntro: () => void;
  onAiRecruit: () => void;
  onAiCaptain: () => void;
  onNavigateMemberManage: () => void;
  canManageCaptainPhoto: boolean;
  ownerDiffBlock?: ReactNode;
  /** Academy — AI 분석 Lite 탭 분기 */
  isAcademyTeam?: boolean;
  viewerMemberRole?: string;
  /** 팀 문서 owner — Validation Console 표시 (coach/admin과 동일 게이트) */
  isTeamOwner?: boolean;
};

export function buildOwnerHubPanelTabs(props: TeamOwnerHubPanelContentProps) {
  const {
    dark = false,
    teamId,
    team,
    coverUrl,
    onCoverUpdated,
    isActiveMember,
    recentMatchCount21d,
    teamName,
    onOpenScheduleCreate,
    showStaffManage,
    onStaffUpdated,
    staffManageRef,
    onInviteMembers,
    onOpenMediaTab,
    onOpenProfileEdit,
    profileEditMode,
    saveProfileBusy,
    profileScoreResult,
    selectionAiToneHint,
    draftDescription,
    setDraftDescription,
    draftHighlightsText,
    setDraftHighlightsText,
    draftRecruitMessage,
    setDraftRecruitMessage,
    captainMessageEditOpen,
    setCaptainMessageEditOpen,
    draftCaptainMessage,
    setDraftCaptainMessage,
    captainMessageSaveBusy,
    onSaveCaptainMessage,
    canUseOwnerAiCopy,
    brandingBusy,
    fieldDiffBusy,
    onAiFillAll,
    onAiIntro,
    onAiRecruit,
    onAiCaptain,
    onNavigateMemberManage,
    canManageCaptainPhoto,
    ownerDiffBlock,
    isAcademyTeam = false,
    viewerMemberRole,
    isTeamOwner = false,
  } = props;

  const showGrowthValidation =
    isTeamOwner ||
    canViewAIGrowthValidationConsole(normalizeMemberRole(viewerMemberRole));

  const showAiAnalysisLite = !isAcademyTeam;

  const btnOutline = cn("gap-1.5 text-xs w-full sm:w-auto", dark ? "border-slate-600" : "");

  const contentTab = (
    <div className="space-y-4">
      <TeamCoverPhotoUploader teamId={teamId} coverUrl={coverUrl} dark={dark} onUpdated={onCoverUpdated} />
      {!profileEditMode ? (
        <Button type="button" size="sm" variant="outline" className={btnOutline} onClick={onOpenProfileEdit}>
          <Pencil className="h-3.5 w-3.5" />
          소개·모집 문구 편집
        </Button>
      ) : null}
      {profileEditMode ? (
        <>
          {profileScoreResult ? <TeamProfileScoreCard result={profileScoreResult} dark={dark} /> : null}
          <section>
            <h3 className={cn("text-xs font-semibold", dark ? "text-slate-200" : "text-gray-800")}>팀 소개</h3>
            <PublicProfileTextareaWithAi
              id="team-owner-edit-intro"
              field="intro"
              teamId={teamId}
              aiImproveEnabled={canUseOwnerAiCopy}
              toneHint={selectionAiToneHint}
              value={draftDescription}
              onChange={setDraftDescription}
              className={cn("mt-2 min-h-[120px] text-sm", dark ? "border-slate-600 bg-slate-950/60 text-slate-100" : "")}
              maxLength={8000}
              disabled={saveProfileBusy}
            />
          </section>
          <section>
            <h3 className={cn("text-xs font-semibold", dark ? "text-slate-200" : "text-gray-800")}>이런 분께 추천</h3>
            <PublicProfileTextareaWithAi
              id="team-owner-edit-oneLine"
              field="oneLine"
              teamId={teamId}
              aiImproveEnabled={canUseOwnerAiCopy}
              toneHint={selectionAiToneHint}
              value={draftHighlightsText}
              onChange={setDraftHighlightsText}
              className={cn("mt-2 min-h-[80px] text-sm", dark ? "border-slate-600 bg-slate-950/60 text-slate-100" : "")}
              disabled={saveProfileBusy}
            />
          </section>
          <section>
            <h3 className={cn("text-xs font-semibold", dark ? "text-slate-200" : "text-gray-800")}>참여·가입 문구</h3>
            <PublicProfileTextareaWithAi
              id="team-owner-edit-joinMessage"
              field="joinMessage"
              teamId={teamId}
              aiImproveEnabled={canUseOwnerAiCopy}
              toneHint={selectionAiToneHint}
              value={draftRecruitMessage}
              onChange={setDraftRecruitMessage}
              className={cn("mt-2 min-h-[72px] text-sm", dark ? "border-slate-600 bg-slate-950/60 text-slate-100" : "")}
              maxLength={600}
              disabled={saveProfileBusy}
            />
          </section>
          {ownerDiffBlock}
        </>
      ) : null}
      {canManageCaptainPhoto ? (
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" className={btnOutline} disabled={fieldDiffBusy} onClick={onAiCaptain}>
          <Sparkles className="h-3.5 w-3.5" />
          AI 대표 인사
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={btnOutline}
          onClick={() => {
            setCaptainMessageEditOpen(true);
          }}
        >
          <Pencil className="h-3.5 w-3.5" />
          대표 인사 직접 수정
        </Button>
      </div>
      ) : null}
      {canManageCaptainPhoto && captainMessageEditOpen ? (
        <div className="space-y-2">
          <Textarea
            value={draftCaptainMessage}
            onChange={(e) => setDraftCaptainMessage(e.target.value)}
            disabled={captainMessageSaveBusy}
            maxLength={1200}
            rows={6}
            className={cn("text-sm", dark ? "border-slate-600 bg-slate-950/60 text-slate-100" : "")}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setCaptainMessageEditOpen(false)}>
              닫기
            </Button>
            <Button type="button" size="sm" disabled={captainMessageSaveBusy} onClick={onSaveCaptainMessage}>
              {captainMessageSaveBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              저장
            </Button>
          </div>
        </div>
      ) : null}
      {showStaffManage && team ? (
        <div ref={staffManageRef} id="team-hub-staff-manage" className="scroll-mt-4">
          <TeamPublicStaffManageSection teamId={teamId} team={team} dark={dark} onUpdated={onStaffUpdated} />
        </div>
      ) : null}
      <TeamOperatorCoachCard
        teamId={teamId}
        isActiveMember={isActiveMember}
        visible
        recentMatchCount21d={recentMatchCount21d}
        teamName={teamName}
        onOpenScheduleCreate={onOpenScheduleCreate}
        dark={dark}
      />
    </div>
  );

  const membersTab = (
    <div className="space-y-3">
      <p className={cn("text-xs leading-relaxed", dark ? "text-slate-400" : "text-gray-600")}>
        팀원 초대와 멤버 역할은 멤버 관리에서 다룹니다.
      </p>
      <Button type="button" size="sm" className="gap-1.5" onClick={onInviteMembers}>
        <UserPlus className="h-3.5 w-3.5" />
        멤버 초대
      </Button>
      <Button type="button" size="sm" variant="outline" className={btnOutline} onClick={onNavigateMemberManage}>
        <Users className="h-3.5 w-3.5" />
        멤버 관리
      </Button>
    </div>
  );

  const mediaTab = (
    <div className="space-y-3">
      <p className={cn("text-xs leading-relaxed", dark ? "text-slate-400" : "text-gray-600")}>
        사진·영상 업로드와 대표 이미지 설정은 미디어 탭에서 할 수 있어요.
      </p>
      <Button type="button" size="sm" variant="outline" className={btnOutline} onClick={onOpenMediaTab}>
        <ImageIcon className="h-3.5 w-3.5" />
        미디어 탭 열기
      </Button>
    </div>
  );

  const aiTab = (
    <div className="space-y-4">
      {canUseOwnerAiCopy ? (
        <div className="space-y-3">
          <p className={cn("text-[11px] font-medium", dark ? "text-slate-300" : "text-gray-700")}>
            공개 프로필 AI 카피
          </p>
          <p className={cn("text-[11px] leading-relaxed", dark ? "text-slate-400" : "text-gray-500")}>
            방문자에게는 공개된 문구만 보입니다.
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="gap-1.5 text-xs"
              disabled={brandingBusy || profileEditMode}
              onClick={onAiFillAll}
            >
              {brandingBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              전체 보완
            </Button>
            <Button type="button" size="sm" variant="outline" className={btnOutline} disabled={brandingBusy} onClick={onAiIntro}>
              팀 소개
            </Button>
            <Button type="button" size="sm" variant="outline" className={btnOutline} disabled={brandingBusy} onClick={onAiRecruit}>
              모집 문구
            </Button>
          </div>
        </div>
      ) : null}

      {showGrowthValidation ? (
        <div
          className={cn(
            "-mx-1 min-w-0 sm:mx-0",
            canUseOwnerAiCopy && "border-t pt-4",
            dark ? "border-slate-600/60" : "border-slate-200"
          )}
        >
          <TeamGrowthCoachShell teamId={teamId} teamName={teamName} className="mb-4" />
          <AIGrowthValidationConsole teamId={teamId} teamName={teamName} embedded />
        </div>
      ) : null}

      {showAiAnalysisLite ? (
        <div
          className={cn(
            (canUseOwnerAiCopy || showGrowthValidation) && "border-t pt-4",
            dark ? "border-slate-600/60" : "border-slate-200",
          )}
        >
          <p className={cn("text-[11px] font-medium", dark ? "text-slate-300" : "text-gray-700")}>
            ⚽ AI 분석 Lite (BETA)
          </p>
          <p className={cn("mt-1 text-[11px] leading-relaxed", dark ? "text-slate-400" : "text-gray-500")}>
            경기 영상을 분석하여 선수 성장 리포트를 생성합니다. (YouTube URL · 더미 리포트 MVP)
          </p>
          <Button
            type="button"
            size="sm"
            className="mt-3 gap-1.5 text-xs"
            asChild
            data-testid="team-owner-hub-ai-analysis-lite-open"
          >
            <Link to={teamAiAnalysisLitePath(teamId)}>AI 분석 시작</Link>
          </Button>
        </div>
      ) : null}

      {!canUseOwnerAiCopy && !showGrowthValidation && !showAiAnalysisLite ? (
        <p className="text-xs text-slate-500">이 탭에 사용할 수 있는 AI 도구가 없습니다.</p>
      ) : null}
    </div>
  );

  return { contentTab, membersTab, mediaTab, aiTab };
}
