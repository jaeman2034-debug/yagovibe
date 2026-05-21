/**
 * `/invite` 공용 랜딩
 * - `?teamId=&phone=` : 전화 선등록 멤버 → OTP(`TeamPhoneInviteAcceptCard`) → Callable 연결 — 상세는 `functions/.../phoneInviteTeamMembers.ts` 주석
 * - `?id=` / `?token=` : 협회(연맹) 초대
 * - `/invite/:inviteId` 경로의 팀 **가입 요청** 링크는 `InviteLinkPage` (inviteLinks) — 본 페이지와 목적이 다름
 */
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { acceptFederationInvite } from "@/services/inviteService";
import { acceptFederationPhoneInviteById } from "@/services/federationInvitePhoneService";
import { setPendingInviteTeamId } from "@/lib/team/pendingInviteTeam";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { normalizePhoneNumber } from "@/utils/phone";
import { callClaimPhoneInvitedTeamMemberships } from "@/lib/team/phoneInviteCallables";
import { TeamPhoneInviteAcceptCard } from "@/pages/invite/TeamPhoneInviteAcceptCard";
import { teamPlayEntryPath } from "@/lib/team/teamPlayRoutes";

type InviteUiStatus =
  | "loading"
  | "need_login"
  | "invalid"
  | "expired"
  | "used"
  | "error"
  | "success"
  | "phone_need_otp"
  | "phone_wrong_account"
  | "phone_claiming";

export default function InvitePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();
  const [status, setStatus] = useState<InviteUiStatus>("loading");
  const [message, setMessage] = useState("초대를 확인하고 있습니다.");
  const [targetFederationSlug, setTargetFederationSlug] = useState("");
  const processedKeyRef = useRef<string | null>(null);

  const teamIdQs = params.get("teamId")?.trim() || "";
  const phoneQsRaw = params.get("phone")?.trim() || "";
  const isPhoneTeamInvite = Boolean(teamIdQs && phoneQsRaw);

  /** SMS 초대: teamId + phone — OTP 인증 후 Callable로 연결 (링크만으로 가입 완료 불가) */
  useEffect(() => {
    if (!isPhoneTeamInvite) return;

    let cancelled = false;

    const run = async () => {
      let phoneE164 = "";
      try {
        phoneE164 = normalizePhoneNumber(decodeURIComponent(phoneQsRaw));
      } catch {
        phoneE164 = normalizePhoneNumber(phoneQsRaw);
      }
      if (!phoneE164.startsWith("+")) {
        setStatus("invalid");
        setMessage("초대 링크의 전화번호가 올바르지 않습니다.");
        return;
      }

      const teamSnap = await getDoc(doc(db, "teams", teamIdQs));
      if (!teamSnap.exists()) {
        setStatus("invalid");
        setMessage("유효하지 않은 팀 초대입니다. 팀이 없거나 삭제되었습니다.");
        return;
      }

      if (loading) {
        setStatus("loading");
        setMessage("로그인 상태를 확인하는 중입니다.");
        return;
      }

      if (!user) {
        setStatus("phone_need_otp");
        setMessage("휴대폰으로 인증번호를 받은 뒤, 인증하면 팀에 자동으로 연결됩니다.");
        return;
      }

      const authPhone = user.phoneNumber;
      if (!authPhone) {
        setStatus("phone_wrong_account");
        setMessage(
          "이 초대는 휴대폰(OTP)으로 인증한 계정만 연결할 수 있습니다. 아래에서 초대된 번호로 인증해 주세요."
        );
        return;
      }

      const nAuth = normalizePhoneNumber(authPhone);
      if (nAuth !== phoneE164) {
        setStatus("phone_wrong_account");
        setMessage(
          "지금 로그인한 번호가 초대 링크의 번호와 다릅니다. 초대된 번호로 휴대폰 인증을 진행해 주세요."
        );
        return;
      }

      setStatus("phone_claiming");
      setMessage("팀 멤버십을 연결하는 중입니다…");
      try {
        await callClaimPhoneInvitedTeamMemberships({ teamId: teamIdQs });
        if (cancelled) return;
        setStatus("success");
        setMessage("팀에 연결되었습니다. 플레이 화면으로 이동합니다.");
        navigate(teamPlayEntryPath(teamIdQs), { replace: true });
      } catch (e: unknown) {
        if (cancelled) return;
        console.error(e);
        setStatus("error");
        setMessage(
          e instanceof Error ? e.message : "연결에 실패했습니다. 잠시 후 다시 시도해 주세요."
        );
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [isPhoneTeamInvite, teamIdQs, phoneQsRaw, user, loading, navigate]);

  useEffect(() => {
    const run = async () => {
      const inviteId = params.get("id");
      const fid = params.get("fid");
      const token = params.get("token");
      const teamId = params.get("teamId")?.trim() || "";
      const phoneEnc = params.get("phone")?.trim() || "";

      if (teamId && phoneEnc) {
        return;
      }

      const key = `${inviteId || ""}:${token || ""}:${user?.uid || "anon"}:${loading ? "loading" : "ready"}`;
      console.log("[InvitePage] inviteId:", inviteId, "fid:", fid, "token:", token);
      if (teamId) {
        setPendingInviteTeamId(teamId);
        if (loading) return;
        if (!user) {
          setStatus("need_login");
          setMessage("로그인 후 팀 참여가 자동으로 연결됩니다.");
          return;
        }
        const teamSnap = await getDoc(doc(db, "teams", teamId));
        if (!teamSnap.exists()) {
          setStatus("invalid");
          setMessage("유효하지 않은 팀 초대입니다. 팀이 없거나 삭제되었습니다.");
          return;
        }
        const memberSnap = await getDoc(doc(db, "teams", teamId, "members", user.uid));
        if (memberSnap.exists()) {
          setStatus("success");
          setMessage("이미 참여한 팀입니다. 플레이 화면으로 이동합니다.");
          navigate(teamPlayEntryPath(teamId), { replace: true });
          return;
        }
        setStatus("success");
        setMessage("팀 초대를 확인했습니다. 팀 화면으로 이동합니다.");
        navigate(`/team/${encodeURIComponent(teamId)}`, { replace: true });
        return;
      }
      if (!inviteId && !token) {
        setStatus("invalid");
        setMessage("유효하지 않은 초대 링크입니다.");
        return;
      }

      if (loading) return;
      if (processedKeyRef.current === key) return;
      processedKeyRef.current = key;
      if (!user) {
        setStatus("need_login");
        setMessage("로그인이 필요합니다.");
        return;
      }
      console.log("[InvitePage] user:", { uid: user.uid, phoneNumber: (user as any)?.phoneNumber || null });

      if (inviteId) {
        const { federationId } = await acceptFederationPhoneInviteById(
          inviteId,
          {
            uid: user.uid,
            phoneNumber: (user as any)?.phoneNumber || null,
          },
          fid || undefined
        );
        console.log("[InvitePage] accepted by inviteId, federationId:", federationId);
        setTargetFederationSlug(federationId);
        setStatus("success");
        setMessage("협회 참여가 완료되었습니다.");
        return;
      }

      const { slug } = await acceptFederationInvite(token!, user.uid);
      console.log("[InvitePage] accepted by token, slug:", slug);
      setTargetFederationSlug(slug);
      setStatus("success");
      setMessage("협회 참여가 완료되었습니다.");
    };

    void run().catch((error) => {
      console.error(error);
      const msg = error instanceof Error ? error.message : "초대 처리에 실패했습니다.";
      if (msg.includes("만료")) {
        setStatus("expired");
      } else if (msg.includes("이미 사용") || msg.includes("이미 사용되었")) {
        setStatus("used");
      } else if (msg.includes("유효하지 않은")) {
        setStatus("invalid");
      } else {
        setStatus("error");
      }
      setMessage(msg);
    });
  }, [params, navigate, user, loading]);

  useEffect(() => {
    if (!loading) return;
    if (isPhoneTeamInvite) return;
    const t = window.setTimeout(() => {
      if (loading) {
        setStatus("need_login");
        setMessage("로그인 상태 확인이 지연되고 있습니다. 로그인 버튼을 눌러 다시 시도해주세요.");
      }
    }, 7000);
    return () => window.clearTimeout(t);
  }, [loading, isPhoneTeamInvite]);

  const inviteId = params.get("id");
  const fid = params.get("fid");
  const token = params.get("token");
  const teamId = params.get("teamId")?.trim() || "";
  const phoneEnc = params.get("phone")?.trim() || "";
  const nextPath = inviteId
    ? `/invite?id=${inviteId}${fid ? `&fid=${encodeURIComponent(fid)}` : ""}`
    : teamId && phoneEnc
      ? `/invite?teamId=${encodeURIComponent(teamId)}&phone=${encodeURIComponent(phoneEnc)}`
      : teamId
        ? `/invite?teamId=${encodeURIComponent(teamId)}`
        : `/invite?token=${token}`;

  const title =
    status === "success"
      ? targetFederationSlug
        ? "🎉 협회 참여 완료"
        : "🎉 팀 연결 완료"
      : status === "need_login"
        ? "로그인이 필요합니다"
        : status === "expired"
          ? "초대가 만료되었습니다"
          : status === "used"
            ? "이미 사용된 초대입니다"
            : status === "invalid"
              ? "유효하지 않은 초대"
              : status === "error"
                ? "처리 중 오류가 발생했습니다"
                : status === "phone_need_otp"
                  ? "휴대폰 인증"
                  : status === "phone_wrong_account"
                    ? "번호가 일치하지 않습니다"
                    : status === "phone_claiming"
                      ? "연결 중"
                      : "초대 처리 중";

  const canGoFederation = status === "success" && !!targetFederationSlug;

  const phoneForCard = phoneEnc ? decodeURIComponent(phoneEnc) : "";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-none md:max-w-3xl rounded-xl border border-gray-200 bg-white p-6 text-center">
        <h1 className="mb-2 text-xl font-bold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-600">{message}</p>

        {isPhoneTeamInvite && status === "phone_need_otp" ? (
          <TeamPhoneInviteAcceptCard teamId={teamIdQs} expectedPhoneFromUrl={phoneForCard} />
        ) : null}

        {isPhoneTeamInvite && status === "phone_wrong_account" ? (
          <TeamPhoneInviteAcceptCard teamId={teamIdQs} expectedPhoneFromUrl={phoneForCard} />
        ) : null}

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {status === "need_login" && !isPhoneTeamInvite ? (
            <button
              type="button"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white"
              onClick={() => navigate(`/login?next=${encodeURIComponent(nextPath)}`)}
            >
              로그인하기
            </button>
          ) : null}

          {canGoFederation ? (
            <button
              type="button"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white"
              onClick={() => navigate(`/federation/${targetFederationSlug}`)}
            >
              협회로 이동
            </button>
          ) : null}

          {status === "expired" ||
          status === "used" ||
          status === "invalid" ||
          status === "error" ? (
            <button
              type="button"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700"
              onClick={() => {
                if (!location.pathname.startsWith("/sports")) {
                  console.log("🔥 NAVIGATE HOME TRIGGERED [InvitePage:cta]", location.pathname);
                  navigate("/home");
                }
              }}
            >
              홈으로 이동
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
