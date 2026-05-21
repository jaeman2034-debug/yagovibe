/**
 * 🔥 TeamMemberManagement - 멤버 관리 컴포넌트
 * 
 * 기능:
 * - 역할 변경 (member → admin)
 * - 멤버 삭제
 * - 팀장 위임
 */

import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { updateTeamDocument } from "@/lib/team/updateTeamDocument";
import {
  FALLBACK_MEMBER_DISPLAY_NAME,
  pickDisplayNameFromRecord,
} from "@/lib/team/memberDisplayName";
import { useAuth } from "@/context/AuthProvider";
import { canEditTeam, getUserTeamRole } from "@/lib/team/permissions";
import { Users, Crown, UserMinus, Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface TeamMember {
  uid: string;
  userId: string;
  teamId: string;
  role: "owner" | "admin" | "member";
  accessLevel?: "OWNER" | "ADMIN" | "STAFF" | "MEMBER";
  status: "active" | "inactive" | "pending";
  joinedAt: any;
  /** UI 표시용(문서 필드 아님) */
  displayLabel?: string;
}

interface TeamMemberManagementProps {
  teamId: string;
  onUpdate?: () => void;
}

export function TeamMemberManagement({
  teamId,
  onUpdate,
}: TeamMemberManagementProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  // 권한 체크 및 멤버 목록 로드
  useEffect(() => {
    if (!teamId || !user?.uid) return;

    const loadData = async () => {
      setLoading(true);
      try {
        // 권한 체크
        const hasPermission = await canEditTeam(user.uid, teamId);
        setCanManage(hasPermission);

        if (!hasPermission) {
          setLoading(false);
          return;
        }

        // 멤버 목록 조회
        const membersRef = collection(db, "teams", teamId, "members");
        const membersSnap = await getDocs(membersRef);

        const membersList: TeamMember[] = [];
        for (const memberDoc of membersSnap.docs) {
          const uid = memberDoc.id;
          const memberData = memberDoc.data() as TeamMember;
          const fromMember = pickDisplayNameFromRecord(memberData as unknown as Record<string, unknown>);
          let displayLabel = fromMember;
          try {
            const uSnap = await getDoc(doc(db, "users", uid));
            if (uSnap.exists()) {
              const fromUser = pickDisplayNameFromRecord(uSnap.data() as Record<string, unknown>);
              displayLabel = fromMember || fromUser;
            }
          } catch {
            /* users 읽기 실패 시 멤버 문서만 사용 */
          }
          if (!displayLabel) displayLabel = FALLBACK_MEMBER_DISPLAY_NAME;
          membersList.push({
            uid,
            ...memberData,
            displayLabel,
          });
        }

        // 팀 정보에서 owner 확인
        const teamRef = doc(db, "teams", teamId);
        const teamSnap = await getDoc(teamRef);
        if (teamSnap.exists()) {
          const teamData = teamSnap.data();
          const ownerUid = teamData.ownerUid || teamData.owners?.[0];
          
          // owner를 멤버 목록에 추가 (없는 경우)
          if (ownerUid && !membersList.find((m) => m.uid === ownerUid)) {
            let ownerLabel = pickDisplayNameFromRecord(teamData as unknown as Record<string, unknown>);
            try {
              const uSnap = await getDoc(doc(db, "users", ownerUid));
              if (uSnap.exists()) {
                const fromUser = pickDisplayNameFromRecord(uSnap.data() as Record<string, unknown>);
                ownerLabel = ownerLabel || fromUser;
              }
            } catch {
              /* ignore */
            }
            if (!ownerLabel) ownerLabel = FALLBACK_MEMBER_DISPLAY_NAME;
            membersList.push({
              uid: ownerUid,
              userId: ownerUid,
              teamId,
              role: "owner",
              accessLevel: "OWNER",
              status: "active",
              joinedAt: teamData.createdAt,
              displayLabel: ownerLabel,
            });
          }
        }

        setMembers(membersList);
      } catch (error) {
        console.error("❌ [TeamMemberManagement] 데이터 로드 실패:", error);
        toast.error("멤버 정보를 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [teamId, user?.uid]);

  // 역할 변경
  const handleRoleChange = async (memberUid: string, newRole: "admin" | "member") => {
    if (!canManage || !user?.uid) return;

    setUpdating(memberUid);
    try {
      const memberRef = doc(db, "teams", teamId, "members", memberUid);
      await updateDoc(memberRef, {
        role: newRole,
        accessLevel: newRole === "admin" ? "ADMIN" : "MEMBER",
      });

      toast.success("역할이 변경되었습니다.");
      onUpdate?.();
      
      // 목록 새로고침
      const memberDoc = await getDoc(memberRef);
      if (memberDoc.exists()) {
        setMembers(prev =>
          prev.map(m =>
            m.uid === memberUid
              ? { ...m, role: newRole, accessLevel: newRole === "admin" ? "ADMIN" : "MEMBER" }
              : m
          )
        );
      }
    } catch (error) {
      console.error("❌ [TeamMemberManagement] 역할 변경 실패:", error);
      toast.error("역할 변경에 실패했습니다.");
    } finally {
      setUpdating(null);
    }
  };

  // 멤버 삭제
  const handleRemoveMember = async (memberUid: string) => {
    if (!canManage || !user?.uid) return;

    const confirmed = window.confirm("정말 이 멤버를 팀에서 제거하시겠습니까?");
    if (!confirmed) return;

    setUpdating(memberUid);
    try {
      const memberRef = doc(db, "teams", teamId, "members", memberUid);
      await deleteDoc(memberRef);

      toast.success("멤버가 제거되었습니다.");
      onUpdate?.();
      
      // 목록에서 제거
      setMembers(prev => prev.filter(m => m.uid !== memberUid));
    } catch (error) {
      console.error("❌ [TeamMemberManagement] 멤버 삭제 실패:", error);
      toast.error("멤버 삭제에 실패했습니다.");
    } finally {
      setUpdating(null);
    }
  };

  // 팀장 위임
  const handleTransferOwnership = async (memberUid: string) => {
    if (!canManage || !user?.uid) return;

    const confirmed = window.confirm(
      "정말 이 멤버에게 팀장 권한을 위임하시겠습니까?\n\n팀장 권한은 되돌릴 수 없습니다."
    );
    if (!confirmed) return;

    setUpdating(memberUid);
    try {
      const teamRef = doc(db, "teams", teamId);
      const teamSnap = await getDoc(teamRef);
      
      if (!teamSnap.exists()) {
        throw new Error("팀을 찾을 수 없습니다.");
      }

      const teamData = teamSnap.data();
      const currentOwnerUid = teamData.ownerUid || teamData.owners?.[0];

      await updateTeamDocument(teamId, {
        ownerUid: memberUid,
        owners: [memberUid],
      });

      // 기존 owner를 admin으로 변경
      if (currentOwnerUid && currentOwnerUid !== memberUid) {
        const oldOwnerRef = doc(db, "teams", teamId, "members", currentOwnerUid);
        const oldOwnerSnap = await getDoc(oldOwnerRef);
        
        if (oldOwnerSnap.exists()) {
          await updateDoc(oldOwnerRef, {
            role: "admin",
            accessLevel: "ADMIN",
          });
        }
      }

      // 새 owner를 owner로 설정
      const newOwnerRef = doc(db, "teams", teamId, "members", memberUid);
      const newOwnerSnap = await getDoc(newOwnerRef);
      
      if (newOwnerSnap.exists()) {
        await updateDoc(newOwnerRef, {
          role: "owner",
          accessLevel: "OWNER",
        });
      } else {
        // 멤버 문서가 없으면 생성
        await updateDoc(newOwnerRef, {
          uid: memberUid,
          userId: memberUid,
          teamId,
          role: "owner",
          accessLevel: "OWNER",
          status: "active",
          joinedAt: new Date(),
        });
      }

      toast.success("팀장 권한이 위임되었습니다.");
      onUpdate?.();
      
      // 목록 새로고침
      window.location.reload(); // 권한 변경이므로 전체 새로고침
    } catch (error) {
      console.error("❌ [TeamMemberManagement] 팀장 위임 실패:", error);
      toast.error("팀장 위임에 실패했습니다.");
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="text-center p-8 text-gray-500">
        <Shield className="w-12 h-12 mx-auto mb-2 text-gray-400" />
        <p>멤버 관리 권한이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-900">멤버 관리</h3>
      </div>

      <div className="space-y-2">
        {members.map((member) => (
          <div
            key={member.uid}
            className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">
                  {member.displayLabel ?? member.userId ?? member.uid}
                </span>
                {member.role === "owner" && (
                  <Crown className="w-4 h-4 text-yellow-500" />
                )}
                {member.role === "admin" && (
                  <Shield className="w-4 h-4 text-blue-500" />
                )}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {member.role === "owner" && "팀장"}
                {member.role === "admin" && "관리자"}
                {member.role === "member" && "멤버"}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {updating === member.uid ? (
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              ) : (
                <>
                  {/* 역할 변경 (owner는 제외) */}
                  {member.role !== "owner" && (
                    <select
                      value={member.role}
                      onChange={(e) =>
                        handleRoleChange(member.uid, e.target.value as "admin" | "member")
                      }
                      className="px-2 py-1 text-sm border border-gray-300 rounded"
                    >
                      <option value="member">멤버</option>
                      <option value="admin">관리자</option>
                    </select>
                  )}

                  {/* 팀장 위임 (현재 owner만 가능) */}
                  {member.role !== "owner" && user?.uid !== member.uid && (
                    <button
                      onClick={() => handleTransferOwnership(member.uid)}
                      className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                      title="팀장 위임"
                    >
                      <Crown className="w-4 h-4" />
                    </button>
                  )}

                  {/* 멤버 삭제 (owner는 제외) */}
                  {member.role !== "owner" && (
                    <button
                      onClick={() => handleRemoveMember(member.uid)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="멤버 제거"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
