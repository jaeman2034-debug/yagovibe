import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

function displayNameFromMemberDoc(m: Record<string, unknown>): string {
  const dn =
    typeof m.displayName === "string" && m.displayName.trim()
      ? m.displayName.trim()
      : typeof m.name === "string" && m.name.trim()
        ? m.name.trim()
        : "";
  return dn || "팀원";
}

/** Linked Auth가 있는 활성 멤버 수 vs 해당 경기 피드백 제출 수 · 미제출자 표시용 */
export function useMatchFeedbackProgress(teamId: string | undefined, matchId: string | undefined) {
  const [feedbackCount, setFeedbackCount] = useState(0);
  const [eligibleMemberCount, setEligibleMemberCount] = useState(0);
  const [pendingNames, setPendingNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tid = teamId?.trim();
    const mid = matchId?.trim();
    if (!tid || !mid) {
      setFeedbackCount(0);
      setEligibleMemberCount(0);
      setPendingNames([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const membersCol = collection(db, "teams", tid, "members");
    const fbCol = collection(db, "teams", tid, "matches", mid, "feedbacks");

    let latestMembersSnap: Record<string, { userId: string; name: string }> | null = null;
    let latestFeedbackIds: Set<string> | null = null;

    let membersReady = false;
    let fbReady = false;

    const reconcilePending = () => {
      if (!latestMembersSnap || !latestFeedbackIds) return;
      const pending: string[] = [];
      for (const id of Object.keys(latestMembersSnap)) {
        if (!latestFeedbackIds.has(id)) pending.push(latestMembersSnap[id].name);
      }
      pending.sort((a, b) => a.localeCompare(b, "ko"));
      setPendingNames(pending);
    };

    const checkDone = () => {
      if (membersReady && fbReady) setLoading(false);
    };

    const unsubM = onSnapshot(
      membersCol,
      (snap) => {
        const map: Record<string, { userId: string; name: string }> = {};
        let n = 0;
        for (const d of snap.docs) {
          const raw = d.data() as Record<string, unknown>;
          if (raw.isDeleted === true) continue;
          const uid = typeof raw.userId === "string" ? raw.userId.trim() : "";
          if (!uid) continue;
          n += 1;
          map[d.id] = { userId: uid, name: displayNameFromMemberDoc(raw) };
        }
        latestMembersSnap = map;
        setEligibleMemberCount(n);
        reconcilePending();
        membersReady = true;
        checkDone();
      },
      () => {
        setEligibleMemberCount(0);
        setPendingNames([]);
        latestMembersSnap = null;
        membersReady = true;
        checkDone();
      }
    );

    const unsubF = onSnapshot(
      fbCol,
      (snap) => {
        latestFeedbackIds = new Set(snap.docs.map((d) => d.id));
        setFeedbackCount(snap.size);
        reconcilePending();
        fbReady = true;
        checkDone();
      },
      () => {
        latestFeedbackIds = null;
        setFeedbackCount(0);
        setPendingNames([]);
        fbReady = true;
        checkDone();
      }
    );

    return () => {
      unsubM();
      unsubF();
    };
  }, [teamId, matchId]);

  const ratioLabel = useMemo(() => {
    if (eligibleMemberCount <= 0) return "연동된 팀원 수를 계산하는 중…";
    return `${feedbackCount} / ${eligibleMemberCount}명 피드백 완료`;
  }, [feedbackCount, eligibleMemberCount]);

  return { feedbackCount, eligibleMemberCount, ratioLabel, loading, pendingNames };
}
