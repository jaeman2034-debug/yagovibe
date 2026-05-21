import { useState } from "react";
import type { ChatImage } from "@/lib/chat/sendMessageCommon";
import { formatChatListTime } from "@/lib/chat/inlineChatListFormat";
import { ChatImageLightbox } from "@/components/chat/ChatImageLightbox";

export type InlineChatMsg = {
  id: string;
  senderId?: string;
  text?: string;
  type?: string;
  images?: ChatImage[];
  createdAt?: { toDate?: () => Date } | Date | null;
};

const DEFAULT_IMAGE_CAPTION = "사진을 보냈습니다";

export function ChatInlineMessageBubble({
  msg,
  isMine,
  variant,
  showTeamPeerLabel = true,
  showTimeRow = false,
  readState = null,
}: {
  msg: InlineChatMsg;
  isMine: boolean;
  variant: "team" | "recruit";
  /** 팀 단톡: 같은 멤버 연속 발화면 false */
  showTeamPeerLabel?: boolean;
  /** 같은 작성자 그룹의 마지막 메시지에만 true */
  showTimeRow?: boolean;
  /** 내 마지막 메시지 보조 메타: 읽음/안읽음 */
  readState?: "read" | "unread" | null;
}) {
  const [viewerSrc, setViewerSrc] = useState<string | null>(null);
  const body = typeof msg.text === "string" ? msg.text : "";
  const hasImages = Array.isArray(msg.images) && msg.images.length > 0;
  const isImageType = msg.type === "image" || hasImages;
  const first = hasImages ? msg.images![0] : null;

  const mineCls =
    variant === "team" ? "bg-blue-600 text-white" : "bg-emerald-600 text-white";
  const theirsCls = "bg-gray-100 text-gray-900";

  const timeStr = showTimeRow ? formatChatListTime(msg.createdAt) : "";

  return (
    <>
    <ChatImageLightbox
      open={!!viewerSrc}
      src={viewerSrc || ""}
      onClose={() => setViewerSrc(null)}
    />
    <div className={`mb-0.5 flex w-full flex-col ${isMine ? "items-end" : "items-start"}`}>
      <div className={`flex w-full ${isMine ? "justify-end" : "justify-start"}`}>
        <div
          className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${isMine ? mineCls : theirsCls}`}
        >
          {!isMine && variant === "team" && showTeamPeerLabel && (
            <p className="mb-0.5 text-[10px] font-medium text-gray-500">멤버</p>
          )}
          {isImageType && first ? (
            <div className="space-y-1.5">
              <button
                type="button"
                className={`block w-full cursor-zoom-in border-0 bg-transparent p-0 text-left ${isMine ? "ring-white/20" : "ring-black/5"} overflow-hidden rounded-lg ring-1`}
                onClick={() => setViewerSrc(first.url)}
              >
                <img
                  src={first.thumbUrl || first.url}
                  alt=""
                  className="max-h-64 max-w-xs w-full rounded-lg object-cover"
                  loading="lazy"
                />
              </button>
              {body && body !== DEFAULT_IMAGE_CAPTION ? (
                <p className="whitespace-pre-wrap break-words text-xs opacity-90">{body}</p>
              ) : null}
            </div>
          ) : (
            <p className="whitespace-pre-wrap break-words">{body}</p>
          )}
        </div>
      </div>
      {showTimeRow && (timeStr || (isMine && !!readState)) ? (
        <div
          className={`mt-1 flex items-center gap-1 text-[10px] leading-none ${isMine ? "mr-1 justify-end text-right" : "ml-1"}`}
        >
          {timeStr ? <span className="text-gray-400">{timeStr}</span> : null}
          {isMine && readState === "read" ? <span className="text-gray-500">읽음</span> : null}
          {isMine && readState === "unread" ? <span className="text-gray-300">안읽음</span> : null}
        </div>
      ) : null}
    </div>
    </>
  );
}
