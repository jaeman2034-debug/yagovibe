import { Link, Navigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useResolvedHomeRole } from "@/hooks/useResolvedHomeRole";
import {
  type HomeRoleSegment,
  homeSegmentToPath,
} from "@/lib/team/resolveHomeRole";

const VALID_PARAMS = new Set(["admin", "coach", "parent", "player"]);

const COPY: Record<
  HomeRoleSegment,
  { title: string; description: string; hint: string }
> = {
  admin: {
    title: "팀 관리 홈",
    description: "오너·매니저 기준으로 팀 운영·멤버·설정에 빠르게 접근할 수 있어요.",
    hint: "팀 생성·초대·회비 등은 각 팀 화면과 관리 메뉴에서 이어집니다.",
  },
  coach: {
    title: "코치 홈",
    description: "오늘 훈련·출석·선수 목록을 한 흐름에서 보는 화면으로 확장할 수 있어요.",
    hint: "팀을 선택한 뒤 일정·멤버 탭에서 출석을 처리하면 됩니다.",
  },
  parent: {
    title: "보호자 홈",
    description: "자녀 단위 일정·출석·공지를 중심으로 보는 홈입니다.",
    hint: "자녀 연결·팀 초대는 알림 또는 팀 초대 링크를 통해 이어집니다.",
  },
  player: {
    title: "선수 홈",
    description: "내 일정·출석·팀 공지를 모아 보는 화면의 시작점입니다.",
    hint: "소속 팀이 있으면 아래에서 바로 들어갈 수 있어요.",
  },
};

function paramToSegment(param: string | undefined): HomeRoleSegment | null {
  if (!param || !VALID_PARAMS.has(param)) return null;
  return param as HomeRoleSegment;
}

export default function HomeByRolePage() {
  const { homeRole } = useParams<{ homeRole: string }>();
  const segmentParam = paramToSegment(homeRole);
  const { segment, loading } = useResolvedHomeRole();

  if (!segmentParam) {
    return <Navigate to="/home" replace />;
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-gray-600">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm">불러오는 중…</p>
      </div>
    );
  }

  if (!segment) {
    return (
      <div className="w-full max-w-none px-3 md:mx-auto md:max-w-lg py-8">
        <p className="text-sm text-gray-600">
          아직 소속 팀이 없거나 역할 정보가 없습니다. 기본 홈으로 이동합니다.
        </p>
        <Link to="/home" className="mt-4 inline-block text-sm font-medium text-blue-600">
          기본 홈으로
        </Link>
      </div>
    );
  }

  if (segment !== segmentParam) {
    return <Navigate to={homeSegmentToPath(segment)} replace />;
  }

  const meta = COPY[segmentParam];

  return (
    <div className="w-full max-w-none px-3 md:mx-auto md:max-w-lg py-6">
      <p className="text-xs font-medium uppercase tracking-wide text-blue-600">역할 맞춤 홈</p>
      <h1 className="mt-1 text-2xl font-bold text-gray-900">{meta.title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-gray-600">{meta.description}</p>
      <p className="mt-2 text-xs text-gray-500">{meta.hint}</p>

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
        <Link to="/home" className="py-2 text-center text-sm text-gray-500 underline">
          기본 홈으로 전환
        </Link>
      </div>
    </div>
  );
}
