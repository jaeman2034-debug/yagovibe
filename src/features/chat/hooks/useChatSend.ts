import { useState, useCallback } from "react";
import { sendImageMessage } from "@/lib/chat/sendImageMessage";
import type { MessageDoc } from "./useMessagesRealtime";
import type { ChatRoomDoc } from "./useChatRoom";

interface UseChatSendOptions {
  chatRoomId: string | undefined;
  myUid: string;
  room: ChatRoomDoc | null;
  setMessages: React.Dispatch<React.SetStateAction<MessageDoc[]>>;
  setText: (value: string) => void;
  navigate: (path: string) => void;
  roomType: string | null;
  isTrade: boolean;
  isRecruitGroup: boolean;
  /** 매칭 스레드(chatRooms/match_*) — 멤버 기반 알림·전송 (모집 단체방과 동일 패턴) */
  isMatchThread: boolean;
}

/** 알림 수신자 후보 (거래 1:1은 상대방 1명 / 멤버 방은 나 제외 나머지) */
function getNotifyTargetUids(
  room: ChatRoomDoc,
  myUid: string,
  isTrade: boolean,
  isMemberBasedRoom: boolean
): string[] | null {
  if (isTrade) {
    const otherUid = room.buyerId === myUid ? room.sellerId : room.buyerId;
    return otherUid ? [otherUid] : null;
  }
  if (isMemberBasedRoom) {
    const members = room.members || room.participants || [];
    return members.filter((uid: string) => uid !== myUid);
  }
  return null;
}

function isMemberBasedChatRoom(
  room: ChatRoomDoc,
  isRecruitGroup: boolean,
  isMatchThread: boolean
): boolean {
  return (
    isRecruitGroup ||
    !!isMatchThread ||
    room.type === "team" ||
    room.type === "match"
  );
}

/**
 * 채팅 메시지 전송 훅
 * - sendMessageCommon
 * - sendImageMessage
 */
export function useChatSend({
  chatRoomId,
  myUid,
  room,
  setMessages,
  setText,
  navigate,
  roomType,
  isTrade,
  isRecruitGroup,
  isMatchThread,
}: UseChatSendOptions) {
  const [isUploadingImages, setIsUploadingImages] = useState(false);

  const sendTextMessage = useCallback(
    async (textToSend: string) => {
      if (!chatRoomId || !myUid || !room) return;

      const members = (room as { members?: string[] }).members || room.participants || [];
      if (!members.includes(myUid)) {
        alert("이 채팅방에 참여할 권한이 없습니다.\n승인된 사용자만 채팅할 수 있습니다.");
        const mid =
          isMatchThread && String((room as { matchId?: string }).matchId || "").trim();
        navigate(mid ? `/match/${mid}` : "/app/market");
        return;
      }

      const isClosed = room.recruitStatus === "CLOSED" || room.status === "closed";
      if (isRecruitGroup && isClosed) {
        alert("모집이 마감되어 채팅을 보낼 수 없습니다.");
        return;
      }

      const trimmed = textToSend.trim();
      if (!trimmed) return;

      const memberBased = isMemberBasedChatRoom(room, isRecruitGroup, isMatchThread);
      const notifyUids = getNotifyTargetUids(room, myUid, isTrade, memberBased);
      if (notifyUids === null) {
        alert(
          isTrade
            ? "거래 상대 정보를 찾을 수 없어 메시지를 보낼 수 없습니다."
            : "이 채팅방 유형에서는 메시지를 보낼 수 없습니다. 페이지를 새로고침해 주세요."
        );
        return;
      }

      const tempId = `temp-${Date.now()}`;
      const optimisticMessage: MessageDoc = {
        id: tempId,
        senderId: myUid,
        text: trimmed,
        type: "message",
        createdAt: new Date(),
        pending: true,
      };

      setMessages((prev) => [...prev, optimisticMessage]);
      setText("");

      try {
        const { sendMessageCommon } = await import("@/lib/chat/sendMessageCommon");
        const messageId = await sendMessageCommon({
          roomId: chatRoomId,
          uid: myUid,
          text: trimmed,
          type: "message",
          inputMode: "typing",
        });

        if (messageId && notifyUids.length > 0) {
          try {
            const { createChatNoti } = await import("@/features/notifications");
            await Promise.all(
              notifyUids.map((uid) =>
                createChatNoti(uid, chatRoomId, trimmed, messageId, roomType || undefined)
              )
            );
          } catch {
            /* ignore */
          }
        }
      } catch (error: unknown) {
        const err = error as { code?: string; message?: string };
        console.error("❌ [useChatSend] 메시지 전송 실패:", err);
        let errorMessage = "메시지 전송에 실패했습니다.";
        if (err?.code === "permission-denied") {
          errorMessage = "메시지를 보낼 권한이 없습니다.\n채팅방 참여 상태를 확인해주세요.";
        } else if (err?.message) {
          errorMessage = err.message;
        }
        alert(errorMessage);
        setText(trimmed);
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
    },
    [
      chatRoomId,
      myUid,
      room,
      setMessages,
      setText,
      navigate,
      roomType,
      isTrade,
      isRecruitGroup,
      isMatchThread,
    ]
  );

  const sendQuickMessage = useCallback(
    async (messageText: string) => {
      if (!chatRoomId || !myUid || !room) return;

      const memberBased = isMemberBasedChatRoom(room, isRecruitGroup, isMatchThread);
      const notifyUids = getNotifyTargetUids(room, myUid, isTrade, memberBased);
      if (notifyUids === null) return;

      const tempId = `temp-${Date.now()}`;
      const optimisticMessage: MessageDoc = {
        id: tempId,
        senderId: myUid,
        text: messageText,
        type: "message",
        createdAt: new Date(),
        pending: true,
      };

      setMessages((prev) => [...prev, optimisticMessage]);

      try {
        const { sendMessageCommon } = await import("@/lib/chat/sendMessageCommon");
        const messageId = await sendMessageCommon({
          roomId: chatRoomId,
          uid: myUid,
          text: messageText,
          type: "message",
          inputMode: "typing",
        });

        if (messageId && notifyUids.length > 0) {
          try {
            const { createChatNoti } = await import("@/features/notifications");
            await Promise.all(
              notifyUids.map((uid) =>
                createChatNoti(uid, chatRoomId, messageText, messageId, roomType || undefined)
              )
            );
          } catch {
            /* ignore */
          }
        }
      } catch (error: unknown) {
        const err = error as { message?: string };
        console.error("❌ [useChatSend] 추천 문장 전송 실패:", err);
        alert(err?.message || "메시지 전송에 실패했습니다.");
        setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
      }
    },
    [chatRoomId, myUid, room, setMessages, roomType, isTrade, isRecruitGroup, isMatchThread]
  );

  const sendVoiceMessage = useCallback(
    async (voiceText: string) => {
      const { shouldSendSTTMessage } = await import("@/lib/chat/sttGuard");
      if (!shouldSendSTTMessage(voiceText, chatRoomId || "")) return;
      if (!chatRoomId || !myUid || !room) return;

      const members = (room as { members?: string[] }).members || room.participants || [];
      if (!members.includes(myUid)) {
        alert("이 채팅방에 참여할 권한이 없습니다.\n승인된 사용자만 채팅할 수 있습니다.");
        const mid =
          isMatchThread && String((room as { matchId?: string }).matchId || "").trim();
        navigate(mid ? `/match/${mid}` : "/app/market");
        return;
      }

      const isClosed = room.recruitStatus === "CLOSED" || room.status === "closed";
      if (isRecruitGroup && isClosed) {
        alert("모집이 마감되어 채팅을 보낼 수 없습니다.");
        return;
      }
      if (!voiceText.trim()) return;

      const memberBased = isMemberBasedChatRoom(room, isRecruitGroup, isMatchThread);
      const notifyUids = getNotifyTargetUids(room, myUid, isTrade, memberBased);
      if (notifyUids === null) {
        alert(
          isTrade
            ? "거래 상대 정보를 찾을 수 없어 메시지를 보낼 수 없습니다."
            : "이 채팅방 유형에서는 메시지를 보낼 수 없습니다."
        );
        return;
      }

      const tempId = `temp-${Date.now()}`;
      const optimisticMessage: MessageDoc = {
        id: tempId,
        senderId: myUid,
        text: voiceText.trim(),
        type: "message",
        createdAt: new Date(),
        pending: true,
      };

      setMessages((prev) => [...prev, optimisticMessage]);

      try {
        const { sendMessageCommon } = await import("@/lib/chat/sendMessageCommon");
        const messageId = await sendMessageCommon({
          roomId: chatRoomId,
          uid: myUid,
          text: voiceText.trim(),
          type: "message",
          inputMode: "voice",
          stt: { provider: "webSpeech", language: "ko-KR" },
        });

        if (messageId && notifyUids.length > 0) {
          try {
            const { createChatNoti } = await import("@/features/notifications");
            await Promise.all(
              notifyUids.map((uid) =>
                createChatNoti(
                  uid,
                  chatRoomId,
                  voiceText.trim(),
                  messageId,
                  roomType || undefined
                )
              )
            );
          } catch {
            /* ignore */
          }
        }
      } catch (error: unknown) {
        const err = error as { message?: string };
        console.error("❌ [useChatSend] 음성 메시지 전송 실패:", err);
        alert(err?.message || "음성 메시지 전송에 실패했습니다.");
        setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
      }
    },
    [
      chatRoomId,
      myUid,
      room,
      setMessages,
      navigate,
      roomType,
      isTrade,
      isRecruitGroup,
      isMatchThread,
    ]
  );

  const handleImageSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0 || !chatRoomId || !myUid || !room) return;

      if (isTrade) {
        const otherUid = room.buyerId === myUid ? room.sellerId : room.buyerId;
        if (!otherUid) {
          alert("거래 상대 정보를 찾을 수 없어 이미지를 보낼 수 없습니다.");
          return;
        }
      }

      setIsUploadingImages(true);
      try {
        await sendImageMessage(chatRoomId, myUid, Array.from(files));
      } catch (error: unknown) {
        const err = error as { message?: string };
        console.error("❌ [useChatSend] 이미지 업로드 실패:", err);
        alert("이미지 업로드에 실패했습니다: " + (err.message || "알 수 없는 오류"));
      } finally {
        setIsUploadingImages(false);
      }
    },
    [chatRoomId, myUid, room, isTrade, isRecruitGroup, isMatchThread]
  );

  return {
    sendTextMessage,
    sendQuickMessage,
    sendVoiceMessage,
    handleImageSelect,
    isUploadingImages,
  };
}
