import React, { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, RoundedBox, Text, Html, Edges } from "@react-three/drei";
import ErrorBubble from "@/components/ops/ErrorBubble";
import { fetchSentryIssues, type SentryIssue } from "@/components/ops/SentryFetcher";

type TrendPoint = {
  date: string;
  users: number;
  errors: number;
  ops: number;
};

type InsightsResponse = {
  status: "OK" | "Warning" | "Critical";
  summary: string;
  trend: TrendPoint[];
};

const DEFAULT_RESPONSE: InsightsResponse = {
  status: "OK",
  summary: "",
  trend: [],
};

function useInsights(): InsightsResponse {
  const [data, setData] = useState<InsightsResponse>(DEFAULT_RESPONSE);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const res = await fetch("/api/weekly-insights");
        if (!res.ok) {
          throw new Error(res.statusText);
        }
        const payload: InsightsResponse = await res.json();
        if (active) {
          setData({
            status: payload.status ?? "OK",
            summary: payload.summary ?? "",
            trend: payload.trend ?? [],
          });
        }
      } catch {
        // ignore errors, keep defaults
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  return data;
}

function useSentryBubbles() {
  const [issues, setIssues] = useState<SentryIssue[]>([]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const next = await fetchSentryIssues(10);
      if (active) {
        setIssues(next);
      }
    };

    void load();
    const interval = setInterval(load, 45_000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return issues;
}

function TinyBar({ x, h, color }: { x: number; h: number; color: string }) {
  const height = Math.max(0.02, h);
  return (
    <mesh position={[x, height / 2, 0]} castShadow>
      <boxGeometry args={[0.1, height, 0.12]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

function Panel({
  position,
  title,
  value,
  color,
}: {
  position: [number, number, number];
  title: string;
  value: number;
  color: string;
}) {
  return (
    <group position={position}>
      <RoundedBox args={[2, 1.5, 0.12]} radius={0.12} smoothness={6} castShadow receiveShadow>
        <meshStandardMaterial color="#0b1220" roughness={0.85} metalness={0.15} />
        <Edges color="#1f2937" />
      </RoundedBox>
      <Html center style={{ pointerEvents: "none" }}>
        <div
          style={{
            width: 180,
            textAlign: "center",
            color: "white",
            fontFamily: "ui-sans-serif, system-ui",
            opacity: 0.92,
          }}
        >
          <div style={{ fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase", opacity: 0.7 }}>
            {title}
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color }}>{value.toLocaleString()}</div>
        </div>
      </Html>
    </group>
  );
}

function TrendPanel({ position, trend }: { position: [number, number, number]; trend: TrendPoint[] }) {
  const users = trend.map((d) => d.users);
  const errors = trend.map((d) => d.errors);
  const ops = trend.map((d) => d.ops);
  const max = Math.max(1, ...users, ...errors, ...ops);

  return (
    <group position={position}>
      <RoundedBox args={[4.2, 2.2, 0.08]} radius={0.08} smoothness={6} castShadow receiveShadow>
        <meshStandardMaterial color="#0b1220" metalness={0.2} roughness={0.85} />
        <Edges color="#1f2937" />
      </RoundedBox>
      <group position={[-1.8, -0.9, 0.06]}>
        {trend.map((d, i) => (
          <group key={d.date ?? i} position={[i * 0.45, 0, 0]}>
            <TinyBar x={0} h={(d.users / max) * 1.6} color="#3b82f6" />
            <TinyBar x={0.12} h={(d.errors / max) * 1.6} color="#ef4444" />
            <TinyBar x={0.24} h={(d.ops / max) * 1.6} color="#10b981" />
          </group>
        ))}
      </group>
      <Html position={[0, 1.05, 0]} center style={{ pointerEvents: "none" }}>
        <div style={{ color: "white", fontFamily: "ui-sans-serif", fontSize: 14, opacity: 0.85 }}>
          System Trends · Users / Errors / Ops
        </div>
      </Html>
    </group>
  );
}

function SummaryPanel({ position, text }: { position: [number, number, number]; text: string }) {
  return (
    <group position={position}>
      <RoundedBox args={[5.6, 2.6, 0.08]} radius={0.08} smoothness={6} castShadow receiveShadow>
        <meshStandardMaterial color="#0b1220" roughness={0.85} />
        <Edges color="#1f2937" />
      </RoundedBox>
      <Html center style={{ width: 720, pointerEvents: "none" }}>
        <div
          style={{
            color: "white",
            fontFamily: "ui-sans-serif, system-ui",
            opacity: 0.95,
            lineHeight: 1.4,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 16 }}>AI Weekly Summary</div>
          <pre style={{ whiteSpace: "pre-wrap", margin: 0, fontSize: 13 }}>
            {text || "(요약 데이터가 없습니다.)"}
          </pre>
        </div>
      </Html>
    </group>
  );
}

export default function AIOps3DConsole(): JSX.Element {
  const { summary, trend, status } = useInsights();
  const issues = useSentryBubbles();

  const statusColor = useMemo(() => {
    switch (status) {
      case "Warning":
        return "#f59e0b";
      case "Critical":
        return "#ef4444";
      default:
        return "#10b981";
    }
  }, [status]);

  const latest = trend[trend.length - 1] ?? { users: 0, errors: 0, ops: 0 };
  const bubblePositions = useMemo(() => {
    if (!issues.length) return [];
    const radius = 2.6;
    return issues.map((_, index) => {
      const angle = (index / Math.max(issues.length, 1)) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = Math.sin(angle * 1.5) * 0.8 + 0.5;
      return [x, y, z] as [number, number, number];
    });
  }, [issues]);

  return (
    <div className="h-[80vh] w-full overflow-hidden rounded-2xl bg-[#030712]">
      <Canvas camera={{ position: [0, 2.4, 6.2], fov: 45 }} shadows>
        <color attach="background" args={["#030712"]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[4, 6, 4]} intensity={1.1} castShadow />

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.1, 0]} receiveShadow>
          <planeGeometry args={[40, 40]} />
          <meshStandardMaterial color="#0a0f1f" />
        </mesh>

        <group position={[0, 2.1, 0]}>
          <Text fontSize={0.35} color={statusColor} anchorX="center" anchorY="middle">
            {status === "OK" ? "ALL SYSTEMS OPERATIONAL" : status.toUpperCase()}
          </Text>
        </group>

        <Panel position={[-3.1, 0.6, 0]} title="Active Users" value={latest.users} color="#3b82f6" />
        <Panel position={[0, 0.6, 0]} title="Errors (open)" value={latest.errors} color="#ef4444" />
        <Panel position={[3.1, 0.6, 0]} title="DB Ops" value={latest.ops} color="#10b981" />

        <TrendPanel position={[0, -0.4, 0]} trend={trend} />
        <SummaryPanel position={[0, -2.2, 0]} text={summary} />

        {issues.map((issue, idx) => (
          <ErrorBubble key={issue.id} issue={issue} position={bubblePositions[idx] ?? [0, 0.8, -1.2]} />
        ))}

        <OrbitControls enablePan enableZoom target={[0, 0.3, 0]} />
      </Canvas>
    </div>
  );
}

