import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { Activity, Calendar, Package } from "lucide-react";
import { normalizeSportId } from "@/constants/sports";
import { sportMarketDetailUrl } from "@/utils/sportHubHref";

interface UserProfile {
  id: string;
  name?: string;
  avatar?: string;
  ratingAvg?: number;
  reviewCount?: number;
}

export default function ProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"market" | "match" | "activity" | "reviews">("market");

  useEffect(() => {
    const load = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, "users", userId));
        if (snap.exists()) {
          setUser({ id: snap.id, ...(snap.data() as any) });
        } else {
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [userId]);

  const ratingAvg = useMemo(() => {
    const val = Number(user?.ratingAvg || 0);
    return Math.round(val * 10) / 10;
  }, [user?.ratingAvg]);

  if (!userId) return <div className="p-4">프로필을 찾을 수 없습니다.</div>;

  if (loading) {
    return (
      <div className="min-h-screen w-full max-w-none bg-gray-50 px-0 py-8 text-sm text-gray-500">
        불러오는 중…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen w-full max-w-none bg-gray-50 px-4 py-8 text-sm text-gray-600">
        사용자를 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full max-w-none bg-gray-50">
      <div className="border-b border-gray-100 bg-white">
        <ProfileHeader user={{ ...user, ratingAvg }} />
      </div>
      <div className="grid grid-cols-4 border-b border-gray-100 bg-white text-sm">
        {(
          [
            ["market", "거래"],
            ["match", "경기"],
            ["activity", "활동"],
            ["reviews", "리뷰"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`py-2.5 text-center ${
              tab === key ? "border-b-2 border-blue-600 font-semibold text-gray-900" : "text-gray-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "market" && <UserPosts userId={userId} />}
      {tab === "match" && <UserMatches userId={userId} />}
      {tab === "activity" && <UserActivities userId={userId} />}
      {tab === "reviews" && <UserReviews userId={userId} />}
    </div>
  );
}


function ProfileHeader({ user }: { user: any }) {
  const photo =
    (typeof user?.photoURL === "string" && user.photoURL) ||
    (typeof user?.avatar === "string" && user.avatar) ||
    "";
  const displayName =
    (typeof user?.displayName === "string" && user.displayName.trim()) ||
    (typeof user?.name === "string" && user.name.trim()) ||
    "사용자";

  return (
    <div className="flex items-center gap-4 p-4">
      <div className="w-16 h-16 bg-gray-200 rounded-full overflow-hidden">
        {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : null}
      </div>
      <div>
        <p className="text-lg font-semibold">{displayName}</p>
        <p className="text-sm text-gray-500">
          ⭐ <span className="font-semibold">{(user?.ratingAvg || 0).toFixed ? user.ratingAvg.toFixed(1) : (user?.ratingAvg || 0)}</span> ({user?.reviewCount || 0})
        </p>
      </div>
    </div>
  );
}

function marketCreatedAtMs(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof (v as { toMillis?: () => number }).toMillis === "function") {
    return (v as { toMillis: () => number }).toMillis();
  }
  if (typeof (v as { seconds?: number }).seconds === "number") {
    return (v as { seconds: number }).seconds * 1000;
  }
  const d = new Date(v as string | Date);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function marketStatusLabel(status: string | undefined): string {
  switch (status) {
    case "done":
    case "completed":
      return "거래완료";
    case "reserved":
      return "예약중";
    case "hidden":
      return "숨김";
    case "active":
    case "open":
      return "판매중";
    default:
      return "게시중";
  }
}

function marketStatusClasses(status: string | undefined): string {
  switch (status) {
    case "open":
    case "active":
      return "bg-emerald-100 text-emerald-800";
    case "reserved":
      return "bg-amber-100 text-amber-800";
    case "done":
    case "completed":
      return "bg-gray-100 text-gray-600";
    case "hidden":
      return "bg-gray-100 text-gray-500";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function marketPostThumb(post: { thumbnailUrl?: string; images?: string[] }): string | undefined {
  if (typeof post.thumbnailUrl === "string" && post.thumbnailUrl.trim()) {
    return post.thumbnailUrl.trim();
  }
  const first = Array.isArray(post.images) ? post.images[0] : undefined;
  if (typeof first === "string" && first.trim()) return first.trim();
  return undefined;
}

/** 프로필 거래 탭용 — 허브 SSOT `marketPosts` → 레거시 `market` → 원본 `marketProducts` 순으로 한 번만 채움 */
function docToProfileTradeRow(id: string, data: Record<string, unknown>) {
  const titleRaw = (data.title ?? data.name ?? "") as string;
  const title = typeof titleRaw === "string" && titleRaw.trim() ? titleRaw.trim() : "제목 없음";
  const images = Array.isArray(data.images)
    ? (data.images as string[])
    : Array.isArray(data.imageUrls)
      ? (data.imageUrls as string[])
      : typeof data.imageUrl === "string" && data.imageUrl.trim()
        ? [data.imageUrl.trim()]
        : [];
  const thumbnailUrl =
    (typeof data.thumbnailUrl === "string" && data.thumbnailUrl.trim()) ||
    (typeof images[0] === "string" ? images[0] : undefined);
  const sport = (data.sport ?? data.sportCategory ?? "soccer") as string;
  const status = (data.status ?? "active") as string | undefined;
  return {
    id,
    title,
    images,
    thumbnailUrl,
    sport,
    status,
    createdAt: data.createdAt,
  };
}

async function fetchDocsPreferOrdered(
  col: string,
  field: string,
  uid: string,
  orderedLimit: number,
  fallbackLimit: number
) {
  try {
    const snap = await getDocs(
      query(
        collection(db, col),
        where(field, "==", uid),
        orderBy("createdAt", "desc"),
        limit(orderedLimit)
      )
    );
    return snap.docs;
  } catch {
    const snap = await getDocs(
      query(collection(db, col), where(field, "==", uid), limit(fallbackLimit))
    );
    return snap.docs;
  }
}

function UserPosts({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const merged = new Map<string, ReturnType<typeof docToProfileTradeRow>>();

        const mergeDocs = (docs: { id: string; data: () => Record<string, unknown> }[]) => {
          for (const d of docs) {
            if (merged.has(d.id)) continue;
            merged.set(d.id, docToProfileTradeRow(d.id, d.data() as Record<string, unknown>));
          }
        };

        const [
          postsHub,
          postsBySellerField,
          marketByAuthor,
          marketByUserId,
          productsByUser,
          productsBySeller,
        ] = await Promise.all([
          fetchDocsPreferOrdered("marketPosts", "authorId", userId, 24, 48).catch(() => []),
          fetchDocsPreferOrdered("marketPosts", "sellerId", userId, 24, 48).catch(() => []),
          fetchDocsPreferOrdered("market", "authorId", userId, 24, 48).catch(() => []),
          getDocs(query(collection(db, "market"), where("userId", "==", userId), limit(48))).then((s) => s.docs).catch(() => []),
          fetchDocsPreferOrdered("marketProducts", "userId", userId, 24, 48).catch(() => []),
          fetchDocsPreferOrdered("marketProducts", "sellerId", userId, 24, 48).catch(() => []),
        ]);

        mergeDocs(postsHub);
        mergeDocs(postsBySellerField);
        mergeDocs(marketByAuthor);
        mergeDocs(marketByUserId);
        mergeDocs(productsByUser);
        mergeDocs(productsBySeller);

        const list = [...merged.values()].sort(
          (a, b) => marketCreatedAtMs(b.createdAt) - marketCreatedAtMs(a.createdAt)
        );
        setPosts(list.slice(0, 20));
      } catch {
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [userId]);

  if (loading) {
    return <p className="p-4 text-sm text-gray-500">거래글 불러오는 중…</p>;
  }

  return (
    <div className="space-y-3 p-4">
      {posts.length === 0 && (
        <div
          className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/90 px-4 py-12 text-center"
          role="status"
        >
          <Package className="mb-3 h-10 w-10 text-gray-300" aria-hidden />
          <p className="text-sm font-medium text-gray-800">등록된 거래글이 없습니다</p>
          <p className="mt-1 max-w-xs text-xs text-gray-500">
            아직 마켓에 올린 글이 없거나, 비공개 상태일 수 있어요
          </p>
        </div>
      )}
      {posts.map((p) => {
        const sportSlug = normalizeSportId(p.sport) || "soccer";
        const thumb = marketPostThumb(p);
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => navigate(sportMarketDetailUrl(sportSlug, p.id))}
            className="flex w-full gap-3 rounded-lg border p-3 text-left transition hover:-translate-y-0.5 hover:bg-gray-50 hover:shadow-sm"
          >
            {thumb ? (
              <img
                src={thumb}
                alt=""
                className="h-16 w-16 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-300"
                aria-hidden
              >
                <Package className="h-7 w-7" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm font-semibold text-gray-900">
                {p.title || "제목 없음"}
              </p>
              <span
                className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${marketStatusClasses(p.status)}`}
              >
                {marketStatusLabel(p.status)}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function formatMatchDateField(d: unknown): string {
  try {
    if (d == null) return "";
    const dt =
      typeof (d as { toDate?: () => Date }).toDate === "function"
        ? (d as { toDate: () => Date }).toDate()
        : new Date(d as string | number);
    if (Number.isNaN(dt.getTime())) return "";
    return dt.toLocaleDateString("ko-KR");
  } catch {
    return "";
  }
}

function matchDocStatusLabel(status: string | undefined): string {
  switch (status) {
    case "open":
      return "모집중";
    case "matched":
      return "매칭됨";
    case "finished":
      return "종료";
    default:
      return "진행";
  }
}

function matchRequestStatusLabel(status: string | undefined): string {
  switch (status) {
    case "pending":
      return "대기중";
    case "accepted":
      return "수락됨";
    case "rejected":
      return "거절·마감";
    default:
      return status || "—";
  }
}

function activityKindLabel(type: string | undefined, refType?: string): string {
  if (type === "match_join_requested") return "참여 신청";
  if (type === "match_confirmed") return "매칭 확정";
  if (type === "match_created" || refType === "match") return "매칭";
  if (type === "recruit_created") return "모집";
  if (type === "team_created") return "팀";
  if (type === "team_event") return "일정";
  if (type === "equipment_created") return "장비";
  if (type === "market_created") return "마켓";
  return "활동";
}

function navigateForProfileActivity(
  navigate: ReturnType<typeof useNavigate>,
  item: { type?: string; refType?: string; refId?: string; sport?: string }
) {
  const refId = item.refId?.trim();
  if (!refId) return;
  const sportSlug = normalizeSportId(item.sport) || "soccer";
  const refType = item.refType;
  const t = item.type;

  if (
    refType === "match" ||
    t === "match_created" ||
    t === "match_join_requested" ||
    t === "match_confirmed"
  ) {
    navigate(`/match/${refId}`);
    return;
  }
  if (refType === "recruit" || t === "recruit_created") {
    navigate(`/sports/${sportSlug}/recruit/${refId}`);
    return;
  }
  if (refType === "teams" || t === "team_created") {
    navigate(`/teams/${encodeURIComponent(refId)}/play`);
    return;
  }
  if (refType === "events" || t === "team_event") {
    navigate(`/sports/${sportSlug}/event/${refId}`);
    return;
  }
  if (refType === "market" || refType === "equipment" || t === "market_created" || t === "equipment_created") {
    navigate(sportMarketDetailUrl(sportSlug, refId));
    return;
  }
  navigate(sportMarketDetailUrl(sportSlug, refId));
}

function UserMatches({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const [created, setCreated] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const runCreated = async () => {
        try {
          const q = query(
            collection(db, "matches"),
            where("authorId", "==", userId),
            orderBy("createdAt", "desc"),
            limit(15)
          );
          const snap = await getDocs(q);
          return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        } catch {
          try {
            const q2 = query(
              collection(db, "matches"),
              where("authorId", "==", userId),
              limit(30)
            );
            const snap = await getDocs(q2);
            const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
            list.sort((a, b) => marketCreatedAtMs(b.createdAt) - marketCreatedAtMs(a.createdAt));
            return list.slice(0, 15);
          } catch {
            return [];
          }
        }
      };

      const runRequests = async () => {
        try {
          const q = query(
            collection(db, "match_requests"),
            where("applicantUid", "==", userId),
            orderBy("createdAt", "desc"),
            limit(25)
          );
          const snap = await getDocs(q);
          return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        } catch {
          try {
            const q2 = query(
              collection(db, "match_requests"),
              where("applicantUid", "==", userId),
              limit(40)
            );
            const snap = await getDocs(q2);
            const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
            list.sort((a, b) => marketCreatedAtMs(b.createdAt) - marketCreatedAtMs(a.createdAt));
            return list.slice(0, 25);
          } catch {
            return [];
          }
        }
      };

      try {
        const [c, r] = await Promise.all([runCreated(), runRequests()]);
        setCreated(c);
        setRequests(r);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [userId]);

  if (loading) {
    return <p className="p-4 text-sm text-gray-500">경기 정보 불러오는 중…</p>;
  }

  const emptyBoth = created.length === 0 && requests.length === 0;

  return (
    <div className="space-y-8 p-4">
      {emptyBoth && (
        <div
          className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/90 px-4 py-12 text-center"
          role="status"
        >
          <Calendar className="mb-3 h-10 w-10 text-gray-300" aria-hidden />
          <p className="text-sm font-medium text-gray-800">등록된 경기 활동이 없습니다</p>
          <p className="mt-1 max-w-xs text-xs text-gray-500">
            올린 매칭 글이나 다른 팀 매칭 참여 신청 내역이 없어요
          </p>
        </div>
      )}

      {!emptyBoth && (
        <>
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              올린 매칭
            </h3>
            {created.length === 0 ? (
              <p className="text-sm text-gray-500">올린 매칭 글이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {created.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => navigate(`/match/${m.id}`)}
                    className="w-full rounded-lg border p-3 text-left transition hover:-translate-y-0.5 hover:bg-gray-50 hover:shadow-sm"
                  >
                    <p className="text-sm font-semibold text-gray-900">
                      {m.teamName || "매칭"} · {formatMatchDateField(m.date)} {m.time || ""}
                    </p>
                    <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                      {matchDocStatusLabel(m.status)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              참여·신청
            </h3>
            {requests.length === 0 ? (
              <p className="text-sm text-gray-500">참여 신청 내역이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {requests.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => r.matchId && navigate(`/match/${r.matchId}`)}
                    disabled={!r.matchId}
                    className="w-full rounded-lg border p-3 text-left transition hover:-translate-y-0.5 hover:bg-gray-50 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <p className="text-sm font-semibold text-gray-900">
                      {r.teamName || "팀"} · 매칭 신청
                    </p>
                    <span className="mt-1 inline-block rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-800">
                      {matchRequestStatusLabel(r.status)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function UserActivities({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, "activities"),
          where("authorId", "==", userId),
          orderBy("createdAt", "desc"),
          limit(25)
        );
        const snap = await getDocs(q);
        setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      } catch {
        try {
          const q2 = query(
            collection(db, "activities"),
            where("authorId", "==", userId),
            limit(40)
          );
          const snap = await getDocs(q2);
          const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
          list.sort((a, b) => {
            const ma = typeof a.createdAtMillis === "number" ? a.createdAtMillis : marketCreatedAtMs(a.createdAt);
            const mb = typeof b.createdAtMillis === "number" ? b.createdAtMillis : marketCreatedAtMs(b.createdAt);
            return mb - ma;
          });
          setItems(list.slice(0, 25));
        } catch {
          setItems([]);
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [userId]);

  if (loading) {
    return <p className="p-4 text-sm text-gray-500">활동 불러오는 중…</p>;
  }

  return (
    <div className="space-y-3 p-4">
      {items.length === 0 && (
        <div
          className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/90 px-4 py-12 text-center"
          role="status"
        >
          <Activity className="mb-3 h-10 w-10 text-gray-300" aria-hidden />
          <p className="text-sm font-medium text-gray-800">공개 활동이 없습니다</p>
          <p className="mt-1 max-w-xs text-xs text-gray-500">
            피드에 올라간 글·매칭·모집 활동이 있으면 여기에 표시돼요
          </p>
        </div>
      )}
      {items.map((row) => {
        const kind = activityKindLabel(row.type, row.refType);
        const thumb =
          typeof row.thumbnailUrl === "string" && row.thumbnailUrl.trim()
            ? row.thumbnailUrl.trim()
            : undefined;
        return (
          <button
            key={row.id}
            type="button"
            onClick={() => navigateForProfileActivity(navigate, row)}
            className="flex w-full gap-3 rounded-lg border p-3 text-left transition hover:-translate-y-0.5 hover:bg-gray-50 hover:shadow-sm"
          >
            {thumb ? (
              <img src={thumb} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-400">
                <Activity className="h-7 w-7" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                {kind}
              </p>
              <p className="line-clamp-2 text-sm font-semibold text-gray-900">{row.title || "활동"}</p>
              {row.summary ? (
                <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">{row.summary}</p>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function UserReviews({ userId }: { userId: string }) {
  const [reviews, setReviews] = useState<any[]>([]);
  useEffect(() => {
    const load = async () => {
      const q = query(
        collection(db, "reviews"),
        where("targetUserId", "==", userId),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      setReviews(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    };
    void load();
  }, [userId]);

  return (
    <div className="p-4 space-y-3">
      {reviews.length === 0 && <p className="text-sm text-gray-500">아직 리뷰가 없습니다.</p>}
      {reviews.map((r) => (
        <div key={r.id} className="border rounded p-3">
          <p className="text-sm">{Array.from({ length: r.rating || 0 }).map((_, i) => "⭐").join("")}</p>
          {r.comment && <p className="text-sm text-gray-600 mt-1">{r.comment}</p>}
          {r.createdAt && (
            <p className="text-xs text-gray-400 mt-1">
              {(() => {
                const d = r.createdAt?.toDate?.() || new Date(r.createdAt);
                return d?.toLocaleDateString?.("ko-KR") || "";
              })()}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

