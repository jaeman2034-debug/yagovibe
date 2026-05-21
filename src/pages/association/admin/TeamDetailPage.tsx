/**
 * 팀 상세 페이지 (Admin 전용)
 * /association/:associationId/admin/teams/:teamId
 * 
 * 역할:
 * - 팀 상세 정보 조회 (읽기 전용)
 * - 팀명 변경 (대회 전만)
 * - 팀장 초대 링크 생성/재발급 (대회 전만)
 * 
 * 제한:
 * - 팀원 추가/삭제 불가 (팀장 셀프 관리 영역)
 * - 대회 진행 중 잠금 상태에서는 수정 불가
 */

import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { doc, onSnapshot, updateDoc, serverTimestamp, collection, query, where, orderBy, limit, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useIsAssociationAdmin } from "@/hooks/useIsAssociationAdmin";
import { createTeamCaptainInvite } from "@/utils/createTeamCaptainInvite";
import { buildExternalUrl } from "@/lib/growth/teamInviteShare";

type TeamMember = { name: string; role: "captain" | "player" };

type Team = {
  id: string;
  name: string;
  captainUid?: string | null;
  members?: TeamMember[];
  locked?: boolean;
  lockedByTournamentId?: string;
};

export default function TeamDetailPage() {
  const { associationId, teamId } = useParams<{ associationId: string; teamId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "info";

  const { isAdmin, loading: adminLoading } = useIsAssociationAdmin(associationId);

  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [latestInvite, setLatestInvite] = useState<any>(null);
  const [inviteLoading, setInviteLoading] = useState(true);

  const teamRef = useMemo(
    () => (associationId && teamId ? doc(db, "associations", associationId, "Teams", teamId) : null),
    [associationId, teamId]
  );

  // 권한 체크
  useEffect(() => {
    if (adminLoading) return;
    if (!isAdmin) {
      navigate(`/association/${associationId}/admin/teams`);
    }
  }, [isAdmin, adminLoading, navigate, associationId]);

  // 팀 정보 실시간 구독
  useEffect(() => {
    if (!teamRef) {
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(
      teamRef,
      (snap) => {
        if (!snap.exists()) {
          setTeam(null);
          setLoading(false);
          return;
        }
        setTeam({ id: snap.id, ...snap.data() } as Team);
        setLoading(false);
      },
      (error) => {
        console.error("[팀 상세 조회 오류]", error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [teamRef]);

  // 최근 초대 문서 조회
  useEffect(() => {
    if (!associationId || !teamId) {
      setInviteLoading(false);
      return;
    }

    const fetchLatestInvite = async () => {
      try {
        setInviteLoading(true);
        const invitesRef = collection(db, "associations", associationId, "TeamInvites");
        const q = query(
          invitesRef,
          where("teamId", "==", teamId),
          orderBy("createdAt", "desc"),
          limit(1)
        );
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          const inviteDoc = snap.docs[0];
          setLatestInvite({ id: inviteDoc.id, ...inviteDoc.data() });
        } else {
          setLatestInvite(null);
        }
      } catch (error: any) {
        console.error("[초대 상태 조회 오류]", error);
        // createdBy 인덱스 없을 수 있음 (무시)
        setLatestInvite(null);
      } finally {
        setInviteLoading(false);
      }
    };

    fetchLatestInvite();
  }, [associationId, teamId]);

  // 팀명 변경
  const renameTeam = async () => {
    if (!team || !teamRef) return;

    if (team.locked) {
      alert("대회 진행/확정 상태로 잠금된 팀은 수정할 수 없습니다.");
      return;
    }

    const name = window.prompt("새 팀 이름", team.name);
    if (!name?.trim()) return;

    try {
      await updateDoc(teamRef, {
        name: name.trim(),
        updatedAt: serverTimestamp(),
      });
    } catch (error: any) {
      console.error("[팀명 변경 오류]", error);
      alert(`팀명 변경 실패: ${error.message || "알 수 없는 오류"}`);
    }
  };

  // 팀장 초대 링크 생성/재발급
  const createCaptainInvite = async () => {
    if (!team || !associationId || !teamId) return;

    // 대회 진행 중 잠금 상태에서는 초대 발급 불가
    if (team.locked) {
      alert("대회 진행/확정 상태에서는 초대 링크를 새로 발급할 수 없습니다.");
      return;
    }

    setCreatingInvite(true);
    try {
      // 1️⃣ 기존 미사용 초대 revoked 처리
      if (latestInvite && !latestInvite.used && !latestInvite.revoked) {
        try {
          const oldInviteRef = doc(db, "associations", associationId, "TeamInvites", latestInvite.id);
          await updateDoc(oldInviteRef, { revoked: true });
        } catch (error: any) {
          console.warn("[기존 초대 폐기 오류]", error);
          // 폐기 실패해도 새 초대 생성은 진행
        }
      }

      // 2️⃣ 새 초대 생성
      const inviteId = await createTeamCaptainInvite({
        associationId,
        teamId,
      });

      const url = buildExternalUrl(
        `/invite/team?token=${encodeURIComponent(inviteId)}&associationId=${encodeURIComponent(associationId)}`
      );
      await navigator.clipboard.writeText(url);
      
      // 3️⃣ 초대 상태 새로고침
      const invitesRef = collection(db, "associations", associationId, "TeamInvites");
      const q = query(
        invitesRef,
        where("teamId", "==", teamId),
        orderBy("createdAt", "desc"),
        limit(1)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const inviteDoc = snap.docs[0];
        setLatestInvite({ id: inviteDoc.id, ...inviteDoc.data() });
      }

      alert("팀장 초대 링크가 생성되었습니다. 클립보드에 복사했습니다.\n\n" + url + "\n\n※ 이전 링크는 사용할 수 없습니다.");
    } catch (error: any) {
      console.error("[팀장 초대 링크 생성 오류]", error);
      alert(`초대 링크 생성 실패: ${error.message || "알 수 없는 오류"}`);
    } finally {
      setCreatingInvite(false);
    }
  };

  // 초대 상태 텍스트
  const getInviteStatus = () => {
    if (!latestInvite) return { text: "없음", icon: "📭", color: "text-gray-600" };
    if (latestInvite.used) return { text: "사용됨", icon: "✅", color: "text-green-600" };
    if (latestInvite.revoked) return { text: "폐기됨", icon: "🚫", color: "text-red-600" };
    if (latestInvite.expiresAt) {
      const expiresAt = latestInvite.expiresAt.toDate();
      if (expiresAt < new Date()) {
        return { text: "만료됨", icon: "❌", color: "text-red-600" };
      }
    }
    return { text: "유효", icon: "🟢", color: "text-green-600" };
  };

  // 초대 생성일 포맷
  const formatInviteDate = (invite: any) => {
    if (!invite?.createdAt) return "없음";
    const date = invite.createdAt.toDate ? invite.createdAt.toDate() : new Date(invite.createdAt);
    return date.toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  };

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">불러오는 중...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // navigate로 리다이렉트됨
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 font-semibold mb-2">팀을 찾을 수 없습니다.</div>
          <Link
            to={`/association/${associationId}/admin/teams`}
            className="text-blue-600 hover:underline"
          >
            ← 팀 목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="space-y-4">
          {/* 헤더 */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <Link
                to={`/association/${associationId}/admin/teams`}
                className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block"
              >
                ← 팀 목록
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 mt-2">{team.name}</h1>

              <div className="text-sm text-gray-600 mt-1">
                팀장 UID:{" "}
                <span className="font-mono text-xs">
                  {team.captainUid ? team.captainUid : "없음"}
                </span>
              </div>

              {team.locked && (
                <div className="text-xs text-red-600 mt-1 bg-red-50 border border-red-200 rounded px-2 py-1 inline-block">
                  🔒 이 팀은 대회 진행/확정으로 잠금 상태입니다.
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={renameTeam}
                disabled={team.locked}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                팀명 변경
              </button>
            </div>
          </div>

          {/* 팀장 초대 상태 */}
          <div className="bg-white border rounded-lg p-4">
            <div className="font-semibold text-gray-900 mb-3">팀장 초대 상태</div>
            {inviteLoading ? (
              <div className="text-sm text-gray-400">불러오는 중...</div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    최근 초대: <span className="font-mono text-xs">{formatInviteDate(latestInvite)}</span>
                  </div>
                  {latestInvite && (
                    <div className={`flex items-center gap-1 text-sm font-medium ${getInviteStatus().color}`}>
                      <span>{getInviteStatus().icon}</span>
                      <span>상태: {getInviteStatus().text}</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={createCaptainInvite}
                  disabled={team.locked || creatingInvite}
                  className="w-full px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
                >
                  {creatingInvite ? "생성 중..." : "🔄 새 초대 링크 발급"}
                </button>
                {latestInvite && (
                  <p className="text-xs text-gray-500 mt-2">
                    ※ 새 초대를 발급하면 이전 링크는 사용할 수 없습니다.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 팀원 목록 */}
          <div className="bg-white border rounded-lg p-4">
            <div className="font-semibold text-gray-900 mb-3">팀원 목록 (읽기 전용)</div>
            {(!team.members || team.members.length === 0) ? (
              <div className="text-sm text-gray-400">등록된 팀원이 없습니다.</div>
            ) : (
              <ul className="text-sm space-y-2">
                {team.members.map((m, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="text-gray-700">- {m.name}</span>
                    {m.role === "captain" && (
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">
                        팀장
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <div className="text-xs text-gray-500 mt-4 pt-3 border-t border-gray-200">
              팀원 추가/삭제는 팀장 셀프 관리 화면에서 진행합니다.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

