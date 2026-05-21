/**
 * 🔥 대회 참가 신청 관리 페이지
 * 
 * 경로: /tournament/:tournamentId/applications
 * 
 * 역할:
 * - 협회 관리자만 접근 가능
 * - 참가 신청 목록 표시
 * - 승인/거절 처리
 */

import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthProvider";
import {
  getTournamentApplications,
  approveTournamentApplication,
  rejectTournamentApplication,
  type TournamentApplication,
} from "@/lib/tournament/tournamentApplication";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Timestamp } from "firebase/firestore";

export default function TournamentApplicationsPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<TournamentApplication[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);
  const [tournament, setTournament] = useState<any>(null);

  useEffect(() => {
    if (!tournamentId) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        // 대회 정보 조회
        const tournamentRef = doc(db, "tournaments", tournamentId);
        const tournamentSnap = await getDoc(tournamentRef);
        if (tournamentSnap.exists()) {
          setTournament(tournamentSnap.data());
        }

        // 참가 신청 목록 조회
        const apps = await getTournamentApplications(tournamentId, "APPLIED");
        setApplications(apps);
      } catch (e) {
        console.error("데이터 로드 실패:", e);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [tournamentId]);

  const handleApprove = async (app: TournamentApplication) => {
    if (!tournamentId || !user?.uid || processing) return;

    if (!confirm("이 참가 신청을 승인하시겠습니까?")) return;

    setProcessing(app.id);
    try {
      await approveTournamentApplication({
        applicationId: app.id,
        tournamentId,
        teamId: app.teamId,
        actorUid: user.uid,
      });
      
      alert("참가 신청이 승인되었습니다.");
      // 목록에서 제거
      setApplications(prev => prev.filter(a => a.id !== app.id));
    } catch (e: any) {
      console.error("승인 실패:", e);
      alert(e.message || "승인에 실패했습니다.");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (app: TournamentApplication) => {
    if (!user?.uid || processing) return;

    if (!confirm("이 참가 신청을 거절하시겠습니까?")) return;

    setProcessing(app.id);
    try {
      await rejectTournamentApplication({
        applicationId: app.id,
        actorUid: user.uid,
      });
      
      alert("참가 신청이 거절되었습니다.");
      // 목록에서 제거
      setApplications(prev => prev.filter(a => a.id !== app.id));
    } catch (e: any) {
      console.error("거절 실패:", e);
      alert(e.message || "거절에 실패했습니다.");
    } finally {
      setProcessing(null);
    }
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">
          대회 참가 신청 관리
          {tournament && ` - ${tournament.name}`}
        </h1>

        {applications.length === 0 ? (
          <div className="bg-white rounded-lg border p-8 text-center">
            <p className="text-gray-500">대기 중인 참가 신청이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {applications.map(app => (
              <div
                key={app.id}
                className="bg-white rounded-lg border p-4 flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="font-medium">팀 ID: {app.teamId}</div>
                  <div className="text-sm text-gray-500">
                    신청일: {
                      app.createdAt instanceof Timestamp
                        ? app.createdAt.toDate().toLocaleString("ko-KR")
                        : app.createdAt
                        ? new Date(app.createdAt).toLocaleString("ko-KR")
                        : ""
                    }
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(app)}
                    disabled={processing === app.id || !!processing}
                    className="px-3 py-1 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    승인
                  </button>
                  <button
                    onClick={() => handleReject(app)}
                    disabled={processing === app.id || !!processing}
                    className="px-3 py-1 text-sm rounded bg-gray-300 hover:bg-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    거절
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
