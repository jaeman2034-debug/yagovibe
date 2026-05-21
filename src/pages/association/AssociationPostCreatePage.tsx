import { FormEvent, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { getAssociationById } from "@/services/associationService";
import { createAssociationPost, type AssociationPostType } from "@/services/associationPostService";
import { getUserRole, isAdmin, type AssociationWithMembers } from "@/utils/permissions";
import { notifyAssociationMembersNotice } from "@/services/associationNotificationService";

const allowedTypes: AssociationPostType[] = ["notice", "schedule", "recruit", "free"];

export default function AssociationPostCreatePage() {
  const navigate = useNavigate();
  const { associationId } = useParams<{ associationId: string }>();
  const [params] = useSearchParams();
  const { user } = useAuth();

  const initialType = (params.get("type") as AssociationPostType) || "free";
  const [type, setType] = useState<AssociationPostType>(allowedTypes.includes(initialType) ? initialType : "free");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [association, setAssociation] = useState<AssociationWithMembers | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      if (!associationId) return;
      setLoading(true);
      try {
        const data = await getAssociationById(associationId);
        setAssociation(data);
      } catch (error) {
        console.error("[AssociationPostCreatePage] 협회 조회 실패:", error);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [associationId]);

  const role = getUserRole(association, user?.uid);
  const canGeneralWrite = !!role;
  const canNoticeWrite = isAdmin(association, user?.uid);
  const canWrite = type === "notice" ? canNoticeWrite : canGeneralWrite;

  const canPin = useMemo(() => type === "notice" && canNoticeWrite, [type, canNoticeWrite]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!associationId || !user?.uid || !canWrite) return;
    if (!title.trim() || !content.trim()) return;

    setSaving(true);
    try {
      const postId = await createAssociationPost({
        associationId,
        uid: user.uid,
        type,
        title: title.trim(),
        content: content.trim(),
        isPinned: canPin ? isPinned : false,
      });

      if (type === "notice") {
        const memberIds = (association?.members ?? [])
          .map((m) => m.uid)
          .filter((uid) => !!uid && uid !== user.uid);
        if (memberIds.length > 0) {
          await notifyAssociationMembersNotice({
            associationId,
            postId,
            title: title.trim(),
            userIds: memberIds,
          });
        }
      }
      navigate(`/association/${associationId}`, { replace: true });
    } catch (error) {
      console.error("[AssociationPostCreatePage] 게시글 작성 실패:", error);
      alert("게시글 작성에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (!associationId) return <Navigate to="/" replace />;
  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">로딩 중...</div>;
  if (!user?.uid) return <Navigate to={`/login?next=${encodeURIComponent(`/association/${associationId}/posts/create?type=${type}`)}`} replace />;
  if (!canWrite) return <Navigate to={`/association/${associationId}`} replace />;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <button
          type="button"
          className="text-sm text-gray-500 mb-3"
          onClick={() => navigate(`/association/${associationId}`)}
        >
          ← 뒤로가기
        </button>
        <h1 className="text-2xl font-bold mb-4">게시글 작성</h1>

        <form onSubmit={handleSubmit} className="rounded-xl border bg-white p-4 space-y-3">
          <div>
            <label className="text-sm text-gray-700 mb-1 block">글 유형</label>
            <select
              className="w-full border rounded-md px-3 py-2"
              value={type}
              onChange={(e) => setType(e.target.value as AssociationPostType)}
            >
              <option value="notice">공지</option>
              <option value="schedule">일정</option>
              <option value="recruit">모집</option>
              <option value="free">자유</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-700 mb-1 block">제목</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
              placeholder="제목을 입력하세요"
            />
          </div>

          <div>
            <label className="text-sm text-gray-700 mb-1 block">내용</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full border rounded-md px-3 py-2 min-h-36"
              placeholder="내용을 입력하세요"
            />
          </div>

          {canPin && (
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={isPinned} onChange={(e) => setIsPinned(e.target.checked)} />
              공지 상단 고정
            </label>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-md bg-blue-600 text-white py-3 font-semibold disabled:opacity-50"
          >
            {saving ? "등록 중..." : "등록하기"}
          </button>
        </form>
      </div>
    </div>
  );
}

