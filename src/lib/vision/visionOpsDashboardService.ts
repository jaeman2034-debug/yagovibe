/**
 * Pilot Operations Dashboard — read-only Firestore aggregation (client)
 */

import {
  collection,
  getDocs,
  type DocumentData,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { VISION_PILOT_BETA_CONFIG } from "@/lib/vision/visionPilotBetaConfig";
import {
  classifyVisionRunFailure,
  isProductionRun,
} from "@/lib/vision/visionOpsFailureClassification";
import type {
  VisionOpsDashboardData,
  VisionOpsFailureBreakdown,
  VisionOpsReadinessGrades,
  VisionOpsRunSummary,
} from "@/lib/vision/visionOpsDashboardTypes";

function pct(n: number, d: number): number | null {
  if (!d) return null;
  return Math.round((n / d) * 10000) / 100;
}

function median(nums: number[]): number | null {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

function p95(nums: number[]): number | null {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil(s.length * 0.95) - 1)] ?? null;
}

function tsMs(v: unknown): number | null {
  if (!v) return null;
  const t = v as Timestamp;
  if (typeof t.toMillis === "function") return t.toMillis();
  const n = new Date(String(v)).getTime();
  return Number.isFinite(n) ? n : null;
}

function processingMin(started: unknown, completed: unknown): number | null {
  const a = tsMs(started);
  const b = tsMs(completed);
  if (a == null || b == null || b <= a) return null;
  return (b - a) / 60000;
}

async function fetchVisionRunsForMedia(teamId: string, mediaId: string) {
  const snap = await getDocs(
    collection(db, "teams", teamId, "aiIngest", mediaId, "visionRuns")
  );
  return snap.docs.map((d) => ({ mediaId, runId: d.id, ...d.data() }));
}

async function countGevCandidates(teamId: string, mediaId: string) {
  const snap = await getDocs(
    collection(db, "teams", teamId, "aiIngest", mediaId, "gevEventCandidates")
  );
  return tallyCoachReviews(snap.docs.map((d) => d.data()));
}

type CoachTally = { approved: number; rejected: number; pending: number; latencyHours: number[] };

function tallyCoachReviews(docs: DocumentData[]): CoachTally {
  let approved = 0;
  let rejected = 0;
  let pending = 0;
  const latencyHours: number[] = [];

  for (const data of docs) {
    const s = String(data.reviewStatus ?? "candidate");
    if (s === "approved" || s === "corrected") approved++;
    else if (s === "rejected") rejected++;
    else pending++;

    if (s === "approved" || s === "corrected" || s === "rejected") {
      const created = tsMs(data.createdAt);
      const reviewed = tsMs(data.reviewedAt);
      if (created != null && reviewed != null && reviewed > created) {
        latencyHours.push((reviewed - created) / 3600000);
      }
    }
  }

  return { approved, rejected, pending, latencyHours };
}

async function countCvRuns(teamId: string, mediaId: string) {
  const snap = await getDocs(collection(db, "teams", teamId, "aiIngest", mediaId, "cvRuns"));
  return tallyCoachReviews(snap.docs.map((d) => d.data()));
}

async function countInterpretationCandidates(teamId: string, mediaId: string) {
  const linksSnap = await getDocs(
    collection(db, "teams", teamId, "aiIngest", mediaId, "cvGrowthLinks")
  );
  const nested = await Promise.all(
    linksSnap.docs.map((link) =>
      getDocs(
        collection(
          db,
          "teams",
          teamId,
          "aiIngest",
          mediaId,
          "cvGrowthLinks",
          link.id,
          "interpretationCandidates"
        )
      )
    )
  );
  const docs = nested.flatMap((s) => s.docs.map((d) => d.data()));
  return tallyCoachReviews(docs);
}

function mergeCoachTallies(...tallies: CoachTally[]): CoachTally {
  return tallies.reduce(
    (acc, t) => ({
      approved: acc.approved + t.approved,
      rejected: acc.rejected + t.rejected,
      pending: acc.pending + t.pending,
      latencyHours: acc.latencyHours.concat(t.latencyHours),
    }),
    { approved: 0, rejected: 0, pending: 0, latencyHours: [] as number[] }
  );
}

export async function fetchVisionOpsDashboard(teamId: string): Promise<VisionOpsDashboardData> {
  const t0 = performance.now();
  const tid = teamId.trim();

  const ingestSnap = await getDocs(collection(db, "teams", tid, "aiIngest"));
  const mediaIds = ingestSnap.docs.map((d) => d.id);

  const [runsNested, gevTallies, cvTallies, interpTallies] = await Promise.all([
    Promise.all(mediaIds.map((mid) => fetchVisionRunsForMedia(tid, mid))),
    Promise.all(mediaIds.map((mid) => countGevCandidates(tid, mid))),
    Promise.all(mediaIds.map((mid) => countCvRuns(tid, mid))),
    Promise.all(mediaIds.map((mid) => countInterpretationCandidates(tid, mid))),
  ]);

  const allRuns = runsNested.flat();
  const gevReview = mergeCoachTallies(...gevTallies);
  const cvReview = mergeCoachTallies(...cvTallies);
  const interpReview = mergeCoachTallies(...interpTallies);
  const coachTotal = mergeCoachTallies(gevReview, cvReview, interpReview);

  const completed = allRuns.filter((r) => r.status === "completed");
  const failed = allRuns.filter((r) => r.status === "failed");
  const productionRuns = allRuns.filter((r) => isProductionRun(r as DocumentData));
  const productionCompleted = productionRuns.filter((r) => r.status === "completed");

  const grades: VisionOpsReadinessGrades = {
    A: 0,
    B: 0,
    C: 0,
    D: 0,
    F: 0,
    unknown: 0,
  };
  const readinessScores: number[] = [];
  let gevGatePass = 0;
  let gevGateBlock = 0;

  const gevDist: Record<string, number> = {};
  let gevTotal = 0;
  let gevRunsWithEvents = 0;
  const processingMins: number[] = [];
  let retryCount = 0;

  const failureBreakdown: VisionOpsFailureBreakdown = {
    operational: 0,
    algorithm: 0,
    input_quality: 0,
    none: 0,
  };

  for (const run of allRuns) {
    const cat = classifyVisionRunFailure(run as DocumentData);
    if (cat) failureBreakdown[cat]++;
    else failureBreakdown.none++;

    if (run.visionReadinessScore != null) {
      readinessScores.push(Number(run.visionReadinessScore));
    }
    const g = String(run.visionReadinessGrade ?? "unknown");
    if (g in grades) grades[g as keyof VisionOpsReadinessGrades]++;
    else grades.unknown++;

    if (run.visionReadinessGevAllowed === true) gevGatePass++;
    else if (run.visionReadinessGevAllowed === false) gevGateBlock++;

    const cnt = Number(run.gevEventCount ?? 0);
    if (cnt > 0) {
      gevRunsWithEvents++;
      gevTotal += cnt;
    }
    const sub = run.gevSummary as { eventCounts?: Record<string, number> } | undefined;
    if (sub?.eventCounts) {
      for (const [k, v] of Object.entries(sub.eventCounts)) {
        gevDist[k] = (gevDist[k] ?? 0) + Number(v);
      }
    }

    const pm = processingMin(run.startedAt ?? run.createdAt, run.completedAt);
    if (pm != null) processingMins.push(pm);

    if (Number(run.retryCount ?? 0) > 0) retryCount++;
  }

  const samplesSnap = await getDocs(collection(db, "teams", tid, "visionTrainingSamples"));
  const approvedSamples = samplesSnap.docs.filter(
    (d) =>
      ["approved", "corrected"].includes(String(d.data().coachDecision)) &&
      d.data().status === "included"
  ).length;

  const registrySnap = await getDocs(collection(db, "visionMlopsDatasetRegistry"));
  const registries = registrySnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  registries.sort(
    (a, b) => (tsMs(b.createdAt) ?? 0) - (tsMs(a.createdAt) ?? 0)
  );
  const latest = registries[0] as DocumentData | undefined;

  const sampleCount = approvedSamples;
  const shadowGates = [
    { id: "Shadow-10", target: 10, current: sampleCount, pass: sampleCount >= 10 },
    { id: "Shadow-25", target: 25, current: sampleCount, pass: sampleCount >= 25 },
    { id: "Shadow-50", target: 50, current: sampleCount, pass: sampleCount >= 50 },
    { id: "Shadow-100", target: 100, current: sampleCount, pass: sampleCount >= 100 },
  ];

  const issueMap: Record<string, number> = {};
  for (const run of allRuns) {
    const cat = classifyVisionRunFailure(run as DocumentData);
    if (cat === "operational") {
      issueMap["Worker deploy / retry"] = (issueMap["Worker deploy / retry"] ?? 0) + 1;
    } else if (cat === "algorithm") {
      issueMap["GEV empty (algorithm)"] = (issueMap["GEV empty (algorithm)"] ?? 0) + 1;
    } else if (cat === "input_quality") {
      issueMap["Low readiness gate"] = (issueMap["Low readiness gate"] ?? 0) + 1;
    }
  }
  if (gevReview.pending > 0) {
    issueMap["GEV review backlog"] = gevReview.pending;
  }

  const topIssues = Object.entries(issueMap)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const recentRuns: VisionOpsRunSummary[] = [...allRuns]
    .sort((a, b) => (tsMs(b.startedAt ?? b.createdAt) ?? 0) - (tsMs(a.startedAt ?? a.createdAt) ?? 0))
    .slice(0, 8)
    .map((r) => ({
      mediaId: r.mediaId,
      runId: r.runId,
      status: String(r.status),
      gevStatus: r.gevStatus as string | null | undefined,
      gevEventCount: r.gevEventCount as number | null | undefined,
      visionReadinessScore: r.visionReadinessScore as number | null | undefined,
      visionReadinessGrade: r.visionReadinessGrade as string | null | undefined,
      failureCategory: classifyVisionRunFailure(r as DocumentData),
    }));

  const loadMs = Math.round(performance.now() - t0);

  return {
    teamId: tid,
    collectedAt: new Date().toISOString(),
    loadMs,
    preset: VISION_PILOT_BETA_CONFIG.productionPreset,

    overview: {
      uploadCount: mediaIds.length,
      completedAnalyses: completed.length,
      failedAnalyses: failed.length,
      rawSuccessRate: pct(completed.length, allRuns.length) ?? 0,
      productionSuccessRate: pct(productionCompleted.length, productionRuns.length) ?? 0,
      productionAttempted: productionRuns.length,
    },

    quality: {
      avgReadiness: readinessScores.length
        ? Math.round(
            (readinessScores.reduce((a, b) => a + b, 0) / readinessScores.length) * 10
          ) / 10
        : null,
      gradeDistribution: grades,
      gevGatePassRate: pct(gevGatePass, gevGatePass + gevGateBlock),
      runsWithScore: readinessScores.length,
    },

    gev: {
      runsWithEvents: gevRunsWithEvents,
      totalEvents: gevTotal,
      distribution: gevDist,
      pendingReview: gevReview.pending,
    },

    coach: {
      approved: coachTotal.approved,
      rejected: coachTotal.rejected,
      pending: coachTotal.pending,
      approvalRateReviewed: pct(
        coachTotal.approved,
        coachTotal.approved + coachTotal.rejected
      ),
      avgReviewLatencyHours: coachTotal.latencyHours.length
        ? Math.round(
            (coachTotal.latencyHours.reduce((a, b) => a + b, 0) /
              coachTotal.latencyHours.length) *
              10
          ) / 10
        : null,
      bySource: {
        gevEventCandidates: {
          approved: gevReview.approved,
          rejected: gevReview.rejected,
          pending: gevReview.pending,
        },
        cvRuns: {
          approved: cvReview.approved,
          rejected: cvReview.rejected,
          pending: cvReview.pending,
        },
        interpretationCandidates: {
          approved: interpReview.approved,
          rejected: interpReview.rejected,
          pending: interpReview.pending,
        },
      },
    },

    shadow: {
      approvedSamples: sampleCount,
      registryVersions: registries.length,
      latestDatasetVersion: latest ? String(latest.id ?? "") : null,
      latestSampleCount: Number(latest?.sampleCount ?? 0),
      eventDistribution: (latest?.eventDistribution as Record<string, number>) ?? {},
      gates: shadowGates,
    },

    operations: {
      medianProcessingMin: median(processingMins),
      p95ProcessingMin: p95(processingMins),
      errorRate: pct(failed.length, allRuns.length),
      retryRate: pct(retryCount, allRuns.length),
      failureBreakdown,
      topIssues,
    },

    recentRuns,
  };
}
