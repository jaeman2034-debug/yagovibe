import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import type { ExperimentVariantBucket, TeamExperimentDoc } from "../types/teamNotificationExperiment";

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function parseBucket(raw: unknown): ExperimentVariantBucket {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    sent: num(o.sent),
    opened: num(o.opened),
    clicked: num(o.clicked),
    converted: num(o.converted),
    reRegisterConverted: num(o.reRegisterConverted),
  };
}

function parseExperimentDoc(experimentId: string, data: Record<string, unknown>): TeamExperimentDoc {
  const winner = data.winner === "A" || data.winner === "B" ? data.winner : undefined;
  const rollout = typeof data.rollout === "string" ? data.rollout : undefined;
  return {
    experimentId,
    variantA: parseBucket(data.variantA),
    variantB: parseBucket(data.variantB),
    updatedAt: data.updatedAt,
    winner,
    decidedAt: data.decidedAt,
    rollout,
  };
}

export function useTeamNotificationExperiment(teamId: string | undefined, experimentId: string) {
  const [docData, setDocData] = useState<TeamExperimentDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    if (!teamId || !experimentId) {
      setLoading(false);
      setDocData(null);
      return;
    }
    const ref = doc(db, "teams", teamId, "experiments", experimentId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setLoading(false);
        setPermissionDenied(false);
        if (!snap.exists()) {
          setDocData(null);
          return;
        }
        setDocData(parseExperimentDoc(experimentId, snap.data() as Record<string, unknown>));
      },
      (err) => {
        setLoading(false);
        setDocData(null);
        const code = (err as { code?: string })?.code;
        if (code === "permission-denied") {
          setPermissionDenied(true);
        }
      }
    );
    return () => unsub();
  }, [teamId, experimentId]);

  return { docData, loading, permissionDenied };
}
