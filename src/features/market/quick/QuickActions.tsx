type Props = {
  onNearMe: () => void;
  onCreateListing: () => void;
};

/** Quick 전용 — 행동 2개 */
export function QuickActions({ onNearMe, onCreateListing }: Props) {
  return (
    <div className="mb-3 flex gap-2 border-b border-gray-100 bg-white px-4 sm:px-6">
      <button
        type="button"
        onClick={onNearMe}
        className="flex h-10 flex-1 items-center justify-center gap-1 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-800 shadow-sm transition hover:bg-gray-50"
      >
        <span aria-hidden>📍</span>
        내 근처
      </button>
      <button
        type="button"
        onClick={onCreateListing}
        className="flex h-10 flex-1 items-center justify-center gap-1 rounded-lg bg-blue-600 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
      >
        <span aria-hidden>➕</span>
        거래 등록
      </button>
    </div>
  );
}
