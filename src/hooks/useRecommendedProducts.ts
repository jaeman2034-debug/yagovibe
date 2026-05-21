// src/hooks/useRecommendedProducts.ts
// 🔥 추천 상품 로드 + 랭킹 훅

import { useEffect, useState, useMemo } from "react";
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { MarketProduct } from "@/types/market";
import { parseMarketProduct } from "@/types/market";
import type { LatLng } from "@/utils/geo";
import { getDistanceKm, isValidCoord, isValidLatLng } from "@/utils/geo";

interface UseRecommendedProductsOptions {
  serviceType?: "market" | "free" | "lost";
  category?: string | null;
  userLoc?: LatLng;
  recentCategories?: string[]; // 최근 본 카테고리
  recentServiceTypes?: string[]; // 최근 사용한 서비스 타입
}

export function useRecommendedProducts({
  serviceType,
  category,
  userLoc,
  recentCategories = [],
  recentServiceTypes = [],
}: UseRecommendedProductsOptions) {
  const [products, setProducts] = useState<MarketProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🔥 1차 후보군: Firestore 쿼리 (Fallback 순서)
  useEffect(() => {
    async function loadCandidates() {
      try {
        setLoading(true);
        setError(null);

        if (!db) {
          setProducts([]);
          setLoading(false);
          return;
        }

        // 🔥 추천 후보군: 전체 최신으로 로드 (인덱스 문제 회피)
        // 클라이언트에서 카테고리 필터링 + 랭킹 처리
        const q = query(
          collection(db, "marketProducts"),
          orderBy("createdAt", "desc"),
          limit(80)
        );

        const snap = await getDocs(q);
        
        // 🔥 삭제된 상품 필터링 + 카테고리 필터링 (클라이언트)
        const raw = snap.docs
          .map((docSnap) => parseMarketProduct(docSnap))
          .filter((p) => {
            const rawData = snap.docs.find(d => d.id === p.id)?.data();
            // 삭제된 상품 제외
            if (rawData?.isDeleted) return false;
            // 카테고리 필터 (있으면 적용)
            if (category && p.category !== category) return false;
            return true;
          });

        setProducts(raw);
      } catch (err: any) {
        console.error("❌ [useRecommendedProducts] 로드 실패:", err);
        setError(err.message || "추천 상품을 불러올 수 없습니다.");
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }

    void loadCandidates();
  }, [serviceType, category]);

  // 🔥 2차 랭킹: 클라이언트 점수화
  const rankedProducts = useMemo(() => {
    if (products.length === 0) return [];

    const scored = products.map((product) => {
      let score = 0;

      // 최근 본 카테고리 가산점 (3점)
      if (category && product.category === category) {
        score += 3;
      } else if (recentCategories.includes(product.category || "")) {
        score += 2;
      }

      // 최근 사용한 서비스 타입 가산점 (2점)
      const productServiceType = (product as any).serviceType || "market";
      if (serviceType && productServiceType === serviceType) {
        score += 2;
      } else if (recentServiceTypes.includes(productServiceType)) {
        score += 1;
      }

      // 신선도 점수 (최근 업로드일수록 높음)
      if (product.createdAt) {
        const createdAt = product.createdAt?.toDate 
          ? product.createdAt.toDate().getTime()
          : new Date(product.createdAt as string).getTime();
        const daysSince = (Date.now() - createdAt) / (1000 * 60 * 60 * 24);
        score += Math.max(0, 10 - daysSince * 0.5); // 최대 10점, 하루당 0.5점 감소
      }

      // 🔥 지역 근접 가산점 (좌표 validation 후 계산)
      if (
        isValidLatLng(userLoc) &&
        isValidCoord(product.latitude) &&
        isValidCoord(product.longitude)
      ) {
        const lat = Number(product.latitude);
        const lng = Number(product.longitude);
        
        if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          try {
            const distance = getDistanceKm(
              userLoc,
              { lat, lng }
            );
            if (distance < 5) score += 3; // 5km 이내
            else if (distance < 10) score += 1; // 10km 이내
          } catch {
            // 좌표 오류는 조용히 무시 (가산점 없음)
          }
        }
      }

      // 인기 점수 (views/likes 있으면)
      const views = (product as any).views || 0;
      const likes = (product as any).likes || 0;
      score += views * 0.1 + likes * 0.2;

      return { product, score };
    });

    // 점수 순 정렬 (내림차순)
    scored.sort((a, b) => b.score - a.score);

    // 상위 6개만 반환
    return scored.slice(0, 6).map((item) => item.product);
  }, [products, category, serviceType, userLoc, recentCategories, recentServiceTypes]);

  return {
    products: rankedProducts,
    loading,
    error,
  };
}

