/**
 * 공지 관리 페이지 (Admin 전용)
 * /association/:associationId/admin/notices
 */

import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { collection, query, where, orderBy, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useIsAssociationAdmin } from "@/hooks/useIsAssociationAdmin";
import { useAuth } from "@/context/AuthProvider";

interface Notice {
  id: string;
  title: string;
  content: string;
  status: "draft" | "scheduled" | "published" | "archived";
  publishAt: Timestamp;
  endAt?: Timestamp;
  isPinned: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export default function NoticeManagementPage() {
  const { associationId } = useParams<{ associationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAssociationAdmin(associationId);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "scheduled" | "archived">("all");

  // 권한 체크
  useEffect(() => {
    if (!adminLoading && (!user || !isAdmin)) {
      navigate(`/association/${associationId}`, { replace: true });
    }
  }, [adminLoading, user, isAdmin, associationId, navigate]);

  // 공지 목록 조회
  useEffect(() => {
    if (!associationId || !isAdmin) return;

    const fetchNotices = async () => {
      try {
        const noticesRef = collection(db, `associations/${associationId}/notices`);
        const q = query(noticesRef, orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        
        const noticesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Notice[];

        setNotices(noticesData);
      } catch (error) {
        console.error("공지 목록 조회 오류:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotices();
  }, [associationId, isAdmin]);

  // 필터링된 공지 목록
  const filteredNotices = notices.filter((notice) => {
    if (statusFilter === "all") return true;
    return notice.status === statusFilter;
  });

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null; // navigate로 리다이렉트됨
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* 협회 관리자 첫 진입 체크리스트 */}
        <AdminFirstEntryChecklist associationId={associationId!} />

        {/* 상단 */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">공지 관리</h1>
          <button
            onClick={() => navigate(`/association/${associationId}/admin/notices/new`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + 새 공지 작성
          </button>
        </div>

        {/* 필터 영역 */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">상태:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">전체</option>
                <option value="published">게시중</option>
                <option value="scheduled">예약</option>
                <option value="archived">보관</option>
              </select>
            </div>
          </div>
        </div>

        {/* 리스트 테이블 */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">제목</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">상태</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">게시기간</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">상단고정</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">마지막 수정</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredNotices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    공지가 없습니다.
                  </td>
                </tr>
              ) : (
                filteredNotices.map((notice) => (
                  <tr key={notice.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {notice.title}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          notice.status === "published"
                            ? "bg-green-100 text-green-700"
                            : notice.status === "scheduled"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {notice.status === "published"
                          ? "게시중"
                          : notice.status === "scheduled"
                          ? "예약"
                          : notice.status === "archived"
                          ? "보관"
                          : "임시저장"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {notice.status === "scheduled" ? (
                        <div>
                          <div className="font-medium">
                            예정: {notice.publishAt?.toDate().toLocaleString("ko-KR")}
                          </div>
                          {notice.endAt && (
                            <div className="text-xs text-gray-500">
                              종료: {notice.endAt.toDate().toLocaleString("ko-KR")}
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
                          {notice.publishAt?.toDate().toLocaleDateString("ko-KR")} ~{" "}
                          {notice.endAt?.toDate().toLocaleDateString("ko-KR") || "무기한"}
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      {notice.isPinned ? "⭐" : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {notice.updatedAt?.toDate().toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            navigate(`/association/${associationId}/admin/notices/${notice.id}/edit`)
                          }
                          className="text-blue-600 hover:text-blue-800"
                        >
                          편집
                        </button>
                        <button
                          onClick={() =>
                            navigate(`/association/${associationId}#notice`)
                          }
                          className="text-gray-600 hover:text-gray-800"
                        >
                          미리보기
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

