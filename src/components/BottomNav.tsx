import { LayoutGrid, Home, Map, MessageCircle, User } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { sportHubHref, isSportHubTabActive } from "@/utils/sportHubHref";
import { useChatRoomsUnreadSafe } from "@/hooks/useChatRoomsUnread";

type NavKey = "hub" | "activity" | "map" | "chats" | "me";

function pathMatchesPrefix(pathname: string, base: string): boolean {
    return pathname === base || pathname.startsWith(`${base}/`);
}

/**
 * 메인 앱 하단 탭 (5개)
 * - 「활동」→ `/sports/:sport?tab=activity` (기존 /home 과 병존 가능, 네비는 허브 기준으로 통일)
 */
const NAVS: {
    key: NavKey;
    to: string;
    icon: typeof Home;
    label: string;
}[] = [
    { key: "hub", to: "/hub", icon: LayoutGrid, label: "허브" },
    { key: "activity", to: "", icon: Home, label: "활동" },
    { key: "map", to: "/market/map", icon: Map, label: "지도" },
    { key: "chats", to: "/app/chats", icon: MessageCircle, label: "채팅" },
    { key: "me", to: "/me", icon: User, label: "마이" },
];

export default function BottomNav() {
    const { pathname, search } = useLocation();
    const activityHref = sportHubHref("activity");
    const chatRoomsUnread = useChatRoomsUnreadSafe();
    const totalChatRoomsUnread = chatRoomsUnread?.totalUnread ?? 0;

    const isNavActive = (nav: (typeof NAVS)[number]): boolean => {
        switch (nav.key) {
            case "hub":
                return pathname === "/hub";
            case "activity":
                return isSportHubTabActive(pathname, search, "activity");
            case "map":
                return pathMatchesPrefix(pathname, "/market/map");
            case "chats":
                return (
                    pathMatchesPrefix(pathname, "/app/chats") ||
                    pathname.startsWith("/app/chat/")
                );
            case "me":
                return pathMatchesPrefix(pathname, "/me");
            default:
                return false;
        }
    };

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 w-full items-center justify-around border-t border-gray-200 bg-white shadow-md dark:border-gray-700 dark:bg-gray-800/90">
            {NAVS.map((nav) => {
                const Icon = nav.icon;
                const isActive = isNavActive(nav);

                return (
                    <NavLink
                        key={nav.key}
                        to={nav.key === "activity" ? activityHref : nav.to}
                        className={`flex flex-col items-center justify-center space-y-1 transition-all duration-200 ${
                            isActive
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                        }`}
                    >
                        <span className="relative inline-flex">
                            <Icon size={20} className={isActive ? "scale-110" : ""} />
                            {nav.key === "chats" && totalChatRoomsUnread > 0 && (
                                <span className="absolute -right-2 -top-1 min-w-[18px] rounded-full bg-red-500 px-[5px] text-center text-[10px] font-semibold leading-[18px] text-white">
                                    {totalChatRoomsUnread > 99 ? "99+" : totalChatRoomsUnread}
                                </span>
                            )}
                        </span>
                        <span className="text-xs font-medium">{nav.label}</span>
                    </NavLink>
                );
            })}
        </nav>
    );
}
