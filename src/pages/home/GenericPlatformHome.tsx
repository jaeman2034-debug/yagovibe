import { Link } from "react-router-dom";

type Props = {
  /** e.g. /home/parent — 역할 맞춤 홈으로 돌아가기 */
  roleHomeHref?: string;
};

/**
 * Role home "기본 홈으로 전환" landing — hub links only (no admin AI reports).
 */
export default function GenericPlatformHome({ roleHomeHref }: Props) {
  return (
    <div className="w-full max-w-none px-3 py-6 md:mx-auto md:max-w-lg">
      <p className="text-xs font-medium uppercase tracking-wide text-blue-600">YAGO Sports</p>
      <h1 className="mt-1 text-2xl font-bold text-gray-900">플랫폼 홈</h1>
      <p className="mt-3 text-sm leading-relaxed text-gray-600">
        스포츠 허브·팀·역할 맞춤 홈으로 이동할 수 있습니다.
      </p>

      <div className="mt-8 flex flex-col gap-2">
        <Link
          to="/hub"
          className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-center text-sm font-medium text-gray-900 shadow-sm hover:bg-gray-50"
        >
          스포츠 허브
        </Link>
        <Link
          to="/my-teams"
          className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-center text-sm font-medium text-gray-900 shadow-sm hover:bg-gray-50"
        >
          내 팀 목록
        </Link>
        {roleHomeHref ? (
          <Link
            to={roleHomeHref}
            className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-center text-sm font-semibold text-indigo-900"
          >
            역할 맞춤 홈으로
          </Link>
        ) : null}
      </div>
    </div>
  );
}
