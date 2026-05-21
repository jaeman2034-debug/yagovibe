/**
 * 공지 작성/수정 페이지 (Admin 전용)
 * /association/:associationId/admin/notices/new
 * /association/:associationId/admin/notices/:noticeId/edit
 */

import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, collection, addDoc, Timestamp, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useIsAssociationAdmin } from "@/hooks/useIsAssociationAdmin";
import { useAuth } from "@/context/AuthProvider";

export default function NoticeEditPage() {
  const { associationId, noticeId } = useParams<{ associationId: string; noticeId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAssociationAdmin(associationId);
  const isEditMode = !!noticeId;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [label, setLabel] = useState<"" | "필독" | "변경" | "대회">("");
  const [isOfficial, setIsOfficial] = useState(true); // 공식 기준 여부 (기본값: true)
  const [publishAt, setPublishAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [publishType, setPublishType] = useState<"now" | "scheduled">("now");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 권한 체크
  useEffect(() => {
    if (!adminLoading && (!user || !isAdmin)) {
      navigate(`/association/${associationId}`, { replace: true });
    }
  }, [adminLoading, user, isAdmin, associationId, navigate]);

  // 수정 모드일 때 기존 데이터 로드
  useEffect(() => {
    if (!isEditMode || !associationId || !noticeId || !isAdmin) return;

    const loadNotice = async () => {
      try {
        setLoading(true);
        const noticeRef = doc(db, `associations/${associationId}/notices/${noticeId}`);
        const noticeSnap = await getDoc(noticeRef);

        if (noticeSnap.exists()) {
          const data = noticeSnap.data();
          setTitle(data.title || "");
          setContent(data.content || "");
          setIsPinned(data.isPinned || false);
          setLabel(data.label || "");
          setIsOfficial(data.isOfficial !== false); // 기본값: true
          setPublishAt(
            data.publishAt?.toDate().toISOString().slice(0, 16) ||
              new Date().toISOString().slice(0, 16)
          );
          setEndAt(
            data.endAt?.toDate().toISOString().slice(0, 16) || ""
          );
          setPublishType(data.status === "scheduled" ? "scheduled" : "now");
        }
      } catch (error) {
        console.error("공지 로드 오류:", error);
      } finally {
        setLoading(false);
      }
    };

    loadNotice();
  }, [isEditMode, associationId, noticeId, isAdmin]);

  const handleSave = async (publish: boolean) => {
    if (!title.trim()) {
      alert("제목을 입력해주세요.");
      return;
    }

    if (!content.trim()) {
      alert("내용을 입력해주세요.");
      return;
    }

    if (publish && publishType === "scheduled" && !publishAt) {
      alert("게시 시작일을 입력해주세요.");
      return;
    }

    if (!user || !associationId) return;

    try {
      setSaving(true);

      const now = new Date();
      const publishDate = publishType === "now" ? now : new Date(publishAt);
      const endDate = endAt ? new Date(endAt) : null;

      const noticeData = {
        title: title.trim(),
        content: content.trim(),
        isPinned,
        label: label || null,
        isOfficial, // 공식 기준 여부
        publishAt: Timestamp.fromDate(publishDate),
        endAt: endDate ? Timestamp.fromDate(endDate) : null,
        status: publish
          ? publishType === "now"
            ? "published"
            : "scheduled"
          : "draft",
        createdBy: user.uid,
        updatedAt: serverTimestamp(),
        ...(isEditMode ? {} : { createdAt: serverTimestamp() }),
      };

      const docId = noticeId || doc(collection(db, "temp")).id;
      const noticeRef = doc(db, `associations/${associationId}/notices/${docId}`);
      await setDoc(noticeRef, noticeData);

      // 공식 로그 기록 (행정 기록)
      try {
        await addDoc(collection(db, `associations/${associationId}/audit_logs`), {
          action: publish ? "NOTICE_PUBLISHED" : "NOTICE_SAVED",
          noticeId: docId,
          adminId: user.uid,
          title: title.trim(),
          status: noticeData.status,
          isOfficial, // 공식 기준 여부 기록
          timestamp: serverTimestamp(),
        });
      } catch (logError) {
        console.error("로그 기록 실패:", logError);
        // 로그 실패해도 공지 저장은 성공
      }

      alert(publish ? "공지가 게시되었습니다." : "임시 저장되었습니다.");
      navigate(`/association/${associationId}/admin/notices`);
    } catch (error) {
      console.error("공지 저장 오류:", error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <h1 className="text-2xl font-bold mb-6">
          {isEditMode ? "공지 수정" : "새 공지 작성"}
        </h1>

        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          {/* 기본 정보 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              제목 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="공지 제목을 입력하세요"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                상단 고정
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-600">상단에 고정 표시</span>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                라벨 (선택)
              </label>
              <select
                value={label}
                onChange={(e) => setLabel(e.target.value as "" | "필독" | "변경" | "대회")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">없음</option>
                <option value="필독">필독</option>
                <option value="변경">변경</option>
                <option value="대회">대회</option>
              </select>
            </div>
          </div>

          {/* 공식 기준 설정 */}
          <div className="border-t pt-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={isOfficial}
                onChange={(e) => setIsOfficial(e.target.checked)}
                className="mr-2"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">공식 기준 공지</span>
                <p className="text-xs text-gray-500 mt-1">
                  체크 시 "공식 기준" 배지가 표시되며, 행정 기록으로 남습니다.
                </p>
              </div>
            </label>
          </div>

          {/* 내용 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              내용 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={10}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="공지 내용을 입력하세요"
            />
          </div>

          {/* 게시 설정 */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium mb-4">게시 설정</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  게시 방식
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="now"
                      checked={publishType === "now"}
                      onChange={(e) => setPublishType(e.target.value as "now" | "scheduled")}
                      className="mr-2"
                    />
                    <span className="text-sm">즉시 게시</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="scheduled"
                      checked={publishType === "scheduled"}
                      onChange={(e) => setPublishType(e.target.value as "now" | "scheduled")}
                      className="mr-2"
                    />
                    <span className="text-sm">예약 게시</span>
                  </label>
                </div>
              </div>

              {publishType === "scheduled" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    게시 시작일/시간
                  </label>
                  <input
                    type="datetime-local"
                    value={publishAt}
                    onChange={(e) => setPublishAt(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  게시 종료일/시간 (선택)
                </label>
                <input
                  type="datetime-local"
                  value={endAt}
                  onChange={(e) => setEndAt(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>

          {/* 하단 액션 */}
          <div className="flex items-center justify-end gap-3 border-t pt-6">
            <button
              onClick={() => navigate(`/association/${associationId}/admin/notices`)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              저장 (임시)
            </button>
            <button
              onClick={() => {
                if (confirm("공지를 게시하시겠습니까?")) {
                  handleSave(true);
                }
              }}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "저장 중..." : "게시"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

