/**
 * RC4-3 M3 — Vision Match Detail (Coach)
 * Route: /teams/:teamId/vision/match/:matchId
 */

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { VisionMatchDetailPageShell } from "@/components/vision/VisionMatchDetailPanel";

export default function VisionMatchDetailPage() {
  const { teamId, matchId } = useParams<{ teamId: string; matchId: string }>();
  const [teamName, setTeamName] = useState("팀");

  useEffect(() => {
    if (!teamId) return;
    void getDoc(doc(db, "teams", teamId)).then((snap) => {
      if (snap.exists()) {
        setTeamName(String(snap.data()?.name ?? "팀"));
      }
    });
  }, [teamId]);

  if (!teamId || !matchId) {
    return (
      <div className="p-6 text-center text-red-600">팀 ID와 경기 ID가 필요합니다.</div>
    );
  }

  return (
    <VisionMatchDetailPageShell teamId={teamId} matchId={matchId} teamName={teamName} />
  );
}
