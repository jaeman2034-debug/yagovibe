import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Users, Trophy, Activity } from "lucide-react";
import {
  collection,
  collectionGroup,
  limit,
  onSnapshot,
  query,
  where,
  type QuerySnapshot,
} from "firebase/firestore";
import { AppCard } from "@/components/ui/AppCard";
import { useAuth } from "@/context/AuthProvider";
import { db } from "@/lib/firebase";
import { backfillMyTeamMemberships } from "@/lib/team/backfillMyTeamMemberships";

type KpiState = {
  teams: number;
  matches: number;
  events: number;
  activities: number;
};

const LIST_CAP = 220;
const ACTIVITY_CAP = 500;

/** 소스 쿼리 리스너 개수 (첫 스냅샷·에러 모두 반영 후 로딩 종료) */
const KPI_LISTENER_COUNT = 12;

type TeamBuckets = {
  fromMembersArray: Set<string>;
  fromIndexUserId: Set<string>;
  fromIndexUid: Set<string>;
  fromMembersUserId: Set<string>;
  fromMembersUid: Set<string>;
};

type MatchBuckets = {
  authorId: Set<string>;
  createdBy: Set<string>;
  participants: Set<string>;
  requestMatchIds: Set<string>;
};

type EventBuckets = {
  joinedUserIds: Set<string>;
  participants: Set<string>;
  createdBy: Set<string>;
};

type ActivityBuckets = {
  authorId: Set<string>;
  userId: Set<string>;
};

function computeTeamCount(b: TeamBuckets): number {
  if (b.fromMembersArray.size > 0) return b.fromMembersArray.size;
  return new Set([
    ...b.fromIndexUserId,
    ...b.fromIndexUid,
    ...b.fromMembersUserId,
    ...b.fromMembersUid,
  ]).size;
}

function computeMatchCount(b: MatchBuckets): number {
  const merged = new Set<string>();
  b.authorId.forEach((id) => merged.add(id));
  b.createdBy.forEach((id) => merged.add(id));
  b.participants.forEach((id) => merged.add(id));
  b.requestMatchIds.forEach((id) => merged.add(id));
  return merged.size;
}

function computeEventCount(b: EventBuckets): number {
  const merged = new Set<string>();
  b.joinedUserIds.forEach((id) => merged.add(id));
  b.participants.forEach((id) => merged.add(id));
  b.createdBy.forEach((id) => merged.add(id));
  return merged.size;
}

function computeActivityCount(b: ActivityBuckets): number {
  const merged = new Set<string>();
  b.authorId.forEach((id) => merged.add(id));
  b.userId.forEach((id) => merged.add(id));
  return merged.size;
}

function emptyBuckets() {
  return {
    teams: {
      fromMembersArray: new Set<string>(),
      fromIndexUserId: new Set<string>(),
      fromIndexUid: new Set<string>(),
      fromMembersUserId: new Set<string>(),
      fromMembersUid: new Set<string>(),
    },
    matches: {
      authorId: new Set<string>(),
      createdBy: new Set<string>(),
      participants: new Set<string>(),
      requestMatchIds: new Set<string>(),
    },
    events: {
      joinedUserIds: new Set<string>(),
      participants: new Set<string>(),
      createdBy: new Set<string>(),
    },
    activities: {
      authorId: new Set<string>(),
      userId: new Set<string>(),
    },
  };
}

export function SportsHubKpiCard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState<KpiState>({
    teams: 0,
    matches: 0,
    events: 0,
    activities: 0,
  });
  const [repairTriggered, setRepairTriggered] = useState(false);

  const bucketsRef = useRef(emptyBuckets());

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!user?.uid) {
      bucketsRef.current = emptyBuckets();
      setKpi({ teams: 0, matches: 0, events: 0, activities: 0 });
      setLoading(false);
      return;
    }

    let cancelled = false;
    bucketsRef.current = emptyBuckets();
    setLoading(true);

    let firstSnapshotsPending = KPI_LISTENER_COUNT + 2;

    const bumpFirstReady = () => {
      firstSnapshotsPending -= 1;
      if (firstSnapshotsPending <= 0 && !cancelled) {
        setLoading(false);
      }
    };

    const flush = () => {
      if (cancelled) return;
      const b = bucketsRef.current;
      setKpi({
        teams: computeTeamCount(b.teams),
        matches: computeMatchCount(b.matches),
        events: computeEventCount(b.events),
        activities: computeActivityCount(b.activities),
      });
    };

    const subscribe = (
      q: ReturnType<typeof query>,
      apply: (snap: QuerySnapshot) => void,
      label: string
    ) => {
      let first = true;
      return onSnapshot(
        q,
        (snap) => {
          if (cancelled) return;
          apply(snap);
          flush();
          if (first) {
            first = false;
            bumpFirstReady();
          }
        },
        (err) => {
          console.warn(`[SportsHubKpiCard] ${label}`, err);
          if (first) {
            first = false;
            bumpFirstReady();
          }
        }
      );
    };

    const uid = user.uid;

    const unsubs = [
      subscribe(
        query(collection(db, "teams"), where("members", "array-contains", uid), limit(LIST_CAP)),
        (snap) => {
          bucketsRef.current.teams.fromMembersArray = new Set(snap.docs.map((d) => d.id));
        },
        "teams/members"
      ),
      subscribe(
        query(collection(db, "team_members"), where("userId", "==", uid), limit(LIST_CAP)),
        (snap) => {
          const s = new Set<string>();
          snap.docs.forEach((d) => {
            const t = (d.data() as { teamId?: string }).teamId;
            if (typeof t === "string" && t.trim()) s.add(t.trim());
          });
          bucketsRef.current.teams.fromIndexUserId = s;
        },
        "team_members/userId"
      ),
      subscribe(
        query(collection(db, "team_members"), where("uid", "==", uid), limit(LIST_CAP)),
        (snap) => {
          const s = new Set<string>();
          snap.docs.forEach((d) => {
            const t = (d.data() as { teamId?: string }).teamId;
            if (typeof t === "string" && t.trim()) s.add(t.trim());
          });
          bucketsRef.current.teams.fromIndexUid = s;
        },
        "team_members/uid"
      ),
      subscribe(
        query(collectionGroup(db, "members"), where("userId", "==", uid), limit(LIST_CAP)),
        (snap) => {
          const s = new Set<string>();
          snap.docs.forEach((d) => {
            const t = d.ref.parent?.parent?.id;
            if (typeof t === "string" && t.trim()) s.add(t.trim());
          });
          bucketsRef.current.teams.fromMembersUserId = s;
        },
        "members/userId"
      ),
      subscribe(
        query(collectionGroup(db, "members"), where("uid", "==", uid), limit(LIST_CAP)),
        (snap) => {
          const s = new Set<string>();
          snap.docs.forEach((d) => {
            const t = d.ref.parent?.parent?.id;
            if (typeof t === "string" && t.trim()) s.add(t.trim());
          });
          bucketsRef.current.teams.fromMembersUid = s;
        },
        "members/uid"
      ),
      subscribe(
        query(collection(db, "matches"), where("authorId", "==", uid), limit(LIST_CAP)),
        (snap) => {
          bucketsRef.current.matches.authorId = new Set(snap.docs.map((d) => d.id));
        },
        "matches/authorId"
      ),
      subscribe(
        query(collection(db, "matches"), where("createdBy", "==", uid), limit(LIST_CAP)),
        (snap) => {
          bucketsRef.current.matches.createdBy = new Set(snap.docs.map((d) => d.id));
        },
        "matches/createdBy"
      ),
      subscribe(
        query(collection(db, "matches"), where("participants", "array-contains", uid), limit(LIST_CAP)),
        (snap) => {
          bucketsRef.current.matches.participants = new Set(snap.docs.map((d) => d.id));
        },
        "matches/participants"
      ),
      subscribe(
        query(collection(db, "match_requests"), where("applicantUid", "==", uid), limit(LIST_CAP)),
        (snap) => {
          const s = new Set<string>();
          snap.docs.forEach((d) => {
            const mid = (d.data() as { matchId?: string }).matchId;
            if (typeof mid === "string" && mid.trim()) s.add(mid.trim());
          });
          bucketsRef.current.matches.requestMatchIds = s;
        },
        "match_requests"
      ),
      subscribe(
        query(collection(db, "events"), where("joinedUserIds", "array-contains", uid), limit(LIST_CAP)),
        (snap) => {
          bucketsRef.current.events.joinedUserIds = new Set(snap.docs.map((d) => d.id));
        },
        "events/joinedUserIds"
      ),
      subscribe(
        query(collection(db, "events"), where("participants", "array-contains", uid), limit(LIST_CAP)),
        (snap) => {
          bucketsRef.current.events.participants = new Set(snap.docs.map((d) => d.id));
        },
        "events/participants"
      ),
      subscribe(
        query(collection(db, "events"), where("createdBy", "==", uid), limit(LIST_CAP)),
        (snap) => {
          bucketsRef.current.events.createdBy = new Set(snap.docs.map((d) => d.id));
        },
        "events/createdBy"
      ),
      subscribe(
        query(collection(db, "activities"), where("authorId", "==", uid), limit(ACTIVITY_CAP)),
        (snap) => {
          bucketsRef.current.activities.authorId = new Set(snap.docs.map((d) => d.id));
        },
        "activities/authorId"
      ),
      subscribe(
        query(collection(db, "activities"), where("userId", "==", uid), limit(ACTIVITY_CAP)),
        (snap) => {
          bucketsRef.current.activities.userId = new Set(snap.docs.map((d) => d.id));
        },
        "activities/userId"
      ),
    ];

    return () => {
      cancelled = true;
      unsubs.forEach((u) => u());
    };
  }, [authLoading, user?.uid]);

  useEffect(() => {
    if (!user?.uid || authLoading || loading) return;
    if (repairTriggered) return;
    if (kpi.teams > 0) return;
    const onceKey = `sporthub_kpi_backfill_once_${user.uid}`;
    if (sessionStorage.getItem(onceKey) === "done") return;
    setRepairTriggered(true);
    sessionStorage.setItem(onceKey, "done");
    void backfillMyTeamMemberships().catch((err) => {
      console.warn(
        "[SportsHubKpiCard] backfillMyTeamMemberships 실패 (상세: [backfillMyTeamMemberships] callable 실패 로그 참고):",
        err instanceof Error ? err.message : err
      );
    });
  }, [user?.uid, authLoading, loading, kpi.teams, repairTriggered]);

  if (authLoading || loading) {
    return (
      <AppCard className="mb-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">데이터 불러오는 중…</p>
      </AppCard>
    );
  }

  const cells: Array<{
    label: string;
    value: number;
    unit: string;
    icon: typeof Users;
    onClick: () => void;
  }> = [
    { label: "내 팀", value: kpi.teams, unit: "개", icon: Users, onClick: () => navigate("/sports?tab=team") },
    { label: "경기", value: kpi.matches, unit: "개", icon: Trophy, onClick: () => navigate("/sports/match") },
    { label: "이벤트", value: kpi.events, unit: "개", icon: Calendar, onClick: () => navigate("/sports?tab=event") },
    { label: "활동", value: kpi.activities, unit: "건", icon: Activity, onClick: () => navigate("/hub") },
  ];

  return (
    <AppCard className="mb-6">
      {!user?.uid && !authLoading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">로그인하면 내 팀·경기·활동 요약을 볼 수 있어요.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 text-center">
          {cells.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={c.onClick}
              className="w-full rounded-lg border border-gray-100 bg-gray-50/80 px-2 py-3 text-center transition hover:bg-gray-100/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:bg-gray-800"
            >
              <div className="mb-1 flex items-center justify-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <c.icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>{c.label}</span>
              </div>
              <p className="text-center text-lg font-semibold tabular-nums transition-all duration-300 text-gray-900 dark:text-gray-100">
                {c.value}
                <span className="ml-0.5 text-sm font-normal text-gray-500 dark:text-gray-400">{c.unit}</span>
              </p>
            </button>
          ))}
        </div>
      )}
    </AppCard>
  );
}
