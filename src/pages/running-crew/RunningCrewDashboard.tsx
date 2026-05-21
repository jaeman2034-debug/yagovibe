/**
 * 🏃 러닝 크루 대시보드
 * 
 * 크루장/크루원이 보는 화면
 * - 누가 "집에서 출발 중"
 * - 누가 "이미 도착"
 * - 누가 "오늘 패스"
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { doc, getDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { RunningCrew, RunningCrewSession } from "@/types/runningCrew";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Users, MapPin, Clock } from "lucide-react";

export default function RunningCrewDashboard() {
  const { crewId } = useParams<{ crewId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [crew, setCrew] = useState<RunningCrew | null>(null);
  const [currentSession, setCurrentSession] = useState<RunningCrewSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!crewId || !user) return;

    // 크루 정보 로드
    const loadCrew = async () => {
      try {
        const crewDoc = await getDoc(doc(db, "running_crews", crewId));
        if (!crewDoc.exists()) {
          if (!location.pathname.startsWith("/sports")) {
            console.log("🔥 NAVIGATE HOME TRIGGERED [RunningCrewDashboard:crew-not-found]", location.pathname);
          navigate("/home");
          }
          return;
        }

        const crewData = crewDoc.data() as RunningCrew;
        setCrew({
          ...crewData,
          id: crewDoc.id,
        });
      } catch (error) {
        console.error("❌ [RunningCrewDashboard] 크루 로드 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    loadCrew();

    // 오늘 세션 실시간 구독
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const sessionQuery = query(
      collection(db, "running_crews", crewId, "sessions"),
      where("scheduledAt", ">=", today),
      where("scheduledAt", "<", tomorrow)
    );

    const unsubscribe = onSnapshot(sessionQuery, (snapshot) => {
      if (!snapshot.empty) {
        const sessionDoc = snapshot.docs[0];
        setCurrentSession({
          id: sessionDoc.id,
          ...sessionDoc.data(),
        } as RunningCrewSession);
      } else {
        setCurrentSession(null);
      }
    });

    return () => unsubscribe();
  }, [crewId, user, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!crew) {
    return null;
  }

  const isCaptain = crew.captainId === user?.uid;
  const userAttendance = currentSession?.attendees.find((a) => a.userId === user?.uid);

  // 출석자 상태별 그룹화
  const departing = currentSession?.attendees.filter((a) => a.status === "departing") || [];
  const arrived = currentSession?.attendees.filter((a) => a.status === "arrived") || [];
  const absent = currentSession?.attendees.filter((a) => a.status === "absent") || [];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* 크루 헤더 */}
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{crew.name}</h1>
              {crew.description && (
                <p className="text-gray-600 text-sm">{crew.description}</p>
              )}
            </div>
            {isCaptain && (
              <Button variant="outline" size="sm">
                설정
              </Button>
            )}
          </div>

          <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              <span>{crew.meetingPoint.name}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              <span>{crew.members.length}명</span>
            </div>
          </div>
        </Card>

        {/* 오늘 모임 상태 */}
        {currentSession ? (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">오늘 모임</h2>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>
                  {new Date(currentSession.scheduledAt).toLocaleTimeString("ko-KR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>

            {/* 출석 상태 */}
            <div className="space-y-4">
              {/* 출발 중 */}
              {departing.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    출발 중 ({departing.length})
                  </p>
                  <div className="space-y-2">
                    {departing.map((attendee) => (
                      <div
                        key={attendee.userId}
                        className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg"
                      >
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                        <span className="text-sm text-gray-700">출발 중...</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 도착 */}
              {arrived.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    도착 ({arrived.length})
                  </p>
                  <div className="space-y-2">
                    {arrived.map((attendee) => (
                      <div
                        key={attendee.userId}
                        className="flex items-center gap-3 p-3 bg-green-50 rounded-lg"
                      >
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <span className="text-sm text-gray-700">도착 완료</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 불참 */}
              {absent.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    불참 ({absent.length})
                  </p>
                  <div className="space-y-2">
                    {absent.map((attendee) => (
                      <div
                        key={attendee.userId}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="w-2 h-2 bg-gray-400 rounded-full" />
                        <span className="text-sm text-gray-500">오늘 패스</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 내 출석 상태 */}
            {!userAttendance && (
              <div className="mt-6 pt-6 border-t">
                <Button
                  onClick={() => {
                    // 출발 시작
                    navigate("/general-map", {
                      state: {
                        autoStartNavigation: true,
                        destination: {
                          lat: crew.meetingPoint.lat,
                          lng: crew.meetingPoint.lng,
                          name: crew.meetingPoint.name,
                          type: "running_crew",
                          id: crew.id,
                        },
                        crewId: crew.id,
                        sessionId: currentSession.id,
                      },
                    });
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  나갈게
                </Button>
                <Button
                  onClick={() => {
                    // 불참 처리
                    // TODO: 불참 처리 로직
                  }}
                  variant="outline"
                  className="w-full mt-2"
                >
                  오늘은 패스
                </Button>
              </div>
            )}
          </Card>
        ) : (
          <Card className="p-6">
            <p className="text-center text-gray-600">오늘 예정된 모임이 없어요</p>
          </Card>
        )}
      </div>
    </div>
  );
}
