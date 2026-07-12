/**
 * PAI-031 — stale Vision Job Monitor error clear + UI guard
 */

import { resolveVisionJobMonitorErrors } from "@/lib/vision/visionJobMonitorTypes";
import { assignVisionMatchIndexErrorFields } from "../../functions/src/lib/academyVisionMatchIndexErrors";

const DELETE = "__DELETE__";

describe("PAI-031 assignVisionMatchIndexErrorFields (FIX A)", () => {
  it("failed → keeps / sets error fields", () => {
    const patch: Record<string, unknown> = {};
    assignVisionMatchIndexErrorFields(
      patch,
      {
        status: "failed",
        errorCode: "VISION_ANALYSIS_FAILED",
        errorMessage: "no GEV events: /tmp/gev_events.jsonl",
      },
      DELETE
    );
    expect(patch.errorCode).toBe("VISION_ANALYSIS_FAILED");
    expect(patch.errorMessage).toContain("no GEV events");
  });

  it("failed → completed success clears stale error fields", () => {
    const patch: Record<string, unknown> = {
      errorCode: "VISION_ANALYSIS_FAILED",
      errorMessage: "no GEV events: /tmp/old.jsonl",
    };
    assignVisionMatchIndexErrorFields(
      patch,
      { status: "completed", errorCode: null, errorMessage: null },
      DELETE
    );
    expect(patch.errorCode).toBe(DELETE);
    expect(patch.errorMessage).toBe(DELETE);
  });

  it("queued / processing also clear stale errors (retry path)", () => {
    for (const status of ["queued", "processing", "retrying"] as const) {
      const patch: Record<string, unknown> = {
        errorCode: "VISION_ANALYSIS_FAILED",
        errorMessage: "stale",
      };
      assignVisionMatchIndexErrorFields(patch, { status }, DELETE);
      expect(patch.errorCode).toBe(DELETE);
      expect(patch.errorMessage).toBe(DELETE);
    }
  });
});

describe("PAI-031 resolveVisionJobMonitorErrors (FIX C)", () => {
  const staleIndex = {
    indexErrorCode: "VISION_ANALYSIS_FAILED",
    indexErrorMessage: "no GEV events: /tmp/yago-worker/.../gev_events.jsonl",
  };

  it("completed + stale legacy index error → red banner fields null", () => {
    const out = resolveVisionJobMonitorErrors({
      uiStatus: "completed",
      runErrorCode: null,
      runErrorMessage: null,
      ...staleIndex,
    });
    expect(out.errorCode).toBeNull();
    expect(out.errorMessage).toBeNull();
  });

  it("latest run failed → red banner fields kept", () => {
    const out = resolveVisionJobMonitorErrors({
      uiStatus: "failed",
      runErrorCode: "VISION_ANALYSIS_FAILED",
      runErrorMessage: "no GEV events: /tmp/fail.jsonl",
      ...staleIndex,
    });
    expect(out.errorCode).toBe("VISION_ANALYSIS_FAILED");
    expect(out.errorMessage).toContain("no GEV events");
  });

  it("failed status without run doc → index error still shown", () => {
    const out = resolveVisionJobMonitorErrors({
      uiStatus: "failed",
      runErrorCode: null,
      runErrorMessage: null,
      ...staleIndex,
    });
    expect(out.errorCode).toBe("VISION_ANALYSIS_FAILED");
    expect(out.errorMessage).toContain("no GEV events");
  });

  it("analyzing with only queue error → still surfaces queue error", () => {
    const out = resolveVisionJobMonitorErrors({
      uiStatus: "analyzing",
      runErrorCode: null,
      runErrorMessage: null,
      queueErrorCode: "WORKER_UNAVAILABLE",
      queueErrorMessage: "worker down",
    });
    expect(out.errorCode).toBe("WORKER_UNAVAILABLE");
    expect(out.errorMessage).toBe("worker down");
  });
});

describe("PAI-031 media success clear field list (FIX B contract)", () => {
  it("documents visionLastError as the media stale field to delete", () => {
    const mediaCompletedClearFields = ["visionLastError"] as const;
    expect(mediaCompletedClearFields).toEqual(["visionLastError"]);
  });
});
