import { useFrame } from "@react-three/fiber";
import React, { useMemo, useRef, useState } from "react";
import { Mesh } from "three";
import { Html, Text } from "@react-three/drei";
import type { SentryIssue } from "./SentryFetcher";

interface ErrorBubbleProps {
  issue: SentryIssue;
  position: [number, number, number];
}

const severityColor = (level?: string) => {
  switch ((level ?? "").toLowerCase()) {
    case "fatal":
    case "error":
      return "#ef4444";
    case "warning":
      return "#f59e0b";
    default:
      return "#6366f1";
  }
};

export default function ErrorBubble({ issue, position }: ErrorBubbleProps) {
  const mesh = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [selected, setSelected] = useState(false);
  const color = useMemo(() => severityColor(issue.level), [issue.level]);

  useFrame((_, delta) => {
    if (mesh.current) {
      mesh.current.rotation.y += delta * 0.3;
      mesh.current.position.y = position[1] + Math.sin(performance.now() / 500 + position[0]) * 0.05;
    }
  });

  const handleClick = () => setSelected((prev) => !prev);

  return (
    <group position={position}>
      <mesh
        ref={mesh}
        scale={hovered ? 1.15 : 1}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={handleClick}
      >
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={hovered ? 0.7 : 0.4} />
      </mesh>
      <Text fontSize={0.12} color="white" position={[0, 0.55, 0]} anchorX="center">
        {(issue.title ?? "Unknown").slice(0, 16)}
      </Text>
      {selected && (
        <Html position={[0, -0.65, 0]} center style={{ pointerEvents: "none" }}>
          <div
            style={{
              background: "rgba(15,23,42,0.9)",
              color: "white",
              padding: "8px 10px",
              borderRadius: 8,
              width: 220,
              fontSize: 12,
              lineHeight: 1.4,
              fontFamily: "ui-sans-serif",
              border: "1px solid rgba(148,163,184,0.3)",
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 4 }}>#{issue.id.slice(-6)}</div>
            <div>{issue.title}</div>
            {issue.count && <div style={{ marginTop: 4 }}>Count: {issue.count}</div>}
            {issue.lastSeen && (
              <div style={{ marginTop: 2, opacity: 0.8 }}>
                Last seen: {new Date(issue.lastSeen).toLocaleString()}
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

