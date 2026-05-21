/**
 * 🔥 GoalsSection - 목표 섹션 컴포넌트
 * 
 * 역할:
 * - 모든 목표 표시
 * - 목표 생성/수정 기능
 * 
 * UX 목적:
 * - 성장 탭에서 목표 관리
 */

import { useState } from "react";
import { useGoals } from "@/hooks/useGoals";
import { GoalCard } from "./GoalCard";
import { saveGoal } from "@/services/growthService";
import { useAuth } from "@/context/AuthProvider";
import { Plus } from "lucide-react";
import type { Goal } from "@/services/growthService";

/**
 * 🔥 GoalsSection 컴포넌트
 */
export function GoalsSection() {
  const { user } = useAuth();
  const { goals, loading } = useGoals(user?.uid);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGoal, setNewGoal] = useState<{
    type: Goal["type"];
    target: number;
    deadline: string;
  }>({
    type: "monthlyTraining",
    target: 20,
    deadline: "",
  });

  const handleCreateGoal = async () => {
    if (!user?.uid) return;

    try {
      // 🔥 마감일 기본값 (이번 달 말일 또는 이번 주 일요일)
      let deadline = newGoal.deadline;
      if (!deadline) {
        if (newGoal.type === "monthlyTraining") {
          const now = new Date();
          const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          deadline = lastDay.toISOString().split("T")[0];
        } else if (newGoal.type === "weeklyTraining") {
          const now = new Date();
          const dayOfWeek = now.getDay();
          const diff = 7 - dayOfWeek;
          const sunday = new Date(now);
          sunday.setDate(now.getDate() + diff);
          deadline = sunday.toISOString().split("T")[0];
        } else {
          // 1년 후
          const oneYearLater = new Date();
          oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
          deadline = oneYearLater.toISOString().split("T")[0];
        }
      }

      await saveGoal(user.uid, {
        type: newGoal.type,
        target: newGoal.target,
        deadline,
      });

      setShowCreateForm(false);
      setNewGoal({
        type: "monthlyTraining",
        target: 20,
        deadline: "",
      });
    } catch (error) {
      console.error("❌ [GoalsSection] 목표 생성 실패:", error);
      alert("목표 생성에 실패했습니다.");
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-sm">
        <div className="text-sm text-neutral-500">목표 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-base text-neutral-700">목표</h3>
        {!showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            <Plus className="w-4 h-4" />
            목표 추가
          </button>
        )}
      </div>

      {/* 목표 생성 폼 */}
      {showCreateForm && (
        <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-sm">
          <h4 className="font-semibold text-sm mb-3">새 목표</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-neutral-600 mb-1">
                목표 타입
              </label>
              <select
                value={newGoal.type}
                onChange={(e) =>
                  setNewGoal({ ...newGoal, type: e.target.value as Goal["type"] })
                }
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
              >
                <option value="monthlyTraining">이번 달 훈련</option>
                <option value="weeklyTraining">이번 주 훈련</option>
                <option value="totalMinutes">총 운동 시간</option>
                <option value="totalSessions">총 세션 수</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-neutral-600 mb-1">
                목표 값
              </label>
              <input
                type="number"
                value={newGoal.target}
                onChange={(e) =>
                  setNewGoal({ ...newGoal, target: parseInt(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                min="1"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-600 mb-1">
                마감일 (선택사항)
              </label>
              <input
                type="date"
                value={newGoal.deadline}
                onChange={(e) =>
                  setNewGoal({ ...newGoal, deadline: e.target.value })
                }
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreateGoal}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium"
              >
                생성
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setNewGoal({
                    type: "monthlyTraining",
                    target: 20,
                    deadline: "",
                  });
                }}
                className="flex-1 px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 text-sm font-medium"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 목표 목록 */}
      {goals.length === 0 ? (
        <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-sm text-center text-sm text-neutral-500">
          목표가 없습니다. 목표를 추가해보세요!
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => (
            <GoalCard key={`${goal.uid}_${goal.type}`} goal={goal} />
          ))}
        </div>
      )}
    </div>
  );
}
