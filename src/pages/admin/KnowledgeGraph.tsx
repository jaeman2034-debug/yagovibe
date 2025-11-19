import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import KGExplorer from "@/components/KGExplorer";
import GraphAsk from "@/components/GraphAsk";
import { RefreshCw, Search, MessageSquare, Network } from "lucide-react";
import { isAdminUser } from "@/utils/auditLog";

interface KGData {
    nodes: any[];
    edges: any[];
    meta?: any;
}

/**
 * Step 57: Knowledge Graph 페이지
 * 전역 지식 그래프 시각화 및 탐색
 */
export default function KnowledgeGraph() {
    const [isAdmin, setIsAdmin] = useState(false);
    const [data, setData] = useState<KGData | null>(null);
    const [loading, setLoading] = useState(false);
    const [teamId, setTeamId] = useState<string>("");
    const [days, setDays] = useState<number>(7);
    const [limit, setLimit] = useState<number>(50);
    const [activeTab, setActiveTab] = useState<"graph" | "copilot">("graph");

    useEffect(() => {
        setIsAdmin(isAdminUser());
    }, []);

    useEffect(() => {
        if (isAdmin) {
            loadKGData();
        }
    }, [isAdmin, teamId, days, limit]);

    const loadKGData = async () => {
        try {
            setLoading(true);
            const functionsOrigin = import.meta.env.VITE_FUNCTIONS_ORIGIN || 
                "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";

            const params = new URLSearchParams();
            if (teamId) params.append("team", teamId);
            params.append("days", days.toString());
            params.append("limit", limit.toString());

            const response = await fetch(`${functionsOrigin}/getKGSnapshot?${params.toString()}`);
            if (response.ok) {
                const kgData = await response.json();
                setData(kgData);
            } else {
                console.error("Knowledge Graph 데이터 로드 실패:", await response.text());
            }
        } catch (error) {
            console.error("Knowledge Graph 데이터 로드 오류:", error);
        } finally {
            setLoading(false);
        }
    };

    if (!isAdmin) {
        return (
            <div className="p-4">
                <Card className="shadow-sm border-red-200 dark:border-red-800">
                    <CardContent className="p-4">
                        <div className="text-center text-red-600 dark:text-red-400">
                            관리자 권한이 필요합니다.
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">🧩 Knowledge Graph Explorer</h1>
                <Button onClick={loadKGData} disabled={loading} variant="outline">
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                    새로고침
                </Button>
            </div>

            {/* Step 58: Graph-Aware Copilot 탭 */}
            <div className="border-b mb-6">
                <div className="flex">
                    <button
                        onClick={() => setActiveTab("graph")}
                        className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === "graph"
                                ? "border-blue-600 text-blue-600"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <Network className="h-4 w-4 inline mr-2" />
                        그래프 탐색
                    </button>
                    <button
                        onClick={() => setActiveTab("copilot")}
                        className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === "copilot"
                                ? "border-blue-600 text-blue-600"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <MessageSquare className="h-4 w-4 inline mr-2" />
                        Graph Copilot
                    </button>
                </div>
            </div>

            {activeTab === "graph" && (
                <div className="space-y-6">

            {/* 필터 */}
            <Card className="shadow-sm">
                <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label htmlFor="team" className="block text-sm font-medium mb-1">팀 필터</label>
                            <input
                                id="team"
                                type="text"
                                placeholder="팀 ID (예: SOHEUL_FC)"
                                value={teamId}
                                onChange={(e) => setTeamId(e.target.value)}
                                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                            />
                        </div>
                        <div>
                            <label htmlFor="days" className="block text-sm font-medium mb-1">기간 (일)</label>
                            <select
                                id="days"
                                value={days.toString()}
                                onChange={(e) => setDays(parseInt(e.target.value))}
                                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                            >
                                <option value="1">1일</option>
                                <option value="3">3일</option>
                                <option value="7">7일</option>
                                <option value="14">14일</option>
                                <option value="30">30일</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="limit" className="block text-sm font-medium mb-1">최대 노드 수</label>
                            <select
                                id="limit"
                                value={limit.toString()}
                                onChange={(e) => setLimit(parseInt(e.target.value))}
                                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                            >
                                <option value="25">25</option>
                                <option value="50">50</option>
                                <option value="100">100</option>
                                <option value="200">200</option>
                            </select>
                        </div>
                        <div className="flex items-end">
                            <Button onClick={loadKGData} disabled={loading} className="w-full">
                                <Search className="h-4 w-4 mr-2" />
                                검색
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 그래프 시각화 */}
            {loading ? (
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-center h-[600px]">
                            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <KGExplorer data={data || { nodes: [], edges: [] }} teamId={teamId || undefined} />
            )}

            {/* 통계 정보 */}
            {data && data.nodes.length > 0 && (
                <Card className="shadow-sm">
                    <CardContent className="p-4">
                        <h2 className="text-lg font-semibold mb-4">통계 정보</h2>
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                            <div>
                                <div className="text-muted-foreground">총 노드</div>
                                <div className="text-2xl font-bold">{data.nodes.length}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">총 엣지</div>
                                <div className="text-2xl font-bold">{data.edges.length}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Teams</div>
                                <div className="text-2xl font-bold">
                                    {data.nodes.filter((n) => n.group === "Team").length}
                                </div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Events</div>
                                <div className="text-2xl font-bold">
                                    {data.nodes.filter((n) => n.group === "Event").length}
                                </div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Actions</div>
                                <div className="text-2xl font-bold">
                                    {data.nodes.filter((n) => n.group === "Action").length}
                                </div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Policies</div>
                                <div className="text-2xl font-bold">
                                    {data.nodes.filter((n) => n.group === "Policy").length}
                                </div>
                            </div>
                        </div>
                        {data.meta && (
                            <div className="mt-4 text-xs text-muted-foreground">
                                마지막 업데이트: {new Date(data.meta.timestamp).toLocaleString()}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
                </div>
            )}

            {activeTab === "copilot" && (
                <div className="space-y-6">
                    <Card className="shadow-sm bg-blue-50 dark:bg-blue-900/20">
                        <CardContent className="p-4">
                            <h2 className="text-lg font-semibold mb-2">🤖 Graph-Aware Copilot</h2>
                            <p className="text-sm text-muted-foreground mb-4">
                                자연어로 질문하면 자동으로 Cypher 쿼리를 생성하고 결과를 시각화합니다.
                            </p>
                            <div className="text-xs text-muted-foreground space-y-1">
                                <p><strong>예시 질문:</strong></p>
                                <ul className="list-disc list-inside space-y-1">
                                    <li>"지난주 소흘FC에서 경보를 유발한 주요 원인은?"</li>
                                    <li>"최근 7일간 팀별 이벤트 통계 보여줘"</li>
                                    <li>"모델 버전 교체 후 경보율 변화?"</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                    <GraphAsk teamId={teamId || undefined} />
                </div>
            )}
        </div>
    );
}

