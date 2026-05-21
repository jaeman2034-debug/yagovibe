/**
 * 🔥 일정 목록 컴포넌트
 * 
 * 기능:
 * - 일정 목록 표시 (최신순)
 * - 일정 생성 버튼 (운영자만)
 * - 일정 클릭 → 상세 화면
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import { useTeam } from "@/context/TeamContext";
import { canCreateSchedule } from "@/lib/schedules/permissions";
import type { Schedule } from "@/types/schedule";
import { Plus, Calendar as CalendarIcon, MapPin, Users, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScheduleListProps {
  teamId: string;
}

type ScheduleFilter = "all" | "경기" | "훈련" | "today";

export function ScheduleList({ teamId }: ScheduleListProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { myTeam, role } = useTeam();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ScheduleFilter>("all");

  // 일정 목록 실시간 구독
  useEffect(() => {
    if (!teamId) return;

    const q = query(
      collection(db, "schedules"),
      where("teamId", "==", teamId),
      orderBy("dateTime", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Schedule[];
        setSchedules(list);
        setLoading(false);
      },
      (error) => {
        console.error("일정 목록 조회 실패:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [teamId]);

  // 권한 체크
  const canCreate = canCreateSchedule(
    user,
    myTeam ? { id: myTeam.id || teamId, ownerId: myTeam.ownerUid || "", admins: [] } : null,
    role ? { uid: user?.uid || "", role: role, accessLevel: role === "admin" ? "OWNER" : role === "manager" ? "ADMIN" : "MEMBER" } : null
  );

  // 필터링된 일정
  const filteredSchedules = schedules.filter((schedule) => {
    if (filter === "all") return true;
    if (filter === "today") {
      const scheduleDate = schedule.dateTime?.toDate ? schedule.dateTime.toDate() : new Date(schedule.dateTime);
      const today = new Date();
      return scheduleDate.toDateString() === today.toDateString();
    }
    return schedule.type === filter;
  });

  // 일정 포맷팅
  const formatDate = (timestamp: any) => {
    if (!timestamp) return "날짜 없음";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateShort = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* 헤더 + 생성 버튼 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">일정</h2>
        {canCreate && (
          <Button
            onClick={() => navigate("new")}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            일정 만들기
          </Button>
        )}
      </div>

      {/* 필터 */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
        {(["all", "경기", "훈련", "today"] as ScheduleFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              filter === f
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {f === "all" ? "전체" : f === "today" ? "오늘" : f}
          </button>
        ))}
      </div>

      {/* 일정 목록 */}
      {filteredSchedules.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">등록된 일정이 없습니다</p>
          {canCreate && (
            <Button
              onClick={() => navigate("new")}
              variant="outline"
              className="mt-4"
            >
              첫 일정 만들기
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSchedules.map((schedule) => {
            const scheduleDate = schedule.dateTime?.toDate ? schedule.dateTime.toDate() : new Date(schedule.dateTime);
            const attendance = schedule.attendance || {};
            const myAttendance = user ? attendance[user.uid] : null;
            const attendanceCount = Object.keys(attendance).length;

            return (
              <div
                key={schedule.id}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:shadow-md transition-all"
              >
                {/* 헤더 */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        schedule.type === "경기"
                          ? "bg-red-100 text-red-700"
                          : schedule.type === "훈련"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-green-100 text-green-700"
                      }`}>
                        {schedule.type}
                      </span>
                      {schedule.needsSubstitute && (
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded">
                          용병 모집
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">{schedule.title}</h3>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(schedule.id);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    →
                  </button>
                </div>

                {/* 날짜/시간 */}
                <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <CalendarIcon className="w-4 h-4" />
                    <span>{formatDateShort(schedule.dateTime)} {formatTime(schedule.dateTime)}</span>
                  </div>
                </div>

                {/* 장소 */}
                <div className="flex items-center gap-1 mb-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span>{schedule.place}</span>
                </div>

                {/* 상대팀 */}
                {schedule.opponent && (
                  <div className="flex items-center gap-1 mb-3 text-sm text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>vs {schedule.opponent}</span>
                  </div>
                )}

                {/* 참석 상태 */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="text-xs text-gray-500">
                    참석 {attendanceCount}명
                    {myAttendance && (
                      <span className={`ml-2 px-2 py-0.5 rounded ${
                        myAttendance === "참석"
                          ? "bg-green-100 text-green-700"
                          : myAttendance === "불참"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-700"
                      }`}>
                        {myAttendance}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`${schedule.id}?action=attend`);
                      }}
                    >
                      참석
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`${schedule.id}?action=chat`);
                      }}
                    >
                      <MessageCircle className="w-4 h-4 mr-1" />
                      채팅
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
