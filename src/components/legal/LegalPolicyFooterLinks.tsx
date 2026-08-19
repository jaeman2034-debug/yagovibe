import { Link } from "react-router-dom";

export function LegalPolicyFooterLinks({ className }: { className?: string }) {
  const linkClass =
    "text-xs text-emerald-800 underline underline-offset-2 hover:text-emerald-950";
  return (
    <nav
      className={className ?? "flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600"}
      aria-label="정책 및 약관"
    >
      <Link to="/privacy" className={linkClass}>
        개인정보 처리방침
      </Link>
      <span className="text-gray-300" aria-hidden>
        ·
      </span>
      <Link to="/terms" className={linkClass}>
        이용약관
      </Link>
      <span className="text-gray-300" aria-hidden>
        ·
      </span>
      <Link to="/video-analysis-policy" className={linkClass}>
        영상 분석 정책
      </Link>
    </nav>
  );
}
