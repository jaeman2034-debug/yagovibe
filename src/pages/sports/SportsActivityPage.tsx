/**
 * 🔥 Sports Activity Hub - 스포츠 활동 허브
 *
 * URL: /sports
 * 7단계: UserStage(NEW / SETUP / ACTIVE)에 따라 동일 URL에서 경험 분기
 */

import { useNavigate } from "react-router-dom";
import SportsModuleCard from "@/components/sports/SportsModuleCard";
import type { ModuleLink } from "@/components/sports/SportsModuleCard";
import { Users, Trophy, Calendar, User, BarChart, Medal, GraduationCap, Building2 } from "lucide-react";
import SportsHubRecommendCard from "@/components/sports/SportsHubRecommendCard";
import { SportsHubKpiCard } from "@/components/sports/SportsHubKpiCard";
import { SportsHubUserProvider, useSportsHubUser } from "@/context/SportsHubUserContext";
import { SportsHubTeamSummaryStrip } from "@/components/sports/SportsHubTeamSummaryStrip";
import { SportsHubRecentMatchesStrip } from "@/components/sports/SportsHubRecentMatchesStrip";
import { SportsHubOnboardingSteps } from "@/components/sports/SportsHubOnboardingSteps";
import { SportsHubRetentionSection } from "@/components/sports/SportsHubRetentionSection";
import { SportsHubMonetizationHints } from "@/components/sports/SportsHubMonetizationHints";
import { SportsHubGrowthInviteCard } from "@/components/sports/SportsHubGrowthInviteCard";
import { SportsHubAiMatchSuggestions } from "@/components/sports/SportsHubAiMatchSuggestions";
import { AppCard } from "@/components/ui/AppCard";
import { Button } from "@/components/ui/button";

const FEDERATION_NOWON_FOOTBALL = "/federations/nowon-football";

const MODULES: Array<{
  title: string;
  description: string;
  icon: typeof Users;
  links: ModuleLink[];
  iconColor?: string;
  hubAnchor?: string;
}> = [
  {
    title: "내 팀",
    description: "팀 관리 및 생성",
    icon: Users,
    hubAnchor: "team",
    links: [
      { label: "내 팀 보기", path: "/teams" },
      { label: "팀 생성", path: "/sports/soccer/team/create" },
      { label: "팀 찾기", path: "/teams/search" },
    ],
    iconColor: "text-blue-600",
  },
  {
    title: "경기",
    description: "경기 생성 및 일정 관리",
    icon: Trophy,
    hubAnchor: "match",
    links: [
      { label: "노원구 축구협회", path: FEDERATION_NOWON_FOOTBALL },
      { label: "경기 생성", path: "/match/create" },
      { label: "경기 일정", path: "/matches" },
      { label: "경기 기록", path: "/matches/results" },
    ],
    iconColor: "text-green-600",
  },
  {
    title: "팀 이벤트",
    description: "행사 및 모임 관리",
    icon: Calendar,
    hubAnchor: "event",
    links: [
      { label: "이벤트 보기", path: "/teams/events" },
      { label: "이벤트 생성", path: "/teams/events/create" },
    ],
    iconColor: "text-purple-600",
  },
  {
    title: "선수",
    description: "선수 정보 및 기록",
    icon: User,
    links: [
      { label: "선수 목록", path: "/players" },
      { label: "선수 기록", path: "/players/stats" },
    ],
    iconColor: "text-orange-600",
  },
  {
    title: "통계",
    description: "팀 및 선수 통계",
    icon: BarChart,
    links: [
      { label: "팀 통계", path: "/stats/team" },
      { label: "선수 통계", path: "/stats/player" },
      { label: "랭킹", path: "/stats/rank" },
    ],
    iconColor: "text-red-600",
  },
  {
    title: "대회",
    description: "리그 및 토너먼트 관리",
    icon: Medal,
    links: [
      { label: "대회 목록", path: "/tournaments" },
      { label: "리그", path: "/tournaments/league" },
      { label: "토너먼트", path: "/tournaments/bracket" },
    ],
    iconColor: "text-yellow-600",
  },
  {
    title: "유소년 아카데미",
    description: "훈련 및 유소년 팀 관리",
    icon: GraduationCap,
    links: [
      { label: "아카데미 목록", path: "/academy" },
      { label: "훈련 프로그램", path: "/academy/programs" },
      { label: "코치 관리", path: "/academy/coaches" },
      { label: "유소년 팀", path: "/academy/teams" },
    ],
    iconColor: "text-indigo-600",
  },
  {
    title: "협회",
    description: "리그 및 협회 관리",
    icon: Building2,
    links: [
      { label: "협회 목록", path: "/activity/tournaments" },
      { label: "노원구 축구협회", path: FEDERATION_NOWON_FOOTBALL },
    ],
    iconColor: "text-cyan-600",
  },
];

function HubModulesGrid({ focusTab }: { focusTab: string | null }) {
  return (
    <section className="min-w-0">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {MODULES.map((module, index) => (
          <SportsModuleCard
            key={index}
            title={module.title}
            description={module.description}
            icon={module.icon}
            links={module.links}
            iconColor={module.iconColor}
            hubAnchor={module.hubAnchor}
            hubHighlight={!!focusTab && !!module.hubAnchor && module.hubAnchor === focusTab}
          />
        ))}
      </div>
    </section>
  );
}

function SportsHubMain() {
  const navigate = useNavigate();
  const { stage, loading } = useSportsHubUser();

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 pb-40 md:pb-56">
        <div className="mb-6 h-44 animate-pulse rounded-xl bg-gray-200/80 dark:bg-gray-800/80" />
        <div className="mb-6 h-32 animate-pulse rounded-xl bg-gray-200/60 dark:bg-gray-800/60" />
      </main>
    );
  }

  if (stage === "NEW") {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 pb-40 md:pb-56">
        <div className="mb-3">
          <span className="inline-block rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-800 dark:bg-violet-900/40 dark:text-violet-200">
            시작하기
          </span>
        </div>
        <AppCard className="mb-6 border-violet-200/80 bg-gradient-to-br from-violet-50 to-white dark:border-violet-900/40 dark:from-violet-950/30 dark:to-gray-900">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-50">스포츠 활동 허브</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            원하는 흐름으로 바로 이동하세요. 팀 운영은 허브에서, 경기 참여는 참여 화면에서 진행할 수 있어요.
          </p>
          <Button className="mt-4" size="lg" onClick={() => navigate("/sports/match")}>
            👉 지금 경기 참여하기
          </Button>
        </AppCard>
        <SportsHubRecommendCard />
        <SportsHubRetentionSection stage="NEW" />
        <details className="mb-8 mt-8 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/80">
          <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
            전체 스포츠 메뉴 보기
          </summary>
          <div className="mt-4">
            <HubModulesGrid focusTab={null} />
          </div>
        </details>
        <div className="h-24 md:h-32 lg:h-16" />
      </main>
    );
  }

  if (stage === "SETUP") {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 pb-40 md:pb-56">
        <SportsHubOnboardingSteps />
        <SportsHubTeamSummaryStrip />
        <SportsHubRecommendCard />
        <SportsHubRetentionSection stage="SETUP" />
        <SportsHubMonetizationHints stage="SETUP" />
        <SportsHubKpiCard />
        <AppCard className="mb-6 border-amber-100 bg-amber-50/70 dark:border-amber-900/30 dark:bg-amber-950/20">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">다음 단계</p>
          <p className="mt-1 text-sm text-amber-900/90 dark:text-amber-100/90">
            아직 등록된 경기가 없어요. 첫 경기를 만들면 팀원과 상대를 찾기 쉬워져요.
          </p>
          <Button className="mt-4" onClick={() => navigate("/match/create")}>
            첫 경기 만들기
          </Button>
        </AppCard>
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-gray-50">스포츠 활동</h1>
          <p className="text-lg text-gray-500 dark:text-gray-400">팀을 만들었어요. 이제 경기와 일정을 잡아보세요.</p>
        </div>
        <HubModulesGrid focusTab={null} />
        <div className="h-24 md:h-32 lg:h-16" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 pb-40 md:pb-56">
      <SportsHubOnboardingSteps />
      <SportsHubTeamSummaryStrip />
      <SportsHubRecommendCard />
      <SportsHubGrowthInviteCard stage="ACTIVE" />
      <SportsHubRetentionSection stage="ACTIVE" />
      <SportsHubMonetizationHints stage="ACTIVE" />
      <SportsHubKpiCard />
      <SportsHubRecentMatchesStrip />
      <SportsHubAiMatchSuggestions />
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-gray-50">스포츠 활동</h1>
        <p className="text-lg text-gray-500 dark:text-gray-400">
          팀, 경기, 선수, 통계 및 대회를 관리하세요
        </p>
      </div>
      <HubModulesGrid focusTab={null} />
      <div className="h-24 md:h-32 lg:h-16" />
    </main>
  );
}

export default function SportsActivityPage() {
  return (
    <div className="bg-gray-50 sports-activity-root dark:bg-gray-950">
      <SportsHubUserProvider>
        <SportsHubMain />
      </SportsHubUserProvider>
    </div>
  );
}
