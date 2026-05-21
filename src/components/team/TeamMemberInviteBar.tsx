/**
 * 팀 홈 멤버 탭 — 팀장용 초대 링크·가입 요청 바로가기
 * (`inviteLinks` + `/invite/:id`, `teamJoinRequests` 승인은 팀 관리 탭)
 */

import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { toast } from "sonner";
import { Link2, ClipboardCopy, Inbox, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import { initKakao } from "@/lib/kakaoAuth";
import { createTeamInviteLink } from "@/lib/team/teamInviteLink";
import { publicInviteLandingUrlStrict } from "@/lib/growth/teamInviteShare";
import { shareTeamInviteKakaoOrWebShare } from "@/services/kakaoShare";
import { track } from "@/lib/analytics";
import { callInviteTeamMemberByPhone } from "@/lib/team/phoneInviteCallables";
import { isValidKoreanPhone, normalizePhoneNumber } from "@/utils/phone";

export function TeamMemberInviteBar({ teamId }: { teamId: string }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [inviteId, setInviteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [kakaoBusy, setKakaoBusy] = useState(false);
  const [teamShareName, setTeamShareName] = useState("");
  const [teamShareIntro, setTeamShareIntro] = useState<string | null>(null);

  useEffect(() => {
    void initKakao();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const teamSnap = await getDoc(doc(db, "teams", teamId));
        if (!teamSnap.exists() || cancelled) return;
        const d = teamSnap.data();
        const name = typeof d.name === "string" ? d.name.trim() : "";
        const desc = typeof d.description === "string" ? d.description.trim() : "";
        setTeamShareName(name);
        setTeamShareIntro(desc.length > 0 ? desc : null);
      } catch {
        if (!cancelled) {
          setTeamShareName("");
          setTeamShareIntro(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [teamId]);

  const refreshInviteId = useCallback(async () => {
    const q = query(
      collection(db, "inviteLinks"),
      where("teamId", "==", teamId),
      where("isActive", "==", true)
    );
    const snap = await getDocs(q);
    setInviteId(snap.empty ? null : snap.docs[0].id);
  }, [teamId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refreshInviteId();
      } catch {
        if (!cancelled) setInviteId(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshInviteId]);

  const resolveOrCreateInviteId = useCallback(async (): Promise<string> => {
    if (!user?.uid) throw new Error("로그인이 필요합니다.");
    let id = inviteId;
    if (!id) {
      let teamName: string | undefined;
      const cached = teamShareName.trim();
      if (cached) teamName = cached;
      else {
        try {
          const teamSnap = await getDoc(doc(db, "teams", teamId));
          if (teamSnap.exists()) {
            const n = teamSnap.data().name;
            if (typeof n === "string" && n.trim()) teamName = n.trim();
          }
        } catch {
          /* 이름 없이 생성 */
        }
      }
      id = await createTeamInviteLink(teamId, user.uid, { teamName });
      setInviteId(id);
    }
    return id;
  }, [user?.uid, inviteId, teamId, teamShareName]);

  const handleCopyInvite = async () => {
    if (!user?.uid) return;
    setBusy(true);
    try {
      const id = await resolveOrCreateInviteId();
      const url = publicInviteLandingUrlStrict(id);
      await navigator.clipboard.writeText(url);
      void track("team_invite_link_copied", { teamId, source: "team_home_members" });
      toast.success("초대 링크를 복사했어요. 받는 분께 공유해 주세요.");
    } catch (e) {
      console.warn("[TeamMemberInviteBar] 초대 링크 실패:", e);
      toast.error("초대 링크를 만들거나 복사하지 못했어요.");
    } finally {
      setBusy(false);
      void refreshInviteId();
    }
  };

  const handleKakaoShare = async () => {
    if (!user?.uid) return;
    setKakaoBusy(true);
    try {
      const id = await resolveOrCreateInviteId();
      const inviteLink = publicInviteLandingUrlStrict(id);
      const teamName = teamShareName.trim() || "팀";
      const { channel } = await shareTeamInviteKakaoOrWebShare({
        inviteLink,
        teamName,
        teamIntro: teamShareIntro,
      });
      void track("team_invite_kakao_share", { teamId, source: "team_home_members", channel });
      if (channel === "web_share") {
        toast.success("공유 창이 열렸어요. 카카오톡·문자 등에서 보내 주세요.");
      }
    } catch (e: unknown) {
      console.warn("[TeamMemberInviteBar] 카카오 공유 실패:", e);
      toast.error(e instanceof Error ? e.message : "카카오톡 공유에 실패했어요.", { duration: 8000 });
    } finally {
      setKakaoBusy(false);
      void refreshInviteId();
    }
  };

  const goJoinRequests = () => {
    navigate(`/teams/${encodeURIComponent(teamId)}/manage?tab=requests`);
  };

  const handlePhoneInvite = async () => {
    if (!user?.uid) return;
    if (!inviteName.trim()) {
      toast.error("팀원 이름을 입력해 주세요.");
      return;
    }
    if (!isValidKoreanPhone(invitePhone)) {
      toast.error("휴대폰 번호(010…)를 확인해 주세요.");
      return;
    }
    setPhoneBusy(true);
    try {
      console.log("[TeamMemberInviteBar] inviting member", inviteName.trim(), normalizePhoneNumber(invitePhone));
      const r = await callInviteTeamMemberByPhone({
        teamId,
        name: inviteName.trim(),
        phone: normalizePhoneNumber(invitePhone),
        role: "member",
      });
      void track("team_phone_invite_sent", { teamId, smsSent: r.smsSent });
      toast.success(
        r.smsSent
          ? "선등록했고 초대 문자를 보냈어요. 받는 분이 링크에서 OTP 인증하면 팀에 연결돼요."
          : "선등록만 완료했어요. 서버에 Twilio 환경 변수가 없으면 문자가 가지 않을 수 있어요."
      );
      setInviteName("");
      setInvitePhone("");
      setPhoneOpen(false);
    } catch (e: unknown) {
      console.error("[TeamMemberInviteBar] invite error", e);
      const msg = e instanceof Error ? e.message : "전화 초대에 실패했어요.";
      toast.error(msg);
    } finally {
      setPhoneBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500">
        초대 링크 정보를 불러오는 중…
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50/80 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-gray-600">
          <span className="font-medium text-gray-800">멤버 초대</span>
          <span className="mx-1 text-gray-300">·</span>
          복사되는 주소는 <span className="font-mono text-[11px] text-gray-800">/invite/…</span> 입니다. 받는 분이
          열면 가입 요청으로 이어져요 (팀장 승인 후 멤버 반영).
        </p>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            className="gap-1.5"
            disabled={busy || kakaoBusy}
            onClick={() => void handleCopyInvite()}
          >
            {inviteId ? (
              <ClipboardCopy className="h-4 w-4" />
            ) : (
              <Link2 className="h-4 w-4" />
            )}
            {inviteId ? "링크 복사" : "초대 링크 만들기"}
          </Button>
          <Button
            type="button"
            size="sm"
            className="gap-1.5 border-[#FEE500] bg-[#FEE500] text-[#191919] hover:bg-[#fdd835]"
            disabled={!user?.uid || busy || kakaoBusy}
            onClick={() => void handleKakaoShare()}
          >
            {kakaoBusy ? "열리는 중…" : "카카오톡으로 공유"}
          </Button>
          <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={goJoinRequests}>
            <Inbox className="h-4 w-4" />
            가입 요청
          </Button>
        </div>
      </div>
      <p className="text-[11px] leading-relaxed text-gray-500">
        팀장 전용 초대 화면은{" "}
        <button
          type="button"
          className="font-medium text-blue-700 underline"
          onClick={() => navigate(`/teams/${encodeURIComponent(teamId)}/invite`)}
        >
          여기(/teams/…/invite)
        </button>
        에서도 열 수 있어요. (초대받는 사람용 주소는 <span className="font-mono">/invite/초대ID</span> 와 다릅니다.)
      </p>

      <div className="rounded-lg border border-sky-200 bg-sky-50/60 p-3 text-left">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 text-left text-xs font-semibold text-sky-900"
          onClick={() => setPhoneOpen((v) => !v)}
        >
          <span className="flex items-center gap-1.5">
            <Smartphone className="h-4 w-4 shrink-0" />
            전화번호로 미리 등록 + SMS 초대
          </span>
          <span className="text-[10px] font-normal text-sky-700">{phoneOpen ? "접기" : "펼치기"}</span>
        </button>
        {phoneOpen ? (
          <div className="mt-3 space-y-2">
            <p className="text-[11px] leading-relaxed text-sky-900/90">
              멤버 문서에 <strong>invited</strong>로 저장되고, 문자의 링크에서 <strong>Firebase OTP</strong>를 거친
              뒤에만 팀에 연결돼요. (링크만으로는 가입이 완료되지 않습니다.)
            </p>
            <input
              type="text"
              placeholder="이름 (예: 홍길동)"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              className="w-full rounded-md border border-sky-200 bg-white px-3 py-2 text-sm"
            />
            <input
              type="tel"
              placeholder="01012345678"
              value={invitePhone}
              onChange={(e) => setInvitePhone(e.target.value)}
              className="w-full rounded-md border border-sky-200 bg-white px-3 py-2 text-sm"
            />
            <Button
              type="button"
              size="sm"
              className="w-full"
              disabled={phoneBusy}
              onClick={() => void handlePhoneInvite()}
            >
              {phoneBusy ? "처리 중…" : "등록하고 SMS 보내기"}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
