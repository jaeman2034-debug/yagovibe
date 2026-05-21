// src/pages/academy/AcademyDashboard.tsx
// 🔥 Phase A: 아카데미 관리 대시보드 (핵심 화면)

import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Paywall from "@/components/Paywall";

interface Academy {
  id: string;
  name: string;
  sportType: string;
  ownerUid: string;
  plan: "free" | "pro";
}

interface Member {
  id: string;
  name: string;
  age?: number;
  parentName?: string;
  parentPhone?: string;
  classId?: string;
  status: "active" | "paused";
}

type ViewMode = "dashboard" | "members" | "fees" | "schedule" | "attendance" | "notice";

const ACADEMY_PRO_PRICE = 129000;

export default function AcademyDashboard() {
  const { academyId } = useParams<{ academyId: string }>();
  const [academy, setAcademy] = useState<Academy | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("dashboard");
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallTrigger, setPaywallTrigger] = useState<
    "unpaid_notification" | "payment_link" | "attendance_stats" | "multiple_admins" | undefined
  >(undefined);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // 🔥 더미 회원 데이터
  const dummyMembers: Member[] = [
    { id: "1", name: "김민수", age: 8, classId: "A", status: "active" },
    { id: "2", name: "이서연", age: 9, classId: "B", status: "active" },
    { id: "3", name: "박준호", age: 8, classId: "A", status: "active" },
    { id: "4", name: "최지우", age: 9, classId: "B", status: "paused" },
  ];

  // 🔥 아카데미 정보 조회
  useEffect(() => {
    if (!academyId) return;

    const fetchAcademy = async () => {
      try {
        const academyRef = doc(db, "academies", academyId);
        const academySnap = await getDoc(academyRef);

        if (academySnap.exists()) {
          const academyData = academySnap.data();
          setAcademy({
            id: academySnap.id,
            name: academyData.name || "",
            sportType: academyData.sportType || "football",
            ownerUid: academyData.ownerUid || "",
            plan: (academyData.plan as "free" | "pro") || "free",
          });

          // 🔥 회원 목록 조회
          const membersQuery = query(
            collection(db, "academy_members"),
            where("academyId", "==", academyId)
          );
          const membersSnapshot = await getDocs(membersQuery);
          const membersList: Member[] = [];
          membersSnapshot.forEach((doc) => {
            const data = doc.data();
            membersList.push({
              id: doc.id,
              name: data.name || "이름 없음",
              age: data.age,
              parentName: data.parentName,
              parentPhone: data.parentPhone,
              classId: data.classId,
              status: (data.status as "active" | "paused") || "active",
            });
          });
          setMembers(membersList.length > 0 ? membersList : dummyMembers);
        }
      } catch (error) {
        console.error("아카데미 정보 조회 실패:", error);
        // 🔥 더미 데이터 사용
        setAcademy({
          id: academyId,
          name: "YAGO 축구 아카데미",
          sportType: "football",
          ownerUid: "",
          plan: "free",
        });
        setMembers(dummyMembers);
      } finally {
        setLoading(false);
      }
    };

    fetchAcademy();
  }, [academyId]);

  // 🔥 Pro 기능 잠금
  const handleProFeature = (trigger: typeof paywallTrigger) => {
    if (academy?.plan === "free") {
      setPaywallTrigger(trigger);
      setPaywallOpen(true);
    } else {
      setToastMessage("준비중입니다");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!academy) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">아카데미 정보를 찾을 수 없습니다.</p>
      </div>
    );
  }

  // 🔥 수강료 / 회계 탭
  if (viewMode === "fees") {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-6 max-w-2xl">
          <div className="mb-6">
            <button
              onClick={() => setViewMode("dashboard")}
              className="text-blue-600 hover:text-blue-700 mb-4"
            >
              ← 뒤로
            </button>
            <h1 className="text-2xl font-bold text-gray-900">💳 수강료 / 회계</h1>
          </div>

          {/* 수강료 정보 */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">이번 달 수강료</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">금액</span>
                <span className="font-bold text-gray-900">120,000원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">납부 완료</span>
                <span className="font-semibold text-green-600">28명</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">미납</span>
                <span className="font-semibold text-red-600">3명</span>
              </div>
            </div>
          </div>

          {/* Pro 기능 버튼 */}
          <div className="space-y-3">
            <button
              onClick={() => handleProFeature("payment_link")}
              className="w-full bg-white rounded-lg shadow-md p-4 text-left hover:shadow-lg transition-shadow border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">수강료 청구</h3>
                  <p className="text-sm text-gray-500 mt-1">자동 청구 링크 생성</p>
                </div>
                <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-xs font-medium">
                  Pro
                </span>
              </div>
            </button>

            <button
              onClick={() => handleProFeature("unpaid_notification")}
              className="w-full bg-white rounded-lg shadow-md p-4 text-left hover:shadow-lg transition-shadow border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">미납 알림</h3>
                  <p className="text-sm text-gray-500 mt-1">미납 학부모에게 자동 알림</p>
                </div>
                <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-xs font-medium">
                  Pro
                </span>
              </div>
            </button>
          </div>
        </div>

        <Paywall
          isOpen={paywallOpen}
          onClose={() => setPaywallOpen(false)}
          trigger={paywallTrigger}
          plan="ACADEMY_PRO"
          price={ACADEMY_PRO_PRICE}
        />

        {showToast && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-6 py-3 rounded-lg shadow-lg z-50">
            {toastMessage}
          </div>
        )}
      </div>
    );
  }

  // 🔥 출결 관리
  if (viewMode === "attendance") {
    const attendanceData = [
      { name: "김민수", checked: true },
      { name: "이서연", checked: false },
      { name: "박준호", checked: true },
    ];

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-6 max-w-2xl">
          <div className="mb-6">
            <button
              onClick={() => setViewMode("dashboard")}
              className="text-blue-600 hover:text-blue-700 mb-4"
            >
              ← 뒤로
            </button>
            <h1 className="text-2xl font-bold text-gray-900">📊 출결 관리</h1>
            <p className="text-gray-600 mt-2">출석 체크 (7/22)</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="space-y-3">
              {attendanceData.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                >
                  <span className="font-medium text-gray-900">{item.name}</span>
                  <span className="text-2xl">{item.checked ? "⭕" : "❌"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 🔥 회원 관리 화면
  if (viewMode === "members") {
    const activeMembers = members.filter((m) => m.status === "active");
    const pausedMembers = members.filter((m) => m.status === "paused");

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-6 max-w-2xl">
          <div className="mb-6">
            <button
              onClick={() => setViewMode("dashboard")}
              className="text-blue-600 hover:text-blue-700 mb-4"
            >
              ← 뒤로
            </button>
            <h1 className="text-2xl font-bold text-gray-900">{academy.name} 회원</h1>
          </div>

          {/* 재원 회원 */}
          {activeMembers.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-4">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">재원 회원</h2>
              <div className="space-y-2">
                {activeMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {member.name} {member.age && `(${member.age}세)`}
                        {member.classId && ` / ${member.classId}반`}
                      </p>
                      {member.parentName && (
                        <p className="text-sm text-gray-500">보호자: {member.parentName}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 휴원 회원 */}
          {pausedMembers.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-4">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">휴원 회원</h2>
              <div className="space-y-2">
                {pausedMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg opacity-60"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {member.name} {member.age && `(${member.age}세)`}
                        {member.classId && ` / ${member.classId}반`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 🔥 일정 탭
  if (viewMode === "schedule") {
    const schedules = [
      { date: "7/22", day: "월", event: "A반 수업" },
      { date: "7/24", day: "수", event: "B반 수업" },
    ];

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-6 max-w-2xl">
          <div className="mb-6">
            <button
              onClick={() => setViewMode("dashboard")}
              className="text-blue-600 hover:text-blue-700 mb-4"
            >
              ← 뒤로
            </button>
            <h1 className="text-2xl font-bold text-gray-900">📅 수업 일정</h1>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="space-y-3">
              {schedules.map((schedule, index) => (
                <div
                  key={index}
                  className="flex items-center p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">
                      {schedule.date} ({schedule.day}) {schedule.event}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 🔥 메인 대시보드
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* 상단 요약 카드 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{academy.name}</h1>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">회원</p>
              <p className="text-xl font-bold text-gray-900">
                {members.filter((m) => m.status === "active").length}명
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">이번 달 수강료</p>
              <p className="text-xl font-bold text-gray-900">미납 3명</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">다음 수업</p>
              <p className="text-xl font-bold text-gray-900">7/22 (월)</p>
            </div>
          </div>
        </div>

        {/* 관리 액션 */}
        <div className="space-y-3">
          {/* 👦 회원 관리 */}
          <button
            onClick={() => setViewMode("members")}
            className="w-full bg-white rounded-lg shadow-md p-4 text-left hover:shadow-lg transition-shadow border border-gray-200"
          >
            <div className="flex items-center">
              <span className="text-2xl mr-3">👦</span>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">회원 관리</h3>
                <p className="text-sm text-gray-500 mt-1">회원 정보 및 반 관리</p>
              </div>
            </div>
          </button>

          {/* 💳 수강료 / 회계 (Pro) */}
          <button
            onClick={() => setViewMode("fees")}
            className="w-full bg-white rounded-lg shadow-md p-4 text-left hover:shadow-lg transition-shadow border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-2xl mr-3">💳</span>
                <div>
                  <h3 className="font-semibold text-gray-900">수강료 / 회계</h3>
                  <p className="text-sm text-gray-500 mt-1">수강료 수납 및 관리</p>
                  {academy.plan === "free" && (
                    <p className="text-xs text-blue-600 mt-1">아카데미 운영을 자동화하세요</p>
                  )}
                </div>
              </div>
              <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-xs font-medium">
                Pro
              </span>
            </div>
          </button>

          {/* 📅 수업 일정 */}
          <button
            onClick={() => setViewMode("schedule")}
            className="w-full bg-white rounded-lg shadow-md p-4 text-left hover:shadow-lg transition-shadow border border-gray-200"
          >
            <div className="flex items-center">
              <span className="text-2xl mr-3">📅</span>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">수업 일정</h3>
                <p className="text-sm text-gray-500 mt-1">수업 일정 관리</p>
              </div>
            </div>
          </button>

          {/* 📊 출결 관리 */}
          <button
            onClick={() => setViewMode("attendance")}
            className="w-full bg-white rounded-lg shadow-md p-4 text-left hover:shadow-lg transition-shadow border border-gray-200"
          >
            <div className="flex items-center">
              <span className="text-2xl mr-3">📊</span>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">출결 관리</h3>
                <p className="text-sm text-gray-500 mt-1">회원 출석 체크</p>
              </div>
            </div>
          </button>

          {/* 📢 공지 / 알림 (Pro) */}
          <button
            onClick={() => handleProFeature("unpaid_notification")}
            className="w-full bg-white rounded-lg shadow-md p-4 text-left hover:shadow-lg transition-shadow border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-2xl mr-3">📢</span>
                <div>
                  <h3 className="font-semibold text-gray-900">공지 / 알림</h3>
                  <p className="text-sm text-gray-500 mt-1">학부모 공지 및 알림</p>
                  {academy.plan === "free" && (
                    <p className="text-xs text-blue-600 mt-1">아카데미 운영을 자동화하세요</p>
                  )}
                </div>
              </div>
              <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-xs font-medium">
                Pro
              </span>
            </div>
          </button>

          {/* 🌐 소개 페이지 */}
          <button
            onClick={() => {
              setToastMessage("소개 페이지 준비중");
              setShowToast(true);
              setTimeout(() => setShowToast(false), 2000);
            }}
            className="w-full bg-white rounded-lg shadow-md p-4 text-left hover:shadow-lg transition-shadow border border-gray-200"
          >
            <div className="flex items-center">
              <span className="text-2xl mr-3">🌐</span>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">소개 페이지</h3>
                <p className="text-sm text-gray-500 mt-1">아카데미 홍보 페이지</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Paywall 모달 */}
      <Paywall
        isOpen={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        trigger={paywallTrigger}
        plan="ACADEMY_PRO"
        price={ACADEMY_PRO_PRICE}
      />

      {/* 토스트 */}
      {showToast && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {toastMessage}
        </div>
      )}
    </div>
  );
}

