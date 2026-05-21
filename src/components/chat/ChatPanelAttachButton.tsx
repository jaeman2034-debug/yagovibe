import { useRef, useState } from "react";
import type { ChangeEventHandler } from "react";
import { Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { sendImageMessage } from "@/lib/chat/sendImageMessage";
import { sendChatsImageMessage } from "@/lib/chat/sendChatsImageMessage";
import { sendChatsFileMessage } from "@/lib/chat/sendChatsFileMessage";
import { cn } from "@/lib/utils";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const CHATS_ACCEPT =
  "image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.txt,.hwp,.csv,.rtf";

type Props = {
  /** `chatRooms` 모드: roomId / `chats` 모드: chat 문서 id */
  roomId: string | null;
  uid: string | null;
  disabled: boolean;
  variant?: "default" | "outline";
  channel?: "chatRooms" | "chats";
  /** `channel === "chats"` 일 때 상대 unread 증가용 */
  tradeOtherUserId?: string | null;
};

/**
 * 숨김 file input + 📎
 * - `chatRooms`: 이미지만 → `sendImageMessage`
 * - `chats` (거래 1:1): 이미지 → `sendChatsImageMessage`, 그 외 → `sendChatsFileMessage`
 */
export function ChatPanelAttachButton({
  roomId,
  uid,
  disabled,
  variant = "outline",
  channel = "chatRooms",
  tradeOtherUserId = null,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const onPick = () => {
    if (!roomId || !uid || disabled || uploading) return;
    inputRef.current?.click();
  };

  const onChange: ChangeEventHandler<HTMLInputElement> = async (e) => {
    if (uploading) return;
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !roomId || !uid) return;

    if (channel === "chatRooms") {
      if (!file.type.startsWith("image/")) {
        toast.error("이미지 파일만 보낼 수 있어요.");
        return;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        toast.error("5MB 이하 이미지만 업로드할 수 있어요.");
        return;
      }
    }

    if (channel === "chats" && file.type.startsWith("image/") && file.size > MAX_IMAGE_BYTES) {
      toast.error("5MB 이하 이미지만 업로드할 수 있어요.");
      return;
    }

    setUploading(true);
    try {
      if (channel === "chats") {
        if (file.type.startsWith("image/")) {
          await sendChatsImageMessage({
            chatId: roomId,
            uid,
            files: [file],
            otherUserId: tradeOtherUserId ?? null,
          });
        } else {
          await sendChatsFileMessage({
            chatId: roomId,
            uid,
            file,
            otherUserId: tradeOtherUserId ?? null,
          });
        }
      } else {
        await sendImageMessage(roomId, uid, [file]);
      }
    } catch (err) {
      console.error("[ChatPanelAttachButton]", err);
      const msg = err instanceof Error ? err.message : "파일 전송에 실패했습니다.";
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <span
      className={cn(
        "inline-flex shrink-0",
        uploading && "pointer-events-none opacity-50"
      )}
      aria-busy={uploading}
    >
      <input
        ref={inputRef}
        type="file"
        accept={channel === "chats" ? CHATS_ACCEPT : "image/*"}
        className="hidden"
        aria-hidden
        disabled={uploading}
        onChange={onChange}
      />
      <Button
        type="button"
        variant={variant}
        size="icon"
        className="shrink-0"
        disabled={!roomId || !uid || disabled || uploading}
        onClick={onPick}
        title={uploading ? "업로드 중…" : channel === "chats" ? "사진·파일 첨부" : "사진 첨부"}
      >
        <Paperclip className={cn("h-4 w-4", uploading && "animate-pulse")} />
      </Button>
    </span>
  );
}
