// src/pages/team/TeamOnboarding.tsx
// 🔥 팀 생성 온보딩

import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { normalizeSportId } from "@/constants/sports";
import { createTeamActivity } from "@/services/activity/activityFactory";
import { resolveTeamMemberProfileFields } from "@/lib/team/resolveTeamMemberProfileFields";

export default function TeamOnboarding() {
  const navigate = useNavigate();
  const { type } = useParams<{ type: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [teamName, setTeamName] = useState("");
  const [region, setRegion] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔥 sportType은 URL에서 받아 hidden
  const sportType = type || searchParams.get("type") || "football";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !teamName.trim() || !region.trim()) return;

    setLoading(true);
    console.log("🔥 [TeamOnboarding] 팀 생성 시작");
    
    try {
      // 🔥 teams doc 생성 (plan: "free" 기본값)
      console.log("🔥 [TeamOnboarding] Firestore teams 생성 중...");
      const teamRef = await addDoc(collection(db, "teams"), {
        name: teamName,
        sportType,
        ownerUid: user.uid,
        ...(user.isAnonymous ? { ownerIsAnonymous: true } : {}),
        plan: "free", // 🔥 Step 4: 데이터 구조 (plan 필드)
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      const teamId = teamRef.id; // 🔥 핵심: teamId 변수에 저장
      console.log("✅ [TeamOnboarding] Firestore teams 응답:", teamId);

      // 🔥 teams/{teamId}/members/{uid} 생성 (권한 소스)
      console.log("🔥 [TeamOnboarding] teams/{teamId}/members/{uid} 생성 중...");
      const { doc: docFn, setDoc } = await import("firebase/firestore");
      const memberProfile = await resolveTeamMemberProfileFields(db, user.uid, user);
      await setDoc(
        docFn(db, "teams", teamId, "members", user.uid),
        {
          userId: user.uid, // 🔥 userId만 사용 (uid 제거)
          role: "owner", // 🔥 소문자로 통일 (admin → owner)
          status: "active",
          joinedAt: serverTimestamp(),
          ...(user.isAnonymous ? { isGuestAccount: true } : {}),
          ...(memberProfile ?? {}),
        }
      );
      console.log("✅ [TeamOnboarding] teams/{teamId}/members/{uid} 생성 완료");

      // 🔥 team_members 역인덱스 생성 (조회 최적화)
      console.log("🔥 [TeamOnboarding] team_members 역인덱스 생성 중...");
      await setDoc(
        docFn(db, "team_members", `${user.uid}_${teamId}`), // 🔥 문서 ID 형식: ${uid}_${teamId}
        {
          teamId: teamId, // 🔥 핵심: teamRef.id와 반드시 일치
          userId: user.uid, // 🔥 userId만 사용 (uid 제거)
          role: "owner", // 🔥 소문자로 통일
          status: "active",
          createdAt: serverTimestamp(),
          joinedAt: serverTimestamp(),
          ...(memberProfile
            ? {
                displayName: memberProfile.displayName,
                name: memberProfile.name,
                userName: memberProfile.userName,
              }
            : {}),
        }
      );
      console.log("✅ [TeamOnboarding] team_members 역인덱스 생성 완료");

      try {
        const sportId = normalizeSportId(sportType) ?? "soccer";
        await createTeamActivity({
          teamId,
          authorId: user.uid,
          teamName: teamName.trim(),
          sport: sportId,
        });
        console.log("✅ [TeamOnboarding] activities 기록 완료");
      } catch (err) {
        console.warn("⚠️ [TeamOnboarding] activities 기록 실패 (무시):", err);
      }

      // 🔥 팀 생성 성공 → 팀 상세 페이지로 이동
      console.log("🔥 [TeamOnboarding] navigate 직전");
      const qs = new URLSearchParams();
      qs.set("onboarding", "1");
      if (user.isAnonymous) qs.set("linkAccount", "1");
      navigate(`/team/${teamId}?${qs.toString()}`);
      console.log("✅ [TeamOnboarding] navigate 실행 완료");
    } catch (error) {
      console.error("❌ [TeamOnboarding] 팀 생성 실패:", error);
      alert("팀 생성에 실패했습니다.");
      setLoading(false); // 에러 시 즉시 로딩 해제
    } finally {
      console.log("✅ [TeamOnboarding] finally - loading false");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">팀 만들기</h1>
          <p className="text-gray-600">새로운 팀을 생성하고 관리하세요.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              팀명
            </label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="팀명을 입력하세요"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              활동 지역
            </label>
            <input
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="예: 서울시 강남구"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "생성 중..." : "팀 생성하기"}
          </button>
        </form>
      </div>
    </div>
  );
}

