/**
 * 🔥 이벤트 페이지 MVP
 * 
 * 역할:
 * - 사용자의 모든 팀 일정 통합 표시
 * - 이번 주 일정 필터링
 * - 훈련/경기 추가 버튼
 * 
 * 데이터:
 * - schedules 컬렉션에서 teamId로 조회
 * - useMyTeams로 사용자 팀 목록 가져오기
 */

import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import { useMyTeams } from "@/hooks/useMyTeams";
import { useTeamSchedules, type TeamSchedule } from "@/hooks/useTeamSchedules";
import { getStaticMapUrl, getGoogleMapsUrl } from "@/utils/map";
import { Calendar } from "lucide-react";

export default function EventsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { teamIds, loading: teamsLoading } = useMyTeams(); // 🔥 teamIds만 사용
  const { schedules, loading: schedulesLoading, error: schedulesError } = useTeamSchedules({
    teamIds: teamIds || [], // 🔥 useMyTeams에서 반환하는 teamIds 직접 사용
    enabled: (teamIds?.length || 0) > 0,
  });
  const [teamNames, setTeamNames] = useState<Record<string, string>>({});

  // 🔥 팀 이름 조회 (teamIds 기준으로 teams 컬렉션에서 직접 조회)
  useEffect(() => {
    if (!teamIds || teamIds.length === 0) return;

    const fetchTeamNames = async () => {
      const names: Record<string, string> = {};
      const promises = teamIds.map(async (teamId) => {
        try {
          const teamDoc = await getDoc(doc(db, "teams", teamId));
          if (teamDoc.exists()) {
            const data = teamDoc.data();
            names[teamId] = data.name || `팀 ${teamId}`;
          } else {
            names[teamId] = `팀 ${teamId}`;
          }
        } catch (error) {
          console.warn(`팀 이름 조회 실패: ${teamId}`, error);
          names[teamId] = `팀 ${teamId}`;
        }
      });
      await Promise.all(promises);
      setTeamNames(names);
    };

    void fetchTeamNames();
  }, [teamIds]);

  // 🔥 이번 주 일정 필터링
  const thisWeekSchedules = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // 일요일
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // 토요일
    endOfWeek.setHours(23, 59, 59, 999);

    return schedules.filter((schedule) => {
      const scheduleDate = schedule.startDateTime?.toDate
        ? schedule.startDateTime.toDate()
        : new Date(`${schedule.date}T${schedule.startTime}:00`);
      return scheduleDate >= startOfWeek && scheduleDate <= endOfWeek;
    });
  }, [schedules]);

  // 🔥 전체 일정 (이번 주 제외)
  const otherSchedules = useMemo(() => {
    return schedules.filter((s) => !thisWeekSchedules.some((ws) => ws.id === s.id));
  }, [schedules, thisWeekSchedules]);

  // 🔥 상태 플래그
  const hasWeekSchedules = thisWeekSchedules.length > 0;
  const hasAllSchedules = schedules.length > 0;
  const hasOtherSchedules = otherSchedules.length > 0;

  // 🔥 일정 포맷팅
  const formatDate = (schedule: TeamSchedule): string => {
    const date = schedule.startDateTime?.toDate
      ? schedule.startDateTime.toDate()
      : new Date(`${schedule.date}T${schedule.startTime}:00`);
    return date.toLocaleDateString("ko-KR", {
      month: "long",
      day: "numeric",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 🔥 팀 이름 가져오기
  const getTeamName = (teamId: string): string => {
    return teamNames[teamId] || `팀 ${teamId}`;
  };

  // 🔥 일정 타입별 아이콘
  const getTypeIcon = (type: string): string => {
    switch (type) {
      case "match":
        return "⚽";
      case "training":
        return "🏃";
      default:
        return "📅";
    }
  };

  // 🔥 일정 타입 한글 변환
  const getTypeLabel = (type: string): string => {
    switch (type) {
      case "match":
        return "경기";
      case "training":
        return "훈련";
      default:
        return "일정";
    }
  };

  // 🔥 일정 카드 컴포넌트
  const ScheduleCard = ({ 
    schedule, 
    teamName, 
    onCardClick 
  }: { 
    schedule: TeamSchedule; 
    teamName: string;
    onCardClick: () => void;
  }) => {
    const staticMapSrc =
      schedule.locationLat && schedule.locationLng
        ? getStaticMapUrl(schedule.locationLat, schedule.locationLng)
        : null;

    return (
    <div
      className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all"
    >
      {/* 지도 미리보기 */}
      {schedule.locationLat && schedule.locationLng && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            window.open(
              getGoogleMapsUrl(schedule.locationLat!, schedule.locationLng!),
              "_blank"
            );
          }}
          className="w-full h-40 bg-gray-100 relative cursor-pointer hover:opacity-90 transition-opacity"
        >
          {staticMapSrc ? (
            <img
              src={staticMapSrc}
              alt={schedule.locationName || "위치"}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center px-2 text-center text-[10px] text-gray-500">
              지도 API 키 미설정
            </div>
          )}
        </div>
      )}

      <div onClick={onCardClick} className="p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">{getTypeIcon(schedule.type)}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900">{schedule.title}</h3>
              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                {getTypeLabel(schedule.type)}
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-1">
              {formatDate(schedule)}
            </p>
            <p className="text-sm text-gray-500">
              📍 {schedule.locationName || "장소 미지정"}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {teamName}
            </p>
          </div>
        </div>
      </div>
    </div>
    );
  };

  // 🔥 빈 상태 컴포넌트
  const EmptyState = ({ type }: { type: "week" | "all" }) => (
    <div className="py-12 text-center bg-white rounded-2xl shadow-sm">
      <div className="mb-4 flex justify-center">
        <Calendar className="w-16 h-16 text-gray-300" />
      </div>
      <p className="text-gray-500 mb-2 text-lg">
        {type === "week" ? "이번 주 일정이 없어요" : "등록된 일정이 없습니다"}
      </p>
      <p className="text-gray-400 text-sm">
        {type === "week" ? "훈련이나 경기를 추가해보세요" : "일정을 추가하면 여기에 표시됩니다"}
      </p>
    </div>
  );

  // 🔥 훈련 추가 핸들러
  const handleAddTraining = () => {
    if (!teamIds || teamIds.length === 0) {
      alert("팀을 먼저 만들어주세요.");
      navigate("/activity/team");
      return;
    }

    // 새로운 일정 생성 페이지로 이동
    navigate("/activity/schedule/create?type=training");
  };

  // 🔥 경기 추가 핸들러
  const handleAddMatch = () => {
    if (!teamIds || teamIds.length === 0) {
      alert("팀을 먼저 만들어주세요.");
      navigate("/activity/team");
      return;
    }

    // 새로운 일정 생성 페이지로 이동
    navigate("/activity/schedule/create?type=match");
  };

  // 🔥 에러 표시
  if (schedulesError) {
    console.error("❌ [EventsPage] 일정 조회 오류:", schedulesError);
  }

  if (schedulesLoading || teamsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">일정을 불러오는 중...</p>
          {teamIds.length > 0 && (
            <p className="text-xs text-gray-400 mt-2">
              {teamIds.length}개 팀의 일정을 조회 중...
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">📅 이벤트</h1>
          <p className="text-sm text-gray-600 mt-1">
            내 팀 일정을 한눈에 확인하세요
          </p>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="max-w-5xl mx-auto px-4 py-4">
        <div className="flex gap-2">
          <button
            onClick={handleAddTraining}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
          >
            🏃 훈련 추가
          </button>
          <button
            onClick={handleAddMatch}
            className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors text-sm"
          >
            ⚽ 경기 추가
          </button>
        </div>
      </div>


      {/* 팀이 없을 때 */}
      {(!teamIds || teamIds.length === 0) && !teamsLoading && (
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="py-12 text-center bg-white rounded-2xl shadow-sm">
            <div className="mb-4 text-6xl">👥</div>
            <p className="text-gray-500 mb-2 text-lg">팀이 없어요</p>
            <p className="text-gray-400 text-sm mb-6">
              팀을 만들거나 가입하면 일정을 관리할 수 있어요
            </p>
            <button
              onClick={() => navigate("/activity/team")}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              팀 만들기
            </button>
          </div>
        </div>
      )}

      {/* 팀이 있을 때만 일정 섹션 표시 */}
      {teamIds && teamIds.length > 0 && (
        <>
          {/* 이번 주 일정 */}
          <div className="max-w-5xl mx-auto px-4 py-4">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">이번 주 일정</h2>
              {hasWeekSchedules && (
                <p className="text-sm text-gray-600">
                  {thisWeekSchedules.length}개의 일정이 있습니다
                </p>
              )}
            </div>

            {hasWeekSchedules ? (
              <div className="space-y-3">
                {thisWeekSchedules.map((schedule) => (
                  <ScheduleCard
                    key={schedule.id}
                    schedule={schedule}
                    teamName={getTeamName(schedule.teamId)}
                    onCardClick={() => navigate(`/activity/events/${schedule.id}`)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState type="week" />
            )}
          </div>

          {/* 전체 일정 */}
          <div className="max-w-5xl mx-auto px-4 py-4">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">전체 일정</h2>
              {hasOtherSchedules && (
                <p className="text-sm text-gray-600">
                  {otherSchedules.length}개의 추가 일정
                </p>
              )}
            </div>

            {hasOtherSchedules ? (
              <div className="space-y-3">
                {otherSchedules.map((schedule) => (
                  <ScheduleCard
                    key={schedule.id}
                    schedule={schedule}
                    teamName={getTeamName(schedule.teamId)}
                    onCardClick={() => navigate(`/activity/events/${schedule.id}`)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState type="all" />
            )}
          </div>
        </>
      )}


      {/* 에러 표시 */}
      {schedulesError && (
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-red-800 font-semibold mb-2">⚠️ 일정을 불러오는 중 오류가 발생했습니다</p>
            <p className="text-sm text-red-600 mb-2">{schedulesError.message}</p>
            {schedulesError.message?.includes("index") && (
              <p className="text-xs text-red-500">
                💡 Firestore 인덱스가 필요할 수 있습니다. Firebase 콘솔에서 확인하세요.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
