// src/pages/archive/SportArchivePage.tsx
// 🔥 종목 아카이브 페이지 (읽기 전용 기록 집계)

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ArrowLeft } from "lucide-react";

interface ArchivePost {
  id: string;
  teamId: string;
  teamName: string;
  title: string;
  excerpt?: string;
  publishedAt?: any;
  postType: string;
  sportType?: string;
  region?: string;
}

export default function SportArchivePage() {
  const { sport } = useParams<{ sport: string }>();
  const [posts, setPosts] = useState<ArchivePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{ totalPosts: number; activeTeams: number } | null>(null);

  useEffect(() => {
    if (!sport) {
      setLoading(false);
      return;
    }

    const fetchArchive = async () => {
      try {
        setLoading(true);

        // 🔥 모든 팀의 블로그 포스트에서 종목 필터링
        const allPosts: ArchivePost[] = [];
        const teamIds = new Set<string>();

        // 모든 팀 조회
        const teamsRef = collection(db, "teams");
        const teamsSnap = await getDocs(teamsRef);

        // 각 팀의 블로그 포스트 조회
        for (const teamDoc of teamsSnap.docs) {
          const teamData = teamDoc.data();
          
          // 종목 필터링 (팀 데이터에서)
          const teamSport = teamData.sportType === "football" ? "축구" : teamData.sportType;
          if (teamSport !== sport) {
            continue;
          }

          const teamId = teamDoc.id;
          const postsRef = collection(db, `teams/${teamId}/blog_posts`);
          const postsQuery = query(
            postsRef,
            where("status", "==", "published"),
            orderBy("publishedAt", "desc"),
            limit(10)
          );
          
          const postsSnap = await getDocs(postsQuery);
          postsSnap.forEach((postDoc) => {
            const postData = postDoc.data();
            allPosts.push({
              id: postDoc.id,
              teamId,
              teamName: teamData.name || "팀",
              title: postData.title,
              excerpt: postData.excerpt,
              publishedAt: postData.publishedAt,
              postType: postData.postType,
              sportType: teamData.sportType,
              region: teamData.location,
            });
            teamIds.add(teamId);
          });
        }

        // 최신순 정렬
        allPosts.sort((a, b) => {
          const dateA = a.publishedAt?.toDate ? a.publishedAt.toDate() : new Date(a.publishedAt || 0);
          const dateB = b.publishedAt?.toDate ? b.publishedAt.toDate() : new Date(b.publishedAt || 0);
          return dateB.getTime() - dateA.getTime();
        });

        setPosts(allPosts.slice(0, 30)); // 최대 30개

        // 통계 (지난 30일)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentPosts = allPosts.filter((post) => {
          const postDate = post.publishedAt?.toDate ? post.publishedAt.toDate() : new Date(post.publishedAt || 0);
          return postDate >= thirtyDaysAgo;
        });

        setStats({
          totalPosts: recentPosts.length,
          activeTeams: teamIds.size,
        });

        // SEO 메타 태그
        const seoTitle = `${sport} 팀 활동 기록 | 기록장`;
        const seoDescription = `${sport} 팀들의 활동을 기록으로 정리했습니다.`;
        
        document.title = seoTitle;
        
        const updateMetaTag = (name: string, content: string, isProperty = false) => {
          const attribute = isProperty ? "property" : "name";
          let meta = document.querySelector(`meta[${attribute}="${name}"]`);
          if (!meta) {
            meta = document.createElement("meta");
            meta.setAttribute(attribute, name);
            document.head.appendChild(meta);
          }
          meta.setAttribute("content", content);
        };

        updateMetaTag("description", seoDescription);
        updateMetaTag("og:title", seoTitle, true);
        updateMetaTag("og:description", seoDescription, true);
        updateMetaTag("og:url", `${window.location.origin}/archive/sport/${sport}`, true);
        updateMetaTag("og:type", "website", true);

        setLoading(false);
      } catch (error) {
        console.error("아카이브 조회 실패:", error);
        setLoading(false);
      }
    };

    fetchArchive();
  }, [sport]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 상단 네비게이션 */}
      <nav className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft size={18} />
            <span>홈으로</span>
          </Link>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* 상단 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
            {sport} 팀 활동 기록
          </h1>
          <p className="text-gray-600">
            최근 일정 기간 동안의 팀 활동을 기록으로 모았습니다.
          </p>
        </div>

        {/* 최근 기록 리스트 */}
        {posts.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <p className="text-gray-500 text-lg">
              아직 이 조건에 해당하는 기록이 없습니다.
            </p>
          </div>
        ) : (
          <div className="space-y-4 mb-8">
            {posts.map((post) => {
              const publishedDate = post.publishedAt
                ? new Date(post.publishedAt.toDate ? post.publishedAt.toDate() : post.publishedAt).toLocaleDateString("ko-KR", {
                    year: "numeric",
                    month: "long",
                  })
                : null;

              const teamSlug = post.teamId; // 실제로는 teamSlug를 저장해야 함

              return (
                <article
                  key={`${post.teamId}-${post.id}`}
                  className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer border border-gray-100"
                  onClick={() => {
                    window.location.href = `/teams/${teamSlug}/blog/${post.id}`;
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {post.teamName}
                      </h3>
                      <h4 className="text-xl font-bold text-gray-900 mb-2">
                        {post.title}
                      </h4>
                      {post.excerpt && (
                        <p className="text-gray-600 mb-3 line-clamp-2">
                          {post.excerpt}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-sm text-gray-400">
                        {publishedDate && <span>{publishedDate}</span>}
                        {post.sportType && (
                          <span className="before:content-['·'] before:mr-1">
                            {post.sportType === "football" ? "축구" : post.sportType}
                          </span>
                        )}
                        {post.region && (
                          <span className="before:content-['·'] before:mr-1">
                            {post.region}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* 활동 팀 요약 (숫자 최소) */}
        {stats && (
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <p className="text-sm text-gray-600">
              지난 30일간
            </p>
            <div className="flex items-center justify-center gap-6 mt-2">
              <span className="text-gray-700">
                활동 기록 <strong className="text-gray-900">{stats.totalPosts}</strong>건
              </span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-700">
                참여 팀 <strong className="text-gray-900">{stats.activeTeams}</strong>팀
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

