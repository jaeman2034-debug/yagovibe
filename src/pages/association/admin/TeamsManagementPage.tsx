/**
 * 팀 관리 페이지 (현실 시뮬레이션 버전)
 * /association/:associationId/admin/teams
 * 
 * 역할:
 * - 협회 팀 등록 (name, managerName, phone)
 * - 팀 목록 조회 (모든 로그인 사용자)
 * - 관리자만 팀 추가 가능
 * 
 * Firestore 구조:
 * associations/{associationId}/teams/{teamId}
 * 
 * 필드:
 * - name: string
 * - managerName: string
 * - phone: string
 * - status: "active"
 * - createdAt: Timestamp
 */

import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useIsAssociationAdmin } from "@/hooks/useIsAssociationAdmin";
import { useAuth } from "@/context/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Search, Users } from "lucide-react";

type Team = {
  id: string;
  name: string;
  managerName: string;
  phone: string;
  status: "active";
  createdAt: Timestamp;
};

export default function TeamsManagementPage() {
  const { associationId } = useParams<{ associationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAssociationAdmin(associationId);

  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [managerName, setManagerName] = useState("");
  const [phone, setPhone] = useState("");
  const [adding, setAdding] = useState(false);

  // 팀 목록 실시간 구독 (모든 로그인 사용자 읽기 가능)
  useEffect(() => {
    if (!associationId || !user) {
      setLoading(false);
      return;
    }

    const teamsRef = collection(db, `associations/${associationId}/teams`);
    const q = query(teamsRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const teamsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Team[];
        setTeams(teamsData);
        setLoading(false);
      },
      (error) => {
        console.error("❌ [TeamsManagement] 팀 목록 조회 오류:", error);
        toast.error("팀 목록을 불러오는 중 오류가 발생했습니다.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [associationId, user]);

  // 검색 필터
  const filteredTeams = useMemo(() => {
    const text = searchText.trim().toLowerCase();
    if (!text) return teams;
    return teams.filter(
      (team) =>
        team.name.toLowerCase().includes(text) ||
        team.managerName.toLowerCase().includes(text) ||
        team.phone.includes(text)
    );
  }, [teams, searchText]);

  // 팀 생성
  const handleAddTeam = async () => {
    if (!associationId || !teamName.trim() || !managerName.trim() || !phone.trim()) {
      toast.error("모든 필드를 입력해주세요.");
      return;
    }

    setAdding(true);
    try {
      await addDoc(collection(db, `associations/${associationId}/teams`), {
        name: teamName.trim(),
        managerName: managerName.trim(),
        phone: phone.trim(),
        status: "active" as const,
        createdAt: serverTimestamp(),
      });

      toast.success("팀이 등록되었습니다.");
      setTeamName("");
      setManagerName("");
      setPhone("");
      setShowAddForm(false);
    } catch (error: any) {
      console.error("❌ [TeamsManagement] 팀 생성 오류:", error);
      toast.error(`팀 생성 실패: ${error.message || "알 수 없는 오류"}`);
    } finally {
      setAdding(false);
    }
  };

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="space-y-6">
          {/* 헤더 */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">👥 팀 관리</h1>
              <p className="text-sm text-gray-500 mt-1">
                협회에 등록된 팀 목록입니다. 관리자만 팀을 추가할 수 있습니다.
              </p>
            </div>
            {isAdmin && (
              <Button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {showAddForm ? "취소" : "팀 추가"}
              </Button>
            )}
          </div>

          {/* 팀 추가 폼 (관리자 전용) */}
          {isAdmin && showAddForm && (
            <Card>
              <CardHeader>
                <CardTitle>새 팀 등록</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    팀 이름 *
                  </label>
                  <Input
                    type="text"
                    placeholder="예: 노원FC"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    감독/담당자 이름 *
                  </label>
                  <Input
                    type="text"
                    placeholder="예: 김감독"
                    value={managerName}
                    onChange={(e) => setManagerName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    연락처 *
                  </label>
                  <Input
                    type="tel"
                    placeholder="예: 010-1234-5678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleAddTeam}
                  disabled={adding || !teamName.trim() || !managerName.trim() || !phone.trim()}
                  className="w-full"
                >
                  {adding ? "등록 중..." : "팀 등록"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* 검색 */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="팀 이름, 감독, 연락처로 검색"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="text-sm text-gray-500">
              {loading ? "불러오는 중..." : `${filteredTeams.length}팀`}
            </div>
          </div>

          {/* 팀 목록 */}
          {loading ? (
            <div className="text-gray-400 text-center py-8">팀 목록을 불러오는 중...</div>
          ) : filteredTeams.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-400">
                {searchText ? "검색 결과가 없습니다." : "등록된 팀이 없습니다."}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTeams.map((team) => (
                <Card key={team.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">{team.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">감독:</span> {team.managerName}
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">연락처:</span> {team.phone}
                    </div>
                    {team.createdAt && (
                      <div className="text-xs text-gray-400 pt-2 border-t">
                        등록일: {team.createdAt.toDate().toLocaleDateString("ko-KR")}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

