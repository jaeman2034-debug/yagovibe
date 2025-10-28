import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { getDownloadURL, ref } from "firebase/storage";
import MonthlyReportCard from "@/components/MonthlyReportCard";
import { useAdminGuard } from "@/hooks/useAdminGuard";

interface MonthlyReport {
    uid: string;
    nickname: string;
    email: string;
    month: string;
    report: string;
    weeklyReportsCount?: number;
    totalActivities?: number;
    totalDuration?: number;
    createdAt?: any;
}

export default function AdminMonthlyDashboard() {
    const { isAdmin, loading: authLoading } = useAdminGuard();
    const [reports, setReports] = useState<MonthlyReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [pdfLoading, setPdfLoading] = useState(false);

    useEffect(() => {
        if (!isAdmin) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const usersSnap = await getDocs(collection(db, "users"));
                const allReports: MonthlyReport[] = [];

                for (const userDoc of usersSnap.docs) {
                    const user = userDoc.data();
                    const uid = userDoc.id;

                    // 월간 리포트 컬렉션 조회
                    const monthlyRef = collection(db, "monthlyReports", uid, "reports");
                    const reportsSnap = await getDocs(query(monthlyRef, orderBy("createdAt", "desc")));

                    for (const reportDoc of reportsSnap.docs) {
                        const data = reportDoc.data();
                        allReports.push({
                            uid,
                            nickname: user.nickname || user.name || "이름 없음",
                            email: user.email || "",
                            month: reportDoc.id,
                            report: data.report || "",
                            weeklyReportsCount: data.weeklyReportsCount,
                            totalActivities: data.totalActivities,
                            totalDuration: data.totalDuration,
                            createdAt: data.createdAt,
                        });
                    }
                }

                // 생성일 기준 내림차순 정렬
                allReports.sort((a, b) => {
                    if (a.createdAt && b.createdAt) {
                        const aTime = a.createdAt.toMillis?.() || 0;
                        const bTime = b.createdAt.toMillis?.() || 0;
                        return bTime - aTime;
                    }
                    return 0;
                });

                setReports(allReports);
            } catch (error) {
                console.error("리포트 데이터 로드 실패:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [isAdmin]);

    // 필터링
    const filtered = reports.filter((r) => {
        const matchSearch =
            searchTerm === "" ||
            r.nickname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.month?.includes(searchTerm);
        const matchMonth = selectedMonth === "" || r.month === selectedMonth;
        return matchSearch && matchMonth;
    });

    const handleViewPDF = async (uid: string, month: string) => {
        setPdfLoading(true);
        try {
            // Storage 경로: reportsPDF/{uid}/monthly_{month}.pdf
            const filePath = `reportsPDF/monthly/${uid}/${month}.pdf`;
            const fileRef = ref(storage, filePath);
            const url = await getDownloadURL(fileRef);
            setPdfUrl(url);
        } catch (err: any) {
            console.error("PDF 로드 오류:", err);
            // Storage에 없으면 대체 경로 시도
            try {
                const altPath = `reportsPDF/${uid}/monthly_${month}.pdf`;
                const altRef = ref(storage, altPath);
                const url = await getDownloadURL(altRef);
                setPdfUrl(url);
            } catch (altErr) {
                alert("PDF 파일을 찾을 수 없습니다. 리포트가 아직 생성되지 않았거나 Storage에 업로드되지 않았을 수 있습니다.");
            }
        } finally {
            setPdfLoading(false);
        }
    };

    const handleDownloadPDF = () => {
        if (pdfUrl) {
            const link = document.createElement("a");
            link.href = pdfUrl;
            link.download = `monthly_report_${pdfUrl.split("/").pop()}`;
            link.click();
        }
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 mb-2">YAGO VIBE</div>
                    <div className="text-gray-500">로딩 중...</div>
                </div>
            </div>
        );
    }

    if (!isAdmin) {
        return null; // useAdminGuard가 리디렉션 처리
    }

    // 고유한 월 목록 추출 및 정렬
    const availableMonths = [...new Set(reports.map((r) => r.month))].sort().reverse();

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
            <div className="max-w-7xl mx-auto px-4">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        📊 AI 월간 리포트 관리자 대시보드
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        전체 팀원의 월간 리포트를 관리하고 확인하세요
                    </p>
                </div>

                {/* 필터 섹션 */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 mb-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                🔍 검색
                            </label>
                            <input
                                type="text"
                                placeholder="닉네임, 이메일 또는 월 검색"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                        <div className="md:w-48">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                📅 월 선택
                            </label>
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white"
                            >
                                <option value="">전체 월</option>
                                {availableMonths.map((m) => (
                                    <option key={m} value={m}>
                                        {m}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-end">
                            <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded-lg">
                                총 {filtered.length}건
                            </div>
                        </div>
                    </div>
                </div>

                {/* 리포트 목록 */}
                {filtered.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-12 text-center">
                        <p className="text-gray-500 dark:text-gray-400 text-lg">
                            {reports.length === 0
                                ? "월간 리포트가 없습니다."
                                : "검색 조건에 맞는 리포트가 없습니다."}
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {filtered.map((r) => (
                            <MonthlyReportCard
                                key={`${r.uid}-${r.month}`}
                                report={r}
                                onView={() => handleViewPDF(r.uid, r.month)}
                            />
                        ))}
                    </div>
                )}

                {/* PDF 미리보기 모달 */}
                {pdfUrl && (
                    <div
                        className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
                        onClick={() => setPdfUrl(null)}
                    >
                        <div
                            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-5xl h-full max-h-[90vh] flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* 헤더 */}
                            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    📄 리포트 PDF 미리보기
                                </h3>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleDownloadPDF}
                                        className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        📥 다운로드
                                    </button>
                                    <button
                                        onClick={() => setPdfUrl(null)}
                                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl leading-none"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>

                            {/* PDF iframe */}
                            <div className="flex-1 relative">
                                {pdfLoading ? (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="text-center">
                                            <div className="text-gray-500">PDF 로딩 중...</div>
                                        </div>
                                    </div>
                                ) : (
                                    <iframe
                                        src={pdfUrl}
                                        title="리포트 미리보기"
                                        className="w-full h-full rounded-b-2xl"
                                        style={{ border: "none" }}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

