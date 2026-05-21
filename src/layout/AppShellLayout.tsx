/**
 * 🔥 AppShellLayout - 전역 App Shell 레이아웃
 * 
 * 역할:
 * - BottomNav가 항상 표시되는 전역 페이지 레이아웃
 * - /home, /activity, /trade, /map, /chat, /mypage에서 사용
 * - 스포츠 허브(/sports/:sport)도 이 레이아웃 사용
 * 
 * 설계 원칙:
 * - BottomNav는 항상 표시 (예외: 상세 페이지, 채팅방 내부, 온보딩/로그인)
 * - Header는 선택적 (페이지별로 제어 가능)
 */

import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { AppContent } from "@/components/layout/AppContent";
import Header, { HEADER_HEIGHT } from "./Header";
import BottomNav from "../components/BottomNav";
import { SpeechCommandBridge } from "../speech/SpeechCommandBridge";
import GlobalFAB from "../components/FloatingWriteButton";
import { CreateModal } from "@/components/create/CreateModal";
import { useAuth } from "@/context/AuthProvider";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function AppShellLayout() {
    const location = useLocation();
    const { user } = useAuth();
    const [isMobile, setIsMobile] = useState(false);
    const [isWriteOpen, setIsWriteOpen] = useState(false);
    
    // Trade 페이지인지 확인
    const isTradePage = location.pathname.includes('/trade') || location.pathname.includes('/market');
    const isSportsRootPage = location.pathname === "/sports";
    
    // 🔥 모바일 지도 모드 확인 (MobileMapView가 렌더링될 때)
    const [isMobileMapMode, setIsMobileMapMode] = useState(false);
    
    const prevMobileMapRef = useRef<boolean | null>(null);
    const chatToastUnsubRef = useRef<(() => void) | null>(null);
    useEffect(() => {
      // 🔥 모바일 지도 모드 감지 (MutationObserver로 동적 감지)
      // ⚠️ 무한 루프 방지: 값이 실제로 변경될 때만 setState 호출
      const checkMobileMapMode = () => {
        const hasMobileMapPage = document.querySelector('.mobile-map-page') !== null;
        if (prevMobileMapRef.current !== hasMobileMapPage) {
          prevMobileMapRef.current = hasMobileMapPage;
          setIsMobileMapMode(hasMobileMapPage);
        }
      };
      
      // 초기 체크
      checkMobileMapMode();
      
      // MutationObserver로 동적 감지 (쓰로틀 없이, 변경 시에만 setState)
      const observer = new MutationObserver(checkMobileMapMode);
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
      
      return () => observer.disconnect();
    }, []);

    // 🔥 모바일 헤더 최적화: 지도 페이지에서만 헤더 숨김
    const hideHeaderOnMap =
        location.pathname.startsWith("/app/map") ||
        location.pathname.startsWith("/market/map") ||
        location.pathname.startsWith("/map");
    
    // 🔥 지도 페이지 여부 확인
    const isMapPage =
        location.pathname === "/map" ||
        location.pathname.startsWith("/app/map") ||
        location.pathname.startsWith("/market/map");
    // 🔥 채팅 페이지 여부 확인 (채팅은 전체 화면 컨텍스트)
    const isChatPage =
      location.pathname === "/chat" ||
      location.pathname.startsWith("/chat/") ||
      location.pathname.startsWith("/app/chat/");
    const isWideDashboardPage =
        location.pathname.startsWith("/app/admin/org-billing") ||
        location.pathname === "/admin/billing-analytics" ||
        location.pathname.startsWith("/app/admin/billing-analytics") ||
        location.pathname === "/admin/billing-cohort" ||
        location.pathname.startsWith("/app/admin/billing-cohort");

    // 🔥 모바일 감지
    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth <= 768;
            setIsMobile(mobile);
            // 반응형 전환(데스크탑↔모바일) 시 스크롤 컨테이너가 잠기는 현상 방지
            document.documentElement.classList.toggle("is-mobile-view", mobile);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => {
            window.removeEventListener('resize', checkMobile);
            document.documentElement.classList.remove("is-mobile-view");
        };
    }, []);

    // 🔥 Phase 3-3: 검색 핸들러 (필요시 페이지에서 override)
    const handleSearch = (query: string) => {
        console.log("🔍 [AppShellLayout] 음성 검색:", query);
        // 페이지별 검색 로직은 각 페이지에서 SpeechCommandBridge에 전달
    };

    // 🔥 BottomNav 숨김 조건: 예외 페이지만 (전역 페이지는 항상 표시)
    // 전역 페이지 (/home, /activity, /trade, /map, /chat, /mypage)는 항상 BottomNav 표시
    // 숨김 예외: 상세 페이지, 채팅방 내부, 온보딩/로그인 페이지
    const isGlobalPage = 
      location.pathname === "/home" ||
      location.pathname === "/" ||
      location.pathname.startsWith("/activity") ||
      location.pathname.startsWith("/trade") ||
      location.pathname.startsWith("/market") ||
      location.pathname === "/map" ||
      location.pathname === "/chat" ||
      location.pathname.startsWith("/mypage") ||
      location.pathname === "/sports" ||
      location.pathname.startsWith("/sports/") ||
      location.pathname.startsWith("/federations") ||
      location.pathname.startsWith("/federation/");
    
    // 🔥 채팅방 내부에서는 하단 네비 숨김 (채팅 목록은 제외)
    const isChatRoom =
      (location.pathname.startsWith("/chat/") && location.pathname !== "/chat") ||
      /^\/app\/chat\/[^/]+$/.test(location.pathname);
    
    // 🔥 상세 페이지에서는 하단 네비 숨김 (VisitorActions가 하단 액션 바 역할)
    // 상세/생성 판별은 아래 정확 판별 블록에서 재정의
    
    // 🔥 온보딩/로그인 페이지는 BottomNav 숨김
    const isAuthPage = 
      location.pathname.startsWith("/onboarding") ||
      location.pathname.startsWith("/login") ||
      location.pathname.startsWith("/signup");
    // 생성 페이지 판별은 아래 정확 판별 블록에서 재정의
    // 협회/연맹 페이지 여부: 해당 뷰에서는 전역 하단 네비를 숨긴다
    const isAssociationPage = location.pathname.startsWith("/association/");
    const isFederationPage = location.pathname.startsWith("/federations/") || location.pathname.startsWith("/federation/");
    
    // 🔥 Sports Hub - market 탭 여부 (FAB 노출 보장)
    const isSportsHubMarket =
      location.pathname.startsWith("/sports/") &&
      new URLSearchParams(location.search).get("tab") === "market";

    // ✅ 상세/생성 페이지 정확 판별 (오탐 방지)
    const path = location.pathname;
    const isCreatePage = path.endsWith("/create");
    const isDetailPage =
      /^\/sports\/[^/]+\/market\/[^/]+$/.test(path) ||
      path.includes("/detail/") ||
      path.startsWith("/product/") ||
      /^\/app\/market\/[^/]+$/.test(path);
    // 🔒 수정 페이지 판별: /edit 포함 경로 전부
    const isEditPage = /\/edit(\/|$)/.test(path);

    // 🔍 진단 로그: FAB 가시성 관련 플래그
    try {
      // eslint-disable-next-line no-console
      console.debug("[AppShellLayout:FAB flags]", {
        pathname: location.pathname,
        search: location.search,
        isGlobalPage,
        isChatRoom,
        isDetailPage,
        isCreatePage,
        isEditPage,
        isChatPage,
        isSportsHubMarket,
        isTradePage,
        isWriteOpen,
      });
    } catch {}

    // 🔥 BottomNav 표시 조건: 전역 페이지이면서 예외가 아닌 경우
    const shouldShowBottomNav = isGlobalPage && !isChatRoom && !isDetailPage && !isAuthPage && !isAssociationPage && !isFederationPage;
    const openWriteDrawer = () => setIsWriteOpen(true);
    const closeWriteDrawer = () => setIsWriteOpen(false);

    useEffect(() => {
      // create 화면에서는 항상 Drawer 닫힘 보장
      if (isCreatePage && isWriteOpen) setIsWriteOpen(false);
    }, [isCreatePage, isWriteOpen]);

    // 🔔 방 외 메시지 토스트 (가벼운 버전)
    useEffect(() => {
      chatToastUnsubRef.current?.();
      chatToastUnsubRef.current = null;

      if (!user?.uid) return;
      const qParticipants = query(
        collection(db, "chats"),
        where("participants", "array-contains", user.uid)
      );
      const qUsers = query(
        collection(db, "chats"),
        where("users", "array-contains", user.uid)
      );

      const handleSnapshot = async (snap: any) => {
        try {
          const inChatId = location.pathname.startsWith("/chat/")
            ? location.pathname.split("/chat/")[1]?.split("/")[0] || null
            : null;
          const inAppChatId = location.pathname.startsWith("/app/chat/")
            ? location.pathname.split("/app/chat/")[1]?.split("/")[0] || null
            : null;
          let toastPayload: { opponentName?: string; preview?: string } | null = null;
          for (const chg of snap.docChanges()) {
            const data = chg.doc.data() as any;
            const unread = data?.unreadCount?.[user.uid] ?? 0;
            if (
              unread > 0 &&
              chg.type !== "removed" &&
              chg.doc.id !== inChatId &&
              chg.doc.id !== inAppChatId
            ) {
              const participantsInfo = data?.participantsInfo || {};
              const opponentId = (data?.participants as string[] | undefined)?.find?.((id) => id !== user.uid);
              const opponentName = (opponentId && participantsInfo[opponentId]?.name) || "상대방";
              const lastMsg = data?.lastMessage;
              const rawText = typeof lastMsg === "string" ? lastMsg : (lastMsg?.text || "메시지");
              const preview = String(rawText).slice(0, 30);
              toastPayload = { opponentName, preview };
              break;
            }
          }
          if (toastPayload) {
            const { toast } = await import("@/lib/notify").catch(() => ({ toast: null as any }));
            if (toast?.message) {
              toast.message(`${toastPayload.opponentName}: ${toastPayload.preview}`);
            } else if (toast?.success) {
              toast.success(`${toastPayload.opponentName}: ${toastPayload.preview}`);
            }
            if (typeof navigator !== "undefined" && (navigator as any).vibrate) {
              try { (navigator as any).vibrate(10); } catch {}
            }
          }
        } catch {}
      };

      const onError = (err: any) => {
        if (err?.code === "permission-denied" || err?.code === "unavailable") {
          return;
        }
        if (import.meta.env.DEV) {
          console.warn("[AppShellLayout] chat toast listener error:", err);
        }
      };

      const unsubParticipants = onSnapshot(qParticipants, handleSnapshot, onError);
      const unsubUsers = onSnapshot(qUsers, handleSnapshot, onError);
      chatToastUnsubRef.current = () => {
        unsubParticipants();
        unsubUsers();
      };
      return () => {
        unsubParticipants();
        unsubUsers();
        chatToastUnsubRef.current = null;
      };
    }, [user?.uid, location.pathname]);

    return (
        <div 
            className={`app-root w-full flex flex-col ${(isMapPage || isMobileMapMode) ? 'bg-transparent' : 'bg-white'}`}
            data-map-page={isMapPage ? 'true' : undefined}
        >
            {/* 🟦 헤더 (지도 페이지에서는 숨김) */}
            {!hideHeaderOnMap && <Header />}

            {/* ✅ 헤더 높이 보정은 여기서만 한다 (단 한 곳) */}
            {/* 🔥 데스크탑 레이아웃: 중앙 정렬 + max-width 제한 */}
            {/* 🔥 스크롤 컨테이너: body 스크롤 대신 여기서만 스크롤 (pull-to-refresh 방지) */}
            {/* 🔥 모바일: padding-top을 0으로 설정하여 헤더 아래 공백 제거 */}
            {/* 🔥 모바일: flex-col + padding 축소하여 녹색 영역까지 확장 */}
            {/* 🚀 실서비스 모바일 UX 완성: page-content 클래스 추가 */}
            <main 
                className={`${
                    isMapPage
                      ? ""
                      : isChatPage
                        ? "chat-main"
                        : "app-scroll page-content"
                  } w-full flex-1 ${
                    isMapPage ? "" : (isMobile ? "flex flex-col" : "flex")
                  } ${
                    isChatPage
                      ? "px-0 sm:px-0 lg:px-0"
                      : isTradePage
                        ? "flex flex-col"
                        : (isMobile
                            ? "px-2 sm:px-3 lg:px-4"
                            : `${isWideDashboardPage ? "" : "justify-center"} ${shouldShowBottomNav ? "px-4 sm:px-6 lg:px-8" : ""}`)
                  }`}
                data-map-page={isMapPage ? 'true' : undefined}
                data-page={isSportsRootPage ? 'sports-root' : undefined}
                style={{ 
                    // 🔥 지도 페이지: 완전히 투명하고 레이아웃 영향 없음
                    // 🔥 모바일 지도 모드: main 요소가 지도를 가리지 않도록
                    ...(isMapPage || isMobileMapMode ? {
                        position: 'relative',
                        background: 'transparent',
                        padding: 0,
                        margin: 0,
                        width: '100%',
                        height: '100%',
                        minHeight: 'auto',
                        zIndex: isMobileMapMode ? -1 : 0, // 🔥 모바일 지도 모드: z-index를 낮춰서 지도 아래로
                        overflow: 'visible',
                    } : isChatPage ? {
                        // ✅ 채팅: 전체 화면 컨텍스트, 여백/센터링 제거
                        padding: 0,
                        margin: 0,
                        width: '100%',
                        height: '100%',
                        maxWidth: '100%',
                        background: '#f3f4f6',
                        overflow: 'hidden',
                    } : {
                        // ✅ main에서는 padding/offset을 주지 않는다 (스크롤 컨테이너만 담당)
                        ...(isTradePage ? { 
                            paddingLeft: 0, 
                            paddingRight: 0,
                            maxWidth: '100%',
                            width: '100%'
                        } : {})
                    })
                }}
            >
                {isMapPage ? (
                    // 🔥 지도 페이지: 레이아웃 래퍼 없이 직접 렌더링
                    <Outlet />
                ) : isTradePage || isChatPage ? (
                    <Outlet />
                ) : (
                    <AppContent
                        className={
                          isWideDashboardPage
                            ? "max-w-7xl px-0 sm:max-w-7xl lg:max-w-7xl"
                            : undefined
                        }
                        style={{
                            paddingTop: hideHeaderOnMap ? "0px" : `${HEADER_HEIGHT}px`,
                            paddingBottom: shouldShowBottomNav ? "96px" : undefined,
                        }}
                    >
                        <Outlet />
                    </AppContent>
                )}
            </main>

            {/* 🟦 하단 네비 (전역 페이지는 항상 표시) */}
            {shouldShowBottomNav && <BottomNav />}

            {/* 🔥 전역 플로팅 글쓰기 버튼 (FAB) — 정확 조건 */}
            {(!isCreatePage && !isChatPage && !isDetailPage && !isEditPage && !isWriteOpen) || isSportsHubMarket ? (
              <GlobalFAB onClick={openWriteDrawer} />
            ) : null}
            <CreateModal open={isWriteOpen} onOpenChange={setIsWriteOpen} />

            {/* 🔥 Phase 3-3: STT 결과 → Intent → Action 브리지 */}
            <SpeechCommandBridge onSearch={handleSearch} />

            {/* 🔥 하단 마이크 버튼 제거됨 - 검색창에 통합 */}
        </div>
    );
}
