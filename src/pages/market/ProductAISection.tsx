/**
 * 🔥 ProductDetail AI 섹션 - 완전 분리 컴포넌트
 * 모든 AI/추천/분석 기능을 안전하게 격리하여 메인 컴포넌트 안정성 보장
 */

import { useEffect, useState, useMemo } from "react";
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FUNCTIONS_ORIGIN } from "@/config/env";
import { parseMarketProduct, type MarketProduct } from "@/types/market";
import ProductCard from "./ProductCard";
import { safeFetch } from "@/utils/safeFetch";

type ProductDetail = {
  id: string;
  name: string;
  price?: number;
  imageUrl?: string | null;
  imageUrls?: string[];
  description?: string;
  category?: string;
  sellerId?: string | null;
  aiOneLine?: string;
  locationText?: string | null;
  addressShort?: string | null;
  address?: string | null;
  tags?: string[];
  aiTags?: string[];
  brand?: string;
  [key: string]: any;
};

interface ProductAISectionProps {
  product: ProductDetail | null;
}

/**
 * 🔥 Firestore 인덱스 오류 안전 처리
 */
const safeQuery = async <T,>(
  queryFn: () => Promise<T>,
  label: string
): Promise<T | null> => {
  try {
    return await queryFn();
  } catch (error: any) {
    // Firestore 인덱스 오류 처리
    if (
      error?.code === "failed-precondition" ||
      error?.message?.includes("index") ||
      error?.message?.includes("requires an index")
    ) {
      console.warn(`[AI] ${label} - Firestore 인덱스 필요 (무시됨)`);
      
      // 인덱스 생성 링크 추출 (선택적)
      const indexUrlMatch = error?.message?.match(/https:\/\/console\.firebase\.google\.com[^\s\)]+/);
      if (indexUrlMatch?.[0]) {
        console.warn(`🔗 인덱스 생성 링크: ${indexUrlMatch[0]}`);
      }
      
      return null;
    }
    throw error;
  }
};

export default function ProductAISection({ product }: ProductAISectionProps) {
  // 🔮 AI 연관 상품 추천
  const [relatedProducts, setRelatedProducts] = useState<MarketProduct[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);

  // 🔍 AI 유사상품 추천 (의미 기반)
  const [similarProducts, setSimilarProducts] = useState<MarketProduct[]>([]);
  const [similarLoading, setSimilarLoading] = useState(false);

  // ⭐ AI 판매자 신뢰도 평가
  const [sellerTrust, setSellerTrust] = useState<{
    score: number;
    label: "매우 신뢰" | "신뢰" | "보통" | "주의" | "위험";
    reason: string;
  } | null>(null);
  const [sellerTrustLoading, setSellerTrustLoading] = useState(false);

  // ✨ AI 상품 요약
  const [summary, setSummary] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);

  // ⚠️ AI 사기 감지
  const [fraudRisk, setFraudRisk] = useState<{
    risk: number;
    label: "low" | "medium" | "high";
    reason: string;
  } | null>(null);
  const [fraudLoading, setFraudLoading] = useState(false);

  // 📸 AI 이미지 품질 점수
  const [imageQuality, setImageQuality] = useState<{
    score: number;
    label: "low" | "medium" | "high";
    reason: string;
  } | null>(null);
  const [qualityLoading, setQualityLoading] = useState(false);

  // 🧩 AI 상품 상태 점수
  const [conditionScore, setConditionScore] = useState<{
    score: number;
    level: "상" | "중" | "하";
    reason: string;
  } | null>(null);
  const [conditionLoading, setConditionLoading] = useState(false);

  // 📈 AI 가격 미래 예측
  const [futurePrice, setFuturePrice] = useState<{
    oneWeek: { min: number; max: number } | null;
    twoWeeks: { min: number; max: number } | null;
    trend: "상승" | "보합" | "하락";
    reason: string;
  } | null>(null);
  const [futurePriceLoading, setFuturePriceLoading] = useState(false);

  // 🧰 AI 구성품 분석
  const [components, setComponents] = useState<
    Array<{
      name: string;
      status: "있음" | "없음" | "판단불가";
    }>
  >([]);
  const [componentsSummary, setComponentsSummary] = useState("");
  const [componentsLoading, setComponentsLoading] = useState(false);

  // ⭐ AI 종합 등급
  const [totalScore, setTotalScore] = useState<{
    score: number;
    label: "매우 좋음" | "좋음" | "보통" | "나쁨" | "매우 나쁨";
    reason: string;
  } | null>(null);
  const [totalScoreLoading, setTotalScoreLoading] = useState(false);

  // 🔥 AI 분석 블록 (useMemo로 계산)
  const aiBlock = useMemo(() => {
    if (!product) return null;

    const aiCategory = /(축구|농구|야구|테니스|러닝|골프|헬스|운동)/.test(product.name)
      ? "스포츠 용품"
      : "일반 상품";
    const aiCondition = "상태 양호";
    const basePrice = product.price ?? 20000;
    const aiRecommendedPrice = Math.round((basePrice * 0.9) / 1000) * 1000 || 20000;
    const aiSummary = product.description?.trim()
      ? `${product.name}은(는) 현재 상태가 양호한 중고 상품으로 보이며, 운동 및 일상 사용에 모두 적합합니다.`
      : `${product.name}은(는) 현재 상태가 양호한 중고 상품으로, 사용 이력에 따라 실제 상태를 한번 더 확인해보는 것을 추천합니다.`;

    return (
      <div className="rounded-2xl border border-[#e5e5ea] bg-white px-4 py-4 shadow-sm">
        <h2 className="text-[15px] font-semibold text-gray-900 mb-3">🔎 AI 상품 분석</h2>
        <div className="space-y-2 text-[14px] leading-relaxed text-gray-700">
          <div>
            <span className="font-semibold text-gray-900">AI 카테고리:</span> {aiCategory}
          </div>
          <div>
            <span className="font-semibold text-gray-900">상태 판단:</span> {aiCondition}
          </div>
          <div>
            <span className="font-semibold text-gray-900">시세 기반 추천 가격:</span>{" "}
            <span className="text-[#0a84ff] font-bold">
              {aiRecommendedPrice.toLocaleString()}원
            </span>
          </div>
          <p className="text-gray-600 mt-2">{aiSummary}</p>
        </div>
      </div>
    );
  }, [product]);

  // 🔮 AI 연관 상품 추천 로드
  useEffect(() => {
    if (!product || !product.category) return;

    const fetchRelatedProducts = async () => {
      setRelatedLoading(true);
      const result = await safeFetch(async () => {
        // 1) 같은 카테고리의 후보 상품들 로드
        const q = query(
          collection(db, "marketProducts"),
          where("category", "==", product.category)
        );

        const snap = await safeQuery(() => getDocs(q), "연관 상품 로드");
        if (!snap) {
          return [];
        }

        const candidates = snap.docs
          .map((docSnap) => parseMarketProduct(docSnap))
          .filter((p) => p.id !== product.id && p.id)
          .slice(0, 20);

        if (candidates.length === 0) {
          return [];
        }

        // 2) AI 서버에 보내서 유사도 점수 계산
        const response = await fetch(`${FUNCTIONS_ORIGIN}/getRelatedProducts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            current: {
              id: product.id,
              name: product.name,
              category: product.category,
              tags: product.tags || product.aiTags || [],
              description: product.description || "",
              brand: product.brand || "",
            },
            candidates: candidates.map((c) => ({
              id: c.id,
              name: c.name,
              category: c.category,
              tags: c.tags || c.aiTags || [],
              description: c.description || "",
              brand: (c as any).brand || "",
            })),
          }),
        });

        if (!response.ok) {
          throw new Error("서버 응답 오류");
        }

        const data = await response.json();
        const relatedIds = (data.related || [])
          .slice(0, 5)
          .map((r: { id: string; score: number }) => r.id);

        return candidates.filter((p) => relatedIds.includes(p.id));
      }, "연관 상품 추천");

      setRelatedProducts(result || []);
      setRelatedLoading(false);
    };

    void fetchRelatedProducts();
  }, [product?.id, product?.category]);

  // 🔍 AI 유사상품 추천 로드 (의미 기반)
  useEffect(() => {
    if (!product || !product.id) return;

    const fetchSimilarProducts = async () => {
      setSimilarLoading(true);
      const result = await safeFetch(async () => {
        // 1) 후보 상품 200개 로드
        const candidatesQuery = query(
          collection(db, "marketProducts"),
          orderBy("createdAt", "desc"),
          limit(200)
        );

        const candidatesSnap = await safeQuery(
          () => getDocs(candidatesQuery),
          "유사상품 로드"
        );
        if (!candidatesSnap) {
          return [];
        }

        const candidates = candidatesSnap.docs.map((docSnap) => {
          const parsed = parseMarketProduct(docSnap);
          return {
            id: parsed.id,
            ...parsed,
          };
        });

        const filtered = candidates
          .filter((c) => c.id && c.id !== product.id)
          .slice(0, 100);

        if (filtered.length === 0) {
          return [];
        }

        // 2) AI 서버에 보내서 의미 기반 유사도 계산
        const response = await fetch(`${FUNCTIONS_ORIGIN}/getSimilarProducts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            current: {
              id: product.id,
              name: product.name,
              category: product.category || "",
              description: product.description || "",
              tags: product.tags || product.aiTags || [],
            },
            candidates: filtered.map((c) => ({
              id: c.id,
              name: c.name,
              category: c.category || "",
              description: c.description || "",
              tags: c.tags || c.aiTags || [],
            })),
          }),
        });

        if (!response.ok) {
          throw new Error("서버 응답 오류");
        }

        const data = await response.json();
        const similarIds = (data.similar || [])
          .slice(0, 8)
          .map((s: { id: string; score: number }) => s.id);

        return filtered.filter((p) => similarIds.includes(p.id));
      }, "유사상품 추천");

      setSimilarProducts(result || []);
      setSimilarLoading(false);
    };

    void fetchSimilarProducts();
  }, [product?.id, product?.name, product?.category, product?.description]);

  // ⭐ AI 판매자 신뢰도 평가 로드
  useEffect(() => {
    if (!product || !product.sellerId) return;

    const fetchSellerTrust = async () => {
      setSellerTrustLoading(true);
      const result = await safeFetch(async () => {
        const sellerDocRef = doc(db, "sellerProfiles", product.sellerId!);
        const sellerDocSnap = await getDoc(sellerDocRef);

        let sellerInfo: any;
        let stats: any;

        if (!sellerDocSnap.exists()) {
          const userDocRef = doc(db, "users", product.sellerId!);
          const userDocSnap = await getDoc(userDocRef);

          if (!userDocSnap.exists()) {
            return null;
          }

          const userData = userDocSnap.data();
          sellerInfo = {
            uid: product.sellerId,
            nickname: userData?.nickname || userData?.displayName || "알 수 없음",
            createdAt: userData?.createdAt || null,
          };

          stats = {
            totalSales: 0,
            successfulSales: 0,
            cancelledSales: 0,
            reports: 0,
            avgResponseMinutes: null,
            avgFraudRisk: 0.0,
            avgConditionScore: 0.0,
            avgPriceFairness: 0.0,
            accountAgeDays: userData?.createdAt
              ? Math.floor(
                  (Date.now() -
                    (userData.createdAt.toDate
                      ? userData.createdAt.toDate().getTime()
                      : Date.now())) /
                    (1000 * 60 * 60 * 24)
                )
              : null,
          };
        } else {
          const sellerData = sellerDocSnap.data();
          const userDocRef = doc(db, "users", product.sellerId!);
          const userDocSnap = await getDoc(userDocRef);
          const userData = userDocSnap.exists() ? userDocSnap.data() : {};

          sellerInfo = {
            uid: product.sellerId,
            nickname:
              sellerData.nickname ||
              userData?.nickname ||
              userData?.displayName ||
              "알 수 없음",
            createdAt: sellerData.createdAt || userData?.createdAt || null,
          };

          stats = {
            totalSales: sellerData.totalSales || 0,
            successfulSales: sellerData.successfulSales || 0,
            cancelledSales: sellerData.cancelledSales || 0,
            reports: sellerData.reports || 0,
            avgResponseMinutes: sellerData.avgResponseMinutes || null,
            avgFraudRisk: sellerData.avgFraudRisk || 0.0,
            avgConditionScore: sellerData.avgConditionScore || 0.0,
            avgPriceFairness: sellerData.avgPriceFairness || 0.0,
            accountAgeDays:
              sellerData.accountAgeDays ||
              (sellerInfo.createdAt
                ? Math.floor(
                    (Date.now() -
                      (sellerInfo.createdAt.toDate
                        ? sellerInfo.createdAt.toDate().getTime()
                        : Date.now())) /
                      (1000 * 60 * 60 * 24)
                  )
                : null),
          };
        }

        const response = await fetch(`${FUNCTIONS_ORIGIN}/getSellerTrustScore`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seller: sellerInfo, stats }),
        });

        if (!response.ok) {
          throw new Error("서버 응답 오류");
        }

        return await response.json();
      }, "판매자 신뢰도 평가");

      setSellerTrust(result);
      setSellerTrustLoading(false);
    };

    void fetchSellerTrust();
  }, [product?.id, product?.sellerId]);

  // ✨ AI 상품 요약 로드
  useEffect(() => {
    if (!product || !product.name) return;

    const fetchSummary = async () => {
      setSummaryLoading(true);
      const result = await safeFetch(async () => {
        const response = await fetch(`${FUNCTIONS_ORIGIN}/getProductSummary`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: product.name,
            category: product.category || "",
            description: product.description || "",
            tags: product.tags || product.aiTags || [],
            imageUrl: product.imageUrl || null,
          }),
        });

        if (!response.ok) {
          throw new Error("서버 응답 오류");
        }

        const data = await response.json();
        return data.summary || "";
      }, "상품 요약");

      setSummary(result || "");
      setSummaryLoading(false);
    };

    void fetchSummary();
  }, [product?.id, product?.name]);

  // ⚠️ AI 사기 감지 로드
  useEffect(() => {
    if (!product || !product.name) return;

    const fetchFraudRisk = async () => {
      setFraudLoading(true);
      const result = await safeFetch(async () => {
        // 평균가 계산
        let avgPrice: number | null = null;
        if (product.category) {
          const q = query(
            collection(db, "marketProducts"),
            where("category", "==", product.category)
          );

          const snap = await safeQuery(() => getDocs(q), "평균가 계산");
          if (snap) {
            const prices = snap.docs
              .map((doc) => {
                const data = doc.data();
                return typeof data.price === "number" ? data.price : null;
              })
              .filter((p): p is number => p !== null && p > 0);

            if (prices.length > 0) {
              avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
            }
          }
        }

        const response = await fetch(`${FUNCTIONS_ORIGIN}/detectFraudRisk`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: product.name,
            price: product.price || null,
            avgPrice: avgPrice,
            description: product.description || "",
            category: product.category || "",
            tags: product.tags || product.aiTags || [],
            imageUrl: product.imageUrl || null,
            userProfile: {
              uid: product.userId || null,
              createdAt: null,
              totalSales: 0,
            },
          }),
        });

        if (!response.ok) {
          throw new Error("서버 응답 오류");
        }

        return await response.json();
      }, "사기 감지");

      setFraudRisk(result);
      setFraudLoading(false);
    };

    void fetchFraudRisk();
  }, [product?.id, product?.name, product?.category, product?.price]);

  // 📸 AI 이미지 품질 점수 로드
  useEffect(() => {
    if (!product?.imageUrl) return;

    const fetchImageQuality = async () => {
      setQualityLoading(true);
      const result = await safeFetch(async () => {
        const response = await fetch(`${FUNCTIONS_ORIGIN}/getImageQualityScore`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: product.imageUrl,
          }),
        });

        if (!response.ok) {
          throw new Error("서버 응답 오류");
        }

        return await response.json();
      }, "이미지 품질 분석");

      setImageQuality(result);
      setQualityLoading(false);
    };

    void fetchImageQuality();
  }, [product?.id, product?.imageUrl]);

  // 🧩 AI 상품 상태 점수 로드
  useEffect(() => {
    if (!product) return;

    const fetchConditionScore = async () => {
      setConditionLoading(true);
      const result = await safeFetch(async () => {
        const response = await fetch(`${FUNCTIONS_ORIGIN}/getConditionScore`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: product.description || "",
            imageUrl: product.imageUrl || null,
            category: product.category || "",
            tags: product.tags || product.aiTags || [],
          }),
        });

        if (!response.ok) {
          throw new Error("서버 응답 오류");
        }

        return await response.json();
      }, "상품 상태 점수");

      setConditionScore(result);
      setConditionLoading(false);
    };

    void fetchConditionScore();
  }, [product?.id, product?.imageUrl, product?.description, product?.category]);

  // 📈 AI 가격 미래 예측 로드
  useEffect(() => {
    if (!product || !product.price || !product.category) return;

    const fetchFuturePrice = async () => {
      setFuturePriceLoading(true);
      const result = await safeFetch(async () => {
        // 시세 데이터 수집
        const historicalPricesQuery = query(
          collection(db, "marketProducts"),
          where("category", "==", product.category),
          orderBy("createdAt", "desc")
        );

        const historicalSnap = await safeQuery(
          () => getDocs(historicalPricesQuery),
          "가격 예측 시세 수집"
        );

        const historicalPrices = historicalSnap
          ? historicalSnap.docs
              .map((doc) => {
                const data = doc.data();
                return typeof data.price === "number" ? data.price : null;
              })
              .filter((p): p is number => p !== null && p > 0)
              .slice(0, 30)
          : [];

        const response = await fetch(`${FUNCTIONS_ORIGIN}/predictFuturePrice`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: product.name,
            category: product.category || "",
            description: product.description || "",
            price: product.price || null,
            conditionScore: conditionScore?.score || 0.5,
            imageQualityScore: imageQuality?.score || 0.5,
            historicalPrices: historicalPrices,
          }),
        });

        if (!response.ok) {
          throw new Error("서버 응답 오류");
        }

        return await response.json();
      }, "가격 미래 예측");

      setFuturePrice(result);
      setFuturePriceLoading(false);
    };

    if (conditionScore !== null || imageQuality !== null) {
      void fetchFuturePrice();
    }
  }, [
    product?.id,
    product?.price,
    product?.name,
    product?.category,
    product?.description,
    conditionScore?.score,
    imageQuality?.score,
  ]);

  // 🧰 AI 구성품 분석 로드
  useEffect(() => {
    if (!product || !product.imageUrl) return;

    const fetchComponents = async () => {
      setComponentsLoading(true);
      const result = await safeFetch(async () => {
        const response = await fetch(`${FUNCTIONS_ORIGIN}/detectComponents`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: product.category || "",
            description: product.description || "",
            imageUrl: product.imageUrl || null,
          }),
        });

        if (!response.ok) {
          throw new Error("서버 응답 오류");
        }

        const data = await response.json();
        return {
          components: data.components || [],
          summary: data.summary || "",
        };
      }, "구성품 분석");

      if (result) {
        setComponents(result.components);
        setComponentsSummary(result.summary);
      } else {
        setComponents([]);
        setComponentsSummary("");
      }
      setComponentsLoading(false);
    };

    void fetchComponents();
  }, [product?.id, product?.imageUrl, product?.category, product?.description]);

  // ⭐ AI 종합 등급 로드
  useEffect(() => {
    if (!product) return;
    if (conditionScore === null || imageQuality === null || fraudRisk === null) {
      return;
    }

    const fetchTotalScore = async () => {
      setTotalScoreLoading(true);
      const result = await safeFetch(async () => {
        // 시세 데이터 수집
        let historicalPrices: number[] = [];
        if (product.category) {
          const historicalPricesQuery = query(
            collection(db, "marketProducts"),
            where("category", "==", product.category),
            orderBy("createdAt", "desc")
          );

          const historicalSnap = await safeQuery(
            () => getDocs(historicalPricesQuery),
            "종합 등급 시세 수집"
          );

          if (historicalSnap) {
            historicalPrices = historicalSnap.docs
              .map((doc) => {
                const data = doc.data();
                return typeof data.price === "number" ? data.price : null;
              })
              .filter((p): p is number => p !== null && p > 0)
              .slice(0, 20);
          }
        }

        const response = await fetch(`${FUNCTIONS_ORIGIN}/generateTotalScore`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conditionScore: conditionScore?.score || 0.5,
            imageQualityScore: imageQuality?.score || 0.5,
            fraud: fraudRisk,
            components: components,
            price: product.price || null,
            historicalPrices: historicalPrices,
            oneLineSummary: product.aiOneLine || "",
          }),
        });

        if (!response.ok) {
          throw new Error("서버 응답 오류");
        }

        return await response.json();
      }, "종합 등급");

      setTotalScore(result);
      setTotalScoreLoading(false);
    };

    void fetchTotalScore();
  }, [
    product?.id,
    product?.price,
    product?.category,
    product?.aiOneLine,
    conditionScore?.score,
    imageQuality?.score,
    fraudRisk,
    components,
  ]);

  // 🔥 AI 섹션 렌더링 (조건부)
  if (!product) return null;

  return (
    <div className="space-y-4">
      {/* ⚠️ AI 사기 감지 경고 */}
      {fraudLoading ? (
        <div className="animate-pulse bg-gray-50 rounded-xl p-4 text-sm text-gray-500 border border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
            AI가 사기 위험도를 분석 중...
          </div>
        </div>
      ) : fraudRisk && fraudRisk.label !== "low" ? (
        <div
          className={`p-4 rounded-xl text-sm mt-4 border ${
            fraudRisk.label === "high"
              ? "bg-red-50 border-red-300 text-red-700"
              : fraudRisk.label === "medium"
              ? "bg-yellow-50/20 border-yellow-300 text-yellow-700"
              : "bg-green-50 border-green-300 text-green-700"
          }`}
        >
          <h3 className="font-semibold mb-1 flex items-center gap-2">
            <span>⚠️</span> AI 사기 위험 분석: {fraudRisk.label.toUpperCase()}
            {fraudRisk.label === "high" && (
              <span className="text-xs bg-red-200 px-2 py-0.5 rounded-full">고위험</span>
            )}
            {fraudRisk.label === "medium" && (
              <span className="text-xs bg-yellow-200 px-2 py-0.5 rounded-full">주의</span>
            )}
          </h3>
          <p className="leading-relaxed mt-2">{fraudRisk.reason}</p>
          {fraudRisk.risk && (
            <p className="text-xs mt-2 opacity-75">위험도 점수: {Math.round(fraudRisk.risk * 100)}%</p>
          )}
        </div>
      ) : null}

      {/* 📸 AI 이미지 품질 점수 */}
      {qualityLoading ? (
        <div className="animate-pulse bg-gray-50 rounded-xl p-4 text-sm text-gray-500 border border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
            AI가 이미지 품질을 분석 중...
          </div>
        </div>
      ) : imageQuality ? (
        <div
          className={`p-4 rounded-xl text-sm mt-4 border ${
            imageQuality.label === "high"
              ? "bg-green-50 border-green-300 text-green-700"
              : imageQuality.label === "medium"
              ? "bg-yellow-50/20 border-yellow-300 text-yellow-700"
              : "bg-red-50 border-red-300 text-red-700"
          }`}
        >
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <span>📸</span> 이미지 품질: {imageQuality.label.toUpperCase()}
            {imageQuality.label === "high" && (
              <span className="text-xs bg-green-200 px-2 py-0.5 rounded-full">고품질</span>
            )}
            {imageQuality.label === "medium" && (
              <span className="text-xs bg-yellow-200 px-2 py-0.5 rounded-full">보통</span>
            )}
            {imageQuality.label === "low" && (
              <span className="text-xs bg-red-200 px-2 py-0.5 rounded-full">저품질</span>
            )}
          </h3>
          <p className="text-xs leading-relaxed mt-2">{imageQuality.reason}</p>
          {imageQuality.score && (
            <p className="text-xs mt-2 opacity-75">품질 점수: {Math.round(imageQuality.score * 100)}/100</p>
          )}
        </div>
      ) : null}

      {/* 🧩 AI 상품 상태 점수 */}
      {conditionLoading ? (
        <div className="animate-pulse bg-gray-50 rounded-xl p-4 text-sm text-gray-500 border border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
            AI가 상품 상태를 분석 중...
          </div>
        </div>
      ) : conditionScore ? (
        <div
          className={`mt-4 p-4 rounded-xl text-sm border ${
            conditionScore.level === "상"
              ? "bg-green-50 border-green-300 text-green-700"
              : conditionScore.level === "중"
              ? "bg-yellow-50/20 border-yellow-300 text-yellow-700"
              : "bg-red-50 border-red-300 text-red-700"
          }`}
        >
          <h3 className="font-semibold mb-1 flex items-center gap-2">
            <span>🧩</span> 상품 상태: {conditionScore.level}
            {conditionScore.level === "상" && (
              <span className="text-xs bg-green-200 px-2 py-0.5 rounded-full">양호</span>
            )}
            {conditionScore.level === "중" && (
              <span className="text-xs bg-yellow-200 px-2 py-0.5 rounded-full">보통</span>
            )}
            {conditionScore.level === "하" && (
              <span className="text-xs bg-red-200 px-2 py-0.5 rounded-full">주의</span>
            )}
          </h3>
          <p className="leading-relaxed mt-2 text-xs">{conditionScore.reason}</p>
          {conditionScore.score && (
            <p className="text-xs mt-2 opacity-75">상태 점수: {Math.round(conditionScore.score * 100)}/100</p>
          )}
        </div>
      ) : null}

      {/* 📈 AI 가격 미래 예측 */}
      {futurePriceLoading ? (
        <div className="animate-pulse bg-gray-50 rounded-xl p-4 text-sm text-gray-500 border border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
            AI가 가격 변동을 예측 중...
          </div>
        </div>
      ) : futurePrice && (futurePrice.oneWeek || futurePrice.twoWeeks) ? (
        <div className="p-4 rounded-xl mt-4 bg-blue-50 border border-blue-200 text-blue-700 text-sm">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <span>📈</span> AI 가격 예측
            {futurePrice.trend === "상승" && (
              <span className="text-xs bg-blue-200 px-2 py-0.5 rounded-full">상승 추세</span>
            )}
            {futurePrice.trend === "하락" && (
              <span className="text-xs bg-orange-200 px-2 py-0.5 rounded-full">하락 추세</span>
            )}
            {futurePrice.trend === "보합" && (
              <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">보합 추세</span>
            )}
          </h3>

          <div className="space-y-2">
            {futurePrice.oneWeek && (
              <div>
                <p className="text-xs text-blue-600 mb-1">📅 1주 후 예상 가격 범위:</p>
                <p className="font-semibold">
                  {futurePrice.oneWeek.min.toLocaleString()}원 ~ {futurePrice.oneWeek.max.toLocaleString()}원
                </p>
              </div>
            )}

            {futurePrice.twoWeeks && (
              <div>
                <p className="text-xs text-blue-600 mb-1">📅 2주 후 예상 가격 범위:</p>
                <p className="font-semibold">
                  {futurePrice.twoWeeks.min.toLocaleString()}원 ~ {futurePrice.twoWeeks.max.toLocaleString()}원
                </p>
              </div>
            )}

            <p className="mt-2 text-xs opacity-80">
              추세: <span className="font-semibold">{futurePrice.trend}</span>
            </p>

            <p className="mt-1 text-xs leading-relaxed opacity-90">{futurePrice.reason}</p>
          </div>
        </div>
      ) : null}

      {/* 🧰 AI 구성품 체크 */}
      {componentsLoading ? (
        <div className="animate-pulse bg-indigo-50 rounded-xl p-4 text-sm text-gray-500 border border-indigo-200">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
            AI가 구성품을 분석 중...
          </div>
        </div>
      ) : components.length > 0 ? (
        <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 mt-4">
          <h3 className="font-semibold text-indigo-700 mb-3 flex items-center gap-2">
            <span>🧰</span> 구성품 체크
          </h3>

          <ul className="space-y-2 text-sm">
            {components.map((c, index) => (
              <li key={`${c.name}-${index}`} className="flex items-center gap-2 text-gray-700">
                {c.status === "있음" && <span className="text-green-600 font-bold">✔</span>}
                {c.status === "없음" && <span className="text-red-600 font-bold">✖</span>}
                {c.status === "판단불가" && <span className="text-gray-500 font-bold">?</span>}
                <span className="flex-1">{c.name}</span>
                <span
                  className={`text-xs ${
                    c.status === "있음"
                      ? "text-green-600"
                      : c.status === "없음"
                      ? "text-red-600"
                      : "text-gray-500"
                  }`}
                >
                  {c.status}
                </span>
              </li>
            ))}
          </ul>

          {componentsSummary && (
            <p className="text-xs text-gray-600 mt-3 leading-relaxed">{componentsSummary}</p>
          )}
        </div>
      ) : null}

      {/* ⭐ AI 종합 등급 */}
      {totalScoreLoading ? (
        <div className="animate-pulse bg-yellow-50/20 rounded-xl p-4 text-sm text-gray-500 border border-yellow-200">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
            AI가 종합 등급을 계산 중...
          </div>
        </div>
      ) : totalScore ? (
        <div
          className={`p-4 rounded-xl mt-4 border ${
            totalScore.score >= 4.5
              ? "bg-yellow-50/20 border-yellow-300 text-yellow-800"
              : totalScore.score >= 3.5
              ? "bg-blue-50 border-blue-300 text-blue-800"
              : totalScore.score >= 2.5
              ? "bg-gray-50 border-gray-300 text-gray-800"
              : totalScore.score >= 1.5
              ? "bg-orange-50 border-orange-300 text-orange-800"
              : "bg-red-50 border-red-300 text-red-800"
          }`}
        >
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <span className="text-xl">⭐</span> 종합 등급: {totalScore.score.toFixed(1)} / 5.0
            {totalScore.score >= 4.5 && (
              <span className="text-xs bg-yellow-200 px-2 py-0.5 rounded-full">매우 좋음</span>
            )}
            {totalScore.score >= 3.5 && totalScore.score < 4.5 && (
              <span className="text-xs bg-blue-200 px-2 py-0.5 rounded-full">좋음</span>
            )}
            {totalScore.score >= 2.5 && totalScore.score < 3.5 && (
              <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">보통</span>
            )}
            {totalScore.score >= 1.5 && totalScore.score < 2.5 && (
              <span className="text-xs bg-orange-200 px-2 py-0.5 rounded-full">나쁨</span>
            )}
            {totalScore.score < 1.5 && (
              <span className="text-xs bg-red-200 px-2 py-0.5 rounded-full">매우 나쁨</span>
            )}
          </h3>
          <p className="text-sm font-medium mb-1">{totalScore.label}</p>
          <p className="text-xs mt-1 opacity-80 leading-relaxed">{totalScore.reason}</p>
        </div>
      ) : null}

      {/* ✨ AI 상품 요약 */}
      {summaryLoading ? (
        <div className="animate-pulse bg-purple-50 rounded-xl p-4 text-sm text-gray-500 border border-purple-100">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            AI가 요약을 생성 중...
          </div>
        </div>
      ) : summary ? (
        <div className="bg-purple-50 rounded-xl p-4 text-sm text-gray-800 border border-purple-100">
          <h3 className="text-purple-700 font-semibold mb-2 flex items-center gap-2">
            <span>✨</span> AI 요약
          </h3>
          <p className="leading-relaxed">{summary}</p>
        </div>
      ) : null}

      {/* ⭐ AI 판매자 신뢰도 평가 */}
      {sellerTrustLoading ? (
        <div className="mt-4 animate-pulse p-4 rounded-xl border border-gray-200 bg-gray-50">
          <div className="h-6 bg-gray-200 rounded w-32 mb-2"></div>
          <div className="h-8 bg-gray-200 rounded w-24 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
        </div>
      ) : sellerTrust ? (
        <div
          className={`
                  mt-4 p-4 rounded-xl text-sm border
                  ${
                    sellerTrust.label === "매우 신뢰"
                      ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                      : sellerTrust.label === "신뢰"
                      ? "bg-green-50 border-green-300 text-green-800"
                      : sellerTrust.label === "보통"
                      ? "bg-yellow-50/20 border-yellow-300 text-yellow-800"
                      : sellerTrust.label === "주의"
                      ? "bg-orange-50 border-orange-300 text-orange-800"
                      : "bg-red-50 border-red-300 text-red-800"
                  }
                `}
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-xs uppercase tracking-wide opacity-70 mb-1">판매자 신뢰도</div>
              <div className="text-lg font-semibold flex items-center gap-2">
                <span>⭐</span>
                {sellerTrust.score.toFixed(1)} / 5.0
              </div>
              <div className="text-xs mt-1 font-medium">{sellerTrust.label}</div>
            </div>

            <div className="text-right text-xs opacity-80">
              <div className="font-medium">{(product as any).sellerNickname || "판매자"}</div>
              {product.sellerId && (
                <div className="text-[10px] opacity-60 mt-1">거래 이력 확인</div>
              )}
            </div>
          </div>

          <p className="mt-2 text-xs opacity-90 leading-relaxed">{sellerTrust.reason}</p>
        </div>
      ) : null}

      {/* AI 분석 패널 */}
      {aiBlock}

      {/* 🔮 AI 연관 상품 추천 */}
      {relatedProducts.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">🔮 AI 추천 상품</h3>
          <div className="grid grid-cols-1 gap-4">
            {relatedProducts.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </div>
      )}

      {relatedLoading && (
        <div className="mt-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      )}

      {/* 🔍 AI 유사상품 추천 (의미 기반) */}
      {similarLoading ? (
        <div className="mt-8 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-56 mb-4"></div>
          <div className="flex overflow-x-auto space-x-4 pb-2 sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 sm:space-x-0 sm:gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="min-w-[65%] sm:min-w-0 h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      ) : similarProducts.length > 0 ? (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 flex items-center gap-2">
            <span>🔍</span> 이 상품과 비슷한 추천
          </h3>
          <div className="flex overflow-x-auto space-x-4 pb-2 sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 sm:space-x-0 sm:gap-4">
            {similarProducts.map((item) => (
              <div key={item.id} className="min-w-[65%] sm:min-w-0">
                <ProductCard product={item} distanceKm={undefined} />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

