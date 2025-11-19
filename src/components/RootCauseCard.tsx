import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Mic, Volume2, Gauge } from "lucide-react";

interface RootCauseCardProps {
    rc: {
        summary?: string;
        causes?: Array<{
            label: string;
            score: number;
            evidence: string[];
        }>;
        audio?: {
            snr_db?: number;
            rms_mean?: number;
            speech_blocks_per_min?: number;
            duration_sec?: number;
        };
        metrics?: {
            overallScore?: number;
            coverage?: number;
            gaps?: number;
            overlaps?: number;
        };
        createdAt?: any;
    } | null;
}

/**
 * Step 47: Root Cause 카드 컴포넌트
 * 멀티모달 분석 결과를 카드 형태로 표시
 */
export default function RootCauseCard({ rc }: RootCauseCardProps) {
    if (!rc) {
        return (
            <Card className="shadow-sm border-gray-200 dark:border-gray-800">
                <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">
                        Root Cause 분석 결과가 없습니다.
                    </div>
                </CardContent>
            </Card>
        );
    }

    const causes = rc.causes || [];
    const audio = rc.audio;
    const metrics = rc.metrics;

    return (
        <Card className="shadow-sm border-blue-200 dark:border-blue-800">
            <CardContent className="p-4 md:p-6 space-y-4">
                {/* 제목 */}
                <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <div className="text-sm text-muted-foreground">Root Cause 분석</div>
                </div>

                {/* 요약 */}
                <div className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                    {rc.summary || "특이 원인 추정 불가"}
                </div>

                {/* 원인 목록 */}
                {causes.length > 0 && (
                    <ul className="space-y-2 text-sm">
                        {causes.map((c, i) => (
                            <li key={i} className="flex items-start gap-2">
                                <Badge
                                    variant="outline"
                                    className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 mt-0.5"
                                >
                                    {Math.round(c.score * 100)}%
                                </Badge>
                                <div className="flex-1">
                                    <div className="font-medium">{c.label}</div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        {c.evidence.join("; ")}
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}

                {/* 오디오 특징 */}
                {audio && (
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
                        <div className="text-xs font-medium text-muted-foreground mb-2">
                            오디오 특징
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                            {audio.snr_db !== undefined && (
                                <div className="flex items-center gap-1">
                                    <Mic className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-muted-foreground">SNR:</span>
                                    <span className="font-medium">
                                        {audio.snr_db.toFixed(1)} dB
                                    </span>
                                </div>
                            )}
                            {audio.rms_mean !== undefined && (
                                <div className="flex items-center gap-1">
                                    <Volume2 className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-muted-foreground">RMS:</span>
                                    <span className="font-medium">
                                        {audio.rms_mean.toFixed(4)}
                                    </span>
                                </div>
                            )}
                            {audio.speech_blocks_per_min !== undefined && (
                                <div className="flex items-center gap-1">
                                    <Gauge className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-muted-foreground">Blocks/min:</span>
                                    <span className="font-medium">
                                        {audio.speech_blocks_per_min.toFixed(0)}
                                    </span>
                                </div>
                            )}
                            {audio.duration_sec !== undefined && (
                                <div className="flex items-center gap-1">
                                    <span className="text-muted-foreground">길이:</span>
                                    <span className="font-medium">
                                        {Math.round(audio.duration_sec)}s
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 품질 지표 (간단 표시) */}
                {metrics && (
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
                        <div className="text-xs font-medium text-muted-foreground mb-2">
                            품질 지표
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                            {metrics.overallScore !== undefined && (
                                <div>
                                    <span className="text-muted-foreground">Score: </span>
                                    <span className="font-medium">
                                        {metrics.overallScore.toFixed(2)}
                                    </span>
                                </div>
                            )}
                            {metrics.coverage !== undefined && (
                                <div>
                                    <span className="text-muted-foreground">Coverage: </span>
                                    <span className="font-medium">
                                        {(metrics.coverage * 100).toFixed(1)}%
                                    </span>
                                </div>
                            )}
                            {metrics.gaps !== undefined && (
                                <div>
                                    <span className="text-muted-foreground">Gaps: </span>
                                    <span className="font-medium">{metrics.gaps}</span>
                                </div>
                            )}
                            {metrics.overlaps !== undefined && (
                                <div>
                                    <span className="text-muted-foreground">Overlaps: </span>
                                    <span className="font-medium">{metrics.overlaps}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 생성 시간 */}
                {rc.createdAt && (
                    <div className="text-xs text-muted-foreground pt-2 border-t border-gray-200 dark:border-gray-800">
                        생성:{" "}
                        {rc.createdAt?.toDate?.()?.toLocaleString() ||
                            new Date(rc.createdAt).toLocaleString()}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

