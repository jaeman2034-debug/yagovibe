/**
 * 🔥 FilterBar - 랭킹 필터 바 (STEP: 랭킹/통계 시스템)
 * 
 * 종목, 시즌 필터
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface FilterBarProps {
  sport?: string;
  season?: string;
  onSportChange?: (sport: string | undefined) => void;
  onSeasonChange?: (season: string | undefined) => void;
}

const SPORTS = ["축구", "농구", "야구", "배구", "탁구", "배드민턴"];
const SEASONS = ["2025", "2024", "2023"]; // 최근 3년

export function FilterBar({
  sport,
  season,
  onSportChange,
  onSeasonChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap gap-2 px-4 py-3 bg-white border-b border-gray-200">
      {/* 종목 필터 */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">종목:</span>
        <div className="flex gap-1">
          <Button
            variant={!sport ? "default" : "outline"}
            size="sm"
            onClick={() => onSportChange?.(undefined)}
            className="text-xs"
          >
            전체
          </Button>
          {SPORTS.map((s) => (
            <Button
              key={s}
              variant={sport === s ? "default" : "outline"}
              size="sm"
              onClick={() => onSportChange?.(s)}
              className="text-xs"
            >
              {s}
            </Button>
          ))}
        </div>
      </div>

      {/* 시즌 필터 */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">시즌:</span>
        <div className="flex gap-1">
          {SEASONS.map((se) => (
            <Button
              key={se}
              variant={season === se ? "default" : "outline"}
              size="sm"
              onClick={() => onSeasonChange?.(se)}
              className="text-xs"
            >
              {se}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
