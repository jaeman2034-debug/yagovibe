/**
 * 🔥 출석 체크 메시지 카드 컴포넌트
 */
import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import { getFunctions, httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { CheckCircle2, Users } from "lucide-react";
import { toast } from "sonner";
import { getTeamTypeConfig } from "@/utils/teamTypeConfig";

interface AttendanceMessageCardProps {
  attendanceId: string;
  teamId: string;
  date: string;
  checkedInUsers: string[];
  startedBy?: string;
}

export default function AttendanceMessageCard({
  attendanceId,
  teamId,
  date,
  checkedInUsers: initialCheckedInUsers,
  startedBy,
}: AttendanceMessageCardProps) {
  const { user } = useAuth();
  const myUid = user?.uid;
  const [checkedInUsers, setCheckedInUsers] = useState<string[]>(initialCheckedInUsers || []);
  const [isChecking, setIsChecking] = useState(false);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);

  useEffect(() => {
    setHasCheckedIn(myUid ? checkedInUsers.includes(myUid) : false);
  }, [myUid, checkedInUsers]);

  // 실시간 업데이트
  useEffect(() => {
    if (!attendanceId || !teamId) return;

    const attendanceRef = doc(db, "teams", teamId, "attendance", attendanceId);
    const unsubscribe = () => {
      getDoc(attendanceRef).then((snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setCheckedInUsers(data?.checkedInUsers || []);
        }
      });
    };

    // 초기 로드
    unsubscribe();

    // 주기적 업데이트 (5초마다)
    const interval = setInterval(unsubscribe, 5000);

    return () => clearInterval(interval);
  }, [attendanceId, teamId]);

  const handleCheckIn = async () => {
    if (!myUid || hasCheckedIn || isChecking) return;

    setIsChecking(true);
    try {
      const checkInAttendance = httpsCallable(functions, "checkInAttendance");
      const result = await checkInAttendance({
        teamId,
        attendanceId,
      });

      const data = result.data as any;
      if (data?.success) {
        setCheckedInUsers(data.checkedInUsers || []);
        setHasCheckedIn(true);
        toast.success("출석 체크 완료! (+3점)");
      }
    } catch (error: any) {
      console.error("❌ [AttendanceMessageCard] 출석 체크 실패:", error);
      
      if (error?.code === "already-exists") {
        toast.info("이미 출석 체크를 완료했습니다.");
        setHasCheckedIn(true);
      } else {
        toast.error("출석 체크에 실패했습니다.");
      }
    } finally {
      setIsChecking(false);
    }
  };

  const checkInCount = checkedInUsers.length;

  return (
    <div
      style={{
        maxWidth: "80%",
        background: "#fff",
        border: "2px solid #fbbf24",
        borderRadius: 12,
        padding: "16px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      }}
    >
      {/* 헤더 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <CheckCircle2 size={20} color="#fbbf24" />
        <div
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: "#111827",
          }}
        >
          출석 체크
        </div>
      </div>

      {/* 날짜 */}
      <div
        style={{
          fontSize: 12,
          color: "#6b7280",
          marginBottom: 12,
        }}
      >
        {date}
      </div>

      {/* 출석 현황 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 16,
          padding: "8px 12px",
          background: "#fef3c7",
          borderRadius: 8,
        }}
      >
        <Users size={16} color="#f59e0b" />
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "#78350f",
          }}
        >
          {checkInCount}명 출석
        </span>
      </div>

      {/* 출석 버튼 */}
      {!hasCheckedIn ? (
        <button
          onClick={handleCheckIn}
          disabled={isChecking}
          style={{
            width: "100%",
            padding: "12px",
            background: "#fbbf24",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: isChecking ? "not-allowed" : "pointer",
            opacity: isChecking ? 0.6 : 1,
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            if (!isChecking) {
              e.currentTarget.style.background = "#f59e0b";
            }
          }}
          onMouseLeave={(e) => {
            if (!isChecking) {
              e.currentTarget.style.background = "#fbbf24";
            }
          }}
        >
          {isChecking ? "처리 중..." : "출석하기 (+3점)"}
        </button>
      ) : (
        <div
          style={{
            width: "100%",
            padding: "12px",
            background: "#d1fae5",
            color: "#065f46",
            border: "none",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            textAlign: "center",
          }}
        >
          ✓ 출석 완료
        </div>
      )}
    </div>
  );
}
