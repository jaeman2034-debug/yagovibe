// src/components/team/TeamBlogManagement.tsx
// 🔥 팀 블로그 관리 컴포넌트

import { useEffect, useState, useRef } from "react";
import { doc, getDoc, collection, query, where, orderBy, getDocs, onSnapshot } from "firebase/firestore";
import { db, functions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
import { useAuth } from "@/context/AuthProvider";
import { useTeam } from "@/context/TeamContext";
import { useNavigate } from "react-router-dom";
import { FileText, Plus, ExternalLink, Calendar, Eye, Sparkles } from "lucide-react";
import { track } from "@/lib/analytics";
import BlogKPIDashboard from "./BlogKPIDashboard";

interface BlogSettings {
  enabled: boolean;
  plan: "free" | "pro";
  teamSlug: string;
  createdAt?: any;
  updatedAt?: any;
}

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  status: "draft" | "published";
  publishedAt?: any;
  viewCount: number;
  postType: string;
  createdAt?: any;
}

interface Props {
  teamId?: string;
  sportType?: string;
}

export default function TeamBlogManagement({ teamId, sportType }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { myTeam, role } = useTeam(); // 🔥 TeamContext에서 team과 role 가져오기
  const [blogSettings, setBlogSettings] = useState<BlogSettings | null>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  
  // 🔥 버튼 연타 방지 (중복 생성 차단)
  const isGeneratingRef = useRef(false);

  // 🔥 TeamContext의 myTeam과 role 로그 (디버깅용)
  useEffect(() => {
    if (myTeam) {
      console.log("🔥 [TeamBlogManagement] TEAM PLAN (from TeamContext):", myTeam.plan);
      console.log("🔥 [TeamBlogManagement] TEAM RAW (from TeamContext):", myTeam);
      console.log("🔥 [TeamBlogManagement] ROLE (from TeamContext):", role);
    }
  }, [myTeam, role]);

  // 🔥 블로그 설정 및 포스트 조회
  useEffect(() => {
    if (!teamId) {
      setLoading(false);
      return;
    }

    const fetchBlog = async () => {
      try {
        setLoading(true);

        // 블로그 설정 조회
        const settingsRef = doc(db, `teams/${teamId}/blog/settings`);
        const settingsSnap = await getDoc(settingsRef);

        if (settingsSnap.exists()) {
          setBlogSettings(settingsSnap.data() as BlogSettings);
        }

        // 포스트 조회 (인덱스 없이 작동하도록 수정)
        const postsRef = collection(db, `teams/${teamId}/blog_posts`);
        // 🔥 인덱스 불필요: status로만 필터링하고 정렬은 클라이언트에서 처리
        const postsQuery = query(
          postsRef,
          where("status", "==", "published")
        );
        
        const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
          const postsList: BlogPost[] = [];
          snapshot.forEach((doc) => {
            postsList.push({
              id: doc.id,
              ...doc.data(),
            } as BlogPost);
          });
          
          // 🔥 클라이언트에서 정렬 (인덱스 불필요)
          postsList.sort((a, b) => {
            const aDate = a.publishedAt?.toDate 
              ? a.publishedAt.toDate().getTime() 
              : (a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0);
            const bDate = b.publishedAt?.toDate 
              ? b.publishedAt.toDate().getTime() 
              : (b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0);
            return bDate - aDate; // 내림차순
          });
          
          setPosts(postsList);
          setLoading(false);
        }, (error) => {
          // 🔥 쿼리 에러 처리 (인덱스 없을 때 fallback)
          console.error("블로그 포스트 조회 실패:", error);
          // 인덱스 에러면 전체 조회로 fallback
          if (error.code === "failed-precondition") {
            getDocs(postsRef).then((snap) => {
              const postsList: BlogPost[] = [];
              snap.forEach((doc) => {
                const data = doc.data();
                if (data.status === "published") {
                  postsList.push({
                    id: doc.id,
                    ...data,
                  } as BlogPost);
                }
              });
              postsList.sort((a, b) => {
                const aDate = a.publishedAt?.toDate?.()?.getTime() || a.createdAt?.toDate?.()?.getTime() || 0;
                const bDate = b.publishedAt?.toDate?.()?.getTime() || b.createdAt?.toDate?.()?.getTime() || 0;
                return bDate - aDate;
              });
              setPosts(postsList);
              setLoading(false);
            }).catch((fallbackError) => {
              console.error("Fallback 조회도 실패:", fallbackError);
              setLoading(false);
            });
          } else {
            setLoading(false);
          }
        });

        return () => unsubscribe();
      } catch (error) {
        console.error("블로그 조회 실패:", error);
        setLoading(false);
      }
    };

    fetchBlog();
  }, [teamId]);

  // 🔥 첫 글 생성 (버튼 연타 방지 포함)
  const handleGenerateFirstPost = async () => {
    if (!teamId) return;
    
    // 🔥 중복 생성 차단
    if (isGeneratingRef.current || generating) {
      console.warn("이미 생성 중입니다. 잠시만 기다려주세요.");
      return;
    }

    try {
      isGeneratingRef.current = true;
      setGenerating(true);
      track("team_blog_generate_click", { teamId, postType: "intro" });

      const generateBlogPost = httpsCallable(functions, "generateTeamBlogPost");
      const result = await generateBlogPost({
        teamId,
        postType: "intro",
      });

      if (result.data) {
        const data = result.data as any;
        track("team_blog_generate_success", { teamId, postId: data.postId });

        // 🔥 1단계: 생성 직후 UX 자동 완성
        // Toast 표시 (유지)
        const toast = document.createElement("div");
        toast.className = "fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-slide-in";
        toast.innerHTML = `
          <span class="text-xl">✨</span>
          <span>팀 소개 글이 생성되었습니다!</span>
        `;
        document.body.appendChild(toast);
        
        // Toast 3초 유지 후 제거
        setTimeout(() => {
          toast.style.opacity = "0";
          toast.style.transition = "opacity 0.3s";
          setTimeout(() => toast.remove(), 300);
        }, 3000);

        // 목록 자동 리프레시 (빈 상태 제거를 위해 즉시 갱신)
        try {
          // 블로그 설정 재조회
          const settingsRef = doc(db, `teams/${teamId}/blog/settings`);
          const settingsSnap = await getDoc(settingsRef);
          if (settingsSnap.exists()) {
            setBlogSettings(settingsSnap.data() as BlogSettings);
          }

          // 포스트 리스트 재조회 (onSnapshot이 자동 업데이트하지만 명시적으로 갱신)
          const postsRef = collection(db, `teams/${teamId}/blog_posts`);
          const postsQuery = query(postsRef, where("status", "==", "published"));
          const postsSnap = await getDocs(postsQuery);
          const postsList: BlogPost[] = [];
          postsSnap.forEach((doc) => {
            postsList.push({
              id: doc.id,
              ...doc.data(),
            } as BlogPost);
          });
          
          // 클라이언트에서 정렬
          postsList.sort((a, b) => {
            const aDate = a.publishedAt?.toDate?.()?.getTime() || a.createdAt?.toDate?.()?.getTime() || 0;
            const bDate = b.publishedAt?.toDate?.()?.getTime() || b.createdAt?.toDate?.()?.getTime() || 0;
            return bDate - aDate;
          });
          
          setPosts(postsList);
          
          // 🔥 상단으로 자동 스크롤 (빈 상태 제거 후 즉시 확인 가능)
          setTimeout(() => {
            window.scrollTo({ top: 0, behavior: "smooth" });
          }, 100);
        } catch (refreshError) {
          console.warn("블로그 리스트 갱신 실패 (onSnapshot이 자동으로 처리합니다):", refreshError);
        }

        // 공개 페이지로 이동 (새 탭, 선택적)
        if (data.slug) {
          const blogUrl = `/teams/${data.slug}/blog`;
          const newWindow = window.open(blogUrl, "_blank");
          
          // 새 창이 로드되면 스크롤
          if (newWindow) {
            setTimeout(() => {
              try {
                newWindow.scrollTo({ top: 0, behavior: "smooth" });
              } catch (e) {
                // cross-origin 제한으로 실패할 수 있음 (무시)
              }
            }, 1000);
          }
        }
      }
    } catch (error: any) {
      console.error("블로그 포스트 생성 실패:", error);
      
      // 🔥 에러 메시지 강제 노출 (internal 안에 숨은 진짜 코드 확인)
      const errorDetails = {
        code: error?.code,
        message: error?.message,
        details: error?.details,
        originalError: error?.details?.originalError,
        // 🔥 모든 에러 경로 확인
        fullError: error,
        errorString: String(error),
      };
      
      console.error("BLOG_CREATE_ERROR", errorDetails);
      
      // 🔥 Functions 로그 확인 안내
      if (error?.code === "functions/internal") {
        console.warn("⚠️ Functions 로그 확인 필요: firebase functions:log 또는 Firebase Console > Functions > Logs");
      }
      
      // 에러 메시지 추출 (여러 경로 확인)
      let errorMessage = "알 수 없는 오류입니다.";
      
      if (error?.code) {
        errorMessage = `[${error.code}] ${error?.message || "알 수 없는 오류"}`;
      } else if (error?.details?.message) {
        errorMessage = error.details.message;
      } else if (error?.details?.originalError) {
        errorMessage = error.details.originalError;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.details && typeof error.details === "string") {
        errorMessage = error.details;
      }
      
      // 🔥 상세 에러 정보 JSON으로 표시
      alert(`블로그 포스트 생성에 실패했습니다:\n\n${JSON.stringify(errorDetails, null, 2)}`);
      track("team_blog_generate_failed", { teamId, error: errorMessage, code: error?.code });
    } finally {
      isGeneratingRef.current = false;
      setGenerating(false);
    }
  };

  // 🔥 공개 페이지로 이동
  const handleViewPublic = () => {
    if (!blogSettings?.teamSlug) return;
    track("team_blog_view_public", { teamId, teamSlug: blogSettings.teamSlug });
    window.open(`/teams/${blogSettings.teamSlug}/blog`, "_blank");
  };

  // 🔥 다음 글 생성 (Pro 전용, HTTP API 호출)
  const handleGenerateNextPost = async () => {
    if (!teamId || isGeneratingRef.current || generating) {
      return;
    }

    try {
      isGeneratingRef.current = true;
      setGenerating(true);
      track("team_blog_next_post_click", { teamId });

      // ✅ Callable 함수 호출 (generateTeamBlogPost는 onCall이므로 httpsCallable 사용)
      const generateBlogPost = httpsCallable(functions, "generateTeamBlogPost");
      const result = await generateBlogPost({
        teamId: teamId,
        // postType 미지정 → 서버에서 자동 결정 (decideNextPostTopic)
      });

      const data = result.data as any;

      // 🔥 Callable 함수는 { ok: true, postId, slug } 형태로 반환
      if (data && data.postId) {
        track("team_blog_next_post_success", { teamId, postId: data.postId, postType: data.postType });

        // 성공 토스트
        const toast = document.createElement("div");
        toast.className = "fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2";
        toast.innerHTML = `
          <span class="text-xl">✨</span>
          <span>다음 글이 생성되었습니다!</span>
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
          toast.style.opacity = "0";
          toast.style.transition = "opacity 0.3s";
          setTimeout(() => toast.remove(), 300);
        }, 3000);

        // 포스트 목록 새로고침 (onSnapshot이 자동 업데이트하지만 명시적으로 갱신)
        const postsRef = collection(db, `teams/${teamId}/blog_posts`);
        const postsQuery = query(postsRef, where("status", "==", "published"));
        const postsSnap = await getDocs(postsQuery);
        const postsList: BlogPost[] = [];
        postsSnap.forEach((doc) => {
          postsList.push({
            id: doc.id,
            ...doc.data(),
          } as BlogPost);
        });
        postsList.sort((a, b) => {
          const aDate = a.publishedAt?.toDate?.()?.getTime() || a.createdAt?.toDate?.()?.getTime() || 0;
          const bDate = b.publishedAt?.toDate?.()?.getTime() || b.createdAt?.toDate?.()?.getTime() || 0;
          return bDate - aDate;
        });
        setPosts(postsList);

        // 상단으로 스크롤
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }, 100);
      } else {
        throw new Error(data.error || "알 수 없는 오류");
      }
    } catch (error: any) {
      console.error("다음 글 생성 실패:", error);
      alert(`❌ 다음 글 생성 실패\n\n${error.message || "알 수 없는 오류"}`);
      track("team_blog_next_post_failed", { teamId, error: error.message });
    } finally {
      isGeneratingRef.current = false;
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">블로그 정보를 불러오는 중...</p>
      </div>
    );
  }

  const introPost = posts.find((p) => p.postType === "intro");
  const hasBlog = blogSettings?.enabled && introPost;

  return (
    <div className="space-y-6">
      {/* 🔥 6-5: KPI 대시보드 */}
      {hasBlog && blogSettings && (
        <BlogKPIDashboard teamId={teamId!} blogSettings={blogSettings} />
      )}

      {/* 블로그 상태 카드 */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">블로그 상태</h2>
            <p className="text-sm text-gray-600 mt-1">
              {hasBlog ? "블로그가 활성화되어 있습니다" : "아직 블로그가 생성되지 않았습니다"}
            </p>
          </div>
          {myTeam?.plan === "pro" && (
            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full flex items-center gap-1">
              <Sparkles size={14} />
              Pro
            </span>
          )}
        </div>

        {hasBlog && blogSettings?.teamSlug && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900">공개 블로그 URL</p>
                <p className="text-sm text-blue-700 mt-1">
                  /teams/{blogSettings.teamSlug}/blog
                </p>
              </div>
              <button
                onClick={handleViewPublic}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
              >
                <ExternalLink size={16} />
                공개 페이지 보기
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 첫 글 생성 (없을 때) */}
      {!hasBlog && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="text-center py-8">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">AI 팀 블로그</h3>
            <p className="text-gray-600 mb-6 w-full max-w-none px-3 md:mx-auto md:max-w-3xl">
              이 팀만의 홍보 블로그를 AI가 자동으로 만들어드립니다.
              <br />
              첫 소개 글을 생성하면 외부에 공개되는 팀 블로그가 만들어집니다.
            </p>
            <button
              onClick={handleGenerateFirstPost}
              disabled={generating}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  생성 중...
                </>
              ) : (
                <>
                  <Plus size={20} />
                  블로그 생성하기
                </>
              )}
            </button>
            <p className="text-xs text-gray-500 mt-4">
              ✨ AI가 팀 정보를 분석하여 매력적인 소개 글을 자동으로 작성합니다
            </p>
          </div>
        </div>
      )}

      {/* 포스트 목록 */}
      {hasBlog && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">블로그 포스트</h2>
            {myTeam?.plan === "pro" && role === "admin" && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">
                  매주 월요일 자동 생성
                </span>
                <button
                  onClick={handleGenerateNextPost}
                  disabled={generating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {generating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      생성 중...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      다음 글 생성하기
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {posts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText size={48} className="mx-auto mb-2 opacity-50" />
              <p>아직 포스트가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900">{post.title}</h3>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            post.status === "published"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {post.status === "published" ? "발행됨" : "초안"}
                        </span>
                        {post.postType === "intro" && (
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                            소개
                          </span>
                        )}
                        {post.postType === "weekly" && (
                          <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                            주간 요약
                          </span>
                        )}
                        {post.postType === "team_atmosphere" && (
                          <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                            팀 분위기
                          </span>
                        )}
                        {post.postType === "growth_report" && (
                          <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full">
                            성장 리포트
                          </span>
                        )}
                        {post.postType === "schedule_preview" && (
                          <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">
                            일정 예고
                          </span>
                        )}
                        {post.postType === "memorable_moment" && (
                          <span className="text-xs px-2 py-1 bg-pink-100 text-pink-700 rounded-full">
                            기억 순간
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{post.excerpt}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        {post.publishedAt && (
                          <div className="flex items-center gap-1">
                            <Calendar size={12} />
                            <span>
                              {new Date(post.publishedAt.toDate()).toLocaleDateString("ko-KR")}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Eye size={12} />
                          <span>조회 {post.viewCount || 0}</span>
                        </div>
                      </div>
                    </div>
                    {blogSettings?.teamSlug && (
                      <button
                        onClick={() => {
                          track("team_blog_post_view", { teamId, postId: post.id });
                          window.open(`/teams/${blogSettings.teamSlug}/blog`, "_blank");
                        }}
                        className="ml-4 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1"
                      >
                        <ExternalLink size={14} />
                        보기
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 유료 전환 배너 (Free 플랜일 때) */}
      {hasBlog && myTeam?.plan !== "pro" && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="text-3xl">🤖</div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2">AI가 블로그를 대신 관리하고 있습니다</h3>
              <p className="text-sm text-gray-600 mb-2">
                지금은 <strong>팀 소개 1편 + 활동 후기 월 2편</strong>까지만 자동 생성 중이에요.
              </p>
              <p className="text-sm text-gray-600 mb-4">
                <strong>TEAM PRO로 업그레이드하면</strong> 주간 요약 · 월간 성과 리포트 · 사진 기반 후기 · SNS 공유용 요약을 모두 자동으로 받게 됩니다.
              </p>
              <button
                onClick={() => {
                  track("team_blog_upgrade_click", { teamId, source: "blog_tab" });
                  navigate(`/pricing/team-blog?trigger=blog_tab`);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Pro로 업그레이드 – 월 19,000원 / 팀
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

