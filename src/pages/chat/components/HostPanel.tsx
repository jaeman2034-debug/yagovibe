/**
 * 🔥 모집 단체방 Host 전용 관리 패널
 */
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { kickMember, closeRecruit, reopenRecruit, transferHost } from "@/lib/chat/roomManagement";
import { Crown, UserX, Lock, Unlock, UserCheck } from "lucide-react";

interface HostPanelProps {
  roomId: string;
  room: {
    type?: "recruit_group" | "trade";
    members?: string[];
    roles?: { [uid: string]: "host" | "member" | "banned" };
    status?: "closed" | "active" | null;
    postId?: string;
  };
  myUid: string;
}

export default function HostPanel({ roomId, room, myUid }: HostPanelProps) {
  // 🔥 타입 가드: recruit_group만 표시 (중고거래 방에서 숨김)
  if (room.type !== "recruit_group") {
    return null;
  }

  const [memberNames, setMemberNames] = useState<{ [uid: string]: string }>({});
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // 🔥 host 권한 확인
  const isHost = room.roles?.[myUid] === "host";
  const isClosed = room.status === "closed";

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
            console.warn(`⚠️ [HostPanel] 사용자 정보 조회 실패: ${uid}`, err);
            names[uid] = "알 수 없음";
          }
        })
      );
      
      setMemberNames(names);
    };

    fetchMemberNames();
  }, [room.members]);

  // 🔥 host가 아니면 표시하지 않음
  if (!isHost) return null;

  const members = room.members || [];
  const otherMembers = members.filter((uid) => uid !== myUid);

  const handleKick = async (targetUid: string) => {
    if (!confirm(`${memberNames[targetUid] || targetUid}님을 강퇴하시겠습니까?`)) return;
    
    setIsProcessing(`kick_${targetUid}`);
    try {
      await kickMember(roomId, myUid, targetUid); // actorUid, targetUid 순서
      alert("강퇴되었습니다.");
    } catch (err: any) {
      console.error("❌ [HostPanel] 강퇴 실패:", err);
      alert(err.message || "강퇴에 실패했습니다.");
    } finally {
      setIsProcessing(null);
    }
  };

  const handleClose = async () => {
    if (!confirm("모집을 마감하시겠습니까?\n마감 후에는 채팅이 제한됩니다.")) return;
    
    setIsProcessing("close");
    try {
      await closeRecruit(roomId, myUid);
      alert("모집이 마감되었습니다.");
    } catch (err: any) {
      console.error("❌ [HostPanel] 마감 실패:", err);
      alert(err.message || "마감에 실패했습니다.");
    } finally {
      setIsProcessing(null);
    }
  };

  const handleReopen = async () => {
    if (!confirm("모집을 다시 시작하시겠습니까?")) return;
    
    setIsProcessing("reopen");
    try {
      await reopenRecruit(roomId, myUid);
      alert("모집이 다시 시작되었습니다.");
    } catch (err: any) {
      console.error("❌ [HostPanel] 재개 실패:", err);
      alert(err.message || "재개에 실패했습니다.");
    } finally {
      setIsProcessing(null);
    }
  };

  const handleTransferHost = async (targetUid: string) => {
    const targetName = memberNames[targetUid] || targetUid;
    if (!confirm(`${targetName}님에게 방장 권한을 위임하시겠습니까?\n위임 후에는 관리자로 변경됩니다.`)) return;
    
    setIsProcessing(`transfer_${targetUid}`);
    try {
      await transferHost(roomId, myUid, targetUid); // roomId, currentHostUid, newHostUid
      alert("방장 권한이 위임되었습니다.");
    } catch (err: any) {
      console.error("❌ [HostPanel] 위임 실패:", err);
      alert(err.message || "위임에 실패했습니다.");
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div
      style={{
        background: "#fef3c7",
        borderTop: "2px solid #f59e0b",
        padding: "12px 16px",
        marginTop: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
          fontSize: 14,
          fontWeight: 700,
          color: "#92400e",
        }}
      >
        <Crown size={16} color="#f59e0b" />
        <span>호스트 관리</span>
      </div>

      {/* 멤버 관리 */}
      {otherMembers.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#78350f",
              marginBottom: 8,
            }}
          >
            멤버 관리
          </div>
          {otherMembers.map((uid) => {
            const name = memberNames[uid] || "로딩 중...";
            const isKicking = isProcessing === `kick_${uid}`;
            const isTransferring = isProcessing === `transfer_${uid}`;
            const isProcessingThis = isKicking || isTransferring || (isProcessing !== null && isProcessing !== `kick_${uid}` && isProcessing !== `transfer_${uid}`);

            return (
              <div
                key={uid}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  background: "#fff",
                  borderRadius: 8,
                  marginBottom: 6,
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 13, color: "#374151", flex: 1 }}>{name}</span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => handleTransferHost(uid)}
                    disabled={isTransferring || isProcessingThis}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "4px 12px",
                      background: isTransferring ? "#9ca3af" : "#3b82f6",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: isTransferring || isProcessingThis ? "not-allowed" : "pointer",
                      opacity: isTransferring || isProcessingThis ? 0.6 : 1,
                    }}
                  >
                    <UserCheck size={14} />
                    {isTransferring ? "처리 중..." : "위임"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKick(uid)}
                    disabled={isKicking || isProcessingThis}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "4px 12px",
                      background: isKicking ? "#9ca3af" : "#ef4444",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: isKicking || isProcessingThis ? "not-allowed" : "pointer",
                      opacity: isKicking || isProcessingThis ? 0.6 : 1,
                    }}
                  >
                    <UserX size={14} />
                    {isKicking ? "처리 중..." : "강퇴"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 마감/재개 버튼 */}
      <div
        style={{
          paddingTop: 12,
          borderTop: "1px solid #fde68a",
        }}
      >
        {isClosed ? (
          <button
            type="button"
            onClick={handleReopen}
            disabled={isProcessing === "reopen" || isProcessing !== null}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "10px 16px",
              background: isProcessing === "reopen" ? "#9ca3af" : "#10b981",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: isProcessing === "reopen" || isProcessing !== null ? "not-allowed" : "pointer",
              opacity: isProcessing === "reopen" || isProcessing !== null ? 0.6 : 1,
            }}
          >
            <Unlock size={16} />
            {isProcessing === "reopen" ? "처리 중..." : "모집 재개"}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleClose}
            disabled={isProcessing === "close" || isProcessing !== null}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "10px 16px",
              background: isProcessing === "close" ? "#9ca3af" : "#111827",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: isProcessing === "close" || isProcessing !== null ? "not-allowed" : "pointer",
              opacity: isProcessing === "close" || isProcessing !== null ? 0.6 : 1,
            }}
          >
            <Lock size={16} />
            {isProcessing === "close" ? "처리 중..." : "모집 마감"}
          </button>
        )}
      </div>
    </div>
  );
}
