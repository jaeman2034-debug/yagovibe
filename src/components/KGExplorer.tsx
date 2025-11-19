import { useEffect, useRef, useState } from "react";
import cytoscape, { Core, CytoscapeOptions } from "cytoscape";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, ZoomIn, ZoomOut, Home } from "lucide-react";

interface KGNode {
    id: string;
    label: string;
    group: string;
    meta?: any;
}

interface KGEdge {
    id: string;
    source: string;
    target: string;
    label: string;
    group?: string;
}

interface KGData {
    nodes: KGNode[];
    edges: KGEdge[];
    meta?: any;
}

/**
 * Step 57: Knowledge Graph Explorer
 * Cytoscape.js를 사용한 그래프 시각화 컴포넌트
 */
export default function KGExplorer({ data, teamId }: { data: KGData; teamId?: string }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const cyRef = useRef<Core | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!containerRef.current || !data || data.nodes.length === 0) return;

        // 그룹별 색상 정의
        const groupColors: { [key: string]: string } = {
            Team: "#3b82f6", // blue
            Event: "#ef4444", // red
            Action: "#10b981", // green
            Policy: "#f59e0b", // amber
            Model: "#8b5cf6", // purple
            Report: "#ec4899", // pink
        };

        // 노드 생성
        const nodes = data.nodes.map((n) => ({
            data: {
                id: n.id,
                label: n.label || n.id,
                group: n.group || "unknown",
                meta: n.meta,
            },
            style: {
                "background-color": groupColors[n.group] || "#94a3b8",
                "label": "data(label)",
                "width": "label",
                "height": "label",
                "shape": n.group === "Team" ? "round-rectangle" : "ellipse",
                "text-valign": "center",
                "text-halign": "center",
                "font-size": "12px",
                "color": "#ffffff",
                "text-outline-width": 2,
                "text-outline-color": groupColors[n.group] || "#94a3b8",
            },
        }));

        // 엣지 생성
        const edges = data.edges.map((e) => ({
            data: {
                id: e.id,
                source: e.source,
                target: e.target,
                label: e.label || "",
                group: e.group || "unknown",
            },
            style: {
                "width": 2,
                "line-color": "#cbd5e1",
                "target-arrow-shape": "triangle",
                "target-arrow-color": "#cbd5e1",
                "curve-style": "bezier",
                "label": "data(label)",
                "font-size": "10px",
                "text-rotation": "autorotate",
                "text-margin-y": -10,
            },
        }));

        // Cytoscape 인스턴스 생성
        const cy = cytoscape({
            container: containerRef.current,
            elements: [...nodes, ...edges],
            style: [
                {
                    selector: "node",
                    style: {
                        "background-color": "data(background-color)",
                        "label": "data(label)",
                        "width": "label",
                        "height": "label",
                        "shape": "data(shape)",
                        "text-valign": "center",
                        "text-halign": "center",
                        "font-size": "12px",
                        "color": "#ffffff",
                        "text-outline-width": 2,
                        "text-outline-color": "data(text-outline-color)",
                    },
                },
                {
                    selector: "edge",
                    style: {
                        "width": 2,
                        "line-color": "#cbd5e1",
                        "target-arrow-shape": "triangle",
                        "target-arrow-color": "#cbd5e1",
                        "curve-style": "bezier",
                        "label": "data(label)",
                        "font-size": "10px",
                        "text-rotation": "autorotate",
                        "text-margin-y": -10,
                    },
                },
                {
                    selector: "node:selected",
                    style: {
                        "border-width": 3,
                        "border-color": "#fbbf24",
                    },
                },
            ],
            layout: {
                name: "cose",
                animate: false,
                nodeRepulsion: 4000,
                idealEdgeLength: 100,
            },
            userPanningEnabled: true,
            userZoomingEnabled: true,
        });

        cyRef.current = cy;

        // 노드 클릭 이벤트
        cy.on("tap", "node", (evt) => {
            const node = evt.target;
            const data = node.data();
            console.log("노드 클릭:", data);
            // TODO: 노드 상세 정보 표시 모달
        });

        // 엣지 클릭 이벤트
        cy.on("tap", "edge", (evt) => {
            const edge = evt.target;
            const data = edge.data();
            console.log("엣지 클릭:", data);
        });

        // 정리
        return () => {
            if (cyRef.current) {
                cyRef.current.destroy();
                cyRef.current = null;
            }
        };
    }, [data]);

    const handleZoomIn = () => {
        if (cyRef.current) {
            cyRef.current.zoom(cyRef.current.zoom() * 1.2);
        }
    };

    const handleZoomOut = () => {
        if (cyRef.current) {
            cyRef.current.zoom(cyRef.current.zoom() * 0.8);
        }
    };

    const handleReset = () => {
        if (cyRef.current) {
            cyRef.current.fit();
        }
    };

    if (!data || data.nodes.length === 0) {
        return (
            <Card>
                <CardContent className="p-4">
                    <div className="text-center text-muted-foreground">
                        그래프 데이터가 없습니다.
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="shadow-sm">
            <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-semibold">Knowledge Graph</h3>
                        <p className="text-sm text-muted-foreground">
                            {data.nodes.length}개 노드, {data.edges.length}개 엣지
                            {teamId && ` • 팀: ${teamId}`}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleZoomIn}>
                            <ZoomIn className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleZoomOut}>
                            <ZoomOut className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleReset}>
                            <Home className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* 범례 */}
                <div className="mb-4 flex flex-wrap gap-2 text-xs">
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-blue-500"></div>
                        <span>Team</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-red-500"></div>
                        <span>Event</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-green-500"></div>
                        <span>Action</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-amber-500"></div>
                        <span>Policy</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-purple-500"></div>
                        <span>Model</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-pink-500"></div>
                        <span>Report</span>
                    </div>
                </div>

                {/* 그래프 컨테이너 */}
                <div
                    ref={containerRef}
                    className="w-full h-[600px] rounded-md border bg-gray-50 dark:bg-gray-900"
                />
            </CardContent>
        </Card>
    );
}

