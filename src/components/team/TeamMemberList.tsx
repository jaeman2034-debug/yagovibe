/**
 * 🔥 TeamMemberList - 팀원 목록 (팀장용 추방 기능 포함)
 * 
 * 팀장이 팀원을 추방할 수 있는 UI
 */

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import { removeTeamMember } from "@/lib/team/teamLeave";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/cards/Card";
import { UserX, MapPin, Trophy } from "lucide-react";

interface TeamMemberListProps {
  teamId: string;
}

interface TeamMember {
  uid: string;
  role?: string;
  status?: string;
  userName?: string;
  userSport?: string;
  userRegion?: string;
}

export function TeamMemberList({ teamId }: TeamMemberListProps) {
  const { user } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  // 팀원 목록 조회
  useEffect(() => {
    const loadMembers = async () => {
      try {
        setLoading(true);
        const membersRef = collection(db, `teams/${teamId}/members`);
        const snap = await getDocs(membersRef);

        const membersData = await Promise.all(
          snap.docs.map(async (doc) => {
            const data = doc.data();
            const uid = data.uid || doc.id;

            // 사용자 정보 조회
            try {
              const userRef = doc(db, "users", uid);
              const userSnap = await getDoc(userRef);
              const userData = userSnap.exists() ? userSnap.data() : null;

              return {
                uid,
                role: data.role,
                status: data.status,
                userName: userData?.displayName || userData?.nickname || "이름 없음",
                userSport: userData?.sport,
                userRegion: userData?.region,
              };
            } catch (error) {
              console.warn("[TeamMemberList] 사용자 정보 조회 실패:", error);
              return {
                uid,
                role: data.role,
                status: data.status,
                userName: "이름 없음",
              };
            }
          })
        );

        setMembers(membersData.filter((m) => m.status === "active"));
      } catch (error) {
        console.error("[TeamMemberList] 팀원 목록 조회 실패:", error);
        setMembers([]);
      } finally {
        setLoading(false);
      }
    };

    loadMembers();
  }, [teamId]);

  const handleRemove = async (memberId: string) => {
    if (!confirm("정말 이 팀원을 추방하시겠습니까?")) {
      return;
    }

    setRemoving(memberId);
    try {
      await removeTeamMember(teamId, memberId);
      // 목록에서 제거
      setMembers((prev) => prev.filter((m) => m.uid !== memberId));
    } catch (error: any) {
      console.error("[TeamMemberList] 추방 실패:", error);
      alert(error.message || "추방에 실패했습니다.");
    } finally {
      setRemoving(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  if (members.length === 0) {
    return null; // EmptyState 없음
  }

  return (
    <div className="space-y-4">
      {members.map((member) => (
        <Card key={member.uid} variant="info">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {member.userName}
              </h3>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                {member.userRegion && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{member.userRegion}</span>
                  </div>
                )}
                {member.userSport && (
                  <div className="flex items-center gap-1">
                    <Trophy className="w-4 h-4" />
                    <span>{member.userSport === "football" ? "축구" : member.userSport}</span>
                  </div>
                )}
                {member.role && (
                  <span className="text-xs text-gray-500">({member.role})</span>
                )}
              </div>
            </div>
            {/* 본인은 추방 불가 */}
            {member.uid !== user?.uid && (
              <Button
                onClick={() => handleRemove(member.uid)}
                disabled={removing === member.uid}
                className="bg-red-50 text-red-700 hover:bg-red-100"
                size="sm"
              >
                <UserX className="w-4 h-4 mr-1" />
                {removing === member.uid ? "처리 중..." : "추방"}
              </Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
