import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, Code, MessageSquare } from "lucide-react";
import KGExplorer from "./KGExplorer";

interface GraphAskProps {
    teamId?: string;
    onResult?: (result: any) => void;
}

interface CopilotResponse {
    success: boolean;
    query: string;
    querySource: "template" | "llm";
    summary: string;
    records: any[];
    count: number;
    intent: string;
    params: any;
}

/**
 * Step 58: Graph-Aware Copilot UI
 * 자연어 질문을 Cypher 쿼리로 변환하고 결과를 시각화
 */
export default function GraphAsk({ teamId, onResult }: GraphAskProps) {
    const [question, setQuestion] = useState("");
    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState<CopilotResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showQuery, setShowQuery] = useState(false);

    const handleAsk = async () => {
        if (!question.trim()) return;

        try {
            setLoading(true);
            setError(null);
            setResponse(null);

            const functionsOrigin = import.meta.env.VITE_FUNCTIONS_ORIGIN || 
                "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";

            const res = await fetch(`${functionsOrigin}/graphCopilot`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: question,
                    teamId: teamId || undefined,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Query execution failed");
            }

            setResponse(data);
            if (onResult) {
                onResult(data);
            }

            // 결과를 Knowledge Graph 형식으로 변환
            if (data.records && data.records.length > 0) {
                // TODO: 결과를 노드/엣지 형식으로 변환하는 로직 추가
            }
        } catch (err: any) {
            setError(err.message || "오류가 발생했습니다.");
            console.error("GraphAsk 오류:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleAsk();
        }
    };

    // 결과를 Knowledge Graph 형식으로 변환 (간단한 예시)
    const convertToKGFormat = (records: any[]): { nodes: any[]; edges: any[] } => {
        const nodes: any[] = [];
        const edges: any[] = [];
        const nodeMap = new Map<string, any>();

        records.forEach((record, idx) => {
            // 각 컬럼을 노드로 변환 (예시)
            Object.keys(record).forEach((key) => {
                const value = record[key];
                if (typeof value === "string" && value.length < 50) {
                    const nodeId = `${key}-${value}`;
                    if (!nodeMap.has(nodeId)) {
                        nodeMap.set(nodeId, {
                            id: nodeId,
                            label: value,
                            group: key === "team" ? "Team" : key === "eventType" ? "Event" : "Unknown",
                        });
                    }
                }
            });
        });

        return {
            nodes: Array.from(nodeMap.values()),
            edges: [],
        };
    };

    const kgData = response?.records ? convertToKGFormat(response.records) : null;

    return (
        <div className="space-y-4">
            {/* 질문 입력 */}
            <Card className="shadow-sm">
                <CardContent className="p-4">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="예: 지난주 소흘FC에서 경보를 유발한 주요 원인과 조치 결과를 보여줘"
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            onKeyPress={handleKeyPress}
                            disabled={loading}
                            className="flex-1 px-3 py-2 border rounded-md bg-background text-sm"
                        />
                        <Button onClick={handleAsk} disabled={loading || !question.trim()}>
                            {loading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* 에러 메시지 */}
            {error && (
                <Card className="shadow-sm border-red-200 dark:border-red-800">
                    <CardContent className="p-4">
                        <div className="text-red-600 dark:text-red-400 text-sm">{error}</div>
                    </CardContent>
                </Card>
            )}

            {/* 응답 */}
            {response && (
                <>
                    {/* 요약 */}
                    <Card className="shadow-sm border-blue-200 dark:border-blue-800">
                        <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                                <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                                <div className="flex-1">
                                    <div className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">
                                        요약
                                    </div>
                                    <div className="text-sm">{response.summary}</div>
                                    <div className="mt-2 text-xs text-muted-foreground">
                                        {response.count}개 결과 • {response.querySource === "template" ? "템플릿" : "LLM"} 생성
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 생성된 Cypher 쿼리 */}
                    <Card className="shadow-sm">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <Code className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm font-medium">생성된 Cypher 쿼리</span>
                                    <span className="text-xs text-muted-foreground">
                                        ({response.querySource === "template" ? "템플릿" : "LLM"})
                                    </span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowQuery(!showQuery)}
                                >
                                    {showQuery ? "숨기기" : "보기"}
                                </Button>
                            </div>
                            {showQuery && (
                                <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-x-auto">
                                    <code>{response.query}</code>
                                </pre>
                            )}
                        </CardContent>
                    </Card>

                    {/* 결과 테이블 */}
                    {response.records && response.records.length > 0 && (
                        <Card className="shadow-sm">
                            <CardContent className="p-4">
                                <div className="text-sm font-medium mb-3">결과 ({response.count}개)</div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs border-collapse">
                                        <thead>
                                            <tr className="border-b">
                                                {Object.keys(response.records[0]).map((key) => (
                                                    <th key={key} className="text-left p-2 font-medium">
                                                        {key}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {response.records.slice(0, 20).map((record, idx) => (
                                                <tr key={idx} className="border-b">
                                                    {Object.keys(record).map((key) => (
                                                        <td key={key} className="p-2">
                                                            {typeof record[key] === "object"
                                                                ? JSON.stringify(record[key])
                                                                : String(record[key])}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {response.records.length > 20 && (
                                        <div className="mt-2 text-xs text-muted-foreground text-center">
                                            ... 외 {response.records.length - 20}개 결과
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Knowledge Graph 시각화 (간단한 예시) */}
                    {kgData && kgData.nodes.length > 0 && (
                        <KGExplorer data={kgData} teamId={teamId} />
                    )}
                </>
            )}
        </div>
    );
}

