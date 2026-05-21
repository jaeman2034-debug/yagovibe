import {
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { normalizeSportId } from "@/constants/sports";
import { resolveLastSportId, sportMarketDetailUrl } from "@/utils/sportHubHref";
import { Suspense, lazy, useEffect } from "react";
import { Toaster } from "sonner";
import { AuthProvider } from "./context/AuthProvider";
import { WebFcmDeepLinkBridge } from "./components/WebFcmDeepLinkBridge";
import FirebaseAuthCallbackPage from "./components/FirebaseAuthCallbackPage";
import InAppBrowserRedirect from "./components/InAppBrowserRedirect";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ProtectedWithAvatar } from "./components/ProtectedWithAvatar";
import { RequireAvatarOnboarding } from "./components/guard/RequireAvatarOnboarding";
import { PublicRoute } from "./components/PublicRoute";
import SafeHomeRedirect from "./routes/SafeHomeRedirect";
import { HubSportGate } from "./features/onboarding/HubSportGate";
import { HubProvider } from "./context/HubContext";
import MainLayout from "./layout/MainLayout";
import ErrorBoundary from "./components/ErrorBoundary.tsx";
import CenterLayout from "./layouts/CenterLayout";
import FullWidthLayout from "./layouts/FullWidthLayout";
import MarketLayout from "./layouts/MarketLayout";
import PageWrapper from "./components/PageWrapper";
import { OfflineIndicator } from "./components/OfflineIndicator";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";
import { PWAUpdatePrompt } from "./components/PWAUpdatePrompt";
import { useGATrack } from "@/hooks/useGATrack";
import { useAutoGAEvents } from "@/hooks/useAutoGAEvents";
import LoginPage from "./pages/LoginPage";
import {
  TeamActivityPushRedirect,
  TeamOverviewPushRedirect,
} from "./pages/team/TeamPushRedirects";
import TeamCreateCanonicalRedirect from "./pages/team/TeamCreateCanonicalRedirect";
import { TeamGuard } from "@/components/guard/TeamGuard";
import { CaptainOnlyRoute } from "@/components/guard/CaptainOnlyRoute";
// 🔥 익명 로그인 보장 (업로드 문제 해결) - main.tsx에서 처리하므로 여기서는 제거

// Lazy loading으로 성능 최적화 (LoginPage만 eager: lazy 청크 실패·OAuth 복귀 시 터짐 여부 확인용)
const StartScreen = lazy(() => import("./pages/start/StartScreen"));
const SignupPage = lazy(() => import("./pages/SignupPage"));
const PhoneLoginPage = lazy(() => import("./pages/PhoneLoginPage"));
const HomePage = lazy(() => import("./pages/HomePage"));
const HomeEntry = lazy(() => import("./pages/home/HomeEntry"));
const HomeByRolePage = lazy(() => import("./pages/home/HomeByRolePage"));
const HomeNewTest = lazy(() => import("./pages/home/HomeNew"));
const HomeDashboard = lazy(() => import("./pages/home/HomeDashboard"));
const SportsHubPage = lazy(() => import("./pages/SportsHubPage"));
const VoiceMapSearch = lazy(() => import("./pages/VoiceMapSearch"));
const VoiceMap = lazy(() => import("./pages/voice/VoiceMap"));
const VoiceMapDashboard = lazy(() => import("./pages/voice/VoiceMapDashboard"));
const VoiceMapPageSimple = lazy(() => import("./pages/VoiceMapPageSimple"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminConsole = lazy(() => import("./pages/admin/AdminConsole"));
const AutoInsights = lazy(() => import("./pages/admin/AutoInsights"));
const GeoDashboard = lazy(() => import("./pages/admin/GeoDashboard"));
const Insights = lazy(() => import("./pages/admin/Insights"));
const InsightsPage = lazy(() => import("./pages/admin/InsightsPage"));
const ReportsPage = lazy(() => import("./pages/admin/ReportsPage"));
const AIInsightsPage = lazy(() => import("./pages/admin/AIInsightsPage"));
const TeamDashboardPage = lazy(() => import("./pages/admin/TeamDashboardPage"));
const ReportDashboard = lazy(() => import("./pages/admin/ReportDashboard"));
const AdminMonthlyDashboard = lazy(() => import("./pages/AdminMonthlyDashboard"));
const AdminReportHistory = lazy(() => import("./pages/admin/AdminReportHistory"));
const AdminVoiceDashboard = lazy(() => import("./pages/admin/AdminVoiceDashboard"));
const InsightsDashboard = lazy(() => import("./pages/admin/InsightsDashboard"));
const AiConsole = lazy(() => import("./pages/admin/AiConsole"));
const AIOps3DConsole = lazy(() => import("./pages/admin/AIOps3DConsole"));
const AdminGovernanceConsole = lazy(() => import("./pages/admin/GovernanceConsole"));
const AdminPerformanceDashboard = lazy(() => import("./pages/admin/AdminPerformanceDashboard"));
const AdminTeamTrends = lazy(() => import("./pages/AdminTeamTrends"));
const GlobalQualityCenter = lazy(() => import("./pages/admin/GlobalQualityCenter"));
const OpsCenter = lazy(() => import("./pages/admin/OpsCenter"));
const GovernanceDashboard = lazy(() => import("./pages/admin/GovernanceDashboard"));
const KnowledgeGraph = lazy(() => import("./pages/admin/KnowledgeGraph"));
const InsightsCenter = lazy(() => import("./pages/admin/InsightsCenter"));
const InsightReview = lazy(() => import("./pages/admin/InsightReview"));
const FeedbackCenter = lazy(() => import("./pages/admin/FeedbackCenter"));
const Transparency = lazy(() => import("./pages/admin/Transparency"));
const ComplianceCenter = lazy(() => import("./pages/admin/ComplianceCenter"));
const GovernancePortal = lazy(() => import("./pages/admin/GovernancePortal"));
const OrgBillingCenter = lazy(() => import("./pages/admin/OrgBillingCenter"));
const BillingAnalyticsPage = lazy(() => import("./pages/admin/BillingAnalyticsPage"));
const BillingCohortPage = lazy(() => import("./pages/admin/BillingCohortPage"));
const MRRDashboard = lazy(() => import("./pages/admin/MRRDashboard"));
const ChaosTesting = lazy(() => import("./pages/admin/ChaosTesting"));
const PilotConsole = lazy(() => import("./pages/admin/PilotConsole"));
const LaunchReadiness = lazy(() => import("./pages/admin/LaunchReadiness"));
const SREDashboard = lazy(() => import("./pages/admin/SREDashboard"));
const GrowthConsole = lazy(() => import("./pages/admin/GrowthConsole"));
const AssistantPanel = lazy(() => import("./components/VoiceUX/AssistantPanel"));
const FcmTestPage = lazy(() => import("./pages/FcmTestPage"));
const DeveloperPortal = lazy(() => import("./pages/dev/DeveloperPortal"));
const FCMTest = lazy(() => import("./pages/test/FCMTest"));
const Facility = lazy(() => import("./pages/Facility"));
const FacilityDetail = lazy(() => import("./pages/facility/FacilityDetail"));
const BookingForm = lazy(() => import("./pages/facility/BookingForm"));
const EventList = lazy(() => import("./pages/EventList"));
const TeamList = lazy(() => import("@/pages/team/TeamList"));
const TeamDetail = lazy(() => import("@/pages/team/TeamDetail"));
const MarketPage = lazy(() => import("./pages/market/MarketPage"));
const MarketList = lazy(() => import("./pages/market/MarketList"));
const MarketCreate_AI = lazy(() => import("./pages/MarketCreate_AI"));
const MarketAddPage = lazy(() => import("./pages/MarketAddPage"));
import MarketCreatePage from "./pages/market/MarketCreatePage";
const MarketReviewDashboard = lazy(() => import("./pages/MarketReviewDashboard"));
const ReviewHeatmapDashboard = lazy(() => import("./pages/ReviewHeatmapDashboard"));
const SalesForecastDashboard = lazy(() => import("./pages/SalesForecastDashboard"));
const MarketReportsPage = lazy(() => import("./pages/ReportsPage"));
const TTSAudioPanel = lazy(() => import("./components/TTSAudioPanel"));
const MarketReportDashboard = lazy(() => import("./components/MarketReportDashboard"));
const ReportDashboardPage = lazy(() => import("./pages/admin/ReportDashboard"));
const MarketReportAIRouter = lazy(() => import("./pages/market/MarketReport_AIRouter"));
const AdminHome = lazy(() => import("./pages/admin/AdminHome"));
const AdminHomeLegacy = lazy(() => import("./pages/admin/AdminHomeLegacy"));
const AIReportsDashboard = lazy(() => import("./pages/admin/AIReportsDashboard"));
const ProductDetail = lazy(() => import("./pages/market/ProductDetail"));
const AppMarketPostCanonicalRedirect = lazy(
  () => import("./pages/market/AppMarketPostCanonicalRedirect")
);
const FavoriteList = lazy(() => import("./pages/favorites/FavoriteList"));
const ChatRoom = lazy(() => import("./pages/chat/ChatRoom"));
/** chatRooms 기반 통합 UI (모집·팀·거래 room 문서) — 거래 1:1 `chats/` 전용은 {@link ChatRoom} */
const ChatPage = lazy(() => import("./pages/chat/ChatPage"));
const ChatListPage = lazy(() => import("./pages/chat/ChatListPage"));
const HubHome = lazy(() => import("./pages/hub/HubHome"));
const OnboardingSportPage = lazy(() => import("./features/onboarding/OnboardingPage"));
const AvatarOnboardingPage = lazy(() => import("./pages/onboarding/AvatarOnboardingPage"));
const OfflinePage = lazy(() => import("./pages/OfflinePage"));
const NoMatch = lazy(() => import("./pages/NoMatch"));
const InAppPage = lazy(() => import("./pages/InAppPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const DebugPage = lazy(() => import("./pages/DebugPage"));
const MatchListPage = lazy(() => import("./pages/match/MatchListPage"));
const MatchCreatePage = lazy(() => import("./pages/match/MatchCreatePage"));
const MatchDetailPage = lazy(() => import("./pages/match/MatchDetailPage"));
const MatchJoinSuccessPage = lazy(() => import("./pages/match/MatchJoinSuccessPage"));
const MatchJoinPaymentSuccessPage = lazy(
  () => import("./pages/match/MatchJoinPaymentSuccessPage")
);
const MatchJoinPaymentFailPage = lazy(
  () => import("./pages/match/MatchJoinPaymentFailPage")
);
const RecruitCreatePage = lazy(() => import("./pages/recruit/RecruitCreatePage"));
const RecruitPathRedirect = lazy(() => import("./pages/recruit/RecruitPathRedirect"));
const TeamCreate = lazy(() => import("@/pages/team/TeamCreate"));
const TeamCreateStep2 = lazy(() => import("@/pages/team/TeamCreateStep2"));
const TeamCreateStep3 = lazy(() => import("@/pages/team/TeamCreateStep3"));
const TeamHome = lazy(() => import("@/pages/team/TeamHome"));
const TeamSearchPage = lazy(() => import("@/pages/team/TeamSearchPage"));
const TeamLineupPage = lazy(() => import("@/pages/team/TeamLineupPage"));
const TeamLineupListPage = lazy(() => import("@/pages/team/TeamLineupListPage"));
const TeamLineupDetailPage = lazy(() => import("@/pages/team/TeamLineupDetailPage"));
const TeamManagePage = lazy(() => import("@/pages/team/TeamManagePage"));
const TeamPlayPage = lazy(() => import("@/pages/team/TeamPlayPage"));
const PlayPage = lazy(() => import("@/pages/play/PlayPage"));
const MatchmakingQueuePage = lazy(() => import("@/pages/play/MatchmakingQueuePage"));
const QuickPlayPage = lazy(() => import("@/pages/play/QuickPlayPage"));
const GameSessionPage = lazy(() => import("@/pages/play/GameSessionPage"));
const PlaygroundPage = lazy(() => import("@/pages/playground/PlaygroundPage"));
const PlaygroundHubPage = lazy(() => import("@/pages/playground/PlaygroundHubPage"));
const PlaygroundMiniShotPage = lazy(() => import("@/pages/playground/PlaygroundMiniShotPage"));
const PkChallengePage = lazy(() => import("@/pages/playground/PkChallengePage"));
const DribbleChallengePage = lazy(() => import("@/pages/playground/DribbleChallengePage"));
const TeamCashBookFullLedgerPage = lazy(() => import("@/pages/team/TeamCashBookFullLedgerPage"));
const TeamGamesPage = lazy(() => import("@/pages/team/TeamGamesPage"));
const TeamGameCreatePage = lazy(() => import("@/pages/team/TeamGameCreatePage"));
const TeamGameEditPage = lazy(() => import("@/pages/team/TeamGameEditPage"));
const GamePlayerStatsPage = lazy(() => import("@/pages/team/GamePlayerStatsPage"));
const TeamGameParticipationPage = lazy(() => import("@/pages/team/TeamGameParticipationPage"));
const TeamInvitePage = lazy(() => import("@/pages/team/TeamInvitePage"));
const TeamJoinPage = lazy(() => import("@/pages/team/TeamJoinPage"));
const TeamBillingSuccessPage = lazy(() => import("@/pages/team/billing/TeamBillingSuccessPage"));
const TeamBillingFailPage = lazy(() => import("@/pages/team/billing/TeamBillingFailPage"));
const BillingSuccessPage = lazy(() => import("./pages/billing/BillingSuccessPage"));
const MyTeamsPage = lazy(() => import("@/pages/team/MyTeamsPage"));
const SelectTeamPage = lazy(() => import("./pages/select-team/SelectTeamPage"));
const TeamPublicProfilePage = lazy(() => import("@/pages/teams/TeamPage"));
const MePage = lazy(() => import("./pages/me/MePage"));
const CoachDashboardPage = lazy(() => import("./pages/coach/CoachDashboardPage"));
const JoinPage = lazy(() => import("./pages/join/JoinPage"));
const ScheduleCreatePage = lazy(() => import("./pages/activity/ScheduleCreatePage"));
const ScheduleDetailPage = lazy(() => import("./pages/activity/ScheduleDetailPage"));
const EventsPage = lazy(() => import("./pages/activity/EventsPage"));
const MarketCategoryPage = lazy(() => import("./pages/market/MarketCategoryPage"));
const ActivityRouter = lazy(() => import("./pages/activity/ActivityRouter"));
const LostMapPage = lazy(() => import("./pages/market/LostMapPage"));
const MarketMapPage = lazy(() => import("./pages/market/MapPage"));
const SportHubPage = lazy(() => import("./pages/sports/hub/SportHubPage"));
const SportActivityListPage = lazy(() => import("./pages/sports/SportActivityListPage"));
const SportsActivityPage = lazy(() => import("./pages/sports/SportsActivityPage"));
const SportsMatchPage = lazy(() => import("./pages/sports/SportsMatchPage"));
const SportsMapPage = lazy(() => import("./pages/sports/SportsMapPage"));
const InviteLinkPage = lazy(() => import("./pages/invite/InviteLinkPage"));
const InviteFriendLandingPage = lazy(() => import("./pages/invite/InviteFriendLandingPage"));
const InvitePage = lazy(() => import("./pages/invite/InvitePage"));
const AssociationInvitePage = lazy(() => import("./pages/invite/AssociationInvitePage"));
const AssociationApplyPage = lazy(() => import("./pages/association/AssociationApplyPage"));
const AssociationOfficialPage = lazy(() => import("./pages/association/AssociationOfficialPage"));
const TeamCaptainInvitePage = lazy(() => import("@/pages/team/TeamCaptainInvitePage"));
const PlatformNotificationsPage = lazy(() => import("./pages/platform/PlatformNotificationsPage"));
const PublicProfilePage = lazy(() => import("./pages/profile/ProfilePage"));
const OrganizationPublicPage = lazy(() => import("./pages/organization/OrganizationPublicPage"));
const QRLoginDesktopPage = lazy(() => import("./pages/qr-login/QRLoginDesktopPage"));
const QRPhoneLoginPage = lazy(() => import("./pages/qr-login/QRPhoneLoginPage"));
const FederationShell = lazy(() => import("./pages/federations/FederationShell"));
const FederationHomePage = lazy(() => import("./pages/federations/FederationHomePage"));
const FederationTournamentPublicPage = lazy(
  () => import("./pages/federations/FederationTournamentPublicPage")
);
const FederationAdminDashboard = lazy(() => import("./pages/federations/FederationAdminDashboard"));
const FederationTeamRegistrationPage = lazy(
  () => import("./pages/federations/FederationTeamRegistrationPage")
);

/** `/sports/federations/:slug/...` → `/federations/:slug/...` */
function FederationSportsPrefixRedirect() {
  const { federationSlug } = useParams<{ federationSlug: string }>();
  const location = useLocation();
  const base = `/sports/federations/${federationSlug}`;
  const suffix = location.pathname.startsWith(base) ? location.pathname.slice(base.length) : "";
  return <Navigate to={`/federations/${federationSlug}${suffix}${location.search}`} replace />;
}

/** `/activity/federations/:slug/...` → `/federations/:slug/...` */
function FederationActivityPrefixRedirect() {
  const { federationSlug } = useParams<{ federationSlug: string }>();
  const location = useLocation();
  const base = `/activity/federations/${federationSlug}`;
  const suffix = location.pathname.startsWith(base) ? location.pathname.slice(base.length) : "";
  return <Navigate to={`/federations/${federationSlug}${suffix}${location.search}`} replace />;
}

/** `/tournaments/:id` 등 레거시·알림 링크 → `ActivityRouter` 리그 리졸버 */
function TournamentsLeagueCanonicalRedirect() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  if (!tournamentId) return <Navigate to="/activity/tournaments" replace />;
  return <Navigate to={`/activity/leagues/${encodeURIComponent(tournamentId)}`} replace />;
}

/** `/sports/:sport/recruit/:postId` → 마켓 모집 상세 `/sports/:sport/market/:postId` (문서 id 동일) */
function SportRecruitPostCanonicalRedirect() {
  const { sport, postId } = useParams<{ sport: string; postId: string }>();
  const location = useLocation();
  if (!postId) {
    return <Navigate to="/hub" replace />;
  }
  const sid = normalizeSportId(sport ?? "") ?? resolveLastSportId();
  const dest = `${sportMarketDetailUrl(sid, postId)}${location.search}`;
  return <Navigate to={dest} replace />;
}

/** 헤더·문서의 `/federations/:slug/leagues` — 실제 라우트는 홈의 대회/리그 탭으로 통일 */
function FederationLeaguesListRedirect() {
  const { federationSlug } = useParams<{ federationSlug: string }>();
  if (!federationSlug || federationSlug.startsWith(":")) {
    return <Navigate to="/" replace />;
  }
  return <Navigate to={`/federations/${federationSlug}?tab=tournaments`} replace />;
}

/**
 * `/federations/:slug/leagues/:leagueId` → 공개 대회 페이지와 동일 문서 id (`tournaments/:id`)
 * 문서 플레이스홀더(`:federationId` 등)를 URL에 그대로 넣은 경우 홈으로 보냄
 */
function FederationLeagueDetailRedirect() {
  const { federationSlug, leagueId } = useParams<{ federationSlug: string; leagueId: string }>();
  if (
    !federationSlug ||
    !leagueId ||
    federationSlug.startsWith(":") ||
    leagueId.startsWith(":")
  ) {
    return <Navigate to="/" replace />;
  }
  return <Navigate to={`/federations/${federationSlug}/tournaments/${leagueId}`} replace />;
}

/** 레거시 `/app/market/map` → canonical `/market/map` (쿼리·해시 유지) */
function LegacyAppMarketMapRedirect() {
  const { search, hash } = useLocation();
  return <Navigate to={{ pathname: "/market/map", search, hash }} replace />;
}

function AssociationApplyLegacyRedirect() {
  const { associationId } = useParams<{ associationId: string }>();
  const { search } = useLocation();
  if (!associationId) return <Navigate to="/me" replace />;
  return <Navigate to={`/associations/${associationId}/apply${search}`} replace />;
}

/** 레거시 `/teams/:teamId` → 플레이 우선; `tab`/`hint` 쿼리는 공개 프로필로 전달 */
function TeamsLegacyRedirect() {
  const { teamId = "" } = useParams<{ teamId: string }>();
  const [searchParams] = useSearchParams();
  if (!teamId || teamId.startsWith(":")) {
    return <Navigate to="/my-teams" replace />;
  }
  const enc = encodeURIComponent(teamId);
  const tab = searchParams.get("tab");
  const hint = searchParams.get("hint");
  if (tab || hint) {
    const qs = new URLSearchParams();
    if (tab) qs.set("tab", tab);
    if (hint) qs.set("hint", hint);
    const q = qs.toString();
    return <Navigate to={`/team/${enc}/public${q ? `?${q}` : ""}`} replace />;
  }
  return <Navigate to={`/teams/${enc}/play`} replace />;
}

export default function App() {
  useGATrack();
  useAutoGAEvents();
  const navigate = useNavigate();
  const location = useLocation();
  
  // `//game/session/...` 등 이중 슬래시 → 404 방지
  useEffect(() => {
    if (!/\/{2,}/.test(location.pathname)) return;
    const fixed = location.pathname.replace(/\/{2,}/g, "/");
    navigate({ pathname: fixed, search: location.search, hash: location.hash }, { replace: true });
  }, [location.pathname, location.search, location.hash, navigate]);

  // 🔥 푸시 알림 클릭 시 라우팅 처리
  useEffect(() => {
    const handlePushNotificationNavigate = (event: CustomEvent<{ route: string }>) => {
      const route = event.detail.route.replace(/\/{2,}/g, "/");
      if (import.meta.env.DEV) {
        console.log("🔥 [App] 푸시 알림 클릭 → 라우팅:", route);
      }
      navigate(route);
    };

    window.addEventListener("pushNotificationNavigate", handlePushNotificationNavigate as EventListener);

    return () => {
      window.removeEventListener("pushNotificationNavigate", handlePushNotificationNavigate as EventListener);
    };
  }, [navigate]);

  // 🔥 PWA 업데이트 핸들러 - Service Worker 강제 비활성화 (업로드 문제 해결)
  const handlePWAUpdate = () => {
    // 🔥 Service Worker 완전 비활성화
    console.log("🔕 Service Worker 비활성화됨 (업로드 문제 해결)");
    window.location.reload();
    return;
    
    /*
    if ("serviceWorker" in navigator) {
      // @ts-expect-error - virtual:pwa-register는 vite-plugin-pwa가 빌드 시 생성하는 가상 모듈
      import("virtual:pwa-register")
        .then(({ registerSW }) => {
          registerSW({
            immediate: true,
          });
          window.location.reload();
        })
        .catch(() => {
          window.location.reload();
        });
    } else {
      window.location.reload();
    }
    */
  };

  return (
    <ErrorBoundary>
      <AuthProvider>
        <WebFcmDeepLinkBridge />
        <InAppBrowserRedirect />
        <Suspense fallback={<div className="p-6 text-center text-gray-500">로딩 중...</div>}>
          <Routes>
            {/* OAuth 콜백(web.app/__/auth/...) — AuthProvider 단일 트리에서만 처리 (이중 Provider 제거) */}
            <Route path="/__/auth/*" element={<FirebaseAuthCallbackPage />} />

            {/* 🔥 인앱 브라우저 리다이렉트 페이지 */}
            <Route path="/in-app" element={<InAppPage />} />

            {/* 초대: 친구(uid) → 협회/팀 → 목록 → 팀 문서 id 순 (구체적 경로 우선) */}
            <Route path="/invite/association/:token" element={<AssociationInvitePage />} />
            <Route path="/invite/team" element={<TeamCaptainInvitePage />} />
            <Route path="/invite" element={<InvitePage />} />
            {/* 친구 초대 (Auth uid) — 반드시 `/invite/:inviteId` 보다 먼저 */}
            <Route path="/invite/friend/:inviterUid" element={<InviteFriendLandingPage />} />
            {/* 팀 초대 링크 랜딩 (`inviteLinks` 문서 id) — 로그인 전·후 공개 진입 */}
            <Route path="/invite/:inviteId" element={<InviteLinkPage />} />
            <Route
              path="/associations/:associationId/apply"
              element={
                <ProtectedRoute>
                  <AssociationApplyPage />
                </ProtectedRoute>
              }
            />
            <Route path="/association/:associationId/apply" element={<AssociationApplyLegacyRedirect />} />
            {/* 협회 공식 랜딩 — `/apply` 보다 짧은 경로는 반드시 그 아래에 두지 말고, apply를 먼저 등록했으므로 ok */}
            <Route path="/association/:associationId" element={<AssociationOfficialPage />} />

            {/* 인증/시작 카드형 전용 — redirect 복귀 직후 user/context 시차는 PublicRoute(sessionUser)로 차단 */}
            <Route
              element={
                <PublicRoute>
                  <CenterLayout />
                </PublicRoute>
              }
            >
              <Route path="/start" element={<Navigate to="/hub" replace />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/login/phone" element={<PhoneLoginPage />} />
              <Route path="/login/qr-phone" element={<QRLoginDesktopPage />} />
              <Route path="/qr-login" element={<QRPhoneLoginPage />} />
              <Route
                path="/onboarding"
                element={
                  <ProtectedRoute>
                    <OnboardingSportPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/onboarding/avatar"
                element={
                  <ProtectedRoute>
                    <Suspense
                      fallback={
                        <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">
                          불러오는 중…
                        </div>
                      }
                    >
                      <AvatarOnboardingPage />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* 🔥 디버그 패널 (테스트 모드 전용) */}
            <Route path="/debug" element={<DebugPage />} />

            {/* Stripe Checkout 구독 성공 — Functions `createCheckoutSession` success_url 과 동일 경로 */}
            <Route
              path="/billing/success"
              element={
                <ProtectedRoute>
                  <BillingSuccessPage />
                </ProtectedRoute>
              }
            />

            {/* 앱 진입 → 스타트 스크린 (로그인/회원가입/게스트 선택) */}
            <Route path="/" element={<SafeHomeRedirect />} />

            {/* 연맹: MainLayout 밖 — 앱 헤더/하단탭 없이 공개 포털만 (레거시 URL → /federations) */}
            <Route
              path="/sports/federations/:federationSlug/*"
              element={<FederationSportsPrefixRedirect />}
            />
            <Route
              path="/activity/federations/:federationSlug/*"
              element={<FederationActivityPrefixRedirect />}
            />
            <Route path="/federations/:federationSlug" element={<FederationShell />}>
              <Route index element={<FederationHomePage />} />
              <Route path="leagues" element={<FederationLeaguesListRedirect />} />
              <Route path="leagues/:leagueId" element={<FederationLeagueDetailRedirect />} />
              <Route path="tournaments/:tournamentId" element={<FederationTournamentPublicPage />} />
              <Route
                path="tournaments/:tournamentId/divisions/:divisionId"
                element={<FederationTournamentPublicPage />}
              />
            </Route>
            <Route
              path="/federations/:federationSlug/admin"
              element={
                <ProtectedRoute>
                  <FederationAdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/federations/:federationSlug/teams/:teamId/register"
              element={
                <ProtectedWithAvatar>
                  <FederationTeamRegistrationPage />
                </ProtectedWithAvatar>
              }
            />

            {/* 운동장: Phaser 필드 + 모드 허브 + 레거시 미니슛 */}
            <Route
              path="/playground"
              element={
                <ProtectedRoute>
                  <PlaygroundPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/playground/hub"
              element={
                <ProtectedRoute>
                  <PlaygroundHubPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/playground/mini-shot"
              element={
                <ProtectedRoute>
                  <PlaygroundMiniShotPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/playground/pk"
              element={
                <ProtectedRoute>
                  <PkChallengePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/playground/dribble"
              element={
                <ProtectedRoute>
                  <DribbleChallengePage />
                </ProtectedRoute>
              }
            />

            {/* 메인 앱 대시보드 전용 - MainLayout 적용 (보호된 라우트) */}
            <Route element={<MainLayout />}>
              <Route
                path="/hub"
                element={
                  <ProtectedRoute>
                    <HubSportGate>
                      <HubProvider>
                        <HubHome />
                      </HubProvider>
                    </HubSportGate>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/chats"
                element={
                  <ProtectedWithAvatar>
                    <ChatListPage />
                  </ProtectedWithAvatar>
                }
              />
              <Route 
                path="/sports-hub" 
                element={
                  <ProtectedRoute>
                    <SportsHubPage />
                  </ProtectedRoute>
                } 
              />
              {/* 문서·레이아웃 기준 URL `/sports` — 종목 없는 루트 (이전 미등록으로 404) */}
              <Route
                path="/sports"
                element={
                  <ProtectedRoute>
                    <SportsActivityPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sports/match"
                element={
                  <ProtectedRoute>
                    <SportsMatchPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sports/map"
                element={
                  <ProtectedRoute>
                    <SportsMapPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/home"
                element={
                  <ProtectedRoute>
                    <HomeEntry />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/play"
                element={
                  <ProtectedWithAvatar>
                    <PlayPage />
                  </ProtectedWithAvatar>
                }
              />
              <Route
                path="/game"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<div className="p-8 text-center text-slate-500">즉시 플레이 불러오는 중…</div>}>
                      <QuickPlayPage />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/matchmaking"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<div className="p-8 text-center text-slate-500">매치 찾기 불러오는 중…</div>}>
                      <MatchmakingQueuePage />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/game/session/:sessionId"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<div className="p-8 text-center text-slate-500">게임 세션 불러오는 중…</div>}>
                      <GameSessionPage />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route path="/leaderboards" element={<Navigate to="/play" replace />} />
              <Route path="/rewards" element={<Navigate to="/me" replace />} />
              <Route
                path="/home/:homeRole"
                element={
                  <ProtectedRoute>
                    <HomeByRolePage />
                  </ProtectedRoute>
                }
              />
              <Route path="/home-tts-test" element={<HomeNewTest />} />
              <Route path="/home-dashboard" element={<HomeDashboard />} />
              <Route path="/app" element={<Navigate to="/home" replace />} />
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute>
                    <PlatformNotificationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile/:userId"
                element={
                  <ProtectedRoute>
                    <PublicProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route path="/organization/:orgSlug" element={<OrganizationPublicPage />} />
              <Route path="/app/market/map" element={<LegacyAppMarketMapRedirect />} />
              <Route
                path="/sports/:sport/activity"
                element={
                  <ProtectedRoute>
                    <SportActivityListPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sports/:sport/recruit/create"
                element={
                  <ProtectedWithAvatar>
                    <RecruitCreatePage />
                  </ProtectedWithAvatar>
                }
              />
              <Route
                path="/sports/:sport/recruit/:postId"
                element={<SportRecruitPostCanonicalRedirect />}
              />
              <Route
                path="/sports/:sport/match/create"
                element={
                  <ProtectedWithAvatar>
                    <MatchCreatePage />
                  </ProtectedWithAvatar>
                }
              />
              <Route
                path="/sports/:sport/team/create"
                element={
                  <ProtectedWithAvatar>
                    <TeamCreate />
                  </ProtectedWithAvatar>
                }
              />
              <Route
                path="/sports/:sport/team/create/next"
                element={
                  <ProtectedWithAvatar>
                    <TeamCreateStep2 />
                  </ProtectedWithAvatar>
                }
              />
              <Route
                path="/sports/:sport/team/create/complete"
                element={
                  <ProtectedWithAvatar>
                    <TeamCreateStep3 />
                  </ProtectedWithAvatar>
                }
              />
              <Route
                path="/sports/:sport"
                element={<SportHubPage />}
              />
              <Route path="/recruit/create" element={<Navigate to="/sports/soccer/recruit/create" replace />} />
              <Route path="/recruit/:id" element={<RecruitPathRedirect />} />
              <Route path="/team/create" element={<TeamCreateCanonicalRedirect />} />
              {/* 팀 탐색 — 반드시 `/team/:teamId` 보다 위에 두어 search가 팀 ID로 오인되지 않게 */}
              <Route
                path="/team/search"
                element={
                  <ProtectedRoute>
                    <Suspense
                      fallback={
                        <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
                          불러오는 중…
                        </div>
                      }
                    >
                      <TeamSearchPage />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              {/* 페이지 역할 기준 라우트: market / category / activity */}
              <Route
                path="/activity/*"
                element={
                  <ProtectedRoute>
                    <ActivityRouter />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/team/:teamId/public"
                element={
                  <Suspense
                    fallback={
                      <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
                        불러오는 중…
                      </div>
                    }
                  >
                    <TeamPublicProfilePage />
                  </Suspense>
                }
              />
              <Route
                path="/team/:teamId/overview"
                element={
                  <ProtectedRoute>
                    <RequireAvatarOnboarding>
                    <TeamGuard>
                      <TeamOverviewPushRedirect />
                    </TeamGuard>
                    </RequireAvatarOnboarding>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/team/:teamId/activities/:activityId"
                element={
                  <ProtectedRoute>
                    <RequireAvatarOnboarding>
                    <TeamGuard>
                      <TeamActivityPushRedirect />
                    </TeamGuard>
                    </RequireAvatarOnboarding>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/team/:teamId/billing/success"
                element={
                  <ProtectedRoute>
                    <RequireAvatarOnboarding>
                    <TeamGuard>
                      <TeamBillingSuccessPage />
                    </TeamGuard>
                    </RequireAvatarOnboarding>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/team/:teamId/billing/fail"
                element={
                  <ProtectedRoute>
                    <RequireAvatarOnboarding>
                    <TeamGuard>
                      <TeamBillingFailPage />
                    </TeamGuard>
                    </RequireAvatarOnboarding>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/team/:teamId"
                element={
                  <ProtectedRoute>
                    <RequireAvatarOnboarding>
                    <TeamGuard>
                      <TeamHome />
                    </TeamGuard>
                    </RequireAvatarOnboarding>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/team/:teamId/lineup"
                element={
                  <ProtectedRoute>
                    <RequireAvatarOnboarding>
                    <TeamGuard>
                      <TeamLineupPage />
                    </TeamGuard>
                    </RequireAvatarOnboarding>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/team/:teamId/lineup/list"
                element={
                  <ProtectedRoute>
                    <RequireAvatarOnboarding>
                    <TeamGuard>
                      <TeamLineupListPage />
                    </TeamGuard>
                    </RequireAvatarOnboarding>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/team/:teamId/lineup/:lineupId"
                element={
                  <ProtectedRoute>
                    <RequireAvatarOnboarding>
                    <TeamGuard>
                      <TeamLineupDetailPage />
                    </TeamGuard>
                    </RequireAvatarOnboarding>
                  </ProtectedRoute>
                }
              />
              {/* 레거시 라인업 경로 호환: /teams/... -> /team/... */}
              <Route path="/teams/:teamId/lineups" element={<Navigate to="/team/:teamId/lineup/list" replace />} />
              <Route path="/teams/:teamId/lineup" element={<Navigate to="/team/:teamId/lineup" replace />} />
              <Route path="/teams/:teamId/lineup/list" element={<Navigate to="/team/:teamId/lineup/list" replace />} />
              <Route
                path="/teams/:teamId/lineups/:lineupId"
                element={<Navigate to="/team/:teamId/lineup/:lineupId" replace />}
              />
              <Route
                path="/my-teams"
                element={
                  <ProtectedWithAvatar>
                    <MyTeamsPage />
                  </ProtectedWithAvatar>
                }
              />
              {/* TeamGuard `needTeam` → 팀 선택 (문서화된 경로, 라우트 누락 시 404) */}
              <Route
                path="/select-team"
                element={
                  <ProtectedWithAvatar>
                    <SelectTeamPage />
                  </ProtectedWithAvatar>
                }
              />
              {/* 레거시·내비: `/teams` 단독은 라우트 없어 404 → 내 팀 목록으로 통일 */}
              <Route path="/teams" element={<Navigate to="/my-teams" replace />} />
              <Route
                path="/teams/find"
                element={
                  <ProtectedRoute>
                    <Suspense
                      fallback={
                        <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
                          불러오는 중…
                        </div>
                      }
                    >
                      <TeamSearchPage />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              {/* 레거시 대회 허브 경로를 Activity 허브로 정규화 */}
              <Route path="/tournaments" element={<Navigate to="/activity/tournaments" replace />} />
              <Route path="/tournaments/*" element={<Navigate to="/activity/tournaments" replace />} />
              <Route
                path="/teams/:teamId/manage"
                element={
                  <ProtectedRoute>
                    <RequireAvatarOnboarding>
                    <TeamGuard>
                      <CaptainOnlyRoute>
                        <TeamManagePage />
                      </CaptainOnlyRoute>
                    </TeamGuard>
                    </RequireAvatarOnboarding>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teams/:teamId/invite"
                element={
                  <ProtectedWithAvatar>
                    <TeamInvitePage />
                  </ProtectedWithAvatar>
                }
              />
              <Route
                path="/teams/:teamId/join"
                element={
                  <ProtectedWithAvatar>
                    <TeamJoinPage />
                  </ProtectedWithAvatar>
                }
              />
              <Route
                path="/teams/:teamId/play"
                element={
                  <Suspense
                    fallback={
                      <div className="mx-auto max-w-lg p-8 text-center text-slate-500">플레이 라운지 불러오는 중…</div>
                    }
                  >
                    <TeamPlayPage />
                  </Suspense>
                }
              />
              <Route
                path="/teams/:teamId/cash-book"
                element={
                  <ProtectedRoute>
                    <RequireAvatarOnboarding>
                    <TeamGuard>
                      <CaptainOnlyRoute>
                        <Suspense
                          fallback={<div className="mx-auto max-w-lg p-8 text-center text-slate-500">로딩 중…</div>}
                        >
                          <TeamCashBookFullLedgerPage />
                        </Suspense>
                      </CaptainOnlyRoute>
                    </TeamGuard>
                    </RequireAvatarOnboarding>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teams/:teamId/games"
                element={
                  <ProtectedWithAvatar>
                    <Suspense
                      fallback={<div className="mx-auto max-w-lg p-8 text-center text-slate-500">로딩 중…</div>}
                    >
                      <TeamGamesPage />
                    </Suspense>
                  </ProtectedWithAvatar>
                }
              />
              <Route
                path="/teams/:teamId/games/create"
                element={
                  <ProtectedWithAvatar>
                    <Suspense
                      fallback={<div className="mx-auto max-w-lg p-8 text-center text-slate-500">로딩 중…</div>}
                    >
                      <TeamGameCreatePage />
                    </Suspense>
                  </ProtectedWithAvatar>
                }
              />
              <Route
                path="/teams/:teamId/games/:gameId/edit"
                element={
                  <ProtectedWithAvatar>
                    <Suspense
                      fallback={<div className="mx-auto max-w-lg p-8 text-center text-slate-500">로딩 중…</div>}
                    >
                      <TeamGameEditPage />
                    </Suspense>
                  </ProtectedWithAvatar>
                }
              />
              <Route
                path="/teams/:teamId/games/:gameId/players"
                element={
                  <ProtectedWithAvatar>
                    <Suspense
                      fallback={<div className="mx-auto max-w-lg p-8 text-center text-slate-500">로딩 중…</div>}
                    >
                      <GamePlayerStatsPage />
                    </Suspense>
                  </ProtectedWithAvatar>
                }
              />
              <Route
                path="/teams/:teamId/games/:gameId/participation"
                element={
                  <ProtectedWithAvatar>
                    <Suspense
                      fallback={<div className="mx-auto max-w-lg p-8 text-center text-slate-500">로딩 중…</div>}
                    >
                      <TeamGameParticipationPage />
                    </Suspense>
                  </ProtectedWithAvatar>
                }
              />
              <Route path="/teams/:teamId" element={<TeamsLegacyRedirect />} />
              <Route
                path="/join"
                element={
                  <ProtectedWithAvatar>
                    <JoinPage />
                  </ProtectedWithAvatar>
                }
              />
              <Route
                path="/activity/schedule/create"
                element={
                  <ProtectedWithAvatar>
                    <ScheduleCreatePage />
                  </ProtectedWithAvatar>
                }
              />
              <Route
                path="/activity/events"
                element={
                  <ProtectedRoute>
                    <EventsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/activity/events/:id"
                element={
                  <ProtectedRoute>
                    <ScheduleDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/activity/team"
                element={
                  <ProtectedRoute>
                    <TeamList />
                  </ProtectedRoute>
                }
              />
              <Route path="/market" element={<Navigate to="/app/market" replace />} />
              <Route path="/market/create" element={<Navigate to="/sports/soccer/market/create" replace />} />
              <Route path="/market/:sport" element={<MarketCategoryPage />} />
              <Route
                path="/market/lost-map"
                element={
                  <ProtectedRoute>
                    <LostMapPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/app/homepage" element={<HomePage />} />
              <Route path="/app/facility" element={<Facility />} />
              <Route path="/app/facility/:id" element={<FacilityDetail />} />
              <Route path="/app/facility/:id/booking" element={<BookingForm />} />
              <Route path="/app/team" element={<TeamList />} />
              <Route path="/app/team/:id" element={<TeamDetail />} />
              <Route path="/app/event" element={<EventList />} />
              <Route
                path="/app/favorites"
                element={
                  <CenterLayout>
                    <FavoriteList />
                  </CenterLayout>
                }
              />
              <Route
                path="/app/chat/:id"
                element={
                  <ProtectedRoute>
                    <ChatRoom />
                  </ProtectedRoute>
                }
              />
              {/* chatRooms 전용 (모집 teamRecruit_* · 팀 · 마켓 room 등). 거래 1:1 스레드는 /app/chat → ChatRoom(chats/) */}
              <Route
                path="/chat/:chatRoomId"
                element={
                  <ProtectedRoute>
                    <ChatPage />
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/me"
                element={
                  <ProtectedRoute>
                    <MePage />
                  </ProtectedRoute>
                }
              />
              <Route path="/app/me" element={<Navigate to="/me" replace />} />
              <Route
                path="/coach/dashboard/:teamId"
                element={
                  <ProtectedRoute>
                    <CoachDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/me/settings"
                element={
                  <ProtectedRoute>
                    <SettingsPage />
                  </ProtectedRoute>
                } 
              />
              <Route path="/app/settings" element={<Navigate to="/me/settings" replace />} />
              <Route path="/settings" element={<Navigate to="/me/settings" replace />} />
              <Route path="/app/assistant" element={<AssistantPanel />} />
              <Route path="/app/fcm-test" element={<FcmTestPage />} />
              <Route path="/app/test/fcm" element={<FCMTest />} />
              <Route path="/app/dev/portal" element={<DeveloperPortal />} />
              {/* 🔥 voice-map 라우트: MainLayout 안에서 상단 헤더와 하단 네비게이션 표시 */}
              <Route path="/voice-map" element={<VoiceMapSearch />} />
              <Route path="/voice-map-simple" element={<VoiceMapPageSimple />} />
              <Route path="/voice" element={<VoiceMap />} />
              <Route path="/voice-map-dashboard" element={<VoiceMapDashboard />} />
              <Route
                path="/sports/:sport/market/create"
                element={
                  <ProtectedRoute>
                    <MarketCreatePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sports/:sport/market/ai-create"
                element={
                  <ProtectedRoute>
                    <MarketAddPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/trade/create" element={<Navigate to="/sports/soccer/market/create" replace />} />
              {/* 팀 경기 매칭 (matches 컬렉션) — /match/create 등 링크 대상 */}
              <Route
                path="/match"
                element={
                  <ProtectedRoute>
                    <MatchListPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/match/create" element={<Navigate to="/sports/soccer/match/create" replace />} />
              <Route
                path="/match/:id"
                element={
                  <ProtectedRoute>
                    <MatchDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/match/success"
                element={
                  <ProtectedRoute>
                    <MatchJoinSuccessPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/match/payment/success"
                element={
                  <ProtectedRoute>
                    <MatchJoinPaymentSuccessPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/match/payment/fail"
                element={
                  <ProtectedRoute>
                    <MatchJoinPaymentFailPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* 📌 마켓: canonical 상세 `/sports/:sport/market/:postId` + 레거시 `/app/market/*` + 지도 `/market/map` (MainLayout 밖 → 헤더 단일·지도 몰입) */}
            <Route element={<PageWrapper />}>
              <Route path="/market/map" element={<MarketLayout />}>
                <Route index element={<MarketMapPage />} />
              </Route>
              <Route path="/sports/:sport/market" element={<MarketLayout />}>
                <Route index element={<MarketList />} />
                <Route path=":postId" element={<ProductDetail />} />
              </Route>
              <Route path="/app/market" element={<MarketLayout />}>
                <Route index element={<MarketPage />} />
                <Route path=":id" element={<AppMarketPostCanonicalRedirect />} />
                <Route path="create" element={<MarketCreatePage />} />
                <Route path="edit/:id" element={<MarketAddPage />} />
                <Route path="ai-create" element={<MarketAddPage />} />
                <Route path="create-ai" element={<MarketCreate_AI />} />
                <Route path="reviews" element={<MarketReviewDashboard />} />
                <Route path="reviews/heatmap" element={<ReviewHeatmapDashboard />} />
                <Route path="forecast" element={<SalesForecastDashboard />} />
                <Route path="reports" element={<MarketReportsPage />} />
                <Route path="voice" element={<TTSAudioPanel />} />
                <Route path="dashboard" element={<MarketReportDashboard />} />
                <Route path="report" element={<MarketReportAIRouter />} />
              </Route>
            </Route>

            {/* 🔥 관리자(admin) 전용 라우트 - MainLayout 밖으로 분리 (보호된 라우트) */}
            <Route path="/admin">
              <Route 
                index 
                element={
                  <ProtectedRoute>
                    <AdminHome />
                  </ProtectedRoute>
                } 
              />
              <Route path="insights" element={<InsightsDashboard />} />
              <Route path="console" element={<AiConsole />} />
              <Route path="reports" element={<ReportDashboardPage />} />
              <Route path="ops-3d" element={<AIOps3DConsole />} />
              <Route
                path="mrr"
                element={
                  <ProtectedRoute>
                    <MRRDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="billing-analytics"
                element={
                  <ProtectedRoute>
                    <BillingAnalyticsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="billing-cohort"
                element={
                  <ProtectedRoute>
                    <BillingCohortPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* 🔥 /app/admin/* 라우트들도 MainLayout 밖으로 분리 */}
            <Route path="/app/admin">
              <Route
                path="legacy-home"
                element={
                  <ProtectedRoute>
                    <AdminHomeLegacy />
                  </ProtectedRoute>
                }
              />
              <Route path="home" element={<AdminHome />} />
              <Route path="dashboard" element={<MarketReportDashboard />} />
              <Route path="console" element={<AdminConsole />} />
              <Route path="auto-insights" element={<AutoInsights />} />
              <Route path="geo" element={<GeoDashboard />} />
              <Route path="insights" element={<Insights />} />
              <Route path="insights-page" element={<InsightsPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="reports/dashboard" element={<ReportDashboardPage />} />
              <Route path="ai-insights/:reportId" element={<AIInsightsPage />} />
              <Route path="ai-reports" element={<AIReportsDashboard />} />
              <Route path="team/:teamId" element={<TeamDashboardPage />} />
              <Route path="reports-history" element={<AdminReportHistory />} />
              <Route path="voice" element={<AdminVoiceDashboard />} />
              <Route path="report-dashboard" element={<ReportDashboard />} />
              <Route path="monthly-reports" element={<AdminMonthlyDashboard />} />
              <Route path="team-trends" element={<AdminTeamTrends />} />
              <Route path="global-quality" element={<GlobalQualityCenter />} />
              <Route path="ops-center" element={<OpsCenter />} />
              <Route path="governance" element={<GovernanceDashboard />} />
              <Route path="knowledge-graph" element={<KnowledgeGraph />} />
              <Route path="insights-center" element={<InsightsCenter />} />
              <Route path="insight-review" element={<InsightReview />} />
              <Route path="feedback-center" element={<FeedbackCenter />} />
              <Route path="transparency" element={<Transparency />} />
              <Route path="compliance" element={<ComplianceCenter />} />
              <Route path="governance-portal" element={<GovernancePortal />} />
              <Route path="org-billing" element={<OrgBillingCenter />} />
              <Route path="mrr" element={<Navigate to="/admin/mrr" replace />} />
              <Route path="billing-analytics" element={<Navigate to="/admin/billing-analytics" replace />} />
              <Route path="billing-cohort" element={<Navigate to="/admin/billing-cohort" replace />} />
              <Route path="governance-console" element={<AdminGovernanceConsole />} />
              <Route path="chaos-testing" element={<ChaosTesting />} />
              <Route path="pilot-console" element={<PilotConsole />} />
              <Route path="launch-readiness" element={<LaunchReadiness />} />
              <Route path="sre-dashboard" element={<SREDashboard />} />
              <Route path="growth-console" element={<GrowthConsole />} />
              <Route path="performance" element={<AdminPerformanceDashboard />} />
            </Route>

            {/* /app/dashboard도 MainLayout 밖으로 분리 */}
            <Route path="/app/dashboard" element={<AdminDashboard />} />
            <Route path="/ops/mrr" element={<Navigate to="/admin/mrr" replace />} />

            {/* 오프라인 페이지 */}
            <Route path="/offline" element={<OfflinePage />} />

            <Route path="*" element={<NoMatch />} />
          </Routes>
        </Suspense>
        {/* PWA 관련 컴포넌트 */}
        <OfflineIndicator />
        <PWAInstallPrompt />
        <PWAUpdatePrompt onUpdate={handlePWAUpdate} />
        <Toaster richColors position="top-center" closeButton />
      </AuthProvider>
    </ErrorBoundary>
  );
}
