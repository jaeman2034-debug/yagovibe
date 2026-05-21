/**
 * 🔥 PlayerGuidePage - 선수용 베타 가이드 페이지
 * 
 * 경로: /beta/player-guide
 * 
 * 역할:
 * - 선수용 사용 가이드
 * - Day 1~3 체크리스트
 * 
 * UX 목적:
 * - 베타 테스트 참여자 안내
 */

import { CheckCircle2, Circle, Calendar, Activity, Target, TrendingUp } from "lucide-react";
import { useState } from "react";

/**
 * 🔥 선수용 가이드 페이지
 */
export default function PlayerGuidePage() {
  const [day1Checks, setDay1Checks] = useState<string[]>([]);
  const [day2Checks, setDay2Checks] = useState<string[]>([]);
  const [day3Checks, setDay3Checks] = useState<string[]>([]);

  const toggleCheck = (
    day: "day1" | "day2" | "day3",
    id: string
  ) => {
    if (day === "day1") {
      setDay1Checks((prev) =>
        prev.includes(id)
          ? prev.filter((item) => item !== id)
          : [...prev, id]
      );
    } else if (day === "day2") {
      setDay2Checks((prev) =>
        prev.includes(id)
          ? prev.filter((item) => item !== id)
          : [...prev, id]
      );
    } else {
      setDay3Checks((prev) =>
        prev.includes(id)
          ? prev.filter((item) => item !== id)
          : [...prev, id]
      );
    }
  };

  const day1Tasks = [
    { id: "login", label: "로그인 성공" },
    { id: "profile", label: "프로필 설정 완료" },
    { id: "condition", label: "컨디션 입력 완료" },
    { id: "routine", label: "루틴 체크 완료" },
    { id: "goal", label: "목표 설정 완료" },
    { id: "activity", label: "활동 시작/종료 완료" },
  ];

  const day2Tasks = [
    { id: "condition2", label: "컨디션 입력 완료" },
    { id: "routine2", label: "루틴 체크 완료 (streak 확인)" },
    { id: "activity2", label: "활동 기록 완료" },
    { id: "graph", label: "리듬 그래프 확인" },
  ];

  const day3Tasks = [
    { id: "rhythm", label: "리듬 변화 확인" },
    { id: "stats", label: "통계 확인" },
    { id: "ai", label: "AI 추천 확인" },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold mb-2">🏃‍♂️ 선수용 베타 가이드</h1>
        <p className="text-neutral-600">
          YAGO SPORTS 베타 테스트 참여를 환영합니다!
        </p>
      </div>

      {/* Day 1 */}
      <div className="bg-white rounded-xl border shadow-sm">
        <div className="p-4 border-b bg-blue-50">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-blue-600">Day 1: 첫 사용</h2>
          </div>
        </div>
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            {day1Tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-3 hover:bg-neutral-50 rounded-lg transition-colors"
              >
                <button
                  onClick={() => toggleCheck("day1", task.id)}
                  className="shrink-0"
                >
                  {day1Checks.includes(task.id) ? (
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  ) : (
                    <Circle className="w-6 h-6 text-neutral-300" />
                  )}
                </button>
                <span className="flex-1">{task.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
            <strong>💡 팁:</strong> 첫 사용 시 성장 탭에서 온보딩 가이드를 따라주세요.
          </div>
        </div>
      </div>

      {/* Day 2 */}
      <div className="bg-white rounded-xl border shadow-sm">
        <div className="p-4 border-b bg-green-50">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-600" />
            <h2 className="text-xl font-bold text-green-600">Day 2: 일일 기록</h2>
          </div>
        </div>
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            {day2Tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-3 hover:bg-neutral-50 rounded-lg transition-colors"
              >
                <button
                  onClick={() => toggleCheck("day2", task.id)}
                  className="shrink-0"
                >
                  {day2Checks.includes(task.id) ? (
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  ) : (
                    <Circle className="w-6 h-6 text-neutral-300" />
                  )}
                </button>
                <span className="flex-1">{task.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-green-50 rounded-lg text-sm text-green-700">
            <strong>💡 팁:</strong> 매일 컨디션을 기록하면 리듬 점수가 정확해집니다.
          </div>
        </div>
      </div>

      {/* Day 3 */}
      <div className="bg-white rounded-xl border shadow-sm">
        <div className="p-4 border-b bg-orange-50">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-orange-600" />
            <h2 className="text-xl font-bold text-orange-600">Day 3: 데이터 확인</h2>
          </div>
        </div>
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            {day3Tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-3 hover:bg-neutral-50 rounded-lg transition-colors"
              >
                <button
                  onClick={() => toggleCheck("day3", task.id)}
                  className="shrink-0"
                >
                  {day3Checks.includes(task.id) ? (
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  ) : (
                    <Circle className="w-6 h-6 text-neutral-300" />
                  )}
                </button>
                <span className="flex-1">{task.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-orange-50 rounded-lg text-sm text-orange-700">
            <strong>💡 팁:</strong> 리듬 그래프와 통계를 확인하여 자신의 컨디션을 파악하세요.
          </div>
        </div>
      </div>

      {/* 성공 기준 */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-6">
        <h2 className="text-xl font-bold text-green-700 mb-4">
          ✅ 베타 성공 기준
        </h2>
        <div className="space-y-2 text-green-700">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <strong>하루 1회 이상 앱 열림</strong>
              <div className="text-sm text-green-600">
                3일 중 최소 2일 이상 접속
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <strong>루틴 체크 50% 이상</strong>
              <div className="text-sm text-green-600">
                3일 중 최소 2일 이상 루틴 체크
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 진행률 */}
      <div className="bg-white rounded-xl border shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">진행률</h2>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Day 1</span>
              <span>
                {day1Checks.length} / {day1Tasks.length}
              </span>
            </div>
            <div className="w-full bg-neutral-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{
                  width: `${(day1Checks.length / day1Tasks.length) * 100}%`,
                }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Day 2</span>
              <span>
                {day2Checks.length} / {day2Tasks.length}
              </span>
            </div>
            <div className="w-full bg-neutral-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all"
                style={{
                  width: `${(day2Checks.length / day2Tasks.length) * 100}%`,
                }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Day 3</span>
              <span>
                {day3Checks.length} / {day3Tasks.length}
              </span>
            </div>
            <div className="w-full bg-neutral-200 rounded-full h-2">
              <div
                className="bg-orange-600 h-2 rounded-full transition-all"
                style={{
                  width: `${(day3Checks.length / day3Tasks.length) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
