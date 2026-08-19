import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Loader2, Pencil, Sparkles, UserPlus, Image as ImageIcon, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { TeamOperatorCoachCard } from "@/components/team/TeamOperatorCoachCard";
import { TeamPublicStaffManageSection } from "@/components/team/TeamPublicStaffManageSection";
import { TeamClubIntroManageSection } from "@/components/team/TeamClubIntroManageSection";
import { PublicProfileTextareaWithAi } from "@/components/team/PublicProfileTextareaWithAi";
import { TeamProfileScoreCard } from "@/components/team/TeamProfileScoreCard";
import { TeamPublicCompletenessCard } from "@/components/team/TeamPublicCompletenessCard";
import type { TeamProfileScoreResult } from "@/lib/team/profileScore";
import type { PublicHomeCompletenessResult } from "@/lib/team/publicHomeCompleteness";
import type { TeamPublicLayoutPreset } from "@/lib/team/resolveTeamPublicProfile";
import { getLayoutPreset } from "@/lib/team/resolveTeamPublicProfile";
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
  /** Sprint 2-1 — checklist completeness (owner always) */
  publicHomeCompleteness?: PublicHomeCompletenessResult | null;
  layoutPreset?: TeamPublicLayoutPreset;
  layoutPresetBusy?: boolean;
  onLayoutPresetChange?: (preset: TeamPublicLayoutPreset) => void;
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
  captainMessageAiMeta?: {
    generatedAt: string;
    source: "openai" | "template";
    factsFingerprint: string;
    humanEditedAt?: string;
  } | null;
  captainMessageFactsStale?: boolean;
  onCaptainMessageDraftChange?: (v: string) => void;
  canUseOwnerAiCopy: boolean;
  brandingBusy: boolean;
  fieldDiffBusy: boolean;
  onAiFillAll: () => void;
  onAiIntro: () => void;
  onAiRecruit: () => void;
  onAiCaptain: () => void;
  onAiSocialPost: () => void;
  onAiEventMessage: () => void;
  onNavigateMemberManage: () => void;
  canManageCaptainPhoto: boolean;
  socialPostEditOpen: boolean;
  setSocialPostEditOpen: (v: boolean) => void;
  draftSocialPost: string;
  setDraftSocialPost: (v: string) => void;
  socialPostSaveBusy: boolean;
  onSaveSocialPost: () => void;
  eventMessageEditOpen: boolean;
  setEventMessageEditOpen: (v: boolean) => void;
  draftEventMessage: string;
  setDraftEventMessage: (v: string) => void;
  eventMessageSaveBusy: boolean;
  onSaveEventMessage: () => void;
  draftEventName: string;
  setDraftEventName: (v: string) => void;
  draftEventPurpose: string;
  setDraftEventPurpose: (v: string) => void;
  draftEventSchedule: string;
  setDraftEventSchedule: (v: string) => void;
  draftEventPlace: string;
  setDraftEventPlace: (v: string) => void;
  /** Priority 1-1 VOC — AI 초안 직후 슬롯 */
  captainVocSlot?: ReactNode;
  recruitVocSlot?: ReactNode;
  socialVocSlot?: ReactNode;
  eventVocSlot?: ReactNode;
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
    publicHomeCompleteness = null,
    layoutPreset,
    layoutPresetBusy = false,
    onLayoutPresetChange,
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
    captainMessageAiMeta = null,
    captainMessageFactsStale = false,
    onCaptainMessageDraftChange,
    canUseOwnerAiCopy,
    brandingBusy,
    fieldDiffBusy,
    onAiFillAll,
    onAiIntro,
    onAiRecruit,
    onAiCaptain,
    onAiSocialPost,
    onAiEventMessage,
    onNavigateMemberManage,
    canManageCaptainPhoto,
    socialPostEditOpen,
    setSocialPostEditOpen,
    draftSocialPost,
    setDraftSocialPost,
    socialPostSaveBusy,
    onSaveSocialPost,
    eventMessageEditOpen,
    setEventMessageEditOpen,
    draftEventMessage,
    setDraftEventMessage,
    eventMessageSaveBusy,
    onSaveEventMessage,
    draftEventName,
    setDraftEventName,
    draftEventPurpose,
    setDraftEventPurpose,
    draftEventSchedule,
    setDraftEventSchedule,
    draftEventPlace,
    setDraftEventPlace,
    captainVocSlot,
    recruitVocSlot,
    socialVocSlot,
    eventVocSlot,
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

  const activeLayout: TeamPublicLayoutPreset =
    layoutPreset ?? (team ? getLayoutPreset(team) : "classic");

  const contentTab = (
    <div className="space-y-5">
      <p className={cn("text-[11px] leading-relaxed", dark ? "text-slate-400" : "text-gray-500")}>
        대표 이미지는 페이지 상단 Hero에서 변경·삭제할 수 있어요.
      </p>

      {publicHomeCompleteness ? (
        <TeamPublicCompletenessCard result={publicHomeCompleteness} dark={dark} />
      ) : null}

      {onLayoutPresetChange ? (
        <section
          className={cn(
            "rounded-xl border p-3",
            dark ? "border-slate-600/80 bg-slate-800/30" : "border-gray-200 bg-gray-50/80"
          )}
        >
          <h3 className={cn("text-sm font-semibold", dark ? "text-slate-100" : "text-gray-900")}>
            레이아웃 프리셋
          </h3>
          <p className={cn("mt-0.5 text-[11px]", dark ? "text-slate-400" : "text-gray-500")}>
            홈페이지 빌더가 아니라 고정 레이아웃 2종입니다.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(
              [
                { id: "classic" as const, label: "Classic" },
                { id: "modern" as const, label: "Modern" },
              ] as const
            ).map((opt) => (
              <Button
                key={opt.id}
                type="button"
                size="sm"
                variant={activeLayout === opt.id ? "default" : "outline"}
                className={btnOutline}
                disabled={layoutPresetBusy}
                onClick={() => onLayoutPresetChange(opt.id)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </section>
      ) : null}

      {/* 대표 소개 */}
      <div className="space-y-3">
        <h3 className={cn("text-sm font-semibold", dark ? "text-slate-100" : "text-gray-900")}>대표 소개</h3>
        {!profileEditMode ? (
          <Button type="button" size="sm" variant="outline" className={btnOutline} onClick={onOpenProfileEdit}>
            <Pencil className="h-3.5 w-3.5" />
            소개·모집 문구 수정
          </Button>
        ) : null}
        {profileEditMode ? (
          <>
            <p className={cn("text-[11px] font-medium", dark ? "text-slate-400" : "text-gray-500")}>문구 품질</p>
            {profileScoreResult ? <TeamProfileScoreCard result={profileScoreResult} dark={dark} /> : null}
            <section>
              <h4 className={cn("text-xs font-semibold", dark ? "text-slate-200" : "text-gray-800")}>팀 소개</h4>
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
              <h4 className={cn("text-xs font-semibold", dark ? "text-slate-200" : "text-gray-800")}>이런 분께 추천</h4>
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
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className={cn("text-xs font-semibold", dark ? "text-slate-200" : "text-gray-800")}>
                  회원 모집 글
                </h4>
                {canUseOwnerAiCopy ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className={cn("h-7 gap-1 text-xs", dark ? "border-slate-600" : "")}
                    disabled={fieldDiffBusy || saveProfileBusy || brandingBusy}
                    onClick={onAiRecruit}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    AI 모집 글 생성
                  </Button>
                ) : null}
              </div>
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
              <p className={cn("mt-1 text-[11px] leading-relaxed", dark ? "text-slate-500" : "text-gray-500")}>
                AI 초안은 편집창에만 채워집니다. 저장을 눌러야 공개됩니다.
              </p>
              {recruitVocSlot}
            </section>
            {ownerDiffBlock}
          </>
        ) : null}
        {canManageCaptainPhoto ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" className={btnOutline} disabled={fieldDiffBusy} onClick={onAiCaptain}>
              <Sparkles className="h-3.5 w-3.5" />
              AI 회장 인사말
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={btnOutline}
              onClick={() => setCaptainMessageEditOpen(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
              대표 인사 수정
            </Button>
          </div>
        ) : null}
        {canManageCaptainPhoto && captainMessageEditOpen ? (
          <div className="space-y-2">
            <Textarea
              value={draftCaptainMessage}
              onChange={(e) =>
                onCaptainMessageDraftChange
                  ? onCaptainMessageDraftChange(e.target.value)
                  : setDraftCaptainMessage(e.target.value)
              }
              disabled={captainMessageSaveBusy}
              maxLength={1200}
              rows={6}
              className={cn("text-sm", dark ? "border-slate-600 bg-slate-950/60 text-slate-100" : "")}
            />
            {captainMessageAiMeta?.generatedAt ? (
              <p className={cn("text-[11px]", dark ? "text-slate-500" : "text-gray-500")}>
                AI 초안 생성{" "}
                {new Date(captainMessageAiMeta.generatedAt).toLocaleString("ko-KR", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {captainMessageAiMeta.humanEditedAt
                  ? ` · 마지막 수정(관리자) ${new Date(captainMessageAiMeta.humanEditedAt).toLocaleString("ko-KR", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`
                  : " · 마지막 수정 관리자 편집 없음"}
              </p>
            ) : null}
            {captainMessageFactsStale ? (
              <div
                className={cn(
                  "flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs",
                  dark
                    ? "border-amber-700/50 bg-amber-950/30 text-amber-100"
                    : "border-amber-200 bg-amber-50 text-amber-950"
                )}
                role="status"
              >
                <span>팀 정보가 변경되었습니다. AI 인사말을 다시 생성하시겠습니까?</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  disabled={fieldDiffBusy || captainMessageSaveBusy}
                  onClick={onAiCaptain}
                >
                  다시 생성
                </Button>
              </div>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => setCaptainMessageEditOpen(false)}>
                닫기
              </Button>
              <Button type="button" size="sm" disabled={captainMessageSaveBusy} onClick={onSaveCaptainMessage}>
                {captainMessageSaveBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                저장
              </Button>
            </div>
            {captainVocSlot}
          </div>
        ) : null}

        {/* Phase 4 — SNS 홍보문 */}
        {canManageCaptainPhoto ? (
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={btnOutline}
              disabled={fieldDiffBusy || socialPostSaveBusy}
              onClick={onAiSocialPost}
            >
              <Sparkles className="h-3.5 w-3.5" />
              AI SNS 생성
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={btnOutline}
              onClick={() => setSocialPostEditOpen(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
              SNS 홍보문 수정
            </Button>
          </div>
        ) : null}
        {canManageCaptainPhoto && socialPostEditOpen ? (
          <div className="space-y-2">
            <h4 className={cn("text-xs font-semibold", dark ? "text-slate-200" : "text-gray-800")}>SNS 홍보문</h4>
            <Textarea
              value={draftSocialPost}
              onChange={(e) => setDraftSocialPost(e.target.value)}
              disabled={socialPostSaveBusy}
              maxLength={500}
              rows={6}
              className={cn("text-sm", dark ? "border-slate-600 bg-slate-950/60 text-slate-100" : "")}
            />
            <p className={cn("text-[11px] leading-relaxed", dark ? "text-slate-500" : "text-gray-500")}>
              AI 초안은 편집창에만 채워집니다. 저장을 눌러야 공개·복사에 반영됩니다.
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => setSocialPostEditOpen(false)}>
                닫기
              </Button>
              <Button type="button" size="sm" disabled={socialPostSaveBusy} onClick={onSaveSocialPost}>
                {socialPostSaveBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                저장
              </Button>
            </div>
            {socialVocSlot}
          </div>
        ) : null}

        {/* Phase 5 — 행사 소개 멘트 */}
        {canManageCaptainPhoto ? (
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={btnOutline}
              disabled={fieldDiffBusy || eventMessageSaveBusy}
              onClick={onAiEventMessage}
            >
              <Sparkles className="h-3.5 w-3.5" />
              AI 행사 멘트 생성
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={btnOutline}
              onClick={() => setEventMessageEditOpen(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
              행사 멘트 수정
            </Button>
          </div>
        ) : null}
        {canManageCaptainPhoto && eventMessageEditOpen ? (
          <div className="space-y-2">
            <h4 className={cn("text-xs font-semibold", dark ? "text-slate-200" : "text-gray-800")}>
              행사 소개 멘트
            </h4>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                value={draftEventName}
                onChange={(e) => setDraftEventName(e.target.value)}
                placeholder="행사명 (선택)"
                maxLength={80}
                disabled={eventMessageSaveBusy}
                className={cn("text-sm", dark ? "border-slate-600 bg-slate-950/60 text-slate-100" : "")}
              />
              <Input
                value={draftEventSchedule}
                onChange={(e) => setDraftEventSchedule(e.target.value)}
                placeholder="일정 (선택)"
                maxLength={120}
                disabled={eventMessageSaveBusy}
                className={cn("text-sm", dark ? "border-slate-600 bg-slate-950/60 text-slate-100" : "")}
              />
              <Input
                value={draftEventPlace}
                onChange={(e) => setDraftEventPlace(e.target.value)}
                placeholder="장소 (선택)"
                maxLength={120}
                disabled={eventMessageSaveBusy}
                className={cn("text-sm", dark ? "border-slate-600 bg-slate-950/60 text-slate-100" : "")}
              />
              <Input
                value={draftEventPurpose}
                onChange={(e) => setDraftEventPurpose(e.target.value)}
                placeholder="행사 목적 (선택)"
                maxLength={200}
                disabled={eventMessageSaveBusy}
                className={cn("text-sm", dark ? "border-slate-600 bg-slate-950/60 text-slate-100" : "")}
              />
            </div>
            <Textarea
              value={draftEventMessage}
              onChange={(e) => setDraftEventMessage(e.target.value)}
              disabled={eventMessageSaveBusy}
              maxLength={400}
              rows={5}
              className={cn("text-sm", dark ? "border-slate-600 bg-slate-950/60 text-slate-100" : "")}
            />
            <p className={cn("text-[11px] leading-relaxed", dark ? "text-slate-500" : "text-gray-500")}>
              행사명·일정·장소는 입력된 경우에만 AI가 사용합니다. 초안은 저장 전까지 공개되지 않습니다.
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => setEventMessageEditOpen(false)}>
                닫기
              </Button>
              <Button type="button" size="sm" disabled={eventMessageSaveBusy} onClick={onSaveEventMessage}>
                {eventMessageSaveBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                저장
              </Button>
            </div>
            {eventVocSlot}
          </div>
        ) : null}
      </div>

      {/* CMS — 단위축구회 소개 (입장식 구조화, DRAFT 기본) */}
      {showStaffManage && team ? (
        <div className="scroll-mt-4 space-y-2">
          <TeamClubIntroManageSection
            teamId={teamId}
            teamName={teamName}
            team={team}
            dark={dark}
            onUpdated={onStaffUpdated}
          />
        </div>
      ) : null}

      {/* CMS only — 공개 페이지「운영진 소개」와 분리 (접어도 공개 섹션은 유지) */}
      {showStaffManage && team ? (
        <div ref={staffManageRef} id="team-hub-staff-manage" className="scroll-mt-4 space-y-2">
          <h3 className={cn("text-sm font-semibold", dark ? "text-slate-100" : "text-gray-900")}>운영진 관리</h3>
          <p className={cn("text-[11px] leading-relaxed", dark ? "text-slate-400" : "text-gray-500")}>
            여기서 추가·수정한 내용은 위 공개 페이지 「운영진 소개」에 바로 반영됩니다. 회장은 회장 인사말에서만
            소개됩니다.
          </p>
          <TeamPublicStaffManageSection teamId={teamId} team={team} dark={dark} onUpdated={onStaffUpdated} />
        </div>
      ) : null}

      {/* ⑤ 운영 도구 (후순위) */}
      <div className="space-y-2 border-t pt-4 dark:border-slate-600/60">
        <h3 className={cn("text-sm font-semibold", dark ? "text-slate-100" : "text-gray-900")}>운영 도구</h3>
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
        갤러리 사진·영상은 미디어 탭에서 관리합니다. 상단 대표 이미지(Hero)는 Hero 위 버튼으로 변경하세요.
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
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={btnOutline}
              disabled={brandingBusy || fieldDiffBusy}
              onClick={onAiRecruit}
            >
              <Sparkles className="h-3.5 w-3.5" />
              AI 모집 글 생성
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={btnOutline}
              disabled={brandingBusy || fieldDiffBusy}
              onClick={onAiSocialPost}
            >
              <Sparkles className="h-3.5 w-3.5" />
              AI SNS 생성
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={btnOutline}
              disabled={brandingBusy || fieldDiffBusy}
              onClick={onAiEventMessage}
            >
              <Sparkles className="h-3.5 w-3.5" />
              AI 행사 멘트
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
