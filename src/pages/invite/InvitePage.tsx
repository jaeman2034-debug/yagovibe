/**
 * `/invite` 공용 랜딩
 * - `?teamId=&phone=` : 전화 선등록 멤버 → OTP(`TeamPhoneInviteAcceptCard`) → Callable 연결
 * - `?id=` / `?token=` : 협회(연맹) 초대 · Ownership Transfer 초대
 * - `/invite/:inviteId` 경로의 팀 **가입 요청** 링크는 `InviteLinkPage` (inviteLinks) — 본 페이지와 목적이 다름
 *
 * Ownership (`federation_ownership_transfer`):
 *   자동 accept 하지 않음 → currentUid/expectedUid 표시 후 「참여하기」로 수락
 * federation_role:
 *   로그인 시 기존처럼 즉시 accept (자동)
 */
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { signOut } from "firebase/auth";
import { useAuth } from "@/context/AuthProvider";
import { acceptFederationInvite } from "@/services/inviteService";
import { acceptFederationPhoneInviteById } from "@/services/federationInvitePhoneService";
import { setPendingInviteTeamId } from "@/lib/team/pendingInviteTeam";
import {
  clearPendingInviteReturnPath,
  escapeDeadInviteToHub,
  inviteReturnPathFromSearchParams,
  setPendingInviteReturnPath,
  setPendingInviteToken,
  getPendingInviteReturnPath,
} from "@/lib/auth/pendingInviteReturn";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
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
  | "ready_accept"
  | "accepting"
  | "phone_need_otp"
  | "phone_wrong_account"
  | "phone_claiming";

type TokenInvitePreview = {
  kind: string;
  expectedUid: string | null;
  inviteToUid: string | null;
  inviteTargetUid: string | null;
  pendingToUid: string | null;
  inviteId: string;
  federationSlug: string;
  federationName: string;
  status: string;
};

async function loadTokenInvitePreview(token: string): Promise<TokenInvitePreview | null> {
  const q = query(
    collection(db, "invites"),
    where("token", "==", token),
    where("status", "==", "pending"),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const inviteDoc = snap.docs[0];
  const d = inviteDoc.data() as Record<string, unknown>;
  const kind = String(d.kind || "federation_role");
  const federationSlug = String(d.federationSlug || "").trim();
  const inviteToUid =
    typeof d.toUid === "string" && d.toUid.trim() ? String(d.toUid).trim() : null;
  const inviteTargetUid =
    typeof d.targetUid === "string" && d.targetUid.trim() ? String(d.targetUid).trim() : null;
  let pendingToUid: string | null = null;
  let expectedUid: string | null = inviteToUid;
  let federationName = federationSlug;

  if (federationSlug) {
    const fedSnap = await getDoc(doc(db, "federations", federationSlug));
    const fed = fedSnap.data() as Record<string, unknown> | undefined;
    const name = String(fed?.name || fed?.title || "").trim();
    if (name) federationName = name;
    if (kind === "federation_ownership_transfer") {
      const pending = (fed as any)?.pendingOwnershipTransfer;
      if (pending?.toUid) {
        pendingToUid = String(pending.toUid).trim();
        expectedUid = pendingToUid;
      }
    }
  }

  return {
    kind,
    expectedUid,
    inviteToUid,
    inviteTargetUid,
    pendingToUid,
    inviteId: inviteDoc.id,
    federationSlug,
    federationName,
    status: String(d.status || "pending"),
  };
}

function goLoginWithInviteReturn(navigate: (to: string, opts?: { replace?: boolean }) => void, returnPath: string) {
  setPendingInviteReturnPath(returnPath);
  try {
    const token = new URL(returnPath, "https://yago-vibe-spt.web.app").searchParams.get("token");
    if (token) setPendingInviteToken(token);
  } catch {
    /* ignore */
  }
  navigate(`/login?next=${encodeURIComponent(returnPath)}`, { replace: true });
}

export default function InvitePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [status, setStatus] = useState<InviteUiStatus>("loading");
  const [message, setMessage] = useState("초대를 확인하고 있습니다.");
  const [targetFederationSlug, setTargetFederationSlug] = useState("");
  const [federationName, setFederationName] = useState("");
  const [inviteKind, setInviteKind] = useState<string>("");
  const [expectedUid, setExpectedUid] = useState<string | null>(null);
  const [inviteToUid, setInviteToUid] = useState<string | null>(null);
  const [inviteTargetUid, setInviteTargetUid] = useState<string | null>(null);
  const [pendingToUid, setPendingToUid] = useState<string | null>(null);
  const [inviteDocId, setInviteDocId] = useState("");
  const [debugLine, setDebugLine] = useState("");
  const [wrongAccount, setWrongAccount] = useState(false);
  const processedKeyRef = useRef<string | null>(null);
  const loginRedirectedRef = useRef(false);

  const teamIdQs = params.get("teamId")?.trim() || "";
  const phoneQsRaw = params.get("phone")?.trim() || "";
  const isPhoneTeamInvite = Boolean(teamIdQs && phoneQsRaw);
  const currentUid = user?.uid || null;

  /**
   * URL에 token이 있을 때는 여기서 저장하지 않음.
   * (만료/사용완료 초대를 다시 pending으로 심으면 / · /hub 가 초대 화면으로 끌려감)
   * URL이 비었을 때만 storage → URL 복원 (로그인 복귀용).
   */
  useEffect(() => {
    if (isPhoneTeamInvite) return;
    const hasUrlInvite = Boolean(params.get("token")?.trim() || params.get("id")?.trim());
    if (hasUrlInvite) return;
    const pending = getPendingInviteReturnPath();
    if (pending && pending.startsWith("/invite?")) {
      console.log("[InvitePage] restoring invite from sessionStorage:", pending);
      navigate(pending, { replace: true });
    }
  }, [params, navigate, isPhoneTeamInvite]);

  /** SMS 초대: teamId + phone — OTP 인증 후 Callable로 연결 */
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
        clearPendingInviteReturnPath();
        setStatus("invalid");
        setMessage("유효하지 않은 초대 링크입니다.");
        return;
      }

      if (loading) return;
      if (processedKeyRef.current === key) return;
      processedKeyRef.current = key;

      const returnPath =
        (token ? `/invite?token=${encodeURIComponent(token)}` : null) ||
        (inviteId
          ? `/invite?id=${encodeURIComponent(inviteId)}${fid ? `&fid=${encodeURIComponent(fid)}` : ""}`
          : null);

      // —— token invite ——
      if (token) {
        const preview = await loadTokenInvitePreview(token);
        if (!preview) {
          console.log("[InvitePage] dead invite → hard escape /hub");
          escapeDeadInviteToHub();
          return;
        }

        if (!user) {
          if (returnPath) setPendingInviteReturnPath(returnPath);
          setStatus("need_login");
          setMessage("로그인이 필요합니다. 로그인 후 동일 초대 화면으로 돌아옵니다.");
          if (returnPath && !loginRedirectedRef.current) {
            loginRedirectedRef.current = true;
            goLoginWithInviteReturn(navigate, returnPath);
          }
          return;
        }

        setWrongAccount(false);
        console.log("[InvitePage] user:", {
          uid: user.uid,
          phoneNumber: (user as any)?.phoneNumber || null,
        });

        setInviteKind(preview.kind);
        setExpectedUid(preview.expectedUid);
        setInviteToUid(preview.inviteToUid);
        setInviteTargetUid(preview.inviteTargetUid);
        setPendingToUid(preview.pendingToUid);
        setInviteDocId(preview.inviteId);
        setTargetFederationSlug(preview.federationSlug);
        setFederationName(preview.federationName);

        const match = preview.expectedUid ? preview.expectedUid === user.uid : null;
        setDebugLine(
          `currentUid=${user.uid} | invite.toUid=${preview.inviteToUid || "(null)"} | pending.toUid=${preview.pendingToUid || "(null)"} | targetUid=${preview.inviteTargetUid || "(null)"} | match=${match}`
        );
        console.log("[InvitePage] UID compare:", {
          currentEmail: user.email || null,
          currentUid: user.uid,
          inviteId: preview.inviteId,
          "invite.toUid": preview.inviteToUid,
          "invite.targetUid": preview.inviteTargetUid,
          "pending.toUid": preview.pendingToUid,
          expectedUid: preview.expectedUid,
          kind: preview.kind,
          match,
          federationSlug: preview.federationSlug,
        });

        if (preview.kind === "federation_ownership_transfer") {
          if (preview.expectedUid && preview.expectedUid !== user.uid) {
            setWrongAccount(true);
            setStatus("error");
            setMessage(
              `다른 계정으로 로그인되어 있습니다.\n\n초대한 계정(bkpark15 등)으로 다시 로그인한 뒤 「참여하기」를 눌러 주세요.\n\n현재 이메일: ${user.email || "(없음)"}\n현재 UID: ${user.uid}\n대상 UID (pending.toUid): ${preview.pendingToUid || preview.expectedUid}\ninvite.toUid: ${preview.inviteToUid || "(null)"}\ntargetUid 필드: ${preview.inviteTargetUid || "(없음 — SoT는 toUid)"}`
            );
            return;
          }
          if (returnPath) setPendingInviteReturnPath(returnPath);
          setStatus("ready_accept");
          setMessage(
            `${preview.federationName || "협회"} 관리자(Owner)로 참여하시겠습니까?\n아래 「참여하기」를 누르면 수락됩니다.\n(최종 확정은 Platform Admin 승인 후)`
          );
          return;
        }

        const accepted = await acceptFederationInvite(token, user.uid);
        console.log("[InvitePage] accepted by token (auto):", accepted);
        clearPendingInviteReturnPath();
        setTargetFederationSlug(accepted.slug);
        setStatus("success");
        setMessage("협회 참여가 완료되었습니다.");
        return;
      }

      // —— inviteId (phone/federation id) ——
      if (!user) {
        if (returnPath) setPendingInviteReturnPath(returnPath);
        setStatus("need_login");
        setMessage("로그인이 필요합니다. 로그인 후 동일 초대 화면으로 돌아옵니다.");
        if (returnPath && !loginRedirectedRef.current) {
          loginRedirectedRef.current = true;
          goLoginWithInviteReturn(navigate, returnPath);
        }
        return;
      }

      const { federationId } = await acceptFederationPhoneInviteById(
        inviteId!,
        {
          uid: user.uid,
          phoneNumber: (user as any)?.phoneNumber || null,
        },
        fid || undefined
      );
      console.log("[InvitePage] accepted by inviteId, federationId:", federationId);
      clearPendingInviteReturnPath();
      setTargetFederationSlug(federationId);
      setStatus("success");
      setMessage("협회 참여가 완료되었습니다.");
    };

    void run().catch((error) => {
      console.error(error);
      const msg = error instanceof Error ? error.message : "초대 처리에 실패했습니다.";
      if (
        msg.includes("만료") ||
        msg.includes("이미 사용") ||
        msg.includes("이미 사용되었")
      ) {
        console.log("[InvitePage] dead invite (error) → hard escape /hub");
        escapeDeadInviteToHub();
        return;
      }
      clearPendingInviteReturnPath();
      if (msg.includes("유효하지 않은")) {
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

  const handleOwnershipAccept = async () => {
    const token = params.get("token");
    if (!token || !user) return;
    setStatus("accepting");
    setMessage("Ownership 초대를 수락하는 중입니다…");
    try {
      const accepted = await acceptFederationInvite(token, user.uid);
      console.log("[InvitePage] ownership accepted (button):", accepted);
      clearPendingInviteReturnPath();
      try {
        sessionStorage.removeItem("afterLogin");
      } catch {
        /* ignore */
      }
      setTargetFederationSlug(accepted.slug);
      setStatus("success");
      setMessage(
        accepted.message ||
          "Ownership 초대를 수락했습니다. Platform Admin 최종 승인 후 Federation Owner로 확정됩니다."
      );
    } catch (error) {
      console.error(error);
      const msg = error instanceof Error ? error.message : "초대 처리에 실패했습니다.";
      setStatus("error");
      setMessage(msg);
    }
  };

  const handleSwitchAccountForInvite = async () => {
    const returnPath =
      inviteReturnPathFromSearchParams(params) ||
      getPendingInviteReturnPath() ||
      (params.get("token")
        ? `/invite?token=${encodeURIComponent(params.get("token")!)}`
        : null);
    if (!returnPath) return;
    setPendingInviteReturnPath(returnPath);
    try {
      await signOut(auth);
    } catch (e) {
      console.warn("[InvitePage] signOut failed", e);
    }
    loginRedirectedRef.current = false;
    processedKeyRef.current = null;
    goLoginWithInviteReturn(navigate, returnPath);
  };

  const inviteId = params.get("id");
  const fid = params.get("fid");
  const token = params.get("token");
  const teamId = params.get("teamId")?.trim() || "";
  const phoneEnc = params.get("phone")?.trim() || "";
  const nextPath =
    inviteReturnPathFromSearchParams(params) ||
    (inviteId
      ? `/invite?id=${inviteId}${fid ? `&fid=${encodeURIComponent(fid)}` : ""}`
      : teamId && phoneEnc
        ? `/invite?teamId=${encodeURIComponent(teamId)}&phone=${encodeURIComponent(phoneEnc)}`
        : teamId
          ? `/invite?teamId=${encodeURIComponent(teamId)}`
          : token
            ? `/invite?token=${encodeURIComponent(token)}`
            : getPendingInviteReturnPath() || "/invite");

  const title =
    status === "success"
      ? inviteKind === "federation_ownership_transfer"
        ? "Ownership 수락 완료"
        : targetFederationSlug
          ? "🎉 협회 참여 완료"
          : "🎉 팀 연결 완료"
      : status === "ready_accept"
        ? federationName
          ? `${federationName} 초대`
          : "Ownership 초대 확인"
        : status === "accepting"
          ? "수락 처리 중"
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
        <p className="whitespace-pre-line text-sm text-gray-600">{message}</p>

        {(status === "ready_accept" || status === "error" || status === "success") &&
        (currentUid || expectedUid || debugLine) ? (
          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-left font-mono text-[11px] text-gray-700 break-all">
            <div>currentEmail: {user?.email || "(null)"}</div>
            <div>currentUid: {currentUid || "(null)"}</div>
            <div>invite.toUid: {inviteToUid || "(null)"}</div>
            <div>invite.targetUid: {inviteTargetUid || "(없음)"}</div>
            <div>pending.toUid: {pendingToUid || "(null)"}</div>
            <div>expectedUid(=pending||invite): {expectedUid || "(null)"}</div>
            <div>
              match:{" "}
              {expectedUid && currentUid
                ? expectedUid === currentUid
                  ? "true"
                  : "false"
                : "n/a"}
            </div>
            {inviteDocId ? <div>inviteId: {inviteDocId}</div> : null}
            {inviteKind ? <div>kind: {inviteKind}</div> : null}
          </div>
        ) : null}

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
              onClick={() => goLoginWithInviteReturn(navigate, nextPath)}
            >
              로그인하기
            </button>
          ) : null}

          {status === "ready_accept" ? (
            <button
              type="button"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white"
              onClick={() => void handleOwnershipAccept()}
            >
              참여하기
            </button>
          ) : null}

          {wrongAccount && status === "error" ? (
            <button
              type="button"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white"
              onClick={() => void handleSwitchAccountForInvite()}
            >
              초대 계정으로 다시 로그인
            </button>
          ) : null}

          {canGoFederation ? (
            <button
              type="button"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white"
              onClick={() => navigate(`/federations/${targetFederationSlug}`)}
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
                console.log("[InvitePage] CTA hard escape → /hub");
                escapeDeadInviteToHub();
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
