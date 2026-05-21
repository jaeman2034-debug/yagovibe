import React, { useEffect, useState } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { YagoCard, YagoStatCard } from "@/components/ui/YagoComponents";
import YagoLayout from "@/layouts/YagoLayout";
import dayjs from "dayjs";
import { generateWeeklyReport, generateAndShareReport } from "@/api/generateReport";
import { exportReportPDF } from "@/lib/pdf";
import { sendSlackReport } from "@/api/shareSlack";

type BillingStatus = "trialing" | "active" | "past_due" | "canceled";

interface BillingRow {
  id: string;
  status: BillingStatus;
  mrr: number;
  currency: string;
  eventAtMs: number | null;
}

interface PaymentRow {
  id: string;
  amount: number;
  currency: string;
  paid: boolean;
  eventAtMs: number | null;
}

interface BillingKpi {
  totalSubscriptions: number;
  trial: number;
  active: number;
  pastDue: number;
  canceled: number;
  mrr: number;
}

function toMillis(value: unknown): number | null {
  if (!value) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "object" && typeof (value as { toMillis?: () => number }).toMillis === "function") {
    return (value as { toMillis: () => number }).toMillis();
  }
  return null;
}

function normalizeStatus(raw: unknown): BillingStatus {
  const status = String(raw || "").trim().toLowerCase();
  if (status === "trial" || status === "trialing") return "trialing";
  if (status === "past_due") return "past_due";
  if (status === "canceled") return "canceled";
  return "active";
}

function normalizeCurrency(raw: unknown): string {
  const c = String(raw || "").trim().toUpperCase();
  return c || "KRW";
}

function formatMoney(amount: number, currency = "KRW"): string {
  try {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString("ko-KR")} ${currency}`;
  }
}

function calculateBillingKpi(rows: BillingRow[]): BillingKpi {
  return rows.reduce<BillingKpi>(
    (acc, row) => {
      acc.totalSubscriptions += 1;
      if (row.status === "trialing") acc.trial += 1;
      if (row.status === "active") {
        acc.active += 1;
        acc.mrr += row.mrr;
      }
      if (row.status === "past_due") acc.pastDue += 1;
      if (row.status === "canceled") acc.canceled += 1;
      return acc;
    },
    { totalSubscriptions: 0, trial: 0, active: 0, pastDue: 0, canceled: 0, mrr: 0 }
  );
}

function buildRecentTrend(rows: BillingRow[], days: 7 | 30): Array<{ name: string; count: number }> {
  const now = dayjs();
  const labels = Array.from({ length: days }, (_, idx) => now.subtract(days - 1 - idx, "day"));
  return labels.map((d) => {
    const start = d.startOf("day").valueOf();
    const end = d.endOf("day").valueOf();
    const count = rows.filter((row) => row.eventAtMs && row.eventAtMs >= start && row.eventAtMs <= end).length;
    return { name: d.format("M/D"), count };
  });
}

function buildRevenueTrend(
  rows: PaymentRow[],
  days: 7 | 30,
  currency: string
): Array<{ name: string; amount: number }> {
  const now = dayjs();
  const labels = Array.from({ length: days }, (_, idx) => now.subtract(days - 1 - idx, "day"));
  return labels.map((d) => {
    const start = d.startOf("day").valueOf();
    const end = d.endOf("day").valueOf();
    const amount = rows
      .filter(
        (row) =>
          row.paid &&
          row.currency === currency &&
          row.eventAtMs != null &&
          row.eventAtMs >= start &&
          row.eventAtMs <= end
      )
      .reduce((sum, row) => sum + row.amount, 0);
    return { name: d.format("M/D"), amount };
  });
}

export default function Dashboard() {
  const [aiReport, setAiReport] = useState<string>("");
  const [reportLoading, setReportLoading] = useState(false);
  const [billingRows, setBillingRows] = useState<BillingRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [billingLoading, setBillingLoading] = useState(true);
  const [range, setRange] = useState<7 | 30>(7);

  // ✅ subscriptions 실시간 구독 (Stripe Webhook 미러 기준)
  useEffect(() => {
    const q = query(collection(db, "subscriptions"));
    const unsub = onSnapshot(q, (snap) => {
      const rows: BillingRow[] = snap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        const rawMrr = Number(data.price ?? 0);
        const mrr = Number.isFinite(rawMrr) ? Math.max(0, rawMrr) : 0;
        const eventAtMs =
          toMillis(data.stripeCreatedAt) ?? toMillis(data.updatedAt) ?? toMillis(data.createdAt) ?? null;
        return {
          id: d.id,
          status: normalizeStatus(data.status),
          mrr,
          currency: normalizeCurrency(data.currency),
          eventAtMs,
        };
      });
      setBillingRows(rows);
      setBillingLoading(false);
    });
    return () => unsub();
  }, []);

  // ✅ payments 실시간 구독 (invoice.paid 미러 기준)
  useEffect(() => {
    const q = query(collection(db, "payments"));
    const unsub = onSnapshot(q, (snap) => {
      const rows: PaymentRow[] = snap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        const amount = Number(data.amount ?? 0);
        return {
          id: d.id,
          amount: Number.isFinite(amount) ? Math.max(0, amount) : 0,
          currency: normalizeCurrency(data.currency),
          paid: data.paid !== false,
          eventAtMs: toMillis(data.stripeCreatedAt) ?? toMillis(data.createdAt) ?? null,
        };
      });
      setPayments(rows);
    });
    return () => unsub();
  }, []);

  const today = dayjs().format("YYYY-MM-DD");
  const billingKpi = calculateBillingKpi(billingRows);
  const trendData = buildRecentTrend(billingRows, range);
  const mrrByCurrency = billingRows.reduce<Record<string, number>>((acc, row) => {
    if (row.status !== "active") return acc;
    acc[row.currency] = (acc[row.currency] ?? 0) + row.mrr;
    return acc;
  }, {});
  const mrrCurrencyEntries = Object.entries(mrrByCurrency).sort((a, b) => b[1] - a[1]);
  const currencyBreakdown = mrrCurrencyEntries.map(([currency, amount]) => ({
    currency,
    amount,
    text: `${currency} ${Number(amount).toLocaleString("ko-KR")}`,
  }));
  const [primaryCurrency, primaryMrr] = mrrCurrencyEntries[0] ?? ["KRW", 0];
  const mrrDisplay = formatMoney(primaryMrr, primaryCurrency);
  const mrrChangeLabel =
    mrrCurrencyEntries.length > 1
      ? `${mrrCurrencyEntries.length}개 통화`
      : billingLoading
        ? "동기화 중"
        : primaryCurrency;
  const churnBase = billingKpi.active + billingKpi.canceled;
  const churnRate = churnBase > 0 ? (billingKpi.canceled / churnBase) * 100 : 0;
  const arpu = billingKpi.active > 0 ? primaryMrr / billingKpi.active : 0;
  const arpuDisplay = formatMoney(arpu, primaryCurrency);
  const revenueByCurrency = payments.reduce<Record<string, number>>((acc, row) => {
    acc[row.currency] = (acc[row.currency] ?? 0) + row.amount;
    return acc;
  }, {});
  const revenueSummary = Object.entries(revenueByCurrency)
    .sort((a, b) => b[1] - a[1])
    .map(([currency, amount]) => `${currency} ${Number(amount).toLocaleString("ko-KR")}`)
    .join(" / ");
  const [primaryRevenueCurrency] = Object.keys(revenueByCurrency).sort(
    (a, b) => (revenueByCurrency[b] ?? 0) - (revenueByCurrency[a] ?? 0)
  );
  const revenueTrend = buildRevenueTrend(
    payments,
    range,
    primaryRevenueCurrency || primaryCurrency || "KRW"
  );

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
              text: `📊 *YAGO SPORTS IR 슬라이드 생성됨*\n파일: ${data.filePath}`,
            }),
          });
        }
      }
    } catch (error) {
      console.error("IR 슬라이드 생성 실패:", error);
      alert("IR 슬라이드 생성에 실패했습니다.");
    }
  };

  return (
    <YagoLayout title="YAGO SPORTS 실시간 대시보드">
      <div className="space-y-6">
        {/* 📊 헤더 섹션 */}
        <div className="text-center">
          <h1 className="text-4xl font-display font-bold text-yago-purple mb-2">
            📊 YAGO SPORTS 실시간 리포트
          </h1>
          <p className="text-lg text-yago-gray">
            날짜: <strong className="text-yago-purple">{today}</strong> /
            총 구독 <strong className="text-yago-purple">{billingKpi.totalSubscriptions}</strong>건
          </p>
        </div>

        {/* 📈 통계 카드 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <YagoStatCard
            title="Trial"
            value={billingKpi.trial}
            change="trialing"
            trend="up"
            icon="T"
          />
          <YagoStatCard
            title="Active"
            value={billingKpi.active}
            change="active"
            trend="up"
            icon="A"
          />
          <YagoStatCard
            title="Past Due"
            value={billingKpi.pastDue}
            change="결제 실패"
            trend={billingKpi.pastDue > 0 ? "down" : "neutral"}
            icon="P"
          />
          <YagoCard className="hover:shadow-yago-lg transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yago-gray font-medium">MRR</p>
                <p className="text-2xl font-bold text-yago-purple mt-1">{mrrDisplay}</p>
                <p className="text-xs mt-1 text-green-600">↗ {mrrChangeLabel}</p>
                {currencyBreakdown.length > 1 && (
                  <div className="mt-2 flex flex-wrap gap-x-2 text-[11px] text-gray-500">
                    {currencyBreakdown.map((row) => (
                      <span key={row.currency}>{row.text}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="text-yago-purple/20 text-3xl">₩</div>
            </div>
          </YagoCard>
          <YagoStatCard
            title="Churn"
            value={`${churnRate.toFixed(1)}%`}
            change={`${billingKpi.canceled} / ${churnBase}`}
            trend={churnRate > 10 ? "down" : "neutral"}
            icon="C"
          />
          <YagoStatCard
            title="ARPU"
            value={arpuDisplay}
            change={billingKpi.active > 0 ? `${billingKpi.active} active` : "active 없음"}
            trend="neutral"
            icon="A"
          />
        </div>

        {/* 최근 구독 이벤트 추이 */}
        <section className="p-4 mt-6 bg-white rounded-2xl shadow-md border border-gray-100">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-800">최근 구독 추이</h2>
            <div className="inline-flex items-center rounded-lg border bg-white p-1">
              <button
                onClick={() => setRange(7)}
                className={`h-8 rounded-md px-3 text-xs font-medium ${
                  range === 7 ? "bg-black text-white" : "text-gray-600"
                }`}
              >
                7일
              </button>
              <button
                onClick={() => setRange(30)}
                className={`h-8 rounded-md px-3 text-xs font-medium ${
                  range === 30 ? "bg-black text-white" : "text-gray-600"
                }`}
              >
                30일
              </button>
            </div>
          </div>
          <div className="w-full h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  stroke="#6B7280"
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  stroke="#6B7280"
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#F9FAFB',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#4bc0c0" 
                  strokeWidth={2}
                  dot={{ fill: "#4bc0c0", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {payments.length > 0 && (
          <section className="p-4 bg-white rounded-2xl shadow-md border border-gray-100">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">최근 매출 추이</h2>
            <div className="w-full h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" stroke="#6B7280" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#6B7280" tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#F9FAFB",
                      border: "1px solid #E5E7EB",
                      borderRadius: "8px",
                    }}
                  />
                  <Line type="monotone" dataKey="amount" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              기준 통화: {primaryRevenueCurrency || primaryCurrency || "KRW"} / 누적: {revenueSummary}
            </p>
            {Object.keys(revenueByCurrency).length > 1 && (
              <p className="mt-1 text-xs text-gray-500">다중 통화 포함 (대표 통화 기준 차트 표시)</p>
            )}
          </section>
        )}

        <section className="bg-white rounded-xl border p-5">
          <h3 className="text-base font-semibold mb-4">빠른 실행</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <button
              onClick={handleWeeklyReport}
              className="h-11 rounded-lg bg-black text-white text-sm font-medium"
            >
              리포트 생성
            </button>
            <button
              onClick={handleGenerateIRSlides}
              className="h-11 rounded-lg border bg-white px-4 text-sm font-medium"
            >
              IR 슬라이드 생성
            </button>
            <button
              onClick={() => window.location.reload()}
              className="h-11 rounded-lg border bg-white px-4 text-sm font-medium"
            >
              새로고침
            </button>
          </div>
        </section>

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


      </div>
    </YagoLayout>
  );
}
