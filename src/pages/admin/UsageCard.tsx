/**
 * 🔥 UsageCard - 사용량 카드
 * 
 * 표시:
 * - 멤버 수: 3 / 5
 * - 월 액션: 742 / 1000
 * - 저장 용량: 120MB / 500MB
 * - Progress bar 필수
 */

import { useTeamUsage } from "@/hooks/useTeamUsage";
import { useTeam } from "@/context/TeamContext";
import { USAGE_LIMITS } from "@/types/usage.ts";
import { Users, Activity, HardDrive } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function UsageCard({ teamId }: { teamId: string }) {
  const navigate = useNavigate();
  const { usage, loading } = useTeamUsage(teamId);
  const { plan } = useTeam();

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!usage) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <p className="text-gray-500 dark:text-gray-400">사용량 정보를 불러올 수 없습니다.</p>
      </div>
    );
  }

  const currentPlan = plan || "free";
  const limits = USAGE_LIMITS[currentPlan];

  const calculatePercentage = (current: number, limit: number) => {
    if (limit === Infinity) return 0; // 무제한은 0%
    return Math.min((current / limit) * 100, 100);
  };

  const formatStorage = (mb: number) => {
    if (mb < 1024) return `${mb}MB`;
    return `${(mb / 1024).toFixed(2)}GB`;
  };

  const isNearLimit = (current: number, limit: number) => {
    if (limit === Infinity) return false;
    return (current / limit) >= 0.8; // 80% 이상
  };

  const membersPercentage = calculatePercentage(usage.membersCount, limits.membersCount);
  const actionsPercentage = calculatePercentage(usage.actionsThisMonth, limits.actionsThisMonth);
  const storagePercentage = calculatePercentage(usage.storageMB, limits.storageMB);

  const membersNearLimit = isNearLimit(usage.membersCount, limits.membersCount);
  const actionsNearLimit = isNearLimit(usage.actionsThisMonth, limits.actionsThisMonth);
  const storageNearLimit = isNearLimit(usage.storageMB, limits.storageMB);

  const anyNearLimit = membersNearLimit || actionsNearLimit || storageNearLimit;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          사용량
        </h2>
        {anyNearLimit && currentPlan === "free" && (
          <button
            onClick={() => navigate(`/t/${teamId}/upgrade`)}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            업그레이드
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* 멤버 수 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                멤버 수
              </span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {usage.membersCount} / {limits.membersCount === Infinity ? "∞" : limits.membersCount}
            </div>
          </div>
          {limits.membersCount !== Infinity && (
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  membersNearLimit
                    ? "bg-red-500"
                    : membersPercentage > 50
                    ? "bg-yellow-500"
                    : "bg-green-500"
                }`}
                style={{ width: `${Math.min(membersPercentage, 100)}%` }}
              />
            </div>
          )}
          {membersNearLimit && currentPlan === "free" && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              멤버 수 한도에 가까워지고 있습니다
            </p>
          )}
        </div>

        {/* 월 액션 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                월 액션
              </span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {usage.actionsThisMonth.toLocaleString()} /{" "}
              {limits.actionsThisMonth === Infinity
                ? "∞"
                : limits.actionsThisMonth.toLocaleString()}
            </div>
          </div>
          {limits.actionsThisMonth !== Infinity && (
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  actionsNearLimit
                    ? "bg-red-500"
                    : actionsPercentage > 50
                    ? "bg-yellow-500"
                    : "bg-green-500"
                }`}
                style={{ width: `${Math.min(actionsPercentage, 100)}%` }}
              />
            </div>
          )}
          {actionsNearLimit && currentPlan === "free" && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              월 액션 한도에 가까워지고 있습니다
            </p>
          )}
        </div>

        {/* 저장 용량 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                저장 용량
              </span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {formatStorage(usage.storageMB)} /{" "}
              {limits.storageMB === Infinity ? "∞" : formatStorage(limits.storageMB)}
            </div>
          </div>
          {limits.storageMB !== Infinity && (
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  storageNearLimit
                    ? "bg-red-500"
                    : storagePercentage > 50
                    ? "bg-yellow-500"
                    : "bg-green-500"
                }`}
                style={{ width: `${Math.min(storagePercentage, 100)}%` }}
              />
            </div>
          )}
          {storageNearLimit && currentPlan === "free" && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              저장 용량 한도에 가까워지고 있습니다
            </p>
          )}
        </div>
      </div>

      {/* Free 플랜 한도 도달 시 안내 */}
      {currentPlan === "free" && anyNearLimit && (
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            Free 플랜의 한도에 도달하고 있습니다.
          </p>
          <button
            onClick={() => navigate(`/t/${teamId}/upgrade`)}
            className="mt-2 text-sm font-semibold text-yellow-900 dark:text-yellow-100 hover:underline"
          >
            Pro로 업그레이드하면 즉시 계속 사용 가능 →
          </button>
        </div>
      )}
    </div>
  );
}
