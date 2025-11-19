import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, TrendingUp, TrendingDown, Clock } from "lucide-react";

interface TuningCardProps {
    tuning: {
        decisions?: Array<{
            module: string;
            param: string;
            value: string;
            reason?: string;
        }>;
        appliedAt?: any;
        feedback?: {
            deltaScore?: number;
            avgScore?: number;
            baselineScore?: number;
            reinforcementScore?: number;
            evaluatedAt?: any;
        };
    } | null;
    trendData?: Array<{
        date: string;
        score: number;
        delta: number;
    }>;
}

/**
 * Step 48: 튜닝 결과 카드 컴포넌트
 * 최근 보정 시각, 수정된 파라미터 목록, 품질 점수 개선 그래프 표시
 */
export default function TuningCard({ tuning, trendData }: TuningCardProps) {
    if (!tuning || !tuning.decisions || tuning.decisions.length === 0) {
        return (
            <Card className="shadow-sm border-gray-200 dark:border-gray-800">
                <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">
                        최근 튜닝 이력이 없습니다.
                    </div>
                </CardContent>
            </Card>
        );
    }

    const decisions = tuning.decisions;
    const feedback = tuning.feedback;
    const appliedAt = tuning.appliedAt;

    return (
        <Card className="shadow-sm border-blue-200 dark:border-blue-800">
            <CardContent className="p-4 md:p-6 space-y-4">
                {/* 제목 */}
                <div className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <div className="text-sm text-muted-foreground">자동 보정 (Closed-Loop Tuning)</div>
                    {appliedAt && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                            <Clock className="h-3 w-3" />
                            {appliedAt?.toDate?.()?.toLocaleString() ||
                                new Date(appliedAt).toLocaleString()}
                        </div>
                    )}
                </div>

                {/* 보정 액션 목록 */}
                <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground mb-2">
                        수정된 파라미터 ({decisions.length}개)
                    </div>
                    <ul className="space-y-2">
                        {decisions.map((d, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                                <Badge
                                    variant="outline"
                                    className={
                                        d.module === "ASR"
                                            ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                                            : d.module === "TTS"
                                            ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                                            : "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300"
                                    }
                                >
                                    {d.module}
                                </Badge>
                                <div className="flex-1">
                                    <div className="font-medium">
                                        {d.param} = <span className="text-blue-600 dark:text-blue-400">{d.value}</span>
                                    </div>
                                    {d.reason && (
                                        <div className="text-xs text-muted-foreground mt-0.5">{d.reason}</div>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* 피드백 (개선 효과) */}
                {feedback && (
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
                        <div className="flex items-center gap-2 mb-2">
                            {feedback.reinforcementScore !== undefined && (
                                <>
                                    {feedback.reinforcementScore > 0 ? (
                                        <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                                    ) : feedback.reinforcementScore < 0 ? (
                                        <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                                    ) : null}
                                </>
                            )}
                            <div className="text-xs font-medium text-muted-foreground">보정 효과</div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                            {feedback.deltaScore !== undefined && (
                                <div>
                                    <span className="text-muted-foreground">변화량: </span>
                                    <span
                                        className={`font-medium ${
                                            feedback.deltaScore > 0
                                                ? "text-green-600 dark:text-green-400"
                                                : feedback.deltaScore < 0
                                                ? "text-red-600 dark:text-red-400"
                                                : ""
                                        }`}
                                    >
                                        {feedback.deltaScore > 0 ? "+" : ""}
                                        {feedback.deltaScore.toFixed(3)}
                                    </span>
                                </div>
                            )}
                            {feedback.avgScore !== undefined && (
                                <div>
                                    <span className="text-muted-foreground">평균 점수: </span>
                                    <span className="font-medium">{feedback.avgScore.toFixed(3)}</span>
                                </div>
                            )}
                            {feedback.baselineScore !== undefined && (
                                <div>
                                    <span className="text-muted-foreground">기준 점수: </span>
                                    <span className="font-medium">{feedback.baselineScore.toFixed(3)}</span>
                                </div>
                            )}
                            {feedback.reinforcementScore !== undefined && (
                                <div>
                                    <span className="text-muted-foreground">보정 점수: </span>
                                    <span
                                        className={`font-medium ${
                                            feedback.reinforcementScore > 0
                                                ? "text-green-600 dark:text-green-400"
                                                : feedback.reinforcementScore < 0
                                                ? "text-red-600 dark:text-red-400"
                                                : ""
                                        }`}
                                    >
                                        {feedback.reinforcementScore > 0 ? "+" : ""}
                                        {feedback.reinforcementScore}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 트렌드 그래프 (옵션) */}
                {trendData && trendData.length > 0 && (
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
                        <div className="text-xs font-medium text-muted-foreground mb-2">
                            품질 점수 변화 추이
                        </div>
                        <div className="space-y-1">
                            {trendData.slice(0, 5).map((d, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs">
                                    <span className="text-muted-foreground w-16">{d.date}</span>
                                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 relative">
                                        <div
                                            className={`h-2 rounded-full ${
                                                d.delta > 0
                                                    ? "bg-green-500"
                                                    : d.delta < 0
                                                    ? "bg-red-500"
                                                    : "bg-gray-400"
                                            }`}
                                            style={{ width: `${Math.min(100, Math.abs(d.delta) * 100)}%` }}
                                        />
                                    </div>
                                    <span className="w-16 text-right">
                                        {d.score.toFixed(2)} ({d.delta > 0 ? "+" : ""}
                                        {d.delta.toFixed(3)})
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

