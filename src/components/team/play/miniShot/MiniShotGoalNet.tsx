/** 골대 뒤 3D 격자 망 — 모바일·원근에서도 픽셀로 잡히도록 막대 두께 확보 (골대/판정은 부모만) */
const NET_Z = -0.5;
const NET_W = 3.6;
const NET_H = 2.0;
const NET_CY = 1.1;
/** 화면에서 ~1px 이상으로 보이게 (0.018은 거리·DPR에 묻힘) */
const LINE_T = 0.06;

const H_COUNT = 5;
const V_COUNT = 6;

const DEPTH_Z = 0.08;
const DEPTH_T = 0.055;

const NET_MAT = { color: "#64748b", roughness: 0.82, metalness: 0.02 } as const;

/**
 * 골대 뒤 3D 격자 망. `MiniShot3DModal` 골 그룹 `position={[0,0,-13]}` 내부.
 */
export default function MiniShotGoalNet() {
  const hLines = Array.from({ length: H_COUNT }, (_, k) => {
    const t = H_COUNT === 1 ? 0.5 : k / (H_COUNT - 1);
    const y = NET_CY - NET_H / 2 + t * NET_H;
    return (
      <mesh key={`net-h-${k}`} position={[0, y, NET_Z]}>
        <boxGeometry args={[NET_W, LINE_T, LINE_T]} />
        <meshStandardMaterial {...NET_MAT} />
      </mesh>
    );
  });

  const vLines = Array.from({ length: V_COUNT }, (_, k) => {
    const t = V_COUNT === 1 ? 0.5 : k / (V_COUNT - 1);
    const x = -NET_W / 2 + t * NET_W;
    return (
      <mesh key={`net-v-${k}`} position={[x, NET_CY, NET_Z]}>
        <boxGeometry args={[LINE_T, NET_H, LINE_T]} />
        <meshStandardMaterial {...NET_MAT} />
      </mesh>
    );
  });

  const halfW = NET_W / 2;
  const halfH = NET_H / 2;
  const corners: [number, number][] = [
    [-halfW, NET_CY - halfH],
    [-halfW, NET_CY + halfH],
    [halfW, NET_CY - halfH],
    [halfW, NET_CY + halfH],
  ];

  const depthStruts = corners.map(([x, y], i) => (
    <mesh key={`net-depth-${i}`} position={[x, y, NET_Z - DEPTH_Z / 2]}>
      <boxGeometry args={[DEPTH_T, DEPTH_T, DEPTH_Z]} />
      <meshStandardMaterial {...NET_MAT} />
    </mesh>
  ));

  return (
    <group>
      {hLines}
      {vLines}
      {depthStruts}
    </group>
  );
}
