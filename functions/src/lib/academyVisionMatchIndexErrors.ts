/**
 * PAI-031 FIX A — visionMatchIndex error field assign (pure; merge-safe clear)
 */
import type { VisionRunStatus } from "./academyVisionTypes";

/**
 * Failed writes set error fields. Any non-failed status clears them via `deleteSentinel`
 * (production: FieldValue.delete()) so prior failed sibling errors do not linger on merge.
 */
export function assignVisionMatchIndexErrorFields(
  patch: Record<string, unknown>,
  params: {
    status: VisionRunStatus | "uploading";
    errorCode?: string | null;
    errorMessage?: string | null;
  },
  deleteSentinel: unknown
): void {
  if (params.status === "failed") {
    if (params.errorCode) patch.errorCode = params.errorCode;
    if (params.errorMessage) patch.errorMessage = params.errorMessage;
    return;
  }
  patch.errorCode = deleteSentinel;
  patch.errorMessage = deleteSentinel;
}
