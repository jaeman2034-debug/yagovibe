/**
 * 🔥 메시지 리액션 컴포넌트 (이모지 반응)
 */
import { useState } from "react";
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import { Smile } from "lucide-react";

interface MessageReactionsProps {
  messageId: string;
  roomId: string;
  reactions?: { [emoji: string]: string[] };
}

const COMMON_EMOJIS = ["👍", "❤️", "🔥", "😄", "🎉", "👏"];

export default function MessageReactions({
  messageId,
  roomId,
  reactions = {},
}: MessageReactionsProps) {
  const { user } = useAuth();
  const myUid = user?.uid;
  const [showPicker, setShowPicker] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // 리액션 추가
  const handleAddReaction = async (emoji: string) => {
    if (!myUid || !messageId || isUpdating) return;

    setIsUpdating(true);
    try {
      const messageRef = doc(db, "chatRooms", roomId, "messages", messageId);
      const currentReaction = reactions[emoji] || [];

      // 이미 리액션했으면 제거, 아니면 추가
      if (currentReaction.includes(myUid)) {
        await updateDoc(messageRef, {
          [`reactions.${emoji}`]: arrayRemove(myUid),
        });
      } else {
        await updateDoc(messageRef, {
          [`reactions.${emoji}`]: arrayUnion(myUid),
        });
      }
    } catch (error: any) {
      console.error("❌ [MessageReactions] 리액션 업데이트 실패:", error);
    } finally {
      setIsUpdating(false);
      setShowPicker(false);
    }
  };

  // 리액션된 이모지 목록 (개수 > 0)
  const activeReactions = Object.entries(reactions).filter(
    ([, uids]) => uids && uids.length > 0
  );

  if (activeReactions.length === 0 && !showPicker) {
    // 리액션이 없고 피커도 닫혀있으면 길게 누르기 힌트만 표시
    return null;
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        marginTop: 4,
        flexWrap: "wrap",
      }}
    >
      {/* 활성 리액션 표시 */}
      {activeReactions.map(([emoji, uids]) => {
        const count = uids?.length || 0;
        const isMine = myUid && uids?.includes(myUid);

        return (
          <button
            key={emoji}
            onClick={() => handleAddReaction(emoji)}
            disabled={isUpdating}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 8px",
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              background: isMine ? "#dbeafe" : "#f9fafb",
              fontSize: 12,
              cursor: isUpdating ? "not-allowed" : "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              if (!isUpdating) {
                e.currentTarget.style.background = isMine ? "#bfdbfe" : "#f3f4f6";
              }
            }}
            onMouseLeave={(e) => {
              if (!isUpdating) {
                e.currentTarget.style.background = isMine ? "#dbeafe" : "#f9fafb";
              }
            }}
          >
            <span>{emoji}</span>
            <span style={{ color: "#6b7280", fontWeight: 500 }}>{count}</span>
          </button>
        );
      })}

      {/* 이모지 추가 버튼 */}
      <button
        onClick={() => setShowPicker(!showPicker)}
        style={{
          padding: "4px 8px",
          borderRadius: 12,
          border: "1px solid #e5e7eb",
          background: "#fff",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#f3f4f6";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#fff";
        }}
      >
        <Smile size={14} color="#6b7280" />
      </button>

      {/* 이모지 선택 팝업 */}
      {showPicker && (
        <div
          style={{
            position: "absolute",
            bottom: "100%",
            left: 0,
            marginBottom: 8,
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            display: "flex",
            gap: 4,
            zIndex: 100,
          }}
        >
          {COMMON_EMOJIS.map((emoji) => {
            const uids = reactions[emoji] || [];
            const isMine = myUid && uids.includes(myUid);

            return (
              <button
                key={emoji}
                onClick={() => handleAddReaction(emoji)}
                disabled={isUpdating}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  border: "none",
                  background: isMine ? "#dbeafe" : "transparent",
                  fontSize: 20,
                  cursor: isUpdating ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onMouseEnter={(e) => {
                  if (!isUpdating) {
                    e.currentTarget.style.background = "#f3f4f6";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isUpdating) {
                    e.currentTarget.style.background = isMine ? "#dbeafe" : "transparent";
                  }
                }}
              >
                {emoji}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
