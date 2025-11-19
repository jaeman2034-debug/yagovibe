import { Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import { AuthProvider } from "./context/AuthProvider";
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

// Lazy loading으로 성능 최적화
const StartScreen = lazy(() => import("./pages/start/StartScreen"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const SignupPage = lazy(() => import("./pages/SignupPage"));
const HomePage = lazy(() => import("./pages/HomePage"));
const HomeNew = lazy(() => import("./pages/home/Home"));
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
const TeamList = lazy(() => import("./pages/team/TeamList"));
const TeamDetail = lazy(() => import("./pages/team/TeamDetail"));
const MarketPage = lazy(() => import("./pages/market/MarketPage"));
const MarketCreate_AI = lazy(() => import("./pages/MarketCreate_AI"));
const MarketAddPage = lazy(() => import("./pages/MarketAddPage"));
const MarketReviewDashboard = lazy(() => import("./pages/MarketReviewDashboard"));
const ReviewHeatmapDashboard = lazy(() => import("./pages/ReviewHeatmapDashboard"));
const SalesForecastDashboard = lazy(() => import("./pages/SalesForecastDashboard"));
const MarketReportsPage = lazy(() => import("./pages/ReportsPage"));
const TTSAudioPanel = lazy(() => import("./components/TTSAudioPanel"));
const MarketReportDashboard = lazy(() => import("./components/MarketReportDashboard"));
const ReportDashboardPage = lazy(() => import("./pages/admin/ReportDashboard"));
const MarketReportAIRouter = lazy(() => import("./pages/market/MarketReport_AIRouter"));
const AdminHome = lazy(() => import("./pages/admin/AdminHome"));
const AIReportsDashboard = lazy(() => import("./pages/admin/AIReportsDashboard"));
const ProductDetail = lazy(() => import("./pages/market/ProductDetail"));
const FavoriteList = lazy(() => import("./pages/favorites/FavoriteList"));
const ChatRoom = lazy(() => import("./pages/chat/ChatRoom"));
const OfflinePage = lazy(() => import("./pages/OfflinePage"));
const NoMatch = lazy(() => import("./pages/NoMatch"));

export default function App() {
  useGATrack();
  useAutoGAEvents();

  // PWA 업데이트 핸들러
  const handlePWAUpdate = () => {
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
  };

  return (
    <ErrorBoundary>
      <AuthProvider>
        <Suspense fallback={<div className="p-6 text-center text-gray-500">로딩 중...</div>}>
          <Routes>
            {/* 인증/시작 카드형 전용 */}
            <Route element={<CenterLayout />}>
              <Route path="/start" element={<StartScreen />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
            </Route>

            {/* 메인 앱 대시보드 전용 - MainLayout 적용 */}
            <Route element={<MainLayout />}>
              <Route path="/" element={<Navigate to="/sports-hub" replace />} />
              <Route path="/sports-hub" element={<SportsHubPage />} />
              <Route path="/home" element={<HomeNew />} />
              <Route path="/home-tts-test" element={<HomeNewTest />} />
              <Route path="/home-dashboard" element={<HomeDashboard />} />
              <Route path="/app" element={<Navigate to="/home" replace />} />
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
              <Route path="/app/chat/:id" element={<ChatRoom />} />
              <Route path="/app/assistant" element={<AssistantPanel />} />
              <Route path="/app/fcm-test" element={<FcmTestPage />} />
              <Route path="/app/test/fcm" element={<FCMTest />} />
              <Route path="/app/dev/portal" element={<DeveloperPortal />} />
              <Route path="/voice-map" element={<CenterLayout><VoiceMapSearch /></CenterLayout>} />
              <Route path="/voice-map-simple" element={<CenterLayout><VoiceMapPageSimple /></CenterLayout>} />
              <Route path="/voice" element={<CenterLayout><VoiceMap /></CenterLayout>} />
              <Route path="/voice-map-dashboard" element={<CenterLayout><VoiceMapDashboard /></CenterLayout>} />
            </Route>

            {/* 📌 완전히 독립된 MarketLayout - 모든 /app/market 라우트 통합 */}
            <Route element={<PageWrapper />}>
              <Route path="/app/market" element={<MarketLayout />}>
                <Route index element={<MarketPage />} />
                <Route path=":id" element={<ProductDetail />} />
                <Route path="create" element={<MarketAddPage />} />
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

            {/* 🔥 관리자(admin) 전용 라우트 - MainLayout 밖으로 분리 */}
            <Route path="/admin">
              <Route index element={<AdminHome />} />
              <Route path="insights" element={<InsightsDashboard />} />
              <Route path="console" element={<AiConsole />} />
              <Route path="reports" element={<ReportDashboardPage />} />
              <Route path="ops-3d" element={<AIOps3DConsole />} />
            </Route>

            {/* 🔥 /app/admin/* 라우트들도 MainLayout 밖으로 분리 */}
            <Route path="/app/admin">
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

            {/* 오프라인 페이지 */}
            <Route path="/offline" element={<OfflinePage />} />

            <Route path="*" element={<NoMatch />} />
          </Routes>
        </Suspense>
        {/* PWA 관련 컴포넌트 */}
        <OfflineIndicator />
        <PWAInstallPrompt />
        <PWAUpdatePrompt onUpdate={handlePWAUpdate} />
      </AuthProvider>
    </ErrorBoundary>
  );
}
