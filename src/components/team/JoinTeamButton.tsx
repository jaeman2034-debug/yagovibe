/**
 * 🔥 JoinTeamButton - 가입 요청 버튼 (STEP: 팀원 가입 플로우)
 *
 * 가장 중요한 컴포넌트
 * - 가입 요청 생성
 * - 중복 요청 방지
 * - UX 즉시 반영
 * - 승인 전까지 Persona 그대로 P1
 */

import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import { Button } from "@/components/ui/button";
import { logTeamJoin } from "@/lib/activityLog";
import {
  applicantProfileFromAuthUser,
  createTeamJoinRequest,
  teamJoinRequestDocId,
} from "@/lib/team/teamJoinRequest";

interface JoinTeamButtonProps {
  teamId: string;
}

export function JoinTeamButton({ teamId }: JoinTeamButtonProps) {
  const { user } = useAuth();
  const [requested, setRequested] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (!user?.uid) {
      setRequested(false);
      return;
    }

    const checkRequest = async () => {
      try {
        const ref = doc(db, "teamJoinRequests", teamJoinRequestDocId(teamId, user.uid));
        const snap = await getDoc(ref);
        setRequested(snap.exists() && snap.data()?.status === "pending");
      } catch (error) {
        console.warn("[JoinTeamButton] 요청 상태 확인 실패:", error);
        setRequested(false);
      }
    };

    void checkRequest();
  }, [user?.uid, teamId]);

  const onClick = async () => {
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }

    if (requested) {
      return;
    }

    setRequesting(true);

    try {
      await createTeamJoinRequest(teamId, user.uid, applicantProfileFromAuthUser(user));
      logTeamJoin(teamId);
      setRequested(true);
    } catch (error: unknown) {
      console.error("[JoinTeamButton] 가입 요청 실패:", error);
      const msg = error instanceof Error ? error.message : "가입 요청에 실패했습니다.";
      alert(msg);
    } finally {
      setRequesting(false);
    }
  };

  return (
    <Button
      onClick={() => void onClick()}
      disabled={requested || requesting}
      className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-100 disabled:text-gray-600"
      size="sm"
    >
      {requesting ? "요청 중..." : requested ? "요청됨" : "가입 요청"}
    </Button>
  );
}
