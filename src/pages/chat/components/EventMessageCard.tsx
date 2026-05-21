/**
 * 🔥 이벤트 카드 메시지 컴포넌트
 */
import { useState, useEffect } from "react";
import { doc, updateDoc, arrayUnion, arrayRemove, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import { Calendar, MapPin, Users, X } from "lucide-react";

interface EventMessageCardProps {
  eventId: string;
  teamId: string;
  title: string;
  description?: string;
  date: any;
  location?: string;
  initialAttendees?: string[];
  initialDeclined?: string[];
}

export default function EventMessageCard({
  eventId,
  teamId,
  title,
  description,
  date,
  location,
  initialAttendees = [],
  initialDeclined = [],
}: EventMessageCardProps) {
  const { user } = useAuth();
  const myUid = user?.uid;
  const [attendees, setAttendees] = useState<string[]>(initialAttendees);
  const [declined, setDeclined] = useState<string[]>(initialDeclined);
  const [isLoading, setIsLoading] = useState(false);

  // 🔥 실시간 구독: 이벤트 참석자 정보 업데이트
  useEffect(() => {
    if (!teamId || !eventId) return;

    const eventRef = doc(db, "teams", teamId, "events", eventId);
    const unsub = onSnapshot(
      eventRef,
      (snap) => {
        if (snap.exists()) {
          const eventData = snap.data();
          setAttendees(eventData.attendees || []);
          setDeclined(eventData.declined || []);
        }
      },
      (error) => {
        console.warn("⚠️ [EventMessageCard] 이벤트 구독 실패:", error);
      }
    );

    return () => unsub();
  }, [teamId, eventId]);

  // 날짜 포맷팅
  const formatDate = (timestamp: any) => {
    if (!timestamp) return "날짜 미정";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "날짜 미정";
    }
  };

  // 참석 버튼 클릭
  const handleAttend = async () => {
    if (!myUid || !teamId || !eventId || isLoading) return;

    setIsLoading(true);
    try {
      const eventRef = doc(db, "teams", teamId, "events", eventId);
      await updateDoc(eventRef, {
        attendees: arrayUnion(myUid),
        declined: arrayRemove(myUid),
      });
    } catch (error: any) {
      console.error("❌ [EventMessageCard] 참석 처리 실패:", error);
      alert("참석 처리에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 불참 버튼 클릭
  const handleDecline = async () => {
    if (!myUid || !teamId || !eventId || isLoading) return;

    setIsLoading(true);
    try {
      const eventRef = doc(db, "teams", teamId, "events", eventId);
      await updateDoc(eventRef, {
        declined: arrayUnion(myUid),
        attendees: arrayRemove(myUid),
      });
    } catch (error: any) {
      console.error("❌ [EventMessageCard] 불참 처리 실패:", error);
      alert("불참 처리에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const isAttending = myUid && attendees.includes(myUid);
  const isDeclined = myUid && declined.includes(myUid);

  return (
    <div
      style={{
        maxWidth: "80%",
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: "16px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      }}
    >
      {/* 이벤트 아이콘 + 제목 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <Calendar size={20} color="#2563eb" />
        <div
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: "#111827",
          }}
        >
          {title}
        </div>
      </div>

      {/* 날짜 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 8,
          fontSize: 13,
          color: "#6b7280",
        }}
      >
        <Calendar size={14} />
        <span>{formatDate(date)}</span>
      </div>

      {/* 위치 */}
      {location && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 8,
            fontSize: 13,
            color: "#6b7280",
          }}
        >
          <MapPin size={14} />
          <span>{location}</span>
        </div>
      )}

      {/* 설명 */}
      {description && (
        <div
          style={{
            fontSize: 13,
            color: "#374151",
            marginBottom: 12,
            lineHeight: 1.5,
          }}
        >
          {description}
        </div>
      )}

      {/* 구분선 */}
      <div
        style={{
          height: 1,
          background: "#e5e7eb",
          marginBottom: 12,
        }}
      />

      {/* 참석/불참 버튼 */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <button
          onClick={handleAttend}
          disabled={isLoading || isAttending}
          style={{
            flex: 1,
            padding: "8px 16px",
            borderRadius: 8,
            border: "none",
            background: isAttending ? "#2563eb" : "#f3f4f6",
            color: isAttending ? "#fff" : "#374151",
            fontSize: 13,
            fontWeight: 500,
            cursor: isLoading || isAttending ? "not-allowed" : "pointer",
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
          }}
          onMouseEnter={(e) => {
            if (!isAttending && !isLoading) {
              e.currentTarget.style.background = "#e5e7eb";
            }
          }}
          onMouseLeave={(e) => {
            if (!isAttending && !isLoading) {
              e.currentTarget.style.background = "#f3f4f6";
            }
          }}
        >
          <Users size={14} />
          {isAttending ? "참석함" : "참석"}
        </button>

        <button
          onClick={handleDecline}
          disabled={isLoading || isDeclined}
          style={{
            flex: 1,
            padding: "8px 16px",
            borderRadius: 8,
            border: "none",
            background: isDeclined ? "#ef4444" : "#f3f4f6",
            color: isDeclined ? "#fff" : "#374151",
            fontSize: 13,
            fontWeight: 500,
            cursor: isLoading || isDeclined ? "not-allowed" : "pointer",
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
          }}
          onMouseEnter={(e) => {
            if (!isDeclined && !isLoading) {
              e.currentTarget.style.background = "#e5e7eb";
            }
          }}
          onMouseLeave={(e) => {
            if (!isDeclined && !isLoading) {
              e.currentTarget.style.background = "#f3f4f6";
            }
          }}
        >
          <X size={14} />
          {isDeclined ? "불참함" : "불참"}
        </button>
      </div>

      {/* 참석자 수 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          fontSize: 12,
          color: "#6b7280",
        }}
      >
        <Users size={12} />
        <span>
          참석 {attendees.length}명
          {declined.length > 0 && ` · 불참 ${declined.length}명`}
        </span>
      </div>
    </div>
  );
}
