/**
 * 🔥 Event Admin List Page
 * 
 * 역할: 행사 목록 조회 및 관리
 * 경로: /admin/events
 */

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getEvents } from "@/services/eventService";
import { getOrganization } from "@/services/organizationService";
import type { Event } from "@/types/event";
import type { Organization } from "@/types/organization";
import { Timestamp } from "firebase/firestore";

export default function EventListPage() {
  const navigate = useNavigate();
  const { orgId } = useParams(); // URL에서 organizationId 가져오기
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [filter, setFilter] = useState<{
    seasonId?: string;
    type?: Event["type"];
    status?: Event["status"];
  }>({});

  useEffect(() => {
    loadOrganization();
    loadEvents();
  }, [orgId, filter]);

  const loadOrganization = async () => {
    if (orgId) {
      try {
        const org = await getOrganization(orgId);
        setOrganization(org);
      } catch (error) {
        console.error("Organization 로드 실패:", error);
      }
    }
  };

  const loadEvents = async () => {
    try {
      setLoading(true);
      const data = await getEvents({
        organizationId: orgId,  // Organization별 필터
        seasonId: filter.seasonId,
        type: filter.type,
        status: filter.status,
        limit: 100,
      });
      setEvents(data);
    } catch (error) {
      console.error("이벤트 목록 로드 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: Timestamp | Date) => {
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate().toLocaleDateString("ko-KR");
    }
    return new Date(timestamp).toLocaleDateString("ko-KR");
  };

  const getStatusLabel = (status: Event["status"]) => {
    const labels: Record<Event["status"], string> = {
      draft: "초안",
      registration_open: "참가 신청 중",
      registration_closed: "참가 신청 마감",
      scheduled: "일정 확정",
      ongoing: "진행 중",
      completed: "완료",
      canceled: "취소",
    };
    return labels[status] || status;
  };

  const getTypeLabel = (type: Event["type"]) => {
    const labels: Record<Event["type"], string> = {
      ceremony: "시무식/종무식",
      tournament: "토너먼트",
      league: "리그",
      academy: "아카데미",
      festival: "축제",
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {organization ? `${organization.name} 행사 관리` : "행사 관리"}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {organization 
                ? `${organization.name} 소속 행사 목록 및 관리`
                : "생활체육 행사 목록 및 관리"
              }
            </p>
          </div>
          <button
            onClick={() => navigate(orgId ? `/admin/organizations/${orgId}/events/create` : "/admin/events/create")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + 새 행사 생성
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                시즌
              </label>
              <select
                value={filter.seasonId || ""}
                onChange={(e) =>
                  setFilter({ ...filter, seasonId: e.target.value || undefined })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">전체</option>
                <option value="2026">2026</option>
                <option value="2025">2025</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                행사 유형
              </label>
              <select
                value={filter.type || ""}
                onChange={(e) =>
                  setFilter({ ...filter, type: e.target.value as Event["type"] || undefined })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">전체</option>
                <option value="tournament">토너먼트</option>
                <option value="league">리그</option>
                <option value="academy">아카데미</option>
                <option value="ceremony">시무식/종무식</option>
                <option value="festival">축제</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                상태
              </label>
              <select
                value={filter.status || ""}
                onChange={(e) =>
                  setFilter({ ...filter, status: e.target.value as Event["status"] || undefined })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">전체</option>
                <option value="scheduled">일정 확정</option>
                <option value="ongoing">진행 중</option>
                <option value="completed">완료</option>
                <option value="registration_open">참가 신청 중</option>
              </select>
            </div>
          </div>
        </div>

        {/* Events Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  행사명
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  유형
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  시즌
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  시작일
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  액션
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {events.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    등록된 행사가 없습니다.
                  </td>
                </tr>
              ) : (
                events.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {event.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {event.organizerName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {getTypeLabel(event.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {event.seasonId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(event.startDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          event.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : event.status === "ongoing"
                            ? "bg-blue-100 text-blue-800"
                            : event.status === "scheduled"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {getStatusLabel(event.status)}
                      </span>
                    </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => {
                                if (orgId) {
                                  navigate(`/admin/organizations/${orgId}/events/${event.id}`);
                                } else {
                                  navigate(`/admin/events/${event.id}`);
                                }
                              }}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              관리
                            </button>
                          </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
