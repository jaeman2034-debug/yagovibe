// src/pages/team/TeamBlogPostDetailPage.tsx
// 🔥 개별 포스트 페이지 (기록 중심)

import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import { ArrowLeft } from "lucide-react";

interface BlogPost {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  publishedAt?: any;
  postType: string;
  teamId: string;
}

interface Team {
  id: string;
  name: string;
}

export default function TeamBlogPostDetailPage() {
  const { teamSlug, postId } = useParams<{ teamSlug: string; postId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamSlug || !postId) {
      setLoading(false);
      return;
    }

    const fetchPost = async () => {
      try {
        setLoading(true);

        // 1️⃣ teamSlug로 팀 찾기
        const teamsRef = collection(db, "teams");
        const teamsSnap = await getDocs(teamsRef);
        
        let foundTeamId: string | null = null;
        for (const teamDoc of teamsSnap.docs) {
          const blogSettingsRef = doc(db, `teams/${teamDoc.id}/blog/settings`);
          const blogSettingsSnap = await getDoc(blogSettingsRef);
          
          if (blogSettingsSnap.exists()) {
            const settings = blogSettingsSnap.data();
            if (settings.teamSlug === teamSlug) {
              foundTeamId = teamDoc.id;
              setTeam({ id: teamDoc.id, name: teamDoc.data().name || "팀" });
              break;
            }
          }
        }

        if (!foundTeamId) {
          setLoading(false);
          return;
        }

        // 2️⃣ 포스트 조회
        const postRef = doc(db, `teams/${foundTeamId}/blog_posts/${postId}`);
        const postSnap = await getDoc(postRef);
        
        if (postSnap.exists()) {
          setPost({
            id: postSnap.id,
            ...postSnap.data(),
          } as BlogPost);
        }

        // 3️⃣ SEO 메타 태그 설정
        if (postSnap.exists()) {
          const postData = postSnap.data();
          const seoTitle = `${postData.title} | ${team?.name || "팀"} 활동 기록`;
          const seoDescription = postData.excerpt || `${team?.name || "팀"}의 활동과 분위기를 기록으로 정리했습니다.`;
          
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
          updateMetaTag("og:url", `${window.location.origin}/teams/${teamSlug}/blog/${postId}`, true);
          updateMetaTag("og:type", "article", true);
        }

        setLoading(false);
      } catch (error) {
        console.error("포스트 조회 실패:", error);
        setLoading(false);
      }
    };

    fetchPost();
  }, [teamSlug, postId]);

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

  if (!team || !post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">기록을 찾을 수 없습니다</p>
          <Link to={`/teams/${teamSlug}/blog`} className="text-blue-600 hover:underline">
            블로그로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const publishedDate = post.publishedAt
    ? new Date(post.publishedAt.toDate ? post.publishedAt.toDate() : post.publishedAt).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 상단 네비게이션 */}
      <nav className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(`/teams/${teamSlug}/blog`)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft size={18} />
              <span>기록 목록으로</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* 상단 */}
        <div className="mb-6">
          <Link to={`/teams/${teamSlug}/blog`} className="text-blue-600 hover:text-blue-700 text-sm mb-2 inline-block">
            {team.name}
          </Link>
          <p className="text-sm text-gray-500">팀 활동 기록</p>
        </div>

        {/* 제목 */}
        <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">{post.title}</h1>

        {/* 본문 */}
        <article className="bg-white rounded-2xl shadow-sm p-8 mb-8">
          <div
            className="prose max-w-none text-gray-700 leading-relaxed"
            style={{
              // 단락 간격 넉넉
              lineHeight: "1.8",
            }}
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </article>

        {/* 하단 마이크로카피 */}
        <div className="bg-gray-50 rounded-lg p-4 mb-8 text-center">
          <p className="text-sm text-gray-500">
            이 글은 팀 활동 데이터를 바탕으로 자동 정리되었습니다.
          </p>
          {publishedDate && (
            <p className="text-xs text-gray-400 mt-2">{publishedDate}</p>
          )}
        </div>

        {/* 하단 네비게이션 */}
        <div className="text-center">
          <button
            onClick={() => navigate(`/teams/${teamSlug}/blog`)}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← 기록 목록으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}

