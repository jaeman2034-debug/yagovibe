import React from "react";

interface SportHeaderProps {
  sport: string;
}

function getSportEmoji(sport: string) {
  switch (sport) {
    case "soccer":
      return "⚽";
    case "basketball":
      return "🏀";
    case "baseball":
      return "⚾";
    default:
      return "🏅";
  }
}

function getSportLabel(sport: string) {
  switch (sport) {
    case "soccer":
      return "축구";
    case "basketball":
      return "농구";
    case "baseball":
      return "야구";
    default:
      return sport;
  }
}

export function SportHeader({ sport }: SportHeaderProps) {
  return (
    <div
      className="sport-header bg-white px-4 py-2 border-b border-gray-200"
      role="heading"
      aria-level={1}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">{getSportEmoji(sport)}</span>
        <span className="text-[18px] font-semibold text-gray-900">
          {getSportLabel(sport)}
        </span>
      </div>
    </div>
  );
}

