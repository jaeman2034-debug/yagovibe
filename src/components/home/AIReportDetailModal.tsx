// src/components/home/AIReportDetailModal.tsx
// 🔥 AI 리포트 상세 보기 모달

import { X, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

interface AiReport {
  id: string;
  createdAt: any;
  createdBy: string;
  weekStart: string;
  status: "queued" | "processing" | "done" | "failed";
  summary: string;
  html?: string;
  pdfUrl?: string;
  progress?: number;
  errorMessage?: string;
}

interface Props {
  report: AiReport;
  onClose: () => void;
  onRetry?: (reportId: string) => void;
}

export function AIReportDetailModal({ report, onClose, onRetry }: Props) {
  // 🔥 상태별 처리
  if (report.status === "queued") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                🤖 AI 리포트 생성 중
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">
                리포트를 생성하고 있습니다...
              </p>
              <p className="text-sm text-gray-500 mt-2">
                잠시만 기다려주세요.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (report.status === "failed") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                ❌ 리포트 생성 실패
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            <div className="py-4">
              <p className="text-gray-600 mb-4">
                {report.summary || "리포트 생성 중 오류가 발생했습니다."}
              </p>
              {onRetry && (
                <button
                  onClick={() => {
                    onRetry(report.id);
                    onClose();
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  🔄 재시도
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 🔥 완료된 리포트 상세 내용
  const safePdfUrl = report.pdfUrl?.startsWith("https://") ? report.pdfUrl : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                🤖 AI 리포트
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {report.weekStart} 주간 리포트
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* 메타 정보 */}
          <div className="mb-6 pb-4 border-b border-gray-200">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-600">
                <strong>기간:</strong> {report.weekStart}
              </span>
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                완료
              </span>
            </div>
          </div>

          {/* 리포트 내용 */}
          <div className="prose prose-sm max-w-none">
            {report.html ? (
              <div
                dangerouslySetInnerHTML={{ __html: report.html }}
                className="text-gray-700"
              />
            ) : (
              <div className="whitespace-pre-line text-gray-700">
                {report.summary}
              </div>
            )}
          </div>

          {/* 액션 버튼 */}
          <div className="mt-6 pt-6 border-t border-gray-200 flex items-center gap-3">
            {safePdfUrl && (
              <a
                href={safePdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                📄 PDF 다운로드
              </a>
            )}
            <Link
              to={`/ai-reports/${report.id}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              onClick={onClose}
            >
              <ExternalLink size={16} />
              자세히 보기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

