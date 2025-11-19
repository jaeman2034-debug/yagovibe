import React, { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  Volume2,
  BarChart3,
  Users,
  PlayCircle,
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

  const total = reports.length;
  const ttsCount = reports.filter((r) => r.audioUrl || r.ttsUrl).length;
  const pdfCount = reports.filter((r) => r.pdfUrl).length;
  const authorCount = new Set(reports.map((r) => r.author ?? "익명")).size;

  const recent = reports.slice(0, 5);
  const weeklySeries = useMemo(() => buildWeeklySeries(reports, 12), [reports]);

  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <DashboardCard title="전체 리포트" value={total} icon={<FileText className="h-5 w-5" />} />
        <DashboardCard title="음성 리포트(TTS)" value={ttsCount} icon={<Volume2 className="h-5 w-5" />} />
        <DashboardCard title="PDF 첨부" value={pdfCount} icon={<BarChart3 className="h-5 w-5" />} />
        <DashboardCard title="작성자 수" value={authorCount} icon={<Users className="h-5 w-5" />} />
      </div>

      <Card className="border border-neutral-200 dark:border-gray-700 shadow-sm">
        <CardHeader>
          <CardTitle>📊 주간 리포트 통계 (최근 12주)</CardTitle>
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
