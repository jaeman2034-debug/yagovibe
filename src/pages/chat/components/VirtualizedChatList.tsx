// 🔥 가상화된 채팅 메시지 리스트 컴포넌트 (성능 최적화)
import React, { useMemo, useRef, forwardRef, useImperativeHandle } from "react";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import { ChatBubble } from "./ChatBubble";
import type { ChatMessage } from "../chat.types";

interface VirtualizedChatListProps {
    messages: ChatMessage[];
    currentUserId: string | undefined;
    onDelete?: (messageId: string) => void;
    onReport?: (messageId: string, senderId: string) => void;
    onRetry?: (message: ChatMessage) => void;
    onImageLoad?: () => void;
    onScrollChange?: (isAtBottom: boolean) => void; // 🔥 스크롤 위치 변경 콜백
}

export interface VirtualizedChatListHandle {
    scrollToBottom: () => void;
}

export const VirtualizedChatList = forwardRef<VirtualizedChatListHandle, VirtualizedChatListProps>(({
    messages,
    currentUserId,
    onDelete,
    onReport,
    onRetry,
    onImageLoad,
    onScrollChange,
}, ref) => {
    // 🔥 ============================================
    // ✅ 모든 Hook을 최상단에 배치 (React Hook 규칙 준수 - 조건 없이 항상 호출)
    // ============================================
    const virtuosoRef = useRef<VirtuosoHandle>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    
    // 🔥 메시지 그룹 정보 계산 (메모이제이션으로 최적화)
    const messageData = useMemo(() => {
        return messages.map((m, idx) => {
            // 🔥 key 생성 (id가 없으면 clientId 또는 tempId 사용)
            const messageKey = m.id || m.clientId || m.tempId || `msg_${idx}`;
            const isMine = m.uid === currentUserId || m.senderId === currentUserId;
            const isDeleted = m.deleted === true;
            
            // 연속 메시지 체크
            const prevMsg = idx > 0 ? messages[idx - 1] : null;
            const isGroupedWithPrev = prevMsg && !isDeleted && (prevMsg.uid === m.uid || prevMsg.senderId === m.senderId);
            const nextMsg = idx < messages.length - 1 ? messages[idx + 1] : null;
            const isGroupedWithNext = nextMsg && !isDeleted && (nextMsg.uid === m.uid || nextMsg.senderId === m.senderId);
            
            // 마지막 메시지 체크 (읽음 표시용)
            const isLastMessage = idx === messages.length - 1;
            
            // 🔥 시스템 메시지는 그룹핑 제외 (대화 상태 UX)
            const isSystemMessage = m.type === "system_status" || m.type === "system_init" || m.type === "system_auto_reply" || m.type === "system_action" || m.type === "system_status_change";
            
            return {
                message: m,
                isMine,
                isGroupedWithPrev: isSystemMessage ? false : isGroupedWithPrev, // 시스템 메시지는 그룹핑 안 함
                isGroupedWithNext: isSystemMessage ? false : isGroupedWithNext, // 시스템 메시지는 그룹핑 안 함
                isLastMessage,
            };
        });
    }, [messages, currentUserId]);
    
    // 🔥 ref를 통해 부모에서 scrollToBottom 호출 가능 (항상 호출되어야 함 - 조건 없음)
    useImperativeHandle(ref, () => ({
        scrollToBottom: () => {
            if (messages.length < 50 && scrollContainerRef.current) {
                // 일반 레이아웃일 때
                scrollContainerRef.current.scrollTo({
                    top: scrollContainerRef.current.scrollHeight,
                    behavior: "smooth",
                });
            } else if (virtuosoRef.current && messageData.length > 0) {
                // Virtuoso 사용 시
                virtuosoRef.current.scrollToIndex({
                    index: messageData.length - 1,
                    behavior: "smooth",
                    align: "end",
                });
            }
        },
    }), [messageData.length, messages.length]);
    
    // 🔥 ============================================
    // ✅ Early return은 모든 Hook 호출 후에 (조건 분기는 여기서부터)
    // ============================================
    if (messages.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center text-center text-gray-400 dark:text-gray-500 h-full">
                <div className="text-4xl mb-3">💬</div>
                <p className="text-sm">아직 대화가 없어요</p>
                <p className="text-xs mt-1 opacity-70">메시지를 보내 대화를 시작해보세요 👋</p>
            </div>
        );
    }

    // 🔥 스크롤 위치 감지 핸들러 (카톡급 UX)
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const el = e.currentTarget;
        const threshold = 40; // px
        const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
        if (onScrollChange) {
            onScrollChange(atBottom);
        }
    };

    // 🔥 메시지가 적을 때(50개 미만)는 일반 flex 레이아웃 사용
    // ✅ A안: 메시지가 적을 때도 항상 하단 정렬 (실서비스 패턴 - WhatsApp/당근마켓 방식)
    // → "대화는 아래서 시작된다"는 명확한 신호, 채팅 앱스러운 느낌 유지
    if (messages.length < 50) {
        return (
            <div 
                ref={scrollContainerRef}
                className="h-full overflow-y-auto px-4 py-6 flex flex-col justify-end chat-messages-container"
                onScroll={handleScroll}
            >
                {messageData.map((item) => {
                    // 🔥 key 생성 (id가 없으면 clientId 또는 tempId 사용)
                    const messageKey = item.message.id || item.message.clientId || item.message.tempId || `msg_${item.message.text?.substring(0, 10)}`;
                    return (
                    <div key={messageKey} className="py-1">
                        <ChatBubble
                            message={item.message}
                            isMine={item.isMine}
                            isGroupedWithPrev={item.isGroupedWithPrev}
                            isGroupedWithNext={item.isGroupedWithNext}
                            isLastMessage={item.isLastMessage}
                            onDelete={onDelete}
                            onReport={onReport}
                            onImageLoad={onImageLoad}
                            onRetry={onRetry}
                        />
                    </div>
                    );
                })}
            </div>
        );
    }

    // 🔥 메시지가 많을 때(50개 이상)는 Virtuoso 사용 (성능 최적화)
    return (
        <Virtuoso
            ref={virtuosoRef}
            data={messageData}
            totalCount={messageData.length}
            initialTopMostItemIndex={Math.max(0, messageData.length - 1)}
            followOutput="smooth"
            alignToBottom
            overscan={10}
            rangeChanged={(range) => {
                // 🔥 Virtuoso의 rangeChanged로 스크롤 위치 감지
                if (onScrollChange && range.endIndex !== undefined) {
                    const atBottom = range.endIndex >= messageData.length - 1;
                    onScrollChange(atBottom);
                }
            }}
            itemContent={(index, item) => {
                // 🔥 key 생성 (id가 없으면 clientId 또는 tempId 사용)
                const messageKey = item.message.id || item.message.clientId || item.message.tempId || `msg_${index}`;
                return (
                <div key={messageKey} className="px-4 py-1">
                    <ChatBubble
                        message={item.message}
                        isMine={item.isMine}
                        isGroupedWithPrev={item.isGroupedWithPrev}
                        isGroupedWithNext={item.isGroupedWithNext}
                        isLastMessage={item.isLastMessage}
                        onDelete={onDelete}
                        onReport={onReport}
                        onImageLoad={onImageLoad}
                        onRetry={onRetry}
                    />
                </div>
                );
            }}
            style={{ height: "100%" }}
            className="chat-messages-container"
        />
    );
});

