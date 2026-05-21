/**
 * AssociationOfficialPage
 * 협회 공식 페이지 (Phase 3 MVP)
 * 
 * 6개 섹션만 포함:
 * - HeroSection
 * - NoticeSection
 * - TournamentSection
 * - FacilitySection
 * - StorySection
 * - ClubSummarySection
 */

import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { doc, onSnapshot, serverTimestamp, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { FacilitySection } from "@/components/association/FacilitySection";
import { StorySection } from "@/components/association/StorySection";
import HeroSection from "@/components/association/HeroSection";
import { NoticeSection } from "@/components/association/NoticeSection";
import { useHighlightedTournament } from "@/hooks/useHighlightedTournament";
import { OfficialSystemBadge } from "@/components/common/OfficialSystemBadge";
import { FirstVisitGuideBanner } from "@/components/common/FirstVisitGuideBanner";
import TournamentSection from "@/components/tournament/TournamentSection";
import { softDeleteAssociation, type AssociationDoc } from "@/services/associationService";
import { useAuth } from "@/context/AuthProvider";
import { getUserRole, isAdmin, isOwner } from "@/utils/permissions";
import { canEditAssociation } from "@/utils/permission";
import { createJoinRequest, getMyJoinRequestStatus, type JoinRequestStatus } from "@/services/associationJoinRequestService";
import AssociationFeedSection from "@/components/association/AssociationFeedSection";
import { db, storage } from "@/lib/firebase";



function ClubSummarySection({ associationId }: { associationId: string }) {
  return (
    <section id="clubs" className="py-12 border-b">
      <div className="container mx-auto px-4 max-w-7xl">
        <h2 className="text-2xl font-bold mb-4">Club Summary Section</h2>
        <p className="text-gray-600">Association ID: {associationId}</p>
      </div>
    </section>
  );
}

/**
 * 협회 공식 페이지
 * 
 * @example
 * /association/assoc-nowon-football
 * /association/assoc-nowon-football?mode=admin
 */
export default function AssociationOfficialPage() {
  const navigate = useNavigate();
  const { associationId } = useParams<{ associationId: string }>();
  const [searchParams] = useSearchParams();
  const isEditMode = searchParams.get("mode") === "admin";
  const { highlightedTournament } = useHighlightedTournament(associationId);
  const { user } = useAuth();
  const [association, setAssociation] = useState<AssociationDoc | null>(null);
  const [loadingAssociation, setLoadingAssociation] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [requestStatus, setRequestStatus] = useState<JoinRequestStatus | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [isEditingIntro, setIsEditingIntro] = useState(false);
  const [introDraft, setIntroDraft] = useState("");
  const [savingIntro, setSavingIntro] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!associationId) {
      setLoadingAssociation(false);
      return;
    }
    const unsub = onSnapshot(
      doc(db, "associations", associationId),
      (snap) => {
        if (!snap.exists()) {
          setAssociation(null);
          setLoadingAssociation(false);
          return;
        }
        const data = { id: snap.id, ...(snap.data() as Omit<AssociationDoc, "id">) } as AssociationDoc;
        setAssociation(data);
        setIntroDraft(data.introMessage || "");
        setLoadingAssociation(false);
      },
      (error) => {
        console.error("[AssociationOfficialPage] 협회 조회 실패:", error);
        setLoadingAssociation(false);
      }
    );
    return () => unsub();
  }, [associationId]);

  useEffect(() => {
    const run = async () => {
      if (!associationId || !user?.uid) return;
      try {
        const status = await getMyJoinRequestStatus(associationId, user.uid);
        setRequestStatus(status);
      } catch (error) {
        console.error("[AssociationOfficialPage] 가입 요청 상태 조회 실패:", error);
      }
    };
    void run();
  }, [associationId, user?.uid]);

  if (!associationId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">협회 ID가 필요합니다.</p>
        </div>
      </div>
    );
  }

  if (loadingAssociation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">협회 정보를 불러오는 중...</p>
      </div>
    );
  }

  if (!association || association.deleted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">삭제되었거나 존재하지 않는 협회입니다.</p>
      </div>
    );
  }

  const role = getUserRole(association, user?.uid);
  const canEdit = canEditAssociation(user?.uid, association);
  const canDelete = isOwner(association, user?.uid);
  const isMember = canEdit || canDelete || !!association.members?.some((m) => m.uid === user?.uid);

  const handleDelete = async () => {
    if (!associationId || deleting) return;
    const ok = window.confirm("정말 이 협회를 삭제하시겠습니까?\n삭제 후 복구할 수 없습니다.");
    if (!ok) return;
    try {
      setDeleting(true);
      await softDeleteAssociation(associationId);
      navigate("/sports", { replace: true });
    } catch (error) {
      console.error("[AssociationOfficialPage] 협회 삭제 실패:", error);
      alert("삭제 중 오류가 발생했습니다.");
    } finally {
      setDeleting(false);
    }
  };

  const handleJoinRequest = async () => {
    if (!associationId || !user?.uid || requesting || isMember) return;
    setRequesting(true);
    try {
      const result = await createJoinRequest(associationId, user.uid);
      if (!result.created) {
        alert("이미 요청을 보냈습니다.");
        setRequestStatus("pending");
        return;
      }
      setRequestStatus("pending");
      alert("가입 요청을 보냈습니다.");
    } catch (error) {
      console.error("[AssociationOfficialPage] 가입 요청 실패:", error);
      alert("가입 요청 중 오류가 발생했습니다.");
    } finally {
      setRequesting(false);
    }
  };

  const handleSaveIntro = async () => {
    if (!associationId || !canEdit) return;
    setSavingIntro(true);
    try {
      await updateDoc(doc(db, "associations", associationId), {
        introMessage: introDraft.trim(),
        updatedAt: serverTimestamp(),
      });
      setIsEditingIntro(false);
    } catch (error) {
      console.error("[AssociationOfficialPage] 인사말 저장 실패:", error);
      alert("인사말 저장에 실패했습니다.");
    } finally {
      setSavingIntro(false);
    }
  };

  const handleBannerImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !associationId || !canEdit) return;
    setUploadingBanner(true);
    try {
      const path = `associations/${associationId}/banner/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file, { contentType: file.type });
      const url = await getDownloadURL(storageRef);
      await updateDoc(doc(db, "associations", associationId), {
        bannerImage: url,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("[AssociationOfficialPage] 배너 이미지 업로드 실패:", error);
      alert("배너 이미지 업로드에 실패했습니다.");
    } finally {
      setUploadingBanner(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="bg-gray-50 pb-16">
      {/* Header (간단한 placeholder) */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 max-w-7xl flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">협회 공식 페이지</h1>
            {isEditMode && (
              <p className="text-sm text-blue-600 mt-1">관리자 편집 모드</p>
            )}
            <button
              type="button"
              onClick={() => navigate(`/association/${associationId}/ranking`)}
              className="mt-2 text-sm text-indigo-600 hover:text-indigo-700"
            >
              순위 보기 →
            </button>
          </div>
          {associationId && (canEdit || canDelete) && (
            <div className="flex items-center gap-2 relative">
              {/* 관리자 전용: 우측 3점 메뉴(⋯)로 관리 기능 이동 */}
              <button
                type="button"
                onClick={() => setMoreOpen((prev) => !prev)}
                aria-label="관리자 더보기"
                className="px-3 py-2 rounded-md border border-gray-200 text-gray-700 bg-white text-sm font-medium"
              >
                ⋯
              </button>
              {moreOpen && (
                <div className="absolute right-0 top-12 w-40 rounded-md border bg-white shadow-md z-20 p-1">
                  {canEdit && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setMoreOpen(false);
                          setEditMode((prev) => !prev);
                          setIsEditingIntro(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded text-sm text-gray-700 hover:bg-gray-50"
                      >
                        {editMode ? "편집 종료" : "편집 모드"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMoreOpen(false);
                          navigate(`/association/${associationId}/admin`);
                        }}
                        className="w-full text-left px-3 py-2 rounded text-sm text-gray-700 hover:bg-gray-50"
                      >
                        운영 대시보드
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMoreOpen(false);
                          navigate(`/association/${associationId}/edit`);
                        }}
                        className="w-full text-left px-3 py-2 rounded text-sm text-gray-700 hover:bg-gray-50"
                      >
                        수정하기
                      </button>
                    </>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => {
                        setMoreOpen(false);
                        void handleDelete();
                      }}
                      disabled={deleting}
                      className="w-full text-left px-3 py-2 rounded text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      {deleting ? "삭제 중..." : "삭제하기"}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
          {!canEdit && !canDelete && user?.uid && !isMember && (
            <div className="flex items-center gap-2">
              {requestStatus === "pending" ? (
                <span className="px-3 py-2 rounded-md border text-sm bg-gray-100 text-gray-600">승인 대기중</span>
              ) : (
                <button
                  type="button"
                  onClick={handleJoinRequest}
                  disabled={requesting}
                  className="px-3 py-2 rounded-md border border-blue-200 text-blue-700 bg-blue-50 text-sm font-medium disabled:opacity-50"
                >
                  {requesting ? "요청 중..." : "가입 요청하기"}
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-4 py-4">
        <div className="relative rounded-xl overflow-hidden border bg-white">
          <img
            src={association.bannerImage || "https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1600&auto=format&fit=crop"}
            alt={`${association.name} 배너`}
            className="w-full h-56 md:h-72 object-cover"
          />
          {editMode && canEdit && (
            <div className="absolute top-3 right-3">
              <label className="inline-flex items-center px-3 py-1.5 rounded bg-black/75 text-white text-sm cursor-pointer">
                {uploadingBanner ? "업로드 중..." : "📷 변경"}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleBannerImageUpload}
                  disabled={uploadingBanner}
                />
              </label>
            </div>
          )}
        </div>

        <div className="mt-4 rounded-xl border bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">협회장 인사말</h2>
            {editMode && canEdit && !isEditingIntro && <span className="text-sm text-blue-500">✏️ 수정 가능</span>}
          </div>
          {isEditingIntro ? (
            <div className="space-y-2">
              <textarea
                value={introDraft}
                onChange={(e) => setIntroDraft(e.target.value)}
                className="w-full border rounded p-2 min-h-32"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveIntro}
                  disabled={savingIntro}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm"
                >
                  {savingIntro ? "저장 중..." : "저장"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingIntro(false);
                    setIntroDraft(association.introMessage || "");
                  }}
                  className="px-3 py-1.5 border rounded text-sm"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => {
                if (editMode && canEdit) setIsEditingIntro(true);
              }}
              className={`${editMode && canEdit ? "cursor-pointer hover:bg-gray-50 rounded p-2 -m-2" : ""} whitespace-pre-wrap text-gray-700`}
            >
              {association.introMessage || association.description || "협회 소개 문구를 입력해보세요."}
            </div>
          )}
        </div>
      </section>

      {/* 6개 섹션 (순서 고정) */}
      <HeroSection associationName={association.name} highlightedTournamentTitle={highlightedTournament?.title || null} />
      <AssociationFeedSection associationId={associationId} association={association} />
      <NoticeSection associationId={associationId} />
      <TournamentSection tenantId={associationId} />
      <FacilitySection associationId={associationId} isEditMode={isEditMode} />
      <StorySection associationId={associationId} />
      <ClubSummarySection associationId={associationId} />
    </div>
  );
}

