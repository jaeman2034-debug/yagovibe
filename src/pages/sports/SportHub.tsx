// src/pages/sports/SportHub.tsx
// 🔥 종목별 허브 컴포넌트 (단일)

import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthProvider";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Paywall from "@/components/Paywall";
// 🔥 플랫폼 활동 로그 (CTR과 분리된 레이어)
import { logPageView, logSportSelected } from "@/lib/activityLog";

// 종목 라벨 매핑
const SPORT_LABEL: { [key: string]: string } = {
  football: "축구",
  basketball: "농구",
  baseball: "야구",
  volleyball: "배구",
  golf: "골프",
  tennis: "테니스",
  running: "러닝",
  swimming: "수영",
  fitness: "헬스/피트니스",
  badminton: "배드민턴",
  "table-tennis": "탁구",
  yoga: "요가/필라테스",
  climbing: "클라이밍",
  billiards: "당구",
};

// 종목 아이콘 매핑
const SPORT_ICON: { [key: string]: string } = {
  football: "⚽",
  basketball: "🏀",
  baseball: "⚾",
  volleyball: "🏐",
  golf: "⛳",
  tennis: "🎾",
  running: "🏃",
  swimming: "🏊",
  fitness: "💪",
  badminton: "🏸",
  "table-tennis": "🏓",
  yoga: "🧘",
  climbing: "🧗",
  billiards: "🎱",
};

// Action 아이콘 매핑
const ACTION_ICONS: { [key: string]: string } = {
  "team-manage": "🧑‍🤝‍🧑",
  "find-team": "👥",
  facility: "📍",
};

// 🔥 3대 코어 그리드 (활동/팀/이벤트만 유지)
// 1. 팀 찾기 (커뮤니티 확장)
// 2. 구장 찾기 (오프라인 연결)
// 3. 내 팀 (운영 핵심)
const ACTIONS = [
  { key: "find-team", label: "팀 찾기" },
  { key: "facility", label: "구장 찾기" },
  { key: "team-manage", label: "내 팀", paywall: true }, // ⭐ Pro
];

// 🔥 스토리 존 컴포넌트 import
import { StoryZone } from "@/components/story/StoryZone";

// Action Grid 컴포넌트 (정렬 규격 통일 - 아이콘 상단/텍스트 하단)
function ActionGrid({
  actions,
  context,
  onActionClick,
}: {
  actions: typeof ACTIONS;
  context: { sport: string };
  onActionClick: (key: string) => void;
}) {
  return (
    <section className="grid grid-cols-2 gap-3 px-4">
      {actions.map((action) => (
        <button
          key={action.key}
          onClick={() => onActionClick(action.key)}
          className="bg-white rounded-xl shadow-sm h-[120px] flex flex-col items-center justify-between py-4 hover:shadow-md transition-shadow border border-gray-200"
        >
          {/* 아이콘 상단 고정 */}
          <div className="text-3xl">
            {ACTION_ICONS[action.key] || "📌"}
          </div>

          {/* 텍스트 하단 고정 */}
          <div className="text-[14px] font-medium text-gray-700">
            {action.label}
            {action.paywall && (
              <span className="block text-xs text-blue-500 mt-1">💰 Pro</span>
            )}
          </div>
        </button>
      ))}
    </section>
  );
}

export default function SportHub() {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [hasTeam, setHasTeam] = useState(false);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallTrigger, setPaywallTrigger] = useState<
    "unpaid_notification" | "payment_link" | "attendance_stats" | "multiple_admins" | undefined
  >(undefined);
  const [paywallPlan, setPaywallPlan] = useState("TEAM_PRO");
  const [paywallPrice, setPaywallPrice] = useState(29000);

  // 종목 타입이 없거나 유효하지 않으면 홈으로 리다이렉트
  if (!type || !SPORT_LABEL[type]) {
    navigate("/sports-hub");
    return null;
  }

  const sportLabel = SPORT_LABEL[type];

  // 🔥 플랫폼 활동 로그: 종목 페이지 진입
  useEffect(() => {
    logPageView(`/sports/${type}`, { sportType: type, sportLabel });
    logSportSelected(type, { from: "page_navigation" });
  }, [type, sportLabel]);

  // 🔥 팀 소유 여부 체크
  useEffect(() => {
    if (!user?.uid || !type) return;

    const checkTeam = async () => {
      try {
        // 🔥 teamMembers 컬렉션에서 현재 사용자가 속한 팀 조회
        const { collection, query, where, getDocs } = await import("firebase/firestore");
        const q = query(
          collection(db, "team_members"),
          where("uid", "==", user.uid)
        );
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          // 🔥 팀 멤버로 속한 팀이 있으면 teams 컬렉션에서 팀 정보 조회
          const memberDoc = snapshot.docs[0];
          const memberData = memberDoc.data();
          const teamId = memberData.teamId;
          
          const { doc, getDoc } = await import("firebase/firestore");
          const teamRef = doc(db, "teams", teamId);
          const teamSnap = await getDoc(teamRef);
          
          if (teamSnap.exists()) {
            const teamData = teamSnap.data();
            // 🔥 종목이 일치하는지 확인
            if (teamData.sportType === type) {
              setHasTeam(true);
              setTeamId(teamId);
            }
          }
        }
      } catch (error) {
        console.error("팀 체크 실패:", error);
        setHasTeam(false);
      }
    };

    checkTeam();
  }, [user?.uid, type]);

  // 🔥 Pro 여부 체크
  useEffect(() => {
    if (!user?.uid) return;

    const checkPro = async () => {
      try {
        // TODO: 실제 Pro 체크 로직 구현 필요
        // const userRef = doc(db, "users", user.uid);
        // const userSnap = await getDoc(userRef);
        // setIsPro(userSnap.data()?.isPro || false);
        setIsPro(false); // 임시
      } catch (error) {
        console.error("Pro 체크 실패:", error);
      }
    };

    checkPro();
  }, [user?.uid]);

  // 🔥 Action 클릭 핸들러 (3대 코어: 활동/팀/이벤트만 유지)
  const handleActionClick = (key: string) => {
    switch (key) {
      case "find-team":
        // 2. 팀/FC 찾기 (커뮤니티 확장) - 협회 카드도 여기로 통합 예정
        navigate(`/teams/search?type=${type}`);
        break;
      case "facility":
        // 3. 근처 시설 (오프라인 연결)
        navigate(`/facilities?type=${type}`);
        break;
      case "team-manage":
        // 4. 우리 팀 관리 (운영 핵심) - 일정 기능은 여기 안으로 이동 예정
        navigate(`/sports/${type}/team`);
        break;
      default:
        break;
    }
  };

  // 🔥 Paywall 열기
  const openPaywall = (options: { plan: string; price: number }) => {
    setPaywallPlan(options.plan);
    setPaywallPrice(options.price);
    setPaywallTrigger("multiple_admins");
    setPaywallOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 🔥 중복 헤더 제거 - MainLayout에서 이미 렌더링됨 */}
      <div className="container mx-auto px-4 py-6">
        {/* 🔥 종목 타이틀 (중앙 정렬) */}
        <div className="flex justify-center items-center gap-2 mt-4 mb-6">
          <span className="text-2xl">{SPORT_ICON[type || ""] || "🏃"}</span>
          <h1 className="text-2xl font-bold text-gray-900 m-0">{sportLabel}</h1>
        </div>

        {/* 🔥 1영역: 스토리 존 (신규) */}
        <StoryZone sportType={type || ""} />

        {/* 🔥 2영역: 핵심 4그리드 (새 정보 구조 v2) */}
        <ActionGrid
          actions={ACTIONS}
          context={{ sport: type }}
          onActionClick={handleActionClick}
        />
      </div>

      {/* Paywall 모달 */}
      <Paywall
        isOpen={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        trigger={paywallTrigger}
        plan={paywallPlan}
        price={paywallPrice}
      />
    </div>
  );
}
