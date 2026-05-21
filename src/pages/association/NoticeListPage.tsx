/**
 * 공지 리스트 페이지 (Public + Admin 행정 모드)
 * /association/:associationId/notices
 * 
 * 원칙:
 * - Public: published 상태만 노출
 * - Admin 행정 모드: 모든 상태 노출 (draft, scheduled, published)
 * - scheduled는 서버 시간 기준 자동 전환
 * - 단톡/문자/전화 → 이걸로 종료
 */

import { useParams, Link, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import type { Notice } from "@/types/notice";
import { useNotices } from "@/hooks/useNotices";
import { NoticeCard } from "@/components/association/notice/NoticeCard";
import { NoticeEmptyState } from "@/components/association/NoticeEmptyState";
import { SectionLayout } from "@/components/association/SectionLayout";
import { useIsAssociationAdmin } from "@/hooks/useIsAssociationAdmin";
import { AdminModeToggle } from "@/components/association/AdminModeToggle";
import { NoticeAdminHeader } from "@/components/association/notice/NoticeAdminHeader";
import { NoticeAdminActionBar } from "@/components/association/notice/NoticeAdminActionBar";
import { NoticeAdminTable } from "@/components/association/notice/NoticeAdminTable";
import { NoticeEditDrawer } from "@/components/association/notice/NoticeEditDrawer";
import { NoticeDeleteModal } from "@/components/association/notice/NoticeDeleteModal";

// Toast 컴포넌트 (간단한 버전)
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

export default function NoticeListPage() {
  // 🔥 React 훅 규칙: 모든 훅은 컴포넌트 최상단, 조건 없이, 같은 순서로 호출
  const { associationId } = useParams<{ associationId: string }>();
  const { isAdmin, loading: adminLoading } = useIsAssociationAdmin(associationId);
  const { user } = useAuth();
  const [isAdminMode, setIsAdminMode] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  
  // 🔥 필터/정렬 상태 (조건부 렌더링 전에 선언)
  type NoticeFilter = "all" | "operational" | "system";
  type NoticeSort = "latest" | "important" | "oldest" | "eventType";
  const [noticeFilter, setNoticeFilter] = useState<NoticeFilter>("all");
  const [noticeSort, setNoticeSort] = useState<NoticeSort>("latest");
  const [tournamentFilter, setTournamentFilter] = useState<string>("all");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  
  // 🔥 모든 useState 훅을 최상단에 선언
  const editNoticeId = searchParams.get("edit");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingNoticeId, setEditingNoticeId] = useState<string | undefined>(editNoticeId || undefined);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingNoticeId, setDeletingNoticeId] = useState<string | null>(null);
  const [deletingNoticeTitle, setDeletingNoticeTitle] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<string>("success");
  
  // 🔥 useNotices 훅도 최상단에서 호출 (조건 없이)
  const { items: notices, loading, refetch } = useNotices(associationId, {
    includeDraft: isAdmin && isAdminMode,
  });

  // 🔥 모든 useEffect 훅도 최상단에 선언
  useEffect(() => {
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent<{ message: string; type: string }>;
      setToastMessage(customEvent.detail.message);
      setToastType(customEvent.detail.type || "success");
    };

    window.addEventListener("showToast", handleToast);
    return () => window.removeEventListener("showToast", handleToast);
  }, []);

  useEffect(() => {
    if (editNoticeId && !drawerOpen) {
      setEditingNoticeId(editNoticeId);
      setDrawerOpen(true);
    }
  }, [editNoticeId, drawerOpen]);

  // 🔥 이제 조건부 렌더링 시작 (모든 훅 호출 완료 후)
  if (adminLoading) {
    return (
      <SectionLayout title="공지사항" associationId={associationId}>
        <div className="flex items-center justify-center py-8">
          <p className="text-gray-500">관리자 권한 확인 중...</p>
        </div>
      </SectionLayout>
    );
  }

  if (loading) {
    return (
      <SectionLayout title="공지사항" associationId={associationId}>
        {isAdmin && (
          <div className="mb-4">
            <AdminModeToggle
              isAdminMode={isAdminMode}
              onToggle={setIsAdminMode}
            />
          </div>
        )}
        <div className="flex items-center justify-center py-8">
          <p className="text-gray-500">공지사항을 불러오는 중...</p>
        </div>
      </SectionLayout>
    );
  }
  
  // 필터링된 공지 목록
  const filteredNotices = notices.filter((notice) => {
    // 기본 필터 (전체/운영/시스템)
    if (noticeFilter === "operational") {
      if (notice.isSystemGenerated) return false;
    }
    if (noticeFilter === "system") {
      if (!notice.isSystemGenerated) return false;
    }
    
    // 관리자 전용: 대회별 필터
    if (isAdmin && isAdminMode && tournamentFilter !== "all") {
      if (notice.relatedTournamentId !== tournamentFilter) return false;
    }
    
    // 관리자 전용: 이벤트 타입 필터
    if (isAdmin && isAdminMode && eventTypeFilter !== "all") {
      if (notice.systemEventType !== eventTypeFilter) return false;
    }
    
    return true;
  });
  
  // 관리자 전용: 대회 목록 추출 (시스템 공지에서)
  const tournamentIds = Array.from(
    new Set(
      notices
        .filter((n) => n.isSystemGenerated && n.relatedTournamentId)
        .map((n) => n.relatedTournamentId!)
    )
  );
  
  // 관리자 전용: 이벤트 타입 목록 추출
  const eventTypes = Array.from(
    new Set(
      notices
        .filter((n) => n.isSystemGenerated && n.systemEventType)
        .map((n) => n.systemEventType!)
    )
  );
  
  // 정렬된 공지 목록
  const sortedNotices = [...filteredNotices].sort((a, b) => {
    // 고정 공지는 항상 맨 위
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    
    if (noticeSort === "latest") {
      const aTime = a.publishAt?.toMillis() || a.createdAt?.toMillis() || 0;
      const bTime = b.publishAt?.toMillis() || b.createdAt?.toMillis() || 0;
      return bTime - aTime;
    }
    if (noticeSort === "oldest") {
      const aTime = a.publishAt?.toMillis() || a.createdAt?.toMillis() || 0;
      const bTime = b.publishAt?.toMillis() || b.createdAt?.toMillis() || 0;
      return aTime - bTime;
    }
    if (noticeSort === "important") {
      // 중요도: 필독 > 일반 > 시스템
      const aImportance = (a.level === "important" || a.label === "필독") ? 3 : (a.isSystemGenerated ? 1 : 2);
      const bImportance = (b.level === "important" || b.label === "필독") ? 3 : (b.isSystemGenerated ? 1 : 2);
      if (aImportance !== bImportance) {
        return bImportance - aImportance;
      }
      // 중요도 같으면 최신순
      const aTime = a.publishAt?.toMillis() || a.createdAt?.toMillis() || 0;
      const bTime = b.publishAt?.toMillis() || b.createdAt?.toMillis() || 0;
      return bTime - aTime;
    }
    if (noticeSort === "eventType") {
      // 이벤트 타입순: 시스템 공지만 타입별로 정렬
      if (a.isSystemGenerated && b.isSystemGenerated) {
        const aType = a.systemEventType || "";
        const bType = b.systemEventType || "";
        if (aType !== bType) {
          return aType.localeCompare(bType);
        }
      }
      // 타입 같으면 최신순
      const aTime = a.publishAt?.toMillis() || a.createdAt?.toMillis() || 0;
      const bTime = b.publishAt?.toMillis() || b.createdAt?.toMillis() || 0;
      return bTime - aTime;
    }
    return 0;
  });
  
  const pinnedNotices = sortedNotices.filter((n) => n.isPinned) as Notice[];
  const regularNotices = sortedNotices.filter((n) => !n.isPinned) as Notice[];

  const handleOpenDrawer = (noticeId?: string) => {
    console.log("[NoticeListPage] openDrawer", { noticeId });
    setEditingNoticeId(noticeId);
    setDrawerOpen(true);
    // URL에 edit 파라미터 추가
    if (noticeId) {
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set("edit", noticeId);
      setSearchParams(newSearchParams, { replace: true });
    }
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setEditingNoticeId(undefined);
    // URL에서 edit 파라미터 제거
    if (searchParams.get("edit")) {
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete("edit");
      setSearchParams(newSearchParams, { replace: true });
    }
  };

  const handleDrawerSuccess = () => {
    refetch();
  };

  const handleDelete = (noticeId: string) => {
    const notice = notices.find((n) => n.id === noticeId);
    if (notice) {
      setDeletingNoticeId(noticeId);
      setDeletingNoticeTitle(notice.title);
      setDeleteModalOpen(true);
    }
  };

  const handleDeleteSuccess = () => {
    refetch();
    setDeleteModalOpen(false);
    setDeletingNoticeId(null);
    setDeletingNoticeTitle("");
  };

  // 고정 토글 함수
  const handleTogglePin = async (noticeId: string, isPinned: boolean) => {
    if (!user?.uid) return;

    try {
      const noticeRef = doc(db, `associations/${associationId}/notices/${noticeId}`);
      await updateDoc(noticeRef, {
        isPinned: !isPinned,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });
      
      const toastEvent = new CustomEvent("showToast", {
        detail: { message: `공지가 ${!isPinned ? "고정" : "고정 해제"}되었습니다.`, type: "success" },
      });
      window.dispatchEvent(toastEvent);
      
      refetch();
    } catch (error) {
      console.error("공지 고정 토글 오류:", error);
      const toastEvent = new CustomEvent("showToast", {
        detail: { message: "고정 토글 중 오류가 발생했습니다.", type: "error" },
      });
      window.dispatchEvent(toastEvent);
    }
  };

  // 행정 모드: 행정 관리 화면 레이아웃
  // 🔥 디버그: 조건 확인
  console.log("[NoticeListPage] 행정 모드 조건 체크:", { isAdminMode, isAdmin, willRender: isAdminMode && isAdmin });
  if (isAdminMode && isAdmin) {
    return (
      <>
        <div className="min-h-screen bg-gray-50">
          <div className="container mx-auto px-4 py-6 max-w-7xl">
            {/* 뒤로 가기 */}
            {associationId && (
              <Link
                to={`/association/${associationId}`}
                className="text-blue-600 hover:text-blue-800 mb-4 text-sm inline-block"
              >
                ← 협회 페이지로 돌아가기
              </Link>
            )}

            {/* 행정 모드 헤더 */}
            <div className="mb-4">
              <NoticeAdminHeader title="공지 관리" />
            </div>

        {/* 행정 모드 토글 */}
        <div className="mb-4">
          <AdminModeToggle
            isAdminMode={isAdminMode}
            onToggle={setIsAdminMode}
          />
        </div>

        {/* 필터/정렬 컨트롤 */}
        <div className="mb-4 flex flex-wrap items-center gap-4 bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">필터:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setNoticeFilter("all")}
                className={`px-3 py-1.5 text-sm rounded border ${
                  noticeFilter === "all"
                    ? "bg-blue-50 border-blue-300 text-blue-700 font-medium"
                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                전체
              </button>
              <button
                onClick={() => setNoticeFilter("operational")}
                className={`px-3 py-1.5 text-sm rounded border flex items-center gap-1 ${
                  noticeFilter === "operational"
                    ? "bg-blue-50 border-blue-300 text-blue-700 font-medium"
                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span>🟦</span>
                <span>운영</span>
              </button>
              <button
                onClick={() => setNoticeFilter("system")}
                className={`px-3 py-1.5 text-sm rounded border flex items-center gap-1 ${
                  noticeFilter === "system"
                    ? "bg-blue-50 border-blue-300 text-blue-700 font-medium"
                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span>⚙️</span>
                <span>시스템</span>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">정렬:</span>
            <select
              value={noticeSort}
              onChange={(e) => setNoticeSort(e.target.value as NoticeSort)}
              className="px-3 py-1.5 text-sm rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="latest">최신순</option>
              <option value="important">중요도순</option>
              <option value="oldest">과거순</option>
            </select>
          </div>
          <div className="ml-auto text-sm text-gray-500">
            총 {filteredNotices.length}건
          </div>
        </div>

        {/* 공지 관리 액션바 - 라우팅 컨테이너 밖 */}
        <NoticeAdminActionBar 
          associationId={associationId!}
          onNewNotice={handleOpenDrawer}
        />

            {/* 공지 테이블 뷰 */}
            {filteredNotices.length === 0 ? (
              <NoticeEmptyState 
                associationId={associationId} 
                isAdminMode={isAdminMode}
                onNewNotice={handleOpenDrawer}
              />
            ) : (
              <NoticeAdminTable 
                notices={sortedNotices as Notice[]} 
                associationId={associationId!}
                onEdit={(noticeId) => handleOpenDrawer(noticeId)}
                onDelete={handleDelete}
                onPin={handleTogglePin}
              />
            )}
          </div>
        </div>

        {/* 공지 등록/수정 Drawer */}
        {associationId && (
          <NoticeEditDrawer
            isOpen={drawerOpen}
            onClose={handleCloseDrawer}
            onSuccess={handleDrawerSuccess}
            associationId={associationId}
            noticeId={editingNoticeId}
          />
        )}

        {/* 공지 삭제(보관) 모달 */}
        {associationId && deletingNoticeId && (
          <NoticeDeleteModal
            isOpen={deleteModalOpen}
            onClose={() => {
              setDeleteModalOpen(false);
              setDeletingNoticeId(null);
              setDeletingNoticeTitle("");
            }}
            onSuccess={handleDeleteSuccess}
            associationId={associationId}
            noticeId={deletingNoticeId}
            noticeTitle={deletingNoticeTitle}
          />
        )}

        {/* Toast 알림 */}
        {toastMessage && (
          <Toast
            message={toastMessage}
            type={toastType}
            onClose={() => {
              setToastMessage(null);
              setToastType("success");
            }}
          />
        )}
      </>
    );
  }

  // 일반 모드: 공개 열람 화면 레이아웃
  return (
    <>
      <SectionLayout title="공지사항" associationId={associationId}>
        {/* 행정 모드 토글 (관리자만 표시) */}
        {isAdmin && (
          <div className="mb-4">
            <AdminModeToggle
              isAdminMode={isAdminMode}
              onToggle={setIsAdminMode}
            />
          </div>
        )}

        {/* 필터/정렬 컨트롤 */}
        {notices.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-4 bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">필터:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setNoticeFilter("all")}
                  className={`px-3 py-1.5 text-sm rounded border ${
                    noticeFilter === "all"
                      ? "bg-blue-50 border-blue-300 text-blue-700 font-medium"
                      : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  전체
                </button>
                <button
                  onClick={() => setNoticeFilter("operational")}
                  className={`px-3 py-1.5 text-sm rounded border flex items-center gap-1 ${
                    noticeFilter === "operational"
                      ? "bg-blue-50 border-blue-300 text-blue-700 font-medium"
                      : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span>🟦</span>
                  <span>운영</span>
                </button>
                <button
                  onClick={() => setNoticeFilter("system")}
                  className={`px-3 py-1.5 text-sm rounded border flex items-center gap-1 ${
                    noticeFilter === "system"
                      ? "bg-blue-50 border-blue-300 text-blue-700 font-medium"
                      : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span>⚙️</span>
                  <span>시스템</span>
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">정렬:</span>
              <select
                value={noticeSort}
                onChange={(e) => setNoticeSort(e.target.value as NoticeSort)}
                className="px-3 py-1.5 text-sm rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="latest">최신순</option>
                <option value="important">중요도순</option>
                <option value="oldest">과거순</option>
                {isAdmin && isAdminMode && <option value="eventType">이벤트 타입순</option>}
              </select>
            </div>
            {/* 관리자 전용: 대회별 필터 */}
            {isAdmin && isAdminMode && tournamentIds.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">대회:</span>
                <select
                  value={tournamentFilter}
                  onChange={(e) => setTournamentFilter(e.target.value)}
                  className="px-3 py-1.5 text-sm rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">전체 대회</option>
                  {tournamentIds.map((tid) => (
                    <option key={tid} value={tid}>
                      대회 {tid.substring(0, 8)}...
                    </option>
                  ))}
                </select>
              </div>
            )}
            {/* 관리자 전용: 이벤트 타입 필터 */}
            {isAdmin && isAdminMode && eventTypes.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">이벤트:</span>
                <select
                  value={eventTypeFilter}
                  onChange={(e) => setEventTypeFilter(e.target.value)}
                  className="px-3 py-1.5 text-sm rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">전체 이벤트</option>
                  {eventTypes.map((et) => (
                    <option key={et} value={et}>
                      {et === "TOURNAMENT_CREATED" ? "대회 생성" :
                       et === "REGISTRATION_STARTED" ? "신청 시작" :
                       et === "REGISTRATION_ENDED" ? "신청 마감" :
                       et === "DRAW_EXECUTED" ? "조 추첨" :
                       et === "TOURNAMENT_ENDED" ? "대회 종료" : et}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="ml-auto text-sm text-gray-500">
              총 {filteredNotices.length}건
            </div>
          </div>
        )}

        {/* 공지 리스트 (카드 뷰) */}
        {filteredNotices.length === 0 ? (
          <NoticeEmptyState 
            associationId={associationId} 
            isAdminMode={isAdminMode}
            onNewNotice={isAdmin ? handleOpenDrawer : undefined}
          />
        ) : (
          <div className="space-y-4">
            {/* 상단 고정 공지 */}
            {pinnedNotices.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-gray-700 mb-2">⭐ 상단 고정</h2>
                {pinnedNotices.map((notice) => (
                  <NoticeCard
                    key={notice.id}
                    notice={notice}
                    associationId={associationId!}
                    isAdminMode={false}
                  />
                ))}
              </div>
            )}

            {/* 일반 공지 */}
            {regularNotices.length > 0 && (
              <div className="space-y-3">
                {pinnedNotices.length > 0 && (
                  <h2 className="text-lg font-semibold text-gray-700 mb-2">일반 공지</h2>
                )}
                {regularNotices.map((notice) => (
                  <NoticeCard
                    key={notice.id}
                    notice={notice}
                    associationId={associationId!}
                    isAdminMode={false}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </SectionLayout>

      {/* 공지 등록/수정 Drawer */}
      {associationId && (
        <NoticeEditDrawer
          isOpen={drawerOpen}
          onClose={handleCloseDrawer}
          onSuccess={handleDrawerSuccess}
          associationId={associationId}
          noticeId={editingNoticeId}
        />
      )}

      {/* Toast 알림 */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => {
            setToastMessage(null);
            setToastType("success");
          }}
        />
      )}
    </>
  );
}

