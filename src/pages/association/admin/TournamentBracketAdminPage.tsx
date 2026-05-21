/**
 * 대진표 관리 페이지 (관리자용)
 * 경기 결과 입력 및 대진표 편집
 */

import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Tournament, Bracket, AgeDivision } from "@/types/tournament";
import { AGE_DIVISION_LABELS } from "@/types/tournament";
import { BracketDisplay } from "@/components/association/tournament/BracketDisplay";
import { MatchResultInput } from "@/components/association/tournament/MatchResultInput";
import { VenueSchedule } from "@/components/association/tournament/VenueSchedule";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useIsAssociationAdmin } from "@/hooks/useIsAssociationAdmin";
import { seedRealBracketsToFirestore } from "@/lib/tournament/seedRealBrackets";
import { ArrowLeft, Upload, Calendar } from "lucide-react";
import type { VenueId } from "@/types/venue";

export default function TournamentBracketAdminPage() {
  const { associationId, tournamentId } = useParams<{
    associationId: string;
    tournamentId: string;
  }>();
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useIsAssociationAdmin(associationId);

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [brackets, setBrackets] = useState<Bracket[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [active, setActive] = useState<"youth" | "forty" | "fifty" | "sixty" | "schedule">("youth");
  const [loading, setLoading] = useState(true);
  const fetchRef = useRef(false); // 무한 루프 방지
  
  // 경기장 일정표 필터
  const [scheduleDate, setScheduleDate] = useState<string | null>(null);
  const [scheduleVenue, setScheduleVenue] = useState<VenueId | "all">("all");

  const divisionMap: Record<"youth" | "forty" | "fifty" | "sixty", AgeDivision> = {
    youth: "youth",
    forty: "middle",
    fifty: "senior",
    sixty: "silver",
  };

  const current = divisionMap[active];
  const currentBracket = brackets.find((b) => b.division === current);
  const selectedMatch = currentBracket?.matches.find((m) => m.id === selectedMatchId);

  useEffect(() => {
    if (!associationId || !tournamentId) return;
    if (adminLoading) return; // 관리자 권한 확인 중일 때는 실행하지 않음
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    
    // 이미 실행 중이면 중복 실행 방지
    if (fetchRef.current) return;
    fetchRef.current = true;

    let cancelled = false;

    const fetchData = async () => {
      try {
        const tournamentRef = doc(
          db,
          `associations/${associationId}/tournaments/${tournamentId}`
        );
        const tournamentSnap = await getDoc(tournamentRef);

        if (cancelled) {
          fetchRef.current = false;
          return;
        }

        if (!tournamentSnap.exists()) {
          setLoading(false);
          fetchRef.current = false;
          return;
        }

        const tournamentData = {
          id: tournamentSnap.id,
          ...tournamentSnap.data(),
        } as Tournament;

        if (cancelled) {
          fetchRef.current = false;
          return;
        }

        setTournament(tournamentData);

        const bracketsRef = collection(
          db,
          `associations/${associationId}/tournaments/${tournamentId}/brackets`
        );
        const bracketsSnap = await getDocs(bracketsRef);

        if (cancelled) {
          fetchRef.current = false;
          return;
        }

        const bracketsData: Bracket[] = bracketsSnap.docs.map((d) => ({
          division: d.id as AgeDivision,
          ...d.data(),
        })) as Bracket[];

        setBrackets(bracketsData);
      } catch (error) {
        console.error("[TournamentBracketAdminPage] 로딩 오류:", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
          fetchRef.current = false;
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
      fetchRef.current = false;
    };
  }, [associationId, tournamentId, adminLoading, isAdmin]);

  const handleResultUpdated = async () => {
    // 대진표 다시 로드 (페이지 리로드 대신 데이터만 새로고침)
    try {
      const bracketsRef = collection(
        db,
        `associations/${associationId}/tournaments/${tournamentId}/brackets`
      );
      const bracketsSnap = await getDocs(bracketsRef);

      const bracketsData: Bracket[] = bracketsSnap.docs.map((d) => ({
        division: d.id as AgeDivision,
        ...d.data(),
      })) as Bracket[];

      setBrackets(bracketsData);
    } catch (error) {
      console.error("대진표 새로고침 오류:", error);
    }
  };

  const handleSeedBrackets = async () => {
    if (
      window.confirm(
        "제36회 노원구청장기 축구대회 실제 대진표 데이터를 불러오시겠습니까?"
      )
    ) {
      try {
        await seedRealBracketsToFirestore(associationId!, tournamentId!);
        alert("대진표 데이터가 저장되었습니다.");
        // 데이터만 새로고침
        const bracketsRef = collection(
          db,
          `associations/${associationId}/tournaments/${tournamentId}/brackets`
        );
        const bracketsSnap = await getDocs(bracketsRef);
        const bracketsData: Bracket[] = bracketsSnap.docs.map((d) => ({
          division: d.id as AgeDivision,
          ...d.data(),
        })) as Bracket[];
        setBrackets(bracketsData);
      } catch (error) {
        console.error("대진표 시드 오류:", error);
        alert("대진표 데이터 저장에 실패했습니다.");
      }
    }
  };

  if (adminLoading || loading) {
    return (
      <div className="max-w-6xl mx-auto py-16 px-4">
        <div className="text-center">로딩 중...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-6xl mx-auto py-16 px-4 text-center">
        <p className="text-red-600">관리자 권한이 필요합니다.</p>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="max-w-6xl mx-auto py-16 px-4">
        <div className="text-center">대회를 찾을 수 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="outline"
            onClick={() => navigate(`/association/${associationId}/tournaments/${tournamentId}`)}
            className="mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            대회 상세로
          </Button>
          <h1 className="text-2xl font-bold">{tournament.name}</h1>
          <p className="text-muted-foreground">대진표 관리</p>
        </div>
        {brackets.length === 0 && (
          <Button onClick={handleSeedBrackets}>
            <Upload className="w-4 h-4 mr-2" />
            실제 대진표 불러오기
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={active} onValueChange={(v) => setActive(v as any)} className="space-y-6">
        <TabsList className="w-full flex flex-wrap justify-start rounded-2xl">
          <TabsTrigger value="schedule" className="rounded-xl">
            <Calendar className="w-4 h-4 mr-2" />
            경기장별 일정
          </TabsTrigger>
          <TabsTrigger value="youth" className="rounded-xl">20/30대</TabsTrigger>
          <TabsTrigger value="forty" className="rounded-xl">40대</TabsTrigger>
          <TabsTrigger value="fifty" className="rounded-xl">50대</TabsTrigger>
          <TabsTrigger value="sixty" className="rounded-xl">60대</TabsTrigger>
        </TabsList>

        {/* 경기장별 일정표 탭 */}
        <TabsContent value="schedule" className="space-y-6">
          <VenueSchedule
            brackets={brackets}
            selectedDate={scheduleDate}
            selectedVenue={scheduleVenue}
            onDateChange={setScheduleDate}
            onVenueChange={setScheduleVenue}
            associationId={associationId}
            tournamentId={tournamentId}
          />
        </TabsContent>

        {/* 연령대별 대진표 탭 */}
        <TabsContent value={active} className="space-y-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* 대진표 표시 */}
            <div className="lg:col-span-2">
              {currentBracket ? (
                <BracketDisplay bracket={currentBracket} tournamentName={tournament.name} />
              ) : (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    대진표가 아직 등록되지 않았습니다.
                  </CardContent>
                </Card>
              )}
            </div>

            {/* 경기 결과 입력 */}
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-4">경기 선택</h3>
                  {currentBracket?.matches.map((match) => (
                    <Button
                      key={match.id}
                      variant={selectedMatchId === match.id ? "default" : "outline"}
                      className="w-full mb-2"
                      onClick={() => setSelectedMatchId(match.id)}
                    >
                      {match.matchNumber} - {match.round}
                    </Button>
                  ))}
                </CardContent>
              </Card>

              {selectedMatch && associationId && tournamentId && (
                <MatchResultInput
                  associationId={associationId}
                  tournamentId={tournamentId}
                  division={current}
                  match={selectedMatch}
                  onResultUpdated={handleResultUpdated}
                />
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
