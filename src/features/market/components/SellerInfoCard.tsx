/**
 * 🔥 판매자 정보 카드
 * 프로필 이미지, 닉네임, 활동 종목, 최근 등록 글 수
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, MapPin, Package, Star, Award, Shield } from "lucide-react";
import { doc, getDoc, collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getSellerReviewStats, getSellerRecentReviews } from "@/services/marketReviewService";
import { getTrustTier } from "@/services/trustScoreService";
import type { MarketPost } from "../types";
import type { MarketReview, ReviewStats } from "@/types/review";
import type { TrustTier } from "@/types/user";

interface SellerInfoCardProps {
  authorId: string;
  authorName?: string;
  postSport?: string;
  className?: string;
}

interface SellerData {
  displayName?: string;
  photoURL?: string;
  favoriteSports?: string[];
  postCount?: number;
  reviewStats?: ReviewStats;
  recentReviews?: MarketReview[];
  trustScore?: number;
  trustTier?: TrustTier;
  completedSales?: number;
  riskTier?: "low" | "medium" | "high";
}

export default function SellerInfoCard({
  authorId,
  authorName,
  postSport,
  className,
  onRiskTierLoad,
}: SellerInfoCardProps) {
  const navigate = useNavigate();
  const [sellerData, setSellerData] = useState<SellerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSellerData = async () => {
      try {
        // 🔥 사용자 프로필 정보 로드
        const userRef = doc(db, "users", authorId);
        const userSnap = await getDoc(userRef);

        let displayName = authorName || "판매자";
        let photoURL: string | undefined;
        let favoriteSports: string[] = [];

        if (userSnap.exists()) {
          const userData = userSnap.data();
          displayName = userData.displayName || userData.nickname || authorName || "판매자";
          photoURL = userData.photoURL;
          favoriteSports = userData.favoriteSports || [];
        }

        // 🔥 최근 등록 글 수 조회 (같은 sport 기준)
        let postCount = 0;
        if (postSport && postSport !== "all") {
          try {
            const postsQuery = query(
              collection(db, "market"),
              where("authorId", "==", authorId),
              where("sport", "==", postSport),
              where("status", "in", ["active", "open"]),
              limit(10)
            );
            const postsSnap = await getDocs(postsQuery);
            postCount = postsSnap.size;
          } catch (err) {
            console.warn("⚠️ 판매자 글 수 조회 실패:", err);
          }
        }

        // 🔥 리뷰 통계 조회
        let reviewStats: ReviewStats | undefined;
        let recentReviews: MarketReview[] = [];
        try {
          reviewStats = await getSellerReviewStats(authorId);
          recentReviews = await getSellerRecentReviews(authorId, 3);
        } catch (err) {
          console.warn("⚠️ 판매자 리뷰 통계 조회 실패:", err);
        }

        // 🔥 신뢰 점수 및 위험 등급 조회
        let trustScore: number | undefined;
        let trustTier: TrustTier | undefined;
        let completedSales: number | undefined;
        let riskTier: "low" | "medium" | "high" | undefined;
        try {
          const userData = userSnap.data();
          trustScore = userData.trustScore;
          trustTier = userData.trustTier || (trustScore !== undefined ? getTrustTier(trustScore) : undefined);
          completedSales = userData.completedSales;
          riskTier = userData.riskTier || "low";
        } catch (err) {
          console.warn("⚠️ 판매자 신뢰 점수 조회 실패:", err);
        }

        setSellerData({
          displayName,
          photoURL,
          favoriteSports,
          postCount,
          reviewStats,
          recentReviews,
          trustScore,
          trustTier,
          completedSales,
          riskTier,
        });
        
        // 위험 등급 콜백 호출
        if (riskTier && onRiskTierLoad) {
          onRiskTierLoad(riskTier);
        }
      } catch (err) {
        console.error("❌ 판매자 정보 로드 실패:", err);
      } finally {
        setLoading(false);
      }
    };

    if (authorId) {
      loadSellerData();
    }
  }, [authorId, authorName, postSport]);

  if (loading) {
    return (
      <div className={className}>
        <div className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-24" />
              <div className="h-3 bg-gray-200 rounded w-32" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!sellerData) return null;

  const sportLabel = postSport && postSport !== "all" 
    ? (postSport === "soccer" ? "축구" : 
       postSport === "basketball" ? "농구" : 
       postSport === "running" ? "러닝" : 
       postSport === "badminton" ? "배드민턴" : postSport)
    : null;

  return (
    <div className={className}>
      <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3 mb-3">
          {/* 프로필 이미지 */}
          <div className="flex-shrink-0">
            {sellerData.photoURL ? (
              <img
                src={sellerData.photoURL}
                alt={sellerData.displayName}
                className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="w-6 h-6 text-blue-600" />
              </div>
            )}
          </div>

          {/* 판매자 정보 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 truncate">
                {sellerData.displayName}
              </h3>
              {/* 🔥 Top Seller 뱃지 */}
              {sellerData.trustTier === "top" && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
                  <Award className="w-3 h-3" />
                  Top Seller
                </span>
              )}
              {/* 🔥 신뢰 등급 뱃지 */}
              {sellerData.trustTier && sellerData.trustTier !== "top" && sellerData.trustTier !== "guest" && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  sellerData.trustTier === "trusted" ? "bg-blue-100 text-blue-700" :
                  sellerData.trustTier === "verified" ? "bg-green-100 text-green-700" :
                  "bg-gray-100 text-gray-700"
                }`}>
                  {sellerData.trustTier === "trusted" ? "신뢰 판매자" :
                   sellerData.trustTier === "verified" ? "인증 판매자" :
                   "기본 판매자"}
                </span>
              )}
            </div>
            {sportLabel && (
              <p className="text-sm text-gray-600 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3" />
                {sportLabel} 활동
              </p>
            )}
            {/* 🔥 신뢰 점수 표시 */}
            {sellerData.trustScore !== undefined && (
              <div className="flex items-center gap-2 mt-1">
                <Shield className="w-3 h-3 text-blue-600" />
                <span className="text-xs text-gray-600">
                  신뢰 점수: <span className="font-semibold text-blue-600">{sellerData.trustScore.toFixed(1)}</span>
                  {sellerData.completedSales !== undefined && sellerData.completedSales > 0 && (
                    <span className="text-gray-500"> • 거래 {sellerData.completedSales}건</span>
                  )}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 리뷰 통계 */}
        {sellerData.reviewStats && sellerData.reviewStats.totalReviews > 0 && (
          <div className="pt-3 border-t border-gray-100 space-y-2">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-semibold text-gray-900">
                {sellerData.reviewStats.averageRating.toFixed(1)}
              </span>
              <span className="text-sm text-gray-600">
                ({sellerData.reviewStats.totalReviews}개 리뷰)
              </span>
            </div>
            
            {/* 최근 리뷰 3개 */}
            {sellerData.recentReviews && sellerData.recentReviews.length > 0 && (
              <div className="space-y-1.5">
                {sellerData.recentReviews.map((review) => (
                  <div key={review.id} className="text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-500">
                        {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                      </span>
                      {review.comment && (
                        <span className="truncate flex-1">{review.comment}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 최근 등록 글 수 */}
        {sellerData.postCount !== undefined && sellerData.postCount > 0 && (
          <div className="flex items-center gap-2 text-sm text-gray-600 pt-3 border-t border-gray-100">
            <Package className="w-4 h-4" />
            <span>최근 등록 글 {sellerData.postCount}개</span>
          </div>
        )}
      </div>
    </div>
  );
}
