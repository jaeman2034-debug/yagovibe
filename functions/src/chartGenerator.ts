// functions/src/chartGenerator.ts
// 🔥 차트 생성: SVG 기반 차트 생성
//
// 🎯 핵심 원칙:
// - 서버에서 SVG 생성
// - 템플릿에 삽입
// - PDF 렌더링 시 깨지지 않음

/**
 * 회비 통계 데이터
 */
export interface FeeStats {
  paidCount: number;
  unpaidCount: number;
  paidAmount: number;
  unpaidAmount: number;
}

/**
 * 회비 납부 현황 파이 차트 SVG 생성
 * 
 * @param stats 회비 통계
 * @returns SVG 문자열
 */
export function generateChartSVG(stats: FeeStats): string {
  const { paidCount, unpaidCount, paidAmount, unpaidAmount } = stats;
  const total = paidCount + unpaidCount;
  const paidPercentage = total > 0 ? (paidCount / total) * 100 : 0;
  const unpaidPercentage = total > 0 ? (unpaidCount / total) * 100 : 0;

  // SVG 파이 차트 생성
  const width = 400;
  const height = 300;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = 100;

  // 파이 차트 각도 계산
  const paidAngle = (paidPercentage / 100) * 360;
  const unpaidAngle = (unpaidPercentage / 100) * 360;

  // SVG 경로 생성
  const paidPath = generatePieSlicePath(centerX, centerY, radius, 0, paidAngle);
  const unpaidPath = generatePieSlicePath(centerX, centerY, radius, paidAngle, unpaidAngle);

  return `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- 배경 -->
  <rect width="${width}" height="${height}" fill="#f9fafb"/>
  
  <!-- 파이 차트 -->
  <g transform="translate(${centerX}, ${centerY})">
    <!-- 납부 -->
    <path d="${paidPath}" fill="#10b981" stroke="#fff" stroke-width="2"/>
    <!-- 미납 -->
    <path d="${unpaidPath}" fill="#ef4444" stroke="#fff" stroke-width="2"/>
  </g>
  
  <!-- 범례 -->
  <g transform="translate(${width - 150}, 50)">
    <rect x="0" y="0" width="20" height="20" fill="#10b981"/>
    <text x="30" y="15" font-family="NotoSansKR" font-size="12">납부: ${paidCount}명 (${paidPercentage.toFixed(1)}%)</text>
    
    <rect x="0" y="30" width="20" height="20" fill="#ef4444"/>
    <text x="30" y="45" font-family="NotoSansKR" font-size="12">미납: ${unpaidCount}명 (${unpaidPercentage.toFixed(1)}%)</text>
  </g>
  
  <!-- 통계 텍스트 -->
  <text x="${centerX}" y="${centerY + radius + 30}" text-anchor="middle" font-family="NotoSansKR" font-size="14" font-weight="bold">
    총 ${total}명
  </text>
</svg>
  `.trim();
}

/**
 * 파이 차트 슬라이스 경로 생성
 */
function generatePieSlicePath(
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string {
  const start = angleToPoint(centerX, centerY, radius, startAngle);
  const end = angleToPoint(centerX, centerY, radius, endAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${centerX} ${centerY}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
}

/**
 * 각도를 좌표로 변환
 */
function angleToPoint(
  centerX: number,
  centerY: number,
  radius: number,
  angleDeg: number
): { x: number; y: number } {
  const angleRad = (angleDeg * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(angleRad),
    y: centerY + radius * Math.sin(angleRad),
  };
}

