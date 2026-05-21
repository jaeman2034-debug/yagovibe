/**
 * Public Event List Page
 * 
 * 일반 사용자용 행사 목록 페이지
 * 경로: /events
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getEvents } from "@/services/eventService";
import type { Event } from "@/types/event";

export default function EventListPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "scheduled" | "ongoing" | "completed">("all");

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const allEvents = await getEvents({});
      
      // Public 이벤트만 필터링 (isPublic이 true인 것만)
      const publicEvents = allEvents.filter((e) => e.isPublic !== false);
      
      // 날짜순 정렬 (최신순)
      publicEvents.sort((a, b) => {
        const dateA = a.startDate?.toDate?.()?.getTime() || 0;
        const dateB = b.startDate?.toDate?.()?.getTime() || 0;
        return dateB - dateA;
      });

      setEvents(publicEvents);
    } catch (error) {
      console.error("행사 목록 로드 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter((event) => {
    if (filter === "all") return true;
    return event.status === filter;
  });

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "-";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("ko-KR");
  };

  const getEventTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      tournament: "토너먼트",
      league: "리그",
      ceremony: "행사",
      academy: "아카데미",
      festival: "축제",
    };
    return labels[type] || type;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      scheduled: "예정",
      ongoing: "진행중",
      completed: "완료",
      canceled: "취소",
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      scheduled: "bg-blue-100 text-blue-800",
      ongoing: "bg-green-100 text-green-800",
      completed: "bg-gray-100 text-gray-800",
      canceled: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">행사 목록</h1>
          <p className="text-gray-600">진행 중이거나 예정된 대회를 확인하세요</p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === "all"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            전체
          </button>
          <button
            onClick={() => setFilter("scheduled")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === "scheduled"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            예정
          </button>
          <button
            onClick={() => setFilter("ongoing")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === "ongoing"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            진행중
          </button>
          <button
            onClick={() => setFilter("completed")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === "completed"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            완료
          </button>
        </div>

        {/* Events Grid */}
        {filteredEvents.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-500">표시할 행사가 없습니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => (
              <div
                key={event.id}
                onClick={() => navigate(`/events/${event.id}`)}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer"
              >
                {/* Event Header */}
                <div className="mb-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 flex-1">
                      {event.name}
                    </h3>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ml-2 flex-shrink-0 ${getStatusColor(
                        event.status
                      )}`}
                    >
                      {getStatusLabel(event.status)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{getEventTypeLabel(event.type)}</p>
                </div>

                {/* Event Info */}
                <div className="space-y-2 mb-4">
                  {event.organizerName && (
                    <div className="flex items-center text-sm text-gray-600">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                        />
                      </svg>
                      {event.organizerName}
                    </div>
                  )}
                  {event.startDate && (
                    <div className="flex items-center text-sm text-gray-600">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      {formatDate(event.startDate)}
                      {event.endDate && ` ~ ${formatDate(event.endDate)}`}
                    </div>
                  )}
                  {event.regionCode && (
                    <div className="flex items-center text-sm text-gray-600">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      {event.regionCode}
                    </div>
                  )}
                </div>

                {/* View Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/events/${event.id}`);
                  }}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  자세히 보기
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
