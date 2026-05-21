/**
 * Tournament 리스트 페이지 (Public + Admin 행정 모드)
 * /association/:associationId/tournaments
 * 
 * 원칙 (공지 패턴 기반):
 * - Public: published 상태만 노출
 * - Admin 행정 모드: 모든 상태 노출 (draft, published)
 * - 공지 패턴 그대로 복제
 */

import { useParams, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import type { Tournament } from "@/types/tournament";
import { useTournaments } from "@/hooks/useTournaments";
import { TournamentCard } from "@/components/association/tournament/TournamentCard";
import { TournamentEmptyState } from "@/components/association/tournament/TournamentEmptyState";
import { SectionLayout } from "@/components/association/SectionLayout";
import { useIsAssociationAdmin } from "@/hooks/useIsAssociationAdmin";
import { AdminModeToggle } from "@/components/association/AdminModeToggle";
import { TournamentEditDrawer } from "@/components/association/tournament/TournamentEditDrawer";
import { useNavigate } from "react-router-dom";
import { Settings } from "lucide-react";

// Toast 컴포넌트
function Toast({ message, type, onClose }: { message: string; type?: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === "error" ? "bg-red-600" : "bg-gray-900";

  return (
    <div className={`fixed bottom-6 right-6 z-[100] animate-fadeIn rounded-lg ${bgColor} px-5 py-3 text-white shadow-lg`}>
      {message}
    </div>
  );
}

export default function TournamentListPage() {
  const { associationId } = useParams<{ associationId: string }>();
  const { isAdmin, loading: adminLoading } = useIsAssociationAdmin(associationId);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdminMode, setIsAdminMode] = useState(true);
  
  // 디버깅: 컴포넌트 마운트 및 경로 확인
  useEffect(() => {
    console.log("[TournamentListPage] 마운트됨:", { associationId, pathname: window.location.pathname });
  }, [associationId]);
  
  // useTournaments 훅 사용 (공지 패턴과 동일)
  // 🔥 무한 로딩 방지: adminLoading 중에는 includeDraft를 false로 고정
  const { items: tournaments, loading, error, refetch } = useTournaments(associationId, {
    includeDraft: !adminLoading && isAdmin && isAdminMode,
  });

  // 🔥 인덱스 에러 확인 (모든 분기에서 사용 가능하도록 상단에 선언)
  const indexError = error && (error as any)?.code === "failed-precondition";
  const indexUrl = indexError && (
    (error as any)?.indexUrl || 
    (error as any)?.message?.match(/https:\/\/console\.firebase\.google\.com\/[^\s]+/)?.[0]
  );

  const [searchParams, setSearchParams] = useSearchParams();
  const editTournamentId = searchParams.get("edit");
  const fromNoticeId = searchParams.get("fromNotice");
  
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingTournamentId, setEditingTournamentId] = useState<string | undefined>(editTournamentId || undefined);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<string>("success");

  // Toast 이벤트 리스너
  useEffect(() => {
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent<{ message: string; type: string }>;
      setToastMessage(customEvent.detail.message);
      setToastType(customEvent.detail.type || "success");
    };

    window.addEventListener("showToast", handleToast);
    return () => window.removeEventListener("showToast", handleToast);
  }, []);

  // URL 파라미터에서 edit 값이 있으면 Drawer 열기
  useEffect(() => {
    if (editTournamentId && !drawerOpen) {
      setEditingTournamentId(editTournamentId);
      setDrawerOpen(true);
    }
  }, [editTournamentId, drawerOpen]);

  // URL 파라미터에서 fromNotice 값이 있으면 Drawer 열기 (새 대회 생성)
  useEffect(() => {
    if (fromNoticeId && !drawerOpen && !editTournamentId) {
      setEditingTournamentId(undefined); // 새 대회 생성
      setDrawerOpen(true);
    }
  }, [fromNoticeId, drawerOpen, editTournamentId]);

  // 🔥 무한 로딩 방지: adminLoading 중에는 로딩만 표시
  if (adminLoading) {
    return (
      <SectionLayout title="대회 일정" associationId={associationId}>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto mb-2"></div>
            <p className="text-gray-500">관리자 권한 확인 중...</p>
          </div>
        </div>
      </SectionLayout>
    );
  }

  // 🔥 무한 로딩 방지: 로딩 상태 표시 (타임아웃 없이 계속 표시)
  if (loading) {
    return (
      <SectionLayout title="대회 일정" associationId={associationId}>
        {isAdmin && (
          <div className="mb-4">
            <AdminModeToggle
              isAdminMode={isAdminMode}
              onToggle={setIsAdminMode}
            />
          </div>
        )}
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto mb-2"></div>
            <p className="text-gray-500">대회 목록을 불러오는 중...</p>
            {error && (
              <p className="text-sm text-red-600 mt-2">
                오류 발생: {(error as any)?.message || "알 수 없는 오류"}
              </p>
            )}
          </div>
        </div>
      </SectionLayout>
    );
  }

  // 🔥 인덱스 에러 안내
  if (indexError) {
    return (
      <SectionLayout title="대회 일정" associationId={associationId}>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">
            ⚠️ Firestore 인덱스가 필요합니다
          </h3>
          <p className="text-sm text-yellow-700 mb-4">
            대회 목록을 불러오려면 Firestore 인덱스가 필요합니다. 아래 링크를 클릭하여 인덱스를 생성해주세요.
          </p>
          {indexUrl ? (
            <a
              href={indexUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 font-medium"
            >
              🔗 인덱스 생성하기
            </a>
          ) : (
            <p className="text-sm text-yellow-600">
              Firebase Console에서 인덱스를 생성해주세요.
            </p>
          )}
          <p className="text-xs text-yellow-600 mt-3">
            💡 인덱스 생성 후 1~3분 정도 소요되며, 완료되면 페이지를 새로고침해주세요.
          </p>
        </div>
      </SectionLayout>
    );
  }

  const pinnedTournaments = tournaments.filter((t) => t.isPinned) as Tournament[];
  const regularTournaments = tournaments.filter((t) => !t.isPinned) as Tournament[];

  const handleOpenDrawer = (tournamentId?: string) => {
    setEditingTournamentId(tournamentId);
    setDrawerOpen(true);
    if (tournamentId) {
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set("edit", tournamentId);
      setSearchParams(newSearchParams, { replace: true });
    }
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setEditingTournamentId(undefined);
    const newSearchParams = new URLSearchParams(searchParams);
    if (searchParams.get("edit")) {
      newSearchParams.delete("edit");
    }
    if (searchParams.get("fromNotice")) {
      newSearchParams.delete("fromNotice");
    }
    if (newSearchParams.toString() !== searchParams.toString()) {
      setSearchParams(newSearchParams, { replace: true });
    }
  };

  const handleDrawerSuccess = () => {
    refetch();
  };

  const handleTogglePin = async (tournamentId: string, isPinned: boolean) => {
    if (!user?.uid) return;

    try {
      const tournamentRef = doc(db, `associations/${associationId}/tournaments/${tournamentId}`);
      await updateDoc(tournamentRef, {
        isPinned: !isPinned,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });
      
      const toastEvent = new CustomEvent("showToast", {
        detail: { message: `대회가 ${!isPinned ? "고정" : "고정 해제"}되었습니다.`, type: "success" },
      });
      window.dispatchEvent(toastEvent);
      
      refetch();
    } catch (error) {
      console.error("대회 고정 토글 오류:", error);
      const toastEvent = new CustomEvent("showToast", {
        detail: { message: "고정 토글 중 오류가 발생했습니다.", type: "error" },
      });
      window.dispatchEvent(toastEvent);
    }
  };

  // 행정 모드: 관리자 화면
  if (isAdminMode && isAdmin) {
    return (
      <>
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">대회 관리</h1>
                <p className="text-sm text-gray-600 mt-1">
                  대회 일정 및 진행 상태를 관리합니다.
                </p>
              </div>
              <button
                onClick={() => handleOpenDrawer()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
              >
                새 대회 등록
              </button>
            </div>

            <AdminModeToggle
              isAdminMode={isAdminMode}
              onToggle={setIsAdminMode}
            />

            {/* 대회 목록 테이블 */}
            {tournaments.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-500">등록된 대회가 없습니다.</p>
                <button
                  onClick={() => handleOpenDrawer()}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  첫 대회 등록하기
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        제목
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        일정
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        상태
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        작업
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {tournaments.map((tournament) => (
                      <tr key={tournament.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {tournament.isPinned && <span className="text-yellow-500 mr-2">📌</span>}
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {tournament.title}
                              </div>
                              <div className="text-xs text-gray-500">
                                {tournament.adminStatus || tournament.status}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {tournament.dateStart?.toDate?.().toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded ${
                            tournament.adminStatus === "published" ? "bg-green-100 text-green-800" :
                            tournament.adminStatus === "draft" ? "bg-gray-100 text-gray-800" :
                            "bg-yellow-100 text-yellow-800"
                          }`}>
                            {tournament.adminStatus || tournament.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            {/* 🔥 대회 관리 버튼 (운영 진입) */}
                            <button
                              onClick={() => navigate(`/association/${associationId}/admin/tournaments/${tournament.id}/ops`)}
                              className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-xs font-medium flex items-center gap-1"
                            >
                              <Settings className="w-3 h-3" />
                              대회 관리
                            </button>
                            <button
                              onClick={() => handleOpenDrawer(tournament.id)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              수정
                            </button>
                            <button
                              onClick={() => handleTogglePin(tournament.id, tournament.isPinned || false)}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              {tournament.isPinned ? "고정 해제" : "고정"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <TournamentEditDrawer
          isOpen={drawerOpen}
          associationId={associationId!}
          tournamentId={editingTournamentId}
          fromNoticeId={fromNoticeId || undefined}
          onClose={handleCloseDrawer}
          onSuccess={handleDrawerSuccess}
        />

        {toastMessage && (
          <Toast
            message={toastMessage}
            type={toastType}
            onClose={() => setToastMessage(null)}
          />
        )}
      </>
    );
  }

  // 공개 모드: 일반 사용자 화면
  const upcomingTournaments = tournaments.filter((t) => t.status !== "ended");
  const ongoingTournaments = tournaments.filter((t) => t.status === "ongoing");
  const endedTournaments = tournaments.filter((t) => t.status === "ended");

  return (
    <>
      <SectionLayout
        title="대회 일정"
        associationId={associationId}
        description="대회 일정 및 진행 상태는 본 페이지 기준으로 안내됩니다."
      >
        {/* 🔥 인덱스 에러 안내 */}
        {indexError && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <span className="text-2xl">⚠️</span>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-yellow-800">
                  대회 목록을 불러오려면 인덱스가 필요합니다
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>Firestore 인덱스를 생성해야 대회 목록을 볼 수 있습니다.</p>
                  {indexUrl && (
                    <a
                      href={indexUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
                    >
                      🔗 인덱스 생성하기
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {tournaments.length === 0 && !loading && !indexError ? (
          <TournamentEmptyState />
        ) : (
          <div className="space-y-6">
            {upcomingTournaments.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-700">
                  진행 예정 / 진행중
                </h2>
                {upcomingTournaments.map((tournament) => (
                  <TournamentCard
                    key={tournament.id}
                    tournament={tournament}
                    associationId={associationId!}
                  />
                ))}
              </div>
            )}

            {endedTournaments.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-700">종료된 대회</h2>
                {endedTournaments.map((tournament) => (
                  <TournamentCard
                    key={tournament.id}
                    tournament={tournament}
                    associationId={associationId!}
                  />
                ))}
              </div>
            )}

            {/* 🔥 대회가 있지만 필터링 결과가 없는 경우 */}
            {tournaments.length > 0 && upcomingTournaments.length === 0 && endedTournaments.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>표시할 대회가 없습니다.</p>
              </div>
            )}
          </div>
        )}
      </SectionLayout>

      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage(null)}
        />
      )}
    </>
  );
}

