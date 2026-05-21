/**
 * ?�� Team Public Page
 *
 * �\: /team/:teamId/public (?�p??`/teams/:teamId`???�???�� �??�t��?��?�	??
 *
 * ??��:
 * - ?� � ?�\?? * - ?� 0] p�
 * - ?� ?� �]
 * - ?� �0 ?�%
 * - ?� ?�� ?�%
 */

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { fetchTeamByIdOrSlug, fetchTeamByIdOrSlugFromServer } from "@/services/teamService";
import { getTeamSummary, getTeamMatchHistory, getTeamAwards } from "@/services/teamSummaryService";
import { getTeamMembers } from "@/services/teamPlayerService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Trophy,
  Users,
  Calendar,
  Award,
  TrendingUp,
  Image,
  Activity,
  Sparkles,
  Loader2,
  Pencil,
} from "lucide-react";
import TeamActivityFeed from "@/components/team/TeamActivityFeed";
import { TeamMediaTabPanel } from "@/components/team/TeamMediaTabPanel";
import { TeamAwardsTabPanel } from "@/components/team/TeamAwardsTabPanel";
import { resolveTeamHubPermissions } from "@/lib/team/resolveTeamHubPermissions";
import type { TeamSummary, TeamMatchHistory, TeamAward } from "@/types/teamSummary";
import { useAuth } from "@/context/AuthProvider";
import { useMyTeams } from "@/hooks/useMyTeams";
import {
  isActiveTeamMemberStatus,
  isUserMemberOfTeam,
  markTeamPlayEntryFromAppNav,
  teamPlayEntryPath,
} from "@/lib/team/teamPlayRoutes";
import { backfillMyTeamMemberships } from "@/lib/team/backfillMyTeamMemberships";
import { cn } from "@/lib/utils";
import { devLog, devError } from "@/lib/utils/dev";
import { callableErrorMessage } from "@/lib/errors/callableErrorMessage";
import { toast } from "sonner";
import {
  finalizeTeamBrandingCallable,
  type FinalizeTeamBrandingPayload,
} from "@/lib/team/finalizeTeamBrandingClient";
import { DEFAULT_TEAM_ONBOARDING } from "@/lib/team/teamBrandingConstants";
import type {
  TeamBrandStyleId,
  TeamOnboardMainActivityId,
  TeamOnboardRecruitId,
  TeamOnboardVibeId,
} from "@/lib/team/teamBrandingConstants";
import { track } from "@/lib/analytics";
import {
  getProfileDescription,
  getProfileHighlights,
  getRecruitMessage,
  getPublicCtaShort,
  getSlogan,
  getPlayStyle,
  getThemePreset,
  getAiSkipped,
  getBrandingSource,
  getBrandStyleId,
  getOnboarding,
  getPublicProfileDiffFlags,
  getGeneratedDescription,
  getGeneratedHighlights,
  getGeneratedRecruitMessage,
  getCaptainMessage,
  getGeneratedCaptainMessage,
  getTeamCaptainPublicView,
  getTeamCaptainManagementView,
  getTeamCoverPhotoUrl,
} from "@/lib/team/resolveTeamPublicProfile";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PublicProfileTextareaWithAi } from "@/components/team/PublicProfileTextareaWithAi";
import { updateTeamPublicCopyCallable } from "@/lib/team/updateTeamPublicCopyClient";
import { setTeamCaptainMessageCallable } from "@/lib/team/setTeamCaptainMessageClient";
import { revertTeamPublicFieldCallable } from "@/lib/team/revertTeamPublicFieldClient";
import { regenerateTeamPublicFieldCallable } from "@/lib/team/regenerateTeamPublicFieldClient";
import { buildTextDiffSegments, renderDiffHighlightedLine } from "@/lib/team/textDiffHighlight";
import { computeTeamProfileScore, suggestionsForField } from "@/lib/team/profileScore";
import { TeamProfileScoreCard } from "@/components/team/TeamProfileScoreCard";
import { TeamCaptainMessageCard } from "@/components/team/TeamCaptainMessageCard";
import { TeamCoverPhotoUploader } from "@/components/team/TeamCoverPhotoUploader";
import { TeamPublicStaffManageSection } from "@/components/team/TeamPublicStaffManageSection";
import { TeamPublicStaffShowcase } from "@/components/team/TeamPublicStaffShowcase";
import { TeamStaffDirectorySection } from "@/components/team/TeamStaffDirectorySection";
import { getVisibleTeamPublicStaff } from "@/lib/team/resolveTeamPublicStaff";
import { TeamHubMediaPreview } from "@/components/team/TeamHubMediaPreview";
import { TeamHubUpcomingSchedulePreview } from "@/components/team/TeamHubUpcomingSchedulePreview";
import { TeamHubMembersPreview } from "@/components/team/TeamHubMembersPreview";
import {
  TeamScheduledMatchesSection,
  type TeamScheduledMatchesSectionHandle,
} from "@/components/team/TeamScheduledMatchesSection";
import { TeamDashboardStats } from "@/components/team/TeamDashboardStats";
import { TeamOperatorCoachCard } from "@/components/team/TeamOperatorCoachCard";
import { TeamHubPrimaryActionStrip } from "@/components/team/TeamHubPrimaryActionStrip";
import { TeamOwnerManagementPanel } from "@/components/team/TeamOwnerManagementPanel";
import { buildOwnerHubPanelTabs } from "@/components/team/TeamOwnerHubPanelContent";
import { sharePublicTeamHubKakaoOrWebShare } from "@/services/kakaoShare";
import { sportHubHref } from "@/utils/sportHubHref";

type TabType = "overview" | "activity" | "matches" | "players" | "records" | "awards" | "media";

const MAIN_A = ["weekend", "weekday", "league", "casual"] as const;
const VIBE_A = ["fun", "balanced", "serious"] as const;
const REC_A = ["beginners", "experienced", "open"] as const;
const BRAND_A = ["social", "competitive", "tournament", "youth", "corporate"] as const;

/** Firestore D??t �?�� React ?�T?� throw ?��? ?�� */
function safeReactText(value: unknown, emptyFallback = ""): string {
  if (value == null) return emptyFallback;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return emptyFallback;
}

function foundedYearLabel(v: unknown): string | null {
  if (typeof v === "number" && Number.isFinite(v)) return String(Math.trunc(v));
  if (typeof v === "string" && v.trim()) return v.trim().slice(0, 32);
  return null;
}

function buildBrandingRegeneratePayload(team: unknown, resolvedTeamId: string): FinalizeTeamBrandingPayload | null {
  if (!team || typeof team !== "object") return null;
  const t = team as Record<string, unknown> & { aiProfile?: unknown };
  const ob = getOnboarding(t);
  const main = ob?.mainActivity;
  const vibe = ob?.vibe;
  const rec = ob?.recruitStyle;
  const bs = getBrandStyleId(t);

  const sportType =
    typeof t.sportType === "string" && t.sportType.trim()
      ? t.sportType.trim()
      : typeof t.primarySport === "string" && t.primarySport.trim()
        ? t.primarySport.trim()
        : typeof t.sport === "string" && t.sport.trim()
          ? t.sport.trim()
          : "soccer";

  return {
    teamId: resolvedTeamId,
    sportType,
    brandStyle:
      typeof bs === "string" && (BRAND_A as readonly string[]).includes(bs)
        ? (bs as TeamBrandStyleId)
        : DEFAULT_TEAM_ONBOARDING.brandStyle,
    mainActivity:
      typeof main === "string" && (MAIN_A as readonly string[]).includes(main)
        ? (main as TeamOnboardMainActivityId)
        : DEFAULT_TEAM_ONBOARDING.mainActivity,
    vibe:
      typeof vibe === "string" && (VIBE_A as readonly string[]).includes(vibe)
        ? (vibe as TeamOnboardVibeId)
        : DEFAULT_TEAM_ONBOARDING.vibe,
    recruitStyle:
      typeof rec === "string" && (REC_A as readonly string[]).includes(rec)
        ? (rec as TeamOnboardRecruitId)
        : DEFAULT_TEAM_ONBOARDING.recruitStyle,
    forceRegenerate: true,
  };
}

export default function TeamPage() {
  const navigate = useNavigate();
  const { teamId } = useParams<{ teamId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { teamMembers, loading: myTeamsLoading } = useMyTeams();

  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<any>(null);
  const [summary, setSummary] = useState<TeamSummary | null>(null);
  const [matchHistory, setMatchHistory] = useState<TeamMatchHistory[]>([]);
  const [awards, setAwards] = useState<TeamAward[]>([]);
  const [players, setPlayers] = useState<Array<{ id: string; name: string }>>([]);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [brandingBusy, setBrandingBusy] = useState(false);
  const [profileEditMode, setProfileEditMode] = useState(false);
  const [draftDescription, setDraftDescription] = useState("");
  const [draftHighlightsText, setDraftHighlightsText] = useState("");
  const [draftRecruitMessage, setDraftRecruitMessage] = useState("");
  const [captainMessageEditOpen, setCaptainMessageEditOpen] = useState(false);
  const [draftCaptainMessage, setDraftCaptainMessage] = useState("");
  const [captainMessageSaveBusy, setCaptainMessageSaveBusy] = useState(false);
  const [saveProfileBusy, setSaveProfileBusy] = useState(false);
  const [regenerateConfirmOpen, setRegenerateConfirmOpen] = useState(false);
  const [revertFieldBusy, setRevertFieldBusy] = useState<
    null | "description" | "highlights" | "recruitMessage" | "captainMessage"
  >(null);
  const [regenerateFieldBusy, setRegenerateFieldBusy] = useState<
    null | "description" | "highlights" | "recruitMessage" | "captainMessage"
  >(null);
  const [hubShareBusy, setHubShareBusy] = useState(false);
  const [ownerPanelOpen, setOwnerPanelOpen] = useState(false);
  /**  �?UI?� ?�| ?�t?�X � ] � )�? ??0� ?��?, ?�� ???��? */
  useEffect(() => {
    const tab = searchParams.get("tab");
    const focus = searchParams.get("focus");
    if (tab === "activity" || focus) setActiveTab("activity");
    else if (tab === "players") setActiveTab("players");
    else if (tab === "matches") setActiveTab("matches");
    else if (tab === "records") setActiveTab("records");
    else if (tab === "awards") setActiveTab("awards");
    else if (tab === "media") setActiveTab("media");
    else if (tab === "overview") setActiveTab("overview");
  }, [searchParams]);

  useEffect(() => {
    if (teamId) {
      loadData();
    }
  }, [teamId]);

  useEffect(() => {
    setProfileEditMode(false);
  }, [teamId]);


  /** ?��� (???��) ??p0 return�?4�??�� �??�T ?�|?�� İ */
  const effectiveTeamId =
    team && typeof team.id === "string" && team.id.trim()
      ? team.id.trim()
      : (teamId ?? "").trim();

  const hubPermissions = useMemo(
    () =>
      resolveTeamHubPermissions({
        uid: user?.uid,
        team,
        teamId: effectiveTeamId,
        teamMembers,
        myTeamsLoading,
      }),
    [user?.uid, team, effectiveTeamId, teamMembers, myTeamsLoading]
  );

  const isActiveMember = hubPermissions.isActiveMember;
  const isTeamOwner = hubPermissions.isTeamOwner;
  const canManageTeamHub = hubPermissions.canManage;
  const canUploadTeamMedia = hubPermissions.canUploadMedia;

  const playMemberOnlyHint = searchParams.get("hint") === "playMember";
  const firstTeamWelcome = searchParams.get("firstTeam") === "1";

  const profileHighlights = getProfileHighlights(team);
  const profileDescription = getProfileDescription(team);
  const recruitCta = getRecruitMessage(team);
  const profileCaptainMessage = getCaptainMessage(team);
  const publicCtaShort = getPublicCtaShort(team);
  const profileThemeDark = getThemePreset(team) === "dark";
  const heroSlogan = getSlogan(team);
  const heroPlayStyle = getPlayStyle(team);
  const profileDiffFlags = getPublicProfileDiffFlags(team);

  /** Storage rules�TeamContext?� ?�|: ownerUid ??ownerId/leaderId/owners[]�createdBy ?�p??*/

  /** ?�???�� ?�1 ?��?owner/admin) ??Storage canManageTeamPublicHubPhotos ?� ?�i */

  const canManageCaptainPhoto = canManageTeamHub;

  /** � ?��??�� ???�?���?��(Callable `assertTeamPublicPhotoManager`?� ?�|). ?�� ��?� 4�??�� ?��. */

  useEffect(() => {
    if (!user?.uid || !effectiveTeamId || myTeamsLoading) return;
    if (!isTeamOwner || isActiveMember) return;
    void backfillMyTeamMemberships().catch((err) => {
      devError("[TeamPage] backfillMyTeamMemberships", err);
    });
  }, [user?.uid, effectiveTeamId, isTeamOwner, isActiveMember, myTeamsLoading]);

  const showPublicStaffManage = Boolean(effectiveTeamId && team && canManageCaptainPhoto);

  /** ?�� `TeamHubPrimaryActionStrip`�??�| ??�� ??D�??��D?�� ???�� � �� ?��? */
  const hideLowerPublicHubJoinRowDup =
    Boolean(effectiveTeamId) && !profileEditMode && !isActiveMember;

  const scheduleSectionRef = useRef<TeamScheduledMatchesSectionHandle>(null);
  const ownerManagementRef = useRef<HTMLDivElement>(null);
  const staffManageRef = useRef<HTMLDivElement>(null);

  const scrollToOwnerManagement = useCallback(() => {
    ownerManagementRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const scrollToStaffManage = useCallback(() => {
    staffManageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const openMatchesTabAndSchedule = useCallback(() => {
    setActiveTab("matches");
    requestAnimationFrame(() => {
      scheduleSectionRef.current?.scrollSectionIntoView();
    });
  }, []);

  const openMatchesTabCreateSchedule = useCallback(() => {
    setActiveTab("matches");
    requestAnimationFrame(() => {
      scheduleSectionRef.current?.openCreateDialog();
    });
  }, []);

  const showOwnerProfileDiff =
    isTeamOwner &&
    !profileEditMode &&
    (profileDiffFlags.description ||
      profileDiffFlags.highlights ||
      profileDiffFlags.recruitMessage ||
      profileDiffFlags.captainMessage);

  const fieldDiffBusy = revertFieldBusy !== null || regenerateFieldBusy !== null;

  const onboardingForAi = team ? getOnboarding(team) : null;
  const selectionAiToneHint =
    onboardingForAi && typeof onboardingForAi.vibe === "string" ? onboardingForAi.vibe : undefined;

  const diffMarkAi = cn(
    "rounded-sm px-0.5 [box-decoration-break:clone]",
    profileThemeDark ? "bg-violet-500/40 text-violet-50" : "bg-violet-200/90 text-violet-950"
  );
  const diffMarkCurrent = cn(
    "rounded-sm px-0.5 [box-decoration-break:clone]",
    profileThemeDark ? "bg-amber-500/40 text-amber-50" : "bg-amber-200 text-amber-950"
  );

  const aiDescPlain = getGeneratedDescription(team) || "";
  const descDiff = useMemo(
    () => buildTextDiffSegments(aiDescPlain, profileDescription || ""),
    [aiDescPlain, profileDescription]
  );

  const aiRecruitPlain = getGeneratedRecruitMessage(team) || "";
  const recruitDiff = useMemo(
    () => buildTextDiffSegments(aiRecruitPlain, recruitCta || ""),
    [aiRecruitPlain, recruitCta]
  );

  const aiCaptainPlain = getGeneratedCaptainMessage(team) || "";
  const captainDiff = useMemo(
    () => buildTextDiffSegments(aiCaptainPlain, profileCaptainMessage || ""),
    [aiCaptainPlain, profileCaptainMessage]
  );

  const hlGenKey = getGeneratedHighlights(team).join("\u0001");
  const hlCurKey = profileHighlights.join("\u0001");
  const hlRowDiffs = useMemo(() => {
    const g = getGeneratedHighlights(team);
    const c = profileHighlights;
    const n = Math.max(g.length, c.length, 1);
    return Array.from({ length: n }, (_, i) => buildTextDiffSegments(g[i] ?? "", c[i] ?? ""));
  }, [team, hlGenKey, hlCurKey]);

  /** )8?? � ?�t???�D ?��. ?��? �?t��?D� ?�| ą???��? */
  const captainCardView = useMemo(() => {
    if (!team) return null;
    const pub = getTeamCaptainPublicView(team);
    if (pub) return pub;
    if (canManageCaptainPhoto) return getTeamCaptainManagementView(team);
    return null;
  }, [team, canManageCaptainPhoto]);

  const coverPhotoUrl = useMemo(() => (team ? getTeamCoverPhotoUrl(team) : null), [team]);

  const handlePublicHubKakaoInquiry = useCallback(async () => {
    if (!effectiveTeamId || !team) return;
    const name = (safeReactText(team.name).trim() || "팀") as string;
    const blurb = (heroSlogan || profileDescription || "").trim();
    const img =
      coverPhotoUrl ||
      (typeof team.logoUrl === "string" && team.logoUrl.trim() ? team.logoUrl.trim() : null);
    setHubShareBusy(true);
    try {
      const r = await sharePublicTeamHubKakaoOrWebShare({
        teamId: effectiveTeamId,
        teamName: name,
        blurb: blurb || null,
        imageUrl: img,
      });
      if (r.channel === "clipboard") {
        toast.success("링크를 복사했어요. 카카오톡·문자에 붙여 넣어 주세요.");
      } else if (r.channel === "kakao") {
        toast.success("카카오 공유 창을 열었어요.");
      } else if (r.channel === "web_share") {
        toast.success("공유 창을 열었어요.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "공유에 실패했어요.");
    } finally {
      setHubShareBusy(false);
    }
  }, [effectiveTeamId, team, heroSlogan, profileDescription, coverPhotoUrl]);

  const recentMatchCount21d = useMemo(() => {
    if (!matchHistory.length) return 0;
    const now = Date.now();
    const t21 = now - 21 * 24 * 60 * 60 * 1000;
    let n = 0;
    for (const m of matchHistory) {
      const md = m.matchDate as { toMillis?: () => number } | undefined;
      const ms = md && typeof md.toMillis === "function" ? md.toMillis() : NaN;
      if (Number.isFinite(ms) && ms >= t21) n += 1;
    }
    return n;
  }, [matchHistory]);

  const sportForProfileScore = useMemo(() => {
    if (!team) return "";
    return typeof team.sportType === "string" && team.sportType.trim()
      ? team.sportType.trim()
      : typeof team.primarySport === "string" && team.primarySport.trim()
        ? team.primarySport.trim()
        : typeof team.sport === "string" && team.sport.trim()
          ? team.sport.trim()
          : "";
  }, [team]);

  const browseTeamsPath = useMemo(
    () => sportHubHref("team", sportForProfileScore || undefined),
    [sportForProfileScore]
  );

  const profileScoreResult = useMemo(() => {
    if (!team || !profileEditMode) return null;
    return computeTeamProfileScore({
      teamName: String(team.name ?? "").trim(),
      region: String(team.region ?? team.baseRegion ?? "").trim(),
      sportType: sportForProfileScore,
      intro: draftDescription,
      oneLinesText: draftHighlightsText,
      joinMessage: draftRecruitMessage,
      onboarding: getOnboarding(team),
      captainMessage: profileCaptainMessage,
    });
  }, [
    team,
    profileEditMode,
    sportForProfileScore,
    draftDescription,
    draftHighlightsText,
    draftRecruitMessage,
    profileCaptainMessage,
  ]);

  /** ?� ?��? ?���?���0?�\ �??????�?� t< 0�? ?�1???�� ��?� ?�| ?��) */
  const ownerPublicScoreResult = useMemo(() => {
    if (!team || !isTeamOwner || profileEditMode) return null;
    return computeTeamProfileScore({
      teamName: String(team.name ?? "").trim(),
      region: String(team.region ?? team.baseRegion ?? "").trim(),
      sportType: sportForProfileScore,
      intro: profileDescription,
      oneLinesText: profileHighlights.join("\n"),
      joinMessage: recruitCta,
      onboarding: getOnboarding(team),
      captainMessage: profileCaptainMessage,
    });
  }, [
    team,
    isTeamOwner,
    profileEditMode,
    sportForProfileScore,
    profileDescription,
    profileHighlights,
    recruitCta,
    profileCaptainMessage,
  ]);

  const ownerSetupChecklist = useMemo(() => {
    const introOk = profileDescription.trim().length >= 40;
    const lines = profileHighlights.map((l) => l.trim()).filter(Boolean);
    const oneLineOk = lines.length >= 2 || (lines.length === 1 && lines[0].length >= 12);
    const joinOk = recruitCta.trim().length >= 16;
    return { introOk, oneLineOk, joinOk };
  }, [profileDescription, profileHighlights, recruitCta]);

  const loadData = async () => {
    if (!teamId) return;

    try {
      setLoading(true);
      setTeam(null);

      // ?�� teamId  ?� 8 ID  ?�� ???�<��??�  ID/?���??���??� ?��
      const resolvedTeam = await fetchTeamByIdOrSlug(teamId);
      const resolvedId = resolvedTeam?.id || teamId;

      const [teamData, summaryData, matchHistoryData, awardsData, playersData] = await Promise.all([
        Promise.resolve(resolvedTeam),
        getTeamSummary(resolvedId),
        getTeamMatchHistory(resolvedId, { limit: 10 }),
        getTeamAwards(resolvedId),
        getTeamMembers(resolvedId).catch(() => []),
      ]);

      setTeam(teamData);
      setSummary(summaryData);
      setMatchHistory(matchHistoryData);
      setAwards(awardsData);
      setPlayers(
        playersData.map((p) => ({
          id: p.id,
          name: p.name,
        }))
      );
    } catch (error) {
      console.error("?�t??\� ?�(:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshTeamSnapshot = async () => {
    if (!effectiveTeamId) return;
    try {
      const resolved = await fetchTeamByIdOrSlugFromServer(effectiveTeamId);
      if (resolved) setTeam(resolved);
    } catch (e) {
      console.error("[TeamPage] ?� ?�� ?�\�h ?�(:", e);
    }
  };

  const openProfileEdit = () => {
    if (!team) return;
    setDraftDescription(getProfileDescription(team));
    setDraftHighlightsText(getProfileHighlights(team).join("\n"));
    setDraftRecruitMessage(getRecruitMessage(team));
    setProfileEditMode(true);
    setOwnerPanelOpen(true);
  };

  const openCaptainMessageDirectEdit = () => {
    if (!team) return;
    setDraftCaptainMessage(getCaptainMessage(team));
    setCaptainMessageEditOpen(true);
    setOwnerPanelOpen(true);
  };

  const saveCaptainMessageDirect = async () => {
    if (!effectiveTeamId || captainMessageSaveBusy) return;
    setCaptainMessageSaveBusy(true);
    const t = toast.loading("저장하는 중…");
    const payload = { teamId: effectiveTeamId, captainMessage: draftCaptainMessage };
    devLog("[captainMessage] saving", { teamId: payload.teamId, len: payload.captainMessage.length });
    try {
      await setTeamCaptainMessageCallable(payload);
      devLog("[captainMessage] save success");
      await refreshTeamSnapshot();
      toast.dismiss(t);
      toast.success("대표 인사말을 저장했어요.");
      setCaptainMessageEditOpen(false);
    } catch (e: unknown) {
      devError("[captainMessage] save failed", e);
      toast.dismiss(t);
      toast.error(callableErrorMessage(e) || "저장에 실패했어요. 다시 시도해 주세요.");
    } finally {
      setCaptainMessageSaveBusy(false);
    }
  };

  const cancelProfileEdit = () => {
    setProfileEditMode(false);
  };

  const savePublicProfile = async () => {
    if (!isTeamOwner || !canManageTeamHub || !effectiveTeamId || saveProfileBusy) return;
    const lines = draftHighlightsText
      .split(/\r?\n/)
      .map((l) => l.trim().replace(/^[-??]\s*/, ""))
      .filter(Boolean);
    const desc = draftDescription.trim();
    const rec = draftRecruitMessage.trim();
    if (!desc && lines.length === 0 && !rec) {
      toast.error("한 가지 이상 입력해 주세요.");
      return;
    }
    setSaveProfileBusy(true);
    const t = toast.loading("저장하는 중…");
    try {
      await updateTeamPublicCopyCallable({
        teamId: effectiveTeamId,
        description: desc,
        homeHighlights: lines,
        recruitMessage: rec,
      });
      await refreshTeamSnapshot();
      toast.dismiss(t);
      toast.success("공개 프로필을 저장했어요.");
      setProfileEditMode(false);
      void track("team_public_profile_saved", { team_id: effectiveTeamId });
    } catch (e: unknown) {
      toast.dismiss(t);
      const code = e && typeof e === "object" && "code" in e ? String((e as { code?: string }).code) : "";
      const detail = callableErrorMessage(e);
      const shortDetail = detail.length > 220 ? `${detail.slice(0, 220)}…` : detail;
      if (code === "functions/permission-denied") {
        toast.error("팀 소유자만 수정할 수 있어요.");
      } else if (code === "functions/invalid-argument") {
        toast.error(shortDetail || "입력 내용을 확인해 주세요.");
      } else {
        toast.error(shortDetail || "저장에 실패했어요. 다시 시도해 주세요.");
      }
      console.error("[TeamPage] save public profile", e);
    } finally {
      setSaveProfileBusy(false);
    }
  };

  const handleRegeneratePublicField = async (
    field: "description" | "highlights" | "recruitMessage" | "captainMessage"
  ) => {
    const canCaptainMessageAi =
      field === "captainMessage" && Boolean(canManageCaptainPhoto && effectiveTeamId);
    const canOwnerOnlyFields =
      field !== "captainMessage" && Boolean(isTeamOwner && effectiveTeamId && canManageTeamHub);
    if (fieldDiffBusy) return;
    if (!canCaptainMessageAi && !canOwnerOnlyFields) {
      if (field !== "captainMessage" && canManageTeamHub && !isTeamOwner) {
        toast.error("팀 소유자 계정으로 로그인해야 AI로 소개·모집 문구를 재생성할 수 있어요.");
      }
      return;
    }
    setRegenerateFieldBusy(field);
    const t = toast.loading("AI로 문구를 다시 생성하는 중…");
    try {
      const out = await regenerateTeamPublicFieldCallable({ teamId: effectiveTeamId, field });
      await refreshTeamSnapshot();
      toast.dismiss(t);
      toast.success(out.source === "openai" ? "AI로 문구를 갱신했어요." : "기본 템플릿으로 문구를 채웠어요.");
      void track("team_public_field_ai_regenerated", {
        team_id: effectiveTeamId,
        field,
        source: out.source ?? "unknown",
      });
    } catch (e: unknown) {
      toast.dismiss(t);
      const code = e && typeof e === "object" && "code" in e ? String((e as { code?: string }).code) : "";
      const detail = callableErrorMessage(e);
      if (code === "functions/permission-denied") {
        toast.error(
          field === "captainMessage"
            ? "대표 인사말은 운영 권한이 있는 분만 AI 재생성할 수 있어요."
            : "팀 소유자만 AI 재생성을 할 수 있어요."
        );
      } else if (code === "functions/invalid-argument") {
        toast.error(detail.length > 0 ? detail : "요청 내용을 확인해 주세요.");
      } else {
        const shown = detail.length > 200 ? `${detail.slice(0, 200)}…` : detail;
        toast.error(shown);
      }
      console.error("[TeamPage] regenerate field", e);
    } finally {
      setRegenerateFieldBusy(null);
    }
  };

  const handleRevertPublicField = async (
    field: "description" | "highlights" | "recruitMessage" | "captainMessage"
  ) => {
    if (!isTeamOwner || !effectiveTeamId || fieldDiffBusy) return;
    setRevertFieldBusy(field);
    try {
      const out = await revertTeamPublicFieldCallable({ teamId: effectiveTeamId, field });
      await refreshTeamSnapshot();
      if (out.skipped) {
        toast.info("되돌릴 AI 초안이 없어요.");
      } else {
        toast.success("AI 초안으로 되돌렸어요.");
      }
      void track("team_public_field_reverted", { team_id: effectiveTeamId, field });
    } catch (e: unknown) {
      const code = e && typeof e === "object" && "code" in e ? String((e as { code?: string }).code) : "";
      if (code === "functions/permission-denied") {
        toast.error("팀 소유자만 되돌릴 수 있어요.");
      } else {
        toast.error("되돌리기에 실패했어요. 다시 시도해 주세요.");
      }
      console.error("[TeamPage] revert field", e);
    } finally {
      setRevertFieldBusy(null);
    }
  };

  const runRegenerateAiBranding = async () => {
    if (!isTeamOwner || !team || brandingBusy) return;
    const payload = buildBrandingRegeneratePayload(team, effectiveTeamId);
    if (!payload?.teamId) {
      toast.error("팀 정보가 없어 재생성할 수 없어요.");
      return;
    }
    setBrandingBusy(true);
    const t = toast.loading("AI로 공개 프로필을 다시 생성하는 중…");
    try {
      const out = await finalizeTeamBrandingCallable(payload);
      await refreshTeamSnapshot();
      toast.dismiss(t);
      toast.success(
        out.source === "openai"
          ? "AI로 공개 프로필을 갱신했어요."
          : "기본 템플릿으로 프로필을 채웠어요. 필요하면 직접 수정해 주세요."
      );
      void track("ai_regenerated", {
        team_id: effectiveTeamId,
        source: out.source ?? "unknown",
      });
    } catch (e: unknown) {
      toast.dismiss(t);
      const code = e && typeof e === "object" && "code" in e ? String((e as { code?: string }).code) : "";
      if (code === "functions/permission-denied") {
        toast.error("팀 소유자만 AI 재생성을 할 수 있어요.");
      } else {
        toast.error("프로필 재생성에 실패했어요. 잠시 후 다시 시도해 주세요.");
      }
      console.error("[TeamPage] regenerate branding", e);
    } finally {
      setBrandingBusy(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "-";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">팀을 찾을 수 없어요.</p>
          <Button onClick={() => navigate(-1)}>돌아가기</Button>
        </div>
      </div>
    );
  }

  const teamNameForUi = (() => {
    const n = safeReactText(team.name).trim();
    return n || "팀";
  })();
  const teamRegionForUi = safeReactText(team.region ?? team.baseRegion).trim();
  const foundedYearForUi = foundedYearLabel(team.foundedYear);
  const ownerPanelTabs =
    canManageTeamHub && effectiveTeamId && team
      ? buildOwnerHubPanelTabs({
          dark: profileThemeDark,
          teamId: effectiveTeamId,
          team,
          coverUrl: coverPhotoUrl,
          onCoverUpdated: refreshTeamSnapshot,
          isActiveMember,
          recentMatchCount21d,
          teamName: teamNameForUi,
          onOpenScheduleCreate: openMatchesTabCreateSchedule,
          showStaffManage: showPublicStaffManage,
          onStaffUpdated: refreshTeamSnapshot,
          staffManageRef,
          onInviteMembers: () => navigate(`/teams/${encodeURIComponent(effectiveTeamId)}/invite`),
          onOpenMediaTab: () => setActiveTab("media"),
          onOpenProfileEdit: openProfileEdit,
          profileEditMode,
          saveProfileBusy,
          profileScoreResult: profileEditMode ? profileScoreResult : null,
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
          onSaveCaptainMessage: () => void saveCaptainMessageDirect(),
          canUseOwnerAiCopy: isTeamOwner,
          brandingBusy,
          fieldDiffBusy,
          onAiFillAll: () => setRegenerateConfirmOpen(true),
          onAiIntro: () => void handleRegeneratePublicField("description"),
          onAiRecruit: () => void handleRegeneratePublicField("recruitMessage"),
          onAiCaptain: () => void handleRegeneratePublicField("captainMessage"),
          onNavigateMemberManage: () => navigate(`/team/${encodeURIComponent(effectiveTeamId)}/overview`),
          canManageCaptainPhoto,
        })
      : null;


  return (
    <div className="w-full space-y-6">
        {playMemberOnlyHint ? (
          <div
            className="mb-6 overflow-hidden rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/90 p-5 text-sm text-amber-950 shadow-md dark:border-amber-800/60 dark:from-amber-950/50 dark:to-orange-950/30 dark:text-amber-50"
            role="status"
          >
            <p className="text-base font-black tracking-tight">
              <span className="mr-1.5" aria-hidden>
                ⚽
              </span>
              이 팀의 플레이·경기 기록은 팀원만 이용할 수 있어요
            </p>
            <p className="mt-2 font-semibold text-amber-900 dark:text-amber-100/95">팀에 가입하면 함께 쓸 수 있어요</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-amber-900/95 dark:text-amber-100/90">
              <li>경기 기록·전적 확인</li>
              <li>MVP·활동 데이터</li>
              <li>팀 일정 참석·알림</li>
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                size="default"
                className="bg-amber-600 font-bold text-white shadow hover:bg-amber-700"
                onClick={() => navigate(`/join?teamId=${encodeURIComponent(effectiveTeamId)}`)}
              >
                팀 가입하기
              </Button>
              <Button
                size="default"
                variant="outline"
                className="border-amber-400/80 bg-white/90 font-medium text-amber-950 hover:bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-50 dark:hover:bg-amber-900/40"
                onClick={() => {
                  const next = new URLSearchParams(searchParams);
                  next.delete("hint");
                  setSearchParams(next, { replace: true });
                }}
              >
                닫기
              </Button>
            </div>
          </div>
        ) : null}
        {firstTeamWelcome ? (
          <div
            className="mb-6 overflow-hidden rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50/90 p-4 text-sm text-emerald-950 shadow-sm dark:border-emerald-800/60 dark:from-emerald-950/40 dark:to-teal-950/30 dark:text-emerald-50"
            role="status"
          >
            <p className="text-base font-bold">
              {!team.aiProfile
                ? "축하해요! 팀이 만들어졌어요. 공개 프로필을 확인해 보세요."
                : getAiSkipped(team)
                  ? "축하해요! 팀이 만들어졌어요. 소개를 직접 채워 보세요."
                  : "축하해요! AI로 팀 페이지 초안을 채웠어요. 마음에 들면 그대로, 아니면 바로 수정해 보세요."}
            </p>
            {getAiSkipped(team) ? (
              <p className="mt-2 text-sm font-medium text-emerald-900/90 dark:text-emerald-100/90">
                AI 건너뛰기로 만들었어요. 아래에서 직접 수정할 수 있어요.
              </p>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 border-emerald-300 bg-white/90 text-emerald-900 hover:bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-50"
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.delete("firstTeam");
                next.delete("onboarding");
                next.delete("linkAccount");
                setSearchParams(next, { replace: true });
              }}
            >
              확인
            </Button>
          </div>
        ) : null}
        {/* ?� � ?�\?????�| ??�� (� Card ?�| ?�p) */}
        <section
          className={cn(
            "w-full space-y-4 sm:space-y-5",
            profileThemeDark &&
              "rounded-2xl border border-slate-600 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 p-4 text-slate-100 shadow-lg sm:p-5"
          )}
        >
            <div className="w-full space-y-4 sm:space-y-5">
              {team.logoUrl && !coverPhotoUrl ? (
                <img
                  src={team.logoUrl}
                  alt={teamNameForUi}
                  className="h-24 w-24 shrink-0 self-center rounded-xl object-cover shadow-md sm:self-start"
                />
              ) : null}
                {/* 1) Hero ??� ?��?� ?�� �|?�t??*/}
                <div
                  className={cn(
                    "relative min-h-[200px] overflow-hidden rounded-xl shadow-md sm:min-h-[260px] md:min-h-[300px]",
                    !coverPhotoUrl &&
                      (profileThemeDark
                        ? "bg-gradient-to-r from-violet-800 via-indigo-900 to-slate-900"
                        : "bg-gradient-to-r from-indigo-500 to-violet-600")
                  )}
                >
                  {coverPhotoUrl ? (
                    <>
                      <img
                        src={coverPhotoUrl}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover [filter:none]"
                        loading="eager"
                        decoding="async"
                      />
                      <div
                        className="absolute inset-0 bg-gradient-to-t from-black/[0.18] via-black/[0.22] to-black/[0.28]"
                        aria-hidden
                      />
                    </>
                  ) : null}
                  {getBrandingSource(team) === "openai" && !getAiSkipped(team) ? (
                    <div
                      className="absolute right-3 top-3 z-20 flex items-center gap-1 rounded-md bg-black/45 px-2 py-1 text-[11px] font-semibold text-white shadow-sm"
                      title="AI로 생성된 소개·모집 문구가 적용되어 있어요"
                    >
                      <Sparkles className="h-3 w-3 shrink-0 opacity-95" aria-hidden />
                      AI 생성
                    </div>
                  ) : team.aiProfile && !getAiSkipped(team) ? (
                    <div className="absolute right-3 top-3 z-20 rounded-md bg-black/40 px-2 py-1 text-[11px] font-medium text-white shadow-sm">
                      브랜딩 적용
                    </div>
                  ) : null}
                  <div className="relative z-10 flex min-h-[200px] flex-col justify-end p-5 sm:min-h-[260px] md:min-h-[300px] sm:p-6">
                  <h1 className="text-2xl font-bold tracking-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] sm:text-3xl">{teamNameForUi}</h1>
                  {heroSlogan ? (
                    <p className="mt-2 text-base font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] sm:text-lg">{heroSlogan}</p>
                  ) : null}
                  {heroPlayStyle ? (
                    <p className="mt-2 text-xs font-medium uppercase tracking-wide text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.75)]">
                      {heroPlayStyle}
                    </p>
                  ) : null}
                  </div>
                </div>


                {/* T�? */}
                <div
                  className={cn(
                    "flex flex-wrap items-center gap-4 text-sm",
                    profileThemeDark ? "text-slate-300" : "text-gray-600"
                  )}
                >
                  {teamRegionForUi ? (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 shrink-0 opacity-80" />
                      {teamRegionForUi}
                    </div>
                  ) : null}
                  {foundedYearForUi ? <div>창단 {foundedYearForUi}</div> : null}
                </div>

                {effectiveTeamId ? (
                  <div className="mb-4">
                    <TeamDashboardStats
                      teamId={effectiveTeamId}
                      isActiveMember={isActiveMember}
                      showStaffMetrics={canManageCaptainPhoto}
                      dark={profileThemeDark}
                    />
                  </div>
                ) : null}

                {profileDescription ? (
                  <section>
                    <h2
                      className={cn(
                        "text-sm font-semibold tracking-tight",
                        profileThemeDark ? "text-slate-200" : "text-gray-800"
                      )}
                    >
                      팀 소개
                    </h2>
                    <p
                      className={cn(
                        "mt-2 whitespace-pre-line text-sm leading-relaxed sm:text-base",
                        profileThemeDark ? "text-slate-200" : "text-gray-600"
                      )}
                    >
                      {profileDescription}
                    </p>
                  </section>
                ) : null}

                {profileHighlights.length > 0 ? (
                  <section>
                    <h2
                      className={cn(
                        "text-sm font-semibold tracking-tight",
                        profileThemeDark ? "text-slate-200" : "text-gray-800"
                      )}
                    >
                      이런 분께 추천
                    </h2>
                    <ul className="mt-2 space-y-2">
                      {profileHighlights.map((line, i) => (
                        <li
                          key={`${i}-${line.slice(0, 24)}`}
                          className={cn(
                            "flex gap-2 text-sm leading-snug sm:text-base",
                            profileThemeDark ? "text-slate-200" : "text-gray-600"
                          )}
                        >
                          <span className="shrink-0 text-emerald-500 dark:text-emerald-400" aria-hidden>
                            •
                          </span>
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {captainCardView ? (
                  <TeamCaptainMessageCard
                    view={captainCardView}
                    dark={profileThemeDark}
                  />
                ) : null}

                {team ? (
                  <div className="mt-5 sm:mt-6">
                    <TeamPublicStaffShowcase staff={getVisibleTeamPublicStaff(team)} dark={profileThemeDark} />
                  </div>
                ) : null}
                {effectiveTeamId ? (
                  <div className="mt-4 sm:mt-5">
                    <TeamStaffDirectorySection teamId={effectiveTeamId} dark={profileThemeDark} />
                  </div>
                ) : null}

                  {effectiveTeamId ? (
                    <div className="mt-4 space-y-4 sm:mt-5">
                      <TeamHubMediaPreview
                        teamId={effectiveTeamId}
                        dark={profileThemeDark}
                        onViewAll={() => setActiveTab("media")}
                      />
                      <TeamHubUpcomingSchedulePreview
                        teamId={effectiveTeamId}
                        isActiveMember={isActiveMember}
                        canManage={canManageCaptainPhoto}
                        dark={profileThemeDark}
                        onViewAll={openMatchesTabAndSchedule}
                        onCreateSchedule={openMatchesTabCreateSchedule}
                      />
                    </div>
                  ) : null}

                {effectiveTeamId ? (
                  <div className="mt-4 space-y-3 sm:mt-5">
                    {!isActiveMember && recruitCta && !profileEditMode ? (
                      <div
                        className={cn(
                          "rounded-lg border px-4 py-3 text-sm leading-relaxed sm:text-base",
                          profileThemeDark
                            ? "border-slate-600/80 bg-slate-800/50 text-slate-100"
                            : "border-slate-200 bg-slate-50 text-slate-800"
                        )}
                      >
                        {recruitCta}
                      </div>
                    ) : null}
                    <TeamHubPrimaryActionStrip
                      teamId={effectiveTeamId}
                      dark={profileThemeDark}
                      user={user?.uid ? { uid: user.uid } : null}
                      hubCtaReady={!user?.uid || !myTeamsLoading}
                      isActiveMember={isActiveMember}
                      browseTeamsPath={browseTeamsPath}
                      onViewMatchesSchedule={openMatchesTabAndSchedule}
                      hubShareBusy={hubShareBusy}
                      onKakaoInquiry={handlePublicHubKakaoInquiry}
                    />
                    {canManageTeamHub && effectiveTeamId && ownerPanelTabs ? (
                      <div ref={ownerManagementRef} className="scroll-mt-4">
                        <TeamOwnerManagementPanel
                          dark={profileThemeDark}
                          open={ownerPanelOpen}
                          onOpenChange={setOwnerPanelOpen}
                          score={ownerPublicScoreResult?.score ?? null}
                          setupChecklist={ownerSetupChecklist}
                          profileEditMode={profileEditMode}
                          saveProfileBusy={saveProfileBusy}
                          onCancelProfileEdit={cancelProfileEdit}
                          onSaveProfile={() => void savePublicProfile()}
                          canUseOwnerAiCopy={isTeamOwner}
                          contentTab={ownerPanelTabs.contentTab}
                          membersTab={ownerPanelTabs.membersTab}
                          mediaTab={ownerPanelTabs.mediaTab}
                          aiTab={ownerPanelTabs.aiTab}
                        />
                      </div>
                    ) : null}
                  </div>
                ) : null}
            </div>
        </section>

        {/* Tabs — 경기·활동·미디어 등 상세 */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as TabType)}
          className="mt-5 w-full space-y-5 border-t border-slate-200/80 pt-5 dark:border-slate-700/80 sm:mt-6 sm:pt-6"
        >
          <TabsList>
            <TabsTrigger value="overview">개요</TabsTrigger>
            <TabsTrigger value="activity" className="gap-1">
              <Activity className="h-3.5 w-3.5" />
              활동
            </TabsTrigger>
            <TabsTrigger value="matches">경기</TabsTrigger>
            <TabsTrigger value="players">선수</TabsTrigger>
            <TabsTrigger value="records">기록</TabsTrigger>
            <TabsTrigger value="awards">수상</TabsTrigger>
            <TabsTrigger value="media">미디어</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {summary ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="mb-1 text-sm font-medium text-gray-500">경기</div>
                    <div className="text-2xl font-bold text-gray-900">{summary.matches}</div>
                    <div className="mt-1 text-xs text-gray-500">
                      {summary.wins}승 {summary.draws}무 {summary.losses}패
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="mb-1 text-sm font-medium text-gray-500">득점</div>
                    <div className="text-2xl font-bold text-gray-900">{summary.goalsFor}</div>
                    <div className="mt-1 text-xs text-gray-500">
                      실점 {summary.goalsAgainst} · 득실차 {summary.goalDifference > 0 ? "+" : ""}
                      {summary.goalDifference}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="mb-1 text-sm font-medium text-gray-500">우승</div>
                    <div className="text-2xl font-bold text-yellow-600">{summary.championships}</div>
                    <div className="mt-1 text-xs text-gray-500">
                      준우승 {summary.runnerUps} · 4강 {summary.semifinals}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="mb-1 text-sm font-medium text-gray-500">클린시트</div>
                    <div className="text-2xl font-bold text-blue-600">{summary.cleanSheets}</div>
                    <div className="mt-1 text-xs text-gray-500">무실점</div>
                  </CardContent>
                </Card>
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-5 w-5 text-slate-600" />
                  팀 활동
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TeamActivityFeed
                  teamId={team.id}
                  sport={
                    (team.sportType || team.sportKey || team.sport || "soccer") as string
                  }
                  focusActivityId={searchParams.get("focus") || undefined}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Matches Tab */}
          <TabsContent value="matches" className="space-y-6">
            {effectiveTeamId ? (
              <TeamScheduledMatchesSection
                ref={scheduleSectionRef}
                teamId={effectiveTeamId}
                isActiveMember={isActiveMember}
                canCreateSchedule={canManageCaptainPhoto}
                userId={user?.uid ?? null}
                dark={profileThemeDark}
              />
            ) : null}
            <Card>
              <CardHeader>
                <CardTitle>경기 기록</CardTitle>
              </CardHeader>
              <CardContent>
                {matchHistory.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">등록된 경기 기록이 없습니다.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            날짜
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            상대팀
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                            스코어
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                            결과
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            대회/라운드
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {matchHistory.map((match) => (
                          <tr key={match.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(match.matchDate)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {safeReactText(match.opponentTeamName, "").trim() ||
                                safeReactText(match.opponentTeamId, "") ||
                                "상대 미정"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-gray-900">
                              {match.isHome
                                ? `${match.scored} - ${match.conceded}`
                                : `${match.conceded} - ${match.scored}`}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  match.result === "win"
                                    ? "bg-green-100 text-green-800"
                                    : match.result === "loss"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {match.result === "win" ? "승" : match.result === "loss" ? "패" : "무"}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {match.stageLabel || match.roundCode || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Members tab */}
          <TabsContent value="players" className="space-y-4">
            {effectiveTeamId && players.length > 0 ? (
              <TeamHubMembersPreview
                members={players.map((p) => ({
                  id: p.id,
                  name: p.name,
                  photoURL: p.photoURL,
                }))}
                dark={profileThemeDark}
                hideViewAll
                title="함께하는 멤버"
              />
            ) : null}
            <Card>
              <CardHeader>
                <CardTitle>등록 멤버</CardTitle>
              </CardHeader>
              <CardContent>
                {players.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">등록된 멤버가 없습니다.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-14">
                            &nbsp;
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            이름
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {players.map((player) => (
                          <tr key={player.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              {player.photoURL ? (
                                <img
                                  src={player.photoURL}
                                  alt=""
                                  className="h-9 w-9 rounded-full object-cover ring-2 ring-white shadow"
                                />
                              ) : (
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-800 ring-2 ring-white shadow">
                                  {safeReactText(player.name, "이").slice(0, 1)}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                              {safeReactText(player.name, "이름 없음").trim() || "이름 없음"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Records Tab */}
          <TabsContent value="records">
            <Card>
              <CardHeader>
                <CardTitle>기록</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 text-center py-8">
                  기록 데이터는 준비 중입니다. (Cloud Function 연동 예정)
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Awards Tab */}
          <TabsContent value="awards">
            <Card>
              <CardHeader>
                <CardTitle>수상</CardTitle>
              </CardHeader>
                            <CardContent>
                <TeamAwardsTabPanel
                  teamId={effectiveTeamId}
                  awards={awards}
                  canManage={canManageTeamHub}
                  formatDate={formatDate}
                  onChanged={() => {
                    void getTeamAwards(effectiveTeamId).then(setAwards);
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Media Tab */}
          <TabsContent value="media">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="w-5 h-5" />
                  미디어 갤러리
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TeamMediaTabPanel
                  teamId={effectiveTeamId}
                  canUpload={canUploadTeamMedia}
                  canManage={canManageTeamHub}
                  userId={user?.uid ?? null}
                  dark={profileThemeDark}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {!canManageTeamHub ? (
        <Card className="mt-8 border-blue-100 bg-blue-50/60">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">이 팀에 가입하고 싶으신가요?</h2>
              <p className="mt-1 text-sm text-gray-600">
                팀 활동과 일정을 함께하려면 가입 요청을 보내 주세요.
              </p>
            </div>
            <Button
              className="shrink-0 bg-blue-600 hover:bg-blue-700"
              onClick={() => navigate(`/join?teamId=${encodeURIComponent(effectiveTeamId)}`)}
            >
              가입하기
            </Button>
          </CardContent>
        </Card>
        ) : null}

      <Dialog open={regenerateConfirmOpen} onOpenChange={setRegenerateConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>AI로 프로필을 다시 생성할까요?</DialogTitle>
            <DialogDescription className="text-left text-gray-600">
              기존 소개·추천·참여 문구가 AI 초안으로 다시 채워집니다. 저장된 직접 수정 내용은 일부 덮어쓸 수 있어요.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRegenerateConfirmOpen(false)}>
              취소
            </Button>
            <Button
              type="button"
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={brandingBusy}
              onClick={() => {
                setRegenerateConfirmOpen(false);
                void runRegenerateAiBranding();
              }}
            >
              재생성
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
