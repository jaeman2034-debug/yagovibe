import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Zap, Target } from "lucide-react";

interface SimulationResultCardProps {
    sim: {
        predicted?: {
            predicted_score?: number;
            confidence?: number;
            model_used?: string;
        };
        params?: Record<string, string>;
        payload?: {
            snr_db?: number;
            speech_blocks_per_min?: number;
            coverage?: number;
            gaps?: number;
            overlaps?: number;
            vad_aggressiveness?: string;
            noise_suppression?: string;
        };
        createdAt?: any;
    } | null;
    baseline?: number; // 기준 점수 (비교용)
}

/**
 * Step 49: Digital Twin 시뮬레이션 결과 카드
 * 튜닝 파라미터의 효과를 예측한 결과를 표시
 */
export default function SimulationResultCard({ sim, baseline }: SimulationResultCardProps) {
    if (!sim) {
        return (
            <Card className="shadow-sm border-gray-200 dark:border-gray-800">
                <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">
                        시뮬레이션 결과가 없습니다.
                    </div>
                </CardContent>
            </Card>
        );
    }

    const predicted = sim.predicted || {};
    const predictedScore = predicted.predicted_score || 0;
    const confidence = predicted.confidence || 0.7;
    const params = sim.params || {};
    const payload = sim.payload || {};

    // 기준 점수와 비교
    const delta = baseline !== undefined ? predictedScore - baseline : null;
    const improvement = delta !== null && delta > 0;

    return (
        <Card className="shadow-sm border-purple-200 dark:border-purple-800">
            <CardContent className="p-4 md:p-6 space-y-4">
                {/* 제목 */}
                <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    <div className="text-sm text-muted-foreground">Digital Twin Simulation</div>
                    {predicted.model_used && (
                        <Badge variant="outline" className="text-xs ml-auto">
                            {predicted.model_used === "actual" ? "ML Model" : "Linear"}
                        </Badge>
                    )}
                </div>

                {/* 예상 품질 점수 */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        <div className="text-lg font-semibold">
                            예상 품질 점수: {predictedScore.toFixed(3)}
                        </div>
                        {confidence && (
                            <Badge variant="secondary" className="text-xs">
                                신뢰도: {(confidence * 100).toFixed(0)}%
                            </Badge>
                        )}
                    </div>

                    {/* 기준 점수와 비교 */}
                    {delta !== null && (
                        <div className={`flex items-center gap-2 text-sm ${
                            improvement
                                ? "text-green-600 dark:text-green-400"
                                : delta < 0
                                ? "text-red-600 dark:text-red-400"
                                : "text-gray-600 dark:text-gray-400"
                        }`}>
                            {improvement ? (
                                <TrendingUp className="h-4 w-4" />
                            ) : delta < 0 ? (
                                <TrendingDown className="h-4 w-4" />
                            ) : null}
                            <span>
                                기준 대비: {delta > 0 ? "+" : ""}
                                {delta.toFixed(3)} (
                                {baseline?.toFixed(3)} → {predictedScore.toFixed(3)})
                            </span>
                        </div>
                    )}
                </div>

                {/* 튜닝 파라미터 */}
                {Object.keys(params).length > 0 && (
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
                        <div className="text-xs font-medium text-muted-foreground mb-2">
                            적용된 파라미터
                        </div>
                        <ul className="space-y-1 text-sm">
                            {Object.entries(params).map(([k, v]) => (
                                <li key={k} className="flex items-center gap-2">
                                    <span className="text-muted-foreground">{k}:</span>
                                    <span className="font-medium">{String(v)}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* 입력 특징 (상세 정보) */}
                {payload && (
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
                        <div className="text-xs font-medium text-muted-foreground mb-2">
                            입력 특징
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                            {payload.snr_db !== undefined && (
                                <div>
                                    <span className="text-muted-foreground">SNR: </span>
                                    <span className="font-medium">{payload.snr_db.toFixed(1)} dB</span>
                                </div>
                            )}
                            {payload.speech_blocks_per_min !== undefined && (
                                <div>
                                    <span className="text-muted-foreground">Blocks/min: </span>
                                    <span className="font-medium">
                                        {payload.speech_blocks_per_min.toFixed(0)}
                                    </span>
                                </div>
                            )}
                            {payload.coverage !== undefined && (
                                <div>
                                    <span className="text-muted-foreground">Coverage: </span>
                                    <span className="font-medium">
                                        {(payload.coverage * 100).toFixed(1)}%
                                    </span>
                                </div>
                            )}
                            {payload.gaps !== undefined && (
                                <div>
                                    <span className="text-muted-foreground">Gaps: </span>
                                    <span className="font-medium">{payload.gaps}</span>
                                </div>
                            )}
                            {payload.overlaps !== undefined && (
                                <div>
                                    <span className="text-muted-foreground">Overlaps: </span>
                                    <span className="font-medium">{payload.overlaps}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 생성 시간 */}
                {sim.createdAt && (
                    <div className="text-xs text-muted-foreground pt-2 border-t border-gray-200 dark:border-gray-800">
                        생성:{" "}
                        {sim.createdAt?.toDate?.()?.toLocaleString() ||
                            new Date(sim.createdAt).toLocaleString()}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

