/**
 * 🔥 사용자 평판 표시 컴포넌트 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 평판 점수 표시
 * - 평점, 거래 횟수, 노쇼율 표시
 */

import { Star, TrendingUp, AlertTriangle } from "lucide-react";

interface ReputationData {
  rating: number;
  tradeCount: number;
  noShowRate: number;
  score: number;
}

interface UserReputationProps {
  reputation: ReputationData | null;
  userId?: string;
  size?: "sm" | "md" | "lg";
}

export default function UserReputation({
  reputation,
  userId,
  size = "md",
}: UserReputationProps) {
  if (!reputation) {
    return (
      <div className="flex items-center gap-2 text-gray-400">
        <Star className="w-4 h-4" />
        <span className="text-sm">평판 없음</span>
      </div>
    );
  }

  const { rating, tradeCount, noShowRate, score } = reputation;

  // 🔥 점수에 따른 색상
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  // 🔥 크기별 스타일
  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div className="flex items-center gap-3">
      {/* 🔥 종합 평판 점수 */}
      <div className={`flex items-center gap-1 ${sizeClasses[size]}`}>
        <TrendingUp className={`w-4 h-4 ${getScoreColor(score)}`} />
        <span className={`font-semibold ${getScoreColor(score)}`}>
          {Math.round(score)}
        </span>
      </div>

      {/* 🔥 평점 */}
      <div className={`flex items-center gap-1 ${sizeClasses[size]}`}>
        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
        <span className="text-gray-700">{rating.toFixed(1)}</span>
      </div>

      {/* 🔥 거래 횟수 */}
      {tradeCount > 0 && (
        <div className={`${sizeClasses[size]} text-gray-600`}>
          거래 {tradeCount}회
        </div>
      )}

      {/* 🔥 노쇼율 경고 */}
      {noShowRate > 0.1 && (
        <div className={`flex items-center gap-1 ${sizeClasses[size]} text-red-600`}>
          <AlertTriangle className="w-4 h-4" />
          <span>노쇼 {(noShowRate * 100).toFixed(0)}%</span>
        </div>
      )}
    </div>
  );
}
