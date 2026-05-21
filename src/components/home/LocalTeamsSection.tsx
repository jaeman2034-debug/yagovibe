/**
 * 🔥 우리 지역 팀 섹션 (홈 화면)
 * 
 * 역할:
 * - 유저 region 기반 teams 표시
 * - 활동 많은 순 정렬
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthProvider";
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useNavigate } from "react-router-dom";
import { Users, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LocalTeam {
  id: string;
  name: string;
  region: string;
  level?: string;
}

export default function LocalTeamsSection() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [teams, setTeams] = useState<LocalTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRegion, setUserRegion] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserRegion = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserRegion(userData.region || null);
        }
      } catch (err) {
        console.error("❌ [LocalTeamsSection] 사용자 정보 조회 실패:", err);
      }
    };

    fetchUserRegion();
  }, [user?.uid]);

  useEffect(() => {
    if (!userRegion) {
      setLoading(false);
      return;
    }

    const fetchLocalTeams = async () => {
      try {
        setLoading(true);
        const q = query(
          collection(db, "teams"),
          where("region", "==", userRegion),
          orderBy("createdAt", "desc"),
          limit(5)
        );

        const snapshot = await getDocs(q);
        const teamsList: LocalTeam[] = [];

        snapshot.forEach((doc) => {
          const data = doc.data();
          teamsList.push({
            id: doc.id,
            name: data.name || "",
            region: data.region || "",
            level: data.level,
          });
        });

        setTeams(teamsList);
      } catch (err) {
        console.error("❌ [LocalTeamsSection] 팀 목록 조회 실패:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLocalTeams();
  }, [userRegion]);

  if (loading) {
    return (
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">🔥 우리 지역 팀</h2>
        </div>
        <div className="text-center py-8 text-gray-500">로딩 중...</div>
      </section>
    );
  }

  if (!userRegion) {
    return null; // 지역 정보가 없으면 표시하지 않음
  }

  if (teams.length === 0) {
    return (
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            🔥 {userRegion} 팀
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/sports/soccer/team/create")}
          >
            팀 만들기
          </Button>
        </div>
        <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
          {userRegion} 지역의 팀이 없습니다.
        </div>
      </section>
    );
  }

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">
          🔥 {userRegion} 팀
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/team")}
        >
          전체 보기
        </Button>
      </div>
      <div className="space-y-3">
        {teams.map((team) => (
          <div
            key={team.id}
            onClick={() => navigate(`/team/${team.id}`)}
            className="bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition cursor-pointer"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-green-500" />
                  <span className="font-semibold text-gray-900">
                    {team.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700">
                    {team.region}
                  </span>
                  {team.level && (
                    <span className="text-xs text-gray-500">
                      · {team.level}
                    </span>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/team/${team.id}`);
                }}
              >
                가입하기
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
