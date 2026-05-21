/**
 * 🔥 일정 생성 폼 컴포넌트
 * 
 * 권한: 운영자만 접근 가능
 */

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import { useTeam } from "@/context/TeamContext";
import { useMyTeams } from "@/hooks/useMyTeams";
import { canCreateSchedule } from "@/lib/schedules/permissions";
import { notifyScheduleCreated } from "@/lib/schedules/notificationHandler";
import type { ScheduleFormData, ScheduleType, Schedule } from "@/types/schedule";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Search, X, Calendar, Clock } from "lucide-react";

interface ScheduleCreateFormProps {
  teamId: string;
}

interface Venue {
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
}

export function ScheduleCreateForm({ teamId }: ScheduleCreateFormProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { myTeam, role } = useTeam();
  const { teams } = useMyTeams();
  const [loading, setLoading] = useState(false);
  const [showVenueSearch, setShowVenueSearch] = useState(false);
  const [venueSearchQuery, setVenueSearchQuery] = useState("");
  const [venueResults, setVenueResults] = useState<Venue[]>([]);
  const [venueSearching, setVenueSearching] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState(teamId);
  
  // 🔥 URL 파라미터에서 타입 가져오기
  const urlType = searchParams.get("type") as ScheduleType | null;
  const validTypes: ScheduleType[] = ["경기", "훈련", "친선"];
  const initialType = urlType && validTypes.includes(urlType) ? urlType : "훈련";
  
  const [formData, setFormData] = useState<ScheduleFormData>({
    type: initialType,
    title: "",
    dateTime: new Date(),
    place: "",
    isPublic: false,
    needsSubstitute: false,
  });

  // 🔥 URL 타입 변경 시 폼 데이터 업데이트
  useEffect(() => {
    if (urlType && validTypes.includes(urlType)) {
      setFormData((prev) => ({ ...prev, type: urlType }));
    }
  }, [urlType]);

  // 🔥 팀 목록이 있고 teamId가 없으면 첫 번째 팀 선택
  useEffect(() => {
    if (!selectedTeamId && teams.length > 0) {
      const firstTeam = teams[0];
      setSelectedTeamId(firstTeam.teamId || firstTeam.id || teamId);
    }
  }, [teams, selectedTeamId, teamId]);

  // 구장 검색
  const searchVenues = async (query: string) => {
    if (!query.trim()) {
      setVenueResults([]);
      return;
    }

    setVenueSearching(true);
    try {
      // Google Places API 검색 (간단한 구현)
      if (window.google?.maps?.places) {
        const service = new window.google.maps.places.PlacesService(
          document.createElement("div")
        );

        const request = {
          query: query + " 축구장 풋살장",
          fields: ["name", "formatted_address", "geometry"],
        };

        service.textSearch(request, (results, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
            const venues: Venue[] = results.slice(0, 5).map((place: any) => ({
              name: place.name || "",
              address: place.formatted_address || "",
              lat: place.geometry?.location?.lat(),
              lng: place.geometry?.location?.lng(),
            }));
            setVenueResults(venues);
          } else {
            setVenueResults([]);
          }
          setVenueSearching(false);
        });
      } else {
        // Google Maps API가 없으면 빈 결과
        setVenueResults([]);
        setVenueSearching(false);
      }
    } catch (error) {
      console.error("구장 검색 실패:", error);
      setVenueResults([]);
      setVenueSearching(false);
    }
  };

  // 구장 선택
  const selectVenue = (venue: Venue) => {
    setFormData({
      ...formData,
      place: venue.name + (venue.address ? ` (${venue.address})` : ""),
      placeCoordinates: venue.lat && venue.lng
        ? { lat: venue.lat, lng: venue.lng }
        : undefined,
    });
    setShowVenueSearch(false);
    setVenueSearchQuery("");
    setVenueResults([]);
  };

  // 권한 체크
  const canCreate = canCreateSchedule(
    user,
    myTeam ? { id: myTeam.id || teamId, ownerId: myTeam.ownerUid || "", admins: [] } : null,
    role ? { uid: user?.uid || "", role: role, accessLevel: role === "admin" ? "OWNER" : role === "manager" ? "ADMIN" : "MEMBER" } : null
  );

  if (!canCreate) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">일정을 생성할 권한이 없습니다</p>
        <Button onClick={() => navigate(-1)} variant="outline">
          뒤로 가기
        </Button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.title.trim() || !formData.place.trim()) {
      alert("제목과 장소를 입력해주세요");
      return;
    }

    const targetTeamId = selectedTeamId || teamId;
    if (!targetTeamId) {
      alert("팀을 선택해주세요");
      return;
    }

    setLoading(true);
    try {
      // 🔥 teamSchedules 컬렉션에 저장 (useTeamSchedules와 일치)
      const scheduleRef = await addDoc(collection(db, "teamSchedules"), {
        teamId: targetTeamId,
        type: formData.type,
        title: formData.title.trim(),
        dateTime: formData.dateTime,
        place: formData.place.trim(),
        placeCoordinates: formData.placeCoordinates,
        opponent: formData.opponent?.trim(),
        isPublic: formData.isPublic,
        needsSubstitute: formData.needsSubstitute,
        description: formData.description?.trim(),
        creatorUid: user.uid, // 🔥 Firestore Rules에서 체크하는 필드명
        creatorId: user.uid, // 🔥 호환성 유지
        createdAt: serverTimestamp(),
      });

      // 알림 트리거: 표준화된 핸들러 사용
      const createdSchedule: Schedule = {
        id: scheduleRef.id,
        teamId: targetTeamId,
        type: formData.type,
        title: formData.title.trim(),
        dateTime: formData.dateTime as any,
        place: formData.place.trim(),
        placeCoordinates: formData.placeCoordinates,
        opponent: formData.opponent?.trim(),
        isPublic: formData.isPublic,
        needsSubstitute: formData.needsSubstitute,
        description: formData.description?.trim(),
        creatorId: user.uid,
        createdAt: serverTimestamp() as any,
      };

      await notifyScheduleCreated(createdSchedule, targetTeamId, user.uid);

      // 성공 토스트 (간단한 alert로 대체, 나중에 토스트 라이브러리로 교체 가능)
      alert("일정이 등록됐어요");

      // 이벤트 페이지로 이동 (일정 통합 페이지)
      navigate("/activity/events");
    } catch (error) {
      console.error("일정 생성 실패:", error);
      alert("일정 생성에 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h2 className="text-lg font-semibold text-gray-900">일정 만들기</h2>
      </div>

      {/* 폼 */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 팀 선택 (여러 팀이 있을 때만) */}
        {teams.length > 1 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              팀 선택 <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedTeamId || ""}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              {teams.map((team) => {
                const tId = team.teamId || team.id;
                const tName = team.name || `팀 ${tId}`;
                return (
                  <option key={tId} value={tId}>
                    {tName}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {/* 유형 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            일정 유형 <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(["훈련", "경기", "친선"] as ScheduleType[]).map((type) => {
              const icons = { 훈련: "🏃", 경기: "⚽", 친선: "🤝" };
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData({ ...formData, type })}
                  className={`px-4 py-3 rounded-lg border-2 transition-all ${
                    formData.type === type
                      ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm"
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <div className="text-xl mb-1">{icons[type]}</div>
                  <div className="text-sm font-medium">{type}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 제목 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            제목 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="예: 정기 훈련"
            required
          />
        </div>

        {/* 날짜/시간 통합 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              날짜 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.dateTime.toISOString().split("T")[0]}
              onChange={(e) => {
                const dateStr = e.target.value;
                const timeStr = formData.dateTime.toTimeString().slice(0, 5);
                setFormData({
                  ...formData,
                  dateTime: new Date(dateStr + "T" + timeStr),
                });
              }}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              min={new Date().toISOString().split("T")[0]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="w-4 h-4 inline mr-1" />
              시간 <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              value={formData.dateTime.toTimeString().slice(0, 5)}
              onChange={(e) => {
                const [hours, minutes] = e.target.value.split(":");
                const newDate = new Date(formData.dateTime);
                newDate.setHours(parseInt(hours), parseInt(minutes));
                setFormData({ ...formData, dateTime: newDate });
              }}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
        </div>

        {/* 장소 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <MapPin className="w-4 h-4 inline mr-1" />
            장소 <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.place}
                onChange={(e) => setFormData({ ...formData, place: e.target.value })}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="장소 이름을 입력하거나 지도에서 선택하세요"
                required
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  // 지도 페이지로 이동 (장소 선택 후 돌아오기)
                  navigate(`/app/map?returnTo=schedule&teamId=${selectedTeamId || teamId}`);
                }}
                className="flex items-center gap-2 whitespace-nowrap"
              >
                <MapPin className="w-4 h-4" />
                지도에서 선택
              </Button>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowVenueSearch(true)}
              className="w-full flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" />
              구장 검색
            </Button>
            {formData.placeCoordinates && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                위치 정보가 저장됩니다
              </p>
            )}
          </div>
        </div>

        {/* 구장 검색 모달 */}
        {showVenueSearch && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
              {/* 헤더 */}
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-semibold">구장 찾기</h3>
                <button
                  onClick={() => {
                    setShowVenueSearch(false);
                    setVenueSearchQuery("");
                    setVenueResults([]);
                  }}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 검색창 */}
              <div className="p-4 border-b">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={venueSearchQuery}
                      onChange={(e) => {
                        setVenueSearchQuery(e.target.value);
                        searchVenues(e.target.value);
                      }}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="구장 이름 또는 지역 검색"
                      autoFocus
                    />
                  </div>
                </div>
              </div>

              {/* 검색 결과 */}
              <div className="flex-1 overflow-y-auto p-4">
                {venueSearching ? (
                  <div className="text-center py-8 text-gray-500">검색 중...</div>
                ) : venueResults.length > 0 ? (
                  <div className="space-y-2">
                    {venueResults.map((venue, index) => (
                      <button
                        key={index}
                        onClick={() => selectVenue(venue)}
                        className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                      >
                        <div className="font-medium text-gray-900">{venue.name}</div>
                        {venue.address && (
                          <div className="text-sm text-gray-500 mt-1">{venue.address}</div>
                        )}
                      </button>
                    ))}
                  </div>
                ) : venueSearchQuery ? (
                  <div className="text-center py-8 text-gray-500">
                    검색 결과가 없습니다
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    구장 이름이나 지역을 입력해주세요
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 상대팀 (경기/친선만) */}
        {(formData.type === "경기" || formData.type === "친선") && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              상대팀
            </label>
            <input
              type="text"
              value={formData.opponent || ""}
              onChange={(e) => setFormData({ ...formData, opponent: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="예: 노원 FC"
            />
          </div>
        )}

        {/* 공개 설정 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            공개 설정
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, isPublic: false })}
              className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors ${
                !formData.isPublic
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              팀 내부만
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, isPublic: true })}
              className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors ${
                formData.isPublic
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              공개
            </button>
          </div>
        </div>

        {/* 용병 모집 */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="needsSubstitute"
            checked={formData.needsSubstitute}
            onChange={(e) => setFormData({ ...formData, needsSubstitute: e.target.checked })}
            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="needsSubstitute" className="text-sm font-medium text-gray-700">
            용병 모집하기
          </label>
        </div>

        {/* 설명 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            설명 (선택)
          </label>
          <textarea
            value={formData.description || ""}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={4}
            placeholder="메모 입력..."
          />
        </div>

        {/* 제출 버튼 */}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
            className="flex-1"
          >
            취소
          </Button>
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? "생성 중..." : "일정 만들기"}
          </Button>
        </div>
      </form>
    </div>
  );
}
