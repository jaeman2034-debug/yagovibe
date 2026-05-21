// 🔥 채팅 스크롤 로직 훅 (유지보수 천재 패턴)
import { useEffect, useRef, RefObject } from "react";

export function useChatScroll(dependency: any[]) {
    const scrollRef = useRef<HTMLDivElement>(null); // 메시지 컨테이너
    const bottomRef = useRef<HTMLDivElement>(null); // 스크롤 앵커 (맨 아래)
    const isAtBottomRef = useRef(true); // 사용자가 맨 아래에 있는지 추적
    const userScrollingRef = useRef(false); // 🔥 사용자가 위로 스크롤 중인지 추적 (사고 방지)
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // 🔥 스크롤을 맨 아래로 이동
    const scrollToBottom = (smooth = true) => {
        // 🔥 사용자가 위로 스크롤 중이면 자동 스크롤 안 함 (사고 방지)
        if (userScrollingRef.current) return;
        
        if (scrollRef.current && bottomRef.current) {
            if (smooth) {
                bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
            } else {
                const container = scrollRef.current;
                container.scrollTop = container.scrollHeight;
            }
        }
    };

    // 🔥 스크롤 이벤트 핸들러 (사용자 의도 우선 잠금, 사고 방지)
    const onScroll = () => {
        const el = scrollRef.current;
        if (!el) return;
        const threshold = 40; // 40px from bottom
        const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
        
        isAtBottomRef.current = atBottom;
        // 🔥 사용자가 위로 보고 있으면 어떤 상황에서도 자동 스크롤 안 함
        userScrollingRef.current = !atBottom;
    };

    // 🔥 새 메시지 추가 시 자동 스크롤 (사용자가 맨 아래에 있을 때만)
    useEffect(() => {
        // 🔥 사용자가 위로 스크롤 중이면 자동 스크롤 안 함 (사고 방지)
        if (dependency.length > 0 && isAtBottomRef.current && !userScrollingRef.current) {
            if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
            scrollTimeoutRef.current = setTimeout(() => {
                requestAnimationFrame(() => scrollToBottom(true));
            }, 50);
        }
        return () => {
            if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        };
    }, dependency);

    return {
        scrollRef,
        bottomRef,
        onScroll,
        scrollToBottom,
        isAtBottomRef,
        userScrollingRef, // 🔥 이미지 로딩 후 스크롤 보정용으로 노출
    };
}

