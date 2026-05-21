// src/pages/admin/MonthlyReportDashboard.tsx
// 📊 월간 운영 리포트 대시보드 (최종 완성본)

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTeam } from "@/context/TeamContext";
import { useAuth } from "@/context/AuthProvider";
import { doc, getDoc, collection, query, orderBy, getDocs } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { functions, db } from "@/lib/firebase";

interface MonthlyReport {
  month: string;
  memberStats: {
    total: number;
    active: number;
    paused: number;
    deleted: number;
  };
  feeStats: {
    baseAmount: number;
    targetCount: number;
    paidCount: number;
    unpaidCount: number;
    expectedAmount: number;
    paidAmount: number;
    unpaidAmount: number;
  };
  alerts: Array<{
    type: string;
    count: number;
    memberIds?: string[];
  }>;
  generatedAt: any;
  generatedBy: string;
}

export default function MonthlyReportDashboard() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { myTeam } = useTeam();
  const { user } = useAuth();

  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 현재 월 계산
  const getCurrentMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  };

  // 사용 가능한 월 목록 로드
  useEffect(() => {
    if (!teamId) return;

    const loadAvailableMonths = async () => {
      try {
        const reportsRef = collection(db, `teams/${teamId}/monthlyReports`);
        const q = query(reportsRef, orderBy("month", "desc"));
        const snap = await getDocs(q);

        const months = snap.docs.map((doc) => doc.id);
        setAvailableMonths(months);

        if (months.length > 0 && !selectedMonth) {
          setSelectedMonth(months[0]);
        } else if (months.length === 0) {
          setSelectedMonth(getCurrentMonth());
        }
      } catch (err: any) {
        console.error("월 목록 로드 실패:", err);
      }
    };

    loadAvailableMonths();
  }, [teamId, selectedMonth]);

  // 리포트 로드
  useEffect(() => {
    if (!teamId || !selectedMonth) return;

    const loadReport = async () => {
      setLoading(true);
      setError(null);

      try {
        const reportRef = doc(db, `teams/${teamId}/monthlyReports/${selectedMonth}`);
        const reportSnap = await getDoc(reportRef);

        if (reportSnap.exists()) {
          setReport(reportSnap.data() as MonthlyReport);
        } else {
          setReport(null);
        }
      } catch (err: any) {
        setError(err.message);
        console.error("리포트 로드 실패:", err);
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [teamId, selectedMonth]);

  // 리포트 생성
  const handleGenerateReport = async () => {
    if (!teamId || !selectedMonth) return;

    setGenerating(true);
    setError(null);

    try {
      const generateReport = httpsCallable(functions, "generateMonthlyReportCallable");
      const result = await generateReport({ teamId, month: selectedMonth });

      if ((result.data as any).success) {
        // 리포트 다시 로드
        const reportRef = doc(db, `teams/${teamId}/monthlyReports/${selectedMonth}`);
        const reportSnap = await getDoc(reportRef);

        if (reportSnap.exists()) {
          setReport(reportSnap.data() as MonthlyReport);
        }

        alert("리포트 생성이 완료되었습니다.");
      }
    } catch (err: any) {
      setError(err.message);
      console.error("리포트 생성 실패:", err);
    } finally {
      setGenerating(false);
    }
  };

  // PDF 다운로드
  const handleDownloadPDF = async () => {
    if (!teamId || !selectedMonth) return;

    try {
      const generatePDF = httpsCallable(functions, "generateMonthlyReportPDFCallable");
      const result = await generatePDF({ teamId, month: selectedMonth });

      const data = result.data as any;

      if (data.success && data.pdf) {
        // Base64 디코딩
        const binaryString = atob(data.pdf);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // Blob 생성 및 다운로드
        const blob = new Blob([bytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = data.filename || `리포트_${selectedMonth}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else if (data.html) {
        // HTML 다운로드 (PDF 생성 실패 시)
        const blob = new Blob([data.html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = data.filename || `리포트_${selectedMonth}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      setError(err.message);
      console.error("PDF 다운로드 실패:", err);
    }
  };

  // CSV 다운로드
  const handleDownloadCSV = () => {
    if (!report) return;

    const csvRows = [
      ["항목", "값"],
      ["월", report.month],
      ["총 회원", report.memberStats.total],
      ["활성 회원", report.memberStats.active],
      ["휴원 회원", report.memberStats.paused],
      ["탈퇴 회원", report.memberStats.deleted],
      ["기본 회비", report.feeStats.baseAmount],
      ["납부 대상", report.feeStats.targetCount],
      ["납부 완료", report.feeStats.paidCount],
      ["미납", report.feeStats.unpaidCount],
      ["예상 수입", report.feeStats.expectedAmount],
      ["실제 수입", report.feeStats.paidAmount],
      ["미수 금액", report.feeStats.unpaidAmount],
      ["경고 수", report.alerts.length],
    ];

    const csv = csvRows.map((row) => row.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `리포트_${selectedMonth}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!teamId) {
    return <div>팀을 찾을 수 없습니다.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">월간 운영 리포트</h1>
          <p className="text-gray-600 mt-2">팀 운영 현황을 한눈에 확인하세요</p>
        </div>

        {/* 월 선택 및 액션 버튼 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                월 선택
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">선택하세요</option>
                {availableMonths.map((month) => (
                  <option key={month} value={month}>
                    {month.substring(0, 4)}년 {parseInt(month.substring(5))}월
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 mt-8">
              <button
                onClick={handleGenerateReport}
                disabled={generating || !selectedMonth}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? "생성 중..." : "리포트 생성"}
              </button>
              <button
                onClick={handleDownloadPDF}
                disabled={!report}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                PDF 다운로드
              </button>
              <button
                onClick={handleDownloadCSV}
                disabled={!report}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                CSV 다운로드
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">로딩 중...</p>
          </div>
        )}

        {!loading && !report && selectedMonth && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
            해당 월의 리포트가 없습니다. "리포트 생성" 버튼을 클릭하여 생성하세요.
          </div>
        )}

        {!loading && report && (
          <>
            {/* 요약 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600 mb-2">총 회원</div>
                <div className="text-3xl font-bold text-blue-600">{report.memberStats.total}</div>
                <div className="text-sm text-gray-500 mt-1">활성: {report.memberStats.active}명</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600 mb-2">수입</div>
                <div className="text-3xl font-bold text-green-600">
                  {report.feeStats.paidAmount.toLocaleString()}원
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  예상: {report.feeStats.expectedAmount.toLocaleString()}원
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600 mb-2">미수</div>
                <div className="text-3xl font-bold text-red-600">
                  {report.feeStats.unpaidAmount.toLocaleString()}원
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  미납: {report.feeStats.unpaidCount}명
                </div>
              </div>
            </div>

            {/* 회원 통계 */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">회원 통계</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-gray-600">총 회원 수</div>
                  <div className="text-2xl font-bold">{report.memberStats.total}명</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">활성 회원</div>
                  <div className="text-2xl font-bold text-green-600">{report.memberStats.active}명</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">휴원 회원</div>
                  <div className="text-2xl font-bold text-yellow-600">{report.memberStats.paused}명</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">탈퇴 회원</div>
                  <div className="text-2xl font-bold text-gray-600">{report.memberStats.deleted}명</div>
                </div>
              </div>
            </div>

            {/* 회비 통계 */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">회비 통계</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-gray-600">기본 회비</div>
                  <div className="text-2xl font-bold">{report.feeStats.baseAmount.toLocaleString()}원</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">납부 대상</div>
                  <div className="text-2xl font-bold">{report.feeStats.targetCount}명</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">납부 완료</div>
                  <div className="text-2xl font-bold text-green-600">{report.feeStats.paidCount}명</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">미납</div>
                  <div className="text-2xl font-bold text-red-600">{report.feeStats.unpaidCount}명</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">예상 수입</div>
                  <div className="text-2xl font-bold">{report.feeStats.expectedAmount.toLocaleString()}원</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">실제 수입</div>
                  <div className="text-2xl font-bold text-green-600">
                    {report.feeStats.paidAmount.toLocaleString()}원
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">미수 금액</div>
                  <div className="text-2xl font-bold text-red-600">
                    {report.feeStats.unpaidAmount.toLocaleString()}원
                  </div>
                </div>
              </div>
            </div>

            {/* 경고 섹션 */}
            {report.alerts.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">⚠️ 경고 사항</h2>
                <div className="space-y-3">
                  {report.alerts.map((alert, index) => {
                    let alertText = "";
                    if (alert.type === "UNPAID_2_MONTHS") {
                      alertText = `2개월 연속 미납: ${alert.count}명`;
                    } else if (alert.type === "PAUSED_OVER_3_MONTHS") {
                      alertText = `장기 휴원 (3개월 이상): ${alert.count}명`;
                    } else if (alert.type === "ANNUAL_FEE_UNPAID") {
                      alertText = `연회비 미납: ${alert.count}명`;
                    }
                    return (
                      <div
                        key={index}
                        className="p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded"
                      >
                        <div className="font-medium text-yellow-800">{alertText}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

