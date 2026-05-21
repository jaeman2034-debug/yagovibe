/**
 * 🔥 팀원 초대 페이지 (팀장 전용)
 * 
 * 경로: /teams/:teamId/invite
 * 
 * 핵심 정체성: "공유 페이지"
 * - 회원 검색 ❌
 * - 이메일 입력 강요 ❌
 * - 복잡한 폼 ❌
 * - 공유 가능한 링크 하나 ✅
 * 
 * 역할:
 * - 초대 링크 생성
 * - 링크 표시 및 복사
 * - 공유 안내
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import { createTeamInviteLink } from "@/lib/team/teamInviteLink";
import { Copy, Check, Users, Share2, ArrowLeft, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function pickTeamActivityNote(t: Record<string, unknown> | null | undefined): string | undefined {
  if (!t) return undefined;
  const keys = ["activityNote", "activityTime", "scheduleNote", "practiceSchedule", "meetingTime"];
  for (const k of keys) {
    const v = t[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

function canManageTeamByMemberData(data: Record<string, unknown> | undefined): boolean {
  if (!data) return false;
  const role = typeof data.role === "string" ? data.role.toLowerCase() : "";
  const accessLevel = typeof data.accessLevel === "string" ? data.accessLevel.toUpperCase() : "";
  return (
    role === "owner" ||
    role === "admin" ||
    role === "manager" ||
    role === "vice" ||
    role === "부팀장" ||
    accessLevel === "OWNER" ||
    accessLevel === "ADMIN"
  );
}
import { initKakao } from "@/lib/kakaoAuth";
import { shareTeamInviteKakaoOrWebShare } from "@/services/kakaoShare";
import { buildTeamInviteShareMessage, openSmsWithBody } from "@/lib/team/buildTeamInviteShareMessage";
import { publicInviteLandingUrlStrict } from "@/lib/growth/teamInviteShare";

export default function TeamInvitePage() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [team, setTeam] = useState<any>(null);
  const [inviteLink, setInviteLink] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [existingInviteId, setExistingInviteId] = useState<string | null>(null);

  useEffect(() => {
    void initKakao();
  }, []);

  // 팀 정보 조회 및 기존 초대 링크 확인
  useEffect(() => {
    if (!teamId || !user) {
      setLoading(false);
      return;
    }

    const loadTeamAndInvite = async () => {
      try {
        // 1. 팀 정보 조회
        const teamRef = doc(db, "teams", teamId);
        const teamSnap = await getDoc(teamRef);

        if (!teamSnap.exists()) {
          navigate(`/teams/${teamId}/manage?tab=requests`, { replace: true });
          return;
        }

        const teamData = teamSnap.data();
        const ownerUid =
          (typeof teamData.ownerUid === "string" && teamData.ownerUid) ||
          (typeof teamData.ownerUserId === "string" && teamData.ownerUserId) ||
          "";
        let canInvite = ownerUid === user.uid;
        if (!canInvite) {
          const memberSnap = await getDoc(doc(db, "teams", teamId, "members", user.uid));
          if (memberSnap.exists()) {
            canInvite = canManageTeamByMemberData(memberSnap.data() as Record<string, unknown>);
          }
        }
        if (!canInvite) {
          const membersRef = collection(db, "teams", teamId, "members");
          const byUserId = await getDocs(query(membersRef, where("userId", "==", user.uid)));
          canInvite = byUserId.docs.some((d) =>
            canManageTeamByMemberData(d.data() as Record<string, unknown>)
          );
        }
        if (!canInvite) {
          const membersRef = collection(db, "teams", teamId, "members");
          const byUid = await getDocs(query(membersRef, where("uid", "==", user.uid)));
          canInvite = byUid.docs.some((d) =>
            canManageTeamByMemberData(d.data() as Record<string, unknown>)
          );
        }
        if (!canInvite) {
          navigate(`/teams/${teamId}/manage?tab=requests`, { replace: true });
          return;
        }

        setTeam({ id: teamSnap.id, ...teamData });

        // 2. 기존 활성 초대 링크 확인 (실패해도 페이지는 유지)
        try {
          const inviteLinksRef = collection(db, "inviteLinks");
          const q = query(
            inviteLinksRef,
            where("teamId", "==", teamId),
            where("isActive", "==", true)
          );

          const inviteSnap = await getDocs(q);
          if (!inviteSnap.empty) {
            const existingInvite = inviteSnap.docs[0];
            const inviteId = existingInvite.id;
            setExistingInviteId(inviteId);
            setInviteLink(publicInviteLandingUrlStrict(inviteId));
          }
        } catch (inviteError) {
          console.warn("기존 초대 링크 조회 실패(페이지 유지):", inviteError);
        }
      } catch (error) {
        console.error("팀 정보 조회 실패:", error);
        navigate(`/teams/${teamId}/manage?tab=requests`, { replace: true });
      } finally {
        setLoading(false);
      }
    };

    loadTeamAndInvite();
  }, [teamId, user, navigate]);

  // 초대 링크 생성
  const handleCreateInviteLink = async () => {
    if (!teamId || !user?.uid) return;

    setGenerating(true);
    try {
      const inviteId = await createTeamInviteLink(teamId, user.uid, {
        teamName: typeof team?.name === "string" ? team.name : undefined,
        teamRegion: typeof team?.region === "string" ? team.region : undefined,
        teamDescription: typeof team?.description === "string" ? team.description : undefined,
        teamActivityNote: pickTeamActivityNote(team as Record<string, unknown>),
      });
      const newInviteLink = publicInviteLandingUrlStrict(inviteId);
      
      setInviteLink(newInviteLink);
      setExistingInviteId(inviteId);
      toast.success("초대 링크가 생성되었어요!");
    } catch (error: any) {
      console.error("초대 링크 생성 실패:", error);
      toast.error(error.message || "초대 링크 생성에 실패했습니다.");
    } finally {
      setGenerating(false);
    }
  };

  // 링크 복사
  const handleCopyLink = async () => {
    if (!inviteLink) return;

    try {
      await navigator.clipboard.writeText(publicInviteLandingUrlStrict(inviteLink));
      setCopied(true);
      toast.success("초대 링크를 복사했어요!");
      
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error("링크 복사 실패:", error);
      toast.error("링크 복사에 실패했습니다.");
    }
  };

  const shareInviteText =
    inviteLink && team
      ? buildTeamInviteShareMessage({
          teamName: String(team.name ?? "팀").trim() || "팀",
          teamIntro: team.description ? String(team.description) : null,
          inviteLink,
        })
      : "";

  const handleCopyShareMessage = async () => {
    if (!shareInviteText) return;
    try {
      await navigator.clipboard.writeText(shareInviteText);
      toast.success("공유 문구를 복사했어요!");
    } catch {
      toast.error("복사에 실패했습니다.");
    }
  };

  const handleKakaoShare = async () => {
    if (!inviteLink || !team) return;
    console.log("✅ 팀 초대 카카오 버튼 클릭 (TeamInvitePage)", inviteLink);
    try {
      const { channel } = await shareTeamInviteKakaoOrWebShare({
        inviteLink,
        teamName: String(team.name ?? "팀"),
        teamIntro: team.description ? String(team.description) : null,
      });
      if (channel === "web_share") {
        toast.success("공유 창이 열렸어요. 카카오톡·문자 등에서 보내 주세요.");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "공유에 실패했습니다.", { duration: 8000 });
    }
  };

  const handleSmsShare = () => {
    if (!shareInviteText) return;
    openSmsWithBody(shareInviteText);
  };

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

  if (!team) {
    return null; // 리다이렉트 중
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full p-0 md:p-6">
        {/* 헤더 */}
        <div className="mb-6">
          <button
            onClick={() => navigate(`/teams/${teamId}/manage`)}
            className="text-sm text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            돌아가기
          </button>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">팀원 초대</h1>
          <p className="text-sm text-gray-600">초대 링크를 공유해 팀원을 초대하세요</p>
        </div>

        {/* 초대 링크 카드 */}
        <div className="bg-white rounded-lg border-2 border-blue-500 shadow-lg p-6 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Share2 className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900 mb-1">초대 링크</h2>
              <p className="text-sm text-gray-600">
                아래 링크를 공유해 팀원을 초대해보세요.
              </p>
            </div>
          </div>

          {inviteLink ? (
            <div className="space-y-3">
              {/* 초대 링크 표시 */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-sm font-mono text-gray-900 break-all">
                  {inviteLink}
                </p>
              </div>

              {/* 복사 버튼 */}
              <Button
                onClick={handleCopyLink}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-base font-semibold flex items-center justify-center gap-2"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    복사 완료!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    링크 복사
                  </>
                )}
              </Button>
              <p className="text-xs text-gray-600 leading-snug px-0.5 -mt-1">
                카카오톡 단톡·오픈채팅에 붙여넣기 좋은 문구예요. 아래에서 복사해 주세요.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleCopyShareMessage()}
                className="w-full h-12 text-base border-slate-200"
              >
                <Copy className="w-4 h-4 mr-2 opacity-70" />
                공유 문구 복사
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleKakaoShare()}
                className="w-full h-12 text-base border-slate-200 bg-[#FEE500] text-[#191919] hover:bg-[#fdd835] border-[#FEE500]"
              >
                카카오톡으로 공유
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleSmsShare}
                className="w-full h-12 text-base border-slate-200 flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                문자로 공유
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleCreateInviteLink}
              disabled={generating}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-base font-semibold"
            >
              {generating ? "생성 중..." : "초대 링크 생성하기"}
            </Button>
          )}
        </div>

        {/* 안내 문구 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="space-y-2 text-sm text-blue-800">
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>이 링크는 팀원 초대 전용입니다</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>가입은 팀장 승인 후 완료됩니다</span>
            </div>
          </div>
        </div>

        {/* 팀 정보 */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-gray-600" />
            <h3 className="text-sm font-semibold text-gray-900">초대 대상</h3>
          </div>
          <div className="text-sm text-gray-700">
            <p className="font-medium">{team.name}</p>
            {team.region && (
              <p className="text-gray-500 mt-1">{team.region}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
