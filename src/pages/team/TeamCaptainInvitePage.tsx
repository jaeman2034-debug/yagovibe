/**
 * 🔥 팀장 초대 링크 처리 페이지
 * 
 * 플로우:
 * 1. 로그인 체크 (비로그인 → 로그인 페이지로 리다이렉트)
 * 2. 토큰 검증 (만료/사용 여부)
 * 3. UID 바인딩 (invite.usedByUid, team.captainUid)
 * 4. 권한 확정
 * 
 * 경로: /invite/team?token=...&associationId=...
 */

import { useSearchParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthProvider";
import { doc, getDoc, updateDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

type Invite = {
  teamId: string;
  associationId: string;
  role: "captain";
  used: boolean;
  usedByUid?: string;
  expiresAt?: Timestamp;
  revoked?: boolean;
};

export default function TeamCaptainInvitePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const token = searchParams.get("token");
  const associationId = searchParams.get("associationId");

  const [status, setStatus] = useState<
    "idle" | "need-login" | "invalid" | "expired" | "used" | "revoked" | "processing" | "done"
  >("idle");
  const [teamName, setTeamName] = useState<string>("");

  // STEP A: 로그인 체크
  useEffect(() => {
    if (authLoading) return;

    if (!token) {
      setStatus("invalid");
      return;
    }

    if (!user) {
      setStatus("need-login");
      return;
    }

    // 로그인되어 있고 토큰이 있으면 유효성만 확인 (자동 처리하지 않음)
    // 사용자가 버튼을 눌러야 처리되도록 함
  }, [token, user, authLoading]);

  const acceptInvite = async () => {
    if (!user?.uid || !token || !associationId) {
      setStatus("invalid");
      return;
    }

    setStatus("processing");

    try {
      // 1️⃣ 초대 문서 조회
      const inviteRef = doc(
        db,
        "associations",
        associationId,
        "TeamInvites",
        token
      );
      const inviteSnap = await getDoc(inviteRef);

      if (!inviteSnap.exists()) {
        setStatus("invalid");
        return;
      }

      const invite = inviteSnap.data() as Invite;

      // 2️⃣ STEP B: 토큰 검증
      // 폐기 확인
      if (invite.revoked === true) {
        setStatus("revoked");
        return;
      }

      // 사용 여부 확인
      if (invite.used === true) {
        setStatus("used");
        return;
      }

      // 만료 확인
      if (invite.expiresAt) {
        const expiresAt = invite.expiresAt.toDate();
        if (expiresAt < new Date()) {
          setStatus("expired");
          return;
        }
      }

      // 3️⃣ STEP C: UID 바인딩
      // 초대 문서 업데이트
      await updateDoc(inviteRef, {
        used: true,
        usedByUid: user.uid,
        usedAt: serverTimestamp(),
      });

      // 4️⃣ 팀 문서 업데이트 (captainUid 설정)
      const teamRef = doc(
        db,
        "associations",
        associationId,
        "Teams",
        invite.teamId
      );
      const teamSnap = await getDoc(teamRef);

      if (!teamSnap.exists()) {
        setStatus("invalid");
        return;
      }

      const teamData = teamSnap.data();
      setTeamName(teamData?.name || teamData?.teamName || "");

      await updateDoc(teamRef, {
        captainUid: user.uid,
        updatedAt: serverTimestamp(),
      });

      // 5️⃣ 성공 처리
      console.log(`[팀장 초대] ✅ 권한 부여 완료: ${user.uid} → team ${invite.teamId}`);
      setStatus("done");

      // 팀 관리 화면으로 이동
      setTimeout(() => {
        navigate(`/teams/${invite.teamId}/manage?associationId=${associationId}`);
      }, 2000);
    } catch (err: any) {
      console.error("[팀장 초대] 처리 오류:", err);
      
      // Firestore 오류 처리
      if (err.code === "permission-denied") {
        setStatus("invalid");
      } else {
        setStatus("invalid");
      }
    }
  };

  if (authLoading || status === "idle") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">확인 중...</p>
        </div>
      </div>
    );
  }

  if (status === "need-login") {
    const returnUrl = associationId
      ? `/invite/team?associationId=${associationId}&token=${token}`
      : `/invite/team?token=${token}`;
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">팀장 초대</h1>
          <p className="text-gray-600 mb-6">팀장 권한을 받으려면 로그인하세요.</p>
          <button
            onClick={() => navigate(`/login?redirect=${encodeURIComponent(returnUrl)}`)}
            className="w-full px-4 py-3 bg-black text-white rounded-lg hover:bg-gray-800 font-semibold"
          >
            로그인
          </button>
        </div>
      </div>
    );
  }

  if (status === "expired") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8 text-center">
          <div className="text-6xl mb-6">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">초대 만료</h2>
          <p className="text-gray-600 mb-6">
            초대가 만료되었습니다.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            운영자에게 새 초대 링크를 요청하세요.
          </p>
          <button
            onClick={() => navigate("/")}
            className="w-full py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold"
          >
            홈으로 이동
          </button>
        </div>
      </div>
    );
  }

  if (status === "used") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8 text-center">
          <div className="text-6xl mb-6">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">초대 사용됨</h2>
          <p className="text-gray-600 mb-6">
            이미 사용된 초대입니다.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            운영자에게 새 초대 링크를 요청하세요.
          </p>
          <button
            onClick={() => navigate("/")}
            className="w-full py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold"
          >
            홈으로 이동
          </button>
        </div>
      </div>
    );
  }

  if (status === "revoked") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8 text-center">
          <div className="text-6xl mb-6">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">초대 폐기됨</h2>
          <p className="text-gray-600 mb-6">
            유효하지 않은 초대입니다.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            운영자에게 새 초대 링크를 요청하세요.
          </p>
          <button
            onClick={() => navigate("/")}
            className="w-full py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold"
          >
            홈으로 이동
          </button>
        </div>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8 text-center">
          <div className="text-6xl mb-6">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">초대 처리 실패</h2>
          <p className="text-gray-600 mb-6">
            유효하지 않은 초대입니다.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            운영자에게 새 초대 링크를 요청하세요.
          </p>
          <button
            onClick={() => navigate("/")}
            className="w-full py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold"
          >
            홈으로 이동
          </button>
        </div>
      </div>
    );
  }

  if (status === "processing") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">권한을 부여하는 중...</p>
        </div>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8 text-center">
          <div className="text-6xl mb-6">✅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">팀장 권한 부여 완료</h2>
          <p className="text-gray-600 mb-6">
            {teamName ? `${teamName}의 팀장 권한이 부여되었습니다.` : "팀장 권한이 부여되었습니다."}
          </p>
          <p className="text-sm text-gray-500 mb-6">잠시 후 홈으로 이동합니다...</p>
        </div>
      </div>
    );
  }

  // 로그인되어 있고 토큰이 유효한 경우 - 사용자가 버튼을 눌러야 처리
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">팀장 초대</h1>
        <p className="text-gray-600 mb-6">
          아래 버튼을 눌러 팀장 권한을 받으세요.
        </p>
        <button
          onClick={acceptInvite}
          className="w-full px-4 py-3 bg-black text-white rounded-lg hover:bg-gray-800 font-semibold"
        >
          팀장 권한 받기
        </button>
      </div>
    </div>
  );
}
