// src/pages/team/TeamNotificationSettingsPage.tsx
// 🔥 알림 설정 페이지 (notifyPolicy 편집)

import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTeam } from "@/context/TeamContext";
import { useAuth } from "@/context/AuthProvider";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { updateTeamDocument } from "@/lib/team/updateTeamDocument";
import { type NotifyPolicy } from "@/utils/notificationService";

export default function TeamNotificationSettingsPage() {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const { myTeam, role } = useTeam();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  
  const [policy, setPolicy] = useState<NotifyPolicy>({
    channel: "kakao",
    unpaidWarningAtMonths: [1, 2],
    sendDayOfMonth: 25,
    quietHours: { from: "21:00", to: "09:00" },
    adminRecipients: ["회장", "총무"],
    testMode: true, // 🔥 기본값: 테스트 모드 (안전)
  });

  // 회장/총무만 접근 가능
  useEffect(() => {
    if (role !== "회장" && role !== "총무" && role !== "admin") {
      navigate(`/sports/${type}/team`);
    }
  }, [role, navigate, type]);

  // 정책 조회
  useEffect(() => {
    if (!myTeam?.id) return;

    const fetchPolicy = async () => {
      setLoading(true);
      try {
        const teamRef = doc(db, "teams", myTeam.id);
        const teamSnap = await getDoc(teamRef);
        const teamData = teamSnap.data();
        
        if (teamData?.notifyPolicy) {
          setPolicy(teamData.notifyPolicy);
        }
      } catch (error) {
        console.error("알림 정책 조회 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPolicy();
  }, [myTeam?.id]);

  // 정책 저장
  const handleSave = async () => {
    if (!myTeam?.id || !user?.uid) return;

    setSaving(true);
    try {
      await updateTeamDocument(myTeam.id, {
        notifyPolicy: policy,
      });

      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch (error) {
      console.error("알림 정책 저장 실패:", error);
      alert("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  // 미납 경고 개월 체크박스 토글
  const toggleWarningMonth = (month: number) => {
    setPolicy((prev) => {
      const months = prev.unpaidWarningAtMonths || [];
      if (months.includes(month)) {
        return { ...prev, unpaidWarningAtMonths: months.filter((m) => m !== month) };
      } else {
        return { ...prev, unpaidWarningAtMonths: [...months, month].sort() };
      }
    });
  };

  // 임원 수신자 체크박스 토글
  const toggleAdminRecipient = (role: string) => {
    setPolicy((prev) => {
      const recipients = prev.adminRecipients || [];
      if (recipients.includes(role)) {
        return { ...prev, adminRecipients: recipients.filter((r) => r !== role) };
      } else {
        return { ...prev, adminRecipients: [...recipients, role] };
      }
    });
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-none md:mx-auto md:max-w-4xl py-6">
        <div className="mb-6">
          <button
            onClick={() => navigate(`/sports/${type}/team`)}
            className="text-blue-600 hover:text-blue-700 mb-4"
          >
            ← 뒤로
          </button>
          <h1 className="text-2xl font-bold text-gray-900">알림 설정</h1>
          <p className="text-sm text-gray-500 mt-1">
            자동 알림 발송 정책을 설정합니다.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          {/* 테스트 모드 */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={policy.testMode !== false}
                onChange={(e) => setPolicy({ ...policy, testMode: e.target.checked })}
                className="mr-2"
              />
              <div>
                <span className="font-medium text-gray-900">테스트 모드 (안전)</span>
                <p className="text-xs text-gray-600 mt-1">
                  체크 시 실제 발송 없이 미리보기만 기록됩니다. 실수·중복 발송을 원천 차단합니다.
                </p>
              </div>
            </label>
          </div>

          {/* 발송 채널 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              발송 채널
            </label>
            <select
              value={policy.channel}
              onChange={(e) => setPolicy({ ...policy, channel: e.target.value as NotifyPolicy["channel"] })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={policy.testMode !== false}
            >
              <option value="kakao">카카오 알림톡</option>
              <option value="sms">문자 메시지</option>
              <option value="push">앱 푸시</option>
              <option value="none">알림 비활성화</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {policy.testMode !== false && "⚠️ 테스트 모드에서는 실제 발송되지 않습니다."}
              {policy.testMode === false && policy.channel === "kakao" && "카카오 알림톡으로 발송됩니다."}
              {policy.testMode === false && policy.channel === "sms" && "SMS로 발송됩니다. (추가 비용 발생)"}
              {policy.testMode === false && policy.channel === "push" && "앱 푸시 알림으로 발송됩니다."}
              {policy.channel === "none" && "알림이 발송되지 않습니다."}
            </p>
          </div>

          {/* 미납 경고 개월 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              미납 경고 발송 시점
            </label>
            <div className="flex gap-4">
              {[1, 2, 3].map((month) => (
                <label key={month} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={policy.unpaidWarningAtMonths.includes(month)}
                    onChange={() => toggleWarningMonth(month)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">{month}개월</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              선택한 개월 수에 도달하면 자동으로 경고 알림이 발송됩니다.
            </p>
          </div>

          {/* 발송일 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              월별 발송일
            </label>
            <input
              type="number"
              min="1"
              max="31"
              value={policy.sendDayOfMonth}
              onChange={(e) => setPolicy({ ...policy, sendDayOfMonth: parseInt(e.target.value) || 25 })}
              className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              매월 {policy.sendDayOfMonth}일에 미납 경고 알림이 발송됩니다.
            </p>
          </div>

          {/* 조용 시간 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              조용 시간 (알림 발송 금지)
            </label>
            <div className="flex items-center gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">시작</label>
                <input
                  type="time"
                  value={policy.quietHours.from}
                  onChange={(e) => setPolicy({ ...policy, quietHours: { ...policy.quietHours, from: e.target.value } })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">종료</label>
                <input
                  type="time"
                  value={policy.quietHours.to}
                  onChange={(e) => setPolicy({ ...policy, quietHours: { ...policy.quietHours, to: e.target.value } })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              조용 시간 중에는 알림이 발송되지 않고, 다음 날 자동으로 발송됩니다.
            </p>
          </div>

          {/* 임원 수신자 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              월간 요약 수신자 (임원)
            </label>
            <div className="flex flex-wrap gap-4">
              {["회장", "부회장", "총무", "감독", "코치", "상벌위원장"].map((roleName) => (
                <label key={roleName} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={policy.adminRecipients.includes(roleName)}
                    onChange={() => toggleAdminRecipient(roleName)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">{roleName}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              선택한 역할의 임원에게 매월 정산 요약이 발송됩니다.
            </p>
          </div>

          {/* 저장 버튼 */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={() => navigate(`/sports/${type}/team`)}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      </div>

      {/* 토스트 */}
      {showToast && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          설정이 저장되었습니다.
        </div>
      )}
    </div>
  );
}

