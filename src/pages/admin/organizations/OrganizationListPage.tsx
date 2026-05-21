/**
 * 🔥 Organization Admin List Page
 * 
 * 역할: Organization 목록 조회 및 관리
 * 경로: /admin/organizations
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getOrganizations } from "@/services/organizationService";
import type { Organization } from "@/types/organization";

export default function OrganizationListPage() {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<{
    sportType?: string;
    regionCode?: string;
    type?: Organization["type"];
  }>({});

  useEffect(() => {
    loadOrganizations();
  }, [filter]);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      const data = await getOrganizations({
        sportType: filter.sportType,
        regionCode: filter.regionCode,
        type: filter.type,
      });
      setOrganizations(data);
    } catch (error) {
      console.error("Organization 목록 로드 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "-";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("ko-KR");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">조직 관리</h1>
            <p className="text-sm text-gray-600 mt-1">생활체육 조직(협회) 목록 및 관리</p>
          </div>
          <button
            onClick={() => navigate("/admin/organizations/create")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + 새 조직 생성
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                종목
              </label>
              <select
                value={filter.sportType || ""}
                onChange={(e) =>
                  setFilter({ ...filter, sportType: e.target.value || undefined })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">전체</option>
                <option value="football">축구</option>
                <option value="futsal">풋살</option>
                <option value="baseball">야구</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                지역
              </label>
              <select
                value={filter.regionCode || ""}
                onChange={(e) =>
                  setFilter({ ...filter, regionCode: e.target.value || undefined })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">전체</option>
                <option value="KR_SEOUL_NOWON">서울 노원구</option>
                <option value="KR_SEOUL_GANGNAM">서울 강남구</option>
                <option value="KR_SEOUL_MAPO">서울 마포구</option>
                <option value="KR_GYEONGGI_SUWON">경기 수원시</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                유형
              </label>
              <select
                value={filter.type || ""}
                onChange={(e) =>
                  setFilter({ ...filter, type: (e.target.value as Organization["type"]) || undefined })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">전체</option>
                <option value="platform">플랫폼</option>
                <option value="province">시/도</option>
                <option value="city">시/군</option>
                <option value="district">구/군</option>
                <option value="association">협회</option>
              </select>
            </div>
          </div>
        </div>

        {/* Organization List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : organizations.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-500">등록된 조직이 없습니다.</p>
            <button
              onClick={() => navigate("/admin/organizations/create")}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              첫 조직 생성하기
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    조직명
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    유형
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    지역
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    종목
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    생성일
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {organizations.map((org) => (
                  <tr key={org.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{org.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {org.type === "platform" && "플랫폼"}
                        {org.type === "province" && "시/도"}
                        {org.type === "city" && "시/군"}
                        {org.type === "district" && "구/군"}
                        {org.type === "association" && "협회"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {org.regionCode}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {org.sportType === "football" && "축구"}
                      {org.sportType === "futsal" && "풋살"}
                      {org.sportType === "baseball" && "야구"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          org.status === "active"
                            ? "bg-green-100 text-green-800"
                            : org.status === "inactive"
                            ? "bg-gray-100 text-gray-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {org.status === "active" && "활성"}
                        {org.status === "inactive" && "비활성"}
                        {org.status === "suspended" && "정지"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(org.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => navigate(`/admin/organizations/${org.id}`)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        관리
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
