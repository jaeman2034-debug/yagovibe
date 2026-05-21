import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import type { TeamMatchFeedbackFirestoreDoc } from "@/types/playMatchFeedback";
import { teamMatchFeedbackDocRef } from "@/services/matchPlayFeedbackService";

export function usePlayMatchFeedbackStatus(
  teamId: string | undefined,
  matchId: string | undefined,
  memberId: string | undefined
) {
  const [submitted, setSubmitted] = useState(false);
  const [data, setData] = useState<TeamMatchFeedbackFirestoreDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tid = teamId?.trim();
    const mid = matchId?.trim();
    const mem = memberId?.trim();
    if (!tid || !mid || !mem) {
      setSubmitted(false);
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const ref = teamMatchFeedbackDocRef(tid, mid, mem);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setSubmitted(false);
          setData(null);
        } else {
          setSubmitted(true);
          setData(snap.data() as TeamMatchFeedbackFirestoreDoc);
        }
        setLoading(false);
      },
      () => {
        setSubmitted(false);
        setData(null);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [teamId, matchId, memberId]);

  return { submitted, data, loading };
}
