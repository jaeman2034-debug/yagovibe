import { useEffect, useMemo, useState } from "react";
import * as Sentry from "@sentry/browser";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, Bug } from "lucide-react";
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
} from "recharts";

type PerfBreadcrumb = {
    message?: string;
    category?: string;
    timestamp?: number;
    data?: Record<string, unknown>;
};

type ChartDatum = {
    name: string;
    value: number;
};

export default function AdminPerformanceDashboard(): JSX.Element {
    const [breadcrumbs, setBreadcrumbs] = useState<PerfBreadcrumb[]>([]);

    useEffect(() => {
        const scope = Sentry.getCurrentHub().getScope();
        const rawBreadcrumbs: PerfBreadcrumb[] =
            ((scope as any)?._breadcrumbs as PerfBreadcrumb[] | undefined) ?? [];

        const perfCrumbs = rawBreadcrumbs.filter((crumb) => crumb.category === "perf");
        setBreadcrumbs(perfCrumbs.slice(-20).reverse());
    }, []);

    const chartData = useMemo<ChartDatum[]>(() => {
        if (breadcrumbs.length === 0) {
            return [];
        }

        const metricMap = new Map<string, number[]>();

        breadcrumbs.forEach((crumb) => {
            if (!crumb?.message) {
                return;
            }

            const [namePart, valuePart] = crumb.message.split(":");
            if (!namePart || !valuePart) {
                return;
            }

            const metricName = namePart.trim();
            const numericValue = Number.parseFloat(valuePart.trim());
            if (!Number.isFinite(numericValue)) {
                return;
            }

            const existing = metricMap.get(metricName) ?? [];
            existing.push(numericValue);
            metricMap.set(metricName, existing);
        });

        return Array.from(metricMap.entries()).map(([name, values]) => {
            const sum = values.reduce((acc, cur) => acc + cur, 0);
            const avg = sum / values.length;
            return { name, value: Number(avg.toFixed(2)) };
        });
    }, [breadcrumbs]);

    return (
        <div className="p-6 space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary-500" /> 성능 & 에러 리포트
            </h2>

            <Card>
                <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Core Web Vitals 평균</h3>
                    {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Line type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={3} />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            아직 수집된 Web Vitals 데이터가 없습니다.
                        </p>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-6 space-y-3">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Bug className="w-5 h-5 text-rose-500" /> 최근 성능 로그
                    </h3>
                    {breadcrumbs.length > 0 ? (
                        breadcrumbs.map((crumb, index) => (
                            <div key={`${crumb.timestamp ?? index}-${index}`} className="text-sm border-b border-gray-100 dark:border-gray-700 py-2">
                                <div className="font-medium text-gray-800 dark:text-gray-100">
                                    {crumb.message}
                                </div>
                                {crumb.timestamp && (
                                    <div className="text-xs text-gray-500">
                                        {new Date(crumb.timestamp * 1000).toLocaleString()}
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            아직 기록된 성능 로그가 없습니다.
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

