/**
 * Vision v6-6 — Explainable AI bullets for Parent Intelligence
 */

import type { PlayerFii } from "@/lib/vision/visionTypes";

const AXIS_THRESHOLD = 70;

type AxisKey = "spatial" | "vision" | "decision" | "pressure" | "tactics";

const AXIS_PARENT_LABELS: Record<AxisKey, string> = {
  spatial: "공간을 잘 활용하며 움직였습니다.",
  vision: "주변 상황을 잘 살피며 플레이했습니다.",
  decision: "좋은 판단으로 공격 전개에 기여했습니다.",
  pressure: "압박 상황에서도 침착하게 플레이했습니다.",
  tactics: "팀 전술에 잘 맞춰 플레이했습니다.",
};

const AXIS_ORDER: AxisKey[] = ["decision", "spatial", "vision", "pressure", "tactics"];

export type ExplainableFiiInput = {
  axes: PlayerFii["axes"] | null | undefined;
  isPlaymaker: boolean;
  tacticalStrengths?: string[];
  growthStrengths?: string[];
  fiiScore?: number | null;
};

function softenTacticalStrength(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;
  if (/[가-힣]/.test(text)) {
    const cleaned = text.replace(/\.$/, "");
    return cleaned.endsWith("습니다") || cleaned.endsWith("요") ? `${cleaned}.` : `${cleaned}었습니다.`;
  }
  if (/pass/i.test(text)) return "패스 연결이 좋아졌습니다.";
  if (/press/i.test(text)) return "적극적인 압박과 움직임이 많았습니다.";
  if (/movement/i.test(text)) return "적극적인 움직임이 많았습니다.";
  if (/attack/i.test(text)) return "공격 전개에 기여했습니다.";
  return null;
}

export function buildExplainableFiiBullets(input: ExplainableFiiInput): string[] {
  const bullets: string[] = [];
  const seen = new Set<string>();

  const push = (line: string) => {
    const key = line.trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    bullets.push(key);
  };

  if (input.isPlaymaker) {
    push("팀 공격 연결에 큰 기여를 했습니다.");
  }

  const axes = input.axes ?? {};
  const ranked = AXIS_ORDER.map((key) => ({
    key,
    value: axes[key] ?? 0,
  }))
    .filter((a) => a.value >= AXIS_THRESHOLD)
    .sort((a, b) => b.value - a.value);

  for (const { key } of ranked) {
    push(AXIS_PARENT_LABELS[key]);
    if (bullets.length >= 3) break;
  }

  for (const raw of input.tacticalStrengths ?? []) {
    const softened = softenTacticalStrength(raw);
    if (softened) push(softened);
    if (bullets.length >= 3) break;
  }

  for (const raw of input.growthStrengths ?? []) {
    push(raw.trim().replace(/\.$/, "") + (raw.endsWith(".") ? "" : "."));
    if (bullets.length >= 3) break;
  }

  if (bullets.length === 0 && input.fiiScore != null && input.fiiScore >= 75) {
    push("경기 흐름에 맞춰 꾸준히 참여했습니다.");
    push("팀 플레이에 기여하는 모습이 보였습니다.");
  }

  if (bullets.length === 0) {
    push("경기에 성실히 참여하며 성장하고 있습니다.");
  }

  return bullets.slice(0, 3);
}

export function explainableFiiTitle(fiiScore: number | null | undefined): string {
  if (fiiScore != null && fiiScore >= 75) {
    return "경기 영향력이 좋았던 이유";
  }
  if (fiiScore != null && fiiScore >= 50) {
    return "이번 경기에서 잘한 점";
  }
  return "성장 포인트";
}
