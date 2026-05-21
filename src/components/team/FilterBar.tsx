/**
 * 🔥 FilterBar - 팀 탐색 필터 (STEP: 팀원 가입 플로우)
 * 
 * 종목, 지역 필터
 * 필수 ❌
 * 기본값 = 전체
 */

import { Search, Filter } from "lucide-react";
import { Card } from "@/components/ui/cards/Card";
import { TEAM_SEARCH_SPORT_OPTIONS } from "@/data/teamSearchSportOptions";

const REGIONS = [
  "전체",
  "서울",
  "경기",
  "인천",
  "부산",
  "대구",
  "광주",
  "대전",
  "울산",
  "세종",
  "강원",
  "충북",
  "충남",
  "전북",
  "전남",
  "경북",
  "경남",
  "제주",
];

const SPORTS = [
  { value: "football", label: "축구" },
  { value: "basketball", label: "농구" },
  { value: "baseball", label: "야구" },
  { value: "volleyball", label: "배구" },
];

interface FilterBarProps {
  sportType: string;
  region: string;
  keyword: string;
  onSportTypeChange: (sportType: string) => void;
  onRegionChange: (region: string) => void;
  onKeywordChange: (keyword: string) => void;
}

export function FilterBar({
  sportType,
  region,
  keyword,
  onSportTypeChange,
  onRegionChange,
  onKeywordChange,
}: FilterBarProps) {
  return (
    <Card variant="info" className="mb-6">
      <div className="space-y-4">
        {/* 종목 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Filter className="w-4 h-4" />
            종목
          </label>
          <select
            value={sportType}
            onChange={(e) => onSportTypeChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {TEAM_SEARCH_SPORT_OPTIONS.map((sport) => (
              <option key={sport.value} value={sport.value}>
                {sport.icon} {sport.label}
              </option>
            ))}
          </select>
        </div>

        {/* 지역 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            지역
          </label>
          <select
            value={region}
            onChange={(e) => onRegionChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {/* 키워드 검색 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Search className="w-4 h-4" />
            키워드
          </label>
          <input
            type="text"
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            placeholder="팀명으로 검색"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </Card>
  );
}
