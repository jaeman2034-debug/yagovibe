import { Link, useParams, useSearchParams } from "react-router-dom";
import CenterLayout from "@/layouts/CenterLayout";

export default function TeamBillingFailPage() {
  const { teamId = "" } = useParams<{ teamId: string }>();
  const [searchParams] = useSearchParams();
  const code = searchParams.get("code") || "";
  const rawMsg = searchParams.get("message") || "";
  const msg = (() => {
    if (!rawMsg) return "";
    try {
      return decodeURIComponent(rawMsg);
    } catch {
      return rawMsg;
    }
  })();

  return (
    <CenterLayout>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-red-700">카드 등록에 실패했습니다</h1>
        {code && (
          <p className="mt-2 font-mono text-xs text-gray-500">
            코드: {code}
          </p>
        )}
        {msg && <p className="mt-2 text-sm text-gray-700">{msg}</p>}
        {!msg && !code && (
          <p className="mt-2 text-sm text-gray-600">창을 닫았거나 인증이 중단되었을 수 있습니다.</p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to={`/team/${encodeURIComponent(teamId)}?tab=home`}
            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            팀 홈으로
          </Link>
        </div>
      </div>
    </CenterLayout>
  );
}
