/**
 * 🔥 협회 가입 신청 페이지 (팀장 전용)
 * 
 * 경로: /associations/:associationId/apply?teamId=...
 * 
 * 핵심 정체성: "확인 페이지"
 * - 긴 입력 폼 ❌
 * - 서류 느낌 ❌
 * - 이미 가진 정보 확인 + 동의 ✅
 * 
 * 역할:
 * - 팀 정보 확인 (팀명, 지역, 대표자)
 * - 협회 가입 신청 제출
 * - 제출 후 /me로 이동 (상태는 /me에서 판단)
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import { useMyTeams } from "@/hooks/useMyTeams";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { Building2, CheckCircle2, User, MapPin, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AssociationApplyPage() {
  const { associationId } = useParams<{ associationId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { teamMembers } = useMyTeams();

  const teamIdFromQuery = searchParams.get("teamId");
  const [team, setTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false); // 🔥 가입 신청 성공 상태
  const hasRedirectedRef = useRef(false); // 🔥 리다이렉트 중복 방지
  
  // 🔥 teamId 찾기 (여러 소스에서) - useMemo로 메모이제이션
  const teamId = useMemo(() => {
    // 1. URL query param (null 문자열 체크)
    if (teamIdFromQuery && teamIdFromQuery !== "null" && teamIdFromQuery !== "undefined") {
      return teamIdFromQuery;
    }
    
    // 2. localStorage (팀 생성 후 저장된 경우)
    const lastCreatedTeamId = localStorage.getItem('lastCreatedTeamId');
    if (lastCreatedTeamId && lastCreatedTeamId !== "null" && lastCreatedTeamId !== "undefined") {
      return lastCreatedTeamId;
    }
    
    // 3. useMyTeams에서 첫 번째 팀
    if (teamMembers.length > 0 && teamMembers[0]?.teamId) {
      return teamMembers[0].teamId;
    }
    
    return null;
  }, [teamIdFromQuery, teamMembers]);
  
  // 🔥 teamId가 null이면 즉시 /me로 리다이렉트 (무한 루프 방지)
  useEffect(() => {
    if (!teamId && !hasRedirectedRef.current && user) {
      hasRedirectedRef.current = true;
      console.log("[AssociationApplyPage] teamId 없음, /me로 리다이렉트");
      navigate("/me", { replace: true });
    }
  }, [teamId, user, navigate]);

  // 팀 정보 조회 (팀장 확인용) - teamId가 있을 때만 실행
  useEffect(() => {
    if (!user || !teamId || teamId === "null" || teamId === "undefined") {
      if (!user) {
        setLoading(false);
      }
      return;
    }

    // 🔥 teamId가 있으면 팀 정보 조회 (한 번만)
    let isMounted = true;
    
    const loadTeam = async () => {
      try {
        setSyncing(false);
        setLoading(true);
        
        const teamRef = doc(db, "teams", teamId);
        const teamSnap = await getDoc(teamRef);

        if (!isMounted) return;

        if (!teamSnap.exists()) {
          // 팀이 없으면 /me로 리다이렉트
          console.log("[AssociationApplyPage] 팀 정보 없음, /me로 리다이렉트");
          navigate("/me", { replace: true });
          return;
        }

        const teamData = teamSnap.data();
        
        // 🔥 팀장 확인 (ownerUid 체크)
        const isCaptain = teamData.ownerUid === user.uid;
        if (!isCaptain) {
          // 팀장이 아니면 /me로 이동
          console.log("[AssociationApplyPage] 팀장 아님, /me로 리다이렉트");
          navigate("/me", { replace: true });
          return;
        }

        setTeam({ id: teamSnap.id, ...teamData });
        setSyncing(false);
      } catch (error) {
        console.error("팀 정보 조회 실패:", error);
        if (isMounted) {
          setSyncing(true);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadTeam();
    
    return () => {
      isMounted = false;
    };
  }, [teamId, user, navigate]); // 🔥 teamId와 user만 의존성으로 (무한 루프 방지)

  // 협회 가입 신청
  const handleApply = async () => {
    // 🔥 teamId 확정 (여러 소스에서)
    const foundTeamId = teamId || localStorage.getItem('lastCreatedTeamId');
    
    if (!user?.uid || !foundTeamId || !associationId) {
      navigate("/me", { replace: true });
      return;
    }

    setSubmitting(true);

    try {
      const requestMembership = httpsCallable<
        { teamId: string; associationId: string; memo?: string },
        { success: boolean; requestId: string; message: string }
      >(functions, "requestAssociationMembership");

      const result = await requestMembership({
        teamId: foundTeamId,
        associationId,
      });

      if (!result.data.success) {
        throw new Error(result.data.message || "회원 신청에 실패했습니다.");
      }

      // 🔥 성공 상태 설정
      setApplySuccess(true);
      setSubmitting(false);

      // 🔥 1.5초 후 자동으로 팀 관리 페이지로 이동
      setTimeout(() => {
        navigate(`/teams/${foundTeamId}/manage`, { replace: true });
      }, 1500);
    } catch (error: any) {
      console.error("❌ [AssociationApplyPage] 회원 신청 실패:", error);
      toast.error(error.message || "회원 신청에 실패했습니다.");
      setSubmitting(false);
    }
  };
  
  // 🔥 수동 이동 핸들러 (성공 화면 버튼용)
  const handleGoToManage = () => {
    const foundTeamId = teamId || localStorage.getItem('lastCreatedTeamId');
    
    if (foundTeamId && foundTeamId !== "null" && foundTeamId !== "undefined") {
      navigate(`/teams/${foundTeamId}/manage`, { replace: true });
    } else {
      navigate("/me", { replace: true });
    }
  };

  // 🔥 협회 가입 신청 성공 화면 (1.5초 자동 이동)
  if (applySuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-none text-center md:mx-auto md:max-w-3xl">
          <div className="mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              🎉 협회 가입 신청이 완료되었어요!
            </h2>
            <p className="text-sm text-gray-600 mb-1">
              승인되면 알려드릴게요.
            </p>
            <p className="text-xs text-gray-500">
              보통 1~2일 내 확인돼요.
            </p>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            이제 팀 관리 페이지로 이동할게요.
          </p>
          <Button 
            onClick={handleGoToManage}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            지금 팀 관리로 이동
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 🔥 동기화 대기 화면 (에러가 아님) - teamId가 없을 때만 표시
  if (!team && !teamId) {
    const handleGoToManage = () => {
      // teamId를 찾을 수 없으면 /me로 이동 (허브) - 무한 루프 방지
      navigate("/me", { replace: true });
    };

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-none text-center md:mx-auto md:max-w-3xl">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium mb-2">
            팀 정보를 불러오는 중이에요.
          </p>
          <p className="text-sm text-gray-500 mb-4">
            잠시만 기다리면 팀 관리 페이지로 이동해요.
          </p>
          <Button 
            onClick={handleGoToManage} 
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
          >
            지금 팀 관리 시작하기
          </Button>
        </div>
      </div>
    );
  }

  // 🔥 team이 없으면 동기화 대기 화면으로 (이미 위에서 처리했지만 안전장치)
  if (!team) {
    const handleGoToManage = () => {
      const foundTeamId = findTeamId();
      if (foundTeamId) {
        navigate(`/teams/${foundTeamId}/manage`, { replace: true });
      } else {
        navigate("/me", { replace: true });
      }
    };

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-none text-center md:mx-auto md:max-w-3xl">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium mb-2">
            팀 정보를 불러오는 중이에요.
          </p>
          <p className="text-sm text-gray-500 mb-4">
            잠시만 기다리면 팀 관리 페이지로 이동해요.
          </p>
          <Button 
            onClick={handleGoToManage} 
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
          >
            지금 팀 관리 시작하기
          </Button>
        </div>
      </div>
    );
  }

  // 이미 협회에 가입되어 있거나 대기 중인 경우
  const hasAssociation = team.associationId || team.membership === "member";
  const isPending = team.membership === "pending";

  if (hasAssociation || isPending) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-none text-center md:mx-auto md:max-w-3xl">
          <p className="text-gray-900 font-semibold mb-2">
            {hasAssociation ? "이미 협회에 가입되어 있어요." : "협회 가입 승인 대기 중이에요."}
          </p>
          <Button onClick={() => navigate("/me")} className="mt-4">
            돌아가기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-none px-3 md:mx-auto md:max-w-3xl py-6">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">협회 가입 신청</h1>
          <p className="text-sm text-gray-600">팀 정보를 확인하고 신청하세요</p>
        </div>

        {/* 협회 정보 카드 */}
        <div className="bg-white rounded-lg border-2 border-blue-500 shadow-lg p-6 mb-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900 mb-1">
                노원구 축구협회
              </h2>
              <p className="text-xs text-gray-500">서울시 노원구</p>
            </div>
          </div>
        </div>

        {/* 팀 정보 확인 카드 */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">팀 정보</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">팀명</p>
                <p className="font-medium text-gray-900">{team.name}</p>
              </div>
            </div>

            {team.region && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-gray-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500">지역</p>
                  <p className="font-medium text-gray-900">{team.region}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">대표자</p>
                <p className="font-medium text-gray-900">
                  {user?.displayName || user?.email?.split("@")[0] || "팀장"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 확인 문구 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800 text-center">
            이 팀으로 협회에 가입하시겠어요?
          </p>
        </div>

        {/* CTA 버튼 (하나만) */}
        <Button
          onClick={handleApply}
          disabled={submitting}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-base font-semibold flex items-center justify-center gap-2"
        >
          {submitting ? "신청 중..." : "가입 신청하기"}
          <ArrowRight className="w-4 h-4" />
        </Button>

        {/* 안내 문구 */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            보통 1~2일 내 확인돼요.
          </p>
        </div>
      </div>
    </div>
  );
}
