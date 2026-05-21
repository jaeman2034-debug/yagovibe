/**
 * 공지 행정 테이블 뷰 컴포넌트
 * 
 * 원칙:
 * - 행정 모드 ON일 때 사용
 * - 테이블 형식으로 모든 정보 표시
 * - 관리 액션 버튼 포함
 */

import { Link } from "react-router-dom";
import type { Notice } from "@/types/notice";
import { Timestamp } from "firebase/firestore";
import { formatDate } from "@/utils/dateUtils";

interface NoticeAdminTableProps {
  notices: Notice[];
  associationId: string;
  onEdit?: (noticeId: string) => void;
  onDelete?: (noticeId: string) => void;
  onPin?: (noticeId: string, isPinned: boolean) => void;
}

export function NoticeAdminTable({ notices, associationId, onEdit, onDelete, onPin }: NoticeAdminTableProps) {

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "draft":
        return "임시 저장";
      case "scheduled":
        return "예약 게시";
      case "published":
        return "게시중";
      case "archived":
        return "보관됨";
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-700";
      case "scheduled":
        return "bg-yellow-100 text-yellow-700";
      case "published":
        return "bg-green-100 text-green-700";
      case "archived":
        return "bg-gray-100 text-gray-500";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  if (notices.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <p className="text-gray-500">등록된 공지가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                제목
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                상태
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                공식
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                고정
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                작성일
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                관리
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {notices.map((notice) => (
              <tr key={notice.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      to={`/association/${associationId}/notices/${notice.id}`}
                      className="text-sm font-medium text-gray-900 hover:text-blue-600"
                    >
                      {notice.title}
                    </Link>
                    {notice.label && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                        [{notice.label}]
                      </span>
                    )}
                    {notice.isSystemGenerated && (
                      <span 
                        className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs flex items-center gap-1"
                        title="시스템 자동 생성 기록입니다. 수정/삭제할 수 없습니다."
                      >
                        <span>⚙️</span>
                        <span>시스템</span>
                      </span>
                    )}
                    {!notice.isSystemGenerated && (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs flex items-center gap-1">
                        <span>🟦</span>
                        <span>운영</span>
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(notice.status)}`}>
                    {getStatusLabel(notice.status)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={notice.isOfficial !== false ? "text-green-600 text-sm" : "text-gray-500 text-sm"}>
                    {notice.isOfficial !== false ? "✅ 공식" : "⏳ 임시"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {onPin ? (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onPin(notice.id, notice.isPinned || false);
                      }}
                      className={`px-2 py-1 text-xs rounded border ${
                        notice.isPinned
                          ? "bg-yellow-100 text-yellow-700 border-yellow-300 hover:bg-yellow-200"
                          : "bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200"
                      }`}
                      title={notice.isPinned ? "고정 해제" : "고정"}
                    >
                      {notice.isPinned ? "📌 고정" : "고정"}
                    </button>
                  ) : (
                    <span className={notice.isPinned ? "text-yellow-600 text-sm" : "text-gray-500 text-sm"}>
                      {notice.isPinned ? "📌 ON" : "OFF"}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {formatDate(notice.publishAt || notice.createdAt)}
                </td>
                <td className="px-4 py-3">
                  {notice.isSystemGenerated ? (
                    <div className="flex items-center gap-2">
                      <span 
                        className="px-2 py-1 text-xs text-gray-500 bg-gray-100 rounded border border-gray-200 cursor-help"
                        title="시스템 자동 생성 기록입니다. 수정/삭제할 수 없습니다."
                      >
                        ⚙️ 시스템 생성
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation(); // ⭐ 이벤트 버블링 차단
                          onEdit?.(notice.id);
                        }}
                        className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded border border-blue-200"
                      >
                        ✏️ 수정
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation(); // ⭐ 이벤트 버블링 차단
                          if (onDelete) {
                            onDelete(notice.id);
                          } else if (confirm("정말 이 공지를 삭제하시겠습니까?")) {
                            console.log("삭제:", notice.id);
                          }
                        }}
                        className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded border border-red-200"
                      >
                        🗑 삭제
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

