/**
 * 🔥 일정 생성 페이지 (코치 핵심 화면)
 * 
 * 역할:
 * - 팀 일정 생성 (훈련/경기)
 * - 지도 연동 장소 선택
 * - 즉시 반영 UX
 * 
 * 라우팅:
 * - /activity/schedule/create?type=training
 * - /activity/schedule/create?type=match
 */

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import { useMyTeams } from "@/hooks/useMyTeams";
import { createSchedule } from "@/services/scheduleService";
import MapPickerModal from "@/components/schedule/MapPickerModal";
import { ArrowLeft, Calendar, Clock, MapPin, FileText, Save } from "lucide-react";

type ScheduleType = "training" | "match";

interface ScheduleFormData {
  teamId: string;
  type: ScheduleType;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  locationName: string;
  locationLat?: number;
  locationLng?: number;
  memo?: string;
}

export default function ScheduleCreatePage() {
  // 🔥 디버그: ActivityCreate 페이지 마운트 확인 (쿼리 실행 금지 확인)
  useEffect(() => {
    console.log("✅ [ScheduleCreatePage] ActivityCreate mounted - 쿼리 실행 없음");
    console.log("✅ [ScheduleCreatePage] 이 페이지는 폼 전용 페이지입니다. ActivityFeed 쿼리가 실행되지 않습니다.");
  }, []);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { teamIds, loading: teamsLoading } = useMyTeams(); // 🔥 teamIds만 사용
  
  const [loading, setLoading] = useState(false);
  const [teamNames, setTeamNames] = useState<Record<string, string>>({});
  const [showMapPicker, setShowMapPicker] = useState(false);
  
  // 🔥 URL 파라미터에서 타입 가져오기
  const urlType = searchParams.get("type");
  const initialType: ScheduleType = urlType === "match" ? "match" : "training";
  
  const [formData, setFormData] = useState<ScheduleFormData>({
    teamId: "",
    type: initialType,
    title: "",
    date: new Date().toISOString().split("T")[0],
    startTime: "19:00",
    endTime: "21:00",
    locationName: "",
    memo: "",
  });

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
      
      // 🔥 첫 번째 팀 자동 선택
      if (!formData.teamId && teamIds.length > 0) {
        setFormData((prev) => ({ ...prev, teamId: teamIds[0] }));
      }
    };

    void fetchTeamNames();
  }, [teamIds]);

  // 🔥 URL 타입 변경 시 폼 업데이트
  useEffect(() => {
    if (urlType === "match" || urlType === "training") {
      setFormData((prev) => ({ ...prev, type: urlType }));
    }
  }, [urlType]);

  // 🔥 종료 시간 자동 계산 (시작 시간 변경 시)
  useEffect(() => {
    if (formData.startTime && !formData.endTime) {
      const [hours, minutes] = formData.startTime.split(":").map(Number);
      const endDate = new Date();
      endDate.setHours(hours + 2, minutes);
      const endTimeStr = `${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}`;
      setFormData((prev) => ({ ...prev, endTime: endTimeStr }));
    }
  }, [formData.startTime]);

  // 🔥 지도에서 장소 선택 (모달 방식)
  const handleSelectFromMap = () => {
    setShowMapPicker(true);
  };

  // 🔥 지도에서 선택한 위치를 폼에 입력
  const handleMapSelect = (lat: number, lng: number, name: string) => {
    setFormData({
      ...formData,
      locationName: name,
      locationLat: lat,
      locationLng: lng,
    });
    setShowMapPicker(false);
  };

  // 🔥 폼 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.uid) {
      alert("로그인이 필요합니다");
      return;
    }

    if (!formData.teamId) {
      alert("팀을 선택해주세요");
      return;
    }

    if (!formData.title.trim()) {
      alert("제목을 입력해주세요");
      return;
    }

    if (!formData.locationName.trim()) {
      alert("장소를 입력해주세요");
      return;
    }

    setLoading(true);
    try {
      // 🔥 teamId 검증 및 디버깅
      console.log("🔍 [ScheduleCreatePage] 일정 생성 시작:", {
        teamId: formData.teamId,
        teamIds: teamIds,
        teamIdValid: teamIds?.includes(formData.teamId),
        formData: formData
      });

      if (!teamIds || !teamIds.includes(formData.teamId)) {
        alert(`올바른 팀을 선택해주세요. 선택된 teamId: ${formData.teamId}`);
        setLoading(false);
        return;
      }

      // 🔥 일정 서비스를 통한 저장
      const scheduleId = await createSchedule({
        teamId: formData.teamId, // 🔥 teams 컬렉션의 문서 ID
        creatorUid: user.uid,
        type: formData.type,
        title: formData.title,
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        locationName: formData.locationName,
        locationLat: formData.locationLat,
        locationLng: formData.locationLng,
        memo: formData.memo,
      });

      console.log("✅ [ScheduleCreatePage] 일정 생성 성공:", {
        scheduleId,
        teamId: formData.teamId
      });

      alert("일정이 생성되었습니다");
      navigate("/activity/events");
    } catch (error: any) {
      console.error("❌ [ScheduleCreatePage] 일정 생성 실패:", error);
      alert(error.message || "일정 생성에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  if (teamsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!teamIds || teamIds.length === 0) {
    return (
      <div className="min-h-[70vh] bg-gray-50 flex flex-col items-center justify-center px-4 py-24">
        <div className="w-full max-w-none md:max-w-3xl bg-white rounded-2xl shadow-lg p-6 text-center">
          <div className="text-6xl mb-4">👥</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">팀이 없어요</h2>
          <p className="text-gray-600 mb-6">
            일정을 만들려면 먼저 팀을 만들어야 합니다
          </p>
          <button
            onClick={() => navigate("/activity/team")}
            className="w-full max-w-[280px] mx-auto px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            팀 만들기
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
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <h1 className="text-xl font-semibold text-gray-900">일정 만들기</h1>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* 1. 팀 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            팀 선택 <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.teamId}
            onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            <option value="">팀을 선택하세요</option>
            {teamIds.map((teamId) => (
              <option key={teamId} value={teamId}>
                {teamNames[teamId] || `팀 ${teamId}`}
              </option>
            ))}
          </select>
        </div>

        {/* 2. 일정 타입 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            일정 유형 <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: "training" })}
              className={`px-4 py-3 rounded-lg border-2 transition-all ${
                formData.type === "training"
                  ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="text-2xl mb-1">🏃</div>
              <div className="text-sm font-medium">훈련</div>
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: "match" })}
              className={`px-4 py-3 rounded-lg border-2 transition-all ${
                formData.type === "match"
                  ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="text-2xl mb-1">⚽</div>
              <div className="text-sm font-medium">경기</div>
            </button>
          </div>
        </div>

        {/* 3. 제목 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            제목 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={formData.type === "training" ? "예: 정기 훈련" : "예: 친선 경기"}
            required
          />
        </div>

        {/* 4. 날짜 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            날짜 <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            min={new Date().toISOString().split("T")[0]}
            required
          />
        </div>

        {/* 5. 시간 (시작/종료) */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="w-4 h-4 inline mr-1" />
              시작 시간 <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="w-4 h-4 inline mr-1" />
              종료 시간 <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
        </div>

        {/* 6. 장소 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <MapPin className="w-4 h-4 inline mr-1" />
            장소 <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.locationName}
                onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="장소 이름을 입력하거나 지도에서 선택하세요"
                required
              />
              <button
                type="button"
                onClick={handleSelectFromMap}
                className="px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors whitespace-nowrap flex items-center gap-2"
              >
                <MapPin className="w-4 h-4" />
                지도에서 선택
              </button>
            </div>
            {formData.locationLat && formData.locationLng && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                위치 정보가 저장됩니다
              </p>
            )}
          </div>
        </div>

        {/* 7. 메모 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <FileText className="w-4 h-4 inline mr-1" />
            메모 (선택)
          </label>
          <textarea
            value={formData.memo || ""}
            onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={4}
            placeholder="준비물, 코치 메시지, 유니폼 색 등..."
          />
        </div>

        {/* 8. 저장 버튼 */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>생성 중...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>일정 생성</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* 지도 선택 모달 */}
      {showMapPicker && (
        <MapPickerModal
          onSelect={handleMapSelect}
          onClose={() => setShowMapPicker(false)}
        />
      )}
    </div>
  );
}
