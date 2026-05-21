// src/pages/team/TeamAttendancePage.tsx
// 🔥 레벨 2: 출석 → 회비/징계 자동 연동

import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTeam } from "@/context/TeamContext";
import { useAuth } from "@/context/AuthProvider";
import SeniorModeToggle from "@/components/SeniorModeToggle";
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, updateDoc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface AttendanceRecord {
  id: string;
  memberId: string;
  memberName: string;
  date: string; // YYYY-MM-DD
  status: "present" | "absent" | "excused";
  recordedAt: Date;
}

interface AttendanceSummary {
  present: number;
  absent: number;
  excused: number;
}

// 🔥 출석 → 패널티 자동 규칙
function calculatePenaltyFromAttendance(summary: AttendanceSummary): number {
  // 정관 기준: 무단 결석 2회 이상 → 패널티 1점
  if (summary.absent >= 2) {
    return 1;
  }
  return 0;
}

// 🔥 출석 요약 엔진
function summarizeAttendance(records: AttendanceRecord[]): AttendanceSummary {
  return {
    present: records.filter((r) => r.status === "present").length,
    absent: records.filter((r) => r.status === "absent").length,
    excused: records.filter((r) => r.status === "excused").length,
  };
}

export default function TeamAttendancePage() {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const { myTeam, seniorMode } = useTeam();
  const { user } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendanceRecords, setAttendanceRecords] = useState<{ [memberId: string]: "present" | "absent" | "excused" }>({});
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // 🔥 회원 목록 조회
  useEffect(() => {
    if (!myTeam?.id) return;

    const fetchMembers = async () => {
      try {
        const membersQuery = query(
          collection(db, "teams", myTeam.id, "members"),
          where("status", "!=", "expelled")
        );
        const snapshot = await getDocs(membersQuery);
        const membersList: any[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          membersList.push({
            id: doc.id,
            name: data.name || "",
            role: data.role || "일반",
          });
        });
        setMembers(membersList);
      } catch (error) {
        console.error("회원 목록 조회 실패:", error);
      }
    };

    fetchMembers();
  }, [myTeam?.id]);

  // 🔥 출석 기록 저장 및 자동 연동
  const handleSaveAttendance = async () => {
    if (!myTeam?.id || !user?.uid) return;

    setLoading(true);
    try {
      const records: AttendanceRecord[] = [];
      
      // 🔥 출석 기록 저장 (새 구조: attendance/{yyyymmdd}/items/{memberId})
      const [year, month, day] = attendanceDate.split("-").map(Number);
      const yyyymmdd = attendanceDate;
      
      for (const [memberId, status] of Object.entries(attendanceRecords)) {
        if (!status) continue;
        
        const itemRef = doc(
          db,
          "teams",
          myTeam.id,
          "attendance",
          yyyymmdd,
          "items",
          memberId
        );
        
        await setDoc(itemRef, {
          memberId,
          status,
          recordedAt: serverTimestamp(),
          recordedBy: user.uid,
        }, { merge: true });
        
        const member = members.find((m) => m.id === memberId);
        records.push({
          id: memberId,
          memberId,
          memberName: member?.name || "",
          date: attendanceDate,
          status: status as "present" | "absent" | "excused",
          recordedAt: new Date(),
        });
      }

      // 🔥 월별 출석 요약 및 패널티 자동 연동
      const currentMonth = new Date(attendanceDate).getMonth() + 1;
      const currentYear = new Date(attendanceDate).getFullYear();
      
      for (const member of members) {
        // 해당 월의 출석 기록 조회
        const monthStart = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
        const monthEnd = `${currentYear}-${String(currentMonth).padStart(2, "0")}-31`;
        
        const monthRecordsQuery = query(
          collection(db, "teams", myTeam.id, "attendance"),
          where("memberId", "==", member.id),
          where("date", ">=", monthStart),
          where("date", "<=", monthEnd)
        );
        const monthSnapshot = await getDocs(monthRecordsQuery);
        const monthRecords: AttendanceRecord[] = [];
        monthSnapshot.forEach((doc) => {
          const data = doc.data();
          monthRecords.push({
            id: doc.id,
            memberId: member.id,
            memberName: member.name,
            date: data.date,
            status: data.status as "present" | "absent" | "excused",
            recordedAt: data.recordedAt?.toDate() || new Date(),
          });
        });

        // 출석 요약
        const summary = summarizeAttendance(monthRecords);
        
        // 패널티 계산
        const penaltyPoints = calculatePenaltyFromAttendance(summary);
        
        if (penaltyPoints > 0) {
          // 🔥 패널티 자동 적용
          const memberRef = doc(db, "teams", myTeam.id, "members", member.id);
          const currentData = (await getDocs(query(collection(db, "teams", myTeam.id, "members"), where("__name__", "==", member.id)))).docs[0]?.data();
          const currentPenalty = currentData?.penaltyPoints || 0;
          
          await updateDoc(memberRef, {
            penaltyPoints: currentPenalty + penaltyPoints,
          });

          // 🔥 자동 상태 변경: 무단 결석 4회 이상 → 휴원
          if (summary.absent >= 4) {
            await updateDoc(memberRef, {
              status: "paused",
            });
          }

          // 🔥 감사 로그 기록
          await addDoc(collection(db, "teams", myTeam.id, "auditLogs"), {
            actorId: user.uid,
            action: "ATTENDANCE_PENALTY",
            targetMemberId: member.id,
            before: { penaltyPoints: currentPenalty },
            after: { penaltyPoints: currentPenalty + penaltyPoints },
            reason: `무단 결석 ${summary.absent}회`,
            createdAt: serverTimestamp(),
          });
        }
      }

      setToastMessage("출석 기록이 저장되었습니다");
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        navigate(`/sports/${type}/team`);
      }, 2000);
    } catch (error) {
      console.error("출석 기록 실패:", error);
      alert("출석 기록에 실패했습니다.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className={`w-full py-6 md:mx-auto ${seniorMode ? "md:max-w-3xl" : "md:max-w-2xl"}`}>
        <div className="mb-6">
          <button
            onClick={() => navigate(`/sports/${type}/team`)}
            className={`text-blue-600 hover:text-blue-700 mb-4 ${seniorMode ? "text-2xl font-bold" : ""}`}
          >
            ← 뒤로
          </button>
          <h1 className={`${seniorMode ? "text-4xl" : "text-2xl"} font-bold text-gray-900`}>출석 체크</h1>
        </div>

        {/* 날짜 선택 */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            날짜
          </label>
          <input
            type="date"
            value={attendanceDate}
            onChange={(e) => setAttendanceDate(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        {/* 출석 체크 리스트 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className={`${seniorMode ? "text-3xl" : "text-lg"} font-semibold text-gray-700 mb-4`}>회원 출석</h2>
          <div className={`space-y-${seniorMode ? "4" : "3"}`}>
            {members.map((member) => (
              <div
                key={member.id}
                className={`flex ${seniorMode ? "flex-col" : "items-center justify-between"} ${seniorMode ? "p-6" : "p-3"} border-2 ${seniorMode ? "border-gray-400" : "border-gray-200"} rounded-lg ${seniorMode ? "bg-gray-50" : ""}`}
              >
                <span className={`${seniorMode ? "text-3xl mb-4" : "text-lg"} font-bold text-gray-900`}>{member.name}</span>
                <div className={`flex ${seniorMode ? "flex-col w-full gap-3" : "gap-2"}`}>
                  <button
                    onClick={() => setAttendanceRecords({ ...attendanceRecords, [member.id]: "present" })}
                    className={`${seniorMode ? "w-full py-6 text-2xl font-bold" : "px-4 py-2 text-sm"} rounded-lg ${
                      attendanceRecords[member.id] === "present"
                        ? "bg-green-600 text-white border-4 border-green-800"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-gray-300"
                    }`}
                  >
                    ✅ 출석
                  </button>
                  <button
                    onClick={() => setAttendanceRecords({ ...attendanceRecords, [member.id]: "absent" })}
                    className={`${seniorMode ? "w-full py-6 text-2xl font-bold" : "px-4 py-2 text-sm"} rounded-lg ${
                      attendanceRecords[member.id] === "absent"
                        ? "bg-red-600 text-white border-4 border-red-800"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-gray-300"
                    }`}
                  >
                    ❌ 결석
                  </button>
                  <button
                    onClick={() => setAttendanceRecords({ ...attendanceRecords, [member.id]: "excused" })}
                    className={`${seniorMode ? "w-full py-6 text-2xl font-bold" : "px-4 py-2 text-sm"} rounded-lg ${
                      attendanceRecords[member.id] === "excused"
                        ? "bg-yellow-600 text-white border-4 border-yellow-800"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-gray-300"
                    }`}
                  >
                    📝 사유 있음
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleSaveAttendance}
          disabled={loading || Object.keys(attendanceRecords).length === 0}
          className={`w-full ${seniorMode ? "py-8" : "py-4"} bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold ${seniorMode ? "text-3xl" : "text-lg"} border-4 border-blue-800`}
        >
          {loading ? "저장 중..." : "출석 기록 저장"}
        </button>
      </div>

      {/* 토스트 */}
      {showToast && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {toastMessage}
        </div>
      )}
    </div>
  );
}

