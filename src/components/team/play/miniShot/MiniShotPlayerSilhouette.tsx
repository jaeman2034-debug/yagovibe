/** 엉덩이(hip) 원점, 아래로 −Y — 회전·스탠스는 루트 그룹에만 */
function LegLimbChain({
  shorts: shortsColor,
  socks: socksColor,
  sockStripe: stripeColor,
  cleat: cleatColor,
  rootRotation,
  hipPosition,
  toeLocalZ,
}: {
  shorts: string;
  socks: string;
  sockStripe: string;
  cleat: string;
  rootRotation: [number, number, number];
  hipPosition: [number, number, number];
  toeLocalZ: number;
}) {
  const thighH = 0.28;
  const calfH = 0.42;
  const thighCy = -thighH / 2;
  const kneeY = -thighH;
  const calfCy = kneeY - calfH / 2;
  const cleatY = kneeY - calfH + 0.03;

  return (
    <group position={hipPosition} rotation={rootRotation}>
      <mesh position={[0, thighCy, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.09, 0.08, thighH, 10]} />
        <meshStandardMaterial color={shortsColor} roughness={0.58} />
      </mesh>
      <mesh position={[0, kneeY + 0.04, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.056, 0.056, 0.06, 10]} />
        <meshStandardMaterial color={stripeColor} roughness={0.5} />
      </mesh>
      <mesh position={[0, calfCy, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.055, 0.05, calfH, 10]} />
        <meshStandardMaterial color={socksColor} roughness={0.55} />
      </mesh>
      <mesh position={[0, calfCy + 0.12, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.056, 0.056, 0.06, 10]} />
        <meshStandardMaterial color={stripeColor} roughness={0.5} />
      </mesh>
      <mesh position={[0, cleatY, toeLocalZ]} castShadow receiveShadow>
        <boxGeometry args={[0.1, 0.06, 0.2]} />
        <meshStandardMaterial color={cleatColor} roughness={0.65} metalness={0.12} />
      </mesh>
    </group>
  );
}

/** 미니슛용 저폴리 축구 선수 — GLB 없을 때·로딩·실패 폴백 (에셋 없음) */
export default function MiniShotPlayerSilhouette() {
  const jersey = "#1d4ed8";
  const jerseyDark = "#1e3a8a";
  const shorts = "#0f172a";
  const socks = "#f8fafc";
  const sockStripe = "#1e40af";
  const skin = "#fbbf77";
  const cleat = "#111827";
  const legX = 0.14;
  const leftLegZ = 0.05;
  const rightLegZ = -0.25;
  /** 반바지 하단과 맞춘 hip 높이 */
  const hipY = 0.72;
  const armLen = 0.5;
  const shoulderY = 1.1;
  const armRot: [number, number, number] = [-0.28, 0, 0];

  return (
    <group>
      {/* 왼다리 — 디딤발: hip에서 관절 체인 한 덩어리 */}
      <LegLimbChain
        shorts={shorts}
        socks={socks}
        sockStripe={sockStripe}
        cleat={cleat}
        rootRotation={[0.1, 0, 0]}
        hipPosition={[-legX, hipY, leftLegZ]}
        toeLocalZ={0.06}
      />

      {/* 오른다리 — 킥 준비: 동일 체인, 루트에만 z·y·pitch */}
      <LegLimbChain
        shorts={shorts}
        socks={socks}
        sockStripe={sockStripe}
        cleat={cleat}
        rootRotation={[-0.4, 0, 0]}
        hipPosition={[legX, hipY + 0.04, rightLegZ]}
        toeLocalZ={0.06}
      />
      <mesh position={[0, 0.72, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.36, 0.16, 0.22]} />
        <meshStandardMaterial color={shorts} roughness={0.55} />
      </mesh>

      {/* 상반신 — 더 숙여 슛 준비 */}
      <group rotation={[-0.12, 0, 0]}>
        <mesh position={[0, 1.0, 0]} castShadow receiveShadow>
          <capsuleGeometry args={[0.15, 0.42, 6, 14]} />
          <meshStandardMaterial color={jersey} roughness={0.48} metalness={0.05} />
        </mesh>
        <mesh position={[0, 1.08, 0.02]} castShadow receiveShadow>
          <boxGeometry args={[0.32, 0.11, 0.2]} />
          <meshStandardMaterial color={jerseyDark} roughness={0.5} />
        </mesh>

        <mesh position={[-0.22, shoulderY - armLen * 0.32, 0.04]} rotation={armRot} castShadow receiveShadow>
          <cylinderGeometry args={[0.042, 0.039, armLen, 8]} />
          <meshStandardMaterial color={jersey} roughness={0.5} />
        </mesh>
        <mesh position={[0.22, shoulderY - armLen * 0.32, 0.04]} rotation={armRot} castShadow receiveShadow>
          <cylinderGeometry args={[0.042, 0.039, armLen, 8]} />
          <meshStandardMaterial color={jersey} roughness={0.5} />
        </mesh>

        <group rotation={[0.1, 0, 0]}>
          <mesh position={[0, 1.36, 0]} castShadow receiveShadow>
            <sphereGeometry args={[0.14, 18, 18]} />
            <meshStandardMaterial color={skin} roughness={0.58} metalness={0.02} />
          </mesh>
          <mesh position={[0, 1.45, -0.02]} castShadow receiveShadow>
            <boxGeometry args={[0.18, 0.07, 0.2]} />
            <meshStandardMaterial color="#1c1917" roughness={0.85} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
