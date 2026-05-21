/**
 * 🔥 마켓 상세 페이지 라우터
 * 게시글 타입(category)에 따라 적절한 상세 컴포넌트로 분기
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ProductDetail from "./ProductDetail";
import RecruitDetail from "@/features/market/components/details/RecruitDetail";
import type { MarketPost } from "@/features/market/types";

export default function MarketDetailRouter() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [post, setPost] = useState<MarketPost | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchPost = async () => {
      if (!id) {
        setError("게시글 ID가 올바르지 않습니다.");
        setLoading(false);
        return;
      }

      try {
        // 🔥 marketProducts 컬렉션에서 먼저 조회
        let ref = doc(db, "marketProducts", id.trim());
        let snap = await getDoc(ref);

        // 🔥 marketProducts에 없으면 market 컬렉션에서 재시도 (호환성)
        if (!snap.exists()) {
          ref = doc(db, "market", id.trim());
          snap = await getDoc(ref);
        }

        if (cancelled) return;

        if (!snap.exists()) {
          setError("게시글을 찾을 수 없습니다.");
          setLoading(false);
          return;
        }

        const data = snap.data();
        const postCategory = data.category || data.type || null;

        // 🔥 recruit 타입인 경우 MarketPost 형식으로 변환
        if (postCategory === "recruit") {
          const marketPost: MarketPost = {
            id: snap.id,
            sport: (data.sport as any) || "etc",
            category: "recruit",
            title: data.title || data.name || "",
            description: data.description || data.desc || "",
            price: data.price,
            location: data.location || data.locationText || data.address || "",
            images: data.images || data.imageUrls || [],
            status: (data.status as any) || "active",
            createdAt: data.createdAt,
            authorId: data.authorId || data.userId || data.ownerId || data.sellerId || "",
            authorName: data.authorName || data.userName || data.sellerName || "",
            viewCount: data.viewCount || 0,
            likeCount: data.likeCount || 0,
            // recruit 특화 필드
            people: data.people,
            currentPeople: data.currentPeople,
            position: data.position,
            level: data.level,
            ageRange: data.ageRange,
            practiceDay: data.practiceDay,
            practiceLocation: data.practiceLocation,
          } as MarketPost;

          setPost(marketPost);
        }

        setCategory(postCategory);
        setLoading(false);
      } catch (err: any) {
        console.error("❌ [MarketDetailRouter] 게시글 로드 실패:", err);
        if (!cancelled) {
          setError(err?.message || "게시글을 불러오는 중 오류가 발생했습니다.");
          setLoading(false);
        }
      }
    };

    void fetchPost();

    return () => {
      cancelled = true;
    };
  }, [id]);

  // 🔥 로딩 중
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 🔥 에러
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-4">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            뒤로가기
          </button>
        </div>
      </div>
    );
  }

  // 🔥 recruit 타입이면 RecruitDetail로 분기
  if (category === "recruit" && post) {
    return <RecruitDetail post={post} />;
  }

  // 🔥 그 외는 ProductDetail로 (기존 동작 유지)
  return <ProductDetail />;
}
