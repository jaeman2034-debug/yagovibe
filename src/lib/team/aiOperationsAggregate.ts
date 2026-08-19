/**
 * Priority 1-3 — AI Operations Dashboard aggregate (client-side)
 * Source: teams/{teamId}/aiFeedback (read-only)
 */

import type { AiContentFeatureType } from "@/lib/ai/promptRegistry";

export const AI_OPS_FEATURES = [
  "clubIntro",
  "captainMessage",
  "recruitMessage",
  "socialPost",
  "eventMessage",
] as const satisfies readonly AiContentFeatureType[];

export const AI_OPS_FEATURE_LABEL: Record<AiContentFeatureType, string> = {
  clubIntro: "Club Intro",
  captainMessage: "Captain Message",
  recruitMessage: "Recruit Message",
  socialPost: "Social Post",
  eventMessage: "Event Message",
};

export type AiFeedbackDoc = {
  id: string;
  teamId: string;
  featureType: AiContentFeatureType | string;
  promptVersion: string;
  rating: "good" | "needs_edit" | string;
  edited?: boolean;
  regenerateCount?: number;
  comment?: string;
  createdBy?: string;
  createdAt?: Date | null;
  generatedAt?: Date | null;
};

export type FeatureStatRow = {
  featureType: AiContentFeatureType;
  label: string;
  generate: number;
  good: number;
  needsEdit: number;
  goodRate: number | null;
};

export type VersionStatRow = {
  version: string;
  generate: number;
  good: number;
  needsEdit: number;
  goodRate: number | null;
};

export type AiOpsAggregate = {
  total: number;
  good: number;
  needsEdit: number;
  goodRate: number | null;
  byFeature: FeatureStatRow[];
  byVersion: VersionStatRow[];
  recent: AiFeedbackDoc[];
};

function rate(good: number, total: number): number | null {
  if (total <= 0) return null;
  return (good / total) * 100;
}

function emptyFeatureRows(): FeatureStatRow[] {
  return AI_OPS_FEATURES.map((featureType) => ({
    featureType,
    label: AI_OPS_FEATURE_LABEL[featureType],
    generate: 0,
    good: 0,
    needsEdit: 0,
    goodRate: null,
  }));
}

export function aggregateAiFeedback(
  docs: AiFeedbackDoc[],
  recentLimit = 20
): AiOpsAggregate {
  const byFeatureMap = new Map<string, { generate: number; good: number; needsEdit: number }>();
  for (const f of AI_OPS_FEATURES) {
    byFeatureMap.set(f, { generate: 0, good: 0, needsEdit: 0 });
  }
  const byVersionMap = new Map<string, { generate: number; good: number; needsEdit: number }>();

  let good = 0;
  let needsEdit = 0;

  for (const d of docs) {
    const featureKey = AI_OPS_FEATURES.includes(d.featureType as AiContentFeatureType)
      ? d.featureType
      : null;
    if (featureKey) {
      const row = byFeatureMap.get(featureKey)!;
      row.generate += 1;
      if (d.rating === "good") row.good += 1;
      if (d.rating === "needs_edit") row.needsEdit += 1;
    }

    const ver = (d.promptVersion || "unknown").trim() || "unknown";
    const vRow = byVersionMap.get(ver) ?? { generate: 0, good: 0, needsEdit: 0 };
    vRow.generate += 1;
    if (d.rating === "good") vRow.good += 1;
    if (d.rating === "needs_edit") vRow.needsEdit += 1;
    byVersionMap.set(ver, vRow);

    if (d.rating === "good") good += 1;
    if (d.rating === "needs_edit") needsEdit += 1;
  }

  const byFeature: FeatureStatRow[] = emptyFeatureRows().map((base) => {
    const row = byFeatureMap.get(base.featureType)!;
    return {
      ...base,
      generate: row.generate,
      good: row.good,
      needsEdit: row.needsEdit,
      goodRate: rate(row.good, row.generate),
    };
  });

  const byVersion: VersionStatRow[] = [...byVersionMap.entries()]
    .map(([version, row]) => ({
      version,
      generate: row.generate,
      good: row.good,
      needsEdit: row.needsEdit,
      goodRate: rate(row.good, row.generate),
    }))
    .sort((a, b) => b.generate - a.generate);

  const recent = [...docs]
    .sort((a, b) => {
      const ta = a.createdAt?.getTime() ?? 0;
      const tb = b.createdAt?.getTime() ?? 0;
      return tb - ta;
    })
    .slice(0, recentLimit);

  const total = docs.length;
  return {
    total,
    good,
    needsEdit,
    goodRate: rate(good, total),
    byFeature,
    byVersion,
    recent,
  };
}

export function formatGoodRate(ratePct: number | null): string {
  if (ratePct == null) return "—";
  return `${ratePct.toFixed(1)}%`;
}
