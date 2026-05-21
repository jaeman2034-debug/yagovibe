/**
 * 공지 카드 컴포넌트 (Public + Admin 행정 모드)
 * 
 * 원칙:
 * - 중요한 공지 즉시 인식 (색상 + 아이콘)
 * - 날짜로 "언제 공지했냐" 전화 차단
 * - 공식 배지로 신뢰 기준 고정
 * - 요약으로 스크롤 최소화 (모바일 최적)
 * - 행정 모드: 상태 필드 + 수정/삭제 버튼
 */

import { useNavigate } from "react-router-dom";
import type { Notice } from "@/types/notice";
import { Timestamp } from "firebase/firestore";
import { formatDate } from "@/utils/dateUtils";

interface NoticeCardProps {
  notice: Notice;
  associationId: string;
  isAdminMode?: boolean; // 행정 모드 여부
  onEdit?: (noticeId: string) => void; // 수정 버튼 클릭 시 호출 (Drawer 방식)
  onDelete?: (noticeId: string) => void; // 삭제 버튼 클릭 시 호출
}

export function NoticeCard({ notice, associationId, isAdminMode = false, onEdit, onDelete }: NoticeCardProps) {
  const navigate = useNavigate();
  
  // 중요도 판단 (level 또는 label 기반)
  const isImportant = notice.level === "important" || notice.label === "필독";
  const summary = notice.summary || notice.content.substring(0, 150);

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


  const getStatusLabel = (status: string) => {
    switch (status) {
      case "draft":
        return "임시 저장";
      case "scheduled":
        return "예약 게시";
      case "published":
        return "게시됨";
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

  const handleCardClick = (e: React.MouseEvent) => {
    // 행정 모드에서 버튼 클릭 시에는 네비게이션 방지
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("a")) {
      return;
    }
    navigate(`/association/${associationId}/notices/${notice.id}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className={`rounded-lg border p-4 transition-shadow ${
        isAdminMode ? "bg-white border-gray-300" : "cursor-pointer hover:shadow-md"
      } ${
        isImportant ? "border-red-300 bg-red-50" : isAdminMode ? "" : "bg-white border-gray-200"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h3 className="text-lg font-semibold text-gray-900">
              {isImportant && "📌 "}
              {notice.title}
            </h3>
            {notice.isPinned && (
              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs flex-shrink-0">
                ⭐ 고정
              </span>
            )}
            {notice.label && (
              <span className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${getLabelColor(notice.label)}`}>
                [{notice.label}]
              </span>
            )}
            {(notice.isOfficial !== false) && (
              <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded flex-shrink-0">
                공식
              </span>
            )}
            {notice.isSystemGenerated && (
              <span 
                className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded flex-shrink-0 flex items-center gap-1 cursor-help"
                title="시스템 자동 생성 기록입니다. 수정/삭제할 수 없습니다."
              >
                <span>⚙️</span>
                <span>시스템</span>
              </span>
            )}
            {!notice.isSystemGenerated && (
              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded flex-shrink-0 flex items-center gap-1">
                <span>🟦</span>
                <span>운영</span>
              </span>
            )}
          </div>
          
          {summary && (
            <p className="mt-1 text-sm text-gray-600 line-clamp-2 mb-3">
              {summary}
              {notice.content.length > 150 && !notice.summary && "..."}
            </p>
          )}

          {/* 시스템 공지: 대회 바로가기 버튼 */}
          {notice.isSystemGenerated && notice.relatedTournamentId && (
            <div className="mt-3 mb-2">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  
                  // 🔥 시나리오 A: 같은 페이지 내 대회 존재 시 스크롤
                  const tournamentCard = document.getElementById(`tournament-${notice.relatedTournamentId}`);
                  if (tournamentCard) {
                    tournamentCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // 하이라이트 효과
                    tournamentCard.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2');
                    setTimeout(() => {
                      tournamentCard.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2');
                    }, 2000);
                  } else {
                    // 🔥 시나리오 B: 다른 페이지로 이동
                    navigate(`/association/${associationId}/tournaments/${notice.relatedTournamentId}`);
                  }
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                <span>🏆</span>
                <span>대회 바로가기</span>
              </button>
            </div>
          )}

          {/* 행정 모드: 상태 필드 표시 */}
          {isAdminMode && (
            <div className="mt-3 space-y-2 border-t pt-3">
              <div className="flex items-center gap-3 text-xs flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">상태:</span>
                  <span className={`px-2 py-0.5 rounded ${getStatusColor(notice.status)}`}>
                    {getStatusLabel(notice.status)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">공식 여부:</span>
                  <span className={notice.isOfficial !== false ? "text-green-600" : "text-gray-500"}>
                    {notice.isOfficial !== false ? "✅ 공식" : "⏳ 임시"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">고정:</span>
                  <span className={notice.isPinned ? "text-yellow-600" : "text-gray-500"}>
                    {notice.isPinned ? "ON" : "OFF"}
                  </span>
                </div>
                {notice.isSystemGenerated && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">시스템:</span>
                    <span className="text-gray-600 flex items-center gap-1">
                      <span>🤖</span>
                      <span>{notice.systemEventType || "자동 생성"}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 행정 모드: 수정/삭제 버튼 (시스템 공지는 수정/삭제 불가) */}
        {isAdminMode && !notice.isSystemGenerated && (
          <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            {onEdit ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onEdit(notice.id);
                }}
                className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded border border-blue-200"
              >
                ✏️ 수정
              </button>
            ) : null}
            {onDelete ? (
              <button
                type="button"
                className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded border border-red-200"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(notice.id);
                }}
              >
                🗑 삭제
              </button>
            ) : null}
          </div>
        )}
        {isAdminMode && notice.isSystemGenerated && (
          <div 
            className="flex items-center gap-2 flex-shrink-0 text-xs text-gray-500" 
            onClick={(e) => e.stopPropagation()}
            title="시스템 자동 생성 기록입니다. 수정/삭제할 수 없습니다."
          >
            <span className="px-3 py-1.5 bg-gray-100 rounded border border-gray-200 cursor-help">
              ⚙️ 시스템 생성
            </span>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
        <span>등록일 · {formatDate(notice.publishAt || notice.createdAt)}</span>
        {!isAdminMode && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/association/${associationId}/notices/${notice.id}`);
            }}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            자세히 보기 →
          </button>
        )}
      </div>
    </div>
  );
}

