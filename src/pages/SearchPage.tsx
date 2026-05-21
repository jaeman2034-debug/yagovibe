// src/pages/SearchPage.tsx
// 🔥 검색 결과 페이지 (MVP 완성)

import { useSearchParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { sportsCategories } from "@/data/sportsCategories";
import { Link } from "react-router-dom";
import { Search, TrendingUp, Clock } from "lucide-react";
import { track } from "@/lib/analytics";
import { useTeam } from "@/context/TeamContext";
// 🔥 플랫폼 활동 로그 (CTR과 분리된 레이어)
import { logPageView, logSearch } from "@/lib/activityLog";

// 🔥 모바일 디바이스 감지
const isMobileDevice = (): boolean => {
    if (typeof window === "undefined") return false;
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { myTeam } = useTeam();
  const query = searchParams.get("q") || "";
  const [filteredCategories, setFilteredCategories] = useState(sportsCategories);
  const [searchInput, setSearchInput] = useState(query);

  useEffect(() => {
    if (query.trim() === "") {
      setFilteredCategories(sportsCategories);
    } else {
      const filtered = sportsCategories.filter((cat) =>
        cat.name.toLowerCase().includes(query.toLowerCase().trim())
      );
      setFilteredCategories(filtered);
    }
    setSearchInput(query);
  }, [query]);

  // 🔥 플랫폼 활동 로그: 검색 페이지 진입
  useEffect(() => {
    logPageView("/search", { query });
    if (query.trim()) {
      logSearch(query.trim(), { from: "search_page" });
    }
  }, [query]);

  // 🔥 추천 카테고리 (인기 순위)
  const recommendedCategories = sportsCategories.slice(0, 6);

  // 🔥 최근 검색 (로컬 스토리지에서 가져오기)
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  // 🔥 음성 검색 상태
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const recent = localStorage.getItem("recentSearches");
    if (recent) {
      try {
        setRecentSearches(JSON.parse(recent).slice(0, 5));
      } catch {
        setRecentSearches([]);
      }
    }
  }, []);
  
  // 🔥 음성 검색 시작 (Web Speech API)
  const startVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert('이 브라우저는 음성 검색을 지원하지 않습니다.');
      return;
    }
    
    // 기존 인식 중지
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    const recognition = new SpeechRecognition();
    recognition.lang = 'ko-KR';
    recognition.interimResults = false;
    recognition.continuous = false;
    
    recognition.onstart = () => {
      setIsListening(true);
    };
    
    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setSearchInput(text);
      handleSearch(text);
      setIsListening(false);
    };
    
    recognition.onerror = (event: any) => {
      console.error('음성 인식 오류:', event.error);
      setIsListening(false);
      if (event.error === 'no-speech') {
        alert('음성이 감지되지 않았습니다. 다시 시도해주세요.');
      } else if (event.error === 'not-allowed') {
        alert('마이크 권한이 필요합니다. 브라우저 설정에서 마이크 권한을 허용해주세요.');
      } else {
        alert('음성 인식 중 오류가 발생했습니다. 다시 시도해주세요.');
      }
    };
    
    recognition.onend = () => {
      setIsListening(false);
    };
    
    recognitionRef.current = recognition;
    recognition.start();
  };
  
  // 🔥 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // 🔥 검색 실행
  const handleSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    // 최근 검색에 추가
    const updated = [searchQuery, ...recentSearches.filter((s) => s !== searchQuery)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem("recentSearches", JSON.stringify(updated));

    // 🔥 Analytics: 검색 제출 추적
    const resultCount = sportsCategories.filter((cat) =>
      cat.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
    ).length;

    track("search_submit", {
      page: "search",
      teamId: myTeam?.id,
      q: searchQuery,
      resultCount,
    });

    // 결과 0개면 별도 이벤트
    if (resultCount === 0) {
      track("search_zero_result", {
        page: "search",
        teamId: myTeam?.id,
        q: searchQuery,
      });
    }

    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const sportTypeMap: { [key: string]: string } = {
    "야구": "baseball",
    "축구": "football",
    "농구": "basketball",
    "배구": "volleyball",
    "골프": "golf",
    "파크골프": "golf",
    "테니스": "tennis",
    "러닝": "running",
    "아웃도어": "running",
    "배드민턴": "badminton",
    "탁구": "table-tennis",
    "수영": "swimming",
    "헬스/피트니스": "fitness",
    "요가/필라테스": "yoga",
    "클라이밍": "climbing",
    "당구": "billiards",
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* 헤더 */}
        <div className="mb-6">
          <button
            onClick={() => navigate("/sports-hub")}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mb-4 flex items-center gap-1"
          >
            ← 허브로 돌아가기
          </button>

          {/* 검색창 */}
          <div className="relative mb-4">
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch(searchInput);
                }
              }}
              placeholder="어떤 스포츠를 찾고 계신가요?"
              className={
                isMobileDevice()
                  ? "w-full rounded-full border border-gray-300 px-5 py-3 pr-24 text-gray-700 bg-white shadow-sm focus:ring-2 focus:ring-blue-400 outline-none placeholder:text-gray-400"
                  : "w-full rounded-full border border-gray-300 dark:border-gray-600 px-5 py-3 pr-24 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 shadow-sm focus:ring-2 focus:ring-blue-400 outline-none"
              }
            />
            {/* 🔥 검색 버튼 */}
            <button
              onClick={() => handleSearch(searchInput)}
              className={
                isMobileDevice()
                  ? "absolute right-12 top-1/2 -translate-y-1/2 text-blue-600 hover:text-blue-700 min-w-[44px] min-h-[44px] flex items-center justify-center"
                  : "absolute right-12 top-1/2 -translate-y-1/2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 min-w-[44px] min-h-[44px] flex items-center justify-center"
              }
              aria-label="검색"
            >
              <Search size={20} />
            </button>
            {/* 🔥 마이크 버튼 (음성 검색) */}
            <button
              onClick={startVoiceSearch}
              disabled={isListening}
              className={
                isMobileDevice()
                  ? `absolute right-2 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition-all ${
                      isListening 
                        ? "bg-red-500 text-white animate-pulse" 
                        : "text-gray-600 hover:text-blue-600 hover:bg-gray-100"
                    }`
                  : `absolute right-2 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition-all ${
                      isListening 
                        ? "bg-red-500 text-white animate-pulse" 
                        : "text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`
              }
              aria-label="음성 검색"
              title={isListening ? "음성 인식 중..." : "음성으로 검색"}
            >
              <span className="text-xl">{isListening ? "🎤" : "🎙"}</span>
            </button>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {query ? `"${query}" 검색 결과` : "검색"}
          </h1>
          {query && (
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {filteredCategories.length}개의 결과를 찾았습니다.
            </p>
          )}
        </div>

        {/* 검색 결과 그리드 */}
        {filteredCategories.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-5 sm:gap-6 md:gap-8 justify-items-center mb-8">
            {filteredCategories.map((cat) => {
              const sportType = sportTypeMap[cat.name] || "football";
              return (
                <Link
                  key={cat.name}
                  to={`/sports/${sportType}`}
                  className="flex flex-col justify-center items-center
                             bg-white dark:bg-gray-800 shadow-sm rounded-2xl 
                             w-[85px] h-[85px] sm:w-[95px] sm:h-[95px]
                             hover:shadow-md transition"
                >
                  <span className="text-3xl sm:text-4xl">{cat.icon}</span>
                  <span className="text-sm mt-2 font-medium text-gray-700 dark:text-gray-200">{cat.name}</span>
                </Link>
              );
            })}
          </div>
        ) : query ? (
          // 🔥 결과 0개 시 추천/최근 노출
          <div className="space-y-8">
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
              <p className="text-gray-500 dark:text-gray-400 mb-4 text-lg">
                "{query}"에 대한 검색 결과가 없습니다.
              </p>
              <button
                onClick={() => navigate("/sports-hub")}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                전체 카테고리 보기
              </button>
            </div>

            {/* 추천 카테고리 */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={20} className="text-blue-600 dark:text-blue-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">인기 카테고리</h2>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-5 sm:gap-6 md:gap-8 justify-items-center">
                {recommendedCategories.map((cat) => {
                  const sportType = sportTypeMap[cat.name] || "football";
                  return (
                    <Link
                      key={cat.name}
                      to={`/sports/${sportType}`}
                      onClick={() => {
                        track("search_recent_click", {
                          page: "search",
                          teamId: myTeam?.id,
                          q: cat.name,
                        });
                      }}
                      className="flex flex-col justify-center items-center
                                 bg-white dark:bg-gray-800 shadow-sm rounded-2xl 
                                 w-[85px] h-[85px] sm:w-[95px] sm:h-[95px]
                                 hover:shadow-md transition"
                    >
                      <span className="text-3xl sm:text-4xl">{cat.icon}</span>
                      <span className="text-sm mt-2 font-medium text-gray-700 dark:text-gray-200">{cat.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* 최근 검색 */}
            {recentSearches.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Clock size={20} className="text-gray-600 dark:text-gray-400" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">최근 검색</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((search, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        track("search_recent_click", {
                          page: "search",
                          teamId: myTeam?.id,
                          q: search,
                        });
                        handleSearch(search);
                      }}
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm"
                    >
                      {search}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          // 🔥 검색어 없을 때: 추천 + 최근 검색
          <div className="space-y-8">
            {/* 추천 카테고리 */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={20} className="text-blue-600 dark:text-blue-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">인기 카테고리</h2>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-5 sm:gap-6 md:gap-8 justify-items-center">
                {recommendedCategories.map((cat) => {
                  const sportType = sportTypeMap[cat.name] || "football";
                  return (
                    <Link
                      key={cat.name}
                      to={`/sports/${sportType}`}
                      onClick={() => {
                        track("search_recent_click", {
                          page: "search",
                          teamId: myTeam?.id,
                          q: cat.name,
                        });
                      }}
                      className="flex flex-col justify-center items-center
                                 bg-white dark:bg-gray-800 shadow-sm rounded-2xl 
                                 w-[85px] h-[85px] sm:w-[95px] sm:h-[95px]
                                 hover:shadow-md transition"
                    >
                      <span className="text-3xl sm:text-4xl">{cat.icon}</span>
                      <span className="text-sm mt-2 font-medium text-gray-700 dark:text-gray-200">{cat.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* 최근 검색 */}
            {recentSearches.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Clock size={20} className="text-gray-600 dark:text-gray-400" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">최근 검색</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((search, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        track("search_recent_click", {
                          page: "search",
                          teamId: myTeam?.id,
                          q: search,
                        });
                        handleSearch(search);
                      }}
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm"
                    >
                      {search}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

