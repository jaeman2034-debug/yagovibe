/**
 * 공지 운영자 대시보드 페이지
 * /association/:associationId/admin/dashboard
 * 
 * 원칙:
 * - 관리자가 운영 상태를 한눈에 파악
 * - 즉시 액션 필요한 항목 표시
 * - KPI, 승인 대기, 통계 등 종합 정보 제공
 */

import { useParams, useNavigate } from "react-router-dom";
import { useIsAssociationAdmin } from "@/hooks/useIsAssociationAdmin";
import { useNoticeStats } from "@/hooks/useNoticeStats";
import { useNotices } from "@/hooks/useNotices";
import { NoticeKPI } from "@/components/association/notice/NoticeKPI";
import { NoticeStatusBadge } from "@/components/association/notice/NoticeStatusBadge";
import { SectionLayout } from "@/components/association/SectionLayout";
import { Link } from "react-router-dom";
import { Timestamp } from "firebase/firestore";
import type { Notice } from "@/types/notice";

export default function NoticeDashboardPage() {
  const { associationId } = useParams<{ associationId: string }>();
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useIsAssociationAdmin(associationId);
  const { stats, loading: statsLoading } = useNoticeStats({ associationId });
  const { items: allNotices, loading: noticesLoading } = useNotices(associationId, {
    includeDraft: true, // 관리자 모드: 모든 상태 포함
  });

  // 승인 대기 공지 필터링
  const pendingNotices = allNotices.filter((n) => n.status === "pending");

  // 만료 예정 공지 필터링 (7일 이내)
  const expiringNotices = allNotices.filter((notice) => {
    if (notice.status !== "published" || !notice.expiresAt) return false;
    const now = Timestamp.now();
    const expiringThreshold = new Date();
    expiringThreshold.setDate(expiringThreshold.getDate() + 7);
    const expiringThresholdTs = Timestamp.fromDate(expiringThreshold);
    return notice.expiresAt <= expiringThresholdTs && notice.expiresAt > now;
  });

  // 조회수 TOP 3
  const topViewedNotices = [...allNotices]
    .filter((n) => n.status === "published" && (n.viewCount ?? 0) > 0)
    .sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))
    .slice(0, 3);

  if (adminLoading || statsLoading) {
    return (
      <SectionLayout title="공지 운영 대시보드" associationId={associationId}>
        <div className="flex items-center justify-center py-8">
          <p className="text-gray-500">로딩 중...</p>
        </div>
      </SectionLayout>
    );
  }

  if (!isAdmin) {
    return (
      <SectionLayout title="공지 운영 대시보드" associationId={associationId}>
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">관리자 권한이 필요합니다.</p>
          <Link
            to={`/association/${associationId}/notices`}
            className="text-blue-600 hover:text-blue-800"
          >
            공지 목록으로 돌아가기
          </Link>
        </div>
      </SectionLayout>
    );
  }

  return (
    <SectionLayout title="공지 운영 대시보드" associationId={associationId}>
      <div className="space-y-6">
        {/* 📊 KPI 카드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <NoticeKPI
            label="게시중 공지"
            value={stats.published}
            icon="📢"
            color="green"
            onClick={() => navigate(`/association/${associationId}/notices?status=published`)}
          />
          <NoticeKPI
            label="승인 대기"
            value={stats.pending}
            icon="⏳"
            color="yellow"
            onClick={() => navigate(`/association/${associationId}/notices?status=pending`)}
          />
          <NoticeKPI
            label="고정 공지"
            value={stats.pinned}
            icon="📌"
            color="yellow"
            onClick={() => navigate(`/association/${associationId}/notices?pinned=true`)}
          />
          <NoticeKPI
            label="만료 예정 (7일)"
            value={stats.expiringSoon}
            icon="⏱"
            color="red"
            onClick={() => navigate(`/association/${associationId}/notices?expiring=true`)}
          />
        </div>

        {/* 🔥 승인 대기 영역 (SuperAdmin 전용) */}
        {pendingNotices.length > 0 && (
          <div className="bg-white border border-yellow-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>⏳</span>
              <span>승인 대기 ({pendingNotices.length}건)</span>
            </h3>
            <div className="space-y-3">
              {pendingNotices.map((notice) => (
                <PendingNoticeCard key={notice.id} notice={notice} associationId={associationId!} />
              ))}
            </div>
          </div>
        )}

        {/* ⏱ 만료 예정 영역 */}
        {expiringNotices.length > 0 && (
          <div className="bg-white border border-red-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>⏱</span>
              <span>만료 예정 ({expiringNotices.length}건)</span>
            </h3>
            <div className="space-y-3">
              {expiringNotices.map((notice) => (
                <ExpiringNoticeCard key={notice.id} notice={notice} associationId={associationId!} />
              ))}
            </div>
          </div>
        )}

        {/* 📊 통계 요약 */}
        {topViewedNotices.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 조회수 TOP 3</h3>
            <div className="space-y-2">
              {topViewedNotices.map((notice, index) => (
                <div key={notice.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-500 w-6">{index + 1}.</span>
                    <Link
                      to={`/association/${associationId}/notices/${notice.id}`}
                      className="text-sm font-medium text-gray-900 hover:text-blue-600"
                    >
                      {notice.title}
                    </Link>
                  </div>
                  <div className="text-sm text-gray-600">
                    👁 {notice.viewCount?.toLocaleString() ?? 0}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 📥 빠른 액션 */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📥 빠른 액션</h3>
          <div className="flex flex-wrap gap-3">
            <Link
              to={`/association/${associationId}/notices`}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
            >
              📋 공지 목록 보기
            </Link>
            <Link
              to={`/association/${associationId}/admin/reports`}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm font-medium"
            >
              📊 감사 리포트 다운로드
            </Link>
          </div>
        </div>
      </div>
    </SectionLayout>
  );
}

/**
 * 승인 대기 공지 카드
 */
function PendingNoticeCard({ notice, associationId }: { notice: Notice; associationId: string }) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-md">
      <div className="flex-1">
        <Link
          to={`/association/${associationId}/notices/${notice.id}`}
          className="text-sm font-medium text-gray-900 hover:text-blue-600"
        >
          {notice.title}
        </Link>
        <div className="text-xs text-gray-500 mt-1">
          요청일: {notice.requestedAt?.toDate().toLocaleDateString("ko-KR")}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate(`/association/${associationId}/notices/${notice.id}/approve`)}
          className="px-3 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700"
        >
          승인
        </button>
        <button
          onClick={() => navigate(`/association/${associationId}/notices/${notice.id}/reject`)}
          className="px-3 py-1.5 bg-red-600 text-white text-xs rounded hover:bg-red-700"
        >
          반려
        </button>
      </div>
    </div>
  );
}

/**
 * 만료 예정 공지 카드
 */
function ExpiringNoticeCard({ notice, associationId }: { notice: Notice; associationId: string }) {
  return (
    <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-md">
      <div className="flex-1">
        <Link
          to={`/association/${associationId}/notices/${notice.id}`}
          className="text-sm font-medium text-gray-900 hover:text-blue-600"
        >
          {notice.title}
        </Link>
        <div className="text-xs text-gray-500 mt-1">
          만료일: {notice.expiresAt?.toDate().toLocaleDateString("ko-KR")}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            // TODO: 연장 기능 구현
            console.log("연장:", notice.id);
          }}
          className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
        >
          연장
        </button>
        <button
          onClick={() => {
            // TODO: 만료 강제 처리
            console.log("만료:", notice.id);
          }}
          className="px-3 py-1.5 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
        >
          그대로 만료
        </button>
      </div>
    </div>
  );
}

