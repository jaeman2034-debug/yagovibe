// src/pages/public/PublicRegionPage.tsx
// 🔥 공공용 지역 페이지 (읽기 전용 · 외부 안전)

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface PublicPost {
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

export default function PublicRegionPage() {
  const { region } = useParams<{ region: string }>();
  const [posts, setPosts] = useState<PublicPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{ totalPosts: number; activeTeams: number } | null>(null);

  useEffect(() => {
    if (!region) {
      setLoading(false);
      return;
    }

    const fetchPublicRecords = async () => {
      try {
        setLoading(true);

        // 🔥 모든 팀의 블로그 포스트에서 지역 필터링
        const allPosts: PublicPost[] = [];
        const teamIds = new Set<string>();

        // 모든 팀 조회
        const teamsRef = collection(db, "teams");
        const teamsSnap = await getDocs(teamsRef);

        // 각 팀의 블로그 포스트 조회
        for (const teamDoc of teamsSnap.docs) {
          const teamData = teamDoc.data();
          
          // 지역 필터링 (팀 데이터에서)
          if (teamData.location !== region) {
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

        // SEO 메타 태그 (중립)
        const seoTitle = `${region} 지역 팀 활동 기록`;
        const seoDescription = `${region} 지역에서 이어진 팀 활동을 날짜가 남는 기록으로 정리했습니다.`;
        
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
        updateMetaTag("og:url", `${window.location.origin}/public/region/${region}`, true);
        updateMetaTag("og:type", "website", true);

        setLoading(false);
      } catch (error) {
        console.error("공공 기록 조회 실패:", error);
        setLoading(false);
      }
    };

    fetchPublicRecords();
  }, [region]);

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
      {/* 상단 헤더 (네비게이션 없음) */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
            {region} 지역 팀 활동 기록
          </h1>
          <p className="text-gray-600">
            일정 기간 동안 이어진 팀 활동을 기록으로 모았습니다.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* 최근 기록 스트림 */}
        {posts.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <p className="text-gray-500 text-lg">
              아직 이 범위에 해당하는 기록이 없습니다.
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

              const teamSlug = post.teamId;

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

        {/* 지역/종목 요약 (아주 작게) */}
        {stats && (
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <p className="text-sm text-gray-600">
              지난 30일간
            </p>
            <div className="flex items-center justify-center gap-6 mt-2">
              <span className="text-gray-700">
                기록 <strong className="text-gray-900">{stats.totalPosts}</strong>건
              </span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-700">
                팀 <strong className="text-gray-900">{stats.activeTeams}</strong>곳
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

