/**
 * 🔥 Match Result Page
 * 
 * 역할:
 * - 경기 결과 입력 페이지
 * - 선수 기록 입력으로 이동
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { MatchResultInput } from "@/components/admin/MatchResultInput";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EventMatch } from "@/types/event";

export default function MatchResultPage() {
  const { orgId, eventId, matchId } = useParams<{
    orgId: string;
    eventId: string;
    matchId: string;
  }>();
  const navigate = useNavigate();
  const [match, setMatch] = useState<EventMatch | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMatch();
  }, [matchId]);

  const loadMatch = async () => {
    if (!matchId) return;

    try {
      setLoading(true);
      const matchRef = doc(db, "event_matches", matchId);
      const matchSnap = await getDoc(matchRef);

      if (matchSnap.exists()) {
        setMatch({
          id: matchSnap.id,
          ...matchSnap.data(),
        } as EventMatch);
      } else {
        console.error("경기를 찾을 수 없습니다.");
      }
    } catch (error) {
      console.error("경기 로드 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaved = () => {
    // 저장 후 리프레시
    loadMatch();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-600">경기를 찾을 수 없습니다.</p>
            <Button
              onClick={() => navigate(-1)}
              className="mt-4"
              variant="outline"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              뒤로 가기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button
            onClick={() => navigate(-1)}
            variant="ghost"
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            뒤로 가기
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">경기 결과 입력</h1>
        </div>

        <MatchResultInput
          match={match}
          eventId={eventId!}
          organizationId={orgId}
          onSaved={handleSaved}
        />
      </div>
    </div>
  );
}
