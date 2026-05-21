// src/pages/team/TeamInvite.tsx
// 🔥 Step 11: 초대 링크 진짜 연결 (최소)

import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthProvider";
import { useTeam } from "@/context/TeamContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function TeamInvite() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshTeam } = useTeam();
  const [team, setTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState(false);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    // 🔥 로그인 안 되어 있으면 → 로그인
    if (!user) {
      navigate("/login");
      return;
    }

    // 🔥 더미 팀 정보 (실제 DB 처리 ❌)
    const fetchTeam = async () => {
      try {
        // TODO: 실제 초대 코드로 팀 조회
        // const teamRef = doc(db, "teams", code);
        // const teamSnap = await getDoc(teamRef);
        
        // 🔥 더미 데이터
        setTimeout(() => {
          setTeam({
            id: code,
            name: "YAGO",
            region: "서울",
            sportType: "football",
          });
          setLoading(false);
        }, 500);
      } catch (error) {
        console.error("팀 정보 조회 실패:", error);
        setLoading(false);
      }
    };

    fetchTeam();
  }, [code, user, navigate]);

  const handleJoin = async () => {
    // 🔥 실제 DB 처리 ❌ / "참여 완료" UX만 ⭕
    setJoined(true);
    
    // 🔥 Step 15: 성공 토스트
    setShowToast(true);
    
    // 🔥 TeamContext 새로고침
    if (team?.sportType) {
      await refreshTeam(team.sportType);
    }
    
    setTimeout(() => {
      setShowToast(false);
      navigate(`/sports/${team.sportType}/team`);
    }, 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  if (joined) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">참여 완료</h2>
          <p className="text-gray-600">팀 대시보드로 이동합니다...</p>
        </div>
        
        {/* 🔥 Step 15: 성공 토스트 */}
        {showToast && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
            완료되었습니다
          </div>
        )}
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">팀 정보를 찾을 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8 text-center">
        <div className="text-6xl mb-6">⚽</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">FC {team.name}</h1>
        <p className="text-gray-600 mb-8">팀에 참여하시겠습니까?</p>
        <button
          onClick={handleJoin}
          className="w-full py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-lg"
        >
          참여하기
        </button>
      </div>
    </div>
  );
}

