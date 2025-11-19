import React, { useEffect, useMemo, useRef, useState } from "react";
import { doc, onSnapshot, collection, query, orderBy, limit, getDocs, where, Timestamp } from "firebase/firestore";
import { Play, Pause, FileText, Download, BookOpen, Headphones } from "lucide-react";
import { db } from "@/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { logUserAction, isAdminUser } from "@/utils/auditLog";
import AuditLogTable from "@/components/AuditLogTable";
import { AlertTriangle } from "lucide-react";
import RootCauseCard from "@/components/RootCauseCard";
import TuningCard from "@/components/TuningCard";
import SimulationResultCard from "@/components/SimulationResultCard";
import AdaptiveLearningCard from "@/components/AdaptiveLearningCard";

interface Step42_AIInsightsDashboardProps {
    reportId: string;
}

interface SentenceTimestamp {
    start: number;
    end: number;
}

interface QualityMetrics {
    overallScore?: number;
    coverage?: number;
    gaps?: number;
    overlaps?: number;
    avgDur?: number;
}

interface TrendDataPoint {
    date: string;
    score: number;
    coverage: number;
}

const SENTENCE_SPLIT_REGEX = /(?<=[.!?。！？\n|。|\.|?|!|？|！|。])\s+/g;

/**
 * Step 42: AI Insights Dashboard
 * 실시간 품질 메트릭 + 리포트 뷰 + 액션 패널
 */
export default function Step42_AIInsightsDashboard({ reportId }: Step42_AIInsightsDashboardProps) {
    const [content, setContent] = useState<string>("");
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [playing, setPlaying] = useState(false);
    const [currentSentence, setCurrentSentence] = useState<number | null>(null);
    const [sentenceTimestamps, setSentenceTimestamps] = useState<SentenceTimestamp[]>([]);
    const [keywords, setKeywords] = useState<string[]>([]);
    const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
    const [loadingTrend, setLoadingTrend] = useState(false);
    const [anomalyAlerts, setAnomalyAlerts] = useState<any[]>([]);
    const [rootCause, setRootCause] = useState<any>(null);
    const [tuning, setTuning] = useState<any>(null);
    const [tuningTrend, setTuningTrend] = useState<any[]>([]);
    const [simulations, setSimulations] = useState<any[]>([]);
    const [adaptiveLearning, setAdaptiveLearning] = useState<any>(null);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const timeUpdateIntervalRef = useRef<number | null>(null);

    // Step 43: 역할 기반 권한 체크
    const { role, loading: roleLoading, isOwner, isEditor, canEdit, canView } = useRoleAccess(reportId);
    const [isAdmin, setIsAdmin] = useState(false);

    // Firestore에서 리포트 데이터 로드
    useEffect(() => {
        const unsub = onSnapshot(doc(db, "reports", reportId), (snap) => {
            const d = snap.data();
            setContent(d?.content || d?.summary || "");
            setAudioUrl(d?.audioURL || d?.audioUrl || null);
            setSentenceTimestamps(d?.sentenceTimestamps || []);
            setKeywords(d?.keywords || []);
            setQualityMetrics({
                overallScore: d?.lastQualityScore || 0,
            });
            setLoading(false);
        });
        return () => unsub();
    }, [reportId]);

    // 최근 품질 리포트 로드
    useEffect(() => {
        const loadQualityReport = async () => {
            try {
                const q = query(
                    collection(db, "reports", reportId, "qualityReports"),
                    orderBy("createdAt", "desc"),
                    limit(1)
                );
                const snap = await getDocs(q);
                if (!snap.empty) {
                    const data = snap.docs[0].data();
                    const metrics = data.metrics || {};
                    setQualityMetrics({
                        overallScore: metrics.overallScore || 0,
                        coverage: metrics.coverage || 0,
                        gaps: metrics.gaps || 0,
                        overlaps: metrics.overlaps || 0,
                        avgDur: metrics.avgDur || 0,
                    });
                }
            } catch (error) {
                console.error("품질 리포트 로드 실패:", error);
            }
        };
        loadQualityReport();
    }, [reportId]);

    // 4주 트렌드 데이터 로드
    useEffect(() => {
        const loadTrendData = async () => {
            setLoadingTrend(true);
            try {
                // 최근 4주간의 품질 리포트 수집
                const fourWeeksAgo = new Date();
                fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
                
                const q = query(
                    collection(db, "reports", reportId, "qualityReports"),
                    where("createdAt", ">=", Timestamp.fromDate(fourWeeksAgo)),
                    orderBy("createdAt", "asc")
                );
                
                const snap = await getDocs(q);
                const trendMap = new Map<string, { score: number; coverage: number; count: number }>();
                
                snap.forEach((doc) => {
                    const data = doc.data();
                    const metrics = data.metrics || {};
                    const createdAt = data.createdAt?.toDate?.() || new Date();
                    const dateKey = createdAt.toISOString().split("T")[0]; // YYYY-MM-DD
                    
                    const existing = trendMap.get(dateKey) || { score: 0, coverage: 0, count: 0 };
                    trendMap.set(dateKey, {
                        score: existing.score + (metrics.overallScore || 0),
                        coverage: existing.coverage + (metrics.coverage || 0),
                        count: existing.count + 1,
                    });
                });
                
                // 일별 평균 계산 및 정렬
                const trend: TrendDataPoint[] = Array.from(trendMap.entries())
                    .map(([date, data]) => ({
                        date: new Date(date).toLocaleDateString("ko-KR", { month: "short", day: "numeric" }),
                        score: data.count > 0 ? data.score / data.count : 0,
                        coverage: data.count > 0 ? data.coverage / data.count : 0,
                    }))
                    .sort((a, b) => {
                        const dateA = new Date(a.date);
                        const dateB = new Date(b.date);
                        return dateA.getTime() - dateB.getTime();
                    });
                
                setTrendData(trend);
            } catch (error) {
                console.error("트렌드 데이터 로드 실패:", error);
            } finally {
                setLoadingTrend(false);
            }
        };
        loadTrendData();
    }, [reportId]);

    const sentences = useMemo(
        () => content.split(SENTENCE_SPLIT_REGEX).filter(Boolean).map(s => s.trim()).filter(Boolean),
        [content]
    );

    // 검색 필터링
    const filteredSentences = useMemo(() => {
        if (!searchQuery) return sentences;
        const lower = searchQuery.toLowerCase();
        return sentences.filter(s => s.toLowerCase().includes(lower));
    }, [sentences, searchQuery]);

    // 타임스탬프 포맷팅
    const fmt = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    // 오디오 재생/일시정지
    const togglePlay = () => {
        if (!audioRef.current || !audioUrl) return;

        if (playing) {
            audioRef.current.pause();
            setPlaying(false);
            if (timeUpdateIntervalRef.current) {
                clearInterval(timeUpdateIntervalRef.current);
                timeUpdateIntervalRef.current = null;
            }
        } else {
            audioRef.current.play().then(() => {
                setPlaying(true);
                startTimeTracking();
            }).catch((error) => {
                console.error("오디오 재생 실패:", error);
            });
        }
    };

    // 현재 재생 중인 문장 추적
    const startTimeTracking = () => {
        if (timeUpdateIntervalRef.current) {
            clearInterval(timeUpdateIntervalRef.current);
        }

        timeUpdateIntervalRef.current = window.setInterval(() => {
            if (!audioRef.current) return;

            const currentTime = audioRef.current.currentTime;
            const idx = sentenceTimestamps.findIndex(
                (ts) => currentTime >= ts.start && currentTime <= ts.end
            );

            if (idx >= 0 && idx !== currentSentence) {
                setCurrentSentence(idx);
            }
        }, 100);
    };

    // 특정 문장으로 이동
    const seekToSentence = (index: number) => {
        if (!audioRef.current || !sentenceTimestamps[index]) return;

        const ts = sentenceTimestamps[index];
        audioRef.current.currentTime = ts.start;
        setCurrentSentence(index);

        if (!playing) {
            togglePlay();
        }
    };

    // Step 43: 관리자 권한 확인
    useEffect(() => {
        setIsAdmin(isAdminUser());
    }, []);

    // Step 46: 리포트 관련 이상 탐지 알림 로드
    useEffect(() => {
        const loadAnomalyAlerts = async () => {
            try {
                // 리포트가 속한 팀 찾기 (reportId로 팀 찾기)
                // 먼저 reports 컬렉션에서 teamId 확인
                const reportDoc = await db.collection("reports").doc(reportId).get();
                const reportData = reportDoc.data();
                const teamId = reportData?.teamId;

                if (!teamId) {
                    // 팀 정보가 없으면 teams 컬렉션에서 찾기
                    const teamsSnap = await db.collection("teams").get();
                    for (const teamDoc of teamsSnap.docs) {
                        const reportsSnap = await db.collection("teams").doc(teamDoc.id)
                            .collection("reports").doc(reportId).get();
                        if (reportsSnap.exists) {
                            const teamId = teamDoc.id;
                            // 해당 팀의 이상 탐지 알림 중 이 리포트와 관련된 것만
                            const alertsRef = collection(db, "teams", teamId, "alerts");
                            const q = query(
                                alertsRef,
                                where("type", "==", "anomaly"),
                                where("reportId", "==", reportId),
                                orderBy("createdAt", "desc"),
                                limit(5)
                            );
                            const snap = await getDocs(q);
                            const alerts = snap.docs.map((doc) => ({
                                id: doc.id,
                                ...doc.data(),
                            }));
                            setAnomalyAlerts(alerts);
                            break;
                        }
                    }
                } else {
                    // 팀 정보가 있으면 직접 조회
                    const alertsRef = collection(db, "teams", teamId, "alerts");
                    const q = query(
                        alertsRef,
                        where("type", "==", "anomaly"),
                        where("reportId", "==", reportId),
                        orderBy("createdAt", "desc"),
                        limit(5)
                    );
                    const snap = await getDocs(q);
                    const alerts = snap.docs.map((doc) => ({
                        id: doc.id,
                        ...doc.data(),
                    }));
                    setAnomalyAlerts(alerts);
                }
            } catch (error) {
                console.error("이상 탐지 알림 로드 실패:", error);
            }
        };
        loadAnomalyAlerts();
    }, [reportId]);

    // Step 47: Root Cause 분석 결과 로드
    useEffect(() => {
        const loadRootCause = async () => {
            try {
                // 리포트가 속한 팀 찾기
                const reportDoc = await db.collection("reports").doc(reportId).get();
                const reportData = reportDoc.data();
                const teamId = reportData?.teamId;

                if (teamId) {
                    // teams/{teamId}/reports/{reportId}/rootCauses 컬렉션에서 최근 분석 결과 가져오기
                    const rootCausesRef = collection(
                        db,
                        "teams",
                        teamId,
                        "reports",
                        reportId,
                        "rootCauses"
                    );
                    const q = query(rootCausesRef, orderBy("createdAt", "desc"), limit(1));
                    const snap = await getDocs(q);
                    if (!snap.empty) {
                        setRootCause(snap.docs[0].data());
                    }
                }
            } catch (error) {
                console.error("Root Cause 로드 실패:", error);
            }
        };
        loadRootCause();
    }, [reportId]);

    // Step 48: 튜닝 결과 로드
    useEffect(() => {
        const loadTuning = async () => {
            try {
                // 리포트가 속한 팀 찾기
                const reportDoc = await db.collection("reports").doc(reportId).get();
                const reportData = reportDoc.data();
                const teamId = reportData?.teamId;

                if (teamId) {
                    // 팀 문서에서 최근 튜닝 정보 가져오기
                    const teamDoc = await db.collection("teams").doc(teamId).get();
                    const teamData = teamDoc.data();
                    if (teamData?.lastTuning) {
                        setTuning(teamData.lastTuning);
                    }

                    // 튜닝 로그에서 피드백 트렌드 가져오기
                    const tuningLogsRef = collection(db, "tuningLogs");
                    const q = query(
                        tuningLogsRef,
                        where("teamId", "==", teamId),
                        orderBy("createdAt", "desc"),
                        limit(10)
                    );
                    const snap = await getDocs(q);
                    const logs = snap.docs.map((doc) => doc.data());

                    // 피드백이 있는 로그만 필터링하여 트렌드 생성
                    const trend = logs
                        .filter((log) => log.feedback?.deltaScore !== undefined)
                        .map((log) => ({
                            date: log.createdAt?.toDate?.()?.toLocaleDateString() || "-",
                            score: log.feedback.avgScore || 0,
                            delta: log.feedback.deltaScore || 0,
                        }))
                        .slice(0, 5);
                    setTuningTrend(trend);
                }
            } catch (error) {
                console.error("튜닝 결과 로드 실패:", error);
            }
        };
        loadTuning();
    }, [reportId]);

    // Step 49: 시뮬레이션 결과 로드
    useEffect(() => {
        const loadSimulations = async () => {
            try {
                // 리포트가 속한 팀 찾기
                const reportDoc = await db.collection("reports").doc(reportId).get();
                const reportData = reportDoc.data();
                const teamId = reportData?.teamId;

                if (teamId) {
                    // teams/{teamId}/simulations 컬렉션에서 최근 3개 시뮬레이션 가져오기
                    const simulationsRef = collection(db, "teams", teamId, "simulations");
                    const q = query(simulationsRef, orderBy("createdAt", "desc"), limit(3));
                    const snap = await getDocs(q);
                    const sims = snap.docs.map((doc) => doc.data());
                    setSimulations(sims);
                }
            } catch (error) {
                console.error("시뮬레이션 결과 로드 실패:", error);
            }
        };
        loadSimulations();
    }, [reportId]);

    // Step 50: Adaptive Learning 상태 로드 (관리자용)
    useEffect(() => {
        const loadAdaptiveLearning = async () => {
            try {
                // 모델 배포 이력 로드 (간단한 예시)
                // 실제로는 modelDeployments 컬렉션에서 로드
                const isAutonomous = true; // 환경 변수 또는 설정에서 읽기
                setAdaptiveLearning({
                    isAutonomous,
                    modelVersions: [], // 실제 데이터는 modelDeployments에서 로드
                    recentAccuracy: [], // 실제 데이터는 BigQuery에서 로드
                });
            } catch (error) {
                console.error("Adaptive Learning 상태 로드 실패:", error);
            }
        };
        loadAdaptiveLearning();
    }, []);

    // 컴포넌트 언마운트 시 정리
    useEffect(() => {
        return () => {
            if (timeUpdateIntervalRef.current) {
                clearInterval(timeUpdateIntervalRef.current);
            }
        };
    }, []);

    // Step 43: 액션 버튼 클릭 핸들러 (로그 기록 포함)
    const handleActionClick = async (action: string, url: string, target?: string) => {
        await logUserAction(reportId, action, target);
        window.open(url, "_blank");
    };

    if (loading || roleLoading) {
        return (
            <div className="p-6 text-center text-muted-foreground">
                로딩 중...
            </div>
        );
    }

    // Step 43: 읽기 전용 모드 체크
    if (!canView) {
        return (
            <div className="p-6 text-center text-red-600">
                이 리포트에 대한 접근 권한이 없습니다.
            </div>
        );
    }

    if (!canEdit) {
        return (
            <div className="space-y-4 p-4 md:p-6">
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-center text-yellow-800 dark:text-yellow-200">
                    읽기 전용 모드입니다. 편집 권한이 필요합니다.
                </div>
                {isAdmin && <AuditLogTable reportId={reportId} />}
            </div>
        );
    }

    return (
        <div className="space-y-4 p-4 md:p-6">
            {/* Step 43: 관리자만 감사 로그 표시 */}
            {isAdmin && <AuditLogTable reportId={reportId} />}
            
            {/* Step 46: 이상 탐지 알림 배너 */}
            {anomalyAlerts.length > 0 && (
                <Card className="shadow-sm border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                    <CardContent className="p-4 md:p-6">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                            <h3 className="font-semibold text-red-600 dark:text-red-400">
                                이상 탐지 경고
                            </h3>
                            <Badge variant="outline" className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                                {anomalyAlerts.length}건
                            </Badge>
                        </div>
                        <div className="space-y-2">
                            {anomalyAlerts.slice(0, 3).map((alert, i) => (
                                <div key={alert.id || i} className="text-sm">
                                    <div className="text-muted-foreground text-xs mb-1">
                                        {alert.createdAt?.toDate?.()?.toLocaleString() || "-"}
                                    </div>
                                    <div className="space-y-1">
                                        {(alert.messages || []).map((msg: string, idx: number) => (
                                            <div key={idx} className="text-red-700 dark:text-red-300">
                                                • {msg}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
            
            {/* Step 47: Root Cause 카드 */}
            <RootCauseCard rc={rootCause} />
            
            {/* Step 48: 튜닝 결과 카드 */}
            <TuningCard tuning={tuning} trendData={tuningTrend} />
            
            {/* Step 50: Adaptive Learning Orchestrator (관리자용) */}
            {isAdmin && adaptiveLearning && (
                <AdaptiveLearningCard
                    isAutonomous={adaptiveLearning.isAutonomous}
                    modelVersions={adaptiveLearning.modelVersions}
                    recentAccuracy={adaptiveLearning.recentAccuracy}
                />
            )}
            
            {/* Step 49: Digital Twin 시뮬레이션 결과 */}
            {simulations.length > 0 && (
                <div className="space-y-4">
                    <div className="text-lg font-semibold">Digital Twin 시뮬레이션 결과</div>
                    {simulations.map((sim, i) => (
                        <SimulationResultCard
                            key={i}
                            sim={sim}
                            baseline={qualityMetrics?.overallScore}
                        />
                    ))}
                </div>
            )}
            
            {/* KPI 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <KPI
                    title="품질 점수"
                    value={qualityMetrics?.overallScore ? qualityMetrics.overallScore.toFixed(2) : "N/A"}
                    footer={qualityMetrics?.overallScore ? 
                        (qualityMetrics.overallScore > 0.8 ? "우수" : 
                         qualityMetrics.overallScore > 0.6 ? "양호" : "개선 필요") : ""}
                />
                <KPI
                    title="커버리지"
                    value={qualityMetrics?.coverage ? `${(qualityMetrics.coverage * 100).toFixed(1)}%` : "N/A"}
                    footer={qualityMetrics?.coverage ? 
                        (qualityMetrics.coverage > 0.9 ? "완벽" : 
                         qualityMetrics.coverage > 0.7 ? "양호" : "부족") : ""}
                />
                <KPI
                    title="키워드 수"
                    value={keywords.length.toString()}
                    footer="추출된 키워드"
                />
                <KPI
                    title="Gaps"
                    value={qualityMetrics?.gaps?.toString() || "N/A"}
                    footer="공백 구간"
                />
                <KPI
                    title="평균 길이"
                    value={qualityMetrics?.avgDur ? `${qualityMetrics.avgDur.toFixed(2)}s` : "N/A"}
                    footer="문장당 평균"
                />
            </div>

            {/* 4주 트렌드 차트 */}
            {trendData.length > 0 && (
                <Card className="shadow-sm">
                    <CardContent className="p-4 md:p-6">
                        <h2 className="text-lg font-semibold mb-4">4주 트렌드 (Score & Coverage)</h2>
                        {loadingTrend ? (
                            <div className="text-center text-muted-foreground py-8">로딩 중...</div>
                        ) : (
                            <LineChart width={800} height={300} data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis yAxisId="left" domain={[0, 1]} label={{ value: "Score", angle: -90, position: "insideLeft" }} />
                                <YAxis yAxisId="right" orientation="right" domain={[0, 1]} label={{ value: "Coverage", angle: 90, position: "insideRight" }} />
                                <Tooltip />
                                <Legend />
                                <Line yAxisId="left" type="monotone" dataKey="score" stroke="#1d4ed8" strokeWidth={2} name="Score" />
                                <Line yAxisId="right" type="monotone" dataKey="coverage" stroke="#10b981" strokeWidth={2} name="Coverage" />
                            </LineChart>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* 리포트 뷰 */}
            <Card className="shadow-sm">
                <CardContent className="p-4 md:p-6">
                    <h2 className="text-lg font-semibold mb-4">리포트 뷰</h2>

                    {/* 오디오 플레이어 */}
                    {audioUrl && (
                        <div className="flex items-center gap-3 mb-4">
                            <audio 
                                ref={audioRef} 
                                src={audioUrl} 
                                preload="metadata" 
                                className="flex-1" 
                            />
                            <Button 
                                onClick={togglePlay} 
                                variant="secondary" 
                                className="shrink-0"
                            >
                                {playing ? (
                                    <>
                                        <Pause className="h-4 w-4 mr-2" />
                                        Pause
                                    </>
                                ) : (
                                    <>
                                        <Play className="h-4 w-4 mr-2" />
                                        Play
                                    </>
                                )}
                            </Button>
                        </div>
                    )}

                    {/* 검색 바 */}
                    <div className="mb-4">
                        <input
                            type="text"
                            placeholder="문장 검색..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                    </div>

                    {/* Tabs */}
                    <Tabs defaultValue="sentences">
                        <TabsList>
                            <TabsTrigger value="sentences">문장 목록</TabsTrigger>
                            <TabsTrigger value="keywords">키워드</TabsTrigger>
                        </TabsList>

                        <TabsContent value="sentences">
                            <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
                                {filteredSentences.map((s, i) => {
                                    const ts = sentenceTimestamps[i];
                                    const found = keywords.filter((k) => 
                                        s.toLowerCase().includes(k.toLowerCase())
                                    );
                                    const isCurrent = currentSentence === i;

                                    return (
                                        <div
                                            key={i}
                                            className={`rounded-2xl border p-3 hover:bg-accent/40 cursor-pointer transition-colors ${
                                                isCurrent ? "bg-purple-100 dark:bg-purple-900/30 border-purple-300" : ""
                                            }`}
                                            onClick={() => seekToSentence(i)}
                                        >
                                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                                                <span>¶ {i + 1}</span>
                                                <span>{ts ? `${fmt(ts.start)}–${fmt(ts.end)}` : "--:--"}</span>
                                            </div>
                                            <p className="text-sm leading-relaxed">{s}</p>
                                            {found.length > 0 && (
                                                <div className="mt-2 flex flex-wrap gap-1">
                                                    {found.slice(0, 6).map((k, idx) => (
                                                        <Badge key={idx} variant="secondary">
                                                            {k}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </TabsContent>

                        <TabsContent value="keywords">
                            <div className="flex flex-wrap gap-2">
                                {keywords.length > 0 ? (
                                    keywords.map((k, i) => (
                                        <Badge
                                            key={i}
                                            variant="outline"
                                            className="cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/30"
                                            onClick={() => {
                                                const idx = sentences.findIndex((s) =>
                                                    s.toLowerCase().includes(k.toLowerCase())
                                                );
                                                if (idx >= 0) seekToSentence(idx);
                                            }}
                                        >
                                            {k}
                                        </Badge>
                                    ))
                                ) : (
                                    <p className="text-sm text-muted-foreground">키워드가 없습니다.</p>
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            {/* 액션 패널 */}
            <Card className="shadow-sm">
                <CardContent className="p-4 md:p-6">
                    <h2 className="text-lg font-semibold mb-3">원클릭 액션</h2>
                    <div className="grid md:grid-cols-3 gap-2">
                        {/* PDF 내보내기 */}
                        <ActionButtonWithLog
                            label="📄 PDF 내보내기"
                            icon={<FileText className="h-4 w-4" />}
                            action="generate PDF"
                            href={`${import.meta.env.VITE_FUNCTIONS_ORIGIN || ""}/generateReportPdf?reportId=${encodeURIComponent(reportId)}`}
                            reportId={reportId}
                        />
                        <ActionButtonWithLog
                            label="🔥 Heatmap PDF"
                            icon={<FileText className="h-4 w-4" />}
                            action="generate Heatmap PDF"
                            href={`${import.meta.env.VITE_FUNCTIONS_ORIGIN || ""}/generateReportPdf?reportId=${encodeURIComponent(reportId)}`}
                            reportId={reportId}
                        />
                        <ActionButtonWithLog
                            label="📚 EPUB 내보내기"
                            icon={<BookOpen className="h-4 w-4" />}
                            action="generate EPUB"
                            href={`${import.meta.env.VITE_FUNCTIONS_ORIGIN || ""}/generateReportEpub?reportId=${encodeURIComponent(reportId)}`}
                            reportId={reportId}
                        />
                        <ActionButtonWithLog
                            label="🔊 Read-Aloud EPUB"
                            icon={<Headphones className="h-4 w-4" />}
                            action="generate Read-Aloud EPUB"
                            href={`${import.meta.env.VITE_FUNCTIONS_ORIGIN || ""}/generateReportEpubSmil?reportId=${encodeURIComponent(reportId)}`}
                            reportId={reportId}
                        />
                        {/* 동기화 */}
                        <ActionButtonWithLog
                            label="📊 Sheets 갱신"
                            icon={<Download className="h-4 w-4" />}
                            action="sync to Sheets"
                            href={`${import.meta.env.VITE_FUNCTIONS_ORIGIN || ""}/exportQualityToSheets`}
                            reportId={reportId}
                        />
                        <ActionButtonWithLog
                            label="📝 Notion 갱신"
                            icon={<Download className="h-4 w-4" />}
                            action="sync to Notion"
                            href={`${import.meta.env.VITE_FUNCTIONS_ORIGIN || ""}/exportQualityToNotion`}
                            reportId={reportId}
                        />
                        {/* AI 리포트 */}
                        <ActionButtonWithLog
                            label="🧠 주간 AI 요약"
                            icon={<FileText className="h-4 w-4" />}
                            action="generate weekly AI summary"
                            href={`${import.meta.env.VITE_FUNCTIONS_ORIGIN || ""}/generateWeeklySummary`}
                            reportId={reportId}
                        />
                        <ActionButtonWithLog
                            label="📈 다음주 예측"
                            icon={<FileText className="h-4 w-4" />}
                            action="predict quality trend"
                            href={`${import.meta.env.VITE_FUNCTIONS_ORIGIN || ""}/predictQualityTrend`}
                            reportId={reportId}
                        />
                        <ActionButtonWithLog
                            label="🎨 시각화 리포트"
                            icon={<FileText className="h-4 w-4" />}
                            action="generate visual report"
                            href={`${import.meta.env.VITE_FUNCTIONS_ORIGIN || ""}/generateVisualQualityReport`}
                            reportId={reportId}
                        />
                        {/* 배치 처리 */}
                        <ActionButtonWithLog
                            label="⚙️ 배치 큐잉"
                            icon={<Download className="h-4 w-4" />}
                            action="enqueue batch processing"
                            href={`${import.meta.env.VITE_FUNCTIONS_ORIGIN || ""}/enqueueReportProcessing?reportIds[]=${encodeURIComponent(reportId)}`}
                            reportId={reportId}
                            target={reportId}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

/**
 * KPI 카드 컴포넌트
 */
function KPI({ title, value, footer }: { 
    title: string; 
    value: React.ReactNode; 
    footer?: string 
}) {
    return (
        <Card className="shadow-sm">
            <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">{title}</div>
                <div className="text-2xl font-semibold mt-1">{value}</div>
                {footer && (
                    <div className="text-xs text-muted-foreground mt-1">{footer}</div>
                )}
            </CardContent>
        </Card>
    );
}

/**
 * 액션 버튼 컴포넌트 (기본)
 */
function ActionButton({ label, href, icon }: { label: string; href: string; icon?: React.ReactNode }) {
    return (
        <a href={href} target="_blank" rel="noreferrer" className="block">
            <Button variant="outline" className="w-full justify-start">
                {icon && <span className="mr-2">{icon}</span>}
                {label}
            </Button>
        </a>
    );
}

/**
 * Step 43: 액션 버튼 컴포넌트 (로그 기록 포함)
 */
function ActionButtonWithLog({ 
    label, 
    href, 
    icon, 
    action, 
    reportId,
    target 
}: { 
    label: string; 
    href: string; 
    icon?: React.ReactNode;
    action: string;
    reportId: string;
    target?: string;
}) {
    const handleClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        await logUserAction(reportId, action, target);
        window.open(href, "_blank");
    };

    return (
        <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={handleClick}
        >
            {icon && <span className="mr-2">{icon}</span>}
            {label}
        </Button>
    );
}

