/**
 * 협회 팀원 관리 페이지
 * 
 * 기능:
 * - 팀원 목록 조회
 * - 팀원 추가 (이메일 기반)
 * - 역할 변경 (admin/member)
 * - 팀원 제거
 * 
 * 권한: 협회 관리자만 접근
 */

import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { collection, query, orderBy, onSnapshot, doc, setDoc, updateDoc, deleteDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useIsAssociationAdmin } from "@/hooks/useIsAssociationAdmin";
import { useAuth } from "@/context/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Search, UserPlus, Shield, User, Trash2 } from "lucide-react";
import type { Timestamp } from "firebase/firestore";

interface AssociationMember {
  id: string; // uid
  role: "admin" | "member";
  status: "active" | "inactive";
  joinedAt: Timestamp;
}

export default function MembersManagementPage() {
  const { associationId } = useParams<{ associationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAssociationAdmin(associationId);

  const [members, setMembers] = useState<AssociationMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMemberUid, setNewMemberUid] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<"admin" | "member">("member");
  const [adding, setAdding] = useState(false);

  // 팀원 목록 실시간 구독 (모든 로그인 사용자 읽기 가능)
  useEffect(() => {
    if (!associationId || !user) {
      setLoading(false);
      return;
    }

    const membersRef = collection(db, `associations/${associationId}/members`);
    const q = query(membersRef, orderBy("joinedAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const membersData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as AssociationMember[];
        setMembers(membersData);
        setLoading(false);
      },
      (error) => {
        console.error("❌ [MembersManagement] 팀원 목록 조회 오류:", error);
        toast.error("팀원 목록을 불러오는 중 오류가 발생했습니다.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [associationId, user]);

  // 검색 필터
  const filteredMembers = useMemo(() => {
    const text = searchText.trim().toLowerCase();
    if (!text) return members;
    return members.filter(
      (member) =>
        member.id.toLowerCase().includes(text) ||
        member.role.toLowerCase().includes(text)
    );
  }, [members, searchText]);

  // 팀원 추가 (UID 직접 입력 방식)
  const handleAddMember = async () => {
    if (!associationId || !newMemberUid.trim()) {
      toast.error("UID를 입력해주세요.");
      return;
    }

    const uid = newMemberUid.trim();

    // UID 형식 간단 검증 (최소 20자)
    if (uid.length < 20) {
      toast.error("유효한 UID를 입력해주세요.");
      return;
    }

    setAdding(true);

    try {
      // 1. 이미 멤버인지 확인
      const memberRef = doc(db, `associations/${associationId}/members/${uid}`);
      const { getDoc } = await import("firebase/firestore");
      const memberDoc = await getDoc(memberRef);

      if (memberDoc.exists()) {
        toast.error("이미 팀원으로 등록된 사용자입니다.");
        setAdding(false);
        return;
      }

      // 2. 멤버 문서 생성
      await setDoc(memberRef, {
        role: newMemberRole,
        status: "active",
        joinedAt: serverTimestamp(),
      });

      toast.success("팀원이 추가되었습니다.");
      setNewMemberUid("");
      setNewMemberRole("member");
      setShowAddForm(false);
    } catch (error: any) {
      console.error("❌ [MembersManagement] 팀원 추가 오류:", error);
      
      // permission-denied 에러 처리
      if (error.code === "permission-denied") {
        toast.error("권한이 없습니다. 관리자만 팀원을 추가할 수 있습니다.");
      } else {
        toast.error("팀원 추가 중 오류가 발생했습니다: " + (error.message || "알 수 없는 오류"));
      }
    } finally {
      setAdding(false);
    }
  };

  // 역할 변경
  const handleChangeRole = async (memberId: string, newRole: "admin" | "member") => {
    if (!associationId) return;

    // 🔥 최소 1명의 관리자 유지 체크
    if (newRole === "member") {
      const currentAdmins = members.filter((m) => m.role === "admin");
      if (currentAdmins.length === 1 && currentAdmins[0].id === memberId) {
        toast.error("최소 1명의 관리자가 필요합니다. 다른 사용자를 관리자로 지정한 후 역할을 변경해주세요.");
        return;
      }
    }

    try {
      const memberRef = doc(db, `associations/${associationId}/members/${memberId}`);
      await updateDoc(memberRef, {
        role: newRole,
      });
      toast.success("역할이 변경되었습니다.");
    } catch (error: any) {
      console.error("❌ [MembersManagement] 역할 변경 오류:", error);
      toast.error("역할 변경 중 오류가 발생했습니다.");
    }
  };

  // 팀원 제거
  const handleRemoveMember = async (memberId: string) => {
    if (!associationId) return;

    // 🔥 최소 1명의 관리자 유지 체크
    const memberToRemove = members.find((m) => m.id === memberId);
    if (memberToRemove?.role === "admin") {
      const adminCount = members.filter((m) => m.role === "admin").length;
      if (adminCount === 1) {
        toast.error("최소 1명의 관리자가 필요합니다. 다른 사용자를 관리자로 지정한 후 제거해주세요.");
        return;
      }
    }

    if (!confirm("정말 이 팀원을 제거하시겠습니까?")) return;

    try {
      const memberRef = doc(db, `associations/${associationId}/members/${memberId}`);
      await deleteDoc(memberRef);
      toast.success("팀원이 제거되었습니다.");
    } catch (error: any) {
      console.error("❌ [MembersManagement] 팀원 제거 오류:", error);
      toast.error("팀원 제거 중 오류가 발생했습니다.");
    }
  };

  if (loading || adminLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">로그인이 필요합니다.</p>
        </div>
      </div>
    );
  }

  const adminCount = members.filter((m) => m.role === "admin").length;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">팀원 관리</h1>
          <p className="text-gray-600">협회 팀원을 추가하고 역할을 관리할 수 있습니다.</p>
        </div>

        {/* 팀원 추가 폼 (admin만 표시) */}
        {isAdmin && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  팀원 추가
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddForm(!showAddForm)}
                >
                  {showAddForm ? "취소" : "추가"}
                </Button>
              </div>
            </CardHeader>
            {showAddForm && (
              <CardContent>
                <div className="flex gap-4">
                  <Input
                    type="text"
                    placeholder="Firebase Auth UID (예: qGq5XmuXRBsRZ0qJFE0yqtZY5Hin)"
                    value={newMemberUid}
                    onChange={(e) => setNewMemberUid(e.target.value)}
                    className="flex-1"
                  />
                  <Select
                    value={newMemberRole}
                    onValueChange={(value) => setNewMemberRole(value as "admin" | "member")}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">일반 멤버</SelectItem>
                      <SelectItem value="admin">관리자</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAddMember} disabled={adding}>
                    {adding ? "추가 중..." : "추가"}
                  </Button>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  ⚠️ Firebase Auth의 User UID를 직접 입력하세요. (Emulator/운영 공통)
                </p>
              </CardContent>
            )}
          </Card>
        )}

        {/* 검색 */}
        <div className="mb-4">
            <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="UID 또는 role로 검색..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* 팀원 목록 */}
        <Card>
          <CardHeader>
            <CardTitle>
              팀원 목록 ({filteredMembers.length}명)
              {adminCount > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  (관리자 {adminCount}명)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredMembers.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                {searchText ? "검색 결과가 없습니다." : "등록된 팀원이 없습니다."}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        {member.role === "admin" ? (
                          <Shield className="w-5 h-5 text-blue-600" />
                        ) : (
                          <User className="w-5 h-5 text-gray-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-mono text-sm font-medium text-gray-900">
                            {member.id}
                          </p>
                          <Badge
                            variant={member.role === "admin" ? "default" : "secondary"}
                          >
                            {member.role === "admin" ? "관리자" : "멤버"}
                          </Badge>
                          {member.status === "inactive" && (
                            <Badge variant="outline">비활성</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          가입일: {member.joinedAt?.toDate?.()?.toLocaleDateString() || "없음"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={member.role}
                        onValueChange={(value) =>
                          handleChangeRole(member.id, value as "admin" | "member")
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">일반 멤버</SelectItem>
                          <SelectItem value="admin">관리자</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(member.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 안내 */}
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            ⚠️ <strong>주의:</strong> 관리자는 최소 1명 이상 유지해야 합니다. 마지막 관리자를 제거할 수 없습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
