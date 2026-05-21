// chat.types.ts (이 파일 하나로 확정)

export type MessageStatus = "sending" | "sent" | "failed" | "read";

export type ChatMessage = {
    id?: string; // Firestore id (서버 메시지)
    clientId?: string; // 🔥 클라이언트 임시 ID (optimistic UI 매칭용)
    uid?: string;
    senderId?: string;
    text?: string;
    type?: "text" | "offer" | "image" | "file" | "system_init" | "system_auto_reply" | "system_action" | "system_status_change" | "system_status"; // 🔥 offer: 가격 제안 메시지, system_status: 대화 상태 시스템 메시지
    url?: string;
    /** type === "file" */
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    amount?: number; // 🔥 가격 제안 메시지의 제안 금액
    createdAt?: any;
    deleted?: boolean;
    deletedAt?: any;
    status?: MessageStatus; // 🔥 전송 상태 (Optimistic UI)
    tempId?: string; // 🔥 임시 ID (재시도용, 하위 호환성)
};

export type ChatBubbleProps = {
    message: ChatMessage;
    isMine: boolean;
    isGroupedWithPrev: boolean;
    isGroupedWithNext: boolean;
    isLastMessage: boolean;
    onDelete?: (messageId: string) => void;
    onReport?: (messageId: string, senderId: string) => void;
    onImageLoad?: () => void;
    onRetry?: (messageId: string, messageText: string) => void; // 🔥 재시도 핸들러
};

