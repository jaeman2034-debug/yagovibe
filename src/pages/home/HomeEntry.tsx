import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useResolvedHomeRole } from "@/hooks/useResolvedHomeRole";
import { homeSegmentToPath } from "@/lib/team/resolveHomeRole";
import HomeMain from "@/pages/home/Home";

/**
 * `/home` — 역할이 있으면 `/home/{admin|coach|parent|player}` 로 치환, 없으면 기존 홈(허브 카드형).
 */
export default function HomeEntry() {
  const navigate = useNavigate();
  const { segment, loading } = useResolvedHomeRole();

  useEffect(() => {
    if (loading || !segment) return;
    const path = homeSegmentToPath(segment);
    navigate(path, { replace: true });
  }, [loading, segment, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-gray-600">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm">홈 화면을 준비하는 중…</p>
      </div>
    );
  }

  if (segment) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-gray-500">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        <p className="text-sm">이동 중…</p>
      </div>
    );
  }

  return <HomeMain />;
}
