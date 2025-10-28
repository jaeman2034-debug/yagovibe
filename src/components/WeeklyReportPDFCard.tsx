import { useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { auth, db, storage } from "@/lib/firebase";
import { doc, getDoc, collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

type WeeklyReport = {
    uid: string;
    report: string; // "---\n1. 주간 요약: ...\n2. 피드백: ...\n3. 추천 목표: ...\n---"
    createdAt: string | { seconds: number; nanoseconds: number }; // ISO string or Timestamp
};

export default function WeeklyReportPDFCard() {
    const [loading, setLoading] = useState(true);
    const [nickname, setNickname] = useState("게스트");
    const [report, setReport] = useState<WeeklyReport | null>(null);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    // 최신 주간 리포트 1건 로드
    useEffect(() => {
        (async () => {
            const user = auth.currentUser;
            if (!user) {
                setLoading(false);
                return;
            }

            try {
                // 닉네임
                const profileSnap = await getDoc(doc(db, "users", user.uid));
                if (profileSnap.exists()) {
                    const data = profileSnap.data();
                    setNickname(data.nickname || data.name || "게스트");
                }

                // 최신 weekly 문서
                const weeklyCol = collection(db, "reports", user.uid, "weekly");
                const q = query(weeklyCol, orderBy("createdAt", "desc"), limit(1));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    const reportData = snap.docs[0].data();
                    setReport({
                        ...reportData,
                        createdAt: reportData.createdAt?.toDate?.()?.toISOString() ||
                            (typeof reportData.createdAt === 'string' ? reportData.createdAt :
                                new Date().toISOString()),
                    } as WeeklyReport);
                }
            } catch (error) {
                console.error("리포트 로드 오류:", error);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const formatDate = (iso?: string) => {
        if (!iso) return "";
        try {
            const d = new Date(iso);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const dd = String(d.getDate()).padStart(2, "0");
            return `${yyyy}-${mm}-${dd}`;
        } catch {
            return "";
        }
    };

    // PDF 생성 (메모리/다운로드)
    const makePdf = async () => {
        if (!cardRef.current) return;
        try {
            // 카드 DOM을 캡처
            const canvas = await html2canvas(cardRef.current, {
                scale: 2,
                backgroundColor: "#ffffff",
                logging: false,
            });
            const imgData = canvas.toDataURL("image/png");

            // A4 포맷
            const pdf = new jsPDF({ unit: "pt", format: "a4" });
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();

            // 이미지 비율로 크기 계산
            const imgWidth = pageWidth - 80; // 좌우 여백 40pt
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let y = 60;

            // 타이틀
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(16);
            pdf.text("YAGO VIBE · AI 주간 리포트", 40, y);
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(11);
            y += 18;
            pdf.text(`사용자: ${nickname}`, 40, y);
            y += 16;
            pdf.text(`생성일: ${formatDate(report?.createdAt)}`, 40, y);
            y += 20;

            // 이미지 삽입 (카드 스냅샷)
            if (y + imgHeight > pageHeight - 40) {
                pdf.addPage();
                y = 40;
            }
            pdf.addImage(imgData, "PNG", 40, y, imgWidth, imgHeight);

            // 다운로드
            pdf.save(`YAGOVIBE_weekly_${formatDate(report?.createdAt)}.pdf`);
        } catch (error) {
            console.error("PDF 생성 오류:", error);
            alert("PDF 생성 중 오류가 발생했습니다.");
        }
    };

    // PDF 생성 + Storage 업로드 후 링크 제공
    const makePdfAndUpload = async () => {
        if (!cardRef.current) return;
        setUploading(true);
        try {
            const canvas = await html2canvas(cardRef.current, {
                scale: 2,
                backgroundColor: "#ffffff",
                logging: false,
            });
            const imgData = canvas.toDataURL("image/png");

            const pdf = new jsPDF({ unit: "pt", format: "a4" });
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = pageWidth - 80;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            let y = 60;
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(16);
            pdf.text("YAGO VIBE · AI 주간 리포트", 40, y);
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(11);
            y += 18;
            pdf.text(`사용자: ${nickname}`, 40, y);
            y += 16;
            pdf.text(`생성일: ${formatDate(report?.createdAt)}`, 40, y);
            y += 20;

            if (y + imgHeight > pageHeight - 40) {
                pdf.addPage();
                y = 40;
            }
            pdf.addImage(imgData, "PNG", 40, y, imgWidth, imgHeight);

            // Blob으로 변환
            const blob = pdf.output("blob");

            // 업로드
            const user = auth.currentUser!;
            const fileName = `weekly_${formatDate(report?.createdAt)}.pdf`;
            const storageRef = ref(storage, `reportsPDF/${user.uid}/${fileName}`);
            await uploadBytes(storageRef, blob);
            const url = await getDownloadURL(storageRef);
            setPdfUrl(url);
        } catch (error) {
            console.error("PDF 업로드 오류:", error);
            alert("PDF 업로드 중 오류가 발생했습니다.");
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return (
            <div className="w-full max-w-md mx-auto p-6 text-center text-gray-500">
                AI 리포트를 불러오는 중...
            </div>
        );
    }

    if (!report) {
        return (
            <div className="w-full max-w-md mx-auto p-6 text-center text-gray-500">
                최신 주간 리포트가 없습니다.
            </div>
        );
    }

    // 리포트 텍스트 파싱(보기 좋게)
    const prettyReport = report.report.replaceAll("---", "").trim();

    return (
        <div className="w-full max-w-md mx-auto">
            {/* 캡처 대상 카드 */}
            <div
                ref={cardRef}
                className="p-6 rounded-2xl shadow-md bg-white border border-gray-100"
            >
                <div className="flex items-center gap-3 mb-4">
                    <img src="/ai_logo.svg" alt="YAGO" className="w-10 h-10" />
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">AI 주간 리포트</h2>
                        <p className="text-xs text-gray-500">{formatDate(report.createdAt)}</p>
                    </div>
                </div>

                <div className="space-y-3 text-sm leading-6 text-gray-800 whitespace-pre-line">
                    {prettyReport}
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                    <button
                        onClick={makePdf}
                        className="bg-blue-600 text-white py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
                    >
                        PDF로 저장
                    </button>
                    <button
                        onClick={makePdfAndUpload}
                        disabled={uploading}
                        className="bg-gray-100 text-gray-800 py-2 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {uploading ? "업로드 중..." : "PDF 업로드(링크 생성)"}
                    </button>
                </div>

                {pdfUrl && (
                    <div className="mt-4 p-3 bg-green-50 rounded-lg text-center text-sm">
                        <p className="text-green-800 mb-2">✅ PDF가 업로드되었습니다!</p>
                        <a
                            href={pdfUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 underline hover:text-blue-800"
                        >
                            업로드된 PDF 열기
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}

