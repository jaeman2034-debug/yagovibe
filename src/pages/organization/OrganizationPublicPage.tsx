import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

const KNOWN: Record<string, { name: string; blurb: string }> = {
  "nowon-football": {
    name: "노원구 축구협회",
    blurb: "노원구 공식 축구 리그 운영",
  },
};

/**
 * 공개 협회/기관 랜딩 (활동 탭 OrganizationCard 등에서 진입)
 * 경로: /organization/:orgSlug
 */
export default function OrganizationPublicPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const navigate = useNavigate();
  const meta = orgSlug ? KNOWN[orgSlug] : undefined;

  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-white px-4 py-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-6 inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        뒤로
      </button>
      <h1 className="text-xl font-bold text-gray-900">
        {meta?.name || orgSlug || "협회"}
      </h1>
      <p className="mt-2 text-sm text-gray-600">
        {meta?.blurb || "협회 소개 및 공지는 준비 중입니다."}
      </p>
    </div>
  );
}
