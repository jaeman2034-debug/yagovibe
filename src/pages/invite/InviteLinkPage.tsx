/**
 * 팀 초대 링크 랜딩 — /invite/:inviteId
 *
 * 1) Callable `previewTeamMemberInvite`: `teamMemberInvites`(전화번호 멤버 연결)면 OTP 수락 UI
 * 2) 없으면 `inviteLinks`(가입 요청) 흐름
 *
 * - 가입 요청: 비로그인 → 로그인 후 신청 폼 · 로그인 시 teamJoinRequests
 */

import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/context/AuthProvider";
import {
  getInviteLinkById,
  validateInviteLink,
  joinTeamViaInviteLink,
  type TeamInviteLink,
} from "@/lib/team/teamInviteLink";
import { applicantProfileFromAuthUser } from "@/lib/team/teamJoinRequest";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar, MapPin, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getPublicAppOriginForExternalInvite, teamInviteKakaoFeedImageUrl } from "@/lib/growth/teamInviteShare";
import { setPendingInviteTeamId } from "@/lib/team/pendingInviteTeam";
import { callPreviewTeamMemberInvite, type PreviewTeamMemberInviteResult } from "@/lib/team/teamMemberInviteCallables";
import { TeamMemberInviteAcceptCard } from "@/pages/invite/TeamMemberInviteAcceptCard";

type Phase =
  | "loading-invite"
  | "invalid"
  | "landing"
  | "member-invite-landing"
  | "submitting"
  | "success"
  | "error";

function blockingMessageForMemberInvitePreview(r: PreviewTeamMemberInviteResult): string | undefined {
  if (r.found) return undefined;
  switch (r.reason) {
    case "EXPIRED":
      return "초대 유효기간이 지났습니다. 팀장에게 새 초대를 요청해 주세요.";
    case "ALREADY_ACCEPTED":
      return "이미 처리된 초대입니다. 같은 계정으로 팀 홈에서 이어주세요.";
    case "INVALID_ID":
      return "초대 링크가 올바르지 않습니다.";
    case "INVALID_STATUS":
    case "INVALID_INVITE_DATA":
      return "초대 정보가 올바르지 않습니다. 팀장에게 문의해 주세요.";
    case "NOT_FOUND":
    default:
      return undefined;
  }
}

type LandingCtx = {
  teamId: string;
  teamName: string;
  region?: string;
  description?: string;
  activityNote?: string;
};

function pickActivityFromTeamData(d: Record<string, unknown>): string | undefined {
  const keys = ["activityNote", "activityTime", "scheduleNote", "practiceSchedule", "meetingTime"];
  for (const k of keys) {
    const v = d[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

export default function InviteLinkPage() {
  const { inviteId: inviteIdParam = "" } = useParams<{ inviteId: string }>();
  const inviteId = inviteIdParam;
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [phase, setPhase] = useState<Phase>("loading-invite");
  const [error, setError] = useState<string | null>(null);
  const [ctx, setCtx] = useState<LandingCtx | null>(null);

  /** 팀/초대 메타(ctx)와 분리 — 신청자 표시명만 (팀장·팀 이름 주입 금지) */
  const [applicantName, setApplicantName] = useState("");
  const applicantNameTouchedRef = useRef(false);
  const [position, setPosition] = useState("");
  const [applicantNote, setApplicantNote] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const loadInvite = useCallback(async () => {
    if (!inviteId) {
      setError("초대 링크가 올바르지 않습니다.");
      setPhase("invalid");
      return;
    }
    setPhase("loading-invite");
    setError(null);
    try {
      let preview: PreviewTeamMemberInviteResult | null = null;
      try {
        preview = await callPreviewTeamMemberInvite(inviteId);
      } catch (prevErr: unknown) {
        console.warn("[InviteLinkPage] previewTeamMemberInvite 실패 → inviteLinks로 계속:", prevErr);
        preview = null;
      }

      if (preview?.found && preview.teamId) {
        const teamName = (preview.teamName ?? "").trim() || "팀";
        setCtx({
          teamId: preview.teamId,
          teamName,
          region: undefined,
          description: undefined,
          activityNote: undefined,
        });
        setPhase("member-invite-landing");
        return;
      }

      if (preview && !preview.found) {
        const block = blockingMessageForMemberInvitePreview(preview);
        if (block) {
          setError(block);
          setPhase("invalid");
          return;
        }
      }

      const result = await getInviteLinkById(inviteId);
      if (!result) {
        setError("초대 링크를 찾을 수 없습니다.");
        setPhase("invalid");
        return;
      }
      const { invite, teamId } = result;
      const validation = validateInviteLink(invite as TeamInviteLink);
      if (!validation.valid) {
        setError(validation.error || "초대 링크가 유효하지 않습니다.");
        setPhase("invalid");
        return;
      }
      const inv = invite as TeamInviteLink;
      const teamName = (inv.teamName?.trim() || "팀").trim();
      const region = inv.teamRegion?.trim();
      const description = inv.teamDescription?.trim();
      const activityNote = inv.teamActivityNote?.trim();
      setCtx({
        teamId,
        teamName: teamName || "팀",
        region,
        description,
        activityNote,
      });
      setPhase("landing");
    } catch (err: unknown) {
      console.error("초대 링크 로드 실패:", err);
      const msg = err instanceof Error ? err.message : "";
      const code =
        err && typeof err === "object" && "code" in err ? String((err as { code?: string }).code) : "";
      if (code === "permission-denied" || /insufficient permissions/i.test(msg)) {
        setError(
          "초대 정보를 불러올 권한이 없어요. 링크가 만료·비활성화되었거나 잘못되었을 수 있어요. 팀장에게 새 초대를 요청해 보세요."
        );
      } else if (
        code === "unavailable" ||
        /offline|client is offline|Failed to fetch|network error|네트워크/i.test(msg)
      ) {
        setError(
          "인터넷에 연결되지 않아 초대 정보를 불러오지 못했습니다. Wi‑Fi·모바일 데이터를 확인한 뒤 새로고침해 주세요."
        );
      } else {
        setError(msg || "초대 링크를 불러오지 못했습니다.");
      }
      setPhase("error");
    }
  }, [inviteId]);

  useEffect(() => {
    void loadInvite();
  }, [loadInvite]);

  /** 링크만 붙여넣어 공유할 때 미리보기(OG) — JS 실행 크롤러에 도움 */
  useEffect(() => {
    if ((phase !== "landing" && phase !== "member-invite-landing") || !ctx || !inviteId) return;
    setPendingInviteTeamId(ctx.teamId);
    const isMemberToken = phase === "member-invite-landing";
    const title = isMemberToken ? `⚽ ${ctx.teamName} 팀원 연결` : `⚽ ${ctx.teamName} 팀 초대`;
    const intro = (ctx.description ?? "").trim();
    const desc = isMemberToken
      ? "휴대폰 인증으로 팀 계정과 연결할 수 있습니다. 링크를 열고 등록된 번호로 인증해 주세요."
      : intro.length > 0
        ? `${intro.slice(0, 120)}${intro.length > 120 ? "…" : ""} 링크에서 가입 요청을 해 주세요.`
        : "함께 활동할 팀원을 모집합니다. 링크에서 가입 요청을 해 주세요.";
    const base = getPublicAppOriginForExternalInvite();
    const pageUrl = `${base}/invite/${encodeURIComponent(inviteId)}`;
    const image = teamInviteKakaoFeedImageUrl();

    const upsert = (prop: string, content: string) => {
      const sel = `meta[data-yago-invite-meta="1"][property="${prop}"]`;
      let el = document.head.querySelector<HTMLMetaElement>(sel);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("property", prop);
        el.setAttribute("data-yago-invite-meta", "1");
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    const previousTitle = document.title;
    document.title = title;
    upsert("og:title", title);
    upsert("og:description", desc);
    upsert("og:url", pageUrl);
    upsert("og:image", image);
    upsert("og:type", "website");

    return () => {
      document.title = previousTitle;
      document.head.querySelectorAll('meta[data-yago-invite-meta="1"]').forEach((n) => n.remove());
    };
  }, [phase, ctx, inviteId]);

  useEffect(() => {
    applicantNameTouchedRef.current = false;
  }, [user?.uid]);

  /** 로그인 사용자: Auth 표시명 → 없으면 users 프로필. 비로그인/빈 값: 빈 칸(직접 입력). ctx/팀 문서는 사용하지 않음. */
  useEffect(() => {
    if (applicantNameTouchedRef.current) return;
    if (!user?.uid) {
      setApplicantName("");
      return;
    }
    const fromAuth = user.displayName?.trim();
    if (fromAuth) {
      setApplicantName(fromAuth);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (cancelled || applicantNameTouchedRef.current) return;
        const d = snap.data() as Record<string, unknown> | undefined;
        const fromProfile =
          typeof d?.displayName === "string" ? d.displayName.trim() : "";
        setApplicantName(fromProfile || "");
      } catch {
        if (!cancelled && !applicantNameTouchedRef.current) setApplicantName("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid, user?.displayName]);

  useEffect(() => {
    if (!ctx?.teamId || !user?.uid || authLoading) return;
    let cancelled = false;
    (async () => {
      try {
        const teamSnap = await getDoc(doc(db, "teams", ctx.teamId));
        if (cancelled || !teamSnap.exists()) return;
        const d = teamSnap.data() as Record<string, unknown>;
        const nameFromTeam = typeof d.name === "string" ? d.name.trim() : "";
        const regionFromTeam = typeof d.region === "string" ? d.region.trim() : "";
        const descFromTeam = typeof d.description === "string" ? d.description.trim() : "";
        const actFromTeam = pickActivityFromTeamData(d);
        setCtx((prev) => {
          if (!prev || prev.teamId !== ctx.teamId) return prev;
          return {
            ...prev,
            teamName:
              prev.teamName && prev.teamName !== "팀"
                ? prev.teamName
                : nameFromTeam || prev.teamName,
            region: prev.region || regionFromTeam || undefined,
            description: prev.description || descFromTeam || undefined,
            activityNote: prev.activityNote || actFromTeam || undefined,
          };
        });
      } catch {
        /* teams 읽기 실패 시 초대 문서만 */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ctx?.teamId, user?.uid, authLoading]);

  /** 멤버 연결 초대만: 비로그인이어도 팀 카드 정보 보강 */
  useEffect(() => {
    if (phase !== "member-invite-landing" || !ctx?.teamId || authLoading) return;
    let cancelled = false;
    (async () => {
      try {
        const teamSnap = await getDoc(doc(db, "teams", ctx.teamId));
        if (cancelled || !teamSnap.exists()) return;
        const d = teamSnap.data() as Record<string, unknown>;
        const nameFromTeam = typeof d.name === "string" ? d.name.trim() : "";
        const regionFromTeam = typeof d.region === "string" ? d.region.trim() : "";
        const descFromTeam = typeof d.description === "string" ? d.description.trim() : "";
        const actFromTeam = pickActivityFromTeamData(d);
        setCtx((prev) => {
          if (!prev || prev.teamId !== ctx.teamId) return prev;
          return {
            ...prev,
            teamName:
              prev.teamName && prev.teamName !== "팀" ? prev.teamName : nameFromTeam || prev.teamName,
            region: prev.region || regionFromTeam || undefined,
            description: prev.description || descFromTeam || undefined,
            activityNote: prev.activityNote || actFromTeam || undefined,
          };
        });
      } catch {
        /* teams 읽기 실패 시 preview 팀 이름만 유지 */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [phase, ctx?.teamId, authLoading]);

  const buildRequestMessage = (): string | undefined => {
    const parts: string[] = [];
    const pos = position.trim();
    const note = applicantNote.trim();
    if (pos) parts.push(`【포지션】 ${pos}`);
    if (note) parts.push(`【한마디】 ${note}`);
    const m = parts.join("\n");
    return m || undefined;
  };

  const handleJoinClick = async () => {
    if (!inviteId || !ctx) return;
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(`/invite/${inviteId}`)}`);
      return;
    }
    setPhase("submitting");
    const rawPhone = contactPhone.trim();
    if (rawPhone) {
      if (rawPhone.length > 32) {
        toast.error("전화번호는 32자 이내로 입력해 주세요.");
        setPhase("landing");
        return;
      }
      if (!/^[0-9+\-()\s]+$/.test(rawPhone)) {
        toast.error("전화번호는 숫자, +, -, 괄호, 공백만 사용할 수 있어요.");
        setPhase("landing");
        return;
      }
    }
    try {
      const profile = applicantProfileFromAuthUser(user);
      const nameOverride = applicantName.trim();
      const userName = nameOverride || profile.userName;
      await joinTeamViaInviteLink(inviteId, user.uid, {
        userName,
        userEmail: profile.userEmail,
        message: buildRequestMessage(),
        contactPhone: rawPhone || undefined,
      });
      toast.success(
        `가입 요청이 전송되었어요. ${ctx.teamName} 팀장의 승인을 기다려 주세요.`,
        { duration: 4000 }
      );
      setPhase("success");
      setTimeout(() => {
        navigate(`/team/${encodeURIComponent(ctx.teamId)}`);
      }, 2800);
    } catch (err: unknown) {
      console.error("가입 요청 실패:", err);
      const msg = err instanceof Error ? err.message : "";
      const code =
        err && typeof err === "object" && "code" in err ? String((err as { code?: string }).code) : "";
      if (
        msg.includes("이미 가입 요청이 진행 중") ||
        msg.includes("이미 승인된 가입 요청")
      ) {
        toast.success("이미 요청이 처리된 상태예요. 팀장이 확인 중이에요. 팀 페이지로 이동합니다.");
        setPhase("success");
        setTimeout(() => {
          navigate(`/team/${encodeURIComponent(ctx.teamId)}`);
        }, 1600);
        return;
      }
      setPhase("landing");
      if (code === "permission-denied" || /insufficient permissions/i.test(msg)) {
        toast.error("로그인 후 다시 초대 링크를 열어주세요.");
      } else {
        toast.error(msg || "가입 요청에 실패했습니다.");
      }
    }
  };

  if (phase === "loading-invite") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-3" />
        <p className="text-sm text-slate-600">초대 페이지를 불러오는 중…</p>
        <p className="text-xs text-slate-400 mt-2">잠시만 기다려 주세요</p>
      </div>
    );
  }

  if (phase === "invalid" || phase === "error") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-none md:max-w-3xl bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 text-2xl font-bold">
            !
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">초대를 열 수 없어요</h1>
          <p className="text-sm text-slate-600 mb-6">{error || "초대 링크 처리 중 오류가 발생했습니다."}</p>
          <div className="flex flex-col gap-2">
            <Button className="w-full h-12" onClick={() => void loadInvite()}>
              다시 시도
            </Button>
            <Button variant="outline" className="w-full h-12" onClick={() => navigate("/")}>
              홈으로
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "success") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-none md:max-w-3xl bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl" aria-hidden>
              ✓
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">가입 요청을 보냈어요</h1>
          <p className="text-sm text-slate-600 mb-2">
            {ctx?.teamName ? (
              <>
                <span className="font-medium text-slate-800">{ctx.teamName}</span> 팀장이 요청을 확인 중이에요.
              </>
            ) : (
              "팀장이 요청을 확인 중이에요."
            )}
            <br />
            승인되면 알림·팀 홈에서 이어서 안내될 수 있어요.
          </p>
          <p className="text-xs text-slate-500 mb-4">잠시 후 팀 페이지로 이동합니다…</p>
          {ctx?.teamId ? (
            <p className="text-xs text-slate-500">
              팀장이시면{" "}
              <button
                type="button"
                className="font-medium text-blue-700 underline"
                onClick={() =>
                  navigate(`/teams/${encodeURIComponent(ctx.teamId)}/manage?tab=requests`)
                }
              >
                가입 요청 관리
              </button>
              에서 승인할 수 있어요.
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  if (!ctx) {
    return null;
  }

  if (phase === "member-invite-landing") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-8 pb-12">
        <div className="w-full max-w-none px-3 md:mx-auto md:max-w-3xl">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-emerald-700 px-5 py-6 text-white">
              <p className="text-xs font-medium uppercase tracking-wide opacity-90">팀원 연결 초대</p>
              <h1 className="text-2xl font-bold mt-1 leading-tight flex items-start gap-2">
                <Users className="w-7 h-7 shrink-0 mt-0.5 opacity-95" aria-hidden />
                <span>⚽ {ctx.teamName}</span>
              </h1>
              {ctx.region ? (
                <p className="text-sm text-emerald-100 mt-2 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 shrink-0" aria-hidden />
                  <span>주 활동 지역: {ctx.region}</span>
                </p>
              ) : null}
            </div>
            <div className="px-5 py-5 space-y-3">
              <p className="text-sm text-slate-700 leading-relaxed">
                팀에 등록된 휴대폰 번호로 인증하면, 내 계정과 팀 회원 카드가 연결됩니다. 링크에 전화번호는
                포함되어 있지 않습니다.
              </p>
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2.5 text-xs text-emerald-900">
                <strong className="font-semibold">가입 요청이 아닙니다.</strong> 이미 팀에 이름·번호가
                적힌 멤버로 등록되어 있어야 합니다.
              </div>
              <TeamMemberInviteAcceptCard inviteId={inviteId} teamId={ctx.teamId} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const submitting = phase === "submitting";
  const joinDisabled = authLoading || submitting;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-8 pb-12">
      <div className="w-full max-w-none px-3 md:mx-auto md:max-w-3xl">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-blue-600 px-5 py-6 text-white">
            <p className="text-xs font-medium uppercase tracking-wide opacity-90">팀 초대</p>
            <h1 className="text-2xl font-bold mt-1 leading-tight flex items-start gap-2">
              <Users className="w-7 h-7 shrink-0 mt-0.5 opacity-95" aria-hidden />
              <span>⚽ {ctx.teamName}</span>
            </h1>
            {ctx.region ? (
              <p className="text-sm text-blue-100 mt-2 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 shrink-0" aria-hidden />
                <span>주 활동 지역: {ctx.region}</span>
              </p>
            ) : null}
            {ctx.activityNote ? (
              <p className="text-sm text-blue-100 mt-2 flex items-start gap-1.5">
                <Calendar className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
                <span>활동: {ctx.activityNote}</span>
              </p>
            ) : null}
          </div>

          <div className="px-5 py-5 space-y-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1.5">팀 소개</p>
              {ctx.description ? (
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{ctx.description}</p>
              ) : (
                <p className="text-sm text-slate-500">등록된 소개가 없어요. 가입 후 팀 페이지에서 확인해 주세요.</p>
              )}
            </div>

            <div className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5 text-xs text-amber-900">
              회원가입이 아니라 <strong>가입 요청</strong>이에요. 팀장이 승인하면 팀원으로 등록돼요.
            </div>

            {user ? (
              <div className="space-y-3 pt-1 border-t border-slate-100">
                <p className="text-sm font-semibold text-slate-800">가입 요청</p>
                <div className="space-y-1.5">
                  <Label htmlFor="invite-display-name" className="text-xs text-slate-600">
                    이름 (팀장에게 표시)
                  </Label>
                  <Input
                    id="invite-display-name"
                    name="inviteJoinApplicantName"
                    autoComplete="off"
                    value={applicantName}
                    onChange={(e) => {
                      applicantNameTouchedRef.current = true;
                      setApplicantName(e.target.value);
                    }}
                    placeholder="가입 요청에 표시할 이름"
                    className="h-11"
                    maxLength={80}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="invite-position" className="text-xs text-slate-600">
                    포지션 (선택)
                  </Label>
                  <Input
                    id="invite-position"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    placeholder="예: MF, 골키퍼"
                    className="h-11"
                    maxLength={60}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="invite-note" className="text-xs text-slate-600">
                    팀장에게 한마디 (선택)
                  </Label>
                  <Textarea
                    id="invite-note"
                    value={applicantNote}
                    onChange={(e) => setApplicantNote(e.target.value)}
                    placeholder="간단히 자기소개나 각오를 적어 주세요"
                    rows={3}
                    maxLength={500}
                    className="resize-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="invite-phone" className="text-xs text-slate-600">
                    전화번호 (선택)
                  </Label>
                  <Input
                    id="invite-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="010-1234-5678 (선택)"
                    className="h-11"
                    maxLength={32}
                  />
                  <p className="text-[11px] text-slate-500 leading-snug">
                    팀장이 필요 시 연락드릴 수 있어요. 팀 관리의 가입 요청 화면에서만 보이며, 일반 팀원에게는
                    공개되지 않아요.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-600">
                가입 요청을 하려면 로그인이 필요해요. 아래 버튼에서 로그인한 뒤 다시 이 페이지로 돌아와 주세요.
              </p>
            )}
          </div>

          <div className="px-5 pb-6 pt-0 flex flex-col gap-2">
            <Button
              className="w-full h-12 text-base font-semibold"
              disabled={joinDisabled}
              onClick={() => void handleJoinClick()}
            >
              {authLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  확인 중…
                </>
              ) : submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  요청 보내는 중…
                </>
              ) : user ? (
                "가입 요청 보내기"
              ) : (
                "로그인하고 가입 요청"
              )}
            </Button>
            {!user && !authLoading ? (
              <p className="text-center text-xs text-slate-500">
                로그인 시 프로필 이메일이 팀장에게 함께 전달될 수 있어요.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
