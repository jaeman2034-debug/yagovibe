/**
 * 친구 초대 랜딩 — `/invite/friend/:inviterUid` (팀 초대 `/invite/:inviteId` 와 분리)
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthProvider";
import { db } from "@/lib/firebase";
import { callableErrorMessage } from "@/lib/errors/callableErrorMessage";
import {
  callAcceptFriendship,
  callPreviewFriendInvite,
  callRequestFriendship,
  type PreviewFriendInviteResult,
} from "@/lib/social/friendshipClient";
import { friendProfileInvitePath } from "@/lib/social/friendInviteUrl";
import { canonicalFriendshipId, isPlausibleFirebaseUid, type FriendshipStatus } from "@/types/social";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Phase = "loading" | "invalid" | "not-found" | "ready" | "self";

type FriendshipMeta = {
  status: FriendshipStatus;
  requesterUid: string;
  addresseeUid: string;
};

export default function InviteFriendLandingPage() {
  const { inviterUid: inviterUidParam = "" } = useParams<{ inviterUid: string }>();
  const inviterUid = inviterUidParam ? decodeURIComponent(inviterUidParam) : "";
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [phase, setPhase] = useState<Phase>("loading");
  const [preview, setPreview] = useState<PreviewFriendInviteResult | null>(null);
  const [friendship, setFriendship] = useState<FriendshipMeta | "none" | null>(null);
  const [friendshipLoading, setFriendshipLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  const loginNext = useMemo(
    () => encodeURIComponent(friendProfileInvitePath(inviterUid)),
    [inviterUid],
  );

  const loadFriendship = useCallback(async () => {
    if (!user?.uid || !isPlausibleFirebaseUid(inviterUid) || user.uid === inviterUid) {
      setFriendship(null);
      return;
    }
    setFriendshipLoading(true);
    try {
      const fid = canonicalFriendshipId(user.uid, inviterUid);
      const snap = await getDoc(doc(db, "friendships", fid));
      if (!snap.exists()) {
        setFriendship("none");
        return;
      }
      const d = snap.data() as Record<string, unknown>;
      const st = String(d.status ?? "");
      if (st !== "pending" && st !== "accepted" && st !== "blocked") {
        setFriendship("none");
        return;
      }
      const requesterUid = String(d.requesterUid ?? "");
      const addresseeUid = String(d.addresseeUid ?? "");
      if (!requesterUid || !addresseeUid) {
        setFriendship("none");
        return;
      }
      setFriendship({
        status: st as FriendshipStatus,
        requesterUid,
        addresseeUid,
      });
    } catch {
      setFriendship("none");
    } finally {
      setFriendshipLoading(false);
    }
  }, [inviterUid, user?.uid]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isPlausibleFirebaseUid(inviterUid)) {
        setPhase("invalid");
        return;
      }
      setPhase("loading");
      try {
        const p = await callPreviewFriendInvite(inviterUid);
        if (cancelled) return;
        if (!p.ok) {
          setPhase("not-found");
          setPreview(null);
          return;
        }
        setPreview(p);
        if (user?.uid && user.uid === inviterUid) {
          setPhase("self");
        } else {
          setPhase("ready");
        }
      } catch {
        if (!cancelled) setPhase("not-found");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [inviterUid, user?.uid]);

  useEffect(() => {
    if (authLoading) return;
    if (user?.uid && inviterUid && user.uid === inviterUid && isPlausibleFirebaseUid(inviterUid)) {
      setPhase("self");
    }
  }, [authLoading, inviterUid, user?.uid]);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.uid || !inviterUid || user.uid === inviterUid) return;
    if (phase !== "ready") return;
    void loadFriendship();
  }, [authLoading, inviterUid, loadFriendship, phase, user?.uid]);

  const onRequest = async () => {
    if (!user?.uid) {
      navigate(`/login?next=${loginNext}`);
      return;
    }
    setActionBusy(true);
    try {
      const r = await callRequestFriendship(inviterUid);
      if (r.ok) {
        toast.success("친구 요청을 보냈어요.");
        await loadFriendship();
        return;
      }
      if (r.reason === "use_accept" || r.status === "pending_incoming_use_accept") {
        toast.message("이미 받은 요청이 있어요. 아래에서 수락해 주세요.");
        await loadFriendship();
        return;
      }
      if (r.reason === "friendship_blocked") {
        toast.error("지금은 친구 요청을 보낼 수 없어요.");
        return;
      }
      toast.error("요청을 처리할 수 없어요.");
    } catch (e) {
      toast.error(callableErrorMessage(e));
    } finally {
      setActionBusy(false);
    }
  };

  const onAccept = async () => {
    if (!user?.uid) return;
    setActionBusy(true);
    try {
      const r = await callAcceptFriendship(inviterUid);
      if (r.ok) {
        toast.success("친구가 되었어요!");
        await loadFriendship();
      } else {
        toast.error("수락할 수 없어요.");
      }
    } catch (e) {
      toast.error(callableErrorMessage(e));
    } finally {
      setActionBusy(false);
    }
  };

  if (phase === "invalid") {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center bg-slate-50 px-4">
        <p className="text-center text-slate-700">링크가 올바르지 않습니다.</p>
        <Button className="mt-6" variant="outline" onClick={() => navigate("/hub")}>
          허브로 가기
        </Button>
      </div>
    );
  }

  if (phase === "not-found") {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center bg-slate-50 px-4">
        <p className="text-center text-slate-700">초대를 불러올 수 없습니다.</p>
        <Button className="mt-6" variant="outline" onClick={() => navigate("/hub")}>
          허브로 가기
        </Button>
      </div>
    );
  }

  if (phase === "self") {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center bg-slate-50 px-4">
        <p className="text-center text-slate-700">본인 초대 링크예요. 친구에게 이 링크를 공유해 보세요.</p>
        <Button className="mt-6" variant="default" onClick={() => navigate("/hub")}>
          허브로 가기
        </Button>
      </div>
    );
  }

  const name = preview?.displayName ?? "YAGO 사용자";

  const pendingUi = () => {
    if (!user?.uid || friendship === null || friendship === "none") return null;
    if (friendship.status !== "pending") return null;
    const isAddressee = user.uid === friendship.addresseeUid;
    const isRequester = user.uid === friendship.requesterUid;
    if (isAddressee && friendship.requesterUid === inviterUid) {
      return (
        <Button className="w-full" size="lg" disabled={actionBusy} onClick={() => void onAccept()}>
          요청 수락하기
        </Button>
      );
    }
    if (isRequester) {
      return <p className="text-center text-sm text-indigo-100">상대의 수락을 기다리고 있어요.</p>;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-950 to-slate-900 px-3 py-12 text-white">
      <div className="w-full max-w-none rounded-2xl border border-white/10 bg-white/5 p-8 shadow-xl backdrop-blur-sm md:mx-auto md:max-w-3xl">
        {phase === "loading" ? (
          <div className="py-12 text-center text-sm text-indigo-200">불러오는 중…</div>
        ) : (
          <>
            <p className="text-center text-xs font-semibold uppercase tracking-wide text-indigo-300">
              YAGO 친구 초대
            </p>
            <h1 className="mt-3 text-center text-2xl font-bold">{name}</h1>
            <p className="mt-2 text-center text-sm text-indigo-100/90">
              야고에서 함께 운동하고 성장해요.
            </p>

            {!user && (
              <div className="mt-8 space-y-3">
                <Link to={`/login?next=${loginNext}`}>
                  <Button className="w-full" size="lg">
                    로그인하고 시작하기
                  </Button>
                </Link>
                <Link to={`/signup?next=${loginNext}`}>
                  <Button className="w-full" variant="outline" size="lg">
                    가입하기
                  </Button>
                </Link>
              </div>
            )}

            {user && !authLoading && (
              <div className="mt-8 space-y-4">
                {friendshipLoading ? (
                  <p className="text-center text-sm text-indigo-200">상태 확인 중…</p>
                ) : friendship && friendship !== "none" && friendship.status === "accepted" ? (
                  <p className="text-center text-sm text-emerald-200">이미 친구예요.</p>
                ) : friendship && friendship !== "none" && friendship.status === "blocked" ? (
                  <p className="text-center text-sm text-slate-300">지금은 친구 요청을 할 수 없어요.</p>
                ) : friendship && friendship !== "none" && friendship.status === "pending" ? (
                  pendingUi() ?? (
                    <p className="text-center text-sm text-indigo-100">진행 중인 친구 요청이 있어요.</p>
                  )
                ) : (
                  <Button className="w-full" size="lg" disabled={actionBusy} onClick={() => void onRequest()}>
                    친구 요청 보내기
                  </Button>
                )}
                <Button variant="ghost" className="w-full text-indigo-200" onClick={() => navigate("/hub")}>
                  허브로 가기
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
