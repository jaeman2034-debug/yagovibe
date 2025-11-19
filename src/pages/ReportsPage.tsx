import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Volume2, Calendar, Bell, Mail } from "lucide-react";
// date-fns 대신 기본 Date 사용

/**
 * Step 10: AI 주간 리포트 자동 PDF + 음성(MP3) 리포트
 * 버튼 한 번으로 생성하고, 다운로드 링크 + 오디오 플레이어 표시
 */
export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  // 🔥 Firestore 리포트 실시간 구독
  useEffect(() => {
    const q = query(collection(db, "reports"), orderBy("date", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setReports(data);
      },
      (error) => {
        console.error("🔥 Firestore 리포트 에러:", error);
      }
    );
    return () => unsub();
  }, []);

  // 🔹 리포트 생성 요청
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const functionsOrigin = import.meta.env.VITE_FUNCTIONS_ORIGIN || 
        "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";

      const response = await fetch(`${functionsOrigin}/generateWeeklyReport`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`리포트 생성 실패: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.ok) {
        alert("✅ 리포트 생성 완료! PDF와 MP3 파일이 준비되었습니다. Slack 알림도 자동으로 전송됩니다.");
      } else {
        alert(`⚠️ 리포트 생성 실패: ${data.error || "알 수 없는 오류"}`);
      }
    } catch (error: any) {
      console.error("리포트 생성 오류:", error);
      alert(`오류 발생: ${error.message || "알 수 없는 오류"}`);
    } finally {
      setGenerating(false);
    }
  };

  // 🔔 최신 리포트 Slack 알림 테스트
  const handleNotifySlack = async () => {
    try {
      const functionsOrigin = import.meta.env.VITE_FUNCTIONS_ORIGIN || 
        "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";

      const response = await fetch(`${functionsOrigin}/notifyLatestReport`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`알림 전송 실패: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.ok) {
        alert("✅ Slack으로 테스트 알림 전송 완료!");
      } else {
        alert(`⚠️ 알림 전송 실패: ${data.error || "알 수 없는 오류"}`);
      }
    } catch (error: any) {
      console.error("Slack 알림 전송 오류:", error);
      alert(`오류 발생: ${error.message || "알 수 없는 오류"}`);
    }
  };

  // 📧 이메일 발송 테스트
  const handleSendEmail = async () => {
    if (reports.length === 0) {
      alert("발송할 리포트가 없습니다.");
      return;
    }

    const latestReport = reports[0];
    const recipientEmail = prompt("이메일 주소를 입력하세요:", process.env.ALERT_EMAIL_TO || "");

    if (!recipientEmail) {
      return;
    }

    try {
      const functionsOrigin = import.meta.env.VITE_FUNCTIONS_ORIGIN || 
        "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";

      const response = await fetch(`${functionsOrigin}/sendReportEmailManual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: latestReport.id,
          recipientEmail,
        }),
      });

      if (!response.ok) {
        throw new Error(`이메일 발송 실패: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.ok) {
        alert(`✅ 이메일 발송 완료!\n수신자: ${recipientEmail}`);
      } else {
        alert(`⚠️ 이메일 발송 실패: ${data.error || "알 수 없는 오류"}`);
      }
    } catch (error: any) {
      console.error("이메일 발송 오류:", error);
      alert(`오류 발생: ${error.message || "알 수 없는 오류"}`);
    }
  };

  return (
    <div className="p-6 min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
          <FileText className="w-6 h-6 text-indigo-600" /> 주간 AI 리포트
        </h1>
        <div className="flex gap-2">
          <Button
            onClick={handleGenerate}
            disabled={generating || loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
          >
            {generating ? (
              <>
                <Loader2 className="animate-spin w-4 h-4" /> 생성 중...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" /> 리포트 생성 (PDF + MP3)
              </>
            )}
          </Button>
          <Button
            onClick={handleNotifySlack}
            disabled={reports.length === 0}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Bell className="w-4 h-4" /> Slack 알림 테스트
          </Button>
          <Button
            onClick={handleSendEmail}
            disabled={reports.length === 0}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Mail className="w-4 h-4" /> 이메일 발송 테스트
          </Button>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="animate-spin w-8 h-8 text-indigo-600" />
        </div>
      )}

      {!loading && reports.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-gray-500 dark:text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>아직 생성된 리포트가 없습니다.</p>
            <p className="text-sm mt-2">위의 버튼을 클릭하여 첫 번째 리포트를 생성하세요.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {reports.map((r) => {
          const reportDate = r.date?.toDate
            ? (() => {
                const d = r.date.toDate();
                return `${d.getFullYear()}년 ${String(d.getMonth() + 1).padStart(2, "0")}월 ${String(d.getDate()).padStart(2, "0")}일`;
              })()
            : r.date
            ? (() => {
                const d = new Date(r.date);
                return `${d.getFullYear()}년 ${String(d.getMonth() + 1).padStart(2, "0")}월 ${String(d.getDate()).padStart(2, "0")}일`;
              })()
            : "날짜 미상";

          return (
            <Card key={r.id} className="shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <p className="font-semibold text-lg text-gray-900 dark:text-white">
                        주간 리포트
                      </p>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {reportDate}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <span>
                        총 판매: <strong className="text-indigo-600">{r.totalSales?.toLocaleString?.() || 0}</strong>개
                      </span>
                      <span>
                        평균 평점: <strong className="text-indigo-600">{r.avgRating || 0}</strong> / 5
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {r.pdfUrl && (
                      <a
                        className="inline-flex items-center gap-1 px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                        href={r.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        download
                      >
                        <FileText className="w-4 h-4" /> PDF 다운로드
                      </a>
                    )}
                    {r.audioUrl && (
                      <a
                        className="inline-flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                        href={r.audioUrl}
                        target="_blank"
                        rel="noreferrer"
                        download
                      >
                        <Volume2 className="w-4 h-4" /> MP3 다운로드
                      </a>
                    )}
                  </div>
                </div>

                {r.summary && (
                  <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                      {r.summary}
                    </p>
                  </div>
                )}

                {r.topProducts && r.topProducts.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                      🏆 TOP 5 상품:
                    </p>
                    <div className="space-y-1">
                      {r.topProducts.map((p: any, i: number) => (
                        <p key={i} className="text-sm text-gray-600 dark:text-gray-400">
                          {i + 1}. {p.name} - 주간 판매: {p.weeklySales?.toLocaleString?.() || 0}개 / 평점 {p.rating?.toFixed(1) || "0.0"}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {r.audioUrl && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                      🎧 음성 리포트 재생:
                    </p>
                    <audio controls className="w-full">
                      <source src={r.audioUrl} type="audio/mpeg" />
                      브라우저가 오디오 재생을 지원하지 않습니다.
                    </audio>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

