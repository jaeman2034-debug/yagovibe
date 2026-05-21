/**
 * 🔥 Organization Detail Page
 * 
 * 역할: Organization 상세 정보 및 관리
 * 경로: /admin/organizations/:orgId
 */

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getOrganization, getOrganizationMembers } from "@/services/organizationService";
import { getEvents } from "@/services/eventService";
import type { Organization, OrganizationMember } from "@/types/organization";
import type { Event } from "@/types/event";

export default function OrganizationDetailPage() {
  const navigate = useNavigate();
  const { orgId } = useParams<{ orgId: string }>();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "events" | "members">("overview");

  useEffect(() => {
    if (orgId) {
      loadData();
    }
  }, [orgId]);

  const loadData = async () => {
    if (!orgId) return;

    try {
      setLoading(true);
      const [org, orgMembers, orgEvents] = await Promise.all([
        getOrganization(orgId),
        getOrganizationMembers(orgId),
        getEvents({ organizationId: orgId, limit: 10 }),
      ]);

      setOrganization(org);
      setMembers(orgMembers);
      setEvents(orgEvents);
    } catch (error) {
      console.error("데이터 로드 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "-";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("ko-KR");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">조직을 찾을 수 없습니다.</p>
          <button
            onClick={() => navigate("/admin/organizations")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            목록으로
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate("/admin/organizations")}
            className="text-blue-600 hover:text-blue-800 mb-4"
          >
            ← 목록으로
          </button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{organization.name}</h1>
              <p className="text-sm text-gray-600 mt-1">
                {organization.type === "platform" && "플랫폼"}
                {organization.type === "province" && "시/도"}
                {organization.type === "city" && "시/군"}
                {organization.type === "district" && "구/군"}
                {organization.type === "association" && "협회"} · {organization.regionCode}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate(`/admin/organizations/${orgId}/events`)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                행사 관리
              </button>
              <button
                onClick={() => navigate(`/admin/organizations/${orgId}/members`)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                멤버 관리
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("overview")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "overview"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              개요
            </button>
            <button
              onClick={() => setActiveTab("events")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "events"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              행사 ({events.length})
            </button>
            <button
              onClick={() => setActiveTab("members")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "members"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              멤버 ({members.length})
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">기본 정보</h2>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">조직명</dt>
                    <dd className="mt-1 text-sm text-gray-900">{organization.name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">유형</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {organization.type === "platform" && "플랫폼"}
                      {organization.type === "province" && "시/도"}
                      {organization.type === "city" && "시/군"}
                      {organization.type === "district" && "구/군"}
                      {organization.type === "association" && "협회"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">지역</dt>
                    <dd className="mt-1 text-sm text-gray-900">{organization.regionCode}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">종목</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {organization.sportType === "football" && "축구"}
                      {organization.sportType === "futsal" && "풋살"}
                      {organization.sportType === "baseball" && "야구"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">상태</dt>
                    <dd className="mt-1">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          organization.status === "active"
                            ? "bg-green-100 text-green-800"
                            : organization.status === "inactive"
                            ? "bg-gray-100 text-gray-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {organization.status === "active" && "활성"}
                        {organization.status === "inactive" && "비활성"}
                        {organization.status === "suspended" && "정지"}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">생성일</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {formatDate(organization.createdAt)}
                    </dd>
                  </div>
                </dl>
              </div>

              {organization.description && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">설명</h2>
                  <p className="text-sm text-gray-700">{organization.description}</p>
                </div>
              )}

              {/* 통계 카드 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-sm font-medium text-blue-600">행사 수</div>
                  <div className="text-2xl font-bold text-blue-900 mt-1">{events.length}</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-sm font-medium text-green-600">멤버 수</div>
                  <div className="text-2xl font-bold text-green-900 mt-1">{members.length}</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-sm font-medium text-purple-600">레벨</div>
                  <div className="text-2xl font-bold text-purple-900 mt-1">
                    {organization.level}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "events" && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">행사 목록</h2>
                <button
                  onClick={() => navigate(`/admin/organizations/${orgId}/events/create`)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  + 새 행사 생성
                </button>
              </div>
              {events.length === 0 ? (
                <p className="text-gray-500 text-center py-8">등록된 행사가 없습니다.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          행사명
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          유형
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          상태
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          시작일
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          작업
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {events.map((event) => (
                        <tr key={event.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {event.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {event.type === "tournament" && "토너먼트"}
                            {event.type === "league" && "리그"}
                            {event.type === "ceremony" && "행사"}
                            {event.type === "academy" && "아카데미"}
                            {event.type === "festival" && "축제"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                event.status === "scheduled"
                                  ? "bg-blue-100 text-blue-800"
                                  : event.status === "ongoing"
                                  ? "bg-green-100 text-green-800"
                                  : event.status === "completed"
                                  ? "bg-gray-100 text-gray-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {event.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(event.startDate)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() =>
                                navigate(`/admin/organizations/${orgId}/events/${event.id}`)
                              }
                              className="text-blue-600 hover:text-blue-900"
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
          )}

          {activeTab === "members" && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">멤버 목록</h2>
                <button
                  onClick={() => navigate(`/admin/organizations/${orgId}/members`)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  멤버 관리
                </button>
              </div>
              {members.length === 0 ? (
                <p className="text-gray-500 text-center py-8">등록된 멤버가 없습니다.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          사용자
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          역할
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          가입일
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {members.map((member) => (
                        <tr key={member.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {member.userName || member.userId}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                              {member.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(member.joinedAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
