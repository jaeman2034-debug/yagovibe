/**
 * Tournament Section 컴포넌트
 * 대회 일정 카드형 UI - 자동화 트리거 허브
 * 
 * 🔥 자동화 코어 1단계: 빈 상태 → 운영 트리거 허브화
 * 🔥 자동화 코어 2단계: 대회 카드 = 실무 대시보드
 * 🔥 자동화 코어 3단계: 대회 카드 클릭 → 전창 운영 모드 진입
 */

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Trophy, Users, Plus, Copy, AlertCircle, Clock, UserCheck } from "lucide-react";
import type { Tournament, Match } from "@/types/tournament";
import { useNavigate } from "react-router-dom";
import { useTournaments } from "@/lib/tournament/useTournaments";
import { TournamentEditDrawer } from "@/components/association/tournament/TournamentEditDrawer";
import { useSearchParams } from "react-router-dom";
import { getTournamentStats } from "@/lib/tournament/tournamentRepository";
import { Badge } from "@/components/ui/badge";
import { getTournamentChecklist } from "@/lib/tournament/checklistRepository";
import { TournamentChecklist } from "@/components/tournament/TournamentChecklist";
import type { TournamentChecklist as ChecklistType } from "@/lib/tournament/checklistRepository";
import { RefereeGuideButton } from "@/components/tournament/RefereeGuideButton";
import { useIsAssociationAdmin } from "@/hooks/useIsAssociationAdmin";
import { Settings } from "lucide-react";

interface TournamentSectionProps {
  tenantId: string;
  tournaments?: Tournament[]; // 옵션: 직접 전달하거나 자동 로드
}

interface TournamentStats {
  todayMatchCount: number;
  unassignedRefMatchCount: number;
  uncheckedPlayerCount: number;
}

// 오늘 날짜의 dateKey 생성 (YYYY-MM-DD)
function getTodayDateKey(): string {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function TournamentSection({ tenantId, tournaments: propTournaments }: TournamentSectionProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromNoticeId = searchParams.get("fromNotice");
  const loadedTournaments = useTournaments(tenantId);
  const tournaments = propTournaments ?? loadedTournaments;
  
  // 🔥 관리자 권한 체크
  const { isAdmin, loading: adminLoading } = useIsAssociationAdmin(tenantId);
  
  // 🔥 실시간 업데이트를 위한 디버깅 로그
  useEffect(() => {
    console.log("🔥 [TournamentSection] 대회 목록 업데이트:", {
      count: tournaments.length,
      tournaments: tournaments.map(t => ({ id: t.id, name: t.name, status: t.status }))
    });
  }, [tournaments]);
  const [showCreateDrawer, setShowCreateDrawer] = useState(false);
  const [tournamentStats, setTournamentStats] = useState<Record<string, TournamentStats>>({});
  const [tournamentChecklists, setTournamentChecklists] = useState<Record<string, ChecklistType>>({});

  // 대회별 실무 통계 계산 (stats 컬렉션에서 읽기)
  useEffect(() => {
    const fetchStats = async () => {
      const stats: Record<string, TournamentStats> = {};
      const checklists: Record<string, ChecklistType> = {};
      const dateKey = getTodayDateKey();
      
      for (const tournament of tournaments) {
        try {
          // 통계 조회
          const statsData = await getTournamentStats(tenantId, tournament.id, dateKey);
          stats[tournament.id] = statsData || {
            todayMatchCount: 0,
            unassignedRefMatchCount: 0,
            uncheckedPlayerCount: 0,
          };

          // 체크리스트 계산
          const checklist = await getTournamentChecklist(tenantId, tournament.id);
          checklists[tournament.id] = checklist;
        } catch (error) {
          console.error(`대회 ${tournament.id} 통계 조회 오류:`, error);
          stats[tournament.id] = {
            todayMatchCount: 0,
            unassignedRefMatchCount: 0,
            uncheckedPlayerCount: 0,
          };
          checklists[tournament.id] = {
            items: [],
            allOk: false,
            warningCount: 0,
            errorCount: 0,
          };
        }
      }
      
      setTournamentStats(stats);
      setTournamentChecklists(checklists);
    };

    if (tournaments.length > 0) {
      fetchStats();
    }
  }, [tournaments, tenantId]);

  const formatDateRange = (start: string, end: string): string => {
    try {
      const startDate = new Date(start);
      const endDate = new Date(end);
      const startStr = `${startDate.getFullYear()}.${String(startDate.getMonth() + 1).padStart(2, "0")}`;
      const endStr = `${endDate.getFullYear()}.${String(endDate.getMonth() + 1).padStart(2, "0")}`;
      return `${startStr} ~ ${endStr}`;
    } catch {
      return "";
    }
  };

  const getStatusBadge = (status: Tournament["status"]) => {
    const badges = {
      registration: { text: "준비", color: "bg-blue-100 text-blue-800" },
      ongoing: { text: "진행 중", color: "bg-green-100 text-green-800" },
      completed: { text: "종료", color: "bg-gray-100 text-gray-800" },
      cancelled: { text: "취소", color: "bg-red-100 text-red-800" },
    };
    const badge = badges[status] || badges.completed;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  const handleCreateTournament = () => {
    setShowCreateDrawer(true);
  };

  // fromNotice 파라미터가 있으면 자동으로 Drawer 열기
  useEffect(() => {
    if (fromNoticeId && !showCreateDrawer) {
      setShowCreateDrawer(true);
    }
  }, [fromNoticeId, showCreateDrawer]);

  const handleLoadExistingTournament = () => {
    // TODO: 기존 대회 불러오기 기능 구현
    // 지난 대회 목록을 보여주고 복제하는 기능
    alert("기존 대회 불러오기 기능은 곧 추가됩니다.");
  };

  const handleTournamentClick = (tournamentId: string) => {
    // 🔥 클릭 이벤트 디버깅
    console.log("🔥 [TournamentSection] 대회 카드 클릭:", {
      tournamentId,
      tenantId,
      targetUrl: `/association/${tenantId}/admin/tournaments/${tournamentId}/ops`,
    });
    
    // 🔥 자동화 코어 3단계: 전창 운영 모드 진입
    // 경기장별 일정표 + 심판 배정 화면으로 이동
    navigate(`/association/${tenantId}/admin/tournaments/${tournamentId}/ops`);
  };

  const handleCreateSuccess = (tournamentId?: string) => {
    setShowCreateDrawer(false);
    
    if (tournamentId) {
      // 🔥 STEP 1: 대회 생성 성공 시 즉각 피드백
      // 1. 메인 페이지에 머물면서 (다른 페이지로 이동하지 않음)
      // 2. 대회 카드가 자동으로 나타나도록 함 (실시간 리스너가 처리)
      // 3. 시스템 공지도 자동으로 나타남 (실시간 리스너가 처리)
      // 4. 생성된 대회 카드로 스크롤 이동
      
      // 약간의 지연을 두어 Firestore 실시간 리스너가 업데이트를 받을 시간 확보
      setTimeout(() => {
        // 대회 카드가 나타났는지 확인
        const tournamentCard = document.getElementById(`tournament-${tournamentId}`);
        if (tournamentCard) {
          // 대회 카드로 스크롤 이동 + 하이라이트
          tournamentCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          tournamentCard.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2', 'animate-pulse');
          setTimeout(() => {
            tournamentCard.classList.remove('animate-pulse');
            setTimeout(() => {
              tournamentCard.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2');
            }, 2000);
          }, 2000);
        } else {
          // 아직 카드가 없으면 조금 더 기다렸다가 다시 시도
          setTimeout(() => {
            const retryCard = document.getElementById(`tournament-${tournamentId}`);
            if (retryCard) {
              retryCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
              retryCard.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2');
              setTimeout(() => {
                retryCard.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2');
              }, 2000);
            }
          }, 1500);
        }
      }, 800); // Drawer 닫힌 후 + Firestore 업데이트 대기
    }
  };

  return (
    <>
      <section id="tournaments" className="max-w-6xl mx-auto py-16 px-4">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold mb-2">대회 일정</h2>
          {tournaments.length > 0 && (
            <p className="text-sm text-muted-foreground">
              생성된 대회: <span className="font-semibold">{tournaments.length}</span>건
            </p>
          )}
        </div>
        
        {/* 대회 카드 그리드 */}
        {tournaments.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map((tournament) => {
              const stats = tournamentStats[tournament.id] || {
                todayMatchCount: 0,
                unassignedRefMatchCount: 0,
                uncheckedPlayerCount: 0,
              };
              
              return (
                <Card 
                  id={`tournament-${tournament.id}`}  // 🔥 스크롤 타겟용 ID 추가
                  key={tournament.id} 
                  className="rounded-2xl shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleTournamentClick(tournament.id)}
                >
                  <CardContent className="p-6 space-y-4">
                    {/* 헤더: 기간 + 상태 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        {formatDateRange(tournament.startDate, tournament.endDate)}
                      </div>
                      {getStatusBadge(tournament.status)}
                    </div>
                    
                    {/* 대회명 */}
                    <h3 className="text-lg font-semibold">{tournament.name}</h3>
                    <p className="text-sm text-muted-foreground">{tournament.organizer}</p>
                    
                    {/* 기본 정보 */}
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4" /> 참가 팀: {tournament.teamCount}
                      {tournament.maxTeams && ` / ${tournament.maxTeams}팀`}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4" /> {tournament.location}
                    </div>
                    
                    {/* 🔥 운영 체크리스트 (상단) */}
                    {tournamentChecklists[tournament.id] && (
                      <div className="pt-3 border-t">
                        <div className="mb-2">
                          <h4 className="text-xs font-semibold text-muted-foreground mb-1.5">
                            운영 체크 상태
                          </h4>
                          <TournamentChecklist
                            checklist={tournamentChecklists[tournament.id]}
                            compact={true}
                          />
                        </div>
                      </div>
                    )}

                    {/* 🔥 실무 대시보드 정보 (숫자로 표시) - 하위 호환성 유지 */}
                    <div className="pt-3 border-t">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">
                          오늘 경기 {stats.todayMatchCount}
                        </Badge>
                        {stats.unassignedRefMatchCount > 0 && (
                          <Badge variant="destructive">
                            미배정 심판 {stats.unassignedRefMatchCount}
                          </Badge>
                        )}
                        {stats.uncheckedPlayerCount > 0 && (
                          <Badge variant="destructive">
                            미검인 {stats.uncheckedPlayerCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 mt-4">
                      {/* 🔥 관리자 전용: 대회 관리 버튼 */}
                      {!adminLoading && isAdmin && (
                        <Button
                          variant="default"
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/association/${tenantId}/admin/tournaments/${tournament.id}`);
                          }}
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          대회 관리
                        </Button>
                      )}
                      
                      {/* 일반 사용자용: 운영 모드 진입 버튼 */}
                      <Button
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTournamentClick(tournament.id);
                        }}
                      >
                        운영 모드 진입
                      </Button>
                      <RefereeGuideButton
                        tournamentName={tournament.name}
                        variant="outline"
                        size="sm"
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* 🔥 자동화 코어 1단계: 빈 상태 → 운영 트리거 허브 */}
        {tournaments.length === 0 && (
          <Card className="rounded-2xl shadow-sm border-2 border-dashed border-gray-300">
            <CardContent className="p-12 flex flex-col items-center justify-center text-center">
              <Trophy className="w-16 h-16 mb-4 text-gray-400" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                진행 중인 대회가 없습니다
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                대회를 생성하거나 기존 대회를 불러와서 시작하세요
              </p>
              
              {/* 행동 버튼들 */}
              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-none md:max-w-3xl">
                <Button
                  onClick={handleCreateTournament}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  size="lg"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  대회 생성
                </Button>
                <Button
                  onClick={handleLoadExistingTournament}
                  variant="outline"
                  className="flex-1"
                  size="lg"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  기존 대회 불러오기
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      {/* 대회 생성 Drawer */}
      {showCreateDrawer && (
        <TournamentEditDrawer
          isOpen={showCreateDrawer}
          onClose={() => {
            setShowCreateDrawer(false);
            // fromNotice 파라미터 제거
            if (fromNoticeId) {
              navigate(`/association/${tenantId}/admin/tournaments`, { replace: true });
            }
          }}
          onSuccess={handleCreateSuccess}
          associationId={tenantId}
          fromNoticeId={fromNoticeId || undefined}
        />
      )}
    </>
  );
}

