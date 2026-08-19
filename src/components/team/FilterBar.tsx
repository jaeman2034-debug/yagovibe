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
    <Card variant="info" className="mx-4 mb-4">
      <div className="space-y-3">
        {/* 1) 키워드 — 탐색 최우선 */}
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
            <Search className="h-4 w-4" />
            검색
          </label>
          <input
            type="text"
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            placeholder="팀명으로 검색"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
              <Filter className="h-3.5 w-3.5" />
              종목
            </label>
            <select
              value={sportType}
              onChange={(e) => onSportTypeChange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            >
              {TEAM_SEARCH_SPORT_OPTIONS.map((sport) => (
                <option key={sport.value} value={sport.value}>
                  {sport.icon} {sport.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">지역</label>
            <select
              value={region}
              onChange={(e) => onRegionChange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            >
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </Card>
  );
}
