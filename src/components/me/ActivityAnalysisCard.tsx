/**
 * 🔥 ActivityAnalysisCard - 활동 분석 카드
 * 
 * 역할:
 * - 세션의 상세 분석 정보 표시
 * - 시작/종료 시간, 총 운동 시간, 위치, 상태
 * 
 * UX 목적:
 * - 세션 분석 정보 제공
 * - 기록 이해 강화
 */

import { MapPin, Clock, Calendar, CheckCircle } from "lucide-react";

type Props = {
  startedAt: any;
  endedAt: any;
  durationMs: number;
  location: {
    dong: string;
    gu?: string | null;
    si?: string | null;
  };
  status?: string;
};

/**
 * 🔥 시간 포맷팅 (시:분 형식)
 */
function formatTime(ts: any): string {
  if (!ts) return "";
  
  let d: Date | null = null;
  
  if (ts.toDate && typeof ts.toDate === "function") {
    d = ts.toDate();
  } else if (ts instanceof Date) {
    d = ts;
  } else if (ts.seconds) {
    d = new Date(ts.seconds * 1000);
  }
  
  if (!d) return "";
  
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  
  return `${hours}:${minutes}`;
}

/**
 * 🔥 운동 시간 포맷팅 (분 단위)
 */
function formatDuration(durationMs: number): string {
  const min = Math.floor(durationMs / 60000);
  return `${min}분`;
}

/**
 * 🔥 ActivityAnalysisCard 컴포넌트
 */
export function ActivityAnalysisCard({
  startedAt,
  endedAt,
  durationMs,
  location,
  status = "ended",
}: Props) {
  const startTime = formatTime(startedAt);
  const endTime = formatTime(endedAt);
  const duration = formatDuration(durationMs);

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-sm">
      <h3 className="font-semibold mb-4 text-sm text-neutral-700">활동 분석</h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-neutral-600">
            <Clock className="w-4 h-4" />
            <span>시작 시간</span>
          </div>
          <span className="text-sm font-medium text-neutral-800">{startTime}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-neutral-600">
            <Clock className="w-4 h-4" />
            <span>종료 시간</span>
          </div>
          <span className="text-sm font-medium text-neutral-800">{endTime}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-neutral-600">
            <Clock className="w-4 h-4" />
            <span>총 운동 시간</span>
          </div>
          <span className="text-sm font-semibold text-blue-600">{duration}</span>
        </div>
        <div className="flex items-start gap-2 pt-2 border-t border-neutral-100">
          <MapPin className="w-4 h-4 mt-0.5 text-neutral-600 shrink-0" />
          <div className="flex-1">
            <div className="text-sm text-neutral-600 mb-1">위치</div>
            <div className="text-sm font-medium text-neutral-800">
              {location.dong}
              {location.gu && ` · ${location.gu}`}
              {location.si && ` · ${location.si}`}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
          <div className="flex items-center gap-2 text-sm text-neutral-600">
            <CheckCircle className="w-4 h-4" />
            <span>상태</span>
          </div>
          <span className="text-sm font-medium text-neutral-800">
            {status === "ended" ? "종료됨" : status}
          </span>
        </div>
      </div>
    </div>
  );
}
