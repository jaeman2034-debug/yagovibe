import { useState } from "react";
import { toast } from "sonner";
import { FirebaseError } from "firebase/app";
import {
  callArchiveTrainingBlock,
  callCreateTrainingBlock,
  callUpdateTrainingBlock,
  type TrainingBlockPatchPayload,
} from "@/features/academy/training-blocks/mutations/trainingBlockCallables";

type Args = {
  refresh: () => Promise<void>;
};

function blockErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof FirebaseError) {
    if (error.code.includes("permission-denied")) return "권한이 없습니다.";
    if (error.code.includes("failed-precondition")) return error.message || fallback;
    if (error.code.includes("invalid-argument")) return error.message || fallback;
    if (error.code.includes("unauthenticated")) return "로그인이 필요합니다.";
    return error.message || fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

export function useTrainingBlockActions({ refresh }: Args) {
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  async function runMutation(key: string, fn: () => Promise<void>, success: string, fallback: string) {
    setPendingKey(key);
    try {
      await fn();
      await refresh();
      toast.success(success);
    } catch (error) {
      toast.error(blockErrorMessage(error, fallback));
      throw error;
    } finally {
      setPendingKey(null);
    }
  }

  return {
    pendingKey,
    createBlock: (args: {
      teamId: string;
      title: string;
      description?: string;
      videoUrl?: string;
      coachNotes?: string;
    }) =>
      runMutation(
        "create-block",
        () => callCreateTrainingBlock(args).then(() => undefined),
        "훈련 블록이 생성되었습니다.",
        "훈련 블록 생성에 실패했습니다."
      ),
    updateBlock: (args: { teamId: string; blockId: string; patch: TrainingBlockPatchPayload }) =>
      runMutation(
        `update-${args.blockId}`,
        () => callUpdateTrainingBlock(args).then(() => undefined),
        "훈련 블록이 수정되었습니다.",
        "훈련 블록 수정에 실패했습니다."
      ),
    archiveBlock: (args: { teamId: string; blockId: string }) =>
      runMutation(
        `archive-${args.blockId}`,
        () => callArchiveTrainingBlock(args).then(() => undefined),
        "훈련 블록이 보관되었습니다.",
        "훈련 블록 보관에 실패했습니다."
      ),
  };
}
