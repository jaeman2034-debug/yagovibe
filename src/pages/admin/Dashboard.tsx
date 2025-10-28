import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Bar, Line } from "react-chartjs-2";
import { YagoButton, YagoCard, YagoStatCard } from "@/components/ui/YagoComponents";
import YagoLayout from "@/layouts/YagoLayout";
import dayjs from "dayjs";
import { createBarChartData, defaultChartOptions } from "@/utils/chartConfig";
import { FileDown, Presentation } from "lucide-react";
import { generateWeeklyReport, generateAndShareReport } from "@/api/generateReport";
import { exportReportPDF } from "@/lib/pdf";
import { sendSlackReport } from "@/api/shareSlack";
import AdminSummaryCard from "@/components/AdminSummaryCard";
import AdminChart from "@/components/AdminChart";

interface LogEntry {
  id?: string;
  ts?: { seconds: number };
  uid?: string | null;
  text?: string;
  intent?: string;
  action?: string;
  keyword?: string;
  lat?: number;
  lng?: number;
  resultCount?: number;
  note?: string;
}

export default function Dashboard() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [intents, setIntents] = useState<{ [key: string]: number }>({});
  const [keywords, setKeywords] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const [aiReport, setAiReport] = useState<string>("");
  const [reportLoading, setReportLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<string>("데이터 로딩 중...");
  const [summaryStats, setSummaryStats] = useState({
    users: 0,
    activeTeams: 0,
    insights: 0,
  });
  const [weeklyReports, setWeeklyReports] = useState<any[]>([]);

  // ✅ AI 요약 자동 로드
  useEffect(() => {
    const fetchAISummary = async () => {
      try {
        const response = await fetch("/api/generateWeeklyReport_new", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "text/plain"
          },
          body: JSON.stringify({
            summaryData: { users: logs.length, newUsers: 41, activeTeams: 18 },
            insightsData: { region: "경기북부", trend: "활동 증가" },
          }),
        });

        if (response.ok) {
          const text = await response.text();
          setAiSummary(text.slice(0, 200) + "...");
          setSummaryStats({
            users: logs.length,
            activeTeams: Math.floor(logs.length / 10),
            insights: 12
          });
        }
      } catch (error) {
        console.error("AI 요약 로드 실패:", error);
        setAiSummary("❌ AI 요약 로드 실패");
      }
    };

    if (logs.length > 0) {
      fetchAISummary();
    }
  }, [logs]);

  // ✅ 실시간 Firestore 로그 읽기 (voice_logs + logs)
  useEffect(() => {
    const voiceLogsQuery = query(collection(db, "voice_logs"), orderBy("ts", "desc"));
    const unsub1 = onSnapshot(voiceLogsQuery, (snap) => {
      const arr: LogEntry[] = [];
      snap.forEach((doc) => {
        arr.push({ id: doc.id, ...doc.data() } as LogEntry);
      });

      setLogs(arr);

      // Intent 통계 계산
      const intentCount: { [key: string]: number } = {};
      const keywordCount: { [key: string]: number } = {};

      arr.forEach((l) => {
        const intent = l.intent || "미확인";
        intentCount[intent] = (intentCount[intent] || 0) + 1;

        if (l.keyword) {
          keywordCount[l.keyword] = (keywordCount[l.keyword] || 0) + 1;
        }
      });

      setIntents(intentCount);
      setKeywords(keywordCount);
      setLoading(false);
    });

    return () => unsub1();
  }, []);

  // ✅ weeklyReports 데이터 로드
  useEffect(() => {
    const q = query(collection(db, "weeklyReports"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setWeeklyReports(data);
    });
    return () => unsub();
  }, []);

  const total = logs.length;
  const today = dayjs().format("YYYY-MM-DD");
  const todayLogs = logs.filter(log => {
    if (!log.ts?.seconds) return false;
    return dayjs(log.ts.seconds * 1000).format("YYYY-MM-DD") === today;
  });

  // ✅ 그래프 데이터
  const chartData = createBarChartData(Object.keys(intents), Object.values(intents));

  const chartOptions = {
    ...defaultChartOptions,
    plugins: {
      ...defaultChartOptions.plugins,
      title: {
        display: true,
        text: 'Intent별 명령 사용량',
        font: { size: 16, weight: 700 }
      }
    }
  };

  // ✅ AI 리포트 차트 데이터
  const reportData = {
    labels: ["10월 1주", "10월 2주", "10월 3주", "10월 4주"],
    datasets: [
      {
        label: "신규 가입자 수",
        data: [21, 32, 45, 53],
        borderColor: "rgba(75,192,192,1)",
        backgroundColor: "rgba(75,192,192,0.2)",
        tension: 0.3,
      },
    ],
  };

  const reportChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "bottom" as const,
      },
      title: {
        display: true,
        text: "📈 주간 신규 가입자 추이",
        font: { size: 16, weight: 700 }
      },
    },
  };

  // ✅ 완전 전환 API 리포트 요청 (모든 플랫폼 지원)
  const handleCompleteMigrationAPI = async (period: string = "thisweek") => {
    try {
      console.log(`🚀 완전 전환 API 리포트 요청 시작: ${period}`);

      const loadingAlert = alert(`📊 완전 전환 API ${period} 리포트 요청 중... 잠시만 기다려주세요!`);

      // Firebase Functions 완전 전환 API 호출
      const functionUrl = process.env.NODE_ENV === 'development'
        ? `http://localhost:5001/yago-vibe-spt/us-central1/vibeReport?period=${period}`
        : `https://asia-northeast3-yago-vibe-spt.cloudfunctions.net/vibeReport?period=${period}`;

      const response = await fetch(functionUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        console.log("✅ 완전 전환 API 리포트 요청 완료:", result);
        alert(`✅ 완전 전환 API ${period} 리포트 조회 완료!\n\n📊 리포트 내용:\n${result.message}\n\n🔹 Slack Webhook으로도 자동 전송되었습니다!\n\n🚀 API: Firebase Functions 완전 전환 패치`);
      } else {
        alert(`❌ ${result.error || 'Unknown error'}`);
      }

    } catch (error) {
      console.error("❌ 완전 전환 API 리포트 요청 오류:", error);
      alert(`❌ 완전 전환 API 리포트 요청에 실패했습니다.\n\n오류: ${error instanceof Error ? error.message : 'Unknown error'}\n\nFirebase Functions가 실행 중인지 확인해주세요.`);
    }
  };

  // ✅ 주간 리포트 생성 (기존 API 유지)
  const handleWeeklyReport = async () => {
    try {
      console.log("📊 주간 리포트 생성 시작...");

      const loadingAlert = alert("📊 주간 리포트 생성 중... 잠시만 기다려주세요!");

      // 주간 리포트 API 호출
      const response = await fetch('/api/generateWeeklyReport', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // PDF 파일 다운로드
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `YAGO_VIBE_Weekly_Report_${dayjs().format("YYYY-MM-DD")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      console.log("✅ 주간 리포트 생성 완료");
      alert("✅ 주간 리포트가 성공적으로 생성되었습니다!\n\n📄 PDF 파일이 다운로드되었습니다.\n📱 Slack으로도 자동 전송되었습니다.");

    } catch (error) {
      console.error("❌ 주간 리포트 생성 오류:", error);
      alert(`❌ 주간 리포트 생성에 실패했습니다.\n\n오류: ${error instanceof Error ? error.message : 'Unknown error'}\n\nOpenAI API 키가 설정되어 있는지 확인해주세요.`);
    }
  };

  // ✅ AI 리포트 생성 핸들러
  const handleGenerateAIReport = async () => {
    try {
      setReportLoading(true);
      setAiReport("생성 중...");

      const report = await generateWeeklyReport();
      setAiReport(report);
    } catch (error) {
      console.error("❌ AI 리포트 생성 오류:", error);
      setAiReport("리포트 생성에 실패했습니다. OpenAI API 키를 확인해주세요.");
    } finally {
      setReportLoading(false);
    }
  };

  // ✅ AI 리포트 PDF 내보내기
  const handleExportAIReportPDF = () => {
    if (!aiReport || aiReport === "생성 중...") {
      alert("먼저 AI 리포트를 생성해주세요.");
      return;
    }
    exportReportPDF(aiReport, "weekly");
  };

  // ✅ Slack 전송 핸들러
  const handleSendSlack = async () => {
    if (!aiReport || aiReport === "생성 중...") {
      alert("먼저 AI 리포트를 생성해주세요.");
      return;
    }
    try {
      await sendSlackReport(aiReport);
      alert("✅ Slack 전송 완료!");
    } catch (error) {
      alert("❌ Slack 전송 실패");
    }
  };

  // ✅ 완전 자동 리포트 생성 (Storage + Slack)
  const handleAutoReport = async () => {
    setReportLoading(true);
    try {
      alert("🚀 자동 리포트 생성 시작...\n\n• AI 리포트 생성\n• Firebase Storage 업로드\n• Slack 전송");

      const result = await generateAndShareReport();

      setAiReport(result.report);
      alert(`✅ 자동 리포트 완료!\n\n📎 Storage URL:\n${result.url}\n\nSlack 채널을 확인하세요!`);
    } catch (error) {
      console.error("❌ 자동 리포트 오류:", error);
      alert("❌ 자동 리포트 생성 실패: " + (error instanceof Error ? error.message : "알 수 없는 오류"));
    } finally {
      setReportLoading(false);
    }
  };

  // ✅ Firebase Functions를 통한 PDF 생성 + Slack 전송
  const handleDownloadPDF = async () => {
    try {
      // 로딩 상태 표시
      const loadingAlert = alert("📄 AI 리포트 생성 중... 잠시만 기다려주세요!");

      // Firebase Functions 호출 (로컬 에뮬레이터 또는 실제 배포된 함수)
      const functionUrl = process.env.NODE_ENV === 'development'
        ? 'http://localhost:5001/yago-vibe-spt/us-central1/generateReport'
        : 'https://us-central1-yago-vibe-spt.cloudfunctions.net/generateReport';

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: today,
          forceGenerate: true
        })
      });

      const result = await response.json();

      if (result.success) {
        alert(`✅ ${result.message}\n\n📊 통계:\n• 총 명령어: ${result.data?.totalCommands || 0}건\n• Intent 종류: ${Object.keys(result.data?.intents || {}).length}개`);
      } else {
        alert(`❌ ${result.message}\n\n오류: ${result.error}`);
      }

    } catch (error) {
      console.error('PDF 생성 오류:', error);
      const err = error as Error;
      alert(`❌ PDF 생성에 실패했습니다.\n\n오류: ${err.message}\n\n로컬 PDF 서버를 사용합니다.`);

      // Fallback: 로컬 PDF 서버 사용
      try {
        const response = await fetch('http://localhost:3001/api/test-signature-pdf');
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `YAGO_VIBE_Report_${today}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          alert('📄 로컬 PDF 리포트가 생성되었습니다!');
        }
      } catch (fallbackError) {
        console.error('Fallback PDF 생성 오류:', fallbackError);
        alert('❌ 모든 PDF 생성 방법이 실패했습니다.');
      }
    }
  };

  const handleSlackTest = () => {
    alert('📱 Slack 전송 테스트 기능 (n8n 워크플로 연동 예정)');
  };

  const handleViewLogs = () => {
    window.open('/voice-map-dashboard', '_blank');
  };

  const handleExportIR = async (type: "pdf" | "pptx") => {
    try {
      alert(`📊 ${type.toUpperCase()} IR 리포트 생성 중...`);
      const res = await fetch(`/api/exportReport?type=${type}`, {
        method: "POST",
      });
      const data = await res.json();
      alert(`${type.toUpperCase()} 생성 완료 ✅\n파일: ${data.filePath}`);
    } catch {
      alert("IR 리포트 내보내기 실패");
    }
  };

  const handleGenerateIRSlides = async () => {
    try {
      const loadingMsg = alert("📈 IR 슬라이드 생성 중... 잠시만 기다려주세요!");

      const functionUrl = import.meta.env.VITE_FUNCTIONS_URL ||
        `https://asia-northeast3-yago-vibe-spt.cloudfunctions.net/generateIRSlides`;

      const res = await fetch(functionUrl, { method: "POST" });
      const data = await res.json();

      alert(`📊 IR 슬라이드 생성 완료 ✅\n파일: ${data.filePath}\n\nFirebase Storage에서 다운로드하세요.`);

      // Slack 알림 (선택)
      if (data.filePath) {
        const slackWebhook = import.meta.env.VITE_SLACK_WEBHOOK_URL;
        if (slackWebhook) {
          await fetch(slackWebhook, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: `📊 *YAGO VIBE IR 슬라이드 생성됨*\n파일: ${data.filePath}`,
            }),
          });
        }
      }
    } catch (error) {
      console.error("IR 슬라이드 생성 실패:", error);
      alert("IR 슬라이드 생성에 실패했습니다.");
    }
  };

  // Top 키워드 계산
  const topKeywords = Object.entries(keywords)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <YagoLayout title="YAGO VIBE 실시간 대시보드">
      <div className="space-y-6">
        {/* 📊 헤더 섹션 */}
        <div className="text-center">
          <h1 className="text-4xl font-display font-bold text-yago-purple mb-2">
            📊 YAGO VIBE 실시간 리포트
          </h1>
          <p className="text-lg text-yago-gray">
            날짜: <strong className="text-yago-purple">{today}</strong> /
            총 명령 <strong className="text-yago-purple">{total}</strong>건
          </p>
        </div>

        {/* 📈 통계 카드 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <YagoStatCard
            title="총 명령어"
            value={total.toLocaleString()}
            change={`+${todayLogs.length} 오늘`}
            trend="up"
            icon="🎙️"
          />
          <YagoStatCard
            title="오늘 명령어"
            value={todayLogs.length}
            change="실시간 업데이트"
            trend="up"
            icon="📅"
          />
          <YagoStatCard
            title="인기 의도"
            value={Object.keys(intents).length > 0 ? Object.entries(intents).sort(([, a], [, b]) => b - a)[0][0] : "없음"}
            change={`${Object.keys(intents).length}개 의도`}
            trend="neutral"
            icon="🎯"
          />
          <YagoStatCard
            title="인기 키워드"
            value={topKeywords.length > 0 ? topKeywords[0][0] : "없음"}
            change={`${topKeywords.length > 0 ? topKeywords[0][1] : 0}회`}
            trend="neutral"
            icon="🔥"
          />
        </div>

        {/* 🧠 AI 요약 카드 섹션 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <AdminSummaryCard
            title="이번 주 신규 사용자"
            value={`${summaryStats.users}명`}
            icon="👥"
            trend="+23%"
            highlight
          />
          <AdminSummaryCard
            title="활성 팀 수"
            value={`${summaryStats.activeTeams}개`}
            icon="⚽"
            trend="+9%"
          />
          <AdminSummaryCard
            title="AI 인사이트 수"
            value={`${summaryStats.insights}건`}
            icon="🧠"
            trend="+12%"
          />
        </div>

        {/* 🧠 AI 자동 요약 */}
        <YagoCard title="🧠 AI 자동 요약" icon="🤖">
          <div className="bg-white/90 p-6 rounded-xl">
            <p className="text-gray-700 whitespace-pre-line leading-relaxed">
              {aiSummary}
            </p>
          </div>
        </YagoCard>

        {/* 📊 AI 리포트 그래프 섹션 */}
        <AdminChart
          title="📊 주간 사용자 활동 통계"
          labels={["월", "화", "수", "목", "금", "토", "일"]}
          dataValues={[23, 41, 38, 52, 45, 33, 28]}
          backgroundColor="rgba(59,130,246,0.5)"
          borderColor="rgba(59,130,246,1)"
        />

        <AdminChart
          title="🏘️ 지역별 경기북부 팀 활동량"
          labels={["포천", "의정부", "양주", "동두천", "연천"]}
          dataValues={[120, 98, 80, 75, 55]}
          backgroundColor="rgba(139,92,246,0.5)"
          borderColor="rgba(139,92,246,1)"
        />

        {/* 📈 AI 리포트 차트 섹션 */}
        <section className="p-4 mt-6 bg-white rounded-2xl shadow-md border border-gray-100">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">📈 AI 리포트 차트</h2>
          <Line data={reportData} options={reportChartOptions} />
        </section>

        {/* 🎮 액션 버튼들 */}
        <YagoCard title="🎮 관리자 액션" icon="⚙️">
          <div className="flex flex-wrap gap-4">
            <YagoButton
              text={reportLoading ? "🚀 자동 리포트 생성 중..." : "🚀 완전 자동 리포트"}
              onClick={handleAutoReport}
              variant="success"
              icon="🚀"
              disabled={reportLoading}
            />
            <YagoButton
              text={reportLoading ? "🧠 AI 리포트 생성 중..." : "🧠 AI 리포트 생성"}
              onClick={handleGenerateAIReport}
              variant="primary"
              icon="🧠"
              disabled={reportLoading}
            />
            <YagoButton
              text="📄 AI 리포트 PDF 저장"
              onClick={handleExportAIReportPDF}
              variant="accent"
              icon={<FileDown className="w-4 h-4" />}
            />
            <YagoButton
              text="📱 Slack 전송"
              onClick={handleSendSlack}
              variant="secondary"
              icon="📱"
            />
            <YagoButton
              text="📄 AI 리포트 다운로드"
              onClick={handleDownloadPDF}
              variant="primary"
              icon="📄"
            />
            <YagoButton
              text="📊 주간 리포트 생성"
              onClick={handleWeeklyReport}
              variant="primary"
              icon="📊"
            />
            <YagoButton
              text="📑 PDF IR 내보내기"
              onClick={() => handleExportIR("pdf")}
              variant="accent"
              icon={<FileDown className="w-4 h-4" />}
            />
            <YagoButton
              text="📊 PPTX 슬라이드"
              onClick={() => handleExportIR("pptx")}
              variant="secondary"
              icon={<Presentation className="w-4 h-4" />}
            />
            <YagoButton
              text="📈 IR 슬라이드 자동 생성"
              onClick={handleGenerateIRSlides}
              variant="success"
              icon="📈"
            />
            <YagoButton
              text="🚀 완전 전환 API (이번주)"
              onClick={() => handleCompleteMigrationAPI("thisweek")}
              variant="accent"
              icon="🚀"
            />
            <YagoButton
              text="📅 완전 전환 API (지난주)"
              onClick={() => handleCompleteMigrationAPI("lastweek")}
              variant="accent"
              icon="📅"
            />
            <YagoButton
              text="📱 Slack으로 전송"
              onClick={handleSlackTest}
              variant="secondary"
              icon="📱"
            />
            <YagoButton
              text="📍 Geo Analytics"
              onClick={() => window.location.href = '/admin/geo'}
              variant="secondary"
              icon="📍"
            />
            <YagoButton
              text="🧠 AI Insights"
              onClick={() => window.location.href = '/admin/insights'}
              variant="accent"
              icon="🧠"
            />
            <YagoButton
              text="📄 Insights Page"
              onClick={() => window.location.href = '/admin/insights-page'}
              variant="secondary"
              icon="📄"
            />
            <YagoButton
              text="📅 리포트 히스토리"
              onClick={() => window.location.href = '/admin/reports'}
              variant="secondary"
              icon="📅"
            />
            <YagoButton
              text="🎙️ 음성 어시스턴트"
              onClick={() => window.location.href = '/voice-assistant'}
              variant="accent"
              icon="🎙️"
            />
            <YagoButton
              text="📊 상세 로그 보기"
              onClick={handleViewLogs}
              variant="secondary"
              icon="📊"
            />
            <YagoButton
              text="🔄 새로고침"
              onClick={() => window.location.reload()}
              variant="outline"
              icon="🔄"
            />
          </div>
        </YagoCard>

        {/* 🧠 AI 리포트 섹션 */}
        {aiReport && (
          <YagoCard title="🧠 AI 주간 리포트" icon="🤖" gradient>
            <div className="bg-white/20 p-6 rounded-xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-semibold">OpenAI GPT-4o 분석</h3>
                {aiReport !== "생성 중..." && (
                  <button
                    onClick={handleExportAIReportPDF}
                    className="bg-white text-yago-purple px-4 py-2 rounded-lg hover:bg-gray-100 transition"
                  >
                    📄 PDF 저장
                  </button>
                )}
              </div>
              <div className="text-white/90 whitespace-pre-line leading-relaxed">
                {aiReport}
              </div>
            </div>
          </YagoCard>
        )}

        {/* 📈 의도별 차트 */}
        <YagoCard title="🎯 의도별 명령 통계" icon="📊">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yago-purple"></div>
            </div>
          ) : (
            <div className="h-64">
              <Bar data={chartData} options={chartOptions} />
            </div>
          )}
        </YagoCard>

        {/* 🔥 상위 키워드 */}
        {topKeywords.length > 0 && (
          <YagoCard title="🔥 상위 키워드 Top 5" icon="🔥">
            <div className="space-y-3">
              {topKeywords.map(([keyword, count], index) => (
                <div key={keyword} className="flex items-center justify-between p-3 bg-yago-soft rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-yago-purple text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="font-medium text-gray-800">{keyword}</span>
                  </div>
                  <span className="px-3 py-1 bg-yago-purple text-white text-sm font-semibold rounded-full">
                    {count}회
                  </span>
                </div>
              ))}
            </div>
          </YagoCard>
        )}

        {/* 📋 최근 명령 로그 */}
        <YagoCard title="📋 최근 명령 로그" icon="📝">
          <div className="max-h-64 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-center text-yago-gray py-8">
                <div className="text-4xl mb-2">📭</div>
                <p>아직 로그가 없습니다.</p>
                <p className="text-sm">음성 명령을 사용하면 여기에 표시됩니다.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {logs.slice(0, 20).map((log, i) => (
                  <div key={log.id || i} className="flex items-center justify-between p-3 bg-yago-soft rounded-lg hover:bg-yago-purple/10 transition-colors">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {log.text || "명령 내용 없음"}
                      </p>
                      <p className="text-xs text-yago-gray">
                        {log.ts?.seconds ? dayjs(log.ts.seconds * 1000).format('MM-DD HH:mm:ss') : "시간 없음"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {log.keyword && (
                        <span className="px-2 py-1 bg-yago-pink/10 text-yago-pink text-xs rounded-full">
                          {log.keyword}
                        </span>
                      )}
                      <span className="px-2 py-1 bg-yago-purple/10 text-yago-purple text-xs rounded-full">
                        {log.intent || "미확인"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </YagoCard>

        {/* 🚀 빠른 링크 */}
        <YagoCard title="🚀 빠른 링크" icon="🔗" gradient>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <a
              href="/voice-map"
              className="p-4 bg-white/20 rounded-xl text-center hover:bg-white/30 transition-colors"
            >
              <div className="text-2xl mb-2">🗺️</div>
              <div className="text-sm font-medium">음성 지도</div>
            </a>
            <a
              href="/voice-map-dashboard"
              className="p-4 bg-white/20 rounded-xl text-center hover:bg-white/30 transition-colors"
            >
              <div className="text-2xl mb-2">📊</div>
              <div className="text-sm font-medium">로그 대시보드</div>
            </a>
            <a
              href="http://localhost:3001/api/test-signature-pdf"
              target="_blank"
              className="p-4 bg-white/20 rounded-xl text-center hover:bg-white/30 transition-colors"
            >
              <div className="text-2xl mb-2">📄</div>
              <div className="text-sm font-medium">PDF 테스트</div>
            </a>
            <a
              href="#"
              className="p-4 bg-white/20 rounded-xl text-center hover:bg-white/30 transition-colors"
            >
              <div className="text-2xl mb-2">⚙️</div>
              <div className="text-sm font-medium">설정</div>
            </a>
          </div>
        </YagoCard>
      </div>
    </YagoLayout>
  );
}
