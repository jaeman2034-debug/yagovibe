/**
 * 🔥 모집 단체방 헤더 (멤버 목록 + 인원 수)
 */
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Users, Crown } from "lucide-react";

interface RecruitGroupChatHeaderProps {
  roomId: string;
  room: {
    members?: string[];
    roles?: { [uid: string]: "host" | "member" };
    postId?: string;
  };
}

export default function RecruitGroupChatHeader({ roomId, room }: RecruitGroupChatHeaderProps) {
  const [memberNames, setMemberNames] = useState<{ [uid: string]: string }>({});
  const [showMemberList, setShowMemberList] = useState(false);

  // 🔥 멤버 이름 조회
  useEffect(() => {
    if (!room.members || room.members.length === 0) return;

    const fetchMemberNames = async () => {
      const names: { [uid: string]: string } = {};
      
      await Promise.all(
        room.members!.map(async (uid) => {
          try {
            const userRef = doc(db, "users", uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              const userData = userSnap.data();
              names[uid] = userData.displayName || userData.name || userData.email?.split("@")[0] || "알 수 없음";
            } else {
              names[uid] = "알 수 없음";
            }
          } catch (err) {
            console.warn(`⚠️ [RecruitGroupChatHeader] 사용자 정보 조회 실패: ${uid}`, err);
            names[uid] = "알 수 없음";
          }
        })
      );
      
      setMemberNames(names);
    };

    fetchMemberNames();
  }, [room.members]);

  const members = room.members || [];
  const roles = room.roles || {};

  return (
    <div
      style={{
        background: "#fff",
        borderBottom: "1px solid #e5e7eb",
        padding: "12px 16px",
        position: "relative",
      }}
    >
      {/* 인원 수 + 멤버 목록 버튼 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
        }}
        onClick={() => setShowMemberList(!showMemberList)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Users size={18} color="#6b7280" />
          <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>
            참여 인원 {members.length}명
          </span>
        </div>
        <span style={{ fontSize: 12, color: "#6b7280" }}>
          {showMemberList ? "접기" : "펼치기"}
        </span>
      </div>

      {/* 멤버 목록 (펼침/접힘) */}
      {showMemberList && (
        <div
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: "1px solid #f3f4f6",
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          {members.map((uid) => {
            const name = memberNames[uid] || "로딩 중...";
            const role = roles[uid];
            const isHost = role === "host";

            return (
              <div
                key={uid}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "6px 12px",
                  background: isHost ? "#fef3c7" : "#f3f4f6",
                  borderRadius: 16,
                  fontSize: 13,
                  color: isHost ? "#92400e" : "#374151",
                  fontWeight: isHost ? 600 : 500,
                }}
              >
                {isHost && <Crown size={14} color="#f59e0b" />}
                <span>{name}</span>
                {isHost && <span style={{ fontSize: 11, opacity: 0.7 }}>(호스트)</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
