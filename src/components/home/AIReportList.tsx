// src/components/home/AIReportList.tsx
// 🔥 AI 리포트 이력 리스트 컴포넌트 (정본 구조 - 무한 루프 완전 차단)

import { useEffect, useState, useRef } from "react";
import { collection, query, orderBy, limit, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { useTeam } from "@/context/TeamContext";
import { useLocation, useNavigate } from "react-router-dom";
import { AIReportDetailModal } from "./AIReportDetailModal";
import { track } from "@/lib/analytics";

interface AiReport {
  id: string;
  createdAt: any;
  createdBy: string;
  weekStart: string;
  status: "queued" | "processing" | "done" | "failed";
  progress?: number;
  errorMessage?: string;
  summary: string;
  html?: string;
  pdfUrl?: string;
}

interface Props {
  teamId: string;
}

export default function AIReportList({ teamId }: Props) {
  // ✅ 규칙 1: 모든 Hooks는 최상단, 항상 같은 순서로 호출
  const { role } = useTeam();
  const location = useLocation();
  const navigate = useNavigate();
  const [reports, setReports] = useState<AiReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [selectedReport, setSelectedReport] = useState<AiReport | null>(null);
  const cancelledRef = useRef(false);

  // 🔥 권한 체크 (클라이언트)
  const normalizedRole = (role || "").toLowerCase();
  const isManager = normalizedRole === "admin" || normalizedRole === "관리자" || normalizedRole === "owner" || normalizedRole === "manager" || normalizedRole === "총무";

  // ✅ 2단계: Firestore permission-denied는 "재시도 금지" - 정상 상태로 처리
  useEffect(() => {
    // teamId 없으면 로딩만 종료 (Firestore 접근 안 함)
    if (!teamId) {
      setLoading(false);
      setError(null);
      setReports([]);
      return;
    }

    cancelledRef.current = false;
    setLoading(true);
    setError(null);

    console.log("🔍 [AIReportList] 리포트 목록 로드 시작");

    const loadReports = async () => {
      try {
        const reportsRef = collection(db, `teams/${teamId}/ai_reports`);
        const q = query(reportsRef, orderBy("createdAt", "desc"), limit(10));
        
        const snapshot = await getDocs(q);
        
        if (cancelledRef.current) return;

        const reportsList: AiReport[] = [];
        snapshot.forEach((doc) => {
          reportsList.push({
            id: doc.id,
            ...doc.data(),
          } as AiReport);
        });

        setReports(reportsList);
        setLoading(false);
        console.log("✅ [AIReportList] 리포트 목록 업데이트:", reportsList.length);
      } catch (error: any) {
        if (cancelledRef.current) return;

        // ✅ permission-denied는 "정상 상태"로 처리 (재시도 완전 차단, 로그 레벨 낮춤)
        if (error?.code === "permission-denied") {
          console.log("📊 [AIReportList] 권한 없음 - 정상 상태 (재시도 차단)");
          setReports([]);
          setError("NO_PERMISSION"); // 특별한 에러 코드로 구분
          setLoading(false);
          return; // ❗ 재시도 금지
        }
        
        // 기타 에러만 에러 로그
        console.error("❌ [AIReportList] 리포트 조회 실패:", error);
        setReports([]);
        setError("리포트를 불러오는데 실패했습니다.");
        setLoading(false);
      }
    };

    loadReports();

    // ✅ 3단계: cleanup 보장
    return () => {
      cancelledRef.current = true;
      console.log("🔍 [AIReportList] 로드 취소됨");
    };
  }, [teamId]); // ✅ reports, loading 절대 dependency에 넣지 않음

  // 🔥 URL 쿼리 파라미터에서 report ID 확인 (ops/summary 카드에서 클릭 시)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const reportId = params.get("report");
    
    if (!reportId || !teamId) return;
    
    // reports에서 찾기 시도
    if (reports.length > 0) {
      const report = reports.find((r) => r.id === reportId);
      if (report) {
        setSelectedReport(report);
        track("ai_report_view", {
          reportId,
          teamId,
          source: "modal",
        });
        // URL에서 쿼리 파라미터 제거
        params.delete("report");
        const newSearch = params.toString();
        navigate(location.pathname + (newSearch ? `?${newSearch}` : ""), { replace: true });
        return;
      }
    }
    
    // reports에 없으면 Firestore에서 직접 조회 (한 번만)
    const fetchReport = async () => {
      try {
        const reportRef = doc(db, `teams/${teamId}/ai_reports/${reportId}`);
        const reportSnap = await getDoc(reportRef);
        if (reportSnap.exists()) {
          const fetchedReport = {
            id: reportSnap.id,
            ...reportSnap.data(),
          } as AiReport;
          setSelectedReport(fetchedReport);
          track("ai_report_view", {
            reportId,
            teamId,
            source: "modal",
          });
          // URL에서 쿼리 파라미터 제거
          params.delete("report");
          const newSearch = params.toString();
          navigate(location.pathname + (newSearch ? `?${newSearch}` : ""), { replace: true });
        }
      } catch (error) {
        console.error("리포트 조회 실패:", error);
      }
    };
    fetchReport();
  }, [location.search, teamId, navigate, location.pathname, reports]);

  // 🔥 중복 생성 방지: 최근 리포트가 queued 또는 processing이면 생성 불가
  const latestReport = reports[0];
  const isGenerating = latestReport?.status === "queued" || latestReport?.status === "processing";
  const canGenerate = !isGenerating && !generating && isManager;

  // 리포트 생성
  const handleGenerate = async () => {
    if (!teamId || !canGenerate) return;

    track("ai_report_generate_click", { teamId });

    try {
      setGenerating(true);
      const generateReport = httpsCallable(functions, "generateTeamAIReport");
      const result = await generateReport({ teamId });

      if (result.data) {
        const weekStart = (result.data as any)?.weekStart || new Date().toISOString().split("T")[0];
        track("ai_report_created", {
          teamId,
          weekStart,
        });
        console.log("✅ 리포트 생성 요청 완료:", result.data);
      }
    } catch (error: any) {
      console.error("리포트 생성 실패:", error);
      track("ai_report_failed", {
        teamId,
        error: error?.message || "unknown",
      });
      const errorMessage = error?.message || "리포트 생성에 실패했습니다.";
      alert(errorMessage);
    } finally {
      setGenerating(false);
    }
  };

  // 🔥 PDF URL 안전화
  const getSafePdfUrl = (pdfUrl?: string): string | null => {
    if (!pdfUrl) return null;
    if (pdfUrl.startsWith("gs://")) {
      console.warn("⚠️ gs:// URL은 서버에서 다운로드 URL로 변환 필요");
      return null;
    }
    if (pdfUrl.startsWith("https://")) {
      return pdfUrl;
    }
    return null;
  };

  // 🔥 재시도 핸들러
  const handleRetry = async (reportId: string) => {
    if (!teamId || !canGenerate) return;

    try {
      setGenerating(true);
      const generateReport = httpsCallable(functions, "generateTeamAIReport");
      const result = await generateReport({ teamId });

      if (result.data) {
        console.log("✅ 리포트 재생성 요청 완료:", result.data);
      }
    } catch (error: any) {
      console.error("리포트 재생성 실패:", error);
      alert(error?.message || "리포트 재생성에 실패했습니다.");
    } finally {
      setGenerating(false);
    }
  };

  // ✅ 규칙 2: early return은 JSX 분기로 처리 (Hooks 호출 이후)
  // 권한 없으면 섹션 숨김
  if (!isManager) {
    return null;
  }

  // teamId 없으면 안내 메시지
  if (!teamId) {
    return (
      <section className="w-full max-w-5xl space-y-3">
        <div className="w-full rounded-2xl bg-gray-50 p-4 text-sm text-gray-500 text-center">
          팀을 생성하면 리포트를 확인할 수 있어요.
        </div>
      </section>
    );
  }

  // 로딩 중
  if (loading) {
    return (
      <div className="w-full max-w-5xl rounded-2xl bg-gray-50 p-4 text-sm text-gray-500 text-center">
        불러오는 중...
      </div>
    );
  }

  // ✅ permission-denied는 정상 상태로 처리
  if (error === "NO_PERMISSION") {
    return (
      <section className="w-full max-w-5xl space-y-3">
        <div className="w-full rounded-2xl bg-gray-50 p-4 text-sm text-gray-500 text-center">
          팀을 생성하면 리포트를 확인할 수 있어요.
        </div>
      </section>
    );
  }

  // 기타 에러
  if (error) {
    return (
      <div className="w-full max-w-5xl rounded-2xl bg-red-50 border border-red-200 p-4">
        <div className="flex items-center gap-2 text-red-600">
          <span className="text-lg">⚠️</span>
          <p className="text-sm font-medium">{error}</p>
        </div>
      </div>
    );
  }

  // 정상 렌더
  return (
    <section className="w-full max-w-5xl space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            🤖 AI 리포트
          </h2>
          <p className="text-sm text-gray-600">
            주간 팀 활동 리포트를 생성하고 확인하세요.
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isGenerating ? "생성 중..." : generating ? "요청 중..." : "리포트 생성"}
        </button>
      </div>

      {reports.length === 0 ? (
        <div className="w-full rounded-2xl bg-gray-50 p-4 text-sm text-gray-500 text-center">
          AI 리포트 생성 이력이 없습니다. "리포트 생성" 버튼을 클릭하여 첫 리포트를 만들어보세요.
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map((report) => {
            const safePdfUrl = getSafePdfUrl(report.pdfUrl);
            return (
              <div
                key={report.id}
                onClick={() => {
                  setSelectedReport(report);
                  track("ai_report_view", {
                    reportId: report.id,
                    teamId,
                    source: "list",
                  });
                }}
                className="w-full rounded-2xl bg-white p-4 shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-gray-900">
                        {report.weekStart} 주간 리포트
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          report.status === "done"
                            ? "bg-green-100 text-green-700"
                            : report.status === "processing"
                            ? "bg-blue-100 text-blue-700"
                            : report.status === "queued"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {report.status === "done"
                          ? "완료"
                          : report.status === "processing"
                          ? `처리 중${report.progress ? ` ${report.progress}%` : ""}`
                          : report.status === "queued"
                          ? "대기 중"
                          : "실패"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 whitespace-pre-line mb-2 line-clamp-2">
                      {report.summary}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        클릭하여 상세 보기
                      </span>
                      {safePdfUrl && (
                        <a
                          href={safePdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          📄 PDF
                        </a>
                      )}
                      {report.status === "failed" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRetry(report.id);
                          }}
                          disabled={!canGenerate}
                          className="text-xs text-blue-600 hover:underline disabled:opacity-50"
                        >
                          🔄 재시도
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 🔥 리포트 상세 모달 */}
      {selectedReport && (
        <AIReportDetailModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onRetry={handleRetry}
        />
      )}
    </section>
  );
}
