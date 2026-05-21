/**
 * 🔥 팀 채팅 헤더 (팀 정보 표시 + 출석 시작 버튼)
 */
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { Users, Image as ImageIcon, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { getTeamTypeConfig } from "@/utils/teamTypeConfig";

interface TeamChatHeaderProps {
  roomId: string;
  room: {
    teamId?: string;
    name?: string;
    members?: string[];
  };
}

export default function TeamChatHeader({ roomId, room }: TeamChatHeaderProps) {
  const { user } = useAuth();
  const [teamInfo, setTeamInfo] = useState<{
    name: string;
    imageUrl?: string;
    memberCount: number;
  } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isStartingAttendance, setIsStartingAttendance] = useState(false);

  // 🔥 팀 정보 및 운영진 권한 조회
  useEffect(() => {
    if (!room.teamId || !user?.uid) return;

    const fetchTeamInfo = async () => {
      try {
        const teamRef = doc(db, "teams", room.teamId!);
        const teamSnap = await getDoc(teamRef);
        
        if (teamSnap.exists()) {
          const teamData = teamSnap.data();
          const members = room.members || [];
          
          setTeamInfo({
            name: teamData.name || "팀",
            imageUrl: teamData.imageUrl,
            memberCount: members.length,
          });

          // 운영진 권한 확인
          const memberRef = doc(db, "teams", room.teamId!, "members", user.uid);
          const memberSnap = await getDoc(memberRef);
          
          if (memberSnap.exists()) {
            const memberData = memberSnap.data();
            const role = memberData?.role || memberData?.accessLevel || "";
            setIsAdmin(["admin", "owner", "manager"].includes(role));
          }
        } else {
          // 팀 정보가 없으면 기본값
          setTeamInfo({
            name: room.name || "팀 채팅",
            memberCount: room.members?.length || 0,
          });
        }
      } catch (error) {
        console.error("❌ [TeamChatHeader] 팀 정보 조회 실패:", error);
        setTeamInfo({
          name: room.name || "팀 채팅",
          memberCount: room.members?.length || 0,
        });
      }
    };

    fetchTeamInfo();
  }, [room.teamId, room.name, room.members, user?.uid]);

  // 🔥 출석 시작
  const handleStartAttendance = async () => {
    if (!room.teamId || !roomId || isStartingAttendance) return;

    setIsStartingAttendance(true);
    try {
      const startAttendanceCheck = httpsCallable(functions, "startAttendanceCheck");
      const result = await startAttendanceCheck({
        teamId: room.teamId,
        roomId,
      });

      const data = result.data as any;
      if (data?.success) {
        toast.success("출석 체크를 시작했습니다!");
      }
    } catch (error: any) {
      console.error("❌ [TeamChatHeader] 출석 시작 실패:", error);
      toast.error(error?.message || "출석 체크 시작에 실패했습니다.");
    } finally {
      setIsStartingAttendance(false);
    }
  };

  if (!teamInfo) {
    return (
      <div
        style={{
          background: "#fff",
          borderBottom: "1px solid #e5e7eb",
          padding: "12px 16px",
        }}
      >
        <div style={{ fontSize: 14, color: "#6b7280" }}>로딩 중...</div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#fff",
        borderBottom: "1px solid #e5e7eb",
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      {/* 팀 프로필 이미지 */}
      {teamInfo.imageUrl ? (
        <img
          src={teamInfo.imageUrl}
          alt={teamInfo.name}
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            objectFit: "cover",
          }}
        />
      ) : (
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: "#e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ImageIcon size={20} color="#9ca3af" />
        </div>
      )}

      {/* 팀 정보 */}
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: "#111827",
            marginBottom: 2,
          }}
        >
          {teamInfo.name}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 13,
            color: "#6b7280",
          }}
        >
          <Users size={14} />
          <span>멤버 {teamInfo.memberCount}명</span>
        </div>
      </div>

      {/* 🔥 운영진 전용: 출석 시작 버튼 */}
      {isAdmin && (
        <button
          onClick={handleStartAttendance}
          disabled={isStartingAttendance}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 12px",
            background: "#fbbf24",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: isStartingAttendance ? "not-allowed" : "pointer",
            opacity: isStartingAttendance ? 0.6 : 1,
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            if (!isStartingAttendance) {
              e.currentTarget.style.background = "#f59e0b";
            }
          }}
          onMouseLeave={(e) => {
            if (!isStartingAttendance) {
              e.currentTarget.style.background = "#fbbf24";
            }
          }}
        >
          <CheckCircle2 size={16} />
          <span>{isStartingAttendance ? "처리 중..." : "출석 시작"}</span>
        </button>
      )}
    </div>
  );
}
