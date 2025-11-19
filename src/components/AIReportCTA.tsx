import { Link } from "react-router-dom";

export default function AIReportCTA() {
  return (
    <div className="w-full flex justify-center mt-6">
      <Link
        to="/home"
        className="inline-flex items-center gap-2 rounded-2xl px-5 py-3
                   shadow-md hover:shadow-lg transition-all duration-200
                   bg-white/90 dark:bg-neutral-800/90
                   ring-1 ring-black/10 dark:ring-white/10
                   hover:scale-[1.02] active:scale-[0.99]"
        aria-label="AI 리포트 대시보드 보기"
      >
        <span className="text-2xl">⚡</span>
        <span className="text-base font-semibold text-indigo-600 dark:text-indigo-300">
          AI 리포트 대시보드 보기
        </span>
      </Link>
    </div>
  );
}

