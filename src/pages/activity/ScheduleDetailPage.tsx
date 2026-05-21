/**
 * 🔥 일정 상세 페이지
 * 
 * 역할:
 * - 일정 정보 확인
 * - 출석 체크
 * - 지도 확인
 * 
 * 사용자:
 * - 코치: 출석 체크 수정 가능
 * - 선수: 출석 체크 조회만 가능
 */

import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { doc, getDoc, collection, query, where, getDocs, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import { getStaticMapUrl, getGoogleMapsUrl } from "@/utils/map";
import {
  FALLBACK_MEMBER_DISPLAY_NAME,
  pickDisplayNameFromRecord,
} from "@/lib/team/memberDisplayName";
import type { TeamSchedule } from "@/hooks/useTeamSchedules";

interface TeamMember {
  uid: string;
  role: string;
  userName: string;
  userPhotoURL?: string;
}

interface Attendance {
  uid: string;
  status: "present" | "absent";
  updatedAt: any;
}

export default function ScheduleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [schedule, setSchedule] = useState<TeamSchedule | null>(null);
  const [teamName, setTeamName] = useState<string>("");
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [attendance, setAttendance] = useState<Record<string, Attendance>>({});
  const [isCoach, setIsCoach] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // 일정 정보 로드
  useEffect(() => {
    if (!id) return;

    const loadSchedule = async () => {
      try {
        const scheduleRef = doc(db, "teamSchedules", id);
        const scheduleSnap = await getDoc(scheduleRef);

        if (!scheduleSnap.exists()) {
          alert("일정을 찾을 수 없습니다.");
          navigate("/activity/events");
          return;
        }

        const scheduleData = {
          id: scheduleSnap.id,
          ...scheduleSnap.data(),
        } as TeamSchedule;

        setSchedule(scheduleData);

        // 팀 이름 조회
        if (scheduleData.teamId) {
          const teamRef = doc(db, "teams", scheduleData.teamId);
          const teamSnap = await getDoc(teamRef);
          if (teamSnap.exists()) {
            setTeamName(teamSnap.data().name || `팀 ${scheduleData.teamId}`);
          }
        }

        // 코치 권한 확인
        if (user && scheduleData.teamId) {
          const memberRef = doc(db, "teams", scheduleData.teamId, "members", user.uid);
          const memberSnap = await getDoc(memberRef);
          if (memberSnap.exists()) {
            const memberData = memberSnap.data();
            const role = memberData.role || "";
            const roleUpper = role.toUpperCase();
            const isAdminRole = 
              roleUpper === "LEADER" ||
              roleUpper === "ADMIN" ||
              roleUpper === "OWNER" ||
              roleUpper === "COACH" ||
              role === "admin" ||
              role === "owner" ||
              role === "coach";
            setIsCoach(isAdminRole);
          }
        }
      } catch (error) {
        console.error("일정 정보 로드 실패:", error);
        alert("일정을 불러오는 중 오류가 발생했습니다.");
        navigate("/activity/events");
      } finally {
        setLoading(false);
      }
    };

    loadSchedule();
  }, [id, user, navigate]);

  // 팀 멤버 목록 로드
  useEffect(() => {
    if (!schedule?.teamId) return;

    let cancelled = false;
    const membersRef = collection(db, "teams", schedule.teamId, "members");
    const unsubscribe = onSnapshot(
      membersRef,
      (snap) => {
        if (cancelled) return;

        const activeRows = snap.docs
          .map((docSnap) => {
            const data = docSnap.data();
            const uid = docSnap.id;
            const status = data.status || "active";
            if (status !== "active") return null;
            return {
              uid,
              role: (data.role as string) || "member",
              memberFields: data as Record<string, unknown>,
            };
          })
          .filter(
            (row): row is { uid: string; role: string; memberFields: Record<string, unknown> } =>
              row !== null
          );

        void (async () => {
          const membersList: TeamMember[] = [];
          for (const { uid, role, memberFields } of activeRows) {
            let userName = pickDisplayNameFromRecord(memberFields);
            let userPhotoURL: string | undefined;
            try {
              const userRef = doc(db, "users", uid);
              const userSnap = await getDoc(userRef);
              if (userSnap.exists()) {
                const userData = userSnap.data() as Record<string, unknown>;
                const fromUser = pickDisplayNameFromRecord(userData);
                userName = userName || fromUser;
                const photo =
                  typeof userData.photoURL === "string" ? userData.photoURL : "";
                const avatar =
                  typeof userData.avatar === "string" ? userData.avatar : "";
                userPhotoURL = photo || avatar || undefined;
              }
            } catch (error) {
              console.warn(`사용자 ${uid} 정보 조회 실패:`, error);
            }
            if (!userName.trim()) {
              userName = FALLBACK_MEMBER_DISPLAY_NAME;
            }
            membersList.push({ uid, role, userName, userPhotoURL });
          }

          membersList.sort((a, b) => {
            const aIsLeader = a.role === "owner" || a.role === "admin";
            const bIsLeader = b.role === "owner" || b.role === "admin";
            if (aIsLeader && !bIsLeader) return -1;
            if (!aIsLeader && bIsLeader) return 1;
            return 0;
          });

          if (cancelled) return;
          setMembers(membersList);
        })();
      },
      (err) => {
        console.warn("[ScheduleDetailPage] members 구독 실패:", err);
        if (!cancelled) setMembers([]);
      }
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [schedule?.teamId]);

  // 출석 체크 데이터 로드
  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    const attendanceRef = collection(db, "attendance");
    const q = query(attendanceRef, where("scheduleId", "==", id));

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        if (cancelled) return;
        const attendanceMap: Record<string, Attendance> = {};
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          attendanceMap[data.uid] = {
            uid: data.uid,
            status: data.status || "absent",
            updatedAt: data.updatedAt,
          };
        });
        setAttendance(attendanceMap);
      },
      (err) => {
        console.warn("[ScheduleDetailPage] 출석 구독 실패:", err);
        if (!cancelled) setAttendance({});
      }
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [id]);

  // 출석 체크 토글
  const toggleAttendance = async (memberUid: string) => {
    if (!isCoach || !id) {
      alert("출석 체크는 코치만 수정할 수 있습니다.");
      return;
    }

    try {
      const currentStatus = attendance[memberUid]?.status || "absent";
      const newStatus = currentStatus === "present" ? "absent" : "present";

      const attendanceRef = doc(db, "attendance", `${id}_${memberUid}`);
      await setDoc(attendanceRef, {
        scheduleId: id,
        uid: memberUid,
        status: newStatus,
        updatedAt: new Date(),
        updatedBy: user?.uid,
      });
    } catch (error) {
      console.error("출석 체크 업데이트 실패:", error);
      alert("출석 체크 업데이트 중 오류가 발생했습니다.");
    }
  };

  // 날짜 포맷팅
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

  // 일정 타입 아이콘
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

  // 일정 타입 한글
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">일정을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500">일정을 찾을 수 없습니다.</p>
          <button
            onClick={() => navigate("/activity/events")}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            일정 목록으로
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <button
            onClick={() => navigate(-1)}
            className="mb-2 text-gray-600 hover:text-gray-900"
          >
            ← 뒤로
          </button>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{getTypeIcon(schedule.type)}</span>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{schedule.title}</h1>
              <p className="text-sm text-gray-500">{teamName}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* 일정 정보 */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                {getTypeLabel(schedule.type)}
              </span>
            </div>
            <p className="text-lg font-semibold text-gray-900">
              {formatDate(schedule)}
            </p>
            {schedule.locationName && (
              <p className="text-sm text-gray-600">
                📍 {schedule.locationName}
              </p>
            )}
          </div>
        </div>

        {/* 지도 */}
        {schedule.locationLat && schedule.locationLng && (
          <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200">
            {(() => {
              const staticMapSrc = getStaticMapUrl(schedule.locationLat!, schedule.locationLng!);
              return staticMapSrc ? (
                <img
                  src={staticMapSrc}
                  alt={schedule.locationName || "위치"}
                  className="w-full h-64 object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="flex h-64 w-full items-center justify-center bg-gray-100 px-4 text-center text-xs text-gray-500">
                  지도 이미지는{" "}
                  <code className="mx-1 rounded bg-gray-200 px-1">VITE_GOOGLE_MAPS_API_KEY</code> 등 Google Maps
                  키 설정 후 표시됩니다. 아래 길찾기로 외부 지도를 열 수 있어요.
                </div>
              );
            })()}
            <button
              onClick={() =>
                window.open(
                  getGoogleMapsUrl(schedule.locationLat!, schedule.locationLng!),
                  "_blank"
                )
              }
              className="w-full py-3 bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
            >
              🗺️ 길찾기
            </button>
          </div>
        )}

        {/* 출석 체크 */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">👥 출석 체크</h2>
            {!isCoach && (
              <span className="text-xs text-gray-500">조회 전용</span>
            )}
          </div>

          {members.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">팀 멤버가 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {members.map((member) => {
                const memberAttendance = attendance[member.uid];
                const isPresent = memberAttendance?.status === "present";

                return (
                  <div
                    key={member.uid}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      isPresent
                        ? "bg-green-50 border-green-200"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <button
                      onClick={() => toggleAttendance(member.uid)}
                      disabled={!isCoach}
                      className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                        isCoach
                          ? "cursor-pointer hover:border-blue-500"
                          : "cursor-not-allowed opacity-50"
                      } ${
                        isPresent
                          ? "bg-green-500 border-green-500"
                          : "bg-white border-gray-300"
                      }`}
                    >
                      {isPresent && (
                        <svg
                          className="w-4 h-4 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{member.userName}</p>
                      <p className="text-xs text-gray-500">
                        {isPresent ? "출석" : "미참석"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 메모 */}
        {schedule.memo && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2">📝 메모</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{schedule.memo}</p>
          </div>
        )}
      </div>
    </div>
  );
}
