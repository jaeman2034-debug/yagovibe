type Props = {
  title?: string;
  message?: string;
};

/** Non-academy team or blocked persona — hard fail (no club roster fallback). */
export function AcademyUnsupportedView({
  title = "아카데미 전용 명단",
  message = "이 보기는 유소년 아카데미 팀에서만 사용할 수 있습니다. 일반 팀은 멤버 탭을 이용해 주세요.",
}: Props) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
      <h2 className="text-sm font-semibold text-amber-950 dark:text-amber-100">{title}</h2>
      <p className="mt-1 text-xs leading-relaxed text-amber-900/90 dark:text-amber-200/90">{message}</p>
    </div>
  );
}
