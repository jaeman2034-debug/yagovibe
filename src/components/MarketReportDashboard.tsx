import React, { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Volume2,
  BarChart3,
  Users,
  PlayCircle,
  Filter,
  Download,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { CSVLink } from "react-csv";
import AIAutoInsightCard from "./AIAutoInsightCard";
import AIInsightWordCloud from "./AIInsightWordCloud";

interface Report {
  id: string;
  title?: string;
  ttsUrl?: string;
  audioUrl?: string;
  pdfUrl?: string;
  notionUrl?: string;
  author?: string;
  date?: any;
  createdAt?: any;
  summary?: string;
  [key: string]: any;
}

type WeeklySeriesData = {
  label: string;
  total: number;
  tts: number;
  pdf: number;
};

function toTs(v: any): number | null {
  if (!v) return null;
  if (typeof v?.seconds === "number") return v.seconds * 1000;
  if (typeof v === "string") return new Date(v).getTime();
  if (typeof v === "number") return v;
  return null;
}

function weekKey(d: Date): { year: number; week: number } {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((+date - +yearStart) / 86400000 + 1) / 7);
  return { year: date.getUTCFullYear(), week: weekNo };
}

function labelFromKey(k: { year: number; week: number }) {
  return `${String(k.year).slice(2)}W${String(k.week).padStart(2, "0")}`;
}

function buildWeeklySeries(rows: Report[], weeks: number): WeeklySeriesData[] {
  const now = new Date();
  const keys: { year: number; week: number }[] = [];
  let cur = new Date(now);

  for (let i = 0; i < weeks; i++) {
    const k = weekKey(cur);
    keys.unshift(k);
    cur.setUTCDate(cur.getUTCDate() - 7);
  }

  const index = new Map(keys.map((k, i) => [`${k.year}-${k.week}`, i]));
  const series = keys.map((k) => ({ label: labelFromKey(k), total: 0, tts: 0, pdf: 0 }));

  rows.forEach((r) => {
    const ts = toTs(r.createdAt || r.date);
    if (!ts) return;

    const k = weekKey(new Date(ts));
    const key = `${k.year}-${k.week}`;
    const pos = index.get(key);

    if (pos == null) return;

    series[pos].total += 1;
    if (r.audioUrl || r.ttsUrl) series[pos].tts += 1;
    if (r.pdfUrl) series[pos].pdf += 1;
  });

  return series;
}

function DashboardCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="border border-neutral-200 dark:border-gray-700 shadow-sm">
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-neutral-500 dark:text-gray-400">{title}</p>
          <h2 className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{value}</h2>
        </div>
        <div className="p-2 rounded-xl bg-neutral-100 dark:bg-gray-700 text-neutral-600 dark:text-gray-300">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ReportDashboard() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [authorFilter, setAuthorFilter] = useState("");
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    const q = query(collection(db, "reports"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Report[];
        setReports(data);
        setLoading(false);
      },
      (error) => {
        console.error("Firestore 구독 오류:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // 필터링된 리포트 목록
  const filteredReports = useMemo(() => {
    let filtered = [...reports];

    // 날짜 필터
    if (startDate) {
      const start = new Date(startDate).getTime();
      filtered = filtered.filter((r) => {
        const ts = toTs(r.createdAt || r.date);
        return ts !== null && ts >= start;
      });
    }

    if (endDate) {
      const end = new Date(endDate).getTime() + 24 * 60 * 60 * 1000; // 하루 끝까지
      filtered = filtered.filter((r) => {
        const ts = toTs(r.createdAt || r.date);
        return ts !== null && ts <= end;
      });
    }

    // 작성자 필터
    if (authorFilter) {
      filtered = filtered.filter((r) => {
        const author = (r.author ?? "익명").toLowerCase();
        return author.includes(authorFilter.toLowerCase());
      });
    }

    // 키워드 필터 (제목, 요약 검색)
    if (keyword) {
      const keywordLower = keyword.toLowerCase();
      filtered = filtered.filter((r) => {
        const title = (r.title ?? "").toLowerCase();
        const summary = (r.summary ?? "").toLowerCase();
        return title.includes(keywordLower) || summary.includes(keywordLower);
      });
    }

    return filtered;
  }, [reports, startDate, endDate, authorFilter, keyword]);

  // CSV 데이터 준비
  const csvData = useMemo(() => {
    return filteredReports.map((r) => {
      const dateStr = r.date?.toDate
        ? r.date.toDate().toISOString().slice(0, 10)
        : r.date
        ? new Date(r.date).toISOString().slice(0, 10)
        : r.createdAt?.toDate
        ? r.createdAt.toDate().toISOString().slice(0, 10)
        : r.createdAt
        ? new Date(r.createdAt).toISOString().slice(0, 10)
        : "날짜 미상";

      return {
        ID: r.id,
        제목: r.title || "(제목 없음)",
        작성자: r.author || "익명",
        날짜: dateStr,
        TTS: r.audioUrl || r.ttsUrl ? "있음" : "없음",
        PDF: r.pdfUrl ? "있음" : "없음",
        요약: r.summary || "",
      };
    });
  }, [filteredReports]);

  // 필터 활성 상태 확인
  const hasActiveFilters = useMemo(() => {
    return !!(startDate || endDate || authorFilter || keyword);
  }, [startDate, endDate, authorFilter, keyword]);

  const total = filteredReports.length;
  const ttsCount = filteredReports.filter((r) => r.audioUrl || r.ttsUrl).length;
  const pdfCount = filteredReports.filter((r) => r.pdfUrl).length;
  const authorCount = new Set(filteredReports.map((r) => r.author ?? "익명")).size;

  const recent = filteredReports.slice(0, 5);
  const weeklySeries = useMemo(() => buildWeeklySeries(reports, 12), [reports]);
  const weekly = useMemo(() => buildWeeklySeries(filteredReports, 12), [filteredReports]);

  return (
        <div className="space-y-6 p-6">
          {/* AI 주간 인사이트 카드 */}
          <AIAutoInsightCard />

          {/* AI 키워드 시각화 카드 */}
          <AIInsightWordCloud />

      {/* 필터 섹션 */}
      <Card className="border border-neutral-200 dark:border-gray-700 shadow-sm">
        <CardHeader>
          <CardTitle>🔍 리포트 필터</CardTitle>
          <CardDescription>기간, 작성자, 키워드로 리포트를 검색하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                시작일
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                종료일
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                작성자
              </label>
              <Input
                type="text"
                placeholder="작성자 검색..."
                value={authorFilter}
                onChange={(e) => setAuthorFilter(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                키워드
              </label>
              <Input
                type="text"
                placeholder="제목/요약 검색..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <DashboardCard
          title={hasActiveFilters ? "필터링된 리포트" : "전체 리포트"}
          value={total}
          icon={<FileText className="h-5 w-5" />}
        />
        <DashboardCard title="음성 리포트(TTS)" value={ttsCount} icon={<Volume2 className="h-5 w-5" />} />
        <DashboardCard title="PDF 첨부" value={pdfCount} icon={<BarChart3 className="h-5 w-5" />} />
        <DashboardCard title="작성자 수" value={authorCount} icon={<Users className="h-5 w-5" />} />
      </div>

      <Card className="border border-neutral-200 dark:border-gray-700 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>📈 필터링된 주간 트렌드</CardTitle>
            <CardDescription>선택된 조건에 맞는 리포트 생성 추이</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStartDate("");
                setEndDate("");
                setAuthorFilter("");
                setKeyword("");
              }}
            >
              <Filter className="h-4 w-4 mr-1" /> 초기화
            </Button>
            <CSVLink
              data={csvData}
              filename={`reports_${Date.now()}.csv`}
              onClick={() => {
                if (csvData.length === 0) {
                  alert("내보낼 데이터가 없습니다.");
                  return false;
                }
              }}
            >
              <Button size="sm" variant="default" disabled={csvData.length === 0}>
                <Download className="h-4 w-4 mr-1" /> CSV 내보내기 ({csvData.length}개)
              </Button>
            </CSVLink>
          </div>
        </CardHeader>
        <CardContent className="h-[360px]">
          {loading ? (
            <Skeleton className="h-full w-full" />
          ) : weekly.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-neutral-500 dark:text-gray-400 text-center">
                필터링된 데이터가 없습니다.
                <br />
                <span className="text-xs">다른 조건으로 검색해보세요.</span>
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weekly} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" interval={0} tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="total" name="전체" strokeWidth={2} dot={false} stroke="#6366f1" />
                <Line type="monotone" dataKey="tts" name="TTS" strokeWidth={2} dot={false} stroke="#10b981" />
                <Line type="monotone" dataKey="pdf" name="PDF" strokeWidth={2} dot={false} stroke="#f59e0b" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="border border-neutral-200 dark:border-gray-700 shadow-sm">
        <CardHeader>
          <CardTitle>📊 주간 리포트 통계 (최근 12주 - 전체)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : weeklySeries.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-gray-400 text-center py-10">
              차트 데이터가 없습니다.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weeklySeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="label"
                  stroke="#6b7280"
                  style={{ fontSize: "12px" }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis stroke="#6b7280" style={{ fontSize: "12px" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#6366f1"
                  strokeWidth={2}
                  name="전체 리포트"
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="tts"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="TTS 리포트"
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="pdf"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  name="PDF 리포트"
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="border border-neutral-200 dark:border-gray-700 shadow-sm">
        <CardHeader>
          <CardTitle>📈 주간 리포트 비교 (막대 차트)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : weeklySeries.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-gray-400 text-center py-10">
              차트 데이터가 없습니다.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklySeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="label"
                  stroke="#6b7280"
                  style={{ fontSize: "12px" }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis stroke="#6b7280" style={{ fontSize: "12px" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar dataKey="total" fill="#6366f1" name="전체 리포트" />
                <Bar dataKey="tts" fill="#10b981" name="TTS 리포트" />
                <Bar dataKey="pdf" fill="#f59e0b" name="PDF 리포트" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="border border-neutral-200 dark:border-gray-700 shadow-sm">
        <CardHeader>
          <CardTitle>🎧 최근 리포트 5개</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-gray-400">리포트 데이터가 없습니다.</p>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {recent.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate max-w-[280px] text-gray-900 dark:text-white">
                      {r.title ?? "(제목 없음)"}
                    </h4>
                    <p className="text-xs text-neutral-500 dark:text-gray-400">{r.author ?? "익명"}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {(r.audioUrl || r.ttsUrl) && (
                      <PlayCircle className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                    )}
                    {r.pdfUrl && (
                      <FileText className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
