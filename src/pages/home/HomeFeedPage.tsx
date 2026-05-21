import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, limit, orderBy, query } from "firebase/firestore";
import MarketPostCard from "@/components/market/MarketPostCard";
import type { MarketPost, Sport } from "@/types/market";
import { useAuth } from "@/context/AuthProvider";
import { Link } from "react-router-dom";

export default function HomeFeedPage() {
  return (
    <div className="max-w-[720px] mx-auto">
      <RecommendSection />
      <TopPostsSection />
      <TopUsersSection />
      <RecentSection />
    </div>
  );
}

function RecommendSection() {
  const { user } = useAuth();
  const [interests, setInterests] = useState<string[]>([]);
  const [posts, setPosts] = useState<MarketPost[]>([]);
  const [loading, setLoading] = useState(true);

  // 내 관심사 로드 (users/{uid}.interests)
  useEffect(() => {
    const loadUser = async () => {
      if (!user?.uid) {
        setInterests([]);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        const data = snap.exists() ? (snap.data() as any) : null;
        setInterests((data?.interests as string[]) || []);
      } catch {
        setInterests([]);
      }
    };
    void loadUser();
  }, [user?.uid]);

  // 후보 포스트 로드 (최근 글 중심)
  useEffect(() => {
    const loadPosts = async () => {
      try {
        setLoading(true);
        // 최근 100개 정도에서 추천 점수 계산 (MVP)
        const q = query(
          collection(db, "marketPosts"),
          orderBy("createdAt", "desc"),
          limit(100)
        );
        const snap = await getDocs(q);
        setPosts(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as MarketPost[]
        );
      } finally {
        setLoading(false);
      }
    };
    void loadPosts();
  }, []);

  const scored = useMemo(() => {
    const now = Date.now();
    return posts
      .map((p) => {
        const like = (p as any).likeCount || (p as any).likesCount || 0;
        const view = (p as any).viewCount || (p as any).views || 0;
        const createdAtMs =
          (p as any).createdAt?.toDate?.()?.getTime?.() ||
          (p as any).createdAt?.seconds * 1000 ||
          0;
        const isRecent = createdAtMs > 0 && now - createdAtMs < 1000 * 60 * 60 * 72; // 72시간
        let score = like * 2 + view + (isRecent ? 10 : 0);
        if (interests && interests.includes((p as any).sport)) {
          score += 20;
        }
        return { post: p, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }, [posts, interests]);

  return (
    <section className="p-4">
      <h2 className="text-lg font-semibold mb-3">✨ 추천 거래</h2>
      <div className="space-y-3">
        {loading && <div className="text-sm text-gray-500">불러오는 중...</div>}
        {!loading && scored.length === 0 && (
          <div className="text-sm text-gray-500">추천할 거래가 없습니다.</div>
        )}
        {scored.map(({ post }, idx) => (
          <MarketPostCard
            key={post.id}
            post={post}
            contextSport={(post.sport || "all") as Sport}
            showSportBadge
            rank={idx + 1}
          />
        ))}
      </div>
    </section>
  );
}

function TopPostsSection() {
  const [posts, setPosts] = useState<MarketPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const q = query(
          collection(db, "marketPosts"),
          orderBy("createdAt", "desc"),
          limit(100)
        );
        const snap = await getDocs(q);
        setPosts(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as MarketPost[]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const ranked = useMemo(() => {
    return posts
      .map((p) => {
        const like = (p as any).likeCount || (p as any).likesCount || 0;
        const view = (p as any).viewCount || (p as any).views || 0;
        const score = like * 2 + view;
        return { post: p, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }, [posts]);

  return (
    <section className="p-4">
      <h2 className="text-lg font-semibold mb-3">🔥 인기 거래</h2>
      <div className="space-y-3">
        {loading && <div className="text-sm text-gray-500">불러오는 중...</div>}
        {!loading && ranked.length === 0 && (
          <div className="text-sm text-gray-500">인기 거래가 없습니다.</div>
        )}
        {ranked.map(({ post }, idx) => (
          <MarketPostCard
            key={post.id}
            post={post}
            contextSport={(post.sport || "all") as Sport}
            showSportBadge
            rank={idx + 1}
          />
        ))}
      </div>
    </section>
  );
}

function TopUsersSection() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        // 최근 업데이트된 상위 100명에서 점수 계산 (MVP)
        const q = query(collection(db, "users"), orderBy("updatedAt", "desc"), limit(100));
        const snap = await getDocs(q);
        setUsers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const ranked = useMemo(() => {
    return users
      .map((u) => {
        const ratingCount = u.ratingCount || 0;
        const ratingAvg = u.ratingSum && ratingCount ? u.ratingSum / ratingCount : (u.ratingAvg || 0);
        const score = ratingAvg * 20 + ratingCount * 5;
        return { user: u, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }, [users]);

  return (
    <section className="p-4">
      <h2 className="text-lg font-semibold mb-3">🏆 인기 유저</h2>
      {loading && <div className="text-sm text-gray-500">불러오는 중...</div>}
      {!loading && ranked.length === 0 && (
        <div className="text-sm text-gray-500">아직 랭킹 데이터가 없습니다.</div>
      )}
      <div className="space-y-2">
        {ranked.map(({ user }, idx) => {
          const ratingCount = user.ratingCount || 0;
          const ratingAvg = user.ratingSum && ratingCount ? user.ratingSum / ratingCount : (user.ratingAvg || 0);
          return (
            <Link
              to={`/profile/${user.id}`}
              key={user.id}
              className="flex items-center gap-3 border rounded p-3 hover:bg-gray-50 transition"
            >
              <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                {user.avatar && <img src={user.avatar} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">
                  {idx === 0 ? "🥇 " : idx === 1 ? "🥈 " : idx === 2 ? "🥉 " : `${idx + 1}. `}
                  {user.name || "사용자"}
                </div>
                <div className="text-xs text-gray-500">
                  ⭐ {ratingAvg.toFixed ? ratingAvg.toFixed(1) : ratingAvg} ({ratingCount})
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function RecentSection() {
  const [posts, setPosts] = useState<MarketPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const q = query(
          collection(db, "marketPosts"),
          orderBy("createdAt", "desc"),
          limit(20)
        );
        const snap = await getDocs(q);
        setPosts(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as MarketPost[]
        );
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <section className="p-4">
      <h2 className="text-lg font-semibold mb-3">🆕 최신 거래</h2>
      <div className="space-y-3">
        {loading && <div className="text-sm text-gray-500">불러오는 중...</div>}
        {!loading && posts.length === 0 && (
          <div className="text-sm text-gray-500">새로운 거래가 없습니다.</div>
        )}
        {posts.map((post, idx) => (
          <MarketPostCard
            key={post.id}
            post={post}
            contextSport={(post.sport || "all") as Sport}
            showSportBadge
            rank={idx + 1}
          />
        ))}
      </div>
    </section>
  );
}

