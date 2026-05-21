/**
 * Public Event Detail Page
 * 
 * 일반 사용자용 행사 상세 페이지
 * 경로: /events/:eventId
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getEvent, getEventAwards } from "@/services/eventService";
import { getEventEntries } from "@/services/eventEntryService";
import { getEventMatches } from "@/services/eventMatchService";
import TournamentBracket from "@/components/bracket/TournamentBracket";
import EventStatsTab from "@/components/events/EventStatsTab";
import { MediaGallery } from "@/components/media/MediaGallery";
import type { Event, EventEntry, EventMatch, EventAward } from "@/types/event";

type TabType = "overview" | "teams" | "bracket" | "matches" | "results" | "stats" | "media";

export default function PublicEventDetailPage() {
  const navigate = useNavigate();
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [entries, setEntries] = useState<EventEntry[]>([]);
  const [matches, setMatches] = useState<EventMatch[]>([]);
  const [awards, setAwards] = useState<EventAward[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  useEffect(() => {
    if (eventId) {
      loadData();
    }
  }, [eventId]);

  const loadData = async () => {
    if (!eventId) return;

    try {
      setLoading(true);
      const [eventData, entriesData, matchesData, awardsData] = await Promise.all([
        getEvent(eventId),
        getEventEntries({ eventId, applicationStatus: "approved" }),
        getEventMatches({ eventId }),
        getEventAwards(eventId),
      ]);

      setEvent(eventData);
      setEntries(entriesData);
      setMatches(matchesData);
      setAwards(awardsData);
    } catch (error) {
      console.error("데이터 로드 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "-";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateTime = (timestamp: any) => {
    if (!timestamp) return "-";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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

  const scheduledMatches = matches.filter((m) => m.status === "scheduled");
  const completedMatches = matches.filter((m) => m.status === "completed");

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">행사를 찾을 수 없습니다.</p>
          <button
            onClick={() => navigate("/events")}
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
            onClick={() => navigate("/events")}
            className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            목록으로
          </button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{event.name}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                {event.organizerName && (
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                    />
                  </svg>
                  {getEventTypeLabel(event.type)}
                </div>
                {event.startDate && (
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              </div>
            </div>
            <span
              className={`px-3 py-1 text-sm font-medium rounded-full ${
                event.status === "scheduled"
                  ? "bg-blue-100 text-blue-800"
                  : event.status === "ongoing"
                  ? "bg-green-100 text-green-800"
                  : event.status === "completed"
                  ? "bg-gray-100 text-gray-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {getStatusLabel(event.status)}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            <button
              onClick={() => setActiveTab("overview")}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === "overview"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              개요
            </button>
            <button
              onClick={() => setActiveTab("teams")}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === "teams"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              참가팀 ({entries.length})
            </button>
            <button
              onClick={() => setActiveTab("bracket")}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === "bracket"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              대진표
            </button>
            <button
              onClick={() => setActiveTab("matches")}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === "matches"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              경기 일정 ({scheduledMatches.length})
            </button>
            <button
              onClick={() => setActiveTab("results")}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === "results"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              결과 ({completedMatches.length})
            </button>
            <button
              onClick={() => setActiveTab("stats")}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === "stats"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              통계
            </button>
            <button
              onClick={() => setActiveTab("media")}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === "media"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              미디어
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div>
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">행사 정보</h2>
              <div className="space-y-4">
                {event.description && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">설명</h3>
                    <p className="text-gray-600 whitespace-pre-line">{event.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">시즌</h3>
                    <p className="text-gray-600">{event.seasonId}</p>
                  </div>
                  {event.regionCode && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">지역</h3>
                      <p className="text-gray-600">{event.regionCode}</p>
                    </div>
                  )}
                  {event.startDate && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">시작일</h3>
                      <p className="text-gray-600">{formatDate(event.startDate)}</p>
                    </div>
                  )}
                  {event.endDate && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">종료일</h3>
                      <p className="text-gray-600">{formatDate(event.endDate)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Teams Tab */}
          {activeTab === "teams" && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">참가팀</h2>
                <p className="text-sm text-gray-500 mt-1">총 {entries.length}팀</p>
              </div>
              {entries.length === 0 ? (
                <div className="p-12 text-center text-gray-500">참가팀이 없습니다.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">팀명</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">지역</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">시드</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {entries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {entry.teamName || entry.teamId}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {entry.regionCode || "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {entry.seed ? `#${entry.seed}` : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Bracket Tab */}
          {activeTab === "bracket" && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">대진표</h2>
              {matches.length === 0 ? (
                <div className="text-center py-12 text-gray-500">대진표가 아직 생성되지 않았습니다.</div>
              ) : (
                <TournamentBracket matches={matches} eventId={event.id} />
              )}
            </div>
          )}

          {/* Matches Tab */}
          {activeTab === "matches" && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">경기 일정</h2>
                <p className="text-sm text-gray-500 mt-1">예정된 경기: {scheduledMatches.length}경기</p>
              </div>
              {scheduledMatches.length === 0 ? (
                <div className="p-12 text-center text-gray-500">예정된 경기가 없습니다.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">라운드</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">홈팀</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">어웨이팀</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">일정</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">장소</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {scheduledMatches.map((match) => (
                        <tr key={match.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {match.roundCode || "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {match.homeTeamName || match.homeTeamId}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {match.awayTeamName || match.awayTeamId}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDateTime(match.scheduledAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {match.venueName || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Results Tab */}
          {activeTab === "results" && (
            <div className="space-y-6">
              {/* Champion / Runner-up Section */}
              {awards.length > 0 && (
                <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg border border-yellow-200 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">🏆 시상 결과</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {awards
                      .filter((a) => a.awardType === "champion")
                      .map((award) => (
                        <div
                          key={award.id}
                          className="bg-white rounded-lg border-2 border-yellow-400 p-4 shadow-sm"
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-3xl">🏆</span>
                            <h3 className="text-lg font-bold text-gray-900">Champion</h3>
                          </div>
                          <p className="text-xl font-semibold text-gray-800">
                            {award.teamName || award.teamId}
                          </p>
                        </div>
                      ))}
                    {awards
                      .filter((a) => a.awardType === "runner_up")
                      .map((award) => (
                        <div
                          key={award.id}
                          className="bg-white rounded-lg border-2 border-gray-300 p-4 shadow-sm"
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-3xl">🥈</span>
                            <h3 className="text-lg font-bold text-gray-900">Runner-up</h3>
                          </div>
                          <p className="text-xl font-semibold text-gray-800">
                            {award.teamName || award.teamId}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Completed Matches Section */}
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">경기 결과</h2>
                  <p className="text-sm text-gray-500 mt-1">완료된 경기: {completedMatches.length}경기</p>
                </div>
                {completedMatches.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">완료된 경기가 없습니다.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">라운드</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">홈팀</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">점수</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">어웨이팀</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">일정</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {completedMatches.map((match) => (
                          <tr key={match.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {match.roundCode || "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {match.homeTeamName || match.homeTeamId}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                              {match.homeScore !== null && match.awayScore !== null
                                ? `${match.homeScore} - ${match.awayScore}`
                                : "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {match.awayTeamName || match.awayTeamId}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDateTime(match.scheduledAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Stats Tab */}
          {activeTab === "stats" && (
            <EventStatsTab eventId={eventId} divisionId={event.divisionId || null} />
          )}

          {/* Media Tab */}
          {activeTab === "media" && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">미디어 갤러리</h2>
              <MediaGallery entityType="event" entityId={eventId!} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
