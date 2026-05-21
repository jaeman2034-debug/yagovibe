/**
 * 🔥 Event Detail Page
 * 
 * 역할: 행사 상세 정보 및 운영
 * 경로: /admin/organizations/:orgId/events/:eventId
 */

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getEvent } from "@/services/eventService";
import { getEventEntries } from "@/services/eventEntryService";
import { getEventMatches } from "@/services/eventMatchService";
import { approveEventEntry, rejectEventEntry } from "@/services/eventEntryService";
import { completeEventMatch } from "@/services/eventMatchService";
import { generateSimpleTournamentBracket } from "@/services/tournamentBracketService";
import TournamentBracket from "@/components/bracket/TournamentBracket";
import { PlayerStatsInput } from "@/components/events/PlayerStatsInput";
import { useAuth } from "@/context/AuthProvider";
import type { Event, EventEntry, EventMatch } from "@/types/event";
import { Timestamp } from "firebase/firestore";

type TabType = "overview" | "entries" | "matches" | "bracket" | "results" | "player-stats";

export default function EventDetailPage() {
  const navigate = useNavigate();
  const { orgId, eventId } = useParams<{ orgId?: string; eventId: string }>();
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [entries, setEntries] = useState<EventEntry[]>([]);
  const [matches, setMatches] = useState<EventMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [processing, setProcessing] = useState<string | null>(null);
  const [generatingBracket, setGeneratingBracket] = useState(false);

  useEffect(() => {
    if (eventId) {
      loadData();
    }
  }, [eventId]);

  const loadData = async () => {
    if (!eventId) return;

    try {
      setLoading(true);
      const [eventData, entriesData, matchesData] = await Promise.all([
        getEvent(eventId),
        getEventEntries({ eventId }),
        getEventMatches({ eventId }),
      ]);

      setEvent(eventData);
      setEntries(entriesData);
      setMatches(matchesData);
    } catch (error) {
      console.error("데이터 로드 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveEntry = async (entryId: string) => {
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }
    try {
      setProcessing(entryId);
      await approveEventEntry(entryId, user.uid);
      await loadData(); // 데이터 재로드
    } catch (error) {
      console.error("참가 승인 실패:", error);
      alert("참가 승인에 실패했습니다.");
    } finally {
      setProcessing(null);
    }
  };

  const handleRejectEntry = async (entryId: string) => {
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }
    try {
      setProcessing(entryId);
      await rejectEventEntry(entryId, user.uid);
      await loadData(); // 데이터 재로드
    } catch (error) {
      console.error("참가 거절 실패:", error);
      alert("참가 거절에 실패했습니다.");
    } finally {
      setProcessing(null);
    }
  };

  const handleCompleteMatch = async (matchId: string, homeScore: number, awayScore: number) => {
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }
    try {
      setProcessing(matchId);
      await completeEventMatch(matchId, {
        homeScore,
        awayScore,
        recordedBy: user.uid,
      });
      await loadData(); // 데이터 재로드
    } catch (error) {
      console.error("경기 결과 입력 실패:", error);
      alert("경기 결과 입력에 실패했습니다.");
    } finally {
      setProcessing(null);
    }
  };

  const handleGenerateBracket = async () => {
    if (!event || !user) {
      alert("로그인이 필요합니다.");
      return;
    }

    if (approvedEntries.length < 2) {
      alert("대진표 생성을 위해서는 최소 2팀 이상 승인되어야 합니다.");
      return;
    }

    // 중복 생성 방지는 서비스 레이어에서 처리

    try {
      setGeneratingBracket(true);

      // 첫 번째 division 사용 (또는 event의 기본 division)
      const divisionId = approvedEntries[0]?.divisionId || "general";

      const matchIds = await generateSimpleTournamentBracket({
        eventId: event.id,
        divisionId,
        seasonId: event.seasonId,
        createdBy: user.uid,
        scheduledAt: event.startDate?.toDate?.() || new Date(),
      });

      alert(`대진표가 생성되었습니다. (${matchIds.length}경기)`);
      await loadData(); // 데이터 재로드
    } catch (error: any) {
      console.error("대진표 생성 실패:", error);
      alert(error.message || "대진표 생성에 실패했습니다.");
    } finally {
      setGeneratingBracket(false);
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

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">행사를 찾을 수 없습니다.</p>
          <button
            onClick={() => navigate(orgId ? `/admin/organizations/${orgId}/events` : "/admin/events")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            목록으로
          </button>
        </div>
      </div>
    );
  }

  const pendingEntries = entries.filter((e) => e.applicationStatus === "pending");
  const approvedEntries = entries.filter((e) => e.applicationStatus === "approved");
  const scheduledMatches = matches.filter((m) => m.status === "scheduled");
  const completedMatches = matches.filter((m) => m.status === "completed");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(orgId ? `/admin/organizations/${orgId}/events` : "/admin/events")}
            className="text-blue-600 hover:text-blue-800 mb-4"
          >
            ← 목록으로
          </button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
              <p className="text-sm text-gray-600 mt-1">
                {event.type === "tournament" && "토너먼트"}
                {event.type === "league" && "리그"}
                {event.type === "ceremony" && "행사"}
                {event.type === "academy" && "아카데미"}
                {event.type === "festival" && "축제"} · {event.seasonId} · {event.organizerName}
              </p>
            </div>
            <div className="flex gap-2">
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
                {event.status === "scheduled" && "예정"}
                {event.status === "ongoing" && "진행중"}
                {event.status === "completed" && "완료"}
                {event.status === "canceled" && "취소"}
              </span>
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
              onClick={() => setActiveTab("entries")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "entries"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              참가팀 ({entries.length})
            </button>
            <button
              onClick={() => setActiveTab("matches")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "matches"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              경기 ({matches.length})
            </button>
            <button
              onClick={() => setActiveTab("bracket")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "bracket"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              대진표
            </button>
            <button
              onClick={() => setActiveTab("results")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "results"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              결과 입력
            </button>
            <button
              onClick={() => setActiveTab("player-stats")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "player-stats"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              선수 기록
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
                    <dt className="text-sm font-medium text-gray-500">행사명</dt>
                    <dd className="mt-1 text-sm text-gray-900">{event.name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">유형</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {event.type === "tournament" && "토너먼트"}
                      {event.type === "league" && "리그"}
                      {event.type === "ceremony" && "행사"}
                      {event.type === "academy" && "아카데미"}
                      {event.type === "festival" && "축제"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">시즌</dt>
                    <dd className="mt-1 text-sm text-gray-900">{event.seasonId}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">주최</dt>
                    <dd className="mt-1 text-sm text-gray-900">{event.organizerName}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">시작일</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDate(event.startDate)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">종료일</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDate(event.endDate)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">지역</dt>
                    <dd className="mt-1 text-sm text-gray-900">{event.regionCode}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">상태</dt>
                    <dd className="mt-1">
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
                    </dd>
                  </div>
                </dl>
              </div>

              {event.description && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">설명</h2>
                  <p className="text-sm text-gray-700">{event.description}</p>
                </div>
              )}

              {/* 통계 카드 */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-sm font-medium text-blue-600">참가팀</div>
                  <div className="text-2xl font-bold text-blue-900 mt-1">{entries.length}</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-sm font-medium text-green-600">승인 대기</div>
                  <div className="text-2xl font-bold text-green-900 mt-1">{pendingEntries.length}</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-sm font-medium text-purple-600">예정 경기</div>
                  <div className="text-2xl font-bold text-purple-900 mt-1">{scheduledMatches.length}</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="text-sm font-medium text-orange-600">완료 경기</div>
                  <div className="text-2xl font-bold text-orange-900 mt-1">{completedMatches.length}</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "entries" && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">참가팀 목록</h2>
                <div className="text-sm text-gray-500">
                  승인 대기: {pendingEntries.length} / 전체: {entries.length}
                </div>
              </div>
              {entries.length === 0 ? (
                <p className="text-gray-500 text-center py-8">참가 신청이 없습니다.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          팀명
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          부문
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          상태
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          신청일
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          작업
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {entries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {entry.teamName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {entry.divisionId || "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                entry.applicationStatus === "approved"
                                  ? "bg-green-100 text-green-800"
                                  : entry.applicationStatus === "rejected"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {entry.applicationStatus === "approved" && "승인"}
                              {entry.applicationStatus === "rejected" && "거절"}
                              {entry.applicationStatus === "pending" && "대기"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(entry.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            {entry.applicationStatus === "pending" && (
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => handleApproveEntry(entry.id)}
                                  disabled={processing === entry.id}
                                  className="text-green-600 hover:text-green-900 disabled:opacity-50"
                                >
                                  {processing === entry.id ? "처리중..." : "승인"}
                                </button>
                                <button
                                  onClick={() => handleRejectEntry(entry.id)}
                                  disabled={processing === entry.id}
                                  className="text-red-600 hover:text-red-900 disabled:opacity-50"
                                >
                                  거절
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "matches" && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">경기 목록</h2>
                <div className="text-sm text-gray-500">
                  예정: {scheduledMatches.length} / 완료: {completedMatches.length}
                </div>
              </div>
              {matches.length === 0 ? (
                <p className="text-gray-500 text-center py-8">등록된 경기가 없습니다.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          라운드
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          홈팀
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          원정팀
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          점수
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          일정
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          상태
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          작업
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {matches.map((match) => (
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {match.status === "completed"
                              ? `${match.homeScore || 0} - ${match.awayScore || 0}`
                              : "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(match.scheduledAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                match.status === "completed"
                                  ? "bg-green-100 text-green-800"
                                  : match.status === "scheduled"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {match.status === "completed" && "완료"}
                              {match.status === "scheduled" && "예정"}
                              {match.status === "canceled" && "취소"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            {match.status === "completed" && (
                              <button
                                onClick={() =>
                                  navigate(
                                    orgId
                                      ? `/admin/organizations/${orgId}/events/${eventId}/matches/${match.id}/stats`
                                      : `/admin/events/${eventId}/matches/${match.id}/stats`
                                  )
                                }
                                className="text-blue-600 hover:text-blue-900"
                              >
                                선수 기록 입력
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "bracket" && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">대진표</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    승인된 팀을 기반으로 토너먼트 대진표를 자동 생성합니다.
                  </p>
                </div>
                {approvedEntries.length >= 2 && matches.length === 0 && (
                  <button
                    onClick={handleGenerateBracket}
                    disabled={generatingBracket}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {generatingBracket ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        생성 중...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        대진표 생성
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* 상태 카드 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-sm font-medium text-blue-600">승인된 팀</div>
                  <div className="text-2xl font-bold text-blue-900 mt-1">{approvedEntries.length}팀</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-sm font-medium text-green-600">생성된 경기</div>
                  <div className="text-2xl font-bold text-green-900 mt-1">{matches.length}경기</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-sm font-medium text-purple-600">브라켓 사이즈</div>
                  <div className="text-2xl font-bold text-purple-900 mt-1">
                    {approvedEntries.length >= 2
                      ? `${Math.pow(2, Math.ceil(Math.log2(approvedEntries.length)))}강`
                      : "-"}
                  </div>
                </div>
              </div>

              {matches.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                  {approvedEntries.length < 2 ? (
                    <>
                      <div className="text-gray-400 mb-4">
                        <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <p className="text-gray-600 font-medium mb-2">대진표 생성을 위한 팀이 부족합니다</p>
                      <p className="text-sm text-gray-500 mb-4">
                        최소 2팀 이상 승인되어야 합니다. (현재: {approvedEntries.length}팀)
                      </p>
                      <button
                        onClick={() => setActiveTab("entries")}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        참가팀 승인하러 가기
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="text-gray-400 mb-4">
                        <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <p className="text-gray-600 font-medium mb-2">대진표를 생성해주세요</p>
                      <p className="text-sm text-gray-500 mb-6">
                        승인된 팀: {approvedEntries.length}팀 · 예상 브라켓:{" "}
                        {Math.pow(2, Math.ceil(Math.log2(approvedEntries.length)))}강
                      </p>
                      <button
                        onClick={handleGenerateBracket}
                        disabled={generatingBracket}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                      >
                        {generatingBracket ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            생성 중...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            대진표 생성하기
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* 성공 메시지 */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-6 h-6 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-green-800 font-medium">대진표가 생성되었습니다</p>
                        <p className="text-sm text-green-600 mt-1">
                          총 {matches.length}경기가 생성되었습니다. Matches 탭에서 경기 목록을 확인할 수 있습니다.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 라운드별 경기 통계 */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">라운드별 경기 수</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {["R64", "R32", "R16", "QF", "SF", "F"].map((roundCode) => {
                        const roundMatches = matches.filter((m) => m.roundCode === roundCode);
                        if (roundMatches.length === 0) return null;
                        return (
                          <div key={roundCode} className="text-center">
                            <div className="text-2xl font-bold text-gray-900">{roundMatches.length}</div>
                            <div className="text-xs text-gray-500 mt-1">{roundCode}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 대진표 시각화 */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">대진표</h3>
                    <TournamentBracket matches={matches} eventId={event?.id} />
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "results" && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">경기 결과 입력</h2>
                <div className="text-sm text-gray-500">
                  예정: {scheduledMatches.length} / 완료: {completedMatches.length}
                </div>
              </div>
              {scheduledMatches.length === 0 ? (
                <p className="text-gray-500 text-center py-8">결과를 입력할 경기가 없습니다.</p>
              ) : (
                <div className="space-y-4">
                  {scheduledMatches.map((match) => (
                    <MatchResultForm
                      key={match.id}
                      match={match}
                      onSubmit={(homeScore, awayScore) =>
                        handleCompleteMatch(match.id, homeScore, awayScore)
                      }
                      processing={processing === match.id}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "player-stats" && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">선수 기록 입력</h2>
                <div className="text-sm text-gray-500">
                  완료된 경기: {completedMatches.length}경기
                </div>
              </div>
              {completedMatches.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  선수 기록을 입력할 경기가 없습니다. 먼저 경기 결과를 입력해주세요.
                </p>
              ) : (
                <div className="space-y-6">
                  {completedMatches.map((match) => (
                    <div key={match.id} className="space-y-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-2">
                          {match.roundCode || "-"} · {match.roundName || "-"}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {match.homeTeamName || match.homeTeamId} vs {match.awayTeamName || match.awayTeamId}
                          {match.homeScore !== null && match.awayScore !== null && (
                            <span className="ml-2 font-medium">
                              {match.homeScore} - {match.awayScore}
                            </span>
                          )}
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 홈팀 선수 기록 */}
                        <PlayerStatsInput
                          match={match}
                          eventId={event.id}
                          divisionId={match.divisionId}
                          seasonId={event.seasonId}
                          teamId={match.homeTeamId}
                          teamName={match.homeTeamName || match.homeTeamId}
                          players={approvedEntries
                            .filter((e) => e.teamId === match.homeTeamId)
                            .map((e) => ({
                              id: e.teamId, // 임시: 실제로는 팀의 선수 목록을 조회해야 함
                              name: e.teamName,
                            }))}
                          onSaved={loadData}
                        />
                        
                        {/* 원정팀 선수 기록 */}
                        <PlayerStatsInput
                          match={match}
                          eventId={event.id}
                          divisionId={match.divisionId}
                          seasonId={event.seasonId}
                          teamId={match.awayTeamId}
                          teamName={match.awayTeamName || match.awayTeamId}
                          players={approvedEntries
                            .filter((e) => e.teamId === match.awayTeamId)
                            .map((e) => ({
                              id: e.teamId, // 임시: 실제로는 팀의 선수 목록을 조회해야 함
                              name: e.teamName,
                            }))}
                          onSaved={loadData}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 경기 결과 입력 폼 컴포넌트
function MatchResultForm({
  match,
  onSubmit,
  processing,
}: {
  match: EventMatch;
  onSubmit: (homeScore: number, awayScore: number) => void;
  processing: boolean;
}) {
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const home = parseInt(homeScore);
    const away = parseInt(awayScore);
    if (isNaN(home) || isNaN(away) || home < 0 || away < 0) {
      alert("올바른 점수를 입력해주세요.");
      return;
    }
    onSubmit(home, away);
    setHomeScore("");
    setAwayScore("");
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <div className="text-sm font-medium text-gray-900">
            {match.homeTeamName || match.homeTeamId} vs {match.awayTeamName || match.awayTeamId}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {match.roundCode || "-"} · {match.scheduledAt?.toDate?.()?.toLocaleDateString("ko-KR") || "-"}
          </div>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="flex items-center gap-4">
        <div className="flex-1 flex items-center gap-2">
          <input
            type="number"
            min="0"
            value={homeScore}
            onChange={(e) => setHomeScore(e.target.value)}
            placeholder="0"
            className="w-20 px-3 py-2 border border-gray-300 rounded-md text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <span className="text-gray-500">-</span>
          <input
            type="number"
            min="0"
            value={awayScore}
            onChange={(e) => setAwayScore(e.target.value)}
            placeholder="0"
            className="w-20 px-3 py-2 border border-gray-300 rounded-md text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <button
          type="submit"
          disabled={processing}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {processing ? "처리중..." : "결과 입력"}
        </button>
      </form>
    </div>
  );
}
