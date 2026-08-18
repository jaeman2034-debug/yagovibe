import type { GrowthProfileRadarResult } from "@/lib/ai-growth/growthProfileRadar";

export type GrowthProfileRadarSvgOptions = {
  /** SVG edge length (px). PDF print uses ~360 for ~50% of A4 content width. */
  size?: number;
};

/** html2canvas-safe SVG radar (5 axes) for PDF / print — Sprint 8B-3 */
export function buildGrowthProfileRadarSvg(
  profile: GrowthProfileRadarResult,
  options?: GrowthProfileRadarSvgOptions
): string {
  const scoreByKey = Object.fromEntries(
    profile.axes.map((a) => [a.key, typeof a.score === "number" ? a.score : 0])
  ) as Record<string, number>;

  const n = profile.axes.length;
  const axes = profile.axes.map((a, i) => {
    const deg = -90 + (360 / n) * i;
    return { label: a.labelKo, key: a.key, deg };
  });

  const size = options?.size ?? 280;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.329;
  const labelR = size * 0.436;
  const scoreR = size * 0.271;
  const fontLabel = Math.max(10, Math.round(size * 0.039));
  const fontScore = Math.max(9, Math.round(size * 0.036));

  const toPoint = (deg: number, score: number) => {
    const rad = (deg * Math.PI) / 180;
    const r = (Math.max(0, Math.min(100, score)) / 100) * maxR;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  };

  const gridLevels = [25, 50, 75, 100];
  const gridPolys = gridLevels
    .map((level) => {
      const pts = axes
        .map((a) => {
          const p = toPoint(a.deg, level);
          return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
        })
        .join(" ");
      return `<polygon points="${pts}" fill="none" stroke="#e2e8f0" stroke-width="1"/>`;
    })
    .join("");

  const axisLines = axes
    .map((a) => {
      const p = toPoint(a.deg, 100);
      return `<line x1="${cx}" y1="${cy}" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}" stroke="#e2e8f0" stroke-width="1"/>`;
    })
    .join("");

  const dataPts = axes
    .map((a) => {
      const p = toPoint(a.deg, scoreByKey[a.key] ?? 0);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    })
    .join(" ");

  const labels = axes
    .map((a) => {
      const p = toPoint(a.deg, (labelR / maxR) * 100);
      return `<text x="${p.x.toFixed(1)}" y="${(p.y + 4).toFixed(1)}" text-anchor="middle" font-size="${fontLabel}" fill="#475569" font-family="Malgun Gothic,sans-serif">${a.label}</text>`;
    })
    .join("");

  const scores = axes
    .map((a) => {
      const s = scoreByKey[a.key] ?? 0;
      const p = toPoint(a.deg, (scoreR / maxR) * 100);
      return `<text x="${p.x.toFixed(1)}" y="${(p.y + 4).toFixed(1)}" text-anchor="middle" font-size="${fontScore}" fill="#7c3aed" font-weight="700" font-family="Malgun Gothic,sans-serif">${s}</text>`;
    })
    .join("");

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="5축 성장 레이더">
      ${gridPolys}
      ${axisLines}
      <polygon points="${dataPts}" fill="rgba(139,92,246,0.35)" stroke="#7c3aed" stroke-width="2"/>
      ${labels}
      ${scores}
    </svg>`;
}
