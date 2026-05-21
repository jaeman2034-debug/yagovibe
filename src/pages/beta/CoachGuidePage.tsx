/**
 * 🔥 CoachGuidePage - 코치용 베타 가이드 페이지
 * 
 * 경로: /beta/coach-guide
 * 
 * 역할:
 * - 코치용 사용 가이드
 * - 리포트 생성 가이드
 * 
 * UX 목적:
 * - 코치 베타 테스트 참여자 안내
 */

import { CheckCircle2, Circle, Users, FileText, AlertTriangle } from "lucide-react";
import { useState } from "react";

/**
 * 🔥 코치용 가이드 페이지
 */
export default function CoachGuidePage() {
  const [checks, setChecks] = useState<string[]>([]);

  const toggleCheck = (id: string) => {
    setChecks((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id]
    );
  };

  const tasks = [
    { id: "dashboard", label: "코치 대시보드 접속", icon: Users },
    { id: "players", label: "팀 선수 목록 확인", icon: Users },
    { id: "status", label: "선수 상태 확인 (리듬 점수)", icon: Users },
    { id: "risk", label: "위험 선수 필터 사용", icon: AlertTriangle },
    { id: "report", label: "경기 전 리포트 생성", icon: FileText },
    { id: "download", label: "리포트 다운로드/인쇄", icon: FileText },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold mb-2">👨‍🏫 코치용 베타 가이드</h1>
        <p className="text-neutral-600">
          YAGO SPORTS 코치 대시보드 사용 가이드입니다.
        </p>
      </div>

      {/* 사용 가이드 */}
      <div className="bg-white rounded-xl border shadow-sm">
        <div className="p-4 border-b bg-blue-50">
          <h2 className="text-xl font-bold text-blue-600">코치 대시보드 사용법</h2>
        </div>
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            {tasks.map((task) => {
              const Icon = task.icon;
              return (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-3 hover:bg-neutral-50 rounded-lg transition-colors"
                >
                  <button
                    onClick={() => toggleCheck(task.id)}
                    className="shrink-0"
                  >
                    {checks.includes(task.id) ? (
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                    ) : (
                      <Circle className="w-6 h-6 text-neutral-300" />
                    )}
                  </button>
                  <Icon className="w-5 h-5 text-blue-600 shrink-0" />
                  <span className="flex-1">{task.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 리포트 생성 가이드 */}
      <div className="bg-white rounded-xl border shadow-sm">
        <div className="p-4 border-b bg-orange-50">
          <h2 className="text-xl font-bold text-orange-600">경기 전 리포트 생성</h2>
        </div>
        <div className="p-4 space-y-4">
          <div className="space-y-3">
            <div className="p-3 bg-orange-50 rounded-lg">
              <div className="font-semibold mb-2">1. 리포트 생성 버튼 클릭</div>
              <div className="text-sm text-neutral-600">
                코치 대시보드 상단의 "경기 전 리포트 생성" 버튼을 클릭하세요.
              </div>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <div className="font-semibold mb-2">2. 리포트 내용 확인</div>
              <div className="text-sm text-neutral-600">
                리포트 모달에서 다음 정보를 확인하세요:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>팀 평균 리듬 점수</li>
                  <li>과부하 선수 수</li>
                  <li>회복 권장 선수 수</li>
                  <li>위험 선수 리스트</li>
                  <li>컨디션 우수 선수 리스트</li>
                  <li>AI 코치 코멘트</li>
                </ul>
              </div>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <div className="font-semibold mb-2">3. 리포트 다운로드/인쇄</div>
              <div className="text-sm text-neutral-600">
                리포트 모달에서 "다운로드" 또는 "인쇄" 버튼을 클릭하여 리포트를 저장하세요.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 위험 선수 판단 기준 */}
      <div className="bg-white rounded-xl border shadow-sm">
        <div className="p-4 border-b bg-red-50">
          <h2 className="text-xl font-bold text-red-600">위험 선수 판단 기준</h2>
        </div>
        <div className="p-4 space-y-3">
          <div className="p-3 bg-red-50 rounded-lg">
            <div className="font-semibold text-red-700 mb-2">리듬 점수 &lt; 40</div>
            <div className="text-sm text-neutral-600">
              컨디션이 매우 낮은 상태입니다. 즉시 휴식이 필요합니다.
            </div>
          </div>
          <div className="p-3 bg-red-50 rounded-lg">
            <div className="font-semibold text-red-700 mb-2">훈련 부하 &gt; 1.2x</div>
            <div className="text-sm text-neutral-600">
              최근 3일 훈련량이 평균보다 20% 이상 높습니다. 과부하 위험이 있습니다.
            </div>
          </div>
        </div>
      </div>

      {/* 성공 기준 */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-6">
        <h2 className="text-xl font-bold text-green-700 mb-4">
          ✅ 코치 베타 성공 기준
        </h2>
        <div className="space-y-2 text-green-700">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <strong>코치 대시보드 접속</strong>
              <div className="text-sm text-green-600">
                최소 1회 이상 접속하여 선수 상태 확인
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <strong>경기 전 리포트 생성</strong>
              <div className="text-sm text-green-600">
                최소 1회 이상 리포트 생성 및 다운로드
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 진행률 */}
      <div className="bg-white rounded-xl border shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">진행률</h2>
        <div className="flex justify-between text-sm mb-2">
          <span>완료된 작업</span>
          <span>
            {checks.length} / {tasks.length}
          </span>
        </div>
        <div className="w-full bg-neutral-200 rounded-full h-4">
          <div
            className="bg-blue-600 h-4 rounded-full transition-all"
            style={{
              width: `${(checks.length / tasks.length) * 100}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
