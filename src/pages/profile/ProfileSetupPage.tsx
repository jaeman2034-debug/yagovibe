/**
 * 🔥 프로필 설정 페이지 (STEP: 팀원 가입 플로우)
 * 
 * /profile/setup?intent=join-team
 * 
 * 핵심 원칙:
 * - 프로필 최소 완성 (종목, 활동 지역, 간단 소개)
 * - 완료 시 P0 → P1 전이
 * - intent=join-team이면 /teams/find로 자동 이동
 */

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import { updateTrustScore } from "@/utils/trustScore";
import { sanitizePostLoginRedirectTarget } from "@/lib/auth/sanitizePostLoginRedirect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SPORTS = [
  "축구",
  "농구",
  "야구",
  "배구",
  "골프",
  "테니스",
  "러닝",
  "수영",
  "헬스/피트니스",
  "배드민턴",
  "탁구",
  "요가/필라테스",
  "클라이밍",
];

const REGIONS = [
  "서울",
  "경기",
  "인천",
  "부산",
  "대구",
  "광주",
  "대전",
  "울산",
  "세종",
  "강원",
  "충북",
  "충남",
  "전북",
  "전남",
  "경북",
  "경남",
  "제주",
];

export default function ProfileSetupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const intent = searchParams.get("intent"); // join-team

  const [sport, setSport] = useState("");
  const [region, setRegion] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 기존 프로필 로드
  useEffect(() => {
    if (!user?.uid) {
      navigate("/login");
      return;
    }

    const loadProfile = async () => {
      try {
        // 🔥 Firestore v9 문법: getDoc 사용
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          setSport(data.sport || "");
          setRegion(data.region || "");
          setBio(data.bio || "");
        }
      } catch (error) {
        console.error("[ProfileSetupPage] 프로필 로드 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user?.uid, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 🔥 방어 코드: user.uid 존재 여부 확인
    if (!user?.uid) {
      alert("로그인이 필요합니다.");
      navigate("/login");
      return;
    }

    if (!sport || !region) {
      alert("종목과 활동 지역은 필수입니다.");
      return;
    }

    setSaving(true);

    try {
      // 🔥 천재 정답 코드: setDoc + merge (문서 없어도 생성, 있어도 업데이트)
      console.log('🔍 [ProfileSetupPage] SAVE PROFILE UID:', user.uid);
      console.log('🔍 [ProfileSetupPage] SAVE PROFILE EMAIL:', user.email);
      const userRef = doc(db, "users", user.uid);
      console.log('🔍 [ProfileSetupPage] USER DOC PATH:', userRef.path);
      console.log('🔍 [ProfileSetupPage] USER DOC ID:', userRef.id);
      console.log('🔍 [ProfileSetupPage] Firebase Project ID:', (userRef as any).firestore?.app?.options?.projectId || '확인 불가');
      
      await setDoc(
        userRef,
        {
          uid: user.uid,
          email: user.email || null,
          sport,
          region,
          bio: bio.trim() || null,
          profileCompleted: true, // 호환성 유지
          isProfileComplete: true, // 🔥 프로필 완성도 플래그 (온보딩 완료)
          onboardingCompleted: true, // 🔥 온보딩 완료 플래그 (라우팅 분기용)
          updatedAt: serverTimestamp(),
        },
        { merge: true } // 🔥 핵심: merge로 문서 없어도 생성, 있어도 업데이트
      );

      console.log("[ProfileSetupPage] 프로필 저장 성공:", { uid: user.uid, sport, region });

      // 🔥 신뢰도 스코어 업데이트 (프로필 완성 반영)
      await updateTrustScore(user.uid);

      // 🔥 온보딩 완료 후 딥링크 복귀 또는 기본 경로
      const afterOnboarding = sessionStorage.getItem("afterOnboarding");
      sessionStorage.removeItem("afterOnboarding");

      // intent=join-team이면 팀 탐색 페이지로 이동
      if (intent === "join-team") {
        navigate("/teams/find");
      } else if (afterOnboarding) {
        const safe = sanitizePostLoginRedirectTarget(afterOnboarding);
        navigate(safe ?? "/hub", { replace: true });
      } else {
        // 기본 경로
        navigate("/hub", { replace: true });
      }
    } catch (error: any) {
      console.error("[ProfileSetupPage] 프로필 저장 실패:", error);
      console.error("[ProfileSetupPage] 에러 상세:", {
        code: error?.code,
        message: error?.message,
        uid: user?.uid,
      });
      alert(`프로필 저장에 실패했습니다: ${error?.message || "알 수 없는 오류"}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>프로필 설정</CardTitle>
            {intent === "join-team" && (
              <p className="text-sm text-gray-600 mt-2">
                팀에 참여하려면 기본 프로필이 필요해요
              </p>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 종목 선택 */}
              <div>
                <Label htmlFor="sport">종목 *</Label>
                <select
                  id="sport"
                  value={sport}
                  onChange={(e) => setSport(e.target.value)}
                  className="w-full mt-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">선택하세요</option>
                  {SPORTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* 활동 지역 */}
              <div>
                <Label htmlFor="region">활동 지역 *</Label>
                <select
                  id="region"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full mt-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">선택하세요</option>
                  {REGIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* 간단 소개 */}
              <div>
                <Label htmlFor="bio">간단 소개 (선택)</Label>
                <textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="w-full mt-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="자신을 간단히 소개해주세요"
                />
              </div>

              {/* 제출 버튼 */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/me")}
                  className="flex-1"
                >
                  나중에
                </Button>
                <Button
                  type="submit"
                  disabled={saving || !sport || !region}
                  className="flex-1"
                >
                  {saving ? "저장 중..." : "완료"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
