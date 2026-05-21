/**
 * 🔥 모집 단체방 메시지 아이템 (시스템 메시지 구분 + TTS 읽어주기)
 */
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useMediaViewer } from "@/hooks/useMediaViewer";
import type { MediaItem } from "@/hooks/useMediaViewer";
import { useTTS } from "@/hooks/useTTS";
import MessageReactions from "./MessageReactions";
import UserBadge from "@/components/team/UserBadge";

interface RecruitGroupMessageItemProps {
  message: {
    id: string;
    senderId?: string;
    text: string;
    type?: "system" | "message" | "image" | "video";
    images?: Array<{
      url: string;
      thumbUrl: string;
      width: number;
      height: number;
    }>;
    videos?: Array<{
      url: string;
      thumbUrl: string;
      duration: number;
      size: number;
    }>;
    createdAt?: any;
    location?: { lat: number; lng: number };
    readBy?: string[]; // 🔥 읽음 표시: uid 배열
    seq?: number; // 🔥 seq 필드 (읽음 상태 계산용)
    reactions?: { [emoji: string]: string[] }; // 🔥 리액션 (이모지 반응)
  };
  myUid: string;
  room?: {
    participants?: string[];
    members?: string[];
    lastReadAt?: { [uid: string]: any }; // 🔥 읽음 상태 계산을 위한 room 정보 (lastReadAt 기반)
  };
  mediaViewer?: ReturnType<typeof useMediaViewer>;
  roomId?: string; // 🔥 리액션을 위한 roomId 추가
}

export default function RecruitGroupMessageItem({ message, myUid, room, mediaViewer: propMediaViewer, roomId }: RecruitGroupMessageItemProps) {
  const [senderName, setSenderName] = useState<string | null>(null);
  const localMediaViewer = useMediaViewer();
  const mediaViewer = propMediaViewer || localMediaViewer;
  
  // 🔥 TTS 훅 (읽어주기 기능)
  const { isSpeaking, speak, stop, supported: ttsSupported } = useTTS({
    lang: "ko-KR",
    rate: 1,
    pitch: 1,
    volume: 1,
  });

  // 🔥 시스템 메시지가 아니면 발신자 이름 조회
  useEffect(() => {
    if (message.type === "system" || !message.senderId) {
      setSenderName(null);
      return;
    }

    const fetchSenderName = async () => {
      try {
        const userRef = doc(db, "users", message.senderId!);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          setSenderName(
            userData.displayName || 
            userData.name || 
            userData.email?.split("@")[0] || 
            "알 수 없음"
          );
        } else {
          setSenderName("알 수 없음");
        }
      } catch (err) {
        console.warn(`⚠️ [RecruitGroupMessageItem] 사용자 정보 조회 실패: ${message.senderId}`, err);
        setSenderName("알 수 없음");
      }
    };

    fetchSenderName();
  }, [message.senderId, message.type]);

  // 🔥 시스템 메시지
  if (message.type === "system" || !message.senderId) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          marginBottom: 12,
          marginTop: 12,
        }}
      >
        <div
          style={{
            padding: "8px 16px",
            background: "#f3f4f6",
            borderRadius: 12,
            fontSize: 13,
            color: "#6b7280",
            textAlign: "center",
            maxWidth: "80%",
          }}
        >
          {message.text}
        </div>
      </div>
    );
  }

  // 🔥 위치 메시지
  if (message.location) {
    const isMine = message.senderId === myUid;
    
    // 🔥 타입 안전성: Firestore에서 가져올 때 숫자가 문자열로 변환될 수 있음
    const lat = Number(message.location.lat);
    const lng = Number(message.location.lng);
    const isValidLocation = !isNaN(lat) && !isNaN(lng);
    const mapUrl = isValidLocation ? `https://www.google.com/maps?q=${lat},${lng}` : '#';
    
    return (
      <div
        style={{
          display: "flex",
          justifyContent: isMine ? "flex-end" : "flex-start",
          marginBottom: 12,
        }}
      >
        <a
          href={mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            // 🔥 유효하지 않은 위치인 경우 클릭 차단
            if (!isValidLocation) {
              e.preventDefault();
              console.error("❌ [RecruitGroupMessageItem] 위치 좌표가 유효하지 않습니다:", message.location);
              alert("위치 정보를 불러올 수 없습니다.");
              return;
            }
            // 🔥 이벤트 전파 차단 (무한 루프 방지)
            e.stopPropagation();
          }}
          style={{
            maxWidth: "70%",
            padding: "12px 16px",
            borderRadius: 12,
            background: isMine ? "#2563eb" : "#fff",
            border: isMine ? "none" : "1px solid #e5e7eb",
            boxShadow: isMine ? "none" : "0 1px 2px rgba(0,0,0,0.05)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            transition: "opacity 0.2s",
            textDecoration: "none",
            color: "inherit",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.9";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
          }}
        >
          <span style={{ fontSize: 20 }}>📍</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: isMine ? "#fff" : "#111827", marginBottom: 4 }}>
              위치 공유
            </div>
            <div style={{ fontSize: 12, color: isMine ? "rgba(255,255,255,0.8)" : "#6b7280" }}>
              지도를 열어보세요
            </div>
          </div>
        </a>
      </div>
    );
  }

  // 🔥 동영상 메시지
  if (message.type === "video" && message.videos && message.videos.length > 0) {
    const isMine = message.senderId === myUid;

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: isMine ? "flex-end" : "flex-start",
          marginBottom: 12,
        }}
      >
        {/* 발신자 이름 (내 메시지가 아닐 때만) */}
        {!isMine && senderName && (
          <div
            style={{
              fontSize: 11,
              color: "#6b7280",
              marginBottom: 4,
              paddingLeft: 4,
            }}
          >
            {senderName}
          </div>
        )}

        {/* 동영상 리스트 */}
        <div
          style={{
            maxWidth: "70%",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {message.videos.map((vid, idx) => {
            // 🔥 모든 미디어 아이템 수집 (이미지 + 동영상)
            const allMediaItems: MediaItem[] = [
              ...(message.images || []).map((img) => ({
                kind: "image" as const,
                url: img.url,
                thumbUrl: img.thumbUrl,
                width: img.width,
                height: img.height,
              })),
              ...(message.videos || []).map((v) => ({
                kind: "video" as const,
                url: v.url,
                thumbUrl: v.thumbUrl,
                duration: v.duration,
                size: v.size,
              })),
            ];
            const videoIndex = (message.images?.length || 0) + idx;

            return (
              <div
                key={idx}
                style={{
                  position: "relative",
                  borderRadius: 12,
                  overflow: "hidden",
                  cursor: "pointer",
                  background: "#000",
                }}
                onClick={() => {
                  if (allMediaItems.length > 0) {
                    mediaViewer.show(allMediaItems, videoIndex);
                  } else {
                    window.open(vid.url, "_blank");
                  }
                }}
              >
              <img
                src={vid.thumbUrl}
                alt={`동영상 ${idx + 1}`}
                style={{
                  width: "100%",
                  height: "auto",
                  minHeight: 200,
                  maxHeight: 400,
                  objectFit: "cover",
                  display: "block",
                }}
              />
              {/* 재생 버튼 오버레이 */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(0, 0, 0, 0.3)",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(0, 0, 0, 0.5)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(0, 0, 0, 0.3)";
                }}
              >
                <div
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: "50%",
                    background: "rgba(255, 255, 255, 0.9)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 24,
                    color: "#2563eb",
                  }}
                >
                  ▶
                </div>
              </div>
              {/* 동영상 길이 표시 */}
              {vid.duration > 0 && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 8,
                    right: 8,
                    background: "rgba(0, 0, 0, 0.7)",
                    color: "#fff",
                    padding: "4px 8px",
                    borderRadius: 4,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {Math.floor(vid.duration / 60)}:{(Math.floor(vid.duration % 60)).toString().padStart(2, "0")}
                </div>
              )}
            </div>
            );
          })}
        </div>

        {/* 동영상 메시지 텍스트 (있는 경우) + TTS 버튼 */}
        {message.text && message.text !== "동영상을 보냈습니다" && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 8,
              maxWidth: "70%",
              marginTop: 8,
            }}
          >
            <div
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: 18,
                background: isMine ? "#2563eb" : "#fff",
                color: isMine ? "#fff" : "#111827",
                border: isMine ? "none" : "1px solid #e5e7eb",
                boxShadow: isMine ? "none" : "0 1px 2px rgba(0,0,0,0.05)",
                whiteSpace: "pre-wrap",
                lineHeight: 1.5,
                wordBreak: "break-word",
              }}
            >
              {message.text}
            </div>
            
            {/* 🔥 TTS 읽어주기 버튼 */}
            {ttsSupported && message.text.trim() && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (isSpeaking) {
                    stop();
                  } else {
                    speak(message.text);
                  }
                }}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  border: "none",
                  background: isSpeaking ? "#ef4444" : (isMine ? "rgba(255,255,255,0.2)" : "#f3f4f6"),
                  color: isSpeaking ? "#fff" : (isMine ? "#fff" : "#6b7280"),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontSize: 16,
                  transition: "all 0.2s",
                  flexShrink: 0,
                }}
                title={isSpeaking ? "읽기 중지" : "읽어주기"}
                aria-label={isSpeaking ? "읽기 중지" : "읽어주기"}
              >
                {isSpeaking ? "⏹" : "🔊"}
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // 🔥 이미지 메시지
  if (message.type === "image" && message.images && message.images.length > 0) {
    const isMine = message.senderId === myUid;

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: isMine ? "flex-end" : "flex-start",
          marginBottom: 12,
        }}
      >
        {/* 발신자 이름 (내 메시지가 아닐 때만) */}
        {!isMine && senderName && (
          <div
            style={{
              fontSize: 11,
              color: "#6b7280",
              marginBottom: 4,
              paddingLeft: 4,
            }}
          >
            {senderName}
          </div>
        )}

        {/* 이미지 그리드 */}
        <div
          style={{
            maxWidth: "70%",
            display: "grid",
            gridTemplateColumns: message.images.length === 1 ? "1fr" : "repeat(2, 1fr)",
            gap: 4,
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          {message.images.map((img, idx) => {
            // 🔥 모든 미디어 아이템 수집 (이미지 + 동영상)
            const allMediaItems: MediaItem[] = [
              ...(message.images || []).map((i) => ({
                kind: "image" as const,
                url: i.url,
                thumbUrl: i.thumbUrl,
                width: i.width,
                height: i.height,
              })),
              ...(message.videos || []).map((v) => ({
                kind: "video" as const,
                url: v.url,
                thumbUrl: v.thumbUrl,
                duration: v.duration,
                size: v.size,
              })),
            ];

            return (
              <img
                key={idx}
                src={img.thumbUrl}
                alt={`이미지 ${idx + 1}`}
                onClick={() => {
                  if (allMediaItems.length > 0) {
                    mediaViewer.show(allMediaItems, idx);
                  } else {
                    window.open(img.url, "_blank");
                  }
                }}
                style={{
                width: "100%",
                height: "auto",
                minHeight: 120,
                maxHeight: 300,
                objectFit: "cover",
                cursor: "pointer",
                borderRadius: 4,
                transition: "opacity 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "0.9";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "1";
                }}
              />
            );
          })}
          </div>

        {/* 이미지 메시지 텍스트 (있는 경우) + TTS 버튼 */}
        {message.text && message.text !== "사진을 보냈습니다" && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 8,
              maxWidth: "70%",
              marginTop: 8,
            }}
          >
            <div
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: 18,
                background: isMine ? "#2563eb" : "#fff",
                color: isMine ? "#fff" : "#111827",
                border: isMine ? "none" : "1px solid #e5e7eb",
                boxShadow: isMine ? "none" : "0 1px 2px rgba(0,0,0,0.05)",
                whiteSpace: "pre-wrap",
                lineHeight: 1.5,
                wordBreak: "break-word",
              }}
            >
              {message.text}
            </div>
            
            {/* 🔥 TTS 읽어주기 버튼 */}
            {ttsSupported && message.text.trim() && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (isSpeaking) {
                    stop();
                  } else {
                    speak(message.text);
                  }
                }}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  border: "none",
                  background: isSpeaking ? "#ef4444" : (isMine ? "rgba(255,255,255,0.2)" : "#f3f4f6"),
                  color: isSpeaking ? "#fff" : (isMine ? "#fff" : "#6b7280"),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontSize: 16,
                  transition: "all 0.2s",
                  flexShrink: 0,
                }}
                title={isSpeaking ? "읽기 중지" : "읽어주기"}
                aria-label={isSpeaking ? "읽기 중지" : "읽어주기"}
              >
                {isSpeaking ? "⏹" : "🔊"}
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // 🔥 일반 텍스트 메시지
  const isMine = message.senderId === myUid;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: isMine ? "flex-end" : "flex-start",
        marginBottom: 12,
      }}
    >
      {/* 발신자 이름 (내 메시지가 아닐 때만) */}
      {!isMine && senderName && (
        <div
          style={{
            fontSize: 11,
            color: "#6b7280",
            marginBottom: 4,
            paddingLeft: 4,
          }}
        >
          {senderName}
        </div>
      )}

      {/* 메시지 버블 + TTS 버튼 */}
      <div
        className="message-row"
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 8,
          maxWidth: "70%",
          minWidth: 0,
        }}
      >
        <div
          className="message-bubble chat-message"
          style={{
            flex: 1,
            minWidth: 0,
            padding: "10px 14px",
            borderRadius: 16,
            background: isMine ? "#2563eb" : "#fff",
            color: isMine ? "#fff" : "#111827",
            border: isMine ? "none" : "1px solid #e5e7eb",
            boxShadow: isMine ? "none" : "0 1px 2px rgba(0,0,0,0.05)",
            whiteSpace: "pre-wrap",
            lineHeight: 1.5,
            wordBreak: "break-word",
            overflowWrap: "break-word",
          }}
        >
          {message.text || ""}
        </div>
        
        {/* 🔥 TTS 읽어주기 버튼 (텍스트 메시지에만 표시) */}
        {ttsSupported && message.text && message.text.trim() && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (isSpeaking) {
                stop();
              } else {
                speak(message.text);
              }
            }}
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: "none",
              background: isSpeaking ? "#ef4444" : (isMine ? "rgba(255,255,255,0.2)" : "#f3f4f6"),
              color: isSpeaking ? "#fff" : (isMine ? "#fff" : "#6b7280"),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: 16,
              transition: "all 0.2s",
              flexShrink: 0,
            }}
            title={isSpeaking ? "읽기 중지" : "읽어주기"}
            aria-label={isSpeaking ? "읽기 중지" : "읽어주기"}
            onMouseEnter={(e) => {
              if (!isSpeaking) {
                e.currentTarget.style.background = isMine ? "rgba(255,255,255,0.3)" : "#e5e7eb";
              }
            }}
            onMouseLeave={(e) => {
              if (!isSpeaking) {
                e.currentTarget.style.background = isMine ? "rgba(255,255,255,0.2)" : "#f3f4f6";
              }
            }}
          >
            {isSpeaking ? "⏹" : "🔊"}
          </button>
        )}
      </div>
      
      {/* 🔥 읽음 표시 (카톡 스타일): 내 메시지에만 표시 */}
      {isMine && message.type !== "system" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            marginTop: 4,
            paddingRight: 4,
          }}
        >
          {/* 시간 표시 */}
          {message.createdAt && (
            <span
              style={{
                fontSize: 11,
                color: "#9ca3af",
              }}
            >
              {new Date(
                message.createdAt?.toMillis?.() ||
                message.createdAt?.getTime?.() ||
                message.createdAt
              ).toLocaleTimeString("ko-KR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
          
          {/* 읽음 표시 (✓/✓✓) */}
          {(() => {
            const readBy = message.readBy || [];
            const members = room?.members || room?.participants || [];
            const membersCount = members.length;
            const readCount = readBy.length;
            
            // 보낸 사람 제외한 읽음 수
            const otherReadCount = readCount - 1; // senderId는 항상 포함
            
            if (otherReadCount <= 0) {
              // 아무도 안 읽음
              return null;
            } else if (otherReadCount === 1 && readCount < membersCount) {
              // 1명 읽음 (전원 아님)
              return (
                <span style={{ fontSize: 12, color: "#9ca3af" }}>✓</span>
              );
            } else if (readCount >= membersCount) {
              // 전원 읽음
              return (
                <span style={{ fontSize: 12, color: "#2563eb" }}>✓✓</span>
              );
            } else {
              // 일부 읽음
              return (
                <span style={{ fontSize: 12, color: "#9ca3af" }}>✓</span>
              );
            }
          })()}
        </div>
      )}
      
      {/* 🔥 리액션 표시 */}
      {roomId && message.reactions && (
        <div style={{ position: "relative", marginTop: 4 }}>
          <MessageReactions
            messageId={message.id}
            roomId={roomId}
            reactions={message.reactions}
          />
        </div>
      )}
      
      {/* 🔥 읽음 처리 완전판: 시간 및 읽음 상태 표시 (내 메시지에만) - 레거시 */}
      {isMine && message.type !== "system" && false && (
        <div
          style={{
            fontSize: 10,
            color: "#9ca3af",
            marginTop: 4,
            textAlign: "right",
            paddingRight: 4,
          }}
        >
          {/* 시간 표시 */}
          {message.createdAt && (() => {
            try {
              const date = message.createdAt.toDate ? message.createdAt.toDate() : new Date(message.createdAt);
              const hours = date.getHours();
              const minutes = date.getMinutes();
              return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
            } catch {
              return "";
            }
          })()}
          
          {/* 읽음 상태 표시 (lastReadAt 기반) */}
          {(() => {
            if (!room || !message.createdAt) return null;
            
            const participants = room.participants || room.members || [];
            const otherParticipants = participants.filter((uid) => uid !== myUid);
            
            if (otherParticipants.length === 0) return null;
            
            // 🔥 lastReadAt 기반 읽음 상태 계산 (더 효율적)
            const lastReadAt = (room as any).lastReadAt || {};
            const messageTime = message.createdAt?.toDate 
              ? message.createdAt.toDate().getTime() 
              : message.createdAt 
                ? new Date(message.createdAt).getTime() 
                : 0;
            
            if (messageTime === 0) return null;
            
            // 🔥 모든 참여자가 읽었는지 확인
            const allRead = otherParticipants.every((uid) => {
              const readTime = lastReadAt[uid]?.toDate 
                ? lastReadAt[uid].toDate().getTime() 
                : lastReadAt[uid] 
                  ? new Date(lastReadAt[uid]).getTime() 
                  : 0;
              return readTime >= messageTime;
            });
            
            // 🔥 모든 참여자가 읽었으면 "읽음" 표시
            if (allRead) {
              return <span style={{ marginLeft: 4, color: "#60a5fa" }}>읽음</span>;
            }
            
            // 🔥 일부만 읽었거나 아직 안 읽었으면 "전송됨" 표시
            return <span style={{ marginLeft: 4, opacity: 0.7 }}>전송됨</span>;
          })()}
        </div>
      )}
      
      {/* 🔥 리액션 표시 */}
      {roomId && message.reactions && (
        <div style={{ position: "relative", marginTop: 4 }}>
          <MessageReactions
            messageId={message.id}
            roomId={roomId}
            reactions={message.reactions}
          />
        </div>
      )}
    </div>
  );
}
