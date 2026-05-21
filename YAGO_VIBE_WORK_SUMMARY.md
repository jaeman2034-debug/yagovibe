# 🎯 YAGO VIBE 플랫폼 작업 내용 전체 요약

> 로그인 페이지부터 현재까지의 모든 작업 내용을 카테고리별로 정리

---

## 📋 목차

1. [인증/로그인 시스템](#1-인증로그인-시스템)
2. [음성 명령 시스템 (Speech System)](#2-음성-명령-시스템-speech-system)
3. [UI/UX 컴포넌트](#3-uiux-컴포넌트)
4. [페이지/라우팅](#4-페이지라우팅)
5. [데이터 관리 (Firestore)](#5-데이터-관리-firestore)
6. [Firebase Functions](#6-firebase-functions)
7. [AI 기능](#7-ai-기능)
8. [마켓 시스템](#8-마켓-시스템)
9. [관리자 시스템](#9-관리자-시스템)
10. [유틸리티/헬퍼](#10-유틸리티헬퍼)

---

## 1. 인증/로그인 시스템

### 1.1 핵심 파일
- `src/pages/LoginPage.tsx` - 로그인 페이지
- `src/pages/SignupPage.tsx` - 회원가입 페이지
- `src/pages/PhoneLoginPage.tsx` - 전화번호 로그인
- `src/context/AuthProvider.tsx` - 인증 상태 관리
- `src/components/ProtectedRoute.tsx` - 보호된 라우트
- `src/components/PublicRoute.tsx` - 공개 라우트

### 1.2 주요 기능
- ✅ Firebase Authentication (Popup 방식)
- ✅ 로그인/회원가입 페이지
- ✅ 전화번호 인증
- ✅ 인증 상태 관리 (Context API)
- ✅ 라우트 보호 (ProtectedRoute/PublicRoute)
- ✅ 로그인 "튕김" 현상 해결 (Phase 3)
  - `App.tsx` 조건부 렌더링 제거
  - `AuthProvider` 로딩 상태 최적화
  - 컴포넌트 언마운트/재마운트 방지

### 1.3 해결된 이슈
- ❌ HTTPS 연결 거부 문제 (개발 환경)
- ❌ OAuth 설정 불일치
- ❌ 로그인 중 입력 필드 초기화 (튕김 현상)
- ✅ 데스크톱/모바일 로그인 안정화

---

## 2. 음성 명령 시스템 (Speech System)

### 2.1 Phase 3: 구조 안정화 (튕김 제거)

#### 핵심 파일
- `src/speech/SpeechManager.ts` - 음성 시스템 중앙 관리
- `src/components/VoiceMicButton.tsx` - 마이크 버튼 UI
- `src/speech/SpeechCommandBridge.tsx` - STT → Intent → Action 브리지
- `src/voice/speechEngine.ts` - 브라우저 Speech API 래퍼

#### 주요 기능
- ✅ 단일 진입점 (`SpeechManager.startListeningByUserGesture()`)
- ✅ 1 명령 = 1 액션 = 1 종료 (Invariant B)
- ✅ 데스크톱 완전 차단 (Invariant C)
- ✅ 로그인/라우팅 중 음성 개입 방지
- ✅ 상태 머신 (disabled, idle, listening, error)

#### 해결된 이슈
- ❌ 로그인 중 음성 명령 충돌
- ❌ 페이지 이동 시 음성 지속
- ❌ 데스크톱에서 마이크 권한 요청
- ✅ 모바일 전용 음성 시스템

### 2.2 Phase 4: 데이터 기반 개선 (UNKNOWN 로깅)

#### 핵심 파일
- `src/speech/telemetry.ts` - UNKNOWN 명령 로깅
- `src/speech/intentDispatcher.ts` - Intent 실행

#### 주요 기능
- ✅ UNKNOWN 명령 해시 기반 수집
- ✅ Firestore 텔레메트리 (원문 저장 ❌)
- ✅ 주간 개선 루프 (UNKNOWN → Alias 추가)
- ✅ 블랙리스트 시스템

### 2.3 Phase 5: 출시 봉인 (PROD 안전성)

#### 핵심 파일
- `src/speech/RELEASE_CHECKLIST.md` - 릴리즈 체크리스트
- `src/speech/PHASE5_RELEASE_SEAL.md` - 봉인 가이드
- `scripts/check-release-seal.js` - 자동 점검 스크립트

#### 주요 기능
- ✅ DEV/PROD 완전 분리
- ✅ Eruda 제거 (PROD)
- ✅ 디버그 UI 제거 (PROD)
- ✅ 원문 transcript 저장 금지
- ✅ Firestore 보안 규칙

### 2.4 Phase 6: NLP 전환 (LLM 기반 Intent 파싱)

#### 핵심 파일
- `src/speech/IntentRouter.ts` - Rule → NLP fallback
- `src/speech/nlpParser.ts` - LLM 기반 파서
- `src/speech/ruleParser.ts` - 규칙 기반 파서
- `functions/src/intent.ts` - Edge Function (NLP API)

#### 주요 기능
- ✅ A/B 테스트 (`NLP_RATIO`)
- ✅ Edge Function (프라이버시/비용 통제)
- ✅ 타임아웃 800ms
- ✅ Confidence 게이트 (0.7)
- ✅ 언제든 롤백 가능

### 2.5 Phase 7: 개인화 (Personalized Voice UX)

#### 핵심 파일
- `src/speech/personalization/userProfile.ts` - 사용자 프로필
- `src/speech/personalization/matcher.ts` - 가중치 기반 매칭
- `src/speech/personalization/history.ts` - 최근 사용 히스토리

#### 주요 기능
- ✅ 사용자별 alias 가중치 (+2)
- ✅ 최근 사용 intent 부스트 (+1)
- ✅ Firestore `user_voice_profile` 컬렉션
- ✅ 원문 저장 없음 (intent key + count만)

### 2.6 Phase 8: 추천형 UX (Proactive but Safe)

#### 핵심 파일
- `src/speech/recommendation/guard.ts` - 추천 허용 조건
- `src/speech/recommendation/engine.ts` - 추천 엔진
- `src/speech/recommendation/manager.ts` - 추천 상태 관리

#### 주요 기능
- ✅ 질문형 추천 ("요즘 농구 자주 보시네요. 다시 보여드릴까요?")
- ✅ 하루 2회 제한
- ✅ 24시간 쿨다운 (opt-out)
- ✅ 명령 성공 후 3초 이내만
- ✅ RECOMMEND, CONFIRM_YES, CONFIRM_NO Intent

### 2.7 음성 명령 세트

#### 핵심 파일
- `src/speech/commands/global.ts` - 전역 명령
- `src/speech/commands/sportsHub.ts` - 스포츠 허브 명령
- `src/speech/commands/market.ts` - 마켓 명령
- `src/speech/commands/types.ts` - 명령 타입 정의
- `src/speech/matchCommand.ts` - 명령 매칭 로직

#### 주요 명령
- **네비게이션**: "홈으로", "뒤로", "마켓으로", "지도 보여줘"
- **스포츠 카테고리**: "농구", "축구", "야구", "러닝", "헬스" 등
- **마켓**: "중고 장비", "최신 글", "가격 낮은 순", "인기순"
- **기타**: "멈춰", "중지", "검색 [키워드]"

### 2.8 Intent 시스템

#### 핵심 파일
- `src/speech/intents.ts` - Intent 타입 정의
- `src/speech/intentDispatcher.ts` - Intent 실행

#### Intent 타입
- `NAVIGATE` - 페이지 이동
- `SEARCH` - 검색
- `SCROLL` - 스크롤
- `STOP` - 중지
- `RECOMMEND` - 추천 (실행 ❌)
- `CONFIRM_YES` - 추천 승인
- `CONFIRM_NO` - 추천 거절
- `UNKNOWN` - 알 수 없는 명령

---

## 3. UI/UX 컴포넌트

### 3.1 레이아웃 컴포넌트
- `src/layout/MainLayout.tsx` - 메인 레이아웃
- `src/layout/Header.tsx` - 헤더
- `src/layout/Footer.tsx` - 푸터
- `src/layouts/MarketLayout.tsx` - 마켓 레이아웃
- `src/layouts/CenterLayout.tsx` - 중앙 레이아웃
- `src/layouts/FullWidthLayout.tsx` - 전체 너비 레이아웃
- `src/components/BottomNav.tsx` - 하단 네비게이션

### 3.2 음성 관련 컴포넌트
- `src/components/VoiceMicButton.tsx` - 마이크 버튼 (Phase 3)
- `src/components/VoiceAssistantButton.tsx` - 음성 어시스턴트 버튼 (구버전)
- `src/components/VoiceAssistant_AI.tsx` - AI 음성 어시스턴트
- `src/components/VoiceFeedback.tsx` - 음성 피드백
- `src/components/VoiceFeedbackForm.tsx` - 음성 피드백 폼
- `src/components/VoiceSummaryPlayer.tsx` - 음성 요약 플레이어
- `src/components/VoiceAnalytics.tsx` - 음성 분석
- `src/components/VoiceAdminConsole.tsx` - 음성 관리자 콘솔
- `src/components/VoiceMemoryConsole.tsx` - 음성 메모리 콘솔
- `src/components/VoiceUX/AssistantPanel.tsx` - 어시스턴트 패널

### 3.3 홈/대시보드 컴포넌트
- `src/components/home/AIWelcomeCard.tsx` - AI 환영 카드
- `src/components/home/CategoryGrid.tsx` - 카테고리 그리드
- `src/components/home/QuickReportCard.tsx` - 빠른 리포트 카드
- `src/components/SportsCategoryGrid.tsx` - 스포츠 카테고리 그리드

### 3.4 마켓 컴포넌트
- `src/components/MarketCard.tsx` - 마켓 카드
- `src/components/MarketGrid.tsx` - 마켓 그리드
- `src/components/MarketList.tsx` - 마켓 리스트
- `src/components/MarketToast.tsx` - 마켓 토스트
- `src/components/ProductModal.tsx` - 상품 모달
- `src/components/InteractiveMarketCard.tsx` - 인터랙티브 마켓 카드

### 3.5 리포트 컴포넌트
- `src/components/AIReportCard.tsx` - AI 리포트 카드
- `src/components/AIReportCTA.tsx` - AI 리포트 CTA
- `src/components/ReportChart.tsx` - 리포트 차트
- `src/components/ReportDashboard.tsx` - 리포트 대시보드
- `src/components/ReportExport.tsx` - 리포트 내보내기
- `src/components/ReportPDFButton.tsx` - PDF 버튼
- `src/components/ReportStatsCard.tsx` - 리포트 통계 카드
- `src/components/WeeklyReportPDFCard.tsx` - 주간 리포트 PDF 카드
- `src/components/MonthlyReportCard.tsx` - 월간 리포트 카드

### 3.6 관리자 컴포넌트
- `src/components/admin/AdminVoiceDashboard.tsx` - 관리자 음성 대시보드
- `src/components/admin/BetaFeedbackCard.tsx` - 베타 피드백 카드
- `src/components/admin/ReleaseBoard.tsx` - 릴리즈 보드
- `src/components/AdminAuditCard.tsx` - 관리자 감사 카드
- `src/components/AdminChart.tsx` - 관리자 차트
- `src/components/AdminSummaryCard.tsx` - 관리자 요약 카드
- `src/components/AdminSummaryChart.tsx` - 관리자 요약 차트
- `src/components/AdminVoiceNotifier.tsx` - 관리자 음성 알림

### 3.7 AI 컴포넌트
- `src/components/AIAutoInsightCard.tsx` - AI 자동 인사이트 카드
- `src/components/AIInsightWordCloud.tsx` - AI 인사이트 워드클라우드
- `src/components/AIWeeklySummary.tsx` - AI 주간 요약
- `src/components/AITestComponent.tsx` - AI 테스트 컴포넌트
- `src/components/assistant/AIReportAssistant.tsx` - AI 리포트 어시스턴트

### 3.8 공통 컴포넌트
- `src/components/ErrorBoundary.tsx` - 에러 바운더리
- `src/components/PageWrapper.tsx` - 페이지 래퍼
- `src/components/RouteTransition.tsx` - 라우트 전환
- `src/components/SkeletonCard.tsx` - 스켈레톤 카드
- `src/components/OfflineIndicator.tsx` - 오프라인 표시
- `src/components/PWAInstallPrompt.tsx` - PWA 설치 프롬프트
- `src/components/PWAUpdatePrompt.tsx` - PWA 업데이트 프롬프트
- `src/components/InstallAppButton.tsx` - 앱 설치 버튼
- `src/components/InAppBrowserBlocker.tsx` - 인앱 브라우저 차단

### 3.9 UI 라이브러리 (shadcn/ui)
- `src/components/ui/button.tsx` - 버튼
- `src/components/ui/card.tsx` - 카드
- `src/components/ui/input.tsx` - 입력
- `src/components/ui/label.tsx` - 레이블
- `src/components/ui/badge.tsx` - 배지
- `src/components/ui/alert.tsx` - 알림
- `src/components/ui/tabs.tsx` - 탭
- `src/components/ui/dropdown-menu.tsx` - 드롭다운 메뉴
- `src/components/ui/slider.tsx` - 슬라이더
- `src/components/ui/switch.tsx` - 스위치
- `src/components/ui/progress.tsx` - 진행 표시
- `src/components/ui/skeleton.tsx` - 스켈레톤
- `src/components/ui/separator.tsx` - 구분선
- `src/components/ui/textarea.tsx` - 텍스트 영역
- `src/components/ui/mode-toggle.tsx` - 다크 모드 토글

---

## 4. 페이지/라우팅

### 4.1 인증 페이지
- `src/pages/LoginPage.tsx` - 로그인
- `src/pages/SignupPage.tsx` - 회원가입
- `src/pages/PhoneLoginPage.tsx` - 전화번호 로그인
- `src/pages/start/StartScreen.tsx` - 시작 화면
- `src/pages/start/VoiceSignUp.tsx` - 음성 회원가입

### 4.2 홈/대시보드 페이지
- `src/pages/HomePage.tsx` - 홈 페이지
- `src/pages/home/Home.tsx` - 홈 (신규)
- `src/pages/home/HomeNew.tsx` - 홈 (테스트)
- `src/pages/home/HomeDashboard.tsx` - 홈 대시보드
- `src/pages/SportsHubPage.tsx` - 스포츠 허브

### 4.3 마켓 페이지
- `src/pages/market/MarketPage.tsx` - 마켓 메인
- `src/pages/market/MarketPage_AI_Report.tsx` - 마켓 AI 리포트
- `src/pages/market/MarketPage_AI_Report_Fusion.tsx` - 마켓 AI 리포트 (퓨전)
- `src/pages/market/MarketItemCard.tsx` - 마켓 아이템 카드
- `src/pages/market/ProductCard.tsx` - 상품 카드
- `src/pages/market/ProductDetail.tsx` - 상품 상세
- `src/pages/market/MarketCreate_AI.tsx` - 마켓 생성 (AI)
- `src/pages/market/MarketAIReportCard.tsx` - 마켓 AI 리포트 카드
- `src/pages/market/MarketAIReportPage.tsx` - 마켓 AI 리포트 페이지
- `src/pages/market/MarketReport_AI.tsx` - 마켓 리포트 (AI)
- `src/pages/market/MarketWeeklyReport.tsx` - 마켓 주간 리포트
- `src/pages/MarketAddPage.tsx` - 마켓 추가
- `src/pages/MarketCreate_AI.tsx` - 마켓 생성 (AI)
- `src/pages/MarketReviewDashboard.tsx` - 마켓 리뷰 대시보드

### 4.4 음성/지도 페이지
- `src/pages/voice/VoiceMap.tsx` - 음성 지도
- `src/pages/voice/VoiceMapDashboard.tsx` - 음성 지도 대시보드
- `src/pages/voice/VoiceNavigation.tsx` - 음성 네비게이션
- `src/pages/voice/VoiceAssistant_AI.tsx` - 음성 어시스턴트 (AI)
- `src/pages/VoiceMapPage.tsx` - 음성 지도 페이지
- `src/pages/VoiceMapPageSimple.tsx` - 음성 지도 페이지 (간단)
- `src/pages/VoiceMapSearch.tsx` - 음성 지도 검색

### 4.5 팀/이벤트 페이지
- `src/pages/team/TeamList.tsx` - 팀 목록
- `src/pages/team/TeamDetail.tsx` - 팀 상세
- `src/pages/EventList.tsx` - 이벤트 목록
- `src/pages/TeamBlogPage.tsx` - 팀 블로그

### 4.6 시설 페이지
- `src/pages/Facility.tsx` - 시설 메인
- `src/pages/facility/FacilityDetail.tsx` - 시설 상세
- `src/pages/facility/BookingForm.tsx` - 예약 폼

### 4.7 관리자 페이지
- `src/pages/admin/Dashboard.tsx` - 관리자 대시보드
- `src/pages/admin/AdminConsole.tsx` - 관리자 콘솔
- `src/pages/admin/AdminHome.tsx` - 관리자 홈
- `src/pages/admin/AdminDashboard.tsx` - 관리자 대시보드
- `src/pages/admin/AutoInsights.tsx` - 자동 인사이트
- `src/pages/admin/Insights.tsx` - 인사이트
- `src/pages/admin/InsightsPage.tsx` - 인사이트 페이지
- `src/pages/admin/InsightsDashboard.tsx` - 인사이트 대시보드
- `src/pages/admin/InsightsCenter.tsx` - 인사이트 센터
- `src/pages/admin/ReportsPage.tsx` - 리포트 페이지
- `src/pages/admin/ReportDashboard.tsx` - 리포트 대시보드
- `src/pages/admin/AdminReportsPage.tsx` - 관리자 리포트 페이지
- `src/pages/admin/AdminReportHistory.tsx` - 관리자 리포트 히스토리
- `src/pages/admin/AIReportsDashboard.tsx` - AI 리포트 대시보드
- `src/pages/admin/AIInsightsPage.tsx` - AI 인사이트 페이지
- `src/pages/admin/VoiceDashboard.tsx` - 음성 대시보드
- `src/pages/admin/AdminVoiceDashboard.tsx` - 관리자 음성 대시보드
- `src/pages/admin/AdminPerformanceDashboard.tsx` - 관리자 성능 대시보드
- `src/pages/admin/AdminInsightsPage.tsx` - 관리자 인사이트 페이지
- `src/pages/admin/TeamDashboardPage.tsx` - 팀 대시보드 페이지
- `src/pages/admin/AdminTeamTrends.tsx` - 관리자 팀 트렌드
- `src/pages/admin/GeoDashboard.tsx` - 지리 대시보드
- `src/pages/admin/OpsCenter.tsx` - 운영 센터
- `src/pages/admin/OpsReportCenter.tsx` - 운영 리포트 센터
- `src/pages/admin/GovernanceConsole.tsx` - 거버넌스 콘솔
- `src/pages/admin/GovernanceDashboard.tsx` - 거버넌스 대시보드
- `src/pages/admin/GovernancePortal.tsx` - 거버넌스 포털
- `src/pages/admin/ComplianceCenter.tsx` - 컴플라이언스 센터
- `src/pages/admin/FeedbackCenter.tsx` - 피드백 센터
- `src/pages/admin/KnowledgeGraph.tsx` - 지식 그래프
- `src/pages/admin/Transparency.tsx` - 투명성
- `src/pages/admin/LaunchReadiness.tsx` - 출시 준비
- `src/pages/admin/ChaosTesting.tsx` - 카오스 테스팅
- `src/pages/admin/AutonomousCenter.tsx` - 자율 센터
- `src/pages/admin/PredictiveInsightCenter.tsx` - 예측 인사이트 센터
- `src/pages/admin/GlobalQualityCenter.tsx` - 글로벌 품질 센터
- `src/pages/admin/GrowthConsole.tsx` - 성장 콘솔
- `src/pages/admin/PilotConsole.tsx` - 파일럿 콘솔
- `src/pages/admin/AiConsole.tsx` - AI 콘솔
- `src/pages/admin/AiOrchestratorDashboard.tsx` - AI 오케스트레이터 대시보드
- `src/pages/admin/SREDashboard.tsx` - SRE 대시보드
- `src/pages/admin/OrgBillingCenter.tsx` - 조직 빌링 센터
- `src/pages/admin/InsightReview.tsx` - 인사이트 리뷰

### 4.8 기타 페이지
- `src/pages/SettingsPage.tsx` - 설정
- `src/pages/favorites/FavoriteList.tsx` - 즐겨찾기 목록
- `src/pages/chat/ChatRoom.tsx` - 채팅방
- `src/pages/OfflinePage.tsx` - 오프라인 페이지
- `src/pages/NoMatch.tsx` - 404 페이지
- `src/pages/DebugPage.tsx` - 디버그 페이지
- `src/pages/dev/DeveloperPortal.tsx` - 개발자 포털
- `src/pages/test/FCMTest.tsx` - FCM 테스트
- `src/pages/FcmTestPage.tsx` - FCM 테스트 페이지
- `src/pages/InAppPage.tsx` - 인앱 페이지
- `src/pages/LaunchPage.tsx` - 런치 페이지
- `src/pages/StartPage.tsx` - 시작 페이지
- `src/pages/ReportsPage.tsx` - 리포트 페이지
- `src/pages/ReviewHeatmapDashboard.tsx` - 리뷰 히트맵 대시보드
- `src/pages/SalesForecastDashboard.tsx` - 판매 예측 대시보드

### 4.9 라우팅 설정
- `src/App.tsx` - 메인 라우팅 설정
- `src/core/router.tsx` - 라우터 설정

---

## 5. 데이터 관리 (Firestore)

### 5.1 컬렉션 구조
- `users` - 사용자 정보
- `user_voice_profile` - 사용자 음성 프로필 (Phase 7)
- `voice_telemetry` - 음성 텔레메트리 (Phase 4)
- `voice_metrics` - 음성 메트릭 (Phase 6)
- `voice_suggestions` - 음성 학습 제안 (Phase 6-3)
- `market_items` - 마켓 아이템
- `teams` - 팀 정보
- `events` - 이벤트 정보
- `facilities` - 시설 정보
- `reports` - 리포트 데이터
- `insights` - 인사이트 데이터

### 5.2 보안 규칙
- `firestore.rules` - Firestore 보안 규칙
  - `voice_telemetry`: create만 허용, read/update/delete 차단
  - `user_voice_profile`: 본인만 읽기/쓰기 가능
  - `voice_suggestions`: 관리자만 읽기 가능

### 5.3 데이터 유틸리티
- `src/lib/firebase.ts` - Firebase 초기화
- `src/lib/firestore.ts` - Firestore 헬퍼
- `src/utils/firestoreHelpers.ts` - Firestore 유틸리티

---

## 6. Firebase Functions

### 6.1 음성 관련 Functions
- `functions/src/intent.ts` - NLP Intent 파싱 (Phase 6)
- `functions/src/exports/voice.ts` - 음성 관련 Functions

### 6.2 리포트 Functions
- `functions/src/vibeReport.ts` - AI 리포트 생성
- `functions/src/generateIRSlides.ts` - IR 슬라이드 생성
- `functions/src/slackShare.ts` - Slack 공유

### 6.3 자동화 Functions
- `functions/src/vibeAutoPilot.ts` - 자동 인사이트 생성
- `functions/src/vibeLog.ts` - 로그 저장

---

## 7. AI 기능

### 7.1 AI Core
- `src/core/ai-core.ts` - AI 코어
- `src/features/ai/` - AI 기능

### 7.2 AI 서비스
- `src/api/generateReport.ts` - 리포트 생성
- `src/api/generateInsight.ts` - 인사이트 생성
- `src/api/summarizeReport.ts` - 리포트 요약
- `src/api/voiceReport.ts` - 음성 리포트
- `src/api/generateWeeklyReport.ts` - 주간 리포트 생성
- `src/api/generateWeeklyReport_new.ts` - 주간 리포트 생성 (신규)
- `src/api/callAssistant.ts` - 어시스턴트 호출

### 7.3 AI 컴포넌트
- `src/components/AIAutoInsightCard.tsx` - AI 자동 인사이트
- `src/components/AIInsightWordCloud.tsx` - AI 인사이트 워드클라우드
- `src/components/AIWeeklySummary.tsx` - AI 주간 요약
- `src/components/assistant/AIReportAssistant.tsx` - AI 리포트 어시스턴트

---

## 8. 마켓 시스템

### 8.1 마켓 기능
- 상품 등록/수정/삭제
- 이미지 업로드 (Firebase Storage)
- Vision API 이미지 분석
- 음성 검색
- 실시간 채팅 (Firestore)
- 카테고리/태그 자동 생성

### 8.2 마켓 컴포넌트
- `src/components/MarketCard.tsx` - 마켓 카드
- `src/components/MarketGrid.tsx` - 마켓 그리드
- `src/components/MarketList.tsx` - 마켓 리스트
- `src/components/ProductModal.tsx` - 상품 모달

---

## 9. 관리자 시스템

### 9.1 관리자 기능
- 대시보드 (통계/차트)
- 리포트 관리
- 인사이트 관리
- 음성 분석
- 팀 관리
- 사용자 관리

### 9.2 관리자 컴포넌트
- `src/components/admin/` - 관리자 컴포넌트
- `src/pages/admin/` - 관리자 페이지

---

## 10. 유틸리티/헬퍼

### 10.1 디바이스 감지
- `src/utils/deviceDetection.ts` - 모바일/데스크톱 감지 (Phase 3)

### 10.2 음성 유틸리티
- `src/ui/speechUIAdapter.ts` - 음성 UI 어댑터
- `src/speech/useSpeechState.ts` - 음성 상태 훅

### 10.3 기타 유틸리티
- `src/utils/` - 다양한 유틸리티 함수들
- `src/hooks/` - 커스텀 훅들
- `src/lib/` - 라이브러리 래퍼들

---

## 📊 전체 진화 단계 요약

| Phase | 목표 | 결과 |
|-------|------|------|
| **Phase 3** | 구조 안정화 | 튕김 제거, 단일 진입점, 데스크톱 차단 |
| **Phase 4** | 데이터 기반 개선 | UNKNOWN 로깅, 개선 루프 |
| **Phase 5** | 출시 봉인 | DEV/PROD 분리, 보안 강화 |
| **Phase 6** | NLP 전환 | LLM 기반 Intent 파싱, A/B 테스트 |
| **Phase 7** | 개인화 | 사용자별 가중치, alias 시스템 |
| **Phase 8** | 추천형 UX | 질문형 추천, opt-out 시스템 |

---

## 🎯 핵심 아키텍처 원칙

1. **단일 진입점**: `SpeechManager.startListeningByUserGesture()`만 STT 시작
2. **1 명령 = 1 액션 = 1 종료**: 명령 처리 후 즉시 중지
3. **데스크톱 완전 차단**: 모바일 전용 음성 시스템
4. **데이터 기반 진화**: UNKNOWN 로깅 → 개선 루프
5. **안전한 NLP 전환**: A/B 테스트, 롤백 가능
6. **보이지 않는 개인화**: UX 변화 없이 성능 향상
7. **적절한 추천**: 방해 ❌, 강요 ❌, opt-out 가능

---

## 📝 문서

### Phase 문서
- `src/speech/invariants.md` - 불변성 원칙
- `src/speech/PHASE4_OPERATION_GUIDE.md` - Phase 4 운영 가이드
- `src/speech/PHASE5_RELEASE_SEAL.md` - Phase 5 출시 봉인
- `src/speech/PHASE6_NLP_DESIGN.md` - Phase 6 NLP 설계
- `src/speech/PHASE6_1_SETUP.md` - Phase 6-1 설정 가이드
- `src/speech/PHASE6_2_COMPLETE.md` - Phase 6-2 완료
- `src/speech/PHASE6_3_COMPLETE.md` - Phase 6-3 완료
- `src/speech/PHASE7_COMPLETE.md` - Phase 7 완료
- `src/speech/PHASE8_COMPLETE.md` - Phase 8 완료
- `src/speech/RELEASE_CHECKLIST.md` - 릴리즈 체크리스트

---

## 🏁 결론

YAGO VIBE 플랫폼은 **로그인 페이지부터 시작하여 음성 명령 시스템의 완전한 진화**를 거쳤습니다.

- ✅ 안정적인 인증 시스템
- ✅ 튕김 없는 음성 시스템
- ✅ 데이터 기반 개선 루프
- ✅ 안전한 NLP 전환
- ✅ 개인화된 사용자 경험
- ✅ 적절한 추천 시스템

**이제 "똑똑한 앱"의 정석이 완성되었습니다.**

