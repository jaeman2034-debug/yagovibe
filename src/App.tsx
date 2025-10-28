import { Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import { AuthProvider } from "./context/AuthProvider";
import MainLayout from "./layout/MainLayout";
import ErrorBoundary from "./components/ErrorBoundary.tsx";

// Lazy loading으로 성능 최적화
const StartScreen = lazy(() => import("./pages/start/StartScreen"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const SignupPage = lazy(() => import("./pages/SignupPage"));
const HomePage = lazy(() => import("./pages/HomePage"));
const VoiceSignUp = lazy(() => import("./pages/start/VoiceSignUp"));
const HomeNew = lazy(() => import("./pages/home/Home"));
const VoiceMapSearch = lazy(() => import("./pages/VoiceMapSearch"));
const VoiceMap = lazy(() => import("./pages/voice/VoiceMap"));
const VoiceMapDashboard = lazy(() => import("./pages/voice/VoiceMapDashboard"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminConsole = lazy(() => import("./pages/admin/AdminConsole"));
const AutoInsights = lazy(() => import("./pages/admin/AutoInsights"));
const GeoDashboard = lazy(() => import("./pages/admin/GeoDashboard"));
const Insights = lazy(() => import("./pages/admin/Insights"));
const InsightsPage = lazy(() => import("./pages/admin/InsightsPage"));
const ReportsPage = lazy(() => import("./pages/admin/ReportsPage"));
const ReportDashboard = lazy(() => import("./pages/admin/ReportDashboard"));
const AdminMonthlyDashboard = lazy(() => import("./pages/AdminMonthlyDashboard"));
const AdminTeamTrends = lazy(() => import("./pages/AdminTeamTrends"));
const FcmTestPage = lazy(() => import("./pages/FcmTestPage"));
const FCMTest = lazy(() => import("./pages/test/FCMTest"));
const Facility = lazy(() => import("./pages/Facility"));
const FacilityDetail = lazy(() => import("./pages/facility/FacilityDetail"));
const BookingForm = lazy(() => import("./pages/facility/BookingForm"));
const EventList = lazy(() => import("./pages/EventList"));
const TeamList = lazy(() => import("./pages/team/TeamList"));
const TeamDetail = lazy(() => import("./pages/team/TeamDetail"));
const Market = lazy(() => import("./pages/Market"));
const MarketCreate_AI = lazy(() => import("./pages/MarketCreate_AI"));
const ProductDetail = lazy(() => import("./pages/market/ProductDetail"));
const ChatRoom = lazy(() => import("./pages/chat/ChatRoom"));
const NoMatch = lazy(() => import("./pages/NoMatch"));

export default function App() {
  return (
    <div className="w-screen h-screen grid place-items-center bg-white">
      <ErrorBoundary>
        <AuthProvider>
          <Suspense fallback={<div className="p-6 text-center text-gray-500">로딩 중...</div>}>
            <Routes>
              <Route path="/start" element={<StartScreen />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/" element={<MainLayout />}>
                <Route index element={<Navigate to="/start" replace />} />
                <Route path="home" element={<HomeNew />} />
                <Route path="homepage" element={<HomePage />} />
                <Route path="voice-map" element={<VoiceMapSearch />} />
                <Route path="voice" element={<VoiceMap />} />
                <Route path="voice-map-dashboard" element={<VoiceMapDashboard />} />
                <Route path="facility" element={<Facility />} />
                <Route path="facility/:id" element={<FacilityDetail />} />
                <Route path="facility/:id/booking" element={<BookingForm />} />
                <Route path="team" element={<TeamList />} />
                <Route path="team/:id" element={<TeamDetail />} />
                <Route path="event" element={<EventList />} />
                <Route path="market" element={<Market />} />
                <Route path="market/create" element={<MarketCreate_AI />} />
                <Route path="market/:id" element={<ProductDetail />} />
                <Route path="chat/:id" element={<ChatRoom />} />
                <Route path="admin" element={<AdminDashboard />} />
                <Route path="admin/console" element={<AdminConsole />} />
                <Route path="admin/auto-insights" element={<AutoInsights />} />
                <Route path="admin/geo" element={<GeoDashboard />} />
                <Route path="admin/insights" element={<Insights />} />
                <Route path="admin/insights-page" element={<InsightsPage />} />
                <Route path="admin/reports" element={<ReportsPage />} />
                <Route path="admin/report-dashboard" element={<ReportDashboard />} />
                <Route path="admin/monthly-reports" element={<AdminMonthlyDashboard />} />
                <Route path="admin/team-trends" element={<AdminTeamTrends />} />
                <Route path="fcm-test" element={<FcmTestPage />} /> {/* FCM 테스트 페이지 */}
                <Route path="test/fcm" element={<FCMTest />} /> {/* FCM 테스트 페이지 (새 버전) */}
                <Route path="*" element={<NoMatch />} />
              </Route>
            </Routes>
          </Suspense>
        </AuthProvider>
      </ErrorBoundary>
    </div>
  );
}
