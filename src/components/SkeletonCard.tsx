export default function SkeletonCard() {
  return (
    <div className="flex h-full w-full max-w-[360px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-sm animate-pulse dark:border-gray-700 dark:bg-gray-900">
      <div className="mb-3 h-48 w-full rounded-xl bg-gray-200 dark:bg-gray-700" />
      <div className="mb-2 h-5 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="mb-2 h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
    </div>
  );
}

