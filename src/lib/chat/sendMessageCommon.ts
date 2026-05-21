/**
 * 🔥 통합 메시지 전송 함수 (Trade + Recruit 공통)
 * 
 * 역할:
 * - 메시지 추가 + lastMessageSeq 증가
 * - 보낸 사람 자동 읽음 처리
 * - Trade/Recruit 공통 동작
 */

import { db } from "@/lib/firebase";
import {
  doc,
  collection,
  addDoc,
  serverTimestamp,
  runTransaction,
  increment,
} from "firebase/firestore";

export interface ChatImage {
  url: string;
  thumbUrl: string;
  width: number;
  height: number;
}

export interface ChatVideo {
  url: string;
  thumbUrl: string;
  duration: number;
  size: number;
}

export interface SendMessageParams {
  roomId: string;
  uid: string;
  text: string;
  // 🔥 Optimistic UI: 클라이언트 임시 ID (메시지 매칭용)
  clientId?: string;
  // 🔥 P1-1: 메시지 타입 확장 (2단계 구조: messageType + systemType)
  type?: 
    | "message" // 일반 메시지
    | "system" // 시스템 메시지 (공통)
    | "image" // 이미지
    | "video" // 동영상
    | "location"; // 위치 공유
  // 🔥 P1-1: systemType (도메인별 시스템 메시지 분류)
  systemType?: 
    // Trade 전용
    | "offer_price" // 가격 제안
    | "accept_offer" // 제안 수락
    | "deal_confirmed" // 거래 확정
    | "deal_cancelled" // 거래 취소
    // Recruit 전용
    | "notice" // 공지
    | "schedule_updated" // 일정 변경
    | "member_joined" // 멤버 입장
    | "member_approved" // 멤버 승인
    | "role_changed"; // 역할 변경
  images?: ChatImage[];
  videos?: ChatVideo[];
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  // 🔥 STT 메타데이터 (옵션)
  inputMode?: "typing" | "voice";
  stt?: {
    provider: "webSpeech" | "whisper";
    confidence?: number;
    language?: string; // e.g. "ko-KR"
    durationMs?: number;
  };
}

/**
 * 🔥 통합 메시지 전송 (seq 기반 unread 관리 + 재시도)
 */
export async function sendMessageCommon(params: SendMessageParams): Promise<string> {
  const { roomId, uid, text, type = "message", images, videos, location } = params;
  const roomRef = doc(db, "chatRooms", roomId);
  const MAX_RETRIES = 3;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      let messageId = ""; // 🔥 메시지 ID 저장용
      await runTransaction(db, async (tx) => {
        const roomSnap = await tx.get(roomRef);
        if (!roomSnap.exists()) {
          throw new Error("채팅방을 찾을 수 없습니다.");
        }

        const room = roomSnap.data() as any;
        
        // 🔥 members 배열 확인 (권한 체크)
        const members = room.members || room.participants || [];
        if (!members.includes(uid)) {
          throw new Error("이 채팅방에 참여할 권한이 없습니다.\n승인된 사용자만 채팅할 수 있습니다.");
        }
        
        const nextSeq = (room.lastMessageSeq ?? 0) + 1;

        // 🔥 lastMessage 텍스트 결정
        let lastMessageText = text;
        if (type === "image" && images && images.length > 0) {
          lastMessageText = `사진 ${images.length}장`;
        } else if (type === "video" && videos && videos.length > 0) {
          lastMessageText = `동영상 ${videos.length}개`;
        } else if (type === "location" && location) {
          lastMessageText = "📍 위치를 공유했습니다";
        }

        // 🔥 1) 메시지 추가
        const msgRef = doc(collection(db, "chatRooms", roomId, "messages"));
        messageId = msgRef.id; // 🔥 메시지 ID 저장 (알림 스팸 방지용)
        const messageData: any = {
          seq: nextSeq,
          senderId: uid, // 🔥 기존 구조 호환
          text: type === "image" ? (text || "사진을 보냈습니다") 
            : type === "video" ? (text || "동영상을 보냈습니다")
            : type === "location" ? (text || "위치를 공유했습니다")
            : text,
          type,
          createdAt: serverTimestamp(),
          // 🔥 읽음 표시: 보낸 사람은 즉시 읽음 처리
          readBy: [uid], // 🔥 카톡 스타일 읽음 표시
          // 🔥 Optimistic UI: clientId 저장 (메시지 매칭용)
          ...(params.clientId && { clientId: params.clientId, clientMessageId: params.clientId }),
        };

        // 🔥 STT 메타데이터 추가 (옵션)
        if (params.inputMode === "voice" && params.stt) {
          messageData.inputMode = "voice";
          messageData.stt = {
            provider: params.stt.provider || "webSpeech",
            language: params.stt.language || "ko-KR",
            ...(params.stt.confidence !== undefined && { confidence: params.stt.confidence }),
            ...(params.stt.durationMs !== undefined && { durationMs: params.stt.durationMs }),
          };
        } else if (params.inputMode) {
          messageData.inputMode = params.inputMode;
        }

        // 🔥 이미지가 있으면 추가
        if (images && images.length > 0) {
          messageData.images = images;
        }

        // 🔥 동영상이 있으면 추가
        if (videos && videos.length > 0) {
          messageData.videos = videos;
        }

        // 🔥 위치 정보가 있으면 추가 (명시적 숫자 변환)
        if (location) {
          messageData.location = {
            lat: Number(location.lat), // 🔥 명시적 숫자 변환 (Firestore 타입 보장)
            lng: Number(location.lng), // 🔥 명시적 숫자 변환 (Firestore 타입 보장)
            ...(location.address && { address: location.address }),
          };
        }

        tx.set(msgRef, messageData);

        // 🔥 2) room lastMessage 갱신 + unreadCount 업데이트
        const participants = room.members || room.participants || [];
        const otherParticipants = participants.filter((p: string) => p !== uid);
        
        const updateData: any = {
          lastMessage: lastMessageText,
          lastMessageAt: serverTimestamp(),
          // 🔥 보낸 사람은 즉시 읽음 처리 (lastReadAt + unreadCount 0)
          [`lastReadAt.${uid}`]: serverTimestamp(),
          [`unreadCount.${uid}`]: 0,
        };
        
        // 🔥 상대방들의 unreadCount 증가 (읽음 처리 완전판 - increment 사용)
        otherParticipants.forEach((participantId: string) => {
          updateData[`unreadCount.${participantId}`] = increment(1);
          
          // 🔥 마켓 채팅 메시지 알림 생성 (비동기, 에러 무시)
          if (room.type === "trade" && room.productId) {
            import("@/services/marketNotificationService").then(({ notifyChatMessage }) => {
              notifyChatMessage({
                recipientId: participantId,
                senderId: uid,
                chatRoomId: roomId,
                postId: room.productId,
                messagePreview: lastMessageText.length > 50 ? lastMessageText.slice(0, 50) + "..." : lastMessageText,
                messageId: messageId || undefined,
              }).catch((err) => {
                console.warn("⚠️ 채팅 알림 생성 실패 (무시):", err);
              });
            }).catch((err) => {
              console.warn("⚠️ 알림 서비스 로드 실패 (무시):", err);
            });
          }
        });
        
        tx.update(roomRef, updateData);
      });
      
      // 🔥 성공 시 메시지 ID 반환
      return messageId;
    } catch (error: any) {
      // 🔥 트랜잭션 충돌 에러인 경우에만 재시도
      const isAborted = 
        error?.code === "aborted" ||
        error?.code === 10 || // Firestore gRPC ABORTED
        error?.message?.includes("version") ||
        error?.message?.includes("transaction") ||
        error?.message?.includes("concurrent");
      
      if (isAborted && attempt < MAX_RETRIES) {
        // 🔥 지수 백오프: 100ms, 200ms, 400ms
        const delay = Math.min(100 * Math.pow(2, attempt - 1), 1000);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue; // 재시도
      }
      
      // 🔥 재시도 불가능한 에러 또는 최대 재시도 횟수 초과
      // 원래 에러 메시지 유지
      if (error?.message) {
        throw error;
      }
      throw new Error("메시지 전송에 실패했습니다. 잠시 후 다시 시도해주세요.");
    }
  }
  // 🔥 모든 재시도 실패 시 빈 문자열 반환
  return "";
}
