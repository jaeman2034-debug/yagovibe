import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Suspense, lazy, useEffect, useRef } from "react";
import { AuthProvider } from "./context/AuthProvider";
import { getRedirectResult } from "firebase/auth";
import { auth, db } from "./lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { ProtectedRoute } from "./components/ProtectedRoute";
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
// 🔥 익명 로그인 보장 (업로드 문제 해결) - main.tsx에서 처리하므로 여기서는 제거

// Lazy loading으로 성능 최적화
const StartScreen = lazy(() => import("./pages/start/StartScreen"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const SignupPage = lazy(() => import("./pages/SignupPage"));
const PhoneLoginPage = lazy(() => import("./pages/PhoneLoginPage"));
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
const InAppPage = lazy(() => import("./pages/InAppPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const DebugPage = lazy(() => import("./pages/DebugPage"));
const MatchListPage = lazy(() => import("./pages/match/MatchListPage"));
const MatchCreatePage = lazy(() => import("./pages/match/MatchCreatePage"));
const MatchDetailPage = lazy(() => import("./pages/match/MatchDetailPage"));

// 🔥 인앱 브라우저/WebView 감지 및 Chrome 리다이렉트 컴포넌트
// 🎯 당근마켓 방식: WebView에서는 Firebase Auth가 제대로 작동하지 않으므로 Chrome으로 유도
function InAppBrowserRedirect() {
  const location = useLocation();

  useEffect(() => {
    // 🔍 디버깅: 인앱 감지 실행 확인
    console.log("🟥 [InAppBrowserRedirect] 인앱 감지 실행됨", {
      pathname: location.pathname,
      search: location.search,
      fullPath: location.pathname + location.search,
    });
    
    // /in-app 페이지에서는 리다이렉트하지 않음
    if (location.pathname === "/in-app") {
      console.log("🟨 [InAppBrowserRedirect] /in-app 페이지 - 감지 스킵");
      return;
    }

    // 🔥 로그인 플로우 중에는 인앱 브라우저 감지 비활성화 (Firebase Auth 중단 방지)
    const isLoginFlow = 
      location.pathname === "/start" ||
      location.pathname === "/login" || 
      location.pathname === "/signup" ||
      location.pathname.includes("/__/auth/") ||
      location.search.includes("authType=") ||
      location.search.includes("apiKey=") ||
      location.search.includes("mode=signIn") ||
      location.search.includes("mode=signUp") ||
      location.search.includes("redirect") ||
      location.search.includes("providerId=");
    
    if (isLoginFlow) {
      console.log("🟩 [InAppBrowserRedirect] 로그인 예외 처리 적용됨 - 인앱 브라우저 감지 비활성화", {
        pathname: location.pathname,
        search: location.search,
        isLogin: location.pathname === "/login",
        isSignup: location.pathname === "/signup",
        hasAuthPath: location.pathname.includes("/__/auth/"),
        hasAuthType: location.search.includes("authType="),
        hasApiKey: location.search.includes("apiKey="),
        hasMode: location.search.includes("mode="),
        hasRedirect: location.search.includes("redirect"),
        hasProviderId: location.search.includes("providerId="),
      });
      return;
    }

    // 🔥 강화된 WebView/인앱 브라우저 감지 로직
    const ua = navigator.userAgent.toLowerCase();
    const fullUA = navigator.userAgent;
    
    // 1. User Agent 기반 감지
    const isInAppByUA =
      ua.includes("kakaotalk") ||
      ua.includes("instagram") ||
      ua.includes("naver") ||
      ua.includes("fb") ||
      ua.includes("facebook") ||
      ua.includes("line") ||
      ua.includes("daum") ||
      ua.includes("band") ||
      ua.includes("whale") ||
      ua.includes("samsungbrowser") ||
      // WebView 감지 (가장 중요!)
      (ua.includes("wv") && !ua.includes("chrome")) || // Android WebView
      /(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(fullUA) || // iOS WebView
      /Android.*wv/i.test(fullUA) || // Android WebView
      (ua.includes("version/") && ua.includes("mobile") && !ua.includes("safari"));

    // 2. Window 크기 기반 감지 (더 엄격하게)
    const isStandalone = (window.navigator as any).standalone === true;
    const heightDiff = window.outerHeight - window.innerHeight;
    const widthDiff = window.outerWidth - window.innerWidth;
    
    // 일반 Chrome 브라우저는 제외 (Chrome User Agent 확인)
    const isChrome = ua.includes('chrome') && !ua.includes('edg') && !ua.includes('opr');
    const isSafari = ua.includes('safari') && !ua.includes('chrome');
    
    // Window 크기 기반 감지는 더 엄격하게 (일반 브라우저 제외)
    const isInAppBySize = 
      !isChrome && !isSafari && (
        heightDiff > 200 || // 더 큰 임계값
        (window.outerWidth === 0 && window.innerWidth > 0) ||
        (heightDiff === 0 && widthDiff === 0 && !isStandalone && window.innerWidth < 400)
      );

    // 3. 저장소 접근 제한 감지 (WebView 특성) - 더 엄격하게
    const isStorageRestricted = 
      !isChrome && !isSafari && // Chrome/Safari는 제외
      (typeof indexedDB === 'undefined' || indexedDB === null) &&
      (typeof localStorage === 'undefined' || localStorage === null);

    // 4. 최종 판단 (Chrome/Safari는 제외)
    const isInApp = (isInAppByUA || (!isStandalone && isInAppBySize) || isStorageRestricted) && !isChrome && !isSafari;

    // 🔥 개발 환경(localhost)에서는 인앱 브라우저 감지 비활성화
    const isLocalhost = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' ||
                       window.location.hostname.includes('localhost');
    
    if (isLocalhost) {
      console.log("🔧 [React] 개발 환경 - localhost에서 실행 중, 인앱 브라우저 감지 비활성화");
      return; // 개발 환경에서는 감지하지 않음 (undefined 반환)
    }

    // 🔍 디버깅 정보 (로그인 플로우가 아닐 때만 출력)
    console.log("🔍 [React] 인앱 브라우저/WebView 감지:", {
      userAgent: fullUA,
      isInAppByUA,
      isInAppBySize,
      isStorageRestricted,
      isStandalone,
      isInApp,
      indexedDB: typeof indexedDB !== 'undefined' ? '✅' : '❌',
      localStorage: typeof localStorage !== 'undefined' ? '✅' : '❌'
    });

    if (isInApp) {
      console.log("🚨 [React] WebView/인앱 브라우저 감지됨 - Chrome으로 리다이렉트");
      console.log("📋 이유: WebView에서는 Firebase Auth 로그인 유지가 불안정합니다.");
      console.log("✅ 해결: Chrome에서 열면 모든 기능이 정상 작동합니다.");
      // 즉시 리다이렉트 (replace로 히스토리 남기지 않음)
      window.location.replace("/in-app");
    } else {
      console.log("✅ [React] 일반 브라우저로 감지됨 - 정상 진행");
    }
  }, [location.pathname]);

  return null;
}

export default function App() {
  useGATrack();
  useAutoGAEvents();
  const navigate = useNavigate();
  const location = useLocation();
  
  // 🔍 디버깅: App.tsx 마운트 확인
  useEffect(() => {
    console.log("🟦 [App.tsx] App.tsx mounted at path:", location.pathname, location.search);
  }, [location.pathname, location.search]);

  // 🔥 Google OAuth Redirect 결과 처리 (모바일 환경에서 redirect 방식 사용 시 필요)
  const isProcessing = useRef(false);
  
  useEffect(() => {
    const handleRedirectResult = async () => {
      // 이미 처리 중이면 중복 실행 방지
      if (isProcessing.current) {
        console.log("⚠️ [App] Redirect 결과 이미 처리 중, 중복 실행 방지");
        return;
      }
      isProcessing.current = true;

      try {
        const result = await getRedirectResult(auth);
        if (result) {
          console.log("✅ [App] Google OAuth Redirect 로그인 성공:", {
            userEmail: result.user.email,
            userUid: result.user.uid,
            providerId: result.providerId,
          });
          
          // 🔥 Firestore에 사용자 프로필이 없으면 생성
          const userDocRef = doc(db, "users", result.user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (!userDoc.exists()) {
            console.log("📝 [App] Firestore에 사용자 프로필 생성");
            
            // 위치 정보 가져오기
            let location = "위치 정보 없음";
            try {
              if (navigator.geolocation) {
                const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                  navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
                });
                location = `lat:${pos.coords.latitude.toFixed(4)}, lng:${pos.coords.longitude.toFixed(4)}`;
              }
            } catch (err) {
              console.warn("⚠️ [App] 위치 정보 가져오기 실패:", err);
            }
            
            // Firestore에 프로필 생성
            await setDoc(userDocRef, {
              uid: result.user.uid,
              email: result.user.email,
              displayName: result.user.displayName || result.user.email?.split("@")[0] || "사용자",
              photoURL: result.user.photoURL || null,
              location,
              aiProfile: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }, { merge: true });
            
            console.log("✅ [App] Firestore 사용자 프로필 생성 완료");
          } else {
            console.log("✅ [App] Firestore에 사용자 프로필이 이미 존재함");
          }
          
          // 로그인 성공 시 홈으로 이동
          navigate("/sports-hub", { replace: true });
        } else {
          console.log("ℹ️ [App] Redirect 결과 없음 (정상 - 일반 페이지 로드 또는 팝업 방식 사용)");
        }
      } catch (error: any) {
        console.error("❌ [App] Google OAuth Redirect 오류:", error);
        // 오류 발생 시 로그인 페이지로 리다이렉트하지 않음 (사용자가 직접 재시도할 수 있도록)
      } finally {
        isProcessing.current = false;
      }
    };

    handleRedirectResult();
  }, [navigate]);

  // 🔥 푸시 알림 클릭 시 라우팅 처리
  useEffect(() => {
    const handlePushNotificationNavigate = (event: CustomEvent<{ route: string }>) => {
      const route = event.detail.route;
      console.log("🔥 [App] 푸시 알림 클릭 → 라우팅:", route);
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
        <InAppBrowserRedirect />
        <Suspense fallback={<div className="p-6 text-center text-gray-500">로딩 중...</div>}>
          <Routes>
            {/* 🔥 인앱 브라우저 리다이렉트 페이지 */}
            <Route path="/in-app" element={<InAppPage />} />
            
            {/* 인증/시작 카드형 전용 */}
            <Route element={<CenterLayout />}>
              <Route path="/start" element={<StartScreen />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/login/phone" element={<PhoneLoginPage />} />
            </Route>

            {/* 🔥 디버그 패널 (테스트 모드 전용) */}
            <Route path="/debug" element={<DebugPage />} />

            {/* 앱 진입 → 스타트 스크린 (로그인/회원가입/게스트 선택) */}
            <Route path="/" element={<Navigate to="/start" replace />} />

            {/* 메인 앱 대시보드 전용 - MainLayout 적용 (보호된 라우트) */}
            <Route element={<MainLayout />}>
              <Route 
                path="/sports-hub" 
                element={
                  <ProtectedRoute>
                    <SportsHubPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/home" 
                element={
                  <ProtectedRoute>
                    <HomeNew />
                  </ProtectedRoute>
                } 
              />
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
              <Route 
                path="/app/settings" 
                element={
                  <ProtectedRoute>
                    <SettingsPage />
                  </ProtectedRoute>
                } 
              />
              <Route path="/app/assistant" element={<AssistantPanel />} />
              <Route path="/app/fcm-test" element={<FcmTestPage />} />
              <Route path="/app/test/fcm" element={<FCMTest />} />
              <Route path="/app/dev/portal" element={<DeveloperPortal />} />
              {/* 🔥 voice-map 라우트: MainLayout 안에서 상단 헤더와 하단 네비게이션 표시 */}
              <Route path="/voice-map" element={<VoiceMapSearch />} />
              <Route path="/voice-map-simple" element={<VoiceMapPageSimple />} />
              <Route path="/voice" element={<VoiceMap />} />
              <Route path="/voice-map-dashboard" element={<VoiceMapDashboard />} />
              {/* 팀 경기 매칭 (matches 컬렉션) — /match/create 등 링크 대상 */}
              <Route
                path="/match"
                element={
                  <ProtectedRoute>
                    <MatchListPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/match/create"
                element={
                  <ProtectedRoute>
                    <MatchCreatePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/match/:id"
                element={
                  <ProtectedRoute>
                    <MatchDetailPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* 📌 완전히 독립된 MarketLayout - 모든 /app/market 라우트 통합 */}
            <Route element={<PageWrapper />}>
              <Route path="/app/market" element={<MarketLayout />}>
                <Route index element={<MarketPage />} />
                <Route path=":id" element={<ProductDetail />} />
                <Route path="create" element={<MarketAddPage />} />
                <Route path="edit/:id" element={<MarketAddPage />} />
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
