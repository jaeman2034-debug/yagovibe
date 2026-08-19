/**
 * Phase B S1 — trainingBlocks client callable wrappers.
 */
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

export type TrainingBlockStatus = "draft" | "published" | "archived";

export type TrainingBlockRow = {
  blockId: string;
  teamId: string;
  title: string;
  description: string | null;
  category: string | null;
  difficulty: string | null;
  durationMinutes: number | null;
  positionTags: string[];
  coachNotes: string | null;
  status: TrainingBlockStatus;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  createdBy: string;
  updatedBy: string | null;
};

export type TrainingBlockPatchPayload = {
  title?: string;
  description?: string | null;
  category?: string | null;
  difficulty?: "beginner" | "intermediate" | "advanced" | null;
  durationMinutes?: number | null;
  positionTags?: string[] | null;
  coachNotes?: string | null;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  status?: "draft" | "published";
};

export async function callCreateTrainingBlock(payload: {
  teamId: string;
  title: string;
  description?: string;
  videoUrl?: string;
  coachNotes?: string;
}) {
  const fn = httpsCallable(functions, "createTrainingBlock");
  const res = await fn(payload);
  return res.data as { ok: true; teamId: string; blockId: string; status: "draft" };
}

export async function callUpdateTrainingBlock(payload: {
  teamId: string;
  blockId: string;
  patch: TrainingBlockPatchPayload;
}) {
  const fn = httpsCallable(functions, "updateTrainingBlock");
  const res = await fn(payload);
  return res.data as { ok: true; teamId: string; blockId: string; status: TrainingBlockStatus };
}

export async function callArchiveTrainingBlock(payload: { teamId: string; blockId: string }) {
  const fn = httpsCallable(functions, "archiveTrainingBlock");
  const res = await fn(payload);
  return res.data as { ok: true; teamId: string; blockId: string; status: "archived" };
}

export async function callListTrainingBlocks(payload: {
  teamId: string;
  status?: TrainingBlockStatus;
  limit?: number;
}) {
  const fn = httpsCallable(functions, "listTrainingBlocks");
  const res = await fn(payload);
  return res.data as { ok: true; teamId: string; blocks: TrainingBlockRow[] };
}
