/**
 * 🔥 협회 팀 관리 페이지 (루트 teams 컬렉션 기반)
 * 
 * 경로: /association/:associationId/manage/teams
 * 
 * 역할:
 * - 협회 관리자만 접근 가능
 * - 협회 소속 팀 목록 조회 (teams where associationId)
 * - 팀 검색 → 협회 소속 추가
 * - 소속 해제
 */

import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthProvider";
import {
  attachTeamToAssociation,
  detachTeamFromAssociation,
  getAssociationTeams,
} from "@/lib/association/attachTeamToAssociation";
import { useIsAssociationAdmin } from "@/hooks/useIsAssociationAdmin";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function AssociationTeamsPage() {
  const { associationId } = useParams<{ associationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAssociationAdmin(associationId);

  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<any[]>([]);
  const [searchTeamId, setSearchTeamId] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<any>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  // 협회 소속 팀 목록 조회
  useEffect(() => {
    if (!associationId || !user) {
      setLoading(false);
      return;
    }

    const loadTeams = async () => {
      try {
        const teamsList = await getAssociationTeams(associationId);
        setTeams(teamsList);
      } catch (e) {
        console.error("팀 목록 조회 실패:", e);
      } finally {
        setLoading(false);
      }
    };

    loadTeams();
  }, [associationId, user]);

  // 권한 체크
  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate(`/association/${associationId}`);
    }
  }, [adminLoading, isAdmin, associationId, navigate]);

  const handleSearchTeam = async () => {
    if (!searchTeamId.trim()) return;

    setSearching(true);
    try {
      const teamRef = doc(db, "teams", searchTeamId.trim());
      const teamSnap = await getDoc(teamRef);
      
      if (!teamSnap.exists()) {
        alert("팀을 찾을 수 없습니다.");
        setSearchResult(null);
        return;
      }

      const teamData = teamSnap.data();
      setSearchResult({
        id: teamSnap.id,
        ...teamData,
      });
    } catch (e) {
      console.error("팀 검색 실패:", e);
      alert("팀 검색에 실패했습니다.");
    } finally {
      setSearching(false);
    }
  };

  const handleAttach = async (teamId: string) => {
    if (!associationId || !user?.uid || processing) return;

    if (!confirm("이 팀을 협회에 소속시키시겠습니까?")) return;

    setProcessing(teamId);
    try {
      await attachTeamToAssociation({
        associationId,
        teamId,
        actorUid: user.uid,
      });
      
      alert("팀이 협회에 소속되었습니다.");
      
      // 목록 새로고침
      const teamsList = await getAssociationTeams(associationId);
      setTeams(teamsList);
      
      // 검색 결과 초기화
      setSearchResult(null);
      setSearchTeamId("");
    } catch (e: any) {
      console.error("소속 추가 실패:", e);
      alert(e.message || "소속 추가에 실패했습니다.");
    } finally {
      setProcessing(null);
    }
  };

  const handleDetach = async (teamId: string) => {
    if (!associationId || !user?.uid || processing) return;

    if (!confirm("이 팀을 협회에서 해제하시겠습니까?")) return;

    setProcessing(teamId);
    try {
      await detachTeamFromAssociation({
        associationId,
        teamId,
        actorUid: user.uid,
      });
      
      alert("팀이 협회에서 해제되었습니다.");
      
      // 목록 새로고침
      const teamsList = await getAssociationTeams(associationId);
      setTeams(teamsList);
    } catch (e: any) {
      console.error("소속 해제 실패:", e);
      alert(e.message || "소속 해제에 실패했습니다.");
    } finally {
      setProcessing(null);
    }
  };

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // 리다이렉트 중
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">협회 팀 관리</h1>

        {/* 팀 검색 및 소속 추가 */}
        <div className="bg-white rounded-lg border p-4 mb-6">
          <h2 className="text-lg font-semibold mb-3">팀 검색 및 소속 추가</h2>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="팀 ID 입력"
              value={searchTeamId}
              onChange={(e) => setSearchTeamId(e.target.value)}
              className="flex-1 border rounded px-3 py-2 text-sm"
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleSearchTeam();
                }
              }}
            />
            <button
              onClick={handleSearchTeam}
              disabled={searching}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {searching ? "검색 중..." : "검색"}
            </button>
          </div>

          {searchResult && (
            <div className="mt-4 p-3 bg-gray-50 rounded border">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{searchResult.name || "이름 없음"}</div>
                  <div className="text-sm text-gray-500">팀 ID: {searchResult.id}</div>
                  <div className="text-sm text-gray-500">
                    소속: {searchResult.associationId || "없음"}
                  </div>
                </div>
                {searchResult.associationId === associationId ? (
                  <span className="text-sm text-gray-500">이미 소속됨</span>
                ) : searchResult.associationId ? (
                  <span className="text-sm text-red-500">다른 협회 소속</span>
                ) : (
                  <button
                    onClick={() => handleAttach(searchResult.id)}
                    disabled={processing === searchResult.id || !!processing}
                    className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    {processing === searchResult.id ? "처리 중..." : "소속 추가"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 협회 소속 팀 목록 */}
        <div className="bg-white rounded-lg border p-4">
          <h2 className="text-lg font-semibold mb-3">협회 소속 팀 목록</h2>

          {teams.length === 0 ? (
            <p className="text-sm text-gray-500">소속된 팀이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {teams.map(team => (
                <div
                  key={team.id}
                  className="flex items-center justify-between p-3 border rounded bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="font-medium">{team.name || "이름 없음"}</div>
                    <div className="text-sm text-gray-500">팀 ID: {team.id}</div>
                    {team.ownerUid && (
                      <div className="text-xs text-gray-400">리더: {team.ownerUid}</div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDetach(team.id)}
                    disabled={processing === team.id || !!processing}
                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    {processing === team.id ? "처리 중..." : "소속 해제"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
