type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  bullets: readonly string[];
  emoji?: string;
};

export default function PlayComingSoonModal({
  open,
  onClose,
  title,
  eyebrow = "곧 만나요",
  bullets,
  emoji = "✨",
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-gray-950/55 backdrop-blur-[2px]"
        aria-label="닫기"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="play-coming-soon-title"
        className="relative z-[101] w-full max-w-md overflow-hidden rounded-2xl border border-indigo-200/80 bg-gradient-to-b from-white via-indigo-50/90 to-violet-100/95 p-6 shadow-2xl shadow-indigo-500/25"
      >
        <span className="text-3xl" aria-hidden>
          {emoji}
        </span>
        <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.15em] text-indigo-600">{eyebrow}</p>
        <h3 id="play-coming-soon-title" className="mt-1 text-xl font-black text-gray-900">
          {title}
        </h3>
        <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-gray-700">
          {bullets.map((line) => (
            <li key={line} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 text-sm font-bold text-white shadow-md transition hover:from-indigo-500 hover:to-violet-500 active:scale-[0.99]"
        >
          알겠어요
        </button>
      </div>
    </div>
  );
}
