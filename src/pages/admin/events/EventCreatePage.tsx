/**
 * 🔥 Event Create Page
 * 
 * 역할: 행사 생성
 * 경로: /admin/events/create
 */

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createEvent } from "@/services/eventService";
import { getOrganizations, getUserOrganizations } from "@/services/organizationService";
import type { EventType } from "@/types/event";
import type { Organization } from "@/types/organization";
import { useAuth } from "@/context/AuthProvider";

export default function EventCreatePage() {
  const navigate = useNavigate();
  const { orgId } = useParams(); // URL에서 organizationId 가져오기
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);

  const [formData, setFormData] = useState({
    name: "",
    type: "tournament" as EventType,
    sportType: "football",
    regionCode: "KR_SEOUL_NOWON",
    seasonId: "2026",
    organizationId: orgId || "",  // URL에서 가져온 orgId 또는 빈 문자열
    organizerName: "",
    sponsorName: "",
    startDate: "",
    endDate: "",
    description: "",
    isPublic: true,
  });

  // Organization 목록 로드
  useEffect(() => {
    const loadOrganizations = async () => {
      try {
        if (user?.uid) {
          // 사용자가 속한 Organization 목록 조회
          const userOrgs = await getUserOrganizations(user.uid);
          setOrganizations(userOrgs);
          
          // URL에서 orgId가 있고 목록에 있으면 자동 선택
          if (orgId && userOrgs.some(org => org.id === orgId)) {
            setFormData(prev => ({ ...prev, organizationId: orgId }));
          } else if (userOrgs.length > 0 && !orgId) {
            // orgId가 없으면 첫 번째 Organization 자동 선택
            setFormData(prev => ({ ...prev, organizationId: userOrgs[0].id }));
          }
        } else {
          // 로그인하지 않은 경우 전체 Organization 조회 (Super Admin용)
          const allOrgs = await getOrganizations({ status: "active" });
          setOrganizations(allOrgs);
        }
      } catch (error) {
        console.error("Organization 목록 로드 실패:", error);
      } finally {
        setLoadingOrgs(false);
      }
    };

    loadOrganizations();
  }, [user, orgId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError("로그인이 필요합니다.");
      return;
    }

    // 입력 검증
    if (!formData.name.trim()) {
      setError("행사명을 입력해주세요.");
      return;
    }

    if (!formData.organizerName.trim()) {
      setError("주최 기관명을 입력해주세요.");
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      setError("시작일과 종료일을 입력해주세요.");
      return;
    }

    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);

    if (startDate >= endDate) {
      setError("종료일은 시작일보다 늦어야 합니다.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const eventId = await createEvent({
        name: formData.name.trim(),
        type: formData.type,
        sportType: formData.sportType,
        regionCode: formData.regionCode,
        seasonId: formData.seasonId,
        organizationId: formData.organizationId || undefined,  // Organization 연결
        organizer: formData.organizerName.trim(),
        organizerId: user.uid,
        sponsor: formData.sponsorName.trim() || null,
        startDate,
        endDate,
        description: formData.description.trim() || undefined,
        createdBy: user.uid,
      });

      // 생성 성공 시 상세 페이지로 이동
      navigate(`/admin/events/${eventId}`);
    } catch (err: any) {
      console.error("행사 생성 실패:", err);
      setError(err.message || "행사 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate("/admin/events")}
            className="text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            ← 행사 목록으로
          </button>
          <h1 className="text-2xl font-bold text-gray-900">새 행사 생성</h1>
          <p className="text-sm text-gray-600 mt-1">생활체육 행사를 생성합니다</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6 space-y-6">
          {/* 행사명 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              행사명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="예: 2026 노원구 협회장기 축구대회"
            />
          </div>

          {/* 행사 유형 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              행사 유형 <span className="text-red-500">*</span>
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="tournament">토너먼트</option>
              <option value="league">리그</option>
              <option value="academy">아카데미</option>
              <option value="ceremony">시무식/종무식</option>
              <option value="festival">축제</option>
            </select>
          </div>

          {/* 종목 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              종목 <span className="text-red-500">*</span>
            </label>
            <select
              name="sportType"
              value={formData.sportType}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="football">축구</option>
              <option value="futsal">풋살</option>
              <option value="basketball">농구</option>
              <option value="baseball">야구</option>
            </select>
          </div>

          {/* Organization (선택) */}
          {organizations.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                소속 조직 (선택)
              </label>
              <select
                name="organizationId"
                value={formData.organizationId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">없음</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Organization에 소속된 행사는 해당 조직의 관리 페이지에서 조회됩니다.
              </p>
            </div>
          )}

          {/* 지역 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              지역 <span className="text-red-500">*</span>
            </label>
            <select
              name="regionCode"
              value={formData.regionCode}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="KR_SEOUL_NOWON">서울 노원구</option>
              <option value="KR_SEOUL_GANGNAM">서울 강남구</option>
              <option value="KR_SEOUL_MAPO">서울 마포구</option>
              <option value="KR_GYEONGGI_SUWON">경기 수원시</option>
            </select>
          </div>

          {/* 시즌 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              시즌 <span className="text-red-500">*</span>
            </label>
            <select
              name="seasonId"
              value={formData.seasonId}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>

          {/* 주최 기관 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              주최 기관 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="organizerName"
              value={formData.organizerName}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="예: 노원구축구협회"
            />
          </div>

          {/* 스폰서 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              스폰서 (선택)
            </label>
            <input
              type="text"
              name="sponsorName"
              value={formData.sponsorName}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="예: 노원구청"
            />
          </div>

          {/* 일정 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                시작일 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                종료일 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 설명 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              설명 (선택)
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="행사에 대한 설명을 입력하세요"
            />
          </div>

          {/* 공개 여부 */}
          <div className="flex items-center">
            <input
              type="checkbox"
              name="isPublic"
              checked={formData.isPublic}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-700">
              공개 행사로 설정
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-4 border-t">
            <button
              type="button"
              onClick={() => navigate("/admin/events")}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "생성 중..." : "생성"}
            </button>
          </div>
        </form>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            💡 <strong>안내:</strong> 행사 생성 시 자동으로 "일반부" Division이 생성됩니다.
            토너먼트/리그/아카데미 유형의 경우 기본 Division이 자동 생성됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
