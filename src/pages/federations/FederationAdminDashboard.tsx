import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  getFederationAiDailyStats,
  runAggregateFederationAiStatsDaily,
  seoulYesterdayClient,
  type FederationAiDailyStatsDoc,
} from "@/services/federationService";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthProvider";
import { createFederationInviteLink, type FederationInviteRole } from "@/services/inviteService";
import { initKakao } from "@/lib/kakaoAuth";
import { shareFederationInviteViaKakao } from "@/services/kakaoShare";
import FederationInviteManager from "@/components/federation/FederationInviteManager";
import FederationMemberList from "@/components/federation/FederationMemberList";
import FederationTeamFeeDashboard from "@/components/federation/fees/FederationTeamFeeDashboard";
import FederationCompetitionDashboard from "@/components/federation/fees/FederationCompetitionDashboard";
import FederationAccountingDashboard from "@/components/federation/accounting/FederationAccountingDashboard";

type FederationDoc = {
  id?: string;
  name?: string;
  slug?: string;
  branding?: {
    name?: string;
    logoUrl?: string;
    primaryColor?: string;
  };
  draft?: any;
  live?: any;
  [k: string]: any;
};

type LeagueItem = {
  id: string;
  name: string;
  status: "진행중" | "종료";
  mode: "league" | "tournament";
  publishStatus: "draft" | "published";
};
type LeagueDetailTab = "team" | "match" | "rank";
type DivisionItem = {
  id: string;
  tournamentId: string;
  name: string;
  sortOrder: number;
  status: "draft" | "published";
};
type TeamItem = {
  id: string;
  name: string;
  leagueId?: string;
  tournamentId?: string;
  divisionId?: string | null;
  applicationId?: string;
  createdFrom?: string;
  status?: string;
  submittedRoster?: boolean;
  rosterStatus?: "draft" | "submitted" | "verified" | "returned";
};

const TEAM_ROSTER_STATUS_LABEL: Record<NonNullable<TeamItem["rosterStatus"]>, string> = {
  draft: "작성중",
  submitted: "제출됨",
  verified: "승인됨",
  returned: "반려됨",
};
type MatchItem = {
  id: string;
  leagueId: string;
  source?: "legacy" | "leagueScoped";
  stage?: "semi" | "final";
  divisionId?: string;
  group?: string;
  status?: "scheduled" | "live" | "completed";
  homeTeamId?: string;
  awayTeamId?: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  round?: string;
  roundOrder?: number;
  nextMatchId?: string | null;
  nextSlot?: "home" | "away" | null;
  winner?: string | null;
  scheduledAt?: string | null;
};
type TeamStanding = {
  teamName: string;
  played: number;
  win: number;
  draw: number;
  lose: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
};
type ReviewPlayer = {
  id: string;
  name: string;
  number: number | null;
};
type LeagueParticipant = {
  teamId: string;
  teamName: string;
};
const LEAGUE_TYPE_OPTIONS: Array<{ value: "league" | "tournament"; label: string }> = [
  { value: "league", label: "리그" },
  { value: "tournament", label: "토너먼트" },
];
type VenueItem = {
  id: string;
  name: string;
  address?: string;
  fieldType?: string;
  status?: "active" | "inactive";
};
type MatchScheduleDraft = {
  matchDate: string;
  matchTime: string;
  venueId: string;
  refereeName: string;
};
type FederationNotificationType =
  | "match_start"
  | "goal"
  | "match_end"
  | "application_approved";

const ADMIN_TABS = [
  { id: "dashboard", label: "대시보드" },
  { id: "league", label: "리그 관리" },
  { id: "applications", label: "신청 관리" },
  { id: "team", label: "팀 관리" },
  { id: "members", label: "회원 관리" },
  { id: "finance", label: "회계" },
  { id: "settings", label: "설정" },
] as const;
type AdminTabId = (typeof ADMIN_TABS)[number]["id"];

const PLACEMENT_SHORT: Record<string, string> = {
  intro_section: "intro",
  activity_section: "activity",
  general_post: "general",
  market_post: "market",
  hero_banner: "hero",
  unknown: "?",
};

function formatPlacementDistribution(map: Record<string, number> | undefined): string {
  if (!map || Object.keys(map).length === 0) return "—";
  return Object.entries(map)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `${PLACEMENT_SHORT[k] ?? k} ${n}`)
    .join(" · ");
}

function calculateStandings(matches: MatchItem[], teams: TeamItem[]): TeamStanding[] {
  const table: Record<string, TeamStanding> = {};

  for (const team of teams) {
    table[team.name] = {
      teamName: team.name,
      played: 0,
      win: 0,
      draw: 0,
      lose: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDiff: 0,
      points: 0,
    };
  }

  for (const match of matches) {
    if (match.homeScore === null || match.awayScore === null) continue;
    if (!table[match.homeTeam] || !table[match.awayTeam]) continue;

    const home = table[match.homeTeam];
    const away = table[match.awayTeam];

    home.played += 1;
    away.played += 1;

    home.goalsFor += match.homeScore;
    home.goalsAgainst += match.awayScore;
    away.goalsFor += match.awayScore;
    away.goalsAgainst += match.homeScore;

    if (match.homeScore > match.awayScore) {
      home.win += 1;
      home.points += 3;
      away.lose += 1;
    } else if (match.homeScore < match.awayScore) {
      away.win += 1;
      away.points += 3;
      home.lose += 1;
    } else {
      home.draw += 1;
      away.draw += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  const standings = Object.values(table).map((row) => ({
    ...row,
    goalDiff: row.goalsFor - row.goalsAgainst,
  }));

  standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
    return b.goalsFor - a.goalsFor;
  });

  return standings;
}

function getRoundLabel(matchCount: number): string {
  if (matchCount === 1) return "결승";
  if (matchCount === 2) return "4강";
  if (matchCount === 4) return "8강";
  if (matchCount === 8) return "16강";
  return `${matchCount * 2}강`;
}

function shuffleParticipants<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function createGroups(participants: LeagueParticipant[], groupCount: number) {
  const shuffled = shuffleParticipants(participants);
  const buckets: LeagueParticipant[][] = Array.from({ length: groupCount }, () => []);
  shuffled.forEach((team, idx) => {
    buckets[idx % groupCount].push(team);
  });
  return buckets;
}

function createRoundRobinMatches(teamIds: string[]) {
  const matches: Array<{ homeTeamId: string; awayTeamId: string }> = [];
  for (let i = 0; i < teamIds.length; i += 1) {
    for (let j = i + 1; j < teamIds.length; j += 1) {
      matches.push({
        homeTeamId: teamIds[i],
        awayTeamId: teamIds[j],
      });
    }
  }
  return matches;
}
async function createFederationNotification(params: {
  federationSlug: string;
  type: FederationNotificationType;
  title: string;
  message: string;
  targetTeamId?: string;
  targetUserId?: string;
}) {
  await addDoc(collection(db, "federations", params.federationSlug, "notifications"), {
    type: params.type,
    title: params.title,
    message: params.message,
    targetTeamId: params.targetTeamId || null,
    targetUserId: params.targetUserId || null,
    read: false,
    createdAt: serverTimestamp(),
  });
}

function calculateTableFromCompletedMatches(
  participants: LeagueParticipant[],
  matches: MatchItem[]
): Array<{ teamId: string; teamName: string; points: number; goalDiff: number; goalsFor: number }> {
  const table: Record<string, { teamId: string; teamName: string; points: number; goalDiff: number; goalsFor: number; goalsAgainst: number }> = {};
  participants.forEach((p) => {
    table[p.teamId] = {
      teamId: p.teamId,
      teamName: p.teamName,
      points: 0,
      goalDiff: 0,
      goalsFor: 0,
      goalsAgainst: 0,
    };
  });

  matches.forEach((m) => {
    if (m.status !== "completed") return;
    if (m.homeScore === null || m.awayScore === null) return;
    const homeId = m.homeTeamId || "";
    const awayId = m.awayTeamId || "";
    if (!homeId || !awayId) return;
    if (!table[homeId] || !table[awayId]) return;

    const home = table[homeId];
    const away = table[awayId];
    home.goalsFor += m.homeScore;
    home.goalsAgainst += m.awayScore;
    away.goalsFor += m.awayScore;
    away.goalsAgainst += m.homeScore;

    if (m.homeScore > m.awayScore) {
      home.points += 3;
    } else if (m.homeScore < m.awayScore) {
      away.points += 3;
    } else {
      home.points += 1;
      away.points += 1;
    }
  });

  return Object.values(table)
    .map((r) => ({ ...r, goalDiff: r.goalsFor - r.goalsAgainst }))
    .sort((a, b) => b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor);
}

export default function FederationAdminDashboard() {
  const { federationSlug } = useParams<{ federationSlug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [federation, setFederation] = useState<FederationDoc | null>(null);
  const [savingBranding, setSavingBranding] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [canPublish, setCanPublish] = useState(false);
  const [inviteRole, setInviteRole] = useState<FederationInviteRole>("admin");
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [sharingKakao, setSharingKakao] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [aiStatsDate, setAiStatsDate] = useState(() => seoulYesterdayClient());
  const [aiStats, setAiStats] = useState<FederationAiDailyStatsDoc | null>(null);
  const [aiStatsLoading, setAiStatsLoading] = useState(false);
  const [aiStatsRefreshing, setAiStatsRefreshing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [leagues, setLeagues] = useState<LeagueItem[]>([]);
  const [divisionsByTournament, setDivisionsByTournament] = useState<Record<string, DivisionItem[]>>({});
  const [teamsByLeague, setTeamsByLeague] = useState<Record<string, TeamItem[]>>({});
  const [matchesByLeague, setMatchesByLeague] = useState<Record<string, MatchItem[]>>({});
  const [leagueScopedMatches, setLeagueScopedMatches] = useState<MatchItem[]>([]);
  const [reviewPlayersByTeam, setReviewPlayersByTeam] = useState<Record<string, ReviewPlayer[]>>({});
  const [leagueDetailTab, setLeagueDetailTab] = useState<LeagueDetailTab>("team");
  const [applications, setApplications] = useState<any[]>([]);
  const [applicationsFilter, setApplicationsFilter] = useState<"all" | "pending" | "approved" | "rejected" | "hold">("pending");
  const [teamStatusFilter, setTeamStatusFilter] = useState<"all" | "submitted" | "approved" | "rejected">("all");
  const [newLeagueType, setNewLeagueType] = useState<"league" | "tournament">("tournament");
  const [venues, setVenues] = useState<VenueItem[]>([]);
  const [scheduleDrafts, setScheduleDrafts] = useState<Record<string, MatchScheduleDraft>>({});
  const [branding, setBranding] = useState({
    name: "",
    logoUrl: "",
    primaryColor: "#0F3D75",
  });
  const leagueIdParam = searchParams.get("leagueId");

  // 퍼블릭 URL 계산은 currentLeagueId/DivisionId 선언 이후로 이동 (아래에서 재정의)

  const aiPlacementAccuracyPct = useMemo(() => {
    if (!aiStats || aiStats.placementEvaluated <= 0) return null;
    return Math.round((100 * aiStats.correctPlacement) / aiStats.placementEvaluated);
  }, [aiStats]);

  const aiEditAmongAppliedPct = useMemo(() => {
    if (!aiStats || aiStats.contentAppliedCount <= 0) return null;
    return Math.round((100 * aiStats.userEditedAmongApplied) / aiStats.contentAppliedCount);
  }, [aiStats]);

  const aiTopToneLabel = useMemo(() => {
    if (!aiStats) return null;
    const { toneCount } = aiStats;
    const ranked = (
      Object.entries(toneCount) as [keyof typeof toneCount, number][]
    ).sort((a, b) => b[1] - a[1]);
    const [key, n] = ranked[0] || ["unknown", 0];
    if (!n) return null;
    const labels: Record<string, string> = {
      official: "공식·신뢰형 (official)",
      community: "친근·커뮤니티형 (community)",
      marketing: "홍보·활기형 (marketing)",
      unknown: "미분류",
    };
    return labels[key] || key;
  }, [aiStats]);

  const loadFederation = async () => {
    if (!federationSlug) return;
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, "federations", federationSlug));
      if (snap.exists()) {
        const data = { id: snap.id, ...(snap.data() as FederationDoc) };
        const ownerUid = data?.ownerUid || data?.ownerId;
        const adminIds = Array.isArray(data?.adminIds) ? data.adminIds : [];
        const roleAdmins = Array.isArray(data?.roles?.admins) ? data.roles.admins : [];
        const roleEditors = Array.isArray(data?.roles?.editors) ? data.roles.editors : [];
        const uid = user?.uid || "";
        const isOwner = !!uid && ownerUid === uid;
        const isAdmin = !!uid && (adminIds.includes(uid) || roleAdmins.includes(uid));
        const isEditor = !!uid && roleEditors.includes(uid);
        const isManager =
          !!uid && (isOwner || isAdmin || isEditor);
        if (!isManager) {
          setForbidden(true);
          setFederation(data);
          return;
        }
        setCanPublish(isOwner || isAdmin);
        setForbidden(false);
        setFederation(data);
        setBranding({
          name: data?.draft?.branding?.name || data?.branding?.name || data?.name || "",
          logoUrl: data?.draft?.branding?.logoUrl || data?.branding?.logoUrl || "",
          primaryColor: data?.draft?.branding?.primaryColor || data?.branding?.primaryColor || "#0F3D75",
        });
      } else {
        setFederation(null);
      }
    } catch (e) {
      console.error(e);
      toast.error("협회 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadFederation();
  }, [federationSlug, user?.uid]);

  useEffect(() => {
    void initKakao();
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 768px)");
    const apply = () => setIsMobile(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  // 리그/팀/경기 실시간 로딩 (영속화)
  useEffect(() => {
    if (!federationSlug || forbidden) return;

    const leaguesRef = collection(db, "federations", federationSlug, "leagues");
    const divisionsRef = collection(db, "federations", federationSlug, "divisions");
    const teamsRef = collection(db, "federations", federationSlug, "teams");
    const matchesRef = collection(db, "federations", federationSlug, "matches");

    const unsubLeagues = onSnapshot(leaguesRef, (snap) => {
      const nextLeagues: LeagueItem[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          name: String(data?.name || "이름 없는 리그"),
          status: data?.status === "종료" ? "종료" : "진행중",
          mode: data?.mode === "tournament" ? "tournament" : "league",
          publishStatus:
            data?.publishStatus === "published" || data?.published === true
              ? "published"
              : "draft",
        };
      });
      setLeagues(nextLeagues);
    });

    const unsubDivisions = onSnapshot(divisionsRef, (snap) => {
      const grouped: Record<string, DivisionItem[]> = {};
      for (const d of snap.docs) {
        const data = d.data() as any;
        const tournamentId = String(data?.tournamentId || "");
        if (!tournamentId) continue;
        if (!grouped[tournamentId]) grouped[tournamentId] = [];
        grouped[tournamentId].push({
          id: d.id,
          tournamentId,
          name: String(data?.name || "부문"),
          sortOrder: typeof data?.sortOrder === "number" ? data.sortOrder : 999,
          status: data?.status === "published" ? "published" : "draft",
        });
      }
      Object.keys(grouped).forEach((k) => {
        grouped[k].sort((a, b) => a.sortOrder - b.sortOrder);
      });
      setDivisionsByTournament(grouped);
    });

    const unsubTeams = onSnapshot(teamsRef, (snap) => {
      const grouped: Record<string, TeamItem[]> = {};
      for (const d of snap.docs) {
        const data = d.data() as any;
        const leagueId = String(data?.leagueId || "");
        if (!leagueId) continue;
        if (!grouped[leagueId]) grouped[leagueId] = [];
        grouped[leagueId].push({
          id: d.id,
          name: String(data?.name || "이름 없는 팀"),
          leagueId,
          tournamentId: typeof data?.tournamentId === "string" ? data.tournamentId : undefined,
          divisionId: typeof data?.divisionId === "string" ? data.divisionId : null,
          applicationId: typeof data?.applicationId === "string" ? data.applicationId : undefined,
          createdFrom: typeof data?.createdFrom === "string" ? data.createdFrom : undefined,
          status: typeof data?.status === "string" ? data.status : undefined,
          submittedRoster: typeof data?.submittedRoster === "boolean" ? data.submittedRoster : undefined,
          rosterStatus:
            data?.rosterStatus === "submitted" ||
            data?.rosterStatus === "verified" ||
            data?.rosterStatus === "returned" ||
            data?.rosterStatus === "draft"
              ? data.rosterStatus
              : undefined,
        });
      }
      setTeamsByLeague(grouped);
    });

    const unsubMatches = onSnapshot(matchesRef, (snap) => {
      const grouped: Record<string, MatchItem[]> = {};
      for (const d of snap.docs) {
        const data = d.data() as any;
        const leagueId = String(data?.leagueId || "");
        if (!leagueId) continue;
        if (!grouped[leagueId]) grouped[leagueId] = [];
        grouped[leagueId].push({
          id: d.id,
          leagueId,
          divisionId: typeof data?.divisionId === "string" ? data.divisionId : undefined,
          homeTeam: String(data?.homeTeam || ""),
          awayTeam: String(data?.awayTeam || ""),
          homeScore: typeof data?.homeScore === "number" ? data.homeScore : null,
          awayScore: typeof data?.awayScore === "number" ? data.awayScore : null,
          round: typeof data?.round === "string" ? data.round : undefined,
          roundOrder: typeof data?.roundOrder === "number" ? data.roundOrder : undefined,
          stage: data?.stage === "semi" || data?.stage === "final" ? data.stage : undefined,
          nextMatchId: typeof data?.nextMatchId === "string" ? data.nextMatchId : null,
          nextSlot: data?.nextSlot === "home" || data?.nextSlot === "away" ? data.nextSlot : null,
          winner: typeof data?.winner === "string" ? data.winner : null,
          scheduledAt: typeof data?.scheduledAt === "string" ? data.scheduledAt : null,
        });
      }
      setMatchesByLeague(grouped);
    });

    return () => {
      unsubLeagues();
      unsubDivisions();
      unsubTeams();
      unsubMatches();
    };
  }, [federationSlug, forbidden]);

  useEffect(() => {
    if (!federationSlug || forbidden) {
      setVenues([]);
      return;
    }
    const venuesRef = collection(db, "federations", federationSlug, "venues");
    const unsub = onSnapshot(venuesRef, (snap) => {
      const rows: VenueItem[] = snap.docs.map((d) => {
        const x = d.data() as any;
        return {
          id: d.id,
          name: String(x?.name || ""),
          address: typeof x?.address === "string" ? x.address : "",
          fieldType: typeof x?.fieldType === "string" ? x.fieldType : "",
          status: x?.status === "inactive" ? "inactive" : "active",
        };
      });
      setVenues(rows);
    });
    return () => unsub();
  }, [federationSlug, forbidden]);

  // 리그 하위 matches 실시간 구독 (조별리그 자동 생성 데이터 경로)
  useEffect(() => {
    if (!federationSlug || !leagueIdParam) {
      setLeagueScopedMatches([]);
      return;
    }
    const scopedRef = collection(db, "federations", federationSlug, "leagues", leagueIdParam, "matches");
    const unsub = onSnapshot(scopedRef, (snap) => {
      const rows: MatchItem[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          leagueId: leagueIdParam,
          source: "leagueScoped",
          divisionId: typeof data?.divisionId === "string" ? data.divisionId : undefined,
          group: typeof data?.group === "string" ? data.group : undefined,
          status:
            data?.status === "completed"
              ? "completed"
              : data?.status === "live"
              ? "live"
              : "scheduled",
          homeTeamId: typeof data?.homeTeamId === "string" ? data.homeTeamId : undefined,
          awayTeamId: typeof data?.awayTeamId === "string" ? data.awayTeamId : undefined,
          homeTeam: String(data?.homeTeam || ""),
          awayTeam: String(data?.awayTeam || ""),
          homeScore: typeof data?.homeScore === "number" ? data.homeScore : null,
          awayScore: typeof data?.awayScore === "number" ? data.awayScore : null,
          round: typeof data?.round === "string" ? data.round : undefined,
          roundOrder: typeof data?.roundOrder === "number" ? data.roundOrder : undefined,
          nextMatchId: typeof data?.nextMatchId === "string" ? data.nextMatchId : null,
          nextSlot: data?.nextSlot === "home" || data?.nextSlot === "away" ? data.nextSlot : null,
          winner: typeof data?.winner === "string" ? data.winner : null,
          scheduledAt: typeof data?.scheduledAt === "string" ? data.scheduledAt : null,
        };
      });
      setLeagueScopedMatches(rows);
    });
    return () => unsub();
  }, [federationSlug, leagueIdParam]);

  useEffect(() => {
    if (!federationSlug || forbidden) return;
    let cancelled = false;
    setAiStatsLoading(true);
    void (async () => {
      try {
        const row = await getFederationAiDailyStats(federationSlug, aiStatsDate);
        if (!cancelled) setAiStats(row);
      } catch (e) {
        console.error(e);
        if (!cancelled) setAiStats(null);
      } finally {
        if (!cancelled) setAiStatsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [federationSlug, forbidden, aiStatsDate]);

  const handleRefreshAiStats = async () => {
    if (!federationSlug) return;
    setAiStatsRefreshing(true);
    try {
      const row = await runAggregateFederationAiStatsDaily(federationSlug, aiStatsDate);
      setAiStats(row);
      toast.success(`AI 집계를 갱신했습니다. (${row.date})`);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "집계에 실패했습니다.");
    } finally {
      setAiStatsRefreshing(false);
    }
  };

  useEffect(() => {
    const shouldOpen = Boolean((location.state as { openInviteModal?: boolean } | null)?.openInviteModal);
    if (!shouldOpen) return;
    setInviteRole("admin");
    setShowInviteModal(true);
    navigate(location.pathname, { replace: true });
  }, [location.state, location.pathname, navigate]);

  const handleSaveBranding = async () => {
    if (!federationSlug) return;
    setSavingBranding(true);
    try {
      await updateDoc(doc(db, "federations", federationSlug), {
        "draft.branding": {
          name: branding.name,
          logoUrl: branding.logoUrl,
          primaryColor: branding.primaryColor,
        },
      });
      toast.success("브랜딩(Draft)을 저장했습니다.");
      await loadFederation();
    } catch (e) {
      console.error(e);
      toast.error("브랜딩 저장에 실패했습니다.");
    } finally {
      setSavingBranding(false);
    }
  };

  const handleCopyDomain = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success("협회 주소를 복사했습니다.");
    } catch {
      toast.error("복사에 실패했습니다.");
    }
  };

  const handleCreateInvite = async () => {
    if (!federationSlug) return;
    setCreatingInvite(true);
    try {
      const link = await createFederationInviteLink(federationSlug, inviteRole);
      await navigator.clipboard.writeText(link);
      toast.success(`초대 링크가 복사되었습니다. (${inviteRole})`);
    } catch (e) {
      console.error(e);
      toast.error("초대 링크 생성에 실패했습니다.");
    } finally {
      setCreatingInvite(false);
    }
  };

  const handleKakaoInvite = async () => {
    if (!federationSlug) return;
    setSharingKakao(true);
    try {
      const link = await createFederationInviteLink(federationSlug, inviteRole);
      await shareFederationInviteViaKakao({
        link,
        federationName: federation?.name || federationSlug,
      });
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "카카오 초대 전송에 실패했습니다.");
    } finally {
      setSharingKakao(false);
    }
  };

  const handleCloseInviteModal = () => {
    setShowInviteModal(false);
  };

  // 사이드바 탭 상태 (URL ?tab=)
  const tabParam = (searchParams.get("tab") || "dashboard") as AdminTabId;
  const activeTab = tabParam;
  const setTab = (tab: typeof tabParam) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", tab);
    // 신청 관리/팀 관리에서도 선택된 리그 컨텍스트가 필요하므로 유지한다.
    // 리그 컨텍스트가 필요 없는 탭으로 이동할 때만 제거.
    if (tab !== "league" && tab !== "applications" && tab !== "team") {
      next.delete("leagueId");
      next.delete("divisionId");
    }
    setSearchParams(next, { replace: true });
  };
  const currentLeagueId = searchParams.get("leagueId");
  const financeSubTabParam = searchParams.get("subtab") || searchParams.get("financeTab");
  const financeSubTab =
    financeSubTabParam === "teamFees" || financeSubTabParam === "competitionFees" || financeSubTabParam === "accounting"
      ? financeSubTabParam
      : "accounting";
  const currentLeague = leagues.find((league) => league.id === currentLeagueId) || null;
  const currentDivisionId = searchParams.get("divisionId");
  const currentLeagueDivisions = currentLeagueId ? divisionsByTournament[currentLeagueId] || [] : [];
  const currentDivision = currentLeagueDivisions.find((d) => d.id === currentDivisionId) || null;
  // 퍼블릭 URL: 배포된 Hosting(web.app) 기준. 문자열 치환은 반드시 템플릿 리터럴 사용
  const publicUrl = useMemo(() => {
    const base = typeof window !== "undefined" ? window.location.origin : "https://yago-vibe-spt.web.app";
    const slug = federationSlug || "your-slug";
    if (currentLeagueId) {
      if (currentLeague?.mode === "tournament") {
        if (currentDivisionId) {
          return `${base}/federations/${slug}/tournaments/${currentLeagueId}/divisions/${currentDivisionId}`;
        }
        return `${base}/federations/${slug}/tournaments/${currentLeagueId}`;
      }
      return `${base}/federations/${slug}`;
    }
    return `${base}/federations/${slug}`;
  }, [federationSlug, currentLeagueId, currentDivisionId, currentLeague?.mode]);
  const selectedPublicTournamentParam = searchParams.get("publicTournamentId");
  const selectedTournament = useMemo(() => {
    if (selectedPublicTournamentParam) {
      return leagues.find((l) => l.id === selectedPublicTournamentParam && l.mode === "tournament") || null;
    }
    if (currentLeague?.mode === "tournament") return currentLeague;
    return null;
  }, [selectedPublicTournamentParam, leagues, currentLeague]);
  const selectedTournamentId = selectedTournament?.id || null;
  const selectedTournamentName = selectedTournament?.name || null;
  const firstTournament = useMemo(() => leagues.find((l) => l.mode === "tournament") || null, [leagues]);
  const publicTournamentUrl = useMemo(() => {
    if (!federationSlug || !selectedTournamentId) return null;
    const base = typeof window !== "undefined" ? window.location.origin : "https://yago-vibe-spt.web.app";
    if (currentDivisionId && currentLeagueId === selectedTournamentId) {
      return `${base}/federations/${federationSlug}/tournaments/${selectedTournamentId}/divisions/${currentDivisionId}`;
    }
    return `${base}/federations/${federationSlug}/tournaments/${selectedTournamentId}`;
  }, [federationSlug, selectedTournamentId, currentDivisionId]);
  const handleOpenPublicTournament = () => {
    if (!federationSlug) {
      toast.error("협회 정보가 아직 준비되지 않았습니다.");
      return;
    }
    if (!currentLeagueId || !currentLeague) {
      toast.error("리그를 먼저 선택하세요.");
      return;
    }
    if (currentLeague.mode !== "tournament") {
      toast.error("퍼블릭 열기는 토너먼트 리그에서만 가능합니다.");
      return;
    }
    if (!publicTournamentUrl) {
      toast.error("대회 URL을 생성하지 못했습니다. 잠시 후 다시 시도하세요.");
      return;
    }
    window.open(publicTournamentUrl, "_blank");
  };
  const handleGoLeagueSelection = () => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", "league");
    if (firstTournament) {
      next.set("leagueId", firstTournament.id);
      toast.info(`토너먼트 "${firstTournament.name}"를 선택했습니다.`);
    } else {
      next.delete("leagueId");
      toast.info("리그 관리 탭으로 이동했습니다. 토너먼트를 먼저 생성/선택하세요.");
    }
    setSearchParams(next, { replace: true });
  };
  const handleSelectPublicTournament = (leagueId: string) => {
    const target = leagues.find((l) => l.id === leagueId && l.mode === "tournament");
    if (!target) return;
    const next = new URLSearchParams(searchParams);
    next.set("tab", "league");
    next.set("leagueId", target.id);
    next.set("publicTournamentId", target.id);
    setSearchParams(next, { replace: true });
    toast.success(`퍼블릭 대상을 "${target.name}"로 선택했습니다.`);
  };
  useEffect(() => {
    // 첫 진입 UX: 토너먼트가 있는데 선택이 없으면 첫 토너먼트를 자동 선택
    if (selectedPublicTournamentParam) return;
    if (!firstTournament) return;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      // 이미 동일 값이면 업데이트하지 않아 루프를 방지한다.
      if (
        next.get("publicTournamentId") === firstTournament.id &&
        next.get("leagueId") === firstTournament.id
      ) {
        return prev;
      }
      next.set("publicTournamentId", firstTournament.id);
      next.set("leagueId", firstTournament.id);
      return next;
    }, { replace: true });
  }, [selectedPublicTournamentParam, firstTournament, setSearchParams]);
  // 신청 실시간 구독 (선택된 리그 기준)
  useEffect(() => {
    if (!federationSlug || !currentLeagueId) {
      setApplications([]);
      return;
    }
    const appsRef = collection(db, "federations", federationSlug, "leagues", currentLeagueId, "applications");
    const unsub = onSnapshot(appsRef, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      rows.sort((a, b) => {
        const at = (a.createdAt?.seconds || 0);
        const bt = (b.createdAt?.seconds || 0);
        return bt - at;
      });
      setApplications(rows);
    });
    return () => unsub();
  }, [federationSlug, currentLeagueId]);

  const handleCreateLeague = () => {
    void (async () => {
      if (!federationSlug) return;
      const name = window.prompt("새 리그 이름을 입력하세요.");
      if (!name || !name.trim()) return;
      const mode = newLeagueType;
      const leaguesRef = collection(db, "federations", federationSlug, "leagues");
      const newRef = doc(leaguesRef);
      await setDoc(newRef, {
        name: name.trim(),
        status: "진행중",
        mode,
        publishStatus: "draft",
      });

      const id = newRef.id;
      if (mode === "tournament") {
        const divisionsRef = collection(db, "federations", federationSlug, "divisions");
        await setDoc(doc(divisionsRef), {
          tournamentId: id,
          name: "통합부",
          sortOrder: 1,
          status: "published",
        });
      }
      setTeamsByLeague((prev) => ({ ...prev, [id]: [] }));
      setMatchesByLeague((prev) => ({ ...prev, [id]: [] }));

      const next = new URLSearchParams(searchParams);
      next.set("tab", "league");
      next.set("leagueId", id);
      setSearchParams(next, { replace: true });
      setLeagueDetailTab("team");
    })().catch((error) => {
      console.error(error);
      toast.error("리그 생성에 실패했습니다.");
    });
  };

  const handleDeleteLeague = (leagueId: string) => {
    void (async () => {
      if (!federationSlug) return;
      const ok = window.confirm("이 리그를 삭제하시겠습니까?");
      if (!ok) return;

      const teamsRef = collection(db, "federations", federationSlug, "teams");
      const divisionsRef = collection(db, "federations", federationSlug, "divisions");
      const matchesRef = collection(db, "federations", federationSlug, "matches");

      const teamDocs = await getDocs(query(teamsRef, where("leagueId", "==", leagueId)));
      await Promise.all(teamDocs.docs.map((d) => deleteDoc(d.ref)));

      const divisionDocs = await getDocs(query(divisionsRef, where("tournamentId", "==", leagueId)));
      await Promise.all(divisionDocs.docs.map((d) => deleteDoc(d.ref)));

      const matchDocs = await getDocs(query(matchesRef, where("leagueId", "==", leagueId)));
      await Promise.all(matchDocs.docs.map((d) => deleteDoc(d.ref)));

      await deleteDoc(doc(db, "federations", federationSlug, "leagues", leagueId));

      if (currentLeagueId === leagueId) {
        const next = new URLSearchParams(searchParams);
        next.delete("leagueId");
        setSearchParams(next, { replace: true });
      }
    })().catch((error) => {
      console.error(error);
      toast.error("리그 삭제에 실패했습니다.");
    });
  };
  const handleConvertLeagueToTournament = (leagueId: string, leagueName: string) => {
    void (async () => {
      if (!federationSlug) return;
      const ok = window.confirm(`"${leagueName}"을(를) 대회(tournament) 타입으로 전환할까요?`);
      if (!ok) return;
      await updateDoc(doc(db, "federations", federationSlug, "leagues", leagueId), {
        mode: "tournament",
      });
      toast.success("대회 타입으로 전환했습니다.");
    })().catch((error) => {
      console.error(error);
      toast.error("대회 타입 전환에 실패했습니다.");
    });
  };

  const handleOpenLeague = (leagueId: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", "league");
    next.set("leagueId", leagueId);
    setSearchParams(next, { replace: true });
    setLeagueDetailTab("team");
  };

  const handleCloseLeagueDetail = () => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", "league");
    next.delete("leagueId");
    next.delete("divisionId");
    setSearchParams(next, { replace: true });
  };
  const handleSelectDivision = (divisionId: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("divisionId", divisionId);
    setSearchParams(next, { replace: true });
  };
  const handleAddDivisionToCurrentTournament = () => {
    void (async () => {
      if (!federationSlug || !currentLeagueId) return;
      const name = window.prompt("부문 이름을 입력하세요. (예: 40대 장년부)");
      if (!name || !name.trim()) return;
      const divisionsRef = collection(db, "federations", federationSlug, "divisions");
      const sortOrder = (currentLeagueDivisions[currentLeagueDivisions.length - 1]?.sortOrder || 0) + 1;
      const ref = doc(divisionsRef);
      await setDoc(ref, {
        tournamentId: currentLeagueId,
        name: name.trim(),
        sortOrder,
        status: "published",
      });
      const next = new URLSearchParams(searchParams);
      next.set("divisionId", ref.id);
      setSearchParams(next, { replace: true });
    })().catch((e) => {
      console.error(e);
      toast.error("부문 추가에 실패했습니다.");
    });
  };
  const toggleTournamentPublishStatus = () => {
    void (async () => {
      if (!federationSlug || !currentLeagueId || !currentLeague) return;
      const nextStatus = currentLeague.publishStatus === "published" ? "draft" : "published";
      await updateDoc(doc(db, "federations", federationSlug, "leagues", currentLeagueId), {
        publishStatus: nextStatus,
        published: nextStatus === "published",
      });
      toast.success(nextStatus === "published" ? "대회를 공개 상태로 전환했습니다." : "대회를 비공개(draft)로 전환했습니다.");
    })().catch((e) => {
      console.error(e);
      toast.error("발행 상태 변경에 실패했습니다.");
    });
  };
  const currentLeagueTeams = currentLeagueId ? teamsByLeague[currentLeagueId] || [] : [];
  const submittedTeamsForReview = useMemo(
    () =>
      currentLeagueTeams.filter(
        (team) => team.status === "submitted" || team.rosterStatus === "submitted"
      ),
    [currentLeagueTeams]
  );
  const submittedTeamsForReviewKey = useMemo(
    () => submittedTeamsForReview.map((t) => t.id).sort().join(","),
    [submittedTeamsForReview]
  );
  const allFederationTeams = useMemo(
    () => Object.values(teamsByLeague).flat(),
    [teamsByLeague]
  );
  const filteredFederationTeams = useMemo(() => {
    const normalizeTeamStatus = (team: TeamItem): "submitted" | "approved" | "rejected" | "other" => {
      if (team.status === "submitted" || team.status === "approved" || team.status === "rejected") {
        return team.status;
      }
      if (team.rosterStatus === "submitted") return "submitted";
      if (team.rosterStatus === "verified") return "approved";
      if (team.rosterStatus === "returned") return "rejected";
      return "other";
    };
    if (teamStatusFilter === "all") return allFederationTeams;
    return allFederationTeams.filter((team) => normalizeTeamStatus(team) === teamStatusFilter);
  }, [allFederationTeams, teamStatusFilter]);
  const currentLeagueTeamNames = currentLeagueTeams.map((team) => team.name);
  const currentLeagueMatchesRaw = useMemo(() => {
    if (!currentLeagueId) return [];
    // 신규 운영 경로(리그 하위 matches)가 있으면 우선 사용
    if (leagueScopedMatches.length > 0) return leagueScopedMatches;
    return matchesByLeague[currentLeagueId] || [];
  }, [currentLeagueId, leagueScopedMatches, matchesByLeague]);
  const currentLeagueMatches =
    currentLeague?.mode === "tournament" && currentDivisionId
      ? currentLeagueMatchesRaw.filter((m) => m.divisionId === currentDivisionId)
      : currentLeagueMatchesRaw;
  useEffect(() => {
    setScheduleDrafts((prev) => {
      const next = { ...prev };
      currentLeagueMatches.forEach((m) => {
        if (!next[m.id]) {
          const currentVenueId =
            typeof (m as any).venueId === "string" ? ((m as any).venueId as string) : "";
          const inferredVenueId =
            currentVenueId || venues.find((v) => v.name === (m as any).venueName)?.id || "";
          next[m.id] = {
            matchDate: typeof (m as any).matchDate === "string" ? (m as any).matchDate : "",
            matchTime: typeof (m as any).matchTime === "string" ? (m as any).matchTime : "",
            venueId: inferredVenueId,
            refereeName: typeof (m as any).refereeName === "string" ? (m as any).refereeName : "",
          };
        }
      });
      return next;
    });
  }, [currentLeagueMatches, venues]);
  const currentLeagueStandings = calculateStandings(currentLeagueMatches, currentLeagueTeams);
  const tournamentRounds = useMemo(() => {
    const grouped: Record<number, MatchItem[]> = {};
    for (const match of currentLeagueMatches) {
      const order = match.roundOrder ?? 0;
      if (!grouped[order]) grouped[order] = [];
      grouped[order].push(match);
    }
    return Object.entries(grouped)
      .map(([order, matches]) => ({
        order: Number(order),
        roundName: matches[0]?.round || `${order}라운드`,
        matches,
      }))
      .sort((a, b) => a.order - b.order);
  }, [currentLeagueMatches]);

  const handleAddTeamToCurrentLeague = () => {
    void (async () => {
      if (!federationSlug || !currentLeagueId) return;
      const name = window.prompt("추가할 팀 이름을 입력하세요.");
      if (!name || !name.trim()) return;
      const teamsRef = collection(db, "federations", federationSlug, "teams");
      const newRef = doc(teamsRef);
      await setDoc(newRef, {
        leagueId: currentLeagueId,
        name: name.trim(),
      });
    })().catch((error) => {
      console.error(error);
      toast.error("팀 추가에 실패했습니다.");
    });
  };

  useEffect(() => {
    if (!federationSlug || !currentLeagueId) {
      setReviewPlayersByTeam((prev) => (Object.keys(prev).length === 0 ? prev : {}));
      return;
    }
    if (submittedTeamsForReview.length === 0) {
      setReviewPlayersByTeam((prev) => (Object.keys(prev).length === 0 ? prev : {}));
      return;
    }
    let cancelled = false;
    void (async () => {
      const pairs = await Promise.all(
        submittedTeamsForReview.map(async (team) => {
          const snap = await getDocs(
            collection(db, "federations", federationSlug, "teams", team.id, "players")
          );
          const players: ReviewPlayer[] = snap.docs.map((d) => {
            const x = d.data() as any;
            return {
              id: d.id,
              name: String(x?.name || ""),
              number:
                typeof x?.number === "number"
                  ? x.number
                  : typeof x?.jerseyNumber === "number"
                  ? x.jerseyNumber
                  : null,
            };
          });
          return [team.id, players] as const;
        })
      );
      if (cancelled) return;
      setReviewPlayersByTeam(Object.fromEntries(pairs));
    })().catch((e) => {
      console.error(e);
      if (!cancelled) setReviewPlayersByTeam({});
    });
    return () => {
      cancelled = true;
    };
  }, [federationSlug, currentLeagueId, submittedTeamsForReviewKey]);

  const handleApproveSubmittedTeam = (team: TeamItem) => {
    void (async () => {
      if (!federationSlug) return;
      const leagueId = team.leagueId || team.tournamentId || currentLeagueId;
      if (!leagueId) {
        toast.error("리그 정보를 찾을 수 없어 참가팀 등록을 진행할 수 없습니다.");
        return;
      }
      await updateDoc(doc(db, "federations", federationSlug, "teams", team.id), {
        status: "approved",
        rosterStatus: "verified",
        approvedBy: user?.uid || null,
        approvedAt: serverTimestamp(),
        updatedBy: user?.uid || null,
        updatedAt: serverTimestamp(),
      });
      await setDoc(
        doc(db, "federations", federationSlug, "teams", team.id, "submission", "roster"),
        {
          status: "verified",
          verifiedAt: serverTimestamp(),
          returnReason: "",
          statusLogs: arrayUnion({
            from: team.rosterStatus || "submitted",
            to: "verified",
            changedAt: new Date().toISOString(),
            changedBy: user?.uid || null,
          }),
        },
        { merge: true }
      );
      // 참가팀은 teamId를 문서 ID로 사용해 승인 재시도 시에도 중복 등록을 방지한다.
      await setDoc(
        doc(db, "federations", federationSlug, "leagues", leagueId, "participants", team.id),
        {
          teamId: team.id,
          teamName: team.name,
          leagueId,
          approvedBy: user?.uid || null,
          approvedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedBy: user?.uid || null,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      toast.success("팀 승인 완료");
    })().catch((e) => {
      console.error(e);
      toast.error("팀 승인 처리에 실패했습니다.");
    });
  };

  const handleRejectSubmittedTeam = (team: TeamItem) => {
    void (async () => {
      if (!federationSlug) return;
      const leagueId = team.leagueId || team.tournamentId || currentLeagueId;
      const reason = window.prompt("반려 사유를 입력하세요.");
      if (!reason || !reason.trim()) return;
      await updateDoc(doc(db, "federations", federationSlug, "teams", team.id), {
        status: "rejected",
        rosterStatus: "returned",
        rejectedAt: serverTimestamp(),
        rejectReason: reason.trim(),
        updatedBy: user?.uid || null,
        updatedAt: serverTimestamp(),
      });
      await setDoc(
        doc(db, "federations", federationSlug, "teams", team.id, "submission", "roster"),
        {
          status: "returned",
          returnReason: reason.trim(),
          returnedAt: serverTimestamp(),
          returnLogs: arrayUnion({
            reason: reason.trim(),
            createdAt: new Date().toISOString(),
            createdBy: user?.uid || null,
          }),
          statusLogs: arrayUnion({
            from: team.rosterStatus || "submitted",
            to: "returned",
            changedAt: new Date().toISOString(),
            changedBy: user?.uid || null,
          }),
        },
        { merge: true }
      );
      if (leagueId) {
        await deleteDoc(
          doc(db, "federations", federationSlug, "leagues", leagueId, "participants", team.id)
        );
      }
      toast.success("팀 반려 처리 완료");
    })().catch((e) => {
      console.error(e);
      toast.error("팀 반려 처리에 실패했습니다.");
    });
  };

  const handleDeleteTeamFromCurrentLeague = (teamId: string, teamName: string) => {
    void (async () => {
      if (!federationSlug || !currentLeagueId) return;
      const ok = window.confirm(`"${teamName}" 팀을 제거하시겠습니까?`);
      if (!ok) return;
      await deleteDoc(doc(db, "federations", federationSlug, "teams", teamId));
    })().catch((error) => {
      console.error(error);
      toast.error("팀 삭제에 실패했습니다.");
    });
  };

  const handleCreateMatchForCurrentLeague = () => {
    void (async () => {
      if (!federationSlug || !currentLeagueId) return;
      if (currentLeagueTeams.length < 2) {
        alert("경기를 생성하려면 팀이 2개 이상 필요합니다.");
        return;
      }
      const homeTeam = window.prompt(`홈팀 입력 (${currentLeagueTeamNames.join(", ")})`);
      if (!homeTeam || !homeTeam.trim()) return;
      const awayTeam = window.prompt(`원정팀 입력 (${currentLeagueTeamNames.join(", ")})`);
      if (!awayTeam || !awayTeam.trim()) return;
      if (homeTeam.trim() === awayTeam.trim()) {
        alert("홈팀과 원정팀은 달라야 합니다.");
        return;
      }
      const matchesRef = collection(db, "federations", federationSlug, "matches");
      const newRef = doc(matchesRef);
      const scheduledAtRaw = window.prompt("경기 시간(선택, 예: 2026-03-30 10:00)");
      await setDoc(newRef, {
        leagueId: currentLeagueId,
        divisionId: currentLeague?.mode === "tournament" ? currentDivisionId || null : null,
        homeTeam: homeTeam.trim(),
        awayTeam: awayTeam.trim(),
        homeScore: null,
        awayScore: null,
        scheduledAt: scheduledAtRaw?.trim() ? scheduledAtRaw.trim() : null,
      });
    })().catch((error) => {
      console.error(error);
      toast.error("경기 생성에 실패했습니다.");
    });
  };

  const handleGenerateTournamentBracket = () => {
    void (async () => {
      if (!federationSlug || !currentLeagueId || !currentLeague) return;
      if (currentLeague.mode !== "tournament") return;
      if (!currentDivisionId) {
        alert("토너먼트 대진 생성을 위해 먼저 부문을 선택하세요.");
        return;
      }

      const teams = [...currentLeagueTeamNames];
      const n = teams.length;
      if (n < 2 || (n & (n - 1)) !== 0) {
        alert("토너먼트는 팀 수가 2, 4, 8, 16 ... 형태여야 합니다.");
        return;
      }

      const matchesRef = collection(db, "federations", federationSlug, "matches");
      const exists = await getDocs(query(matchesRef, where("leagueId", "==", currentLeagueId)));
      if (!exists.empty) {
        const ok = window.confirm("기존 경기 데이터가 있습니다. 토너먼트 대진을 새로 생성할까요?");
        if (!ok) return;
        await Promise.all(exists.docs.map((d) => deleteDoc(d.ref)));
      }

      const rounds: { id: string; round: string; roundOrder: number; nextMatchId: string | null; nextSlot: "home" | "away" | null }[][] = [];
      let matchCount = n / 2;
      let roundOrder = 1;
      while (matchCount >= 1) {
        const label = getRoundLabel(matchCount);
        const roundMatches = Array.from({ length: matchCount }).map((_, idx) => ({
          id: doc(matchesRef).id,
          round: label,
          roundOrder,
          nextMatchId: null as string | null,
          nextSlot: null as "home" | "away" | null,
        }));
        rounds.push(roundMatches);
        matchCount = Math.floor(matchCount / 2);
        roundOrder += 1;
      }

      // 다음 라운드 연결
      for (let r = 0; r < rounds.length - 1; r++) {
        const currentRound = rounds[r];
        const nextRound = rounds[r + 1];
        currentRound.forEach((m, idx) => {
          const next = nextRound[Math.floor(idx / 2)];
          m.nextMatchId = next.id;
          m.nextSlot = idx % 2 === 0 ? "home" : "away";
        });
      }

      // 1라운드 팀 배치
      const firstRound = rounds[0];
      const writes: Promise<void>[] = [];
      firstRound.forEach((m, idx) => {
        const homeTeam = teams[idx * 2] || "";
        const awayTeam = teams[idx * 2 + 1] || "";
        writes.push(
          setDoc(doc(matchesRef, m.id), {
            leagueId: currentLeagueId,
            divisionId: currentDivisionId,
            round: m.round,
            roundOrder: m.roundOrder,
            homeTeam,
            awayTeam,
            homeScore: null,
            awayScore: null,
            winner: null,
            nextMatchId: m.nextMatchId,
            nextSlot: m.nextSlot,
          })
        );
      });

      // 2라운드 이후 빈 슬롯 매치 생성
      rounds.slice(1).forEach((round) => {
        round.forEach((m) => {
          writes.push(
            setDoc(doc(matchesRef, m.id), {
              leagueId: currentLeagueId,
            divisionId: currentDivisionId,
              round: m.round,
              roundOrder: m.roundOrder,
              homeTeam: "",
              awayTeam: "",
              homeScore: null,
              awayScore: null,
              winner: null,
              nextMatchId: m.nextMatchId,
              nextSlot: m.nextSlot,
            })
          );
        });
      });

      await Promise.all(writes);
      toast.success("토너먼트 대진을 생성했습니다.");
    })().catch((error) => {
      console.error(error);
      toast.error("토너먼트 대진 생성에 실패했습니다.");
    });
  };

  const handleGenerateGroupStageForCurrentLeague = () => {
    void (async () => {
      if (!federationSlug || !currentLeagueId) return;

      const participantsRef = collection(
        db,
        "federations",
        federationSlug,
        "leagues",
        currentLeagueId,
        "participants"
      );
      const groupsRef = collection(
        db,
        "federations",
        federationSlug,
        "leagues",
        currentLeagueId,
        "groups"
      );
      const leagueMatchesRef = collection(
        db,
        "federations",
        federationSlug,
        "leagues",
        currentLeagueId,
        "matches"
      );

      const participantSnap = await getDocs(participantsRef);
      const participants: LeagueParticipant[] = participantSnap.docs
        .map((d) => {
          const x = d.data() as any;
          return {
            teamId: String(x?.teamId || d.id),
            teamName: String(x?.teamName || ""),
          };
        })
        .filter((x) => x.teamId);

      if (participants.length < 2) {
        toast.error("참가팀이 2팀 이상이어야 조 편성을 생성할 수 있습니다.");
        return;
      }

      const raw = window.prompt("조 개수를 입력하세요. (기본 2)", "2");
      if (raw === null) return;
      const parsed = Number(raw);
      const groupCount = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 2;
      if (groupCount > participants.length) {
        toast.error("조 개수는 참가팀 수보다 클 수 없습니다.");
        return;
      }

      const existingGroups = await getDocs(groupsRef);
      const existingMatches = await getDocs(leagueMatchesRef);
      if (!existingGroups.empty || !existingMatches.empty) {
        const ok = window.confirm("기존 조/경기 데이터가 있습니다. 모두 삭제 후 다시 생성할까요?");
        if (!ok) return;
        await Promise.all([
          ...existingGroups.docs.map((d) => deleteDoc(d.ref)),
          ...existingMatches.docs.map((d) => deleteDoc(d.ref)),
        ]);
      }

      const grouped = createGroups(participants, groupCount)
        .map((teams, idx) => ({
          name: `${String.fromCharCode(65 + idx)}조`,
          teams,
        }))
        .filter((g) => g.teams.length > 0);

      for (const group of grouped) {
        await addDoc(groupsRef, {
          name: group.name,
          teamIds: group.teams.map((t) => t.teamId),
          teamNames: group.teams.map((t) => t.teamName),
          createdAt: serverTimestamp(),
        });

        const teamIds = group.teams.map((t) => t.teamId);
        const teamNameById = Object.fromEntries(group.teams.map((t) => [t.teamId, t.teamName]));
        const matches = createRoundRobinMatches(teamIds);

        await Promise.all(
          matches.map((m, idx) =>
            addDoc(leagueMatchesRef, {
              homeTeamId: m.homeTeamId,
              awayTeamId: m.awayTeamId,
              homeTeam: teamNameById[m.homeTeamId] || "",
              awayTeam: teamNameById[m.awayTeamId] || "",
              group: group.name,
              round: idx + 1,
              status: "scheduled",
              createdAt: serverTimestamp(),
            })
          )
        );
      }

      toast.success(`조 편성 및 경기 생성 완료 (${grouped.length}개 조)`);
    })().catch((e) => {
      console.error(e);
      toast.error("조 편성/경기 생성에 실패했습니다.");
    });
  };
  const handleGenerateSemiFinalForCurrentLeague = () => {
    void (async () => {
      if (!federationSlug || !currentLeagueId) return;
      const participantsRef = collection(
        db,
        "federations",
        federationSlug,
        "leagues",
        currentLeagueId,
        "participants"
      );
      const leagueMatchesRef = collection(
        db,
        "federations",
        federationSlug,
        "leagues",
        currentLeagueId,
        "matches"
      );
      const [participantSnap, matchSnap] = await Promise.all([
        getDocs(participantsRef),
        getDocs(leagueMatchesRef),
      ]);
      const participants: LeagueParticipant[] = participantSnap.docs.map((d) => {
        const x = d.data() as any;
        return { teamId: String(x?.teamId || d.id), teamName: String(x?.teamName || "") };
      });
      const scopedMatches: MatchItem[] = matchSnap.docs.map((d) => {
        const x = d.data() as any;
        return {
          id: d.id,
          leagueId: currentLeagueId,
          source: "leagueScoped",
          homeTeamId: typeof x?.homeTeamId === "string" ? x.homeTeamId : undefined,
          awayTeamId: typeof x?.awayTeamId === "string" ? x.awayTeamId : undefined,
          homeTeam: String(x?.homeTeam || ""),
          awayTeam: String(x?.awayTeam || ""),
          homeScore: typeof x?.homeScore === "number" ? x.homeScore : null,
          awayScore: typeof x?.awayScore === "number" ? x.awayScore : null,
          group: typeof x?.group === "string" ? x.group : undefined,
          status: x?.status === "completed" ? "completed" : "scheduled",
          stage: x?.stage === "semi" || x?.stage === "final" ? x.stage : undefined,
        } as MatchItem;
      });

      const groupStageCompleted = scopedMatches.filter((m) => !m.stage && !!m.group);
      const ranking = calculateTableFromCompletedMatches(participants, groupStageCompleted);
      if (ranking.length < 4) {
        toast.error("준결승 생성에는 최소 4개 팀의 순위 데이터가 필요합니다.");
        return;
      }
      const qualified = ranking.slice(0, 4);

      const existingSemis = scopedMatches.filter((m) => m.stage === "semi");
      if (existingSemis.length > 0) {
        const ok = window.confirm("기존 4강 경기가 있습니다. 삭제 후 다시 생성할까요?");
        if (!ok) return;
        await Promise.all(existingSemis.map((m) => deleteDoc(doc(leagueMatchesRef, m.id))));
      }

      const semiPairs = [
        { home: qualified[0], away: qualified[3], round: 1 },
        { home: qualified[1], away: qualified[2], round: 2 },
      ];
      await Promise.all(
        semiPairs.map((m) =>
          addDoc(leagueMatchesRef, {
            homeTeamId: m.home.teamId,
            awayTeamId: m.away.teamId,
            homeTeam: m.home.teamName,
            awayTeam: m.away.teamName,
            stage: "semi",
            round: m.round,
            status: "scheduled",
            homeScore: null,
            awayScore: null,
            winner: null,
            createdAt: serverTimestamp(),
          })
        )
      );
      toast.success("4강 대진 생성 완료");
    })().catch((e) => {
      console.error(e);
      toast.error("4강 대진 생성에 실패했습니다.");
    });
  };
  const handleGenerateFinalForCurrentLeague = () => {
    void (async () => {
      if (!federationSlug || !currentLeagueId) return;
      const leagueMatchesRef = collection(
        db,
        "federations",
        federationSlug,
        "leagues",
        currentLeagueId,
        "matches"
      );
      const matchSnap = await getDocs(leagueMatchesRef);
      const matches = matchSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      const semis = matches.filter((m: any) => m.stage === "semi");
      const finals = matches.filter((m: any) => m.stage === "final");
      if (semis.length < 2) {
        toast.error("결승 생성 전 4강 2경기가 필요합니다.");
        return;
      }
      const completedSemis = semis.filter(
        (m: any) =>
          m.status === "completed" &&
          typeof m.homeScore === "number" &&
          typeof m.awayScore === "number" &&
          m.homeScore !== m.awayScore
      );
      if (completedSemis.length < 2) {
        toast.error("결승 생성 전 4강 결과 입력(무승부 불가)이 필요합니다.");
        return;
      }
      if (finals.length > 0) {
        toast.info("이미 결승 경기가 생성되어 있습니다.");
        return;
      }
      const winners = completedSemis
        .slice(0, 2)
        .map((m: any) =>
          m.homeScore > m.awayScore
            ? { teamId: String(m.homeTeamId || ""), teamName: String(m.homeTeam || "") }
            : { teamId: String(m.awayTeamId || ""), teamName: String(m.awayTeam || "") }
        );
      await addDoc(leagueMatchesRef, {
        homeTeamId: winners[0].teamId,
        awayTeamId: winners[1].teamId,
        homeTeam: winners[0].teamName,
        awayTeam: winners[1].teamName,
        stage: "final",
        round: 1,
        status: "scheduled",
        homeScore: null,
        awayScore: null,
        winner: null,
        createdAt: serverTimestamp(),
      });
      toast.success("결승 생성 완료");
    })().catch((e) => {
      console.error(e);
      toast.error("결승 생성에 실패했습니다.");
    });
  };
  const handleCreateVenue = () => {
    void (async () => {
      if (!federationSlug) return;
      const name = window.prompt("구장 이름을 입력하세요.");
      if (!name || !name.trim()) return;
      const address = window.prompt("구장 주소(선택)") || "";
      const fieldType = window.prompt("구장 타입(선택, 예: 인조잔디)") || "";
      await addDoc(collection(db, "federations", federationSlug, "venues"), {
        name: name.trim(),
        address: address.trim(),
        fieldType: fieldType.trim(),
        status: "active",
        createdAt: serverTimestamp(),
      });
      toast.success("구장을 추가했습니다.");
    })().catch((e) => {
      console.error(e);
      toast.error("구장 추가에 실패했습니다.");
    });
  };
  const handleDeleteVenue = (venueId: string, venueName: string) => {
    void (async () => {
      if (!federationSlug) return;
      const ok = window.confirm(`"${venueName}" 구장을 삭제할까요?`);
      if (!ok) return;
      await deleteDoc(doc(db, "federations", federationSlug, "venues", venueId));
      toast.success("구장을 삭제했습니다.");
    })().catch((e) => {
      console.error(e);
      toast.error("구장 삭제에 실패했습니다.");
    });
  };
  const handleSaveMatchSchedule = (match: MatchItem) => {
    void (async () => {
      if (!federationSlug || !currentLeagueId) return;
      if (match.source !== "leagueScoped") {
        toast.error("신규 일정 배정은 리그 하위 경기 데이터에서만 지원됩니다.");
        return;
      }
      const draft = scheduleDrafts[match.id];
      if (!draft?.matchDate || !draft?.matchTime || !draft?.venueId) {
        toast.error("날짜/시간/구장을 모두 입력하세요.");
        return;
      }
      const selectedVenue = venues.find((v) => v.id === draft.venueId);
      if (!selectedVenue) {
        toast.error("선택한 구장을 찾을 수 없습니다.");
        return;
      }

      const hasVenueConflict = currentLeagueMatches.some((m) => {
        if (m.id === match.id) return false;
        const md = (m as any).matchDate;
        const mt = (m as any).matchTime;
        const mv = (m as any).venueId;
        return md === draft.matchDate && mt === draft.matchTime && mv === draft.venueId;
      });
      if (hasVenueConflict) {
        toast.error("같은 시간에 동일 구장을 사용할 수 없습니다.");
        return;
      }

      const matchHomeId = match.homeTeamId || "";
      const matchAwayId = match.awayTeamId || "";
      const hasTeamConflict = currentLeagueMatches.some((m) => {
        if (m.id === match.id) return false;
        const md = (m as any).matchDate;
        const mt = (m as any).matchTime;
        if (md !== draft.matchDate || mt !== draft.matchTime) return false;
        const home = m.homeTeamId || "";
        const away = m.awayTeamId || "";
        const sameHome = home === matchHomeId || away === matchHomeId;
        const sameAway = home === matchAwayId || away === matchAwayId;
        return sameHome || sameAway;
      });
      if (hasTeamConflict) {
        toast.error("같은 시간에 동일 팀 경기를 중복 배정할 수 없습니다.");
        return;
      }

      await updateDoc(doc(db, "federations", federationSlug, "leagues", currentLeagueId, "matches", match.id), {
        matchDate: draft.matchDate,
        matchTime: draft.matchTime,
        venueId: draft.venueId,
        venueName: selectedVenue.name,
        refereeName: draft.refereeName || "",
        updatedAt: serverTimestamp(),
      });
      toast.success("경기 일정을 저장했습니다.");
    })().catch((e) => {
      console.error(e);
      toast.error("일정 저장에 실패했습니다.");
    });
  };
  const handleAutoSchedule = () => {
    void (async () => {
      if (!federationSlug || !currentLeagueId) return;
      const activeVenues = venues.filter((v) => v.status !== "inactive");
      if (activeVenues.length === 0) {
        toast.error("자동 배정을 위해 활성 구장을 먼저 등록하세요.");
        return;
      }
      const targetDate = window.prompt("자동 배정 날짜를 입력하세요. (YYYY-MM-DD)");
      if (!targetDate || !targetDate.trim()) return;
      const slots = ["09:00", "11:00", "13:00", "15:00", "17:00"];
      const targets = currentLeagueMatches.filter((m) => m.source === "leagueScoped");
      if (targets.length === 0) {
        toast.error("자동 배정할 경기가 없습니다.");
        return;
      }
      let slotIndex = 0;
      let venueIndex = 0;
      await Promise.all(
        targets.map((m) => {
          const venue = activeVenues[venueIndex];
          const time = slots[slotIndex] || "19:00";
          venueIndex += 1;
          if (venueIndex >= activeVenues.length) {
            venueIndex = 0;
            slotIndex += 1;
          }
          return updateDoc(
            doc(db, "federations", federationSlug, "leagues", currentLeagueId, "matches", m.id),
            {
              matchDate: targetDate.trim(),
              matchTime: time,
              venueId: venue.id,
              venueName: venue.name,
              updatedAt: serverTimestamp(),
            }
          );
        })
      );
      toast.success("자동 일정 배정을 완료했습니다.");
    })().catch((e) => {
      console.error(e);
      toast.error("자동 배정에 실패했습니다.");
    });
  };

  const handleInputScoreForMatch = (matchId: string) => {
    void (async () => {
      if (!federationSlug || !currentLeagueId) return;
      const current = currentLeagueMatches.find((m) => m.id === matchId);
      if (!current) return;
      const scoreRaw = window.prompt("점수를 입력하세요. 예: 2,1");
      if (!scoreRaw) return;
      const [homeRaw, awayRaw] = scoreRaw.split(",").map((v) => v.trim());
      const home = Number(homeRaw);
      const away = Number(awayRaw);
      if (!Number.isFinite(home) || !Number.isFinite(away) || home < 0 || away < 0) {
        alert("점수 형식이 올바르지 않습니다. 예: 2,1");
        return;
      }
      await updateDoc(doc(db, "federations", federationSlug, "matches", matchId), {
        homeScore: home,
        awayScore: away,
        status: "completed",
        winner: home > away ? current.homeTeam : away > home ? current.awayTeam : null,
      });

      // 토너먼트는 무승부 불가 + 승자 다음 라운드 자동 반영
      if (currentLeague?.mode === "tournament") {
        if (home === away) {
          alert("토너먼트는 무승부를 허용하지 않습니다.");
          return;
        }
        const winner = home > away ? current.homeTeam : current.awayTeam;
        if (current.nextMatchId && current.nextSlot) {
          await updateDoc(doc(db, "federations", federationSlug, "matches", current.nextMatchId), {
            [current.nextSlot === "home" ? "homeTeam" : "awayTeam"]: winner,
          });
        }
      }
    })().catch((error) => {
      console.error(error);
      toast.error("점수 입력에 실패했습니다.");
    });
  };
  const handleInputScoreForLeagueScopedMatch = (matchId: string) => {
    void (async () => {
      if (!federationSlug || !currentLeagueId) return;
      const current = currentLeagueMatches.find((m) => m.id === matchId);
      if (!current) return;
      const scoreRaw = window.prompt("점수를 입력하세요. 예: 2,1");
      if (!scoreRaw) return;
      const [homeRaw, awayRaw] = scoreRaw.split(",").map((v) => v.trim());
      const home = Number(homeRaw);
      const away = Number(awayRaw);
      if (!Number.isFinite(home) || !Number.isFinite(away) || home < 0 || away < 0) {
        alert("점수 형식이 올바르지 않습니다. 예: 2,1");
        return;
      }
      await updateDoc(doc(db, "federations", federationSlug, "leagues", currentLeagueId, "matches", matchId), {
        homeScore: home,
        awayScore: away,
        status: "completed",
        winner: home > away ? current.homeTeam : away > home ? current.awayTeam : null,
      });
      toast.success("결과를 저장했습니다.");
    })().catch((error) => {
      console.error(error);
      toast.error("결과 저장에 실패했습니다.");
    });
  };
  const handleSetLeagueScopedMatchStatus = (
    matchId: string,
    status: "scheduled" | "live" | "completed"
  ) => {
    void (async () => {
      if (!federationSlug || !currentLeagueId) return;
      const current = currentLeagueMatches.find((m) => m.id === matchId);
      await updateDoc(doc(db, "federations", federationSlug, "leagues", currentLeagueId, "matches", matchId), {
        status,
      });
      if (current && status === "live") {
        await createFederationNotification({
          federationSlug,
          type: "match_start",
          title: "경기 시작",
          message: `${current.homeTeam || "홈팀"} vs ${current.awayTeam || "원정팀"} 경기가 시작되었습니다.`,
        });
      }
      if (
        current &&
        status === "completed" &&
        typeof current.homeScore === "number" &&
        typeof current.awayScore === "number"
      ) {
        await createFederationNotification({
          federationSlug,
          type: "match_end",
          title: "경기 종료",
          message: `${current.homeTeam || "홈팀"} ${current.homeScore} : ${current.awayScore} ${current.awayTeam || "원정팀"}`,
        });
      }
      toast.success(
        status === "live" ? "경기를 LIVE로 전환했습니다." : status === "completed" ? "경기를 종료했습니다." : "경기를 대기 상태로 전환했습니다."
      );
    })().catch((error) => {
      console.error(error);
      toast.error("경기 상태 변경에 실패했습니다.");
    });
  };
  const handleAdjustLeagueScopedScore = (
    match: MatchItem,
    side: "home" | "away",
    delta: number
  ) => {
    void (async () => {
      if (!federationSlug || !currentLeagueId) return;
      const field = side === "home" ? "homeScore" : "awayScore";
      const currentValue = typeof match[field] === "number" ? (match[field] as number) : 0;
      const nextValue = Math.max(0, currentValue + delta);
      const nextHome = side === "home" ? nextValue : typeof match.homeScore === "number" ? match.homeScore : 0;
      const nextAway = side === "away" ? nextValue : typeof match.awayScore === "number" ? match.awayScore : 0;
      await updateDoc(doc(db, "federations", federationSlug, "leagues", currentLeagueId, "matches", match.id), {
        [field]: nextValue,
        winner: nextHome > nextAway ? match.homeTeam : nextHome < nextAway ? match.awayTeam : null,
      });
      if (delta > 0) {
        const scoredTeamName = side === "home" ? match.homeTeam : match.awayTeam;
        await createFederationNotification({
          federationSlug,
          type: "goal",
          title: "골!",
          message: `${scoredTeamName} 득점 (${nextHome}:${nextAway})`,
        });
      }
    })().catch((error) => {
      console.error(error);
      toast.error("점수 업데이트에 실패했습니다.");
    });
  };
  // 최초 진입 시 ?tab 누락되면 dashboard로 정규화
  useEffect(() => {
    if (!searchParams.get("tab")) {
      const next = new URLSearchParams(searchParams);
      next.set("tab", "dashboard");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // legacy section 파라미터를 신규 tab/subtab으로 정규화
  useEffect(() => {
    const section = searchParams.get("section");
    if (!section) return;
    const next = new URLSearchParams(searchParams);
    if (section === "teamFees" || section === "competitionFees" || section === "accounting") {
      next.set("tab", "finance");
      next.set("subtab", section);
      next.delete("section");
      setSearchParams(next, { replace: true });
      return;
    }
    if (section === "teams") next.set("tab", "team");
    else if (section === "members") next.set("tab", "members");
    else if (section === "settings") next.set("tab", "settings");
    else next.set("tab", "dashboard");
    next.delete("section");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  // financeTab(legacy) → subtab 표준 키로 URL 정규화
  useEffect(() => {
    const legacy = searchParams.get("financeTab");
    const subtab = searchParams.get("subtab");
    if (!legacy || subtab) return;
    const next = new URLSearchParams(searchParams);
    next.set("subtab", legacy);
    next.delete("financeTab");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">로딩중...</div>;
  }

  if (!federation || !federationSlug) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">협회를 찾을 수 없습니다.</div>;
  }

  if (!user) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">로그인이 필요합니다.</div>;
  }

  if (forbidden) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">접근 권한이 없습니다.</div>;
  }

  return (
    <div
      className="min-h-screen bg-gray-50 overflow-y-auto pt-16 md:pt-0"
      data-page="federation-admin"
      style={{
        height: "100dvh",
        WebkitOverflowScrolling: "touch",
        paddingBottom: "96px",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
        {/* 상단 헤더 */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">협회 관리자 CMS</h1>
            <p className="text-gray-600 mt-1">Draft 편집 후 Publish로 Live 반영</p>
            {selectedTournamentName ? (
              <p className="text-xs text-gray-500 mt-2">
                현재 퍼블릭 대상: <span className="font-semibold text-gray-800">{selectedTournamentName}</span>
              </p>
            ) : (
              <p className="text-xs text-amber-700 mt-2">⚠ 퍼블릭 대상 대회가 선택되지 않았습니다.</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(`/federations/${federationSlug}`)}>
              홈페이지로
            </Button>
            <Button
              variant="secondary"
              onClick={handleOpenPublicTournament}
              title={!selectedTournamentId ? "토너먼트 리그를 먼저 선택하세요." : "선택한 토너먼트 퍼블릭 페이지를 엽니다."}
            >
              퍼블릭 열기
            </Button>
          </div>
        </div>
        {!selectedTournamentId && (
          <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-amber-700">
              대회를 선택해야 퍼블릭 페이지로 이동할 수 있습니다. (리그 관리에서 토너먼트 선택)
            </p>
            <Button variant="outline" size="sm" onClick={handleGoLeagueSelection}>
              리그 선택하러 가기
            </Button>
          </div>
        )}

        {/* 모바일 전용 상단 네비게이션: 콘텐츠 카드와 분리 */}
        {isMobile && (
          <div className="mb-4">
            <label className="block text-xs text-gray-500 mb-2">관리 메뉴</label>
            <select
              value={activeTab}
              onChange={(e) => setTab(e.target.value as AdminTabId)}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
            >
              {ADMIN_TABS.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 사이드바 + 콘텐츠 */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
          {!isMobile && (
          <aside className="md:col-span-3 lg:col-span-2">
            <nav className="rounded-xl border bg-white p-2 space-y-1">
              {ADMIN_TABS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  aria-current={activeTab === item.id ? "page" : undefined}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                    activeTab === item.id
                      ? "bg-primary-50 text-primary-700 border-primary-200 shadow-sm"
                      : "text-gray-700 hover:bg-gray-50 border-transparent"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </aside>
          )}
          <main className={`${isMobile ? "col-span-1" : "md:col-span-9 lg:col-span-10"} space-y-6`}>
            {/* 모달 유지 */}
        {showInviteModal && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-xl bg-white border border-gray-200 shadow-xl p-5 space-y-4">
            <div>
                <h3 className="text-lg font-bold text-gray-900">🎉 협회가 생성되었습니다!</h3>
                <p className="text-sm text-gray-600 mt-1">팀원을 초대해 협회 운영을 시작해보세요.</p>
            </div>
              <div className="space-y-2">
                <label className="block text-xs text-gray-500">초대 권한</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as FederationInviteRole)}
                >
                  <option value="admin">admin</option>
                  <option value="editor">editor</option>
                  <option value="viewer">viewer</option>
                </select>
          </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => void handleKakaoInvite()} disabled={sharingKakao}>
                  {sharingKakao ? "카카오 준비 중..." : "카카오로 초대"}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => void handleCreateInvite()}
                  disabled={creatingInvite}
                >
                  {creatingInvite ? "생성 중..." : "링크 복사"}
                </Button>
        </div>
              <div className="flex justify-end">
                <Button variant="ghost" onClick={handleCloseInviteModal}>
                  나중에 할게요
                </Button>
          </div>
          </div>
          </div>
        )}
        {/* settings 탭: 브랜딩 설정 */}
        {activeTab === "settings" && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">브랜딩 설정 (Draft)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              className="border rounded-lg px-3 py-2"
              placeholder="브랜딩 이름"
              value={branding.name}
              onChange={(e) => setBranding((p) => ({ ...p, name: e.target.value }))}
            />
            <input
              className="border rounded-lg px-3 py-2"
              placeholder="로고 URL"
              value={branding.logoUrl}
              onChange={(e) => setBranding((p) => ({ ...p, logoUrl: e.target.value }))}
            />
            <input
              className="border rounded-lg px-3 py-2"
              placeholder="#0F3D75"
              value={branding.primaryColor}
              onChange={(e) => setBranding((p) => ({ ...p, primaryColor: e.target.value }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => void handleSaveBranding()} disabled={savingBranding}>
              {savingBranding ? "저장 중..." : "브랜딩 저장"}
            </Button>
            <div className="text-sm text-gray-600">협회 주소: {publicUrl}</div>
            <Button variant="outline" onClick={() => void handleCopyDomain()}>
              복사
            </Button>
          </div>
        </div>
        )}

        {/* members 탭: 초대 링크 */}
        {activeTab === "members" && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">관리자 초대 링크</h2>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="border rounded-lg px-3 py-2 text-sm"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as FederationInviteRole)}
            >
              <option value="admin">admin</option>
              <option value="editor">editor</option>
              <option value="viewer">viewer</option>
            </select>
            <Button onClick={() => void handleCreateInvite()} disabled={creatingInvite}>
              {creatingInvite ? "생성 중..." : "초대 링크 생성 + 복사"}
            </Button>
            <Button variant="secondary" onClick={() => void handleKakaoInvite()} disabled={sharingKakao}>
              {sharingKakao ? "카카오 준비 중..." : "카카오로 초대"}
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            링크 수락 시 선택한 role로 자동 등록됩니다.
          </p>
        </div>
        )}

        {/* 전화번호 기반 초대 관리자 */}
        {activeTab === "members" && <FederationInviteManager federationId={federationSlug} />}

        {/* 권한 관리 (관리자 목록/변경/제거) */}
        {activeTab === "members" && <FederationMemberList federationId={federationSlug} data={federation} />}

        {/* dashboard 탭: AI 통계 */}
        {activeTab === "dashboard" && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">AI 콘텐츠 성능 (일별)</h2>
              <p className="text-xs text-gray-500 mt-1">
                <code className="text-[11px] bg-gray-100 px-1 rounded">aiGenerationLogs</code>를 서울 기준
                날짜로 묶어 집계합니다. 자동 집계는 매일 새벽에 전일분이 갱신됩니다.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs text-gray-500 flex items-center gap-1">
                날짜
                <input
                  type="date"
                  className="border rounded-lg px-2 py-1 text-sm"
                  value={aiStatsDate}
                  onChange={(e) => setAiStatsDate(e.target.value)}
                />
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={aiStatsRefreshing}
                onClick={() => void handleRefreshAiStats()}
              >
                {aiStatsRefreshing ? "집계 중…" : "이 날짜 집계 실행"}
              </Button>
            </div>
          </div>
          {aiStatsLoading ? (
            <p className="text-sm text-gray-600">불러오는 중…</p>
          ) : !aiStats ? (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              이 날짜의 집계 문서가 없습니다. 위에서 「이 날짜 집계 실행」을 눌러 생성하세요.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-3">
                <div className="text-xs text-gray-500">로그 건수 (해당 일)</div>
                <div className="text-xl font-semibold text-gray-900">{aiStats.totalLogs}</div>
                <div className="text-[11px] text-gray-500 mt-1">
                  생성 완료 {aiStats.eventCounts.generation_complete} · 적용{" "}
                  {aiStats.eventCounts.content_applied} · 수정 동기화 {aiStats.eventCounts.user_edit_saved}
                </div>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-3">
                <div className="text-xs text-gray-500">정규화 기준 추천 정확도</div>
                <div className="text-xl font-semibold text-gray-900">
                  {aiPlacementAccuracyPct !== null ? `${aiPlacementAccuracyPct}%` : "—"}
                </div>
                <div className="text-[11px] text-gray-500 mt-1">
                  비교 샘플 {aiStats.placementEvaluated}건 (양쪽 슬롯 모두 식별 가능할 때만 집계)
                </div>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-3">
                <div className="text-xs text-gray-500">적용 시 사용자 수정 비율</div>
                <div className="text-xl font-semibold text-gray-900">
                  {aiEditAmongAppliedPct !== null ? `${aiEditAmongAppliedPct}%` : "—"}
                </div>
                <div className="text-[11px] text-gray-500 mt-1">
                  적용 {aiStats.contentAppliedCount}건 중 수정 반영 {aiStats.userEditedAmongApplied}건
                </div>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-3">
                <div className="text-xs text-gray-500">가장 많이 잡힌 톤</div>
                <div className="text-lg font-semibold text-gray-900 leading-snug">
                  {aiTopToneLabel ?? "—"}
                </div>
                <div className="text-[11px] text-gray-500 mt-1">
                  official {aiStats.toneCount.official} · community {aiStats.toneCount.community} · marketing{" "}
                  {aiStats.toneCount.marketing}
                  {aiStats.toneCount.unknown ? ` · 기타 ${aiStats.toneCount.unknown}` : ""}
                </div>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-3 sm:col-span-2 space-y-2">
                <div className="text-xs font-medium text-gray-700">정규화 배치 분포 (로그 원본은 그대로, 집계만 정규화)</div>
                <div className="text-sm text-gray-800">
                  <span className="text-gray-500 text-xs">추천 분포 · </span>
                  {formatPlacementDistribution(aiStats.normalizedPlacementStats?.recommendedCount)}
                </div>
                <div className="text-sm text-gray-800">
                  <span className="text-gray-500 text-xs">최종 적용 분포 · </span>
                  {formatPlacementDistribution(aiStats.normalizedPlacementStats?.finalCount)}
                </div>
                <div className="text-sm text-gray-800">
                  <span className="text-gray-500 text-xs">일치(추천=최종) 분포 · </span>
                  {formatPlacementDistribution(aiStats.normalizedPlacementStats?.matchedCount)}
                </div>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-3 sm:col-span-2">
                <div className="text-xs text-gray-500">후보 인덱스 분포 (생성·적용 이벤트)</div>
                <div className="text-sm text-gray-800 mt-1">
                  0번 {aiStats.variantIndexCount[0]} · 1번 {aiStats.variantIndexCount[1]} · 2번{" "}
                  {aiStats.variantIndexCount[2]}
                </div>
              </div>
              {aiStats.aggregatedAt ? (
                <p className="text-[11px] text-gray-400 sm:col-span-2">
                  마지막 집계 시각(UTC): {aiStats.aggregatedAt}
                </p>
              ) : null}
            </div>
          )}
        </div>
        )}

        {activeTab === "league" && (
          <div className="space-y-4">
            {!currentLeague ? (
              <>
                <div className="flex items-center justify-between rounded-xl border bg-white p-4">
                  <h2 className="text-lg font-semibold text-gray-900">리그 관리</h2>
                  <div className="flex items-center gap-2">
                    <select
                      value={newLeagueType}
                      onChange={(e) => setNewLeagueType(e.target.value as "league" | "tournament")}
                      className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm"
                      aria-label="리그 타입"
                    >
                      {LEAGUE_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <Button onClick={handleCreateLeague}>리그 생성</Button>
                  </div>
                </div>
                <div className="space-y-3">
                  {leagues.length === 0 ? (
                    <div className="rounded-xl border bg-white p-6 text-sm text-gray-600">
                      등록된 리그가 없습니다. "리그 생성" 버튼으로 시작하세요.
                    </div>
                  ) : (
                    leagues.map((league) => {
                      const isSelectedPublicTournament = league.mode === "tournament" && selectedTournamentId === league.id;
                      return (
                      <div
                        key={league.id}
                        className={`rounded-xl border p-4 ${
                          isSelectedPublicTournament
                            ? "border-blue-500 bg-blue-50 shadow-sm"
                            : "border-gray-200 bg-white"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-gray-900">{league.name}</h3>
                              {isSelectedPublicTournament && (
                                <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">선택됨</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              상태: {league.status} · 형식: {league.mode === "tournament" ? "토너먼트" : "리그"} · 팀: {(teamsByLeague[league.id] || []).length}개 · 경기: {(matchesByLeague[league.id] || []).length}경기
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {league.mode !== "tournament" && (
                              <Button
                                variant="outline"
                                onClick={() => handleConvertLeagueToTournament(league.id, league.name)}
                              >
                                대회로 전환
                              </Button>
                            )}
                            {league.mode === "tournament" && (
                              <Button
                                variant={selectedTournamentId === league.id ? "secondary" : "outline"}
                                onClick={() => handleSelectPublicTournament(league.id)}
                              >
                                {selectedTournamentId === league.id ? "선택됨" : "이 대회 선택"}
                              </Button>
                            )}
                            <Button variant="outline" onClick={() => handleOpenLeague(league.id)}>
                              관리
                            </Button>
                            <Button variant="outline" onClick={() => handleDeleteLeague(league.id)}>
                              삭제
                            </Button>
                          </div>
                        </div>
                      </div>
                    )})
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border bg-white p-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{currentLeague.name}</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      상태: {currentLeague.status} · 형식: {currentLeague.mode === "tournament" ? "토너먼트" : "리그"} · 팀: {currentLeagueTeams.length}개 · 경기: {currentLeagueMatches.length}경기
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {currentLeague.mode === "tournament" && (
                      <Button variant="outline" onClick={toggleTournamentPublishStatus}>
                        {currentLeague.publishStatus === "published" ? "비공개 전환" : "공개 발행"}
                      </Button>
                    )}
                    <Button variant="outline" onClick={handleCloseLeagueDetail}>
                      목록으로
                    </Button>
                  </div>
                </div>
                {currentLeague.mode === "tournament" && (
                  <div className="rounded-xl border bg-white p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900">부문</h3>
                      <Button variant="outline" onClick={handleAddDivisionToCurrentTournament}>
                        부문 추가
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {currentLeagueDivisions.length === 0 ? (
                        <span className="text-sm text-gray-500">등록된 부문이 없습니다.</span>
                      ) : (
                        currentLeagueDivisions.map((division) => (
                          <button
                            key={division.id}
                            onClick={() => handleSelectDivision(division.id)}
                            className={`px-3 py-1.5 rounded-md text-sm border ${
                              currentDivisionId === division.id
                                ? "bg-primary-50 text-primary-700 border-primary-200"
                                : "bg-white text-gray-700 border-gray-200"
                            }`}
                          >
                            {division.name}
                          </button>
                        ))
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      공개 상태: {currentLeague.publishStatus === "published" ? "published" : "draft"} (공개 페이지는 published만 노출)
                    </p>
                  </div>
                )}
                <div className="rounded-xl border bg-white p-4">
                  <div className="flex items-center gap-2 border-b pb-3 mb-4">
                    <button
                      onClick={() => setLeagueDetailTab("team")}
                      className={`px-3 py-1.5 rounded-md text-sm ${leagueDetailTab === "team" ? "bg-primary-50 text-primary-700" : "text-gray-600 hover:bg-gray-50"}`}
                    >
                      팀 관리
                    </button>
                    <button
                      onClick={() => setLeagueDetailTab("match")}
                      className={`px-3 py-1.5 rounded-md text-sm ${leagueDetailTab === "match" ? "bg-primary-50 text-primary-700" : "text-gray-600 hover:bg-gray-50"}`}
                    >
                      경기 관리
                    </button>
                    <button
                      onClick={() => setLeagueDetailTab("rank")}
                      className={`px-3 py-1.5 rounded-md text-sm ${leagueDetailTab === "rank" ? "bg-primary-50 text-primary-700" : "text-gray-600 hover:bg-gray-50"}`}
                    >
                      순위
                    </button>
                  </div>

                  {leagueDetailTab === "team" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">팀 리스트</h3>
                        <Button variant="outline" onClick={handleAddTeamToCurrentLeague}>
                          팀 추가
                        </Button>
                      </div>
                      {currentLeagueTeams.length === 0 ? (
                        <div className="rounded-lg border border-dashed p-6 text-center">
                          <p className="text-sm text-gray-600">등록된 팀이 없습니다.</p>
                          <Button variant="outline" className="mt-3" onClick={handleAddTeamToCurrentLeague}>
                            팀 추가
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {currentLeagueTeams.map((team) => (
                            <div
                              key={team.id}
                              className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50 cursor-pointer"
                              onClick={() => navigate(`/federations/${federationSlug}/teams/${team.id}/register`)}
                            >
                              <div>
                                <span className="text-sm text-gray-900 font-medium">{team.name}</span>
                                <div className="mt-1">
                                  <span
                                    className={`inline-flex px-2 py-0.5 rounded text-xs border ${
                                      team.rosterStatus === "verified"
                                        ? "bg-green-50 text-green-700 border-green-200"
                                        : team.rosterStatus === "submitted"
                                        ? "bg-blue-50 text-blue-700 border-blue-200"
                                        : team.rosterStatus === "returned"
                                        ? "bg-red-50 text-red-700 border-red-200"
                                        : "bg-gray-50 text-gray-700 border-gray-200"
                                    }`}
                                  >
                                    {TEAM_ROSTER_STATUS_LABEL[team.rosterStatus || "draft"]}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/federations/${federationSlug}/teams/${team.id}/register`);
                                  }}
                                >
                                  명단 등록
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => navigate(`/federations/${federationSlug}/teams/${team.id}/register`)}
                                >
                                  상세
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTeamFromCurrentLeague(team.id, team.name);
                                  }}
                                >
                                  삭제
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {leagueDetailTab === "match" && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <div className="rounded-lg border p-2 text-xs text-gray-700">
                          오늘 경기 수:{" "}
                          {
                            currentLeagueMatches.filter(
                              (m) => (m as any).matchDate === new Date().toISOString().slice(0, 10)
                            ).length
                          }
                        </div>
                        <div className="rounded-lg border p-2 text-xs text-gray-700">
                          LIVE 경기 수: {currentLeagueMatches.filter((m) => m.status === "live").length}
                        </div>
                        <div className="rounded-lg border p-2 text-xs text-gray-700">
                          완료 경기 수: {currentLeagueMatches.filter((m) => m.status === "completed").length}
                        </div>
                        <div className="rounded-lg border p-2 text-xs text-gray-700">
                          미배정 경기 수:{" "}
                          {
                            currentLeagueMatches.filter(
                              (m) => !(m as any).matchDate || !(m as any).matchTime || !(m as any).venueName
                            ).length
                          }
                        </div>
                      </div>
                      <div className="rounded-lg border bg-white p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold text-gray-900">구장 관리</h4>
                          <Button variant="outline" onClick={handleCreateVenue}>
                            구장 추가
                          </Button>
                        </div>
                        {venues.length === 0 ? (
                          <p className="text-xs text-gray-500">등록된 구장이 없습니다.</p>
                        ) : (
                          <div className="space-y-1">
                            {venues.map((v) => (
                              <div key={v.id} className="flex items-center justify-between text-xs border rounded px-2 py-1">
                                <span>
                                  {v.name}
                                  {v.fieldType ? ` · ${v.fieldType}` : ""}
                                  {v.address ? ` · ${v.address}` : ""}
                                </span>
                                <Button variant="outline" onClick={() => handleDeleteVenue(v.id, v.name)}>
                                  삭제
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">경기 관리</h3>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" onClick={handleAutoSchedule}>
                            자동 일정 배정
                          </Button>
                          <Button variant="outline" onClick={handleGenerateGroupStageForCurrentLeague}>
                            조편성 + 경기 생성
                          </Button>
                          <Button variant="outline" onClick={handleGenerateSemiFinalForCurrentLeague}>
                            4강 생성
                          </Button>
                          <Button variant="outline" onClick={handleGenerateFinalForCurrentLeague}>
                            결승 생성
                          </Button>
                          {currentLeague?.mode === "tournament" && (
                            <Button variant="outline" onClick={handleGenerateTournamentBracket}>
                              토너먼트 대진 생성
                            </Button>
                          )}
                          <Button variant="outline" onClick={handleCreateMatchForCurrentLeague}>
                            경기 생성
                          </Button>
                        </div>
                      </div>
                      {currentLeagueMatches.length === 0 ? (
                        <p className="text-sm text-gray-600">등록된 경기가 없습니다.</p>
                      ) : (
                        currentLeague?.mode === "tournament" ? (
                          <div className="overflow-x-auto">
                            <div className="min-w-max flex items-start gap-4">
                              {tournamentRounds.map((round) => (
                                <div key={round.order} className="w-72 rounded-lg border p-3 bg-white">
                                  <div className="text-sm font-semibold text-gray-800 mb-2">[{round.roundName}]</div>
                                  <div className="space-y-2">
                                    {round.matches.map((match) => (
                                      <div key={match.id} className="rounded-lg border p-3">
                                        <div className="text-sm text-gray-900">
                                          {(match.homeTeam || "TBD")} vs {(match.awayTeam || "TBD")}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                          점수: {match.homeScore ?? "-"} : {match.awayScore ?? "-"}
                                          {match.winner ? ` · 승자: ${match.winner}` : ""}
                                          {match.group ? ` · ${match.group}` : ""}
                                          {match.status ? ` · ${match.status}` : ""}
                                          {(match as any).matchDate ? ` · ${(match as any).matchDate}` : ""}
                                          {(match as any).matchTime ? ` ${(match as any).matchTime}` : ""}
                                          {(match as any).venueName ? ` · ${(match as any).venueName}` : ""}
                                        </div>
                                        {match.source === "leagueScoped" && (
                                          <div className="mt-2 grid grid-cols-1 md:grid-cols-5 gap-2">
                                            <input
                                              className="border rounded px-2 py-1 text-xs"
                                              type="date"
                                              value={scheduleDrafts[match.id]?.matchDate || ""}
                                              onChange={(e) =>
                                                setScheduleDrafts((prev) => ({
                                                  ...prev,
                                                  [match.id]: {
                                                    ...(prev[match.id] || { matchDate: "", matchTime: "", venueId: "", refereeName: "" }),
                                                    matchDate: e.target.value,
                                                  },
                                                }))
                                              }
                                            />
                                            <input
                                              className="border rounded px-2 py-1 text-xs"
                                              type="time"
                                              value={scheduleDrafts[match.id]?.matchTime || ""}
                                              onChange={(e) =>
                                                setScheduleDrafts((prev) => ({
                                                  ...prev,
                                                  [match.id]: {
                                                    ...(prev[match.id] || { matchDate: "", matchTime: "", venueId: "", refereeName: "" }),
                                                    matchTime: e.target.value,
                                                  },
                                                }))
                                              }
                                            />
                                            <select
                                              className="border rounded px-2 py-1 text-xs"
                                              value={scheduleDrafts[match.id]?.venueId || ""}
                                              onChange={(e) =>
                                                setScheduleDrafts((prev) => ({
                                                  ...prev,
                                                  [match.id]: {
                                                    ...(prev[match.id] || { matchDate: "", matchTime: "", venueId: "", refereeName: "" }),
                                                    venueId: e.target.value,
                                                  },
                                                }))
                                              }
                                            >
                                              <option value="">구장 선택</option>
                                              {venues
                                                .filter((v) => v.status !== "inactive")
                                                .map((v) => (
                                                  <option key={v.id} value={v.id}>
                                                    {v.name}
                                                  </option>
                                                ))}
                                            </select>
                                            <input
                                              className="border rounded px-2 py-1 text-xs"
                                              placeholder="심판명(선택)"
                                              value={scheduleDrafts[match.id]?.refereeName || ""}
                                              onChange={(e) =>
                                                setScheduleDrafts((prev) => ({
                                                  ...prev,
                                                  [match.id]: {
                                                    ...(prev[match.id] || { matchDate: "", matchTime: "", venueId: "", refereeName: "" }),
                                                    refereeName: e.target.value,
                                                  },
                                                }))
                                              }
                                            />
                                            <Button variant="outline" onClick={() => handleSaveMatchSchedule(match)}>
                                              일정 저장
                                            </Button>
                                          </div>
                                        )}
                                        <div className="mt-2">
                                          <div className="flex flex-wrap gap-2">
                                            <Button
                                              variant="outline"
                                              onClick={() =>
                                                match.source === "leagueScoped"
                                                  ? handleInputScoreForLeagueScopedMatch(match.id)
                                                  : handleInputScoreForMatch(match.id)
                                              }
                                              disabled={!match.homeTeam || !match.awayTeam}
                                            >
                                              점수 입력
                                            </Button>
                                            {match.source === "leagueScoped" && (
                                              <>
                                                <Button variant="outline" onClick={() => handleSetLeagueScopedMatchStatus(match.id, "live")}>
                                                  경기 시작
                                                </Button>
                                                <Button variant="outline" onClick={() => handleSetLeagueScopedMatchStatus(match.id, "completed")}>
                                                  경기 종료
                                                </Button>
                                                <Button variant="outline" onClick={() => handleAdjustLeagueScopedScore(match, "home", 1)}>
                                                  홈 +1
                                                </Button>
                                                <Button variant="outline" onClick={() => handleAdjustLeagueScopedScore(match, "away", 1)}>
                                                  원정 +1
                                                </Button>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {currentLeagueMatches.map((match) => (
                              <div key={match.id} className="flex items-center justify-between rounded-lg border p-3">
                                <div className="text-sm text-gray-900">
                                  {match.homeTeam} vs {match.awayTeam}
                                  <div className="text-xs text-gray-500 mt-1">
                                    점수: {match.homeScore ?? "-"} : {match.awayScore ?? "-"}
                                    {match.group ? ` · ${match.group}` : ""}
                                    {match.status ? ` · ${match.status}` : ""}
                                    {(match as any).matchDate ? ` · ${(match as any).matchDate}` : ""}
                                    {(match as any).matchTime ? ` ${(match as any).matchTime}` : ""}
                                    {(match as any).venueName ? ` · ${(match as any).venueName}` : ""}
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    variant="outline"
                                    onClick={() =>
                                      match.source === "leagueScoped"
                                        ? handleInputScoreForLeagueScopedMatch(match.id)
                                        : handleInputScoreForMatch(match.id)
                                    }
                                  >
                                    점수 입력
                                  </Button>
                                  {match.source === "leagueScoped" && (
                                    <>
                                      <Button variant="outline" onClick={() => handleSetLeagueScopedMatchStatus(match.id, "live")}>
                                        경기 시작
                                      </Button>
                                      <Button variant="outline" onClick={() => handleSetLeagueScopedMatchStatus(match.id, "completed")}>
                                        경기 종료
                                      </Button>
                                      <Button variant="outline" onClick={() => handleAdjustLeagueScopedScore(match, "home", 1)}>
                                        홈 +1
                                      </Button>
                                      <Button variant="outline" onClick={() => handleAdjustLeagueScopedScore(match, "away", 1)}>
                                        원정 +1
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      )}
                    </div>
                  )}

                  {leagueDetailTab === "rank" && (
                    <div>
                      <h3 className="font-semibold text-gray-900">순위</h3>
                      {currentLeagueStandings.length === 0 ? (
                        <p className="text-sm text-gray-600 mt-2">점수 입력이 완료된 경기가 없어 순위를 계산할 수 없습니다.</p>
                      ) : (
                        <div className="mt-3 space-y-2">
                          {currentLeagueStandings.map((row, index) => (
                            <div key={row.teamName} className="rounded-lg border p-3 text-sm">
                              <div className="font-medium text-gray-900">
                                {index + 1}위 {row.teamName}
                              </div>
                              <div className="text-gray-600 mt-1">
                                승점 {row.points} · 득실 {row.goalDiff >= 0 ? `+${row.goalDiff}` : row.goalDiff} · 다득점 {row.goalsFor}
                              </div>
                              <div className="text-gray-500 mt-1">
                                {row.played}경기 {row.win}승 {row.draw}무 {row.lose}패 ({row.goalsFor}:{row.goalsAgainst})
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="rounded-xl border bg-white p-4">
                  <h3 className="font-semibold text-gray-900">결과 입력</h3>
                  <p className="text-sm text-gray-600 mt-2">경기 결과 입력 폼 연결 영역 (placeholder)</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "team" && (
          <div className="rounded-xl border bg-white p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-900">팀 관리</h2>
              <div className="flex items-center gap-2 text-sm">
                <button
                  onClick={() => setTeamStatusFilter("all")}
                  className={`px-2.5 py-1 rounded border ${teamStatusFilter === "all" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-200"}`}
                >
                  전체
                </button>
                <button
                  onClick={() => setTeamStatusFilter("submitted")}
                  className={`px-2.5 py-1 rounded border ${teamStatusFilter === "submitted" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-200"}`}
                >
                  제출완료
                </button>
                <button
                  onClick={() => setTeamStatusFilter("approved")}
                  className={`px-2.5 py-1 rounded border ${teamStatusFilter === "approved" ? "bg-green-600 text-white border-green-600" : "bg-white text-gray-700 border-gray-200"}`}
                >
                  승인됨
                </button>
                <button
                  onClick={() => setTeamStatusFilter("rejected")}
                  className={`px-2.5 py-1 rounded border ${teamStatusFilter === "rejected" ? "bg-red-600 text-white border-red-600" : "bg-white text-gray-700 border-gray-200"}`}
                >
                  반려
                </button>
              </div>
            </div>
            {allFederationTeams.length === 0 ? (
              <p className="text-sm text-gray-600">등록된 팀이 없습니다.</p>
            ) : filteredFederationTeams.length === 0 ? (
              <p className="text-sm text-gray-600">선택한 상태에 해당하는 팀이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {filteredFederationTeams.map((team) => (
                  <div key={team.id} className="rounded-lg border p-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{team.name}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        리그: {leagues.find((l) => l.id === team.tournamentId || l.id === (team as any).leagueId)?.name || "-"} · 상태: {team.rosterStatus || "draft"}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => navigate(`/federations/${federationSlug}/teams/${team.id}/register`)}
                    >
                      등록 페이지
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "applications" && (
          <div className="space-y-4">
            {currentLeague && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-xl border bg-white p-4">
                  <div className="text-xs text-gray-500">총 팀 수</div>
                  <div className="text-xl font-semibold text-gray-900 mt-1">
                    {(teamsByLeague[currentLeague.id] || []).length}
                  </div>
                </div>
                <div className="rounded-xl border bg-white p-4">
                  <div className="text-xs text-gray-500">제출됨</div>
                  <div className="text-xl font-semibold text-blue-700 mt-1">
                    {(teamsByLeague[currentLeague.id] || []).filter((t) => t.rosterStatus === "submitted").length}
                  </div>
                </div>
                <div className="rounded-xl border bg-white p-4">
                  <div className="text-xs text-gray-500">반려됨</div>
                  <div className="text-xl font-semibold text-red-700 mt-1">
                    {(teamsByLeague[currentLeague.id] || []).filter((t) => t.rosterStatus === "returned").length}
                  </div>
                </div>
                <div className="rounded-xl border bg-white p-4">
                  <div className="text-xs text-gray-500">승인됨</div>
                  <div className="text-xl font-semibold text-green-700 mt-1">
                    {(teamsByLeague[currentLeague.id] || []).filter((t) => t.rosterStatus === "verified").length}
                  </div>
                </div>
              </div>
            )}
            <div className="rounded-xl border bg-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-gray-900">신청 관리</h2>
                <select
                  className="border rounded-md px-2 py-1 text-sm"
                  value={applicationsFilter}
                  onChange={(e) => setApplicationsFilter(e.target.value as any)}
                >
                  <option value="pending">대기</option>
                  <option value="approved">승인</option>
                  <option value="rejected">거절</option>
                  <option value="hold">보류</option>
                  <option value="all">전체</option>
                </select>
              </div>
              <div className="text-sm text-gray-600">
                {currentLeague ? (
                  <>
                    현재 리그: <span className="font-medium text-gray-900">{currentLeague.name}</span>
                  </>
                ) : (
                  "좌측에서 리그를 선택하거나 '리그 관리'에서 리그를 연 후 확인하세요."
                )}
              </div>
            </div>
            {!currentLeague ? (
              <div className="rounded-xl border bg-white p-6 text-sm text-gray-600">
                신청 내역을 확인하려면 먼저 리그를 선택하세요. "리그 관리" 탭에서 원하는 리그의 [관리] 버튼을 눌러 진입하면 여기에 표시됩니다.
              </div>
            ) : (
              <div className="rounded-xl border bg-white p-4">
                {applications.length === 0 ? (
                  <p className="text-sm text-gray-600">신청 내역이 없습니다.</p>
                ) : (
                  <div className="space-y-2">
                    {applications
                      .filter((a) => (applicationsFilter === "all" ? true : a.status === applicationsFilter))
                      .map((app) => (
                        <div key={app.id} className="flex flex-wrap items-center justify-between rounded-lg border p-3 gap-3">
                          <div className="min-w-[220px]">
                            <div className="text-sm font-medium text-gray-900">{app.teamName}</div>
                            <div className="text-xs text-gray-600 mt-0.5">
                              대표: {app.managerName} · {app.phone}
                              {app.divisionId ? (
                                <>
                                  {" "}
                                  · 부문:{" "}
                                  {currentLeagueDivisions.find((d) => d.id === app.divisionId)?.name || app.divisionId}
                                </>
                              ) : null}
                            </div>
                            {app.note ? <div className="text-xs text-gray-500 mt-0.5">메모: {app.note}</div> : null}
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-1 rounded text-xs border ${
                                app.status === "pending"
                                  ? "bg-gray-50 text-gray-700 border-gray-200"
                                  : app.status === "approved"
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : app.status === "hold"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-red-50 text-red-700 border-red-200"
                              }`}
                            >
                              {app.status}
                            </span>
                            {app.status === "pending" && (
                              <>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    void (async () => {
                                      if (!federationSlug || !currentLeagueId) return;
                                      // 중복 팀 존재 검사(로컬 스냅샷 기준) — 인덱스/쿼리 이슈 회피
                                      const duplicated = (teamsByLeague[currentLeagueId] || []).some(
                                        (t) => String(t.name || "").trim().toLowerCase() === String(app.teamName || "").trim().toLowerCase()
                                      );
                                      if (duplicated) {
                                        toast.error("동일 팀명이 이미 등록되어 있습니다.");
                                        return;
                                      }
                                      // 팀 생성
                                      const createdTeamRef = doc(collection(db, "federations", federationSlug, "teams"));
                                      await setDoc(createdTeamRef, {
                                        name: app.teamName,
                                        managerName: app.managerName,
                                        phone: app.phone,
                                        createdBy: app.createdBy || user.uid,
                                        leagueId: currentLeagueId,
                                        tournamentId: currentLeagueId,
                                        divisionId: app.divisionId || null,
                                        applicationId: app.id,
                                        createdFrom: "application",
                                        status: "active",
                                        submittedRoster: false,
                                        createdAt: serverTimestamp(),
                                      });
                                      await updateDoc(
                                        doc(db, "federations", federationSlug, "leagues", currentLeagueId, "applications", app.id),
                                        {
                                          status: "approved",
                                          teamId: createdTeamRef.id,
                                          approvedBy: user?.uid || null,
                                          approvedAt: serverTimestamp(),
                                          updatedBy: user?.uid || null,
                                          updatedAt: serverTimestamp(),
                                        }
                                      );
                                      const registerUrl = `${window.location.origin}/federations/${federationSlug}/teams/${createdTeamRef.id}/register`;
                                      await navigator.clipboard.writeText(registerUrl);
                                      await createFederationNotification({
                                        federationSlug,
                                        type: "application_approved",
                                        title: "참가 승인",
                                        message: `${app.teamName} 팀 참가가 승인되었습니다.`,
                                        targetTeamId: createdTeamRef.id,
                                        targetUserId: app.createdBy || undefined,
                                      });
                                      toast.success("승인 완료 — 팀 생성 및 등록 링크를 복사했습니다.");

                                      // 운영 흐름상 바로 확인할 수 있도록 팀 관리 화면으로 이동
                                      const next = new URLSearchParams(searchParams);
                                      next.set("tab", "league");
                                      next.set("leagueId", currentLeagueId);
                                      setSearchParams(next, { replace: true });
                                      setLeagueDetailTab("team");
                                    })().catch((e) => {
                                      console.error(e);
                                      toast.error(e?.message || "승인 처리에 실패했습니다.");
                                    });
                                  }}
                                >
                                  승인
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    void (async () => {
                                      if (!federationSlug || !currentLeagueId) return;
                                      const reason = window.prompt("반려 사유를 입력하세요.", app?.rejectReason || "");
                                      if (reason === null) return;
                                      await updateDoc(
                                        doc(db, "federations", federationSlug, "leagues", currentLeagueId, "applications", app.id),
                                        {
                                          status: "rejected",
                                          rejectReason: String(reason || "").trim(),
                                          rejectedAt: serverTimestamp(),
                                        }
                                      );
                                      toast.success("거절 처리했습니다.");
                                    })().catch((e) => {
                                      console.error(e);
                                      toast.error("거절 처리에 실패했습니다.");
                                    });
                                  }}
                                >
                                  거절
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    void (async () => {
                                      if (!federationSlug || !currentLeagueId) return;
                                      const reason = window.prompt("보류 사유를 입력하세요.", app?.holdReason || "");
                                      if (reason === null) return;
                                      await updateDoc(
                                        doc(db, "federations", federationSlug, "leagues", currentLeagueId, "applications", app.id),
                                        {
                                          status: "hold",
                                          holdReason: String(reason || "").trim(),
                                          heldAt: serverTimestamp(),
                                        }
                                      );
                                      toast.success("보류 처리했습니다.");
                                    })().catch((e) => {
                                      console.error(e);
                                      toast.error("보류 처리에 실패했습니다.");
                                    });
                                  }}
                                >
                                  보류
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
            {currentLeague && (
              <div className="rounded-xl border bg-white p-4">
                <h3 className="font-semibold text-gray-900 mb-3">제출 검수 대기 팀 (submitted)</h3>
                {submittedTeamsForReview.length === 0 ? (
                  <p className="text-sm text-gray-600">검수 대기 팀이 없습니다.</p>
                ) : (
                  <div className="space-y-2">
                    {submittedTeamsForReview.map((t) => (
                        <div key={t.id} className="rounded-lg border p-3">
                          <div>
                            <div className="text-sm font-medium text-gray-900">팀: {t.name}</div>
                            <div className="text-xs text-gray-600">
                              상태: {t.status || t.rosterStatus || "draft"} · 부문:{" "}
                              {t.divisionId ? currentLeagueDivisions.find((d) => d.id === t.divisionId)?.name || t.divisionId : "-"}
                            </div>
                          </div>
                          <div className="mt-2 rounded-md border bg-gray-50 p-2">
                            <div className="text-xs font-medium text-gray-700 mb-1">선수 목록</div>
                            {(reviewPlayersByTeam[t.id] || []).length === 0 ? (
                              <p className="text-xs text-gray-500">등록된 선수가 없습니다.</p>
                            ) : (
                              <ul className="space-y-1">
                                {(reviewPlayersByTeam[t.id] || []).map((p) => (
                                  <li key={p.id} className="text-xs text-gray-700">
                                    - {p.name} ({p.number ?? "-"}번)
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <Button variant="outline" onClick={() => navigate(`/federations/${federationSlug}/teams/${t.id}/register`)}>
                              상세 검수
                            </Button>
                            <Button variant="outline" onClick={() => handleApproveSubmittedTeam(t)}>
                              승인
                            </Button>
                            <Button variant="outline" onClick={() => handleRejectSubmittedTeam(t)}>
                              반려
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "finance" && (
          <div className="rounded-xl border bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900">회계</h2>
            <p className="text-sm text-gray-600 mt-2">
              협회 통합 원장/팀 회비/대회 참가비를 CMS에서 통합 관리합니다.
            </p>
            <div className="mt-4 inline-flex rounded-lg border bg-gray-50 p-1 gap-1">
              <button
                type="button"
                onClick={() => {
                  const next = new URLSearchParams(searchParams);
                  next.set("subtab", "accounting");
                  next.delete("financeTab");
                  setSearchParams(next, { replace: true });
                }}
                className={`px-3 py-1.5 text-xs rounded ${
                  financeSubTab === "accounting"
                    ? "bg-white border text-primary-700 border-primary-200"
                    : "text-gray-600"
                }`}
              >
                원장
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = new URLSearchParams(searchParams);
                  next.set("subtab", "teamFees");
                  next.delete("financeTab");
                  setSearchParams(next, { replace: true });
                }}
                className={`px-3 py-1.5 text-xs rounded ${
                  financeSubTab === "teamFees" ? "bg-white border text-primary-700 border-primary-200" : "text-gray-600"
                }`}
              >
                팀 회비
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = new URLSearchParams(searchParams);
                  next.set("subtab", "competitionFees");
                  next.delete("financeTab");
                  setSearchParams(next, { replace: true });
                }}
                className={`px-3 py-1.5 text-xs rounded ${
                  financeSubTab === "competitionFees"
                    ? "bg-white border text-primary-700 border-primary-200"
                    : "text-gray-600"
                }`}
              >
                대회 참가비
              </button>
            </div>

            <div className="mt-4">
              {financeSubTab === "accounting" && (
                <FederationAccountingDashboard
                  federationSlug={federationSlug}
                  federationName={
                    typeof federation?.name === "string" && federation.name.trim() ? federation.name.trim() : undefined
                  }
                />
              )}
              {financeSubTab === "teamFees" && <FederationTeamFeeDashboard federationSlug={federationSlug} />}
              {financeSubTab === "competitionFees" && <FederationCompetitionDashboard federationSlug={federationSlug} />}
            </div>
          </div>
        )}

        {/* Admin 페이지에서는 공개용 Home/소개 표시 컴포넌트를 렌더하지 않는다 (편집 UI만 제공) */}
          </main>
        </div>
      </div>
    </div>
  );
}
