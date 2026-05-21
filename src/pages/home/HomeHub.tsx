// src/pages/home/HomeHub.tsx
// ✅ 2단계: 홈(허브) 페이지 - 결정의 장소
// ✅ EXP-1: 홈 허브 개인화 미세 확장 (행동 기반)

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { sportsCategories } from "@/data/sportsCategories";
import { sportPillActiveClass, sportPillInactiveClass } from "@/constants/sportChipStyles";
import { MovementEntry } from "@/components/movement/MovementEntry";

// 스포츠 이름 → 마켓 카테고리 ID 매핑 (marketCategories.ts의 실제 ID 사용)
const sportToMarketCategory: { [key: string]: string } = {
  "헬스/피트니스": "헬스/피트니스",
  "축구": "축구/풋살",
  "농구": "농구",
  "러닝": "러닝",
  "아웃도어": "등산/아웃도어",
  "배드민턴": "배드민턴",
  "테니스": "테니스",
  "골프": "골프",
  "파크골프": "골프",
  "수영": "수영",
  "요가/필라테스": "요가/필라테스",
  // 매핑되지 않은 스포츠는 일반 마켓으로 이동
};

// 🔥 EXP-1: localStorage 키
const STORAGE_KEYS = {
  LAST_SPORT: "homeHub_lastSport",
  LAST_HERO_TYPE: "homeHub_lastHeroType",
  SPORT_COUNT: "homeHub_sportCount", // 스포츠별 선택 횟수
};

// 🔥 EXP-1: 스포츠 선택 횟수 관리
function getSportCounts(): Record<string, number> {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.SPORT_COUNT);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function saveSportCount(sportName: string) {
  const counts = getSportCounts();
  counts[sportName] = (counts[sportName] || 0) + 1;
  localStorage.setItem(STORAGE_KEYS.SPORT_COUNT, JSON.stringify(counts));
}

function getMostUsedSport(): string | null {
  const counts = getSportCounts();
  const entries = Object.entries(counts);
  if (entries.length === 0) return null;
  
  // 가장 많이 사용된 스포츠 반환
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

export default function HomeHub() {
  const navigate = useNavigate();
  
  // 🔥 EXP-1: 초기 상태 복원 (최근 선택 스포츠)
  const [selectedSport, setSelectedSport] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.LAST_SPORT) || null;
    } catch {
      return null;
    }
  });

  // 🔥 EXP-1: 최근 사용한 Hero 버튼 타입
  const [lastHeroType, setLastHeroType] = useState<"sell" | "share" | "lost" | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LAST_HERO_TYPE);
      return (saved === "sell" || saved === "share" || saved === "lost") ? saved : null;
    } catch {
      return null;
    }
  });

  // 🔥 EXP-1: 최근 선택 스포츠가 없으면 가장 많이 사용한 스포츠로 자동 선택 (힌트만)
  useEffect(() => {
    if (!selectedSport) {
      const mostUsed = getMostUsedSport();
      // 자동 선택은 하지 않고, 시각적 힌트만 제공 (구조 변경 없음)
    }
  }, []);

  // 🔥 스포츠 이름 → sport 타입 매핑
  const sportNameToType: Record<string, string> = {
    "축구": "soccer",
    "농구": "basketball",
    "러닝": "running",
    "배드민턴": "badminton",
    "야구": "baseball",
    "배구": "volleyball",
    "테니스": "tennis",
    "골프": "golf",
    "헬스/피트니스": "fitness",
    "요가/필라테스": "yoga",
    "클라이밍": "climbing",
  };

  const handleSportClick = (sportName: string) => {
    // 🔥 마켓 페이지로 라우팅 (sport 파라미터 포함)
    const sportType = sportNameToType[sportName];
    if (sportType) {
      // 같은 스포츠를 다시 클릭하면 선택 해제
      if (selectedSport === sportName) {
        setSelectedSport(null);
        try {
          localStorage.removeItem(STORAGE_KEYS.LAST_SPORT);
        } catch {}
        // 선택 해제 시 전체 마켓으로 이동
        navigate("/market");
      } else {
        setSelectedSport(sportName);
        // 🔥 EXP-1: 선택한 스포츠 저장
        try {
          localStorage.setItem(STORAGE_KEYS.LAST_SPORT, sportName);
          saveSportCount(sportName);
        } catch {}
        // 🔥 종목 허브로 이동
        navigate(`/sports/${sportType}`);
      }
    } else {
      // 매핑되지 않은 스포츠는 기존 동작 유지
      if (selectedSport === sportName) {
        setSelectedSport(null);
        try {
          localStorage.removeItem(STORAGE_KEYS.LAST_SPORT);
        } catch {}
      } else {
        setSelectedSport(sportName);
        try {
          localStorage.setItem(STORAGE_KEYS.LAST_SPORT, sportName);
          saveSportCount(sportName);
        } catch {}
      }
    }
  };

  const handleHeroButtonClick = (type: "sell" | "share" | "lost") => {
    // 🔥 EXP-1: 사용한 Hero 버튼 타입 저장
    try {
      localStorage.setItem(STORAGE_KEYS.LAST_HERO_TYPE, type);
      setLastHeroType(type);
    } catch {}

    if (selectedSport) {
      const categoryId = sportToMarketCategory[selectedSport];
      if (categoryId) {
        navigate(`/app/market?category=${encodeURIComponent(categoryId)}&type=${type}`);
      } else {
        navigate(`/app/market?type=${type}`);
      }
    } else {
      navigate(`/app/market?type=${type}`);
    }
  };

  // 🔥 EXP-3: 내 주변 보기 (지도 페이지로 이동)
  const handleNearbyClick = () => {
    const params = new URLSearchParams();
    
    if (selectedSport) {
      const categoryId = sportToMarketCategory[selectedSport];
      if (categoryId) {
        params.set("category", categoryId);
      }
    }
    
    // 마지막 선택한 서비스 타입이 있으면 포함
    if (lastHeroType) {
      params.set("type", lastHeroType);
    }
    
    navigate(`/market/map?${params.toString()}`);
  };

  const handleStartNavigation = (destination: {
    lat: number;
    lng: number;
    name: string;
    type: string;
    id?: string;
  }) => {
    // GeneralMapPage로 이동하고 네비게이션 시작
    navigate("/general-map", {
      state: { 
        autoStartNavigation: true,
        destination 
      },
    });
  };

  return (
    <div className="flex flex-col space-y-6 sm:space-y-8 lg:space-y-10 pb-24">
      {/* 🔥 Movement 진입점 (천재 모드) */}
      <section className="w-full pt-4 sm:px-6 sm:pt-6 lg:px-8 lg:pt-8">
        <div className="mx-auto w-full max-w-5xl">
          <MovementEntry onStartNavigation={handleStartNavigation} />
        </div>
      </section>

      {/* 0️⃣ 스포츠 카테고리 (가로 스크롤 필터) - Hero 바로 위 */}
      <section className="w-full pt-4 sm:px-6 sm:pt-6 lg:px-8 lg:pt-8">
        <div className="mx-auto w-full max-w-5xl">
          <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {sportsCategories.map((sport) => {
              const isSelected = selectedSport === sport.name;
              const isMostUsed = getMostUsedSport() === sport.name && !isSelected;
              
              return (
                <button
                  key={sport.name}
                  onClick={() => handleSportClick(sport.name)}
                  className={`shrink-0 px-4 sm:px-5 h-9 sm:h-10 rounded-full border text-sm sm:text-base whitespace-nowrap transition-colors flex items-center gap-1.5 sm:gap-2 font-semibold ${
                    isSelected
                      ? sportPillActiveClass
                      : isMostUsed
                      ? "border-blue-300 bg-blue-50/80 text-gray-800 font-medium hover:bg-blue-100 hover:border-blue-400 dark:border-blue-700 dark:bg-blue-950/40 dark:text-gray-200"
                      : `${sportPillInactiveClass} font-medium`
                  }`}
                  title={isMostUsed ? "자주 사용하는 스포츠" : undefined}
                >
                  <span className="text-base sm:text-lg">{sport.icon}</span>
                  <span>{sport.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 1️⃣ Hero / Intent Section */}
      <section className="w-full sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-5xl">
          {/* 선택된 스포츠 표시 */}
          {selectedSport && (
            <div className="mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base text-gray-600">
              <span className="text-base sm:text-lg">
                {sportsCategories.find((s) => s.name === selectedSport)?.icon}
              </span>
              <span className="font-medium">{selectedSport}</span>
              <span className="text-gray-400">선택됨</span>
            </div>
          )}
          <h1 className="text-base sm:text-lg lg:text-xl font-semibold mb-3 sm:mb-4 lg:mb-5 text-gray-900">
            무엇을 하시겠어요?
          </h1>
          <div className="grid w-full grid-cols-3 gap-2 sm:gap-3 md:max-w-md lg:gap-4">
            <button
              onClick={() => handleHeroButtonClick("sell")}
              className={`h-12 sm:h-14 lg:h-16 rounded-lg font-medium hover:bg-gray-800 transition-colors text-sm sm:text-base lg:text-lg ${
                lastHeroType === "sell"
                  ? "bg-gray-900 text-white ring-2 ring-blue-400 ring-offset-2"
                  : "bg-gray-900 text-white hover:bg-gray-800"
              }`}
            >
              중고거래 보기
            </button>
            <button
              onClick={() => handleHeroButtonClick("share")}
              className={`h-12 sm:h-14 lg:h-16 rounded-lg font-medium transition-colors text-sm sm:text-base lg:text-lg ${
                lastHeroType === "share"
                  ? "bg-gray-200 text-gray-900 ring-2 ring-blue-400 ring-offset-2"
                  : "bg-gray-100 text-gray-900 hover:bg-gray-200"
              }`}
            >
              무료 나눔 보기
            </button>
            <button
              onClick={() => handleHeroButtonClick("lost")}
              className={`h-12 sm:h-14 lg:h-16 rounded-lg font-medium transition-colors text-sm sm:text-base lg:text-lg ${
                lastHeroType === "lost"
                  ? "bg-gray-200 text-gray-900 ring-2 ring-blue-400 ring-offset-2"
                  : "bg-gray-100 text-gray-900 hover:bg-gray-200"
              }`}
            >
              유실물 찾기
            </button>
          </div>
          
          {/* 🔥 EXP-3: 내 주변 보기 버튼 (Hero 버튼 아래) */}
          <div className="mt-3 sm:mt-4">
            <button
              onClick={handleNearbyClick}
              className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg bg-blue-50 text-blue-700 font-medium hover:bg-blue-100 active:scale-95 transition-all flex items-center justify-center gap-2 text-sm sm:text-base border border-blue-200"
            >
              <span className="text-lg sm:text-xl">📍</span>
              <span>내 주변 보기</span>
            </button>
          </div>
        </div>
      </section>

      {/* 3️⃣ Service Shortcuts Section (시설 / 팀) */}
      <section className="mt-6 w-full sm:mt-8 sm:px-6 lg:mt-10 lg:px-8">
        <div className="mx-auto w-full max-w-5xl">
          <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-3 sm:mb-4 lg:mb-5 text-gray-900">
            바로가기
          </h2>
          <div className="grid w-full grid-cols-2 gap-3 sm:gap-4 md:max-w-md lg:gap-6">
            <button
              onClick={() => navigate("/app/facility")}
              className="h-16 sm:h-20 lg:h-24 rounded-xl bg-gray-100 flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
            >
              <span className="text-2xl sm:text-3xl lg:text-4xl">🏪</span>
              <span className="font-medium text-gray-900 text-sm sm:text-base lg:text-lg">시설</span>
            </button>
            <button
              onClick={() => navigate("/app/team")}
              className="h-16 sm:h-20 lg:h-24 rounded-xl bg-gray-100 flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
            >
              <span className="text-2xl sm:text-3xl lg:text-4xl">👥</span>
              <span className="font-medium text-gray-900 text-sm sm:text-base lg:text-lg">팀</span>
            </button>
          </div>
        </div>
      </section>

      {/* 4️⃣ Highlight Preview Section (선택) - 나중에 추가 가능 */}
      {/* 5️⃣ Optional Search Entry (선택) - 나중에 추가 가능 */}
    </div>
  );
}

