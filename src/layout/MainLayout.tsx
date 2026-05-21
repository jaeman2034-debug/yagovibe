import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header";
import BottomNav from "../components/BottomNav";
import GlobalFAB from "../components/FloatingWriteButton";
import { CreateModal } from "@/components/create/CreateModal";
import { cn } from "@/lib/utils";
import { mobileFullWidthContainerClassName } from "@/components/layout/MobileFullWidthContainer";
import { ChatRoomsUnreadProvider } from "@/hooks/useChatRoomsUnread";

export default function MainLayout() {
    const [isWriteOpen, setIsWriteOpen] = useState(false);
    const { pathname } = useLocation();
    /** 1:1 채팅방 — 입력창이 화면 하단에 붙도록 네비·FAB 제외 + 높이 체인 */
    const isAppChatRoom = /^\/app\/chat\/[^/]+$/.test(pathname);
    /** 통합 채팅(chatRooms /chat/:id) — 상단 main pt 제거해 앱 헤더와 채팅 헤더 사이 빈틈 최소화 */
    const isChatRoomsPage = /^\/chat\/[^/]+$/.test(pathname);
    /** 앱 1:1 채팅·통합 채팅방: 뷰포트 높이 고정 → 내부 메시지 영역만 스크롤 */
    const isChatViewportLocked = isAppChatRoom || isChatRoomsPage;
    /** 1v1 라이브 매치 — 앱 헤더/하단탭 없이 전체 화면 */
    const isLiveGameSession = /^\/game\/session\/[^/]+$/.test(pathname);
    const isImmersiveViewport = isChatViewportLocked || isLiveGameSession;

    return (
        <ChatRoomsUnreadProvider>
        <div
            className={cn(
                "app-main-shell flex flex-col bg-[#F9FAFB] text-gray-900",
                isImmersiveViewport ? "h-dvh max-h-dvh min-h-0 overflow-hidden" : "min-h-dvh"
            )}
        >
            {/* 🟦 헤더: 전체 폭 (max-width 없음) */}
            {!isLiveGameSession && <Header />}

            {/* 🟨 본문만 max-w + mx-auto 가로 중앙 (헤더와 폭 분리) */}
            <main
                className={cn(
                    "min-h-0 w-full flex-1 flex flex-col",
                    isLiveGameSession
                        ? "min-h-0 flex-1 overflow-hidden p-0"
                        : isAppChatRoom
                        ? "min-h-0 overflow-hidden pb-0 pt-0"
                        : cn(
                              /* 채팅방: 탭(h-16)만큼만 pb — 입력창은 fixed bottom-16으로 탭 바로 위에 붙임 */
                              isChatRoomsPage ? "pb-16 min-h-0 flex-1" : "pb-28 min-h-0 flex-1",
                              isChatRoomsPage
                                  ? "overflow-hidden pt-0"
                                  : "pt-3 sm:pt-4 lg:pt-5"
                          )
                )}
            >
                <div
                    className={cn(
                        mobileFullWidthContainerClassName,
                        "flex min-w-0 flex-col lg:max-w-4xl lg:px-8",
                        isLiveGameSession || isAppChatRoom || isChatRoomsPage
                            ? "h-full max-w-none min-h-0 flex-1 overflow-hidden px-0 sm:px-0 lg:px-0"
                            : "min-h-0 flex-1"
                    )}
                >
                    <div
                        className={cn(
                            "flex w-full min-w-0 flex-1 flex-col",
                            (isLiveGameSession || isAppChatRoom || isChatRoomsPage) && "min-h-0 overflow-hidden"
                        )}
                    >
                        <Outlet />
                    </div>
                </div>
            </main>

            {!isAppChatRoom && !isLiveGameSession && <BottomNav />}

            {!isAppChatRoom && !isLiveGameSession && <GlobalFAB onClick={() => setIsWriteOpen(true)} />}
            <CreateModal open={isWriteOpen} onOpenChange={setIsWriteOpen} />
        </div>
        </ChatRoomsUnreadProvider>
    );
}
