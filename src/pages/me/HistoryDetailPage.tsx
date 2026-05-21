/**
 * 🔥 HistoryDetailPage - 활동 기록 상세 페이지
 * 
 * 역할:
 * - 단일 활동 기록의 상세 정보 표시
 * - 기본 정보, 활동 정보, 통계, 액션 버튼 제공
 * 
 * UX 목적:
 * - 기록 이해 및 관리
 * - 허브 = 동기, 마이페이지 = 관리, 상세페이지 = 기록 이해
 */

import { useParams, useNavigate } from "react-router-dom";
import { useHistoryDetail } from "@/hooks/useHistoryDetail";
import { getSportLabel } from "@/constants/sports";
import { HubLayout } from "@/components/ui/layout/HubLayout";
import { IdentityHeader } from "@/components/ui/layout/IdentityHeader";
import { ArrowLeft, MapPin, Clock, Calendar, Trash2 } from "lucide-react";

/**
 * 🔥 날짜 포맷팅 (2026.02.17 20:31 형식)
 */
function formatDateTime(ts: any): string {
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
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const date = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  
  return `${year}.${month}.${date} ${hours}:${minutes}`;
}

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
 * 🔥 스포츠 이모지
 */
function sportEmoji(sport: string): string {
  switch (sport) {
    case "soccer":
      return "⚽";
    case "basketball":
      return "🏀";
    case "running":
      return "🏃‍♂️";
    case "tennis":
      return "🎾";
    default:
      return "✅";
  }
}

/**
 * 🔥 HistoryDetailPage 컴포넌트
 */
export default function HistoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { detail, loading, error } = useHistoryDetail(id);

  if (loading) {
    return (
      <HubLayout
        header={
          <IdentityHeader
            title="활동 기록"
            subtitle="로딩 중..."
          />
        }
        persona={
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">기록을 불러오는 중...</p>
            </div>
          </div>
        }
      />
    );
  }

  if (error || !detail) {
    return (
      <HubLayout
        header={
          <IdentityHeader
            title="활동 기록"
            subtitle="오류"
          />
        }
        persona={
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <p className="text-red-600 mb-4">기록을 불러올 수 없습니다.</p>
              <button
                onClick={() => navigate("/me")}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                마이페이지로 돌아가기
              </button>
            </div>
          </div>
        }
      />
    );
  }

  const emoji = sportEmoji(detail.sport);
  const label = getSportLabel(detail.sport);
  const duration = formatDuration(detail.durationMs);
  const startTime = formatTime(detail.startedAt);
  const endTime = formatTime(detail.endedAt);
  const startDateTime = formatDateTime(detail.startedAt);
  const endDateTime = formatDateTime(detail.endedAt);

  return (
    <HubLayout
      header={
        <IdentityHeader
          title={
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/me")}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="뒤로 가기"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <span>활동 기록</span>
            </div>
          }
          subtitle={`${emoji} ${label}`}
        />
      }
      persona={
        <div className="px-4 py-6 space-y-6">
          {/* 기본 정보 카드 */}
          <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-sm">
            <h3 className="font-semibold mb-4 text-sm text-neutral-700">기본 정보</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-neutral-600">
                  <Calendar className="w-4 h-4" />
                  <span>날짜</span>
                </div>
                <span className="text-sm font-medium text-neutral-800">
                  {startDateTime.split(" ")[0]}
                </span>
              </div>
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
            </div>
          </div>

          {/* 활동 정보 카드 */}
          <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-sm">
            <h3 className="font-semibold mb-4 text-sm text-neutral-700">활동 정보</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 text-neutral-600 shrink-0" />
                <div className="flex-1">
                  <div className="text-sm text-neutral-600 mb-1">위치</div>
                  <div className="text-sm font-medium text-neutral-800">
                    {detail.location.dong}
                    {detail.location.gu && ` · ${detail.location.gu}`}
                    {detail.location.si && ` · ${detail.location.si}`}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm text-neutral-600">활동 타입</div>
                <span className="text-sm font-medium text-neutral-800">혼자</span>
              </div>
            </div>
          </div>

          {/* 통계 카드 */}
          <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-sm">
            <h3 className="font-semibold mb-4 text-sm text-neutral-700">통계</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-neutral-600">운동 시간</div>
                <span className="text-sm font-semibold text-neutral-800">{duration}</span>
              </div>
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-sm">
            <h3 className="font-semibold mb-4 text-sm text-neutral-700">액션</h3>
            <div className="space-y-2">
              <button
                onClick={() => {
                  if (confirm("정말 이 기록을 삭제하시겠습니까?")) {
                    // TODO: 삭제 기능 구현
                    console.log("삭제:", detail.id);
                    navigate("/me");
                  }
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>기록 삭제</span>
              </button>
            </div>
          </div>
        </div>
      }
    />
  );
}
