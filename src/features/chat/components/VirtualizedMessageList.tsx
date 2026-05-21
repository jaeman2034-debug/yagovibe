import React, { useRef, useCallback, useImperativeHandle, forwardRef } from "react";
import { Virtuoso } from "react-virtuoso";
import type { VirtuosoHandle } from "react-virtuoso";
import { cn } from "@/lib/utils";
import { NewMessageButton } from "./NewMessageButton";
import { SystemMessage } from "./SystemMessage";
import { LocationMessage } from "./LocationMessage";
import { TextMessage } from "./TextMessage";
import { ImageMessage } from "./ImageMessage";
import { VideoMessage } from "./VideoMessage";
import type { MessageDoc } from "../hooks/useMessagesRealtime";

export type VirtualizedMessageListHandle = {
  /** 현재 `messages` 꼬리에 있으면 해당 인덱스로 스크롤 */
  scrollToMessageId: (id: string) => boolean;
};

export interface MediaViewerApi {
  show: (items: Array<{ kind: "image" | "video"; url: string; thumbUrl: string; [key: string]: unknown }>, index: number) => void;
}

interface VirtualizedMessageListProps {
  messages: MessageDoc[];
  myUid: string;
  mediaViewer: MediaViewerApi;
  isLoadingOlder?: boolean;
  hasMore?: boolean;
  onLoadOlder?: () => void | Promise<void>;
  listRef?: React.RefObject<HTMLDivElement | null>;
  bottomRef?: React.RefObject<HTMLDivElement | null>;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  isAtBottom?: boolean;
  onScrollToBottom?: () => void;
  emptyComponent?: React.ReactNode;
  /** 알림 `?messageId=` 하이라이트용 */
  highlightedMessageId?: string | null;
  /** 하단 고정 composer 높이 — 마지막 말풍선이 가려지지 않도록 */
  scrollBottomInsetPx?: number;
}

const TradeMessageItem = React.memo(function TradeMessageItem({
  m,
  prev,
  myUid,
  mediaViewer,
}: {
  m: MessageDoc;
  prev?: MessageDoc;
  myUid: string;
  mediaViewer: MediaViewerApi;
}) {
  const isMine = m.senderId === myUid;
  const isSameUser = prev && prev.senderId === m.senderId;
  const within2Min = (() => {
    try {
      const ct = m.createdAt?.toDate ? m.createdAt.toDate() : new Date(m.createdAt);
      const pt = prev?.createdAt?.toDate ? prev.createdAt.toDate() : (prev?.createdAt ? new Date(prev.createdAt) : null);
      if (!pt) return false;
      return Math.abs(ct.getTime() - pt.getTime()) < 2 * 60 * 1000;
    } catch {
      return false;
    }
  })();
  const compact = !!(isSameUser && within2Min);

  if (m.type === "system" || (m as { systemType?: boolean }).systemType) {
    return <SystemMessage text={m.text || ""} />;
  }
  if (m.location) {
    return <LocationMessage location={m.location} isMine={isMine} />;
  }
  if (m.type === "video" && m.videos && m.videos.length > 0) {
    return (
      <VideoMessage
        videos={m.videos}
        images={m.images}
        text={m.text && m.text !== "동영상을 보냈습니다" ? m.text : undefined}
        isMine={isMine}
        mediaViewer={mediaViewer}
      />
    );
  }
  if (m.type === "image" && m.images && m.images.length > 0) {
    return (
      <ImageMessage
        images={m.images}
        videos={m.videos}
        text={m.text && m.text !== "사진을 보냈습니다" ? m.text : undefined}
        isMine={isMine}
        mediaViewer={mediaViewer}
      />
    );
  }
  const isPending = m.pending || m.id.startsWith("temp-");
  return (
    <TextMessage
      text={m.text || ""}
      isMine={isMine}
      isPending={!!isPending}
      createdAt={m.createdAt}
      readBy={(m as any).readBy}
      compact={compact}
    />
  );
});

/**
 * 가상 스크롤 메시지 리스트 (react-virtuoso)
 */
export const VirtualizedMessageList = forwardRef<VirtualizedMessageListHandle, VirtualizedMessageListProps>(
  function VirtualizedMessageList(
    {
      messages,
      myUid,
      mediaViewer,
      isLoadingOlder = false,
      hasMore = false,
      onLoadOlder,
      listRef,
      bottomRef,
      onScroll,
      isAtBottom = true,
      onScrollToBottom,
      emptyComponent,
      highlightedMessageId = null,
      scrollBottomInsetPx = 12,
    },
    ref
  ) {
  const virtuosoRef = useRef<VirtuosoHandle>(null);

  useImperativeHandle(
    ref,
    () => ({
      scrollToMessageId: (id: string) => {
        const needle = String(id ?? "").trim();
        if (!needle) return false;
        const idx = messages.findIndex((m) => String(m.id ?? "") === needle);
        if (idx < 0 || !virtuosoRef.current) return false;
        virtuosoRef.current.scrollToIndex({
          index: idx,
          align: "center",
          behavior: "smooth",
        });
        return true;
      },
    }),
    [messages]
  );

  const scrollToBottom = useCallback(() => {
    if (messages.length > 0) {
      virtuosoRef.current?.scrollToIndex({ index: messages.length - 1, behavior: "smooth" });
    }
    onScrollToBottom?.();
  }, [messages.length, onScrollToBottom]);

  if (messages.length === 0) {
    return (
      <div
        ref={listRef as React.RefObject<HTMLDivElement>}
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          padding: 12,
          paddingBottom: scrollBottomInsetPx,
          background: "#fafafa",
          minHeight: 0,
        }}
      >
        {emptyComponent || null}
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Virtuoso
        ref={virtuosoRef}
        data={messages}
        initialTopMostItemIndex={Math.max(0, messages.length - 1)}
        followOutput="smooth"
        startReached={() => {
          if (hasMore && onLoadOlder && !isLoadingOlder) {
            onLoadOlder();
          }
        }}
        itemContent={(index, m) => {
          const prev = index > 0 ? messages[index - 1] : undefined;
          const rowHi =
            highlightedMessageId && String(m.id) === highlightedMessageId
              ? "rounded-xl ring-2 ring-blue-300/95 bg-blue-50/90 shadow-sm transition-colors duration-700 dark:bg-blue-950/40 dark:ring-blue-400/75"
              : "";
          return (
            <div
              data-message-id={m.id}
              className={cn(rowHi)}
              style={{ paddingBottom: 4 }}
            >
              <TradeMessageItem m={m} prev={prev} myUid={myUid} mediaViewer={mediaViewer} />
            </div>
          );
        }}
        computeItemKey={(_, m) => m.id}
        scrollerRef={(ref) => {
          if (ref && listRef && typeof ref === "object") {
            (listRef as React.MutableRefObject<HTMLDivElement | null>).current = ref as HTMLDivElement;
          }
        }}
        components={{
          Scroller: React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { "data-testid"?: string }>(
            function CustomScroller({ style, children, ...props }, ref) {
              return (
                <div
                  ref={ref}
                  style={style}
                  {...props}
                  onScroll={(e) => {
                    props.onScroll?.(e);
                    onScroll?.(e);
                  }}
                >
                  {children}
                </div>
              );
            }
          ),
          Footer: () => (
            <>
              <div ref={bottomRef as React.RefObject<HTMLDivElement>} />
              {!isAtBottom && onScrollToBottom && (
                <NewMessageButton onClick={scrollToBottom} />
              )}
            </>
          ),
        }}
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          padding: "12px",
          paddingBottom: scrollBottomInsetPx,
          background: "#fafafa",
          WebkitOverflowScrolling: "touch",
        }}
      />
    </div>
  );
  }
);

VirtualizedMessageList.displayName = "VirtualizedMessageList";
