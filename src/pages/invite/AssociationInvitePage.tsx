import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import {
  acceptAssociationInvite,
  getAssociationInviteByToken,
  type AssociationInviteDoc,
} from "@/services/associationInviteService";
import type { AssociationMember } from "@/utils/permissions";

type Status = "loading" | "ready" | "error" | "done";

export default function AssociationInvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [status, setStatus] = useState<Status>("loading");
  const [invite, setInvite] = useState<AssociationInviteDoc | null>(null);
  const [error, setError] = useState<string>("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!token) {
        setStatus("error");
        setError("유효하지 않은 초대 링크입니다.");
        return;
      }

      try {
        const docInvite = await getAssociationInviteByToken(token);
        if (!docInvite) {
          setStatus("error");
          setError("초대 링크를 찾을 수 없습니다.");
          return;
        }
        if (docInvite.used) {
          setStatus("error");
          setError("이미 사용된 초대 링크입니다.");
          return;
        }
        if (Date.now() > Number(docInvite.expiresAt || 0)) {
          setStatus("error");
          setError("만료된 초대 링크입니다.");
          return;
        }

        setInvite(docInvite);
        setStatus("ready");
      } catch (e) {
        console.error("[AssociationInvitePage] 초대 확인 실패:", e);
        setStatus("error");
        setError("초대 링크 확인 중 오류가 발생했습니다.");
      }
    };
    void run();
  }, [token]);

  const handleJoin = async () => {
    if (!invite || joining || authLoading) return;
    if (!user?.uid) {
      navigate(`/login?next=${encodeURIComponent(`/invite/association/${invite.token}`)}`, { replace: true });
      return;
    }

    setJoining(true);
    try {
      const snap = await getDoc(doc(db, "associations", invite.associationId));
      if (!snap.exists()) {
        setStatus("error");
        setError("협회 정보를 찾을 수 없습니다.");
        return;
      }

      const associationData = snap.data() as { members?: AssociationMember[]; ownerUid?: string; ownerId?: string };
      const currentMembers = associationData.members && associationData.members.length > 0
        ? associationData.members
        : associationData.ownerUid || associationData.ownerId
          ? [{ uid: (associationData.ownerUid || associationData.ownerId) as string, role: "owner" as const }]
          : [];

      const result = await acceptAssociationInvite({
        invite,
        uid: user.uid,
        currentMembers,
      });

      if (result.alreadyMember) {
        alert("이미 가입된 협회입니다.");
      }

      setStatus("done");
      navigate(`/association/${invite.associationId}`, { replace: true });
    } catch (e) {
      console.error("[AssociationInvitePage] 가입 처리 실패:", e);
      setStatus("error");
      setError("가입 처리 중 오류가 발생했습니다.");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-none md:max-w-3xl bg-white border rounded-xl p-6 text-center">
        <h1 className="text-xl font-bold mb-2">협회 초대</h1>

        {status === "loading" && <p className="text-sm text-gray-600">초대 링크를 확인 중입니다...</p>}
        {status === "error" && <p className="text-sm text-red-600">{error}</p>}
        {status === "ready" && (
          <>
            <p className="text-sm text-gray-700 mb-4">협회에 참여하시겠습니까?</p>
            <button
              type="button"
              onClick={handleJoin}
              disabled={joining}
              className="w-full py-3 rounded-md bg-blue-600 text-white font-semibold disabled:opacity-50"
            >
              {joining ? "가입 처리 중..." : "협회 가입하기"}
            </button>
          </>
        )}
        {status === "done" && <p className="text-sm text-green-600">가입이 완료되었습니다. 이동 중...</p>}
      </div>
    </div>
  );
}

