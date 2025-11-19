import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, TrendingUp, Activity, CheckCircle2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

interface ModelVersion {
    version: string;
    deployedAt: string;
    rmse?: number;
    mae?: number;
    dataCount?: number;
}

interface AdaptiveLearningCardProps {
    isAutonomous: boolean;
    modelVersions?: ModelVersion[];
    recentAccuracy?: Array<{
        date: string;
        rmse: number;
        mae: number;
    }>;
}

/**
 * Step 50: Adaptive Learning Orchestrator 상태 카드
 * 자율 학습 모드 상태 및 모델 버전 정보 표시
 */
export default function AdaptiveLearningCard({
    isAutonomous,
    modelVersions = [],
    recentAccuracy = [],
}: AdaptiveLearningCardProps) {
    return (
        <Card className="shadow-sm border-green-200 dark:border-green-800">
            <CardContent className="p-4 md:p-6 space-y-4">
                {/* 제목 및 자율 모드 상태 */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Brain className="h-5 w-5 text-green-600 dark:text-green-400" />
                        <div className="text-sm text-muted-foreground">Adaptive Learning Orchestrator</div>
                    </div>
                    <Badge
                        variant={isAutonomous ? "default" : "outline"}
                        className={
                            isAutonomous
                                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                                : ""
                        }
                    >
                        {isAutonomous ? (
                            <>
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Autonomous Mode: ✅
                            </>
                        ) : (
                            "Manual Mode"
                        )}
                    </Badge>
                </div>

                {/* 최근 모델 버전 */}
                {modelVersions.length > 0 && (
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
                        <div className="text-xs font-medium text-muted-foreground mb-2">
                            최근 모델 버전 (최대 5개)
                        </div>
                        <div className="space-y-2">
                            {modelVersions.slice(0, 5).map((version, i) => (
                                <div key={i} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <Activity className="h-3 w-3 text-muted-foreground" />
                                        <span className="font-medium">{version.version}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        {version.rmse !== undefined && (
                                            <span>RMSE: {version.rmse.toFixed(4)}</span>
                                        )}
                                        {version.mae !== undefined && (
                                            <span>MAE: {version.mae.toFixed(4)}</span>
                                        )}
                                        <span>{new Date(version.deployedAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 예측 정확도 추이 그래프 */}
                {recentAccuracy.length > 0 && (
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                            <div className="text-xs font-medium text-muted-foreground">
                                예측 정확도 추이 (최근 5회)
                            </div>
                        </div>
                        <LineChart width={600} height={200} data={recentAccuracy.slice(0, 5)}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="rmse"
                                stroke="#ef4444"
                                strokeWidth={2}
                                name="RMSE"
                            />
                            <Line
                                type="monotone"
                                dataKey="mae"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                name="MAE"
                            />
                        </LineChart>
                    </div>
                )}

                {/* 자율 모드 설명 */}
                <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
                    <div className="text-xs text-muted-foreground">
                        {isAutonomous
                            ? "자율 학습 모드가 활성화되어 있습니다. 매일 자동으로 모델을 재학습하고 배포합니다."
                            : "수동 모드입니다. 관리자가 모델 배포를 수동으로 관리합니다."}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

