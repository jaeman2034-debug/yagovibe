/**
 * VOC-011 — Parent peer (team · ageGroup) FII benchmark card
 */

import { Users } from "lucide-react";
import { VisionCardFrame } from "@/components/vision/VisionCardFrame";
import { useParentIntelligenceView } from "@/components/vision/parent/ParentIntelligenceProvider";

function formatDelta(delta: number): string {
  if (delta > 0) return `+${delta}`;
  return String(delta);
}

export function ParentPeerBenchmarkCard() {
  const { state, view } = useParentIntelligenceView();
  const loading = state.status === "loading";
  const error = state.status === "error" ? state.message : null;
  const peer = view?.peerBenchmark ?? null;
  const showEmpty = state.status === "ready" && !peer;

  if (state.status === "ready" && !peer) {
    return null;
  }

  return (
    <VisionCardFrame
      title="또래 평균 비교"
      testId="parent-peer-benchmark-card"
      loading={loading}
      error={error}
      empty={showEmpty}
      emptyMessage=""
    >
      {peer ? (
        <div className="space-y-3" data-testid="parent-peer-benchmark-body">
          <div className="flex gap-3 rounded-xl border border-sky-200 bg-sky-50/80 px-3 py-3">
            <Users className="mt-0.5 h-5 w-5 shrink-0 text-sky-700" aria-hidden />
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-semibold leading-relaxed text-sky-950">
                {peer.headlineCopy}
              </p>
              {peer.ageGroup ? (
                <p className="text-xs text-sky-800/90">
                  {peer.ageGroup} · 분석 참여 {peer.n}명
                </p>
              ) : (
                <p className="text-xs text-sky-800/90">분석 참여 {peer.n}명</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-indigo-100 bg-white px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-600">
                우리 아이
              </p>
              <p className="mt-1 text-lg font-black tabular-nums text-indigo-950">
                {peer.childValue != null ? peer.childValue : "—"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-600">
                또래 평균
              </p>
              <p className="mt-1 text-lg font-black tabular-nums text-slate-900">
                {peer.peerMean}
              </p>
            </div>
          </div>
          {peer.delta != null ? (
            <p className="text-xs text-indigo-800">
              차이{" "}
              <strong className="tabular-nums text-indigo-950">{formatDelta(peer.delta)}</strong>
              {" · "}FII 기준
            </p>
          ) : null}
        </div>
      ) : null}
    </VisionCardFrame>
  );
}
