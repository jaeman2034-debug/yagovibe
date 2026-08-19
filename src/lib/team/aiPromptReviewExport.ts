/**
 * Priority 1-4 — Prompt Review Note Markdown export (local only)
 */

import type { AiContentFeatureType } from "@/lib/ai/promptRegistry";
import { AI_OPS_FEATURE_LABEL } from "@/lib/team/aiOperationsAggregate";

export type ReviewDecision = "KEEP" | "REVIEW" | "UPDATE";

export type FeatureReviewNote = {
  featureType: AiContentFeatureType;
  decision: ReviewDecision;
  reason: string;
  goodRate: number | null;
  generate: number;
};

export function buildPromptReviewMarkdown(opts: {
  teamId: string;
  date: Date;
  registryVersions: string[];
  notes: FeatureReviewNote[];
}): string {
  const ymd = opts.date.toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  const lines: string[] = [
    `# AI Prompt Review — ${ymd}`,
    "",
    `- Team: \`${opts.teamId}\``,
    `- Registry versions (current): ${opts.registryVersions.map((v) => `\`${v}\``).join(", ") || "—"}`,
    `- Policy: Prompt changes only via Prompt Registry + Changelog + redeploy (no auto-edit)`,
    "",
    "## Decisions",
    "",
    "| Version context | Feature | Decision | Good Rate | Generate | Reason |",
    "| --- | --- | --- | --- | --- | --- |",
  ];

  for (const n of opts.notes) {
    const label = AI_OPS_FEATURE_LABEL[n.featureType] || n.featureType;
    const rate =
      n.goodRate == null ? "—" : `${n.goodRate.toFixed(1)}%`;
    const reason = (n.reason || "").replace(/\|/g, "\\|").replace(/\n/g, " ");
    lines.push(
      `| current | ${label} | ${n.decision} | ${rate} | ${n.generate} | ${reason || "—"} |`
    );
  }

  lines.push(
    "",
    "## Next steps (if UPDATE)",
    "",
    "1. Edit `functions/src/lib/ai/promptRegistry.ts` (and client mirror versions)",
    "2. Bump `version` on affected feature(s)",
    "3. Append entry to `docs/AI_PROMPT_CHANGELOG.md`",
    "4. Redeploy Generate Callables",
    "5. Re-verify via AI Operations Dashboard / VOC",
    ""
  );

  return lines.join("\n");
}

export function downloadPromptReviewMarkdown(markdown: string, date = new Date()): string {
  const ymd = date.toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  const filename = `AI_PROMPT_REVIEW_${ymd}.md`;
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return filename;
}
