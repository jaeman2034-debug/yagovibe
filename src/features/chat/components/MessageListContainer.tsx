import React, { ReactNode } from "react";
import { NewMessageButton } from "./NewMessageButton";

interface MessageListContainerProps {
  listRef: React.RefObject<HTMLDivElement | null>;
  bottomRef: React.RefObject<HTMLDivElement | null>;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  isEmpty: boolean;
  isAtBottom: boolean;
  onScrollToBottom: () => void;
  emptyComponent?: ReactNode;
  children: ReactNode;
  /** 하단 고정 입력창 높이만큼 스크롤 여백 (fixed composer 위까지) */
  scrollBottomInsetPx?: number;
}

/**
 * 메시지 리스트 컨테이너 컴포넌트
 * 스크롤 영역, 빈 상태, 새 메시지 버튼을 포함한 메시지 리스트 컨테이너
 */
export function MessageListContainer({
  listRef,
  bottomRef,
  onScroll,
  isEmpty,
  isAtBottom,
  onScrollToBottom,
  emptyComponent,
  children,
  scrollBottomInsetPx = 12,
}: MessageListContainerProps) {
  return (
    <div
      ref={listRef}
      style={{
        flex: 1, // 🔥 핵심 1: 남은 공간 모두 차지
        overflowY: "auto", // 🔥 핵심 2: 세로 스크롤만 활성화
        overflowX: "hidden", // 🔥 가로 스크롤 방지
        padding: "12px",
        paddingBottom: scrollBottomInsetPx,
        background: "#fafafa",
        minHeight: 0, // 🔥 핵심 3: flex 안에서 스크롤 작동하게 함 (필수!)
        WebkitOverflowScrolling: "touch", // 🔥 iOS 부드러운 스크롤
        position: "relative",
        // 🔥 모바일 pull-to-refresh 방지 (채팅 영역)
        overscrollBehavior: "contain",
        overscrollBehaviorY: "contain",
      }}
      onScroll={onScroll}
    >
      {isEmpty ? (
        emptyComponent || null
      ) : (
        <>
          {children}
          {/* 🔥 하단 마커 (스크롤 감지용) */}
          <div ref={bottomRef} />
          
          {/* 🔥 새 메시지 알림 버튼 (하단에 없을 때만 표시) */}
          {!isAtBottom && (
            <NewMessageButton onClick={onScrollToBottom} />
          )}
        </>
      )}
    </div>
  );
}
