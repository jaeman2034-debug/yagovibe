import type { BatchAutoBuildProgress } from "@/hooks/useFederationBatchAutoBuild";

type Props = {
  progress: BatchAutoBuildProgress;
  onDismissError?: () => void;
  /** 생성·구성 단계에서 배치 중단(이미 나간 요청은 끝까지 진행될 수 있음) */
  onCancel?: () => void;
};

const LABELS: Record<Exclude<BatchAutoBuildProgress["phase"], "idle">, string> = {
  generating: "이미지 분석·문안 생성 중…",
  composing: "페이지 구성 중…",
  saving: "Draft 반영 준비 중…",
  done: "완료되었습니다.",
  error: "오류가 발생했습니다.",
};

export default function BatchAutoBuildProgress({ progress, onDismissError, onCancel }: Props) {
  if (progress.phase === "idle") return null;

  const showCancel =
    (progress.phase === "generating" || progress.phase === "composing") && typeof onCancel === "function";

  const sub =
    progress.phase === "generating"
      ? `(${progress.done}/${progress.total})`
      : progress.phase === "error"
        ? progress.message
        : null;

  return (
    <div
      className="fixed bottom-6 right-6 z-50 max-w-sm rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-white shadow-xl"
      role="status"
      aria-live="polite"
    >
      <div className="text-sm font-semibold text-white">
        <span className="mr-1.5" aria-hidden>
          ⚡
        </span>
        {LABELS[progress.phase]}
        {sub ? <span className="font-normal text-gray-300"> {sub}</span> : null}
      </div>
      {showCancel ? (
        <button
          type="button"
          className="mt-2 block text-xs text-gray-300 underline hover:text-white"
          onClick={onCancel}
        >
          중단
        </button>
      ) : null}
      {progress.phase === "error" && onDismissError ? (
        <button
          type="button"
          className="mt-2 text-xs text-amber-300 underline hover:text-amber-200"
          onClick={onDismissError}
        >
          닫기
        </button>
      ) : null}
    </div>
  );
}
