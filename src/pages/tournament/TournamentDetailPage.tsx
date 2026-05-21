/**
 * Tournament 상세 페이지
 */

import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Tournament } from "@/types/tournament";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Users, Trophy, ArrowLeft } from "lucide-react";

export function TournamentDetailPage() {
  const { tenantId, tournamentId } = useParams<{ tenantId: string; tournamentId: string }>();
  const navigate = useNavigate();
  const [tournament, setTournament] = React.useState<Tournament | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!tenantId || !tournamentId) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const snap = await getDoc(doc(db, "tournaments", tournamentId));
        if (snap.exists()) {
          setTournament({ id: snap.id, ...snap.data() } as Tournament);
        }
      } catch (error) {
        console.error("[TournamentDetailPage] 로딩 오류:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, [tenantId, tournamentId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4">
        <div className="text-center">로딩 중...</div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4">
        <div className="text-center">대회를 찾을 수 없습니다.</div>
        <Button onClick={() => navigate(-1)} className="mt-4">
          돌아가기
        </Button>
      </div>
    );
  }

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
  };

  return (
    <div className="max-w-4xl mx-auto py-16 px-4">
      <Button
        variant="ghost"
        onClick={() => navigate(-1)}
        className="mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        돌아가기
      </Button>

      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-8 space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-4">{tournament.name}</h1>
            <p className="text-muted-foreground">{tournament.organizer}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">대회 기간</div>
                <div className="font-medium">
                  {formatDate(tournament.startDate)} ~ {formatDate(tournament.endDate)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">장소</div>
                <div className="font-medium">{tournament.location}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">참가 팀</div>
                <div className="font-medium">
                  {tournament.teamCount}팀
                  {tournament.maxTeams && ` / 최대 ${tournament.maxTeams}팀`}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">상태</div>
                <div className="font-medium">
                  {tournament.status === "registration" && "접수중"}
                  {tournament.status === "ongoing" && "진행중"}
                  {tournament.status === "completed" && "종료"}
                  {tournament.status === "cancelled" && "취소"}
                </div>
              </div>
            </div>
          </div>

          {tournament.description && (
            <div>
              <h2 className="text-xl font-semibold mb-2">대회 소개</h2>
              <p className="text-muted-foreground whitespace-pre-line">{tournament.description}</p>
            </div>
          )}

          {tournament.rules && tournament.rules.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-2">대회 규칙</h2>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                {tournament.rules.map((rule, i) => (
                  <li key={i}>{rule}</li>
                ))}
              </ul>
            </div>
          )}

          {tournament.prizes && tournament.prizes.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-2">시상 내역</h2>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                {tournament.prizes.map((prize, i) => (
                  <li key={i}>{prize}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

