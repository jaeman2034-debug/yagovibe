import { useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  query,
  where,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import { useMyTeams } from "@/hooks/useMyTeams";
import type { SportsHubUserState } from "@/lib/sportsHubRecommendation";
import { normalizeTeamPlan } from "@/lib/monetization/sportsMonetization";
import type { PlanType } from "@/types/plan";
import { pickFederationSlug } from "@/utils/sportHubHref";

const CAP = 220;

function toDate(v: unknown): Date | null {
  if (v == null) return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v;
  if (typeof (v as Timestamp)?.toDate === "function") {
    const d = (v as Timestamp).toDate();
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** 매칭 문서에서 “최근 경기” 판단용 시각: 경기일(date)과 등록일(createdAt) 중 최신 */
function latestMomentFromMatchDoc(data: Record<string, unknown>): Date | null {
  const play = toDate(data.date);
  const created = toDate(data.createdAt);
  const times = [play, created].filter((d): d is Date => d != null).map((d) => d.getTime());
  if (times.length === 0) return null;
  return new Date(Math.max(...times));
}

/**
 * 추천 엔진용 실시간 입력 — KPI 전체(12리스너)와 분리된 경량 스냅샷
 */
export function useSportsHubRecommendationInputs() {
  const { user } = useAuth();
  const { hasTeams, teamIds, teamMembers, loading: teamsLoading } = useMyTeams();
  const primaryTeamId = teamIds[0] ?? "";

  const [profile, setProfile] = useState<Record<string, unknown> | null | undefined>(undefined);
  const [primaryTeamName, setPrimaryTeamName] = useState<string | null>(null);
  const [primaryTeamPlan, setPrimaryTeamPlan] = useState<PlanType>("free");
  const [primaryTeamRegion, setPrimaryTeamRegion] = useState<string | null>(null);

  const [matchAuthorIds, setMatchAuthorIds] = useState<Set<string>>(() => new Set());
  const [requestMatchIds, setRequestMatchIds] = useState<Set<string>>(() => new Set());
  /** 내가 신청자로 보낸 매칭 요청 중 `pending` 건수 (호스트 응답 대기) */
  const [pendingApplicantRequestCount, setPendingApplicantRequestCount] = useState(0);
  const [activityCount, setActivityCount] = useState(0);
  const [teamMemberCount, setTeamMemberCount] = useState(-1);
  const [recentFromMatches, setRecentFromMatches] = useState<Date | null>(null);

  const [metricsReady, setMetricsReady] = useState(false);

  const pendingRef = useRef(0);

  useEffect(() => {
    if (!user?.uid) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    setProfile(undefined);
    getDoc(doc(db, "users", user.uid))
      .then((snap) => {
        if (cancelled) return;
        setProfile(snap.exists() ? (snap.data() as Record<string, unknown>) : null);
      })
      .catch(() => {
        if (!cancelled) setProfile(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  useEffect(() => {
    if (!primaryTeamId) {
      setPrimaryTeamName(null);
      setPrimaryTeamPlan("free");
      setPrimaryTeamRegion(null);
      return;
    }
    let cancelled = false;
    getDoc(doc(db, "teams", primaryTeamId))
      .then((snap) => {
        if (cancelled) return;
        if (!snap.exists()) {
          setPrimaryTeamName(null);
          setPrimaryTeamPlan("free");
          setPrimaryTeamRegion(null);
          return;
        }
        const d = snap.data() as { name?: string; plan?: unknown; region?: string };
        const n = d.name;
        setPrimaryTeamName(typeof n === "string" && n.trim() ? n.trim() : null);
        setPrimaryTeamPlan(normalizeTeamPlan(d.plan));
        const reg = d.region;
        setPrimaryTeamRegion(typeof reg === "string" && reg.trim() ? reg.trim() : null);
      })
      .catch(() => {
        if (!cancelled) {
          setPrimaryTeamName(null);
          setPrimaryTeamPlan("free");
          setPrimaryTeamRegion(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [primaryTeamId]);

  useEffect(() => {
    if (!user?.uid) {
      setMatchAuthorIds(new Set());
      setRequestMatchIds(new Set());
      setPendingApplicantRequestCount(0);
      setActivityCount(0);
      setTeamMemberCount(-1);
      setRecentFromMatches(null);
      setMetricsReady(false);
      return;
    }

    let cancelled = false;
    setMetricsReady(false);
    setTeamMemberCount(-1);
    pendingRef.current = 4;

    const bump = () => {
      pendingRef.current -= 1;
      if (pendingRef.current <= 0 && !cancelled) setMetricsReady(true);
    };

    const uid = user.uid;

    const u1 = onSnapshot(
      query(collection(db, "matches"), where("authorId", "==", uid), limit(CAP)),
      (snap) => {
        if (cancelled) return;
        const ids = new Set<string>();
        let recent: Date | null = null;
        snap.docs.forEach((d) => {
          ids.add(d.id);
          const m = latestMomentFromMatchDoc(d.data() as Record<string, unknown>);
          if (m && (!recent || m.getTime() > recent.getTime())) recent = m;
        });
        setMatchAuthorIds(ids);
        setRecentFromMatches(recent);
        bump();
      },
      () => {
        bump();
      }
    );

    const u2 = onSnapshot(
      query(collection(db, "match_requests"), where("applicantUid", "==", uid), limit(CAP)),
      (snap) => {
        if (cancelled) return;
        const ids = new Set<string>();
        let pendingApplicant = 0;
        snap.docs.forEach((d) => {
          const row = d.data() as { matchId?: string; status?: string };
          const mid = row.matchId;
          if (typeof mid === "string" && mid.trim()) ids.add(mid.trim());
          if (row.status === "pending") pendingApplicant += 1;
        });
        setRequestMatchIds(ids);
        setPendingApplicantRequestCount(pendingApplicant);
        bump();
      },
      () => {
        bump();
      }
    );

    const u3 = onSnapshot(
      query(collection(db, "activities"), where("authorId", "==", uid), limit(CAP)),
      (snap) => {
        if (cancelled) return;
        setActivityCount(snap.size);
        bump();
      },
      () => {
        bump();
      }
    );

    let u4: (() => void) | null = null;

    if (primaryTeamId) {
      u4 = onSnapshot(
        collection(db, "teams", primaryTeamId, "members"),
        (snap) => {
          if (cancelled) return;
          setTeamMemberCount(snap.size);
          bump();
        },
        () => {
          bump();
        }
      );
    } else {
      setTeamMemberCount(0);
      bump();
    }

    return () => {
      cancelled = true;
      u1();
      u2();
      u3();
      u4?.();
    };
  }, [user?.uid, primaryTeamId]);

  const federationJoined = useMemo(
    () => !!pickFederationSlug(profile ?? undefined),
    [profile]
  );

  const userState: SportsHubUserState = useMemo(() => {
    const merged = new Set<string>();
    matchAuthorIds.forEach((id) => merged.add(id));
    requestMatchIds.forEach((id) => merged.add(id));

    return {
      hasTeam: hasTeams,
      primaryTeamId: primaryTeamId,
      matchCount: merged.size,
      recentMatchDate: recentFromMatches,
      teamMemberCount,
      federationJoined,
      activityCount,
    };
  }, [
    hasTeams,
    primaryTeamId,
    matchAuthorIds,
    requestMatchIds,
    recentFromMatches,
    teamMemberCount,
    federationJoined,
    activityCount,
  ]);

  const profileReady = profile !== undefined;
  const loading =
    teamsLoading || !profileReady || (!!user?.uid && !metricsReady);

  return {
    user,
    profile,
    profileReady,
    loading,
    userState,
    hasTeams,
    teamIds,
    teamMembers,
    primaryTeamId,
    primaryTeamName,
    primaryTeamPlan,
    primaryTeamRegion,
    pendingApplicantRequestCount,
  };
}
