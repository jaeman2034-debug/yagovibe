/**
 * 🔥 일정 상세 컴포넌트
 * 
 * 기능:
 * - 일정 상세 정보 표시
 * - 참석 응답 (멤버 전체)
 * - 수정/삭제 버튼 (운영자만)
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import { useTeam } from "@/context/TeamContext";
import { canEditSchedule } from "@/lib/schedules/permissions";
import type { Schedule } from "@/types/schedule";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScheduleDetailProps {
  teamId: string;
}

export function ScheduleDetail({ teamId }: ScheduleDetailProps) {
  const { scheduleId } = useParams<{ scheduleId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { myTeam, role } = useTeam();
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  // 일정 조회
  useEffect(() => {
    if (!scheduleId) return;

    const fetchSchedule = async () => {
      try {
        const docRef = doc(db, "schedules", scheduleId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSchedule({ id: docSnap.id, ...docSnap.data() } as Schedule);
        }
      } catch (error) {
        console.error("일정 조회 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, [scheduleId]);

  // 권한 체크
  const canEdit = schedule
    ? canEditSchedule(
        user,
        myTeam ? { id: myTeam.id || teamId, ownerId: myTeam.ownerUid || "", admins: [] } : null,
        role ? { uid: user?.uid || "", role: role, accessLevel: role === "admin" ? "OWNER" : role === "manager" ? "ADMIN" : "MEMBER" } : null,
        schedule
      )
    : false;

  // 일정 삭제
  const handleDelete = async () => {
    if (!scheduleId || !confirm("일정을 삭제하시겠습니까?")) return;

    setDeleting(true);
    try {
      await deleteDoc(doc(db, "schedules", scheduleId));
      navigate(-1); // 목록으로 돌아가기
    } catch (error) {
      console.error("일정 삭제 실패:", error);
      alert("일정 삭제에 실패했습니다");
    } finally {
      setDeleting(false);
    }
  };

  // 날짜 포맷팅
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">일정을 찾을 수 없습니다</p>
        <Button onClick={() => navigate(-1)} variant="outline">
          뒤로 가기
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        {canEdit && (
          <div className="flex gap-2">
            <Button
              onClick={() => navigate(`edit`)}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              수정
            </Button>
            <Button
              onClick={handleDelete}
              variant="outline"
              size="sm"
              disabled={deleting}
              className="flex items-center gap-2 text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
              삭제
            </Button>
          </div>
        )}
      </div>

      {/* 일정 정보 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded">
            {schedule.type}
          </span>
          {schedule.needsSubstitute && (
            <span className="px-3 py-1 bg-orange-100 text-orange-700 text-sm font-medium rounded">
              용병 모집
            </span>
          )}
        </div>

        <h2 className="text-2xl font-bold text-gray-900">{schedule.title}</h2>

        <div className="space-y-2 text-gray-700">
          <p>
            <span className="font-medium">날짜:</span> {formatDate(schedule.dateTime)}
          </p>
          <p>
            <span className="font-medium">장소:</span> {schedule.place}
          </p>
          {schedule.opponent && (
            <p>
              <span className="font-medium">상대팀:</span> {schedule.opponent}
            </p>
          )}
          <p>
            <span className="font-medium">공개:</span> {schedule.isPublic ? "공개" : "팀 내부만"}
          </p>
        </div>

        {schedule.description && (
          <div className="pt-4 border-t border-gray-200">
            <p className="text-gray-700 whitespace-pre-wrap">{schedule.description}</p>
          </div>
        )}

        {/* 참석 응답 (추후 구현) */}
        <div className="pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-500">참석 응답 기능은 추후 구현 예정입니다</p>
        </div>
      </div>
    </div>
  );
}
