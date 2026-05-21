type HomePostRowProps = {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  onClick: () => void;
};

export function HomePostRow({ title, subtitle, imageUrl, onClick }: HomePostRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg border border-transparent px-1 py-2 text-left transition-colors hover:bg-gray-50"
    >
      {imageUrl ? (
        <img src={imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-md object-cover" />
      ) : (
        <div className="h-12 w-12 shrink-0 rounded-md bg-gray-100" aria-hidden />
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-gray-900">{title}</div>
        {subtitle ? <div className="truncate text-xs text-gray-500">{subtitle}</div> : null}
      </div>
    </button>
  );
}
