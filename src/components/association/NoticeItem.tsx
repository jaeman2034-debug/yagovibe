/**
 * 공지 아이템 컴포넌트 (Public)
 * 
 * 리스트와 섹션에서 공통 사용
 */

import { useNavigate } from "react-router-dom";
import { Timestamp } from "firebase/firestore";

interface Notice {
  id: string;
  title: string;
  content: string;
  status: "draft" | "scheduled" | "published" | "archived";
  publishAt: Timestamp;
  endAt?: Timestamp;
  isPinned: boolean;
  label?: "필독" | "변경" | "대회";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface NoticeItemProps {
  notice: Notice;
  associationId: string;
}

export function NoticeItem({ notice, associationId }: NoticeItemProps) {
  const navigate = useNavigate();
  const preview = notice.content.substring(0, 150);

  const getLabelColor = (label?: string) => {
    switch (label) {
      case "필독":
        return "bg-red-100 text-red-700";
      case "변경":
        return "bg-blue-100 text-blue-700";
      case "대회":
        return "bg-green-100 text-green-700";
      default:
        return "";
    }
  };

  return (
    <div
      onClick={() => navigate(`/association/${associationId}/notices/${notice.id}`)}
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h3 className="text-lg font-semibold text-gray-900">{notice.title}</h3>
            {notice.isPinned && (
              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">
                ⭐ 고정
              </span>
            )}
            {notice.label && (
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getLabelColor(notice.label)}`}>
                [{notice.label}]
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mb-2">
            {notice.publishAt?.toDate().toLocaleDateString("ko-KR")}
          </p>
          <p className="text-gray-600 line-clamp-2">
            {preview}
            {notice.content.length > 150 && "..."}
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end">
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/association/${associationId}/notices/${notice.id}`);
          }}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          자세히 보기 →
        </button>
      </div>
    </div>
  );
}

