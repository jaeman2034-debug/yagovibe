// src/pages/voice/VoiceMapDashboard.tsx
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query, limit } from "firebase/firestore";
import { db } from "@/core/firebase"; // ✅ 실제 파일 위치에 맞게 수정
import { buildVoiceLogSummary } from "@/lib/voice/buildVoiceLogSummary";
import { saveAs } from "file-saver";
import YagoLayout from "@/layouts/YagoLayout";
import { YagoButton, YagoCard, YagoStatCard } from "@/components/ui/YagoComponents";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    ResponsiveContainer,
} from "recharts";

type Row = {
    id: string;
    ts?: { seconds: number } | null;
    uid?: string | null;
    text?: string;
    intent?: string;
    action?: string;
    keyword?: string;
    lat?: number;
    lng?: number;
    resultCount?: number;
    note?: string;
};

function toDate(ts?: { seconds: number } | null) {
    if (!ts?.seconds) return "";
    const d = new Date(ts.seconds * 1000);
    return d.toLocaleString("ko-KR");
}

export default function VoiceMapDashboard() {
    const [rows, setRows] = useState<Row[]>([]);
    const [intentFilter, setIntentFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [aiSummary, setAiSummary] = useState("요약 대기 중...");

    useEffect(() => {
        const q = query(collection(db, "voice_logs"), orderBy("ts", "desc"), limit(300));
        const unsub = onSnapshot(q, (snap) => {
            const list: Row[] = [];
            snap.forEach((doc) => list.push({ id: doc.id, ...(doc.data() as any) }));
            setRows(list);
        });
        return () => unsub();
    }, []);

    const filtered = useMemo(() => {
        return rows.filter((r) => {
            const byIntent = intentFilter === "all" || (r.intent ?? "미확인") === intentFilter;
            const inSearch =
                !search ||
                (r.text ?? "").includes(search) ||
                (r.keyword ?? "").includes(search) ||
                (r.action ?? "").includes(search);
            return byIntent && inSearch;
        });
    }, [rows, intentFilter, search]);

    const statsByIntent = useMemo(() => {
        const m = new Map<string, number>();
        filtered.forEach((r) => {
            const k = r.intent ?? "미확인";
            m.set(k, (m.get(k) ?? 0) + 1);
        });
        return Array.from(m.entries()).map(([name, value]) => ({ name, value }));
    }, [filtered]);

    const topKeywords = useMemo(() => {
        const m = new Map<string, number>();
        filtered.forEach((r) => {
            const k = r.keyword ?? "";
            if (!k) return;
            m.set(k, (m.get(k) ?? 0) + 1);
        });
        return Array.from(m.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
    }, [filtered]);

    // 추가 통계 계산
    const todayCount = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return filtered.filter((r) => {
            if (!r.ts?.seconds) return false;
            const logDate = new Date(r.ts.seconds * 1000);
            logDate.setHours(0, 0, 0, 0);
            return logDate.getTime() === today.getTime();
        }).length;
    }, [filtered]);

    const topIntent = useMemo(() => {
        const intentCounts = new Map<string, number>();
        filtered.forEach((r) => {
            const intent = r.intent ?? "미확인";
            intentCounts.set(intent, (intentCounts.get(intent) ?? 0) + 1);
        });
        return Array.from(intentCounts.entries())
            .sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-";
    }, [filtered]);

    const topKeyword = topKeywords[0]?.name ?? "-";

    const exportCSV = () => {
        const header =
            "datetime,uid,intent,action,keyword,text,lat,lng,resultCount,note\n";
        const lines = filtered.map((r) =>
            [
                `"${toDate(r.ts ?? null)}"`,
                r.uid ?? "",
                r.intent ?? "",
                r.action ?? "",
                r.keyword ?? "",
                (r.text ?? "").replace(/"/g, '""'),
                r.lat ?? "",
                r.lng ?? "",
                r.resultCount ?? "",
                (r.note ?? "").replace(/"/g, '""'),
            ].join(",")
        );
        const blob = new Blob([header + lines.join("\n")], { type: "text/csv;charset=utf-8" });
        saveAs(blob, `voice_logs_${Date.now()}.csv`);
    };

    const summarizeWithAI = async () => {
        setAiSummary(buildVoiceLogSummary(filtered.slice(0, 100)));
    };

    return (
        <YagoLayout title="Voice Logs Dashboard">
            <div className="space-y-6">
                {/* 📊 통계 카드 */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <YagoStatCard
                        title="총 로그"
                        value={rows.length}
                        icon="📝"
                    />
                    <YagoStatCard
                        title="오늘 로그"
                        value={todayCount}
                        icon="📅"
                    />
                    <YagoStatCard
                        title="인기 의도"
                        value={topIntent}
                        icon="🎯"
                    />
                    <YagoStatCard
                        title="인기 키워드"
                        value={topKeyword}
                        icon="🔥"
                    />
                </div>

                {/* 🎮 필터 및 액션 */}
                <YagoCard title="🎮 필터 및 액션" icon="⚙️">
                    <div className="flex flex-wrap gap-4 items-center">
                        <YagoButton
                            text="📊 CSV 내보내기"
                            onClick={exportCSV}
                            variant="secondary"
                            icon="📊"
                        />
                        <YagoButton
                            text="🔮 AI 요약 생성"
                            onClick={summarizeWithAI}
                            variant="accent"
                            icon="🔮"
                        />
                        <select
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yago-purple focus:border-transparent"
                            value={intentFilter}
                            onChange={(e) => setIntentFilter(e.target.value)}
                        >
                            {["all", "지도열기", "근처검색", "위치이동", "홈이동", "미확인"].map((k) => (
                                <option key={k} value={k}>
                                    {k}
                                </option>
                            ))}
                        </select>
                        <input
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yago-purple focus:border-transparent flex-1 min-w-48"
                            placeholder="텍스트/키워드 검색"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </YagoCard>

                {/* 🧠 AI 요약 */}
                <YagoCard title="🧠 AI 자동 요약" icon="🤖" gradient>
                    <div className="p-4 bg-white/20 rounded-xl">
                        <p className="text-white/90 whitespace-pre-line leading-relaxed">
                            {aiSummary}
                        </p>
                    </div>
                </YagoCard>

                {/* 📈 Intent 통계 */}
                <YagoCard title="📈 Intent별 통계" icon="📊">
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={statsByIntent}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis
                                dataKey="name"
                                tick={{ fontSize: 12 }}
                                stroke="#6B7280"
                            />
                            <YAxis
                                allowDecimals={false}
                                tick={{ fontSize: 12 }}
                                stroke="#6B7280"
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#F9FAFB',
                                    border: '1px solid #E5E7EB',
                                    borderRadius: '8px'
                                }}
                            />
                            <Bar
                                dataKey="value"
                                fill="#4F46E5"
                                radius={[4, 4, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </YagoCard>

                {/* 🔥 상위 키워드 */}
                <YagoCard title="🔥 상위 키워드 Top 5" icon="🔥">
                    <div className="space-y-3">
                        {topKeywords.map((k, index) => (
                            <div key={k.name} className="flex items-center justify-between p-3 bg-yago-soft rounded-lg">
                                <div className="flex items-center gap-3">
                                    <span className="w-6 h-6 bg-yago-purple text-white text-xs font-bold rounded-full flex items-center justify-center">
                                        {index + 1}
                                    </span>
                                    <span className="font-medium text-gray-800">{k.name}</span>
                                </div>
                                <span className="px-3 py-1 bg-yago-purple text-white text-sm font-semibold rounded-full">
                                    {k.count}회
                                </span>
                            </div>
                        ))}
                    </div>
                </YagoCard>

                {/* 📋 로그 테이블 */}
                <YagoCard title="📋 최근 로그" icon="📝">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    {["시간", "intent", "action", "keyword", "text", "result", "note"].map((h) => (
                                        <th key={h} className="text-left py-3 px-2 font-semibold text-yago-purple">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((r) => (
                                    <tr key={r.id} className="border-b border-gray-100 hover:bg-yago-soft/50">
                                        <td className="py-3 px-2 text-gray-600">{toDate(r.ts ?? null)}</td>
                                        <td className="py-3 px-2">
                                            <span className="px-2 py-1 bg-yago-purple/10 text-yago-purple rounded-full text-xs font-medium">
                                                {r.intent ?? "미확인"}
                                            </span>
                                        </td>
                                        <td className="py-3 px-2 text-gray-600">{r.action ?? ""}</td>
                                        <td className="py-3 px-2 text-gray-600">{r.keyword ?? ""}</td>
                                        <td className="py-3 px-2 text-gray-800 max-w-xs truncate">{r.text ?? ""}</td>
                                        <td className="py-3 px-2 text-gray-600">{r.resultCount ?? ""}</td>
                                        <td className="py-3 px-2 text-gray-600">{r.note ?? ""}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </YagoCard>

                <div className="text-center text-yago-gray text-xs">
                    * 최근 300건의 음성 로그를 분석하여 실시간 요약 및 통계가 표시됩니다.
                </div>
            </div>
        </YagoLayout>
    );
}
