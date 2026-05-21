interface FeedSkeletonGridProps {
  count?: number;
}

export default function FeedSkeletonGrid({ count = 6 }: FeedSkeletonGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 p-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="h-40 rounded-xl bg-gray-200 animate-pulse" />
      ))}
    </div>
  );
}
