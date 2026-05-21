/**
 * 🔥 Organization Create Page
 * 
 * 역할: Organization 생성
 * 경로: /admin/organizations/create
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createOrganization } from "@/services/organizationService";
import type { OrganizationType } from "@/types/organization";
import { useAuth } from "@/context/AuthProvider";

export default function OrganizationCreatePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    type: "association" as OrganizationType,
    level: 4, // 기본값: association
    parentOrgId: "",
    regionCode: "KR_SEOUL_NOWON",
    sportType: "football",
    description: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "level" ? parseInt(value) || 1 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError("로그인이 필요합니다.");
      return;
    }

    // 입력 검증
    if (!formData.name.trim()) {
      setError("조직명을 입력해주세요.");
      return;
    }

    if (!formData.regionCode) {
      setError("지역을 선택해주세요.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const orgId = await createOrganization({
        name: formData.name.trim(),
        type: formData.type,
        level: formData.level,
        parentOrgId: formData.parentOrgId || null,
        regionCode: formData.regionCode,
        sportType: formData.sportType,
        description: formData.description.trim() || undefined,
        createdBy: user.uid,
      });

      // 생성 성공 시 상세 페이지로 이동
      navigate(`/admin/organizations/${orgId}`);
    } catch (err: any) {
      console.error("Organization 생성 실패:", err);
      setError(err.message || "Organization 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate("/admin/organizations")}
            className="text-blue-600 hover:text-blue-800 mb-4"
          >
            ← 목록으로
          </button>
          <h1 className="text-2xl font-bold text-gray-900">새 조직 생성</h1>
          <p className="text-sm text-gray-600 mt-1">생활체육 조직(협회)을 생성합니다.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {/* 조직명 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                조직명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="예: 노원구 축구협회"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 유형 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                유형 <span className="text-red-500">*</span>
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="platform">플랫폼</option>
                <option value="province">시/도</option>
                <option value="city">시/군</option>
                <option value="district">구/군</option>
                <option value="association">협회</option>
              </select>
            </div>

            {/* 레벨 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                레벨 <span className="text-red-500">*</span>
              </label>
              <select
                name="level"
                value={formData.level}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="1">1 - 플랫폼</option>
                <option value="2">2 - 시/도</option>
                <option value="3">3 - 구/군</option>
                <option value="4">4 - 협회</option>
              </select>
            </div>

            {/* 상위 조직 (선택) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                상위 조직 (선택)
              </label>
              <input
                type="text"
                name="parentOrgId"
                value={formData.parentOrgId}
                onChange={handleChange}
                placeholder="상위 조직 ID (선택사항)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                계층 구조를 만들려면 상위 조직 ID를 입력하세요.
              </p>
            </div>

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
                <option value="baseball">야구</option>
              </select>
            </div>

            {/* 설명 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                설명
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                placeholder="조직에 대한 설명을 입력하세요."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-6 flex justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate("/admin/organizations")}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "생성 중..." : "생성하기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
