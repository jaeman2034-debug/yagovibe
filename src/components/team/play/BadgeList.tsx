type Props = {
  badges: readonly string[];
  title?: string;
};

const badgeTone: Record<string, string> = {
  MVP: "from-amber-500 to-orange-600 text-white ring-amber-200/80",
  출석왕: "from-emerald-500 to-teal-600 text-white ring-emerald-200/80",
  패스마스터: "from-sky-500 to-blue-600 text-white ring-blue-200/80",
  수비벽: "from-slate-600 to-slate-800 text-white ring-slate-300/80",
  "공정성 기여자": "from-violet-500 to-indigo-600 text-white ring-violet-200/80",
};

export default function BadgeList({ badges, title = "보유 배지" }: Props) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-bold text-gray-900">{title}</h4>
      {badges.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 px-4 py-8 text-center text-sm text-gray-500">
          아직 배지가 없습니다. 경기와 팀 활동으로 열립니다.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {badges.map((b) => (
            <span
              key={b}
              className={`inline-flex items-center rounded-full bg-gradient-to-r px-4 py-1.5 text-xs font-bold shadow-sm ring-1 ring-inset ${
                badgeTone[b] ?? "from-indigo-500 to-violet-600 text-white ring-indigo-200/60"
              }`}
            >
              {b}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
