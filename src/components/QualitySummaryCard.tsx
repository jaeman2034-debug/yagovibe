import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface QualityMetrics {
    sentences: number;
    segments: number;
    coverage: number;
    gaps: number;
    overlaps: number;
    avgDur: number;
    overallScore: number;
}

interface QualityReport {
    createdAt: { toDate: () => Date };
    metrics: QualityMetrics;
    status: string;
}

interface QualitySummaryCardProps {
    reportId: string;
}

/**
 * Step 36: 품질 리포트 요약 카드
 * 최근 품질 지표를 표시하는 컴포넌트
 */
export default function QualitySummaryCard({ reportId }: QualitySummaryCardProps) {
    const [q, setQ] = useState<QualityReport | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const ref = collection(db, "reports", reportId, "qualityReports");
                const qs = await getDocs(query(ref, orderBy("createdAt", "desc"), limit(1)));
                const doc = qs.docs[0];
                if (doc) {
                    setQ(doc.data() as QualityReport);
                }
            } catch (error) {
                console.error("품질 리포트 로딩 실패:", error);
            } finally {
                setLoading(false);
            }
        })();
    }, [reportId]);

    if (loading) {
        return (
            <div className="rounded-xl border p-3 text-sm text-muted-foreground">
                로딩 중...
            </div>
        );
    }

    if (!q) {
        return (
            <div className="rounded-xl border p-3 text-sm text-muted-foreground">
                품질 리포트 없음
            </div>
        );
    }

    const m = q.metrics;

    return (
        <div className="rounded-xl border p-4 bg-card">
            <div className="text-sm text-muted-foreground mb-1">최근 품질 리포트</div>
            <div className="text-2xl font-semibold mt-1 mb-3">
                {m.overallScore.toFixed(2)}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">
                    커버리지: <span className="font-medium text-foreground">{Math.round((m.coverage || 0) * 100)}%</span>
                </div>
                <div className="text-muted-foreground">
                    평균 길이: <span className="font-medium text-foreground">{m.avgDur.toFixed(2)}s</span>
                </div>
                <div className="text-muted-foreground">
                    Gaps: <span className="font-medium text-foreground">{m.gaps}</span>
                </div>
                <div className="text-muted-foreground">
                    Overlaps: <span className="font-medium text-foreground">{m.overlaps}</span>
                </div>
            </div>
            {q.createdAt && (
                <div className="mt-2 text-xs text-muted-foreground">
                    {q.createdAt.toDate().toLocaleString("ko-KR")}
                </div>
            )}
        </div>
    );
}

