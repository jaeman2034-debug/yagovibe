// 🔥 채팅 말풍선 컴포넌트 (유지보수 천재 패턴)
import type { ChatBubbleProps } from "../chat.types";

export function ChatBubble({
    message,
    isMine,
    isGroupedWithPrev,
    isGroupedWithNext,
    isLastMessage,
    onDelete,
    onReport,
    onImageLoad,
    onRetry,
}: ChatBubbleProps) {
    const isDeleted = message.deleted === true;

    // 🔥 시간 포맷팅 (오후 3:21 형식, 카톡급 UX)
    const formatTime = (timestamp: any) => {
        if (!timestamp) return "";
        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return date.toLocaleTimeString("ko-KR", {
                hour: "2-digit",
                minute: "2-digit",
            });
        } catch {
            return "";
        }
    };

    // 🔥 시스템 상태 메시지 렌더링 (대화 상태 UX)
    if (message.type === "system_status") {
        return (
            <div className="flex w-full justify-center my-4">
                <div className="text-center text-xs text-gray-400 dark:text-gray-500 px-4 py-2 rounded-full bg-gray-50 dark:bg-neutral-800/50">
                    {message.text}
                </div>
            </div>
        );
    }

    return (
        <div
            className={`message-row ${isMine ? "me" : "other"} flex w-full ${isMine ? "justify-end" : "justify-start"} ${isGroupedWithPrev ? "mt-1" : "mt-3"}`}
        >
            <div
                className={`message-bubble chat-message group relative max-w-[70%] min-w-0 ${message.type === "image" ? "" : "px-4 py-2 text-sm leading-relaxed break-words"} ${
                    !message.type || message.type === "text"
                        ? isMine
                            ? `bg-blue-500 dark:bg-blue-600 text-white rounded-2xl ${isGroupedWithPrev ? "" : "rounded-br-md"}`
                            : `bg-gray-100 dark:bg-neutral-800 text-gray-900 dark:text-gray-100 rounded-2xl ${isGroupedWithPrev ? "" : "rounded-bl-md"}`
                        : ""
                } ${isDeleted ? "opacity-50 italic" : ""}`}
            >
                {/* 🔥 가격 제안 메시지 렌더링 */}
                {message.type === "offer" && message.amount ? (
                    <div className="bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-xl border border-yellow-300 dark:border-yellow-700">
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">💰 가격 제안</div>
                        <div className="font-semibold text-lg text-gray-900 dark:text-gray-100">{message.amount.toLocaleString()}원</div>
                        {message.text && (
                            <div className="text-sm text-gray-700 dark:text-gray-300 mt-2">{message.text}</div>
                        )}
                    </div>
                ) : message.type === "image" && message.url ? (
                    /* 🔥 이미지 메시지 렌더링 */
                    <img
                        src={message.url}
                        alt="전송된 이미지"
                        className="max-w-full rounded-2xl"
                        loading="lazy"
                        onLoad={() => {
                            // 🔥 이미지 로딩 후 스크롤 보정 (사고 방지)
                            if (onImageLoad) {
                                requestAnimationFrame(() => {
                                    onImageLoad();
                                });
                            }
                        }}
                    />
                ) : (
                    <div>
                        {isDeleted ? "삭제된 메시지입니다." : message.text}
                    </div>
                )}

                {/* 🔥 시간/읽음/상태 표시 (연속 메시지 그룹 마지막에만, 카톡급 UX) */}
                {!isDeleted && !isGroupedWithNext && (
                    <div className={`mt-1 text-[10px] ${isMine ? "text-blue-100 text-right" : "text-gray-400 dark:text-gray-500"}`}>
                        {/* 🔥 내 메시지 상태 표시 (마지막 메시지에만) */}
                        {isMine && isLastMessage && (
                            <>
                                {message.status === "sending" && <span className="opacity-70">전송 중…</span>}
                                {message.status === "failed" && onRetry && message.text && (
                                    <button
                                        onClick={() => onRetry(message.id, message.text || "")}
                                        className="text-red-300 hover:text-red-200 underline cursor-pointer"
                                    >
                                        실패 · 다시 보내기
                                    </button>
                                )}
                                {message.status === "sent" && (
                                    <>
                                        {formatTime(message.createdAt)}
                                        <span className="ml-1.5 opacity-70">전송됨</span>
                                    </>
                                )}
                                {message.status === "read" && (
                                    <>
                                        {formatTime(message.createdAt)}
                                        <span className="ml-1.5">읽음</span>
                                    </>
                                )}
                            </>
                        )}
                        {/* 🔥 상대 메시지: 시간만 표시 */}
                        {!isMine && (
                            <>{formatTime(message.createdAt)}</>
                        )}
                    </div>
                )}

                {/* 🗑️ 자기 메시지에만 삭제 버튼 */}
                {isMine && !isDeleted && onDelete && (
                    <button
                        onClick={() => onDelete(message.id)}
                        className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-red-500 text-white text-xs flex items-center justify-center active:bg-red-600 active:scale-95 transition-all shadow-md touch-manipulation z-10"
                        title="메시지 삭제"
                        style={{ minWidth: '28px', minHeight: '28px' }}
                    >
                        ×
                    </button>
                )}

                {/* 🚨 상대 메시지에만 신고 버튼 */}
                {!isMine && !isDeleted && onReport && (
                    <button
                        onClick={() => onReport(message.id, message.uid || message.senderId || "")}
                        className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center active:bg-orange-600 active:scale-95 transition-all shadow-md touch-manipulation z-10"
                        title="메시지 신고"
                        style={{ minWidth: '28px', minHeight: '28px' }}
                    >
                        🚨
                    </button>
                )}
            </div>
        </div>
    );
}

