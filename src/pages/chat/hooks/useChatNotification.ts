// 🔥 채팅 알림 훅 (유지보수 천재 패턴)
// 채팅방 진입/나가기 추적 및 알림 클릭 핸들러

import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { normalizeTradeChatDocumentIdForRoute } from "@/features/chat/services/chatService";
import { db } from "../../../lib/firebase";

/**
 * 채팅 알림 훅
 * - 채팅방 진입/나가기 추적
 * - 알림 클릭 시 해당 채팅방으로 이동
 */
export function useChatNotification(chatId: string | undefined, userId: string | undefined) {
    const location = useLocation();
    const navigate = useNavigate();
    const isInChatRoomRef = useRef(false);

    // 🔥 채팅방 진입/나가기 추적
    useEffect(() => {
        if (!chatId || !userId) return;

        const isChatRoomPath = location.pathname.startsWith("/app/chat/") || location.pathname.startsWith("/chat/");
        const isCurrentChatRoom =
          chatId &&
          (location.pathname === `/chat/${chatId}` || location.pathname === `/app/chat/${chatId}`);

        // 채팅방 진입 시 Firestore에 기록 (선택적, 필요시 활성화)
        // 실제로는 클라이언트에서만 관리해도 충분함
        if (isCurrentChatRoom) {
            isInChatRoomRef.current = true;
        } else {
            isInChatRoomRef.current = false;
        }

        // 필요시 Firestore에 현재 채팅방 ID 기록 (서버에서 알림 발송 시 참조용)
        // const userRef = doc(db, "users", userId);
        // updateDoc(userRef, {
        //     currentChatRoomId: isCurrentChatRoom ? chatId : null,
        //     lastChatRoomUpdateAt: serverTimestamp(),
        // }).catch(console.error);

        return () => {
            isInChatRoomRef.current = false;
        };
    }, [chatId, userId, location.pathname]);

    // 🔥 알림 클릭 핸들러 (서비스 워커에서 호출되는 전역 핸들러)
    useEffect(() => {
        // 전역 알림 클릭 이벤트 리스너 (서비스 워커 알림 클릭)
        const handleNotificationClick = (event: MessageEvent) => {
            if (event.data && event.data.type === "notification-click") {
                const chatId = event.data.chatId;
                if (chatId && typeof chatId === "string") {
                    const path = chatId.startsWith("teamRecruit_") || chatId.startsWith("recruit_")
                      ? `/chat/${chatId}`
                      : `/app/chat/${normalizeTradeChatDocumentIdForRoute(chatId)}`;
                    navigate(path);
                }
            }
        };

        // 서비스 워커 메시지 리스너 (백그라운드 알림 클릭)
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.addEventListener("message", handleNotificationClick);
        }

        return () => {
            if ("serviceWorker" in navigator) {
                navigator.serviceWorker.removeEventListener("message", handleNotificationClick);
            }
        };
    }, [navigate]);

    return {
        isInChatRoom: isInChatRoomRef.current,
    };
}

