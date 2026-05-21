// src/pages/ai-reports/AIReportDetailPage.tsx
// 🔥 AI 리포트 전용 페이지 (공유/북마크 가능)

import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { doc, getDoc, collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useTeam } from "@/context/TeamContext";
import { ArrowLeft, Share2, Download, Calendar, GitCompare } from "lucide-react";
import { track } from "@/lib/analytics";

interface AiReport {
  id: string;
  createdAt: any;
  createdBy: string;
  weekStart: string;
  status: "queued" | "done" | "failed";
  summary: string;
  html?: string;
  pdfUrl?: string;
}

export default function AIReportDetailPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const { myTeam } = useTeam();
  const navigate = useNavigate();
  const [report, setReport] = useState<AiReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [versions, setVersions] = useState<AiReport[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);

  useEffect(() => {
    if (!reportId || !myTeam?.id) {
      setError("리포트를 찾을 수 없습니다.");
      setLoading(false);
      return;
    }

    const fetchReport = async () => {
      try {
        setLoading(true);
        const reportRef = doc(db, `teams/${myTeam.id}/ai_reports/${reportId}`);
        const reportSnap = await getDoc(reportRef);

        if (!reportSnap.exists()) {
          setError("리포트를 찾을 수 없습니다.");
          return;
        }

        const fetchedReport = {
          id: reportSnap.id,
          ...reportSnap.data(),
        } as AiReport;
        setReport(fetchedReport);

        // 🔥 Analytics: 리포트 열람 추적 (전용 페이지)
        track("ai_report_view", {
          reportId,
          teamId: myTeam?.id,
          source: "page",
        });

        // 🔥 버전 히스토리 조회 (같은 주간 리포트의 다른 버전)
        if (fetchedReport.weekStart) {
          const versionsRef = collection(db, `teams/${myTeam.id}/ai_reports`);
          const versionsQuery = query(
            versionsRef,
            where("weekStart", "==", fetchedReport.weekStart),
            where("status", "==", "done"),
            orderBy("createdAt", "desc")
          );
          const versionsSnap = await getDocs(versionsQuery);
          const versionsList = versionsSnap.docs
            .map((d) => ({ id: d.id, ...d.data() } as AiReport))
            .filter((v) => v.id !== reportId);
          setVersions(versionsList);
        }
      } catch (err) {
        console.error("리포트 조회 실패:", err);
        setError("리포트를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [reportId, myTeam?.id]);

  // 🔥 공유 기능
  const handleShare = async () => {
    if (!report) return;

    const shareData = {
      title: `${report.weekStart} 주간 AI 리포트`,
      text: report.summary,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        // 🔥 Analytics: 공유 추적 (Web Share)
        track("ai_report_share", {
          page: "ai-report",
          teamId: myTeam?.id,
          reportId: report.id,
        });
      } else {
        // 폴백: 클립보드에 URL 복사
        await navigator.clipboard.writeText(window.location.href);
        alert("링크가 클립보드에 복사되었습니다.");
        // 🔥 Analytics: 공유 추적 (클립보드)
        track("ai_report_share", {
          page: "ai-report",
          teamId: myTeam?.id,
          reportId: report.id,
        });
      }
    } catch (err) {
      console.error("공유 실패:", err);
    }
  };

  // 🔥 PDF 다운로드
  const handleDownload = () => {
      if (report?.pdfUrl && report.pdfUrl.startsWith("https://")) {
        window.open(report.pdfUrl, "_blank");
        // 🔥 Analytics: PDF 다운로드 추적
        if (report) {
          track("ai_report_pdf_download", {
            reportId: report.id,
            teamId: myTeam?.id,
          });
        }
      } else {
        alert("PDF를 준비 중입니다.");
      }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">리포트를 불러오는 중...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !report) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-red-600 dark:text-red-400 mb-4">{error || "리포트를 찾을 수 없습니다."}</p>
            <Link
              to="/home"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              홈으로 돌아가기
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  const safePdfUrl = report.pdfUrl?.startsWith("https://") ? report.pdfUrl : null;
  const createdAtDate = report.createdAt?.toDate?.() || new Date(report.createdAt);

  return (
    <div className="min-h-dvh bg-[#F9FAFB]">
      <div className="container mx-auto max-w-4xl px-4 py-6">
        {/* 헤더 */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeft size={20} />
            <span>뒤로 가기</span>
          </button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                🤖 AI 리포트
              </h1>
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <Calendar size={16} />
                  <span>{report.weekStart} 주간 리포트</span>
                </div>
                <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200 rounded-full text-xs">
                  완료
                </span>
              </div>
            </div>

          {/* 액션 버튼 */}
          <div className="flex items-center gap-2">
            {versions.length > 0 && (
              <select
                value={selectedVersion || ""}
                onChange={(e) => setSelectedVersion(e.target.value || null)}
                className="px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg border border-gray-300 dark:border-gray-600 text-sm"
              >
                <option value="">현재 버전</option>
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    버전 {versions.indexOf(v) + 1} ({new Date(v.createdAt?.toDate?.() || v.createdAt).toLocaleDateString("ko-KR")})
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <Share2 size={18} />
              <span>공유</span>
            </button>
            {safePdfUrl && (
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download size={18} />
                <span>PDF 다운로드</span>
              </button>
            )}
          </div>
          </div>
        </div>

        {/* 리포트 내용 */}
        {selectedVersion && versions.find((v) => v.id === selectedVersion) ? (
          // 🔥 버전 비교 뷰 (2컬럼)
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">현재 버전</h3>
              <div className="prose prose-lg max-w-none dark:prose-invert">
                {report.html ? (
                  <div
                    dangerouslySetInnerHTML={{ __html: report.html }}
                    className="text-gray-700 dark:text-gray-300"
                  />
                ) : (
                  <div className="whitespace-pre-line text-gray-700 dark:text-gray-300">
                    {report.summary}
                  </div>
                )}
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl shadow-lg p-6 border-2 border-blue-200 dark:border-blue-800">
              <h3 className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-4">
                이전 버전 ({versions.findIndex((v) => v.id === selectedVersion) + 1})
              </h3>
              <div className="prose prose-lg max-w-none dark:prose-invert">
                {(() => {
                  const versionReport = versions.find((v) => v.id === selectedVersion)!;
                  return versionReport.html ? (
                    <div
                      dangerouslySetInnerHTML={{ __html: versionReport.html }}
                      className="text-gray-700 dark:text-gray-300"
                    />
                  ) : (
                    <div className="whitespace-pre-line text-gray-700 dark:text-gray-300">
                      {versionReport.summary}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
            <div className="prose prose-lg max-w-none dark:prose-invert">
              {report.html ? (
                <div
                  dangerouslySetInnerHTML={{ __html: report.html }}
                  className="text-gray-700 dark:text-gray-300"
                />
              ) : (
                <div className="whitespace-pre-line text-gray-700 dark:text-gray-300">
                  {report.summary}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 메타 정보 */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4 text-sm text-gray-600 dark:text-gray-400">
          <p>생성일: {createdAtDate.toLocaleString("ko-KR")}</p>
          {report.weekStart && <p>기간: {report.weekStart}</p>}
        </div>
      </div>
    </div>
  );
}

