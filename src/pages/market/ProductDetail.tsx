import { useEffect, useMemo, useRef, useState, memo } from "react";

import { useParams, useNavigate } from "react-router-dom";

import dayjs from "dayjs";

import relativeTime from "dayjs/plugin/relativeTime";

import "dayjs/locale/ko";

import {

  deleteDoc,

  doc,

  getDoc,

  setDoc,

  serverTimestamp,

  collection,

  query,

  where,

  getDocs,
  orderBy,
  limit,
} from "firebase/firestore";

import { onAuthStateChanged, type User } from "firebase/auth";

import { auth, db } from "@/lib/firebase";

import { Button } from "@/components/ui/button";

import { Skeleton } from "@/components/ui/skeleton";

import { loadGoogleMap } from "@/lib/loadGoogleMap";

import ProductCard from "./ProductCard";

import type { MarketProduct } from "@/types/market";

import { parseMarketProduct } from "@/types/market";
import { FUNCTIONS_ORIGIN, ANALYZE_PRODUCT_ENDPOINT } from "@/config/env";



dayjs.extend(relativeTime);

dayjs.locale("ko");



// 이미지 컴포넌트 (React.memo로 re-render 방지)

const ProductImage = memo(({ src, alt }: { src: string; alt: string }) => (

  <img

    src={src}

    alt={alt}

    className="w-full h-full object-contain select-none"

    style={{

      maxHeight: "420px",

    }}

    loading="eager"

    decoding="sync"

    draggable={false}

    width={600}

    height={450}

  />

));



ProductImage.displayName = "ProductImage";



type ProductDetail = {

  id: string;

  name: string;

  price?: number;

  imageUrl?: string | null;

  imageUrls?: string[];

  description?: string;

  region?: string | null;

  location?: string | null;

  createdAt?: { toDate?: () => Date } | null;

  // 좌표(옵션)

  latitude?: number | null;

  longitude?: number | null;

  // 소유자 정보

  userId?: string | null;

  ownerId?: string | null;

  sellerId?: string | null;

};



// 직선 거리 계산 (km)

function getDistanceKm(

  lat1: number,

  lng1: number,

  lat2: number,

  lng2: number

): number {

  const R = 6371; // km

  const dLat = ((lat2 - lat1) * Math.PI) / 180;

  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =

    Math.sin(dLat / 2) * Math.sin(dLat / 2) +

    Math.cos((lat1 * Math.PI) / 180) *

      Math.cos((lat2 * Math.PI) / 180) *

      Math.sin(dLng / 2) *

      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;

}



// 카메라 시네마틱 애니메이션

function cinematicCamera(

  map: any,

  target: { lat: number; lng: number }

): void {

  const start = performance.now();

  const duration = 900; // ms



  const startCenter = map.getCenter();

  const startLat = startCenter?.lat() ?? target.lat;

  const startLng = startCenter?.lng() ?? target.lng;



  const startZoom = map.getZoom() ?? 12;

  const endZoom = 16;



  const animate = (time: number) => {

    const t = Math.min((time - start) / duration, 1);



    const lat = startLat + (target.lat - startLat) * t;

    const lng = startLng + (target.lng - startLng) * t;

    const zoom = startZoom + (endZoom - startZoom) * t;



    map.setCenter({ lat, lng });

    map.setZoom(zoom);



    if (t < 1) requestAnimationFrame(animate);

  };



  requestAnimationFrame(animate);

}



export default function ProductDetailPage() {

  const { id } = useParams<{ id: string }>();

  const navigate = useNavigate();

  // 🔥 id 디버깅 로그 추가
  useEffect(() => {
    console.log("🔥 ProductDetail 페이지 로드:", { id, isIdValid: !!id });
    if (!id) {
      console.error("❌ ProductDetail: id가 undefined입니다! URL을 확인하세요.");
    }
  }, [id]);



  const [product, setProduct] = useState<ProductDetail | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [liked, setLiked] = useState(false);

  const [user, setUser] = useState<User | null>(auth.currentUser);

  const [activeIndex, setActiveIndex] = useState(0);



  const [showMap, setShowMap] = useState(false);

  const mapRef = useRef<HTMLDivElement | null>(null);

  const [mapError, setMapError] = useState<string | null>(null);



  const [distanceKm, setDistanceKm] = useState<number | null>(null);

  const [distanceLoading, setDistanceLoading] = useState(false);

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

  // 📈 AI 가격 미래 예측 (1주/2주 후 범위)
  const [futurePrice, setFuturePrice] = useState<{
    oneWeek: { min: number; max: number } | null;
    twoWeeks: { min: number; max: number } | null;
    trend: "상승" | "보합" | "하락";
    reason: string;
  } | null>(null);
  const [futurePriceLoading, setFuturePriceLoading] = useState(false);

  // 🧰 AI 구성품 분석
  const [components, setComponents] = useState<Array<{
    name: string;
    status: "있음" | "없음" | "판단불가";
  }>>([]);
  const [componentsSummary, setComponentsSummary] = useState("");
  const [componentsLoading, setComponentsLoading] = useState(false);

  // ⭐ AI 종합 등급 (0~5점)
  const [totalScore, setTotalScore] = useState<{
    score: number;
    label: "매우 좋음" | "좋음" | "보통" | "나쁨" | "매우 나쁨";
    reason: string;
  } | null>(null);
  const [totalScoreLoading, setTotalScoreLoading] = useState(false);



  // 상품 정보 로드

  useEffect(() => {

    let cancelled = false;



    const fetchProduct = async () => {

      if (!id) {

        setError("상품 ID가 올바르지 않습니다.");

        setLoading(false);

        return;

      }

      try {

        const ref = doc(db, "marketProducts", id);

        const snap = await getDoc(ref);

        if (!cancelled) {

          if (snap.exists()) {

            const productData = snap.data();

            // 🔥 디버깅: 상품 데이터 로그 (userId 확인)
            console.log("🔥 상품 데이터 로드:", {
              id: snap.id,
              productUserId: productData?.userId || productData?.ownerId || productData?.sellerId,
              hasUserId: !!(productData?.userId || productData?.ownerId || productData?.sellerId),
              productDataKeys: Object.keys(productData || {}),
              productData: productData,
            });

            setProduct({

              id: snap.id,

              ...(productData as Omit<ProductDetail, "id">),

            });

          } else {

            setProduct(null);

          }

        }

      } catch (err) {

        console.error("상품 정보를 불러오는 중 오류가 발생했습니다.", err);

        if (!cancelled)

          setError("상품 정보를 불러오는 중 문제가 발생했습니다.");

      } finally {

        if (!cancelled) setLoading(false);

      }

    };



    void fetchProduct();

    return () => {

      cancelled = true;

    };

  }, [id]);



  // 로그인 상태 감지

  useEffect(() => {

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {

      setUser(currentUser);

    });

    return () => unsubscribe();

  }, []);



  // 찜 여부 확인

  useEffect(() => {

    let cancelled = false;



    const checkFavorite = async () => {

      if (!user || !id) {

        setLiked(false);

        return;

      }

      try {

        const favRef = doc(db, "users", user.uid, "favorites", id);

        const snap = await getDoc(favRef);

        if (!cancelled) {

          setLiked(snap.exists());

        }

      } catch (err) {

        console.error("즐겨찾기 정보를 확인하는 중 오류가 발생했습니다.", err);

      }

    };

    void checkFavorite();

    return () => {

      cancelled = true;

    };

  }, [user, id]);

  // 🔮 AI 연관 상품 추천 로드
  useEffect(() => {
    if (!product || !product.category) return;

    const fetchRelatedProducts = async () => {
      setRelatedLoading(true);
      try {
        // 1) 같은 카테고리의 후보 상품들 로드
        const q = query(
          collection(db, "marketProducts"),
          where("category", "==", product.category)
        );

        const snap = await getDocs(q);
        const candidates = snap.docs
          .map((docSnap) => parseMarketProduct(docSnap))
          .filter((p) => p.id !== product.id && p.id) // 자기 자신 제외
          .slice(0, 20); // 최대 20개만 분석

        if (candidates.length === 0) {
          setRelatedProducts([]);
          setRelatedLoading(false);
          return;
        }

        // 2) AI 서버에 보내서 유사도 점수 계산
        const response = await fetch(
          `${FUNCTIONS_ORIGIN}/getRelatedProducts`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              current: {
                id: product.id,
                name: product.name,
                category: product.category,
                tags: (product as any).tags || (product as any).aiTags || [],
                description: product.description || "",
                brand: (product as any).brand || "",
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
          }
        );

        if (!response.ok) {
          throw new Error("서버 응답 오류");
        }

        const data = await response.json();
        const relatedIds = (data.related || [])
          .slice(0, 5) // 상위 5개만
          .map((r: { id: string; score: number }) => r.id);

        // 3) 점수가 높은 상품들만 필터링
        const filtered = candidates.filter((p) => relatedIds.includes(p.id));
        setRelatedProducts(filtered);
      } catch (error: any) {
        console.error("🔮 연관 상품 추천 오류:", error);
        setRelatedProducts([]);
      } finally {
        setRelatedLoading(false);
      }
    };

    void fetchRelatedProducts();
  }, [product?.id, product?.category]);

  // 🔍 AI 유사상품 추천 로드 (의미 기반)
  useEffect(() => {
    if (!product || !product.id) return;

    const fetchSimilarProducts = async () => {
      setSimilarLoading(true);
      try {
        // 1) 후보 상품 200개 로드
        const candidatesQuery = query(
          collection(db, "marketProducts"),
          orderBy("createdAt", "desc"),
          limit(200)
        );

        let candidatesSnap;
        try {
          candidatesSnap = await getDocs(candidatesQuery);
        } catch (indexError: any) {
          // Firestore 인덱스 오류 처리
          if (indexError?.code === "failed-precondition" || indexError?.message?.includes("index") || indexError?.message?.includes("requires an index")) {
            console.error("❌ Firestore 인덱스가 필요합니다:", indexError);
            
            // 인덱스 생성 링크 자동 추출
            const indexUrlMatch = indexError?.message?.match(/https:\/\/console\.firebase\.google\.com[^\s\)]+/);
            const indexUrl = indexUrlMatch?.[0];
            
            if (indexUrl) {
              console.error("🔗 인덱스 생성 링크 (클릭하여 생성):", indexUrl);
              console.error("📌 위 링크를 클릭하거나 복사해서 브라우저에서 열어주세요.");
              
              // 사용자에게 명확한 안내
              const shouldOpen = confirm(
                `Firestore 인덱스가 필요합니다.\n\n` +
                `이 링크를 클릭하면 인덱스를 자동 생성할 수 있습니다:\n${indexUrl}\n\n` +
                `"확인"을 누르면 링크를 새 탭에서 엽니다.\n` +
                `"취소"를 누르면 콘솔에서 링크를 확인하세요.`
              );
              
              if (shouldOpen) {
                window.open(indexUrl, '_blank');
              }
            } else {
              console.error("📌 Firebase Console에서 인덱스를 수동으로 생성해주세요.");
              console.error("   Firebase Console → Firestore → Indexes → Create Index");
            }
            
            throw indexError;
          }
          throw indexError;
        }
        const candidates = candidatesSnap.docs.map((docSnap) => {
          const parsed = parseMarketProduct(docSnap);
          return {
            id: parsed.id,
            ...parsed,
          };
        });

        // 자기 자신 제외
        const filtered = candidates.filter((c) => c.id !== product.id);

        if (filtered.length === 0) {
          setSimilarProducts([]);
          setSimilarLoading(false);
          return;
        }

        // 2) 사용자 위치 정보
        let userLoc: { lat: number; lng: number } | null = null;
        try {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                userLoc = {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                };
              },
              () => {
                // 위치 권한 거부 시 null 유지
              }
            );
          }
        } catch (locError) {
          console.warn("⚠️ 위치 정보 가져오기 실패:", locError);
        }

        // 3) AI 유사상품 추천 API 호출
        const response = await fetch(
          `${FUNCTIONS_ORIGIN}/recommendSimilar`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              base: {
                id: product.id,
                name: product.name,
                category: product.category,
                description: product.description,
                tags: product.tags || product.aiTags || [],
                price: product.price || 0,
                latitude: product.latitude || null,
                longitude: product.longitude || null,
                aiOneLine: product.aiOneLine || "",
                imageUrl: product.imageUrl || null,
              },
              candidates: filtered,
              userLocation: userLoc,
            }),
          }
        );

        if (!response.ok) {
          throw new Error("AI 유사상품 추천 서버 응답 오류");
        }

        const data = await response.json();
        const rankedIds = (data.ranked || []).map((r: any) => r.id);

        // 4) AI가 정렬한 순서대로 상품 재배열 (상위 10개만)
        const sortedProducts = rankedIds
          .slice(0, 10)
          .map((id: string) => filtered.find((c) => c.id === id))
          .filter((p): p is MarketProduct => p !== undefined);

        // 5) 행정동 자동 변환은 나중에 필요 시 처리 (일단 그대로 사용)
        console.log(`🔍 AI 유사상품 추천: ${sortedProducts.length}개 상품 추천됨`);
        setSimilarProducts(sortedProducts);
      } catch (err: any) {
        console.error("🔍 AI 유사상품 추천 오류:", err);
        setSimilarProducts([]);
      } finally {
        setSimilarLoading(false);
      }
    };

    void fetchSimilarProducts();
  }, [product?.id, product?.name, product?.category, product?.description, product?.tags, product?.price]);

  // ⭐ AI 판매자 신뢰도 평가 로드
  useEffect(() => {
    if (!product || !product.sellerId) return;

    const fetchSellerTrust = async () => {
      setSellerTrustLoading(true);
      try {
        // 1) 판매자 통계 정보 불러오기
        const sellerDocRef = doc(db, "sellerProfiles", product.sellerId);
        const sellerDocSnap = await getDoc(sellerDocRef);

        if (!sellerDocSnap.exists()) {
          // 판매자 프로필이 없으면 기본값 사용
          const userDocRef = doc(db, "users", product.sellerId);
          const userDocSnap = await getDoc(userDocRef);

          if (!userDocSnap.exists()) {
            setSellerTrust(null);
            setSellerTrustLoading(false);
            return;
          }

          const userData = userDocSnap.data();
          const sellerInfo = {
            uid: product.sellerId,
            nickname: userData?.nickname || userData?.displayName || "알 수 없음",
            createdAt: userData?.createdAt || null,
          };

          const stats = {
            totalSales: 0,
            successfulSales: 0,
            cancelledSales: 0,
            reports: 0,
            avgResponseMinutes: null,
            avgFraudRisk: 0.0,
            avgConditionScore: 0.0,
            avgPriceFairness: 0.0,
            accountAgeDays: userData?.createdAt
              ? Math.floor((Date.now() - (userData.createdAt.toDate ? userData.createdAt.toDate().getTime() : Date.now())) / (1000 * 60 * 60 * 24))
              : null,
          };

          // 2) AI 판매자 신뢰도 평가 API 호출
          const response = await fetch(
            `${FUNCTIONS_ORIGIN}/getSellerTrustScore`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ seller: sellerInfo, stats }),
            }
          );

          if (!response.ok) {
            throw new Error("AI 판매자 신뢰도 평가 서버 응답 오류");
          }

          const data = await response.json();
          setSellerTrust(data);
          setSellerTrustLoading(false);
          return;
        }

        const sellerData = sellerDocSnap.data();

        // 2) 판매자 정보 정리
        const userDocRef = doc(db, "users", product.sellerId);
        const userDocSnap = await getDoc(userDocRef);
        const userData = userDocSnap.exists() ? userDocSnap.data() : {};

        const sellerInfo = {
          uid: product.sellerId,
          nickname: sellerData.nickname || userData?.nickname || userData?.displayName || "알 수 없음",
          createdAt: sellerData.createdAt || userData?.createdAt || null,
        };

        // 3) 통계 정보 정리
        const stats = {
          totalSales: sellerData.totalSales || 0,
          successfulSales: sellerData.successfulSales || 0,
          cancelledSales: sellerData.cancelledSales || 0,
          reports: sellerData.reports || 0,
          avgResponseMinutes: sellerData.avgResponseMinutes || null,
          avgFraudRisk: sellerData.avgFraudRisk || 0.0,
          avgConditionScore: sellerData.avgConditionScore || 0.0,
          avgPriceFairness: sellerData.avgPriceFairness || 0.0,
          accountAgeDays: sellerData.accountAgeDays || 
            (sellerInfo.createdAt
              ? Math.floor((Date.now() - (sellerInfo.createdAt.toDate ? sellerInfo.createdAt.toDate().getTime() : Date.now())) / (1000 * 60 * 60 * 24))
              : null),
        };

        // 4) AI 판매자 신뢰도 평가 API 호출
        const response = await fetch(
          `${FUNCTIONS_ORIGIN}/getSellerTrustScore`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ seller: sellerInfo, stats }),
          }
        );

        if (!response.ok) {
          throw new Error("AI 판매자 신뢰도 평가 서버 응답 오류");
        }

        const data = await response.json();
        console.log(`⭐ AI 판매자 신뢰도 평가: ${data.score} / 5.0 (${data.label})`);
        setSellerTrust(data);
      } catch (err: any) {
        console.error("⭐ AI 판매자 신뢰도 평가 오류:", err);
        setSellerTrust(null);
      } finally {
        setSellerTrustLoading(false);
      }
    };

    void fetchSellerTrust();
  }, [product?.id, product?.sellerId]);

  // ✨ AI 상품 요약 로드
  useEffect(() => {
    if (!product || !product.name) return;

    const fetchSummary = async () => {
      setSummaryLoading(true);
      try {
        const response = await fetch(
          `${FUNCTIONS_ORIGIN}/getProductSummary`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: product.name,
              category: product.category || "",
              description: product.description || "",
              tags: (product as any).tags || (product as any).aiTags || [],
              imageUrl: product.imageUrl || null,
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("❌ getProductSummary API 오류:", response.status, errorText);
          throw new Error(`서버 응답 오류: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        setSummary(data.summary || "");
      } catch (error: any) {
        console.error("✨ AI 상품 요약 오류:", error);
        console.error("✨ 오류 상세:", {
          message: error?.message,
          code: error?.code,
          stack: error?.stack,
        });
        setSummary("");
      } finally {
        setSummaryLoading(false);
      }
    };

    void fetchSummary();
  }, [product?.id, product?.name]);

  // ⚠️ AI 사기 감지 로드
  useEffect(() => {
    if (!product || !product.name) return;

    const fetchFraudRisk = async () => {
      setFraudLoading(true);
      try {
        // 평균가 계산 (같은 카테고리 상품들의 평균가)
        let avgPrice: number | null = null;
        try {
          if (product.category) {
            const q = query(
              collection(db, "marketProducts"),
              where("category", "==", product.category)
            );
            const snap = await getDocs(q);
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
        } catch (avgError) {
          console.warn("평균가 계산 실패:", avgError);
        }

        const response = await fetch(
          `${FUNCTIONS_ORIGIN}/detectFraudRisk`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: product.name,
              price: product.price || null,
              avgPrice: avgPrice,
              description: product.description || "",
              category: product.category || "",
              tags: (product as any).tags || (product as any).aiTags || [],
              imageUrl: product.imageUrl || null,
              userProfile: {
                uid: (product as any).userId || null,
                createdAt: null, // TODO: 사용자 정보 추가 시 구현
                totalSales: 0, // TODO: 판매 이력 추가 시 구현
              },
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("❌ detectFraudRisk API 오류:", response.status, errorText);
          throw new Error(`서버 응답 오류: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        setFraudRisk(data);
      } catch (error: any) {
        console.error("⚠️ AI 사기 감지 오류:", error);
        console.error("⚠️ 오류 상세:", {
          message: error?.message,
          code: error?.code,
          stack: error?.stack,
        });
        setFraudRisk(null);
      } finally {
        setFraudLoading(false);
      }
    };

    void fetchFraudRisk();
  }, [product?.id, product?.name, product?.category, product?.price]);

  // 📸 AI 이미지 품질 점수 로드
  useEffect(() => {
    if (!product?.imageUrl) return;

    const fetchImageQuality = async () => {
      setQualityLoading(true);
      try {
        const response = await fetch(
          `${FUNCTIONS_ORIGIN}/getImageQualityScore`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageUrl: product.imageUrl,
            }),
          }
        );

        if (!response.ok) {
          throw new Error("서버 응답 오류");
        }

        const data = await response.json();
        setImageQuality(data);
      } catch (error: any) {
        console.error("📸 AI 이미지 품질 분석 오류:", error);
        setImageQuality(null);
      } finally {
        setQualityLoading(false);
      }
    };

    void fetchImageQuality();
  }, [product?.id, product?.imageUrl]);

  // 🧩 AI 상품 상태 점수 로드
  useEffect(() => {
    if (!product) return;

    const fetchConditionScore = async () => {
      setConditionLoading(true);
      try {
        const response = await fetch(
          `${FUNCTIONS_ORIGIN}/getConditionScore`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              description: product.description || "",
              imageUrl: product.imageUrl || null,
              category: product.category || "",
              tags: (product as any).tags || (product as any).aiTags || [],
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("❌ getConditionScore API 오류:", response.status, errorText);
          throw new Error(`서버 응답 오류: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        setConditionScore(data);
      } catch (error: any) {
        console.error("🧩 AI 상품 상태 점수 오류:", error);
        console.error("🧩 오류 상세:", {
          message: error?.message,
          code: error?.code,
          stack: error?.stack,
        });
        setConditionScore(null);
      } finally {
        setConditionLoading(false);
      }
    };

    void fetchConditionScore();
  }, [product?.id, product?.imageUrl, product?.description, product?.category]);

  // 📈 AI 가격 미래 예측 로드 (1주/2주 후 범위)
  useEffect(() => {
    if (!product || !product.price || !product.category) return;

    const fetchFuturePrice = async () => {
      setFuturePriceLoading(true);
      try {
        // 1) Firestore에서 최근 시세 데이터 수집
        const historicalPricesQuery = query(
          collection(db, "marketProducts"),
          where("category", "==", product.category),
          orderBy("createdAt", "desc")
        );

        let historicalSnap;
        try {
          historicalSnap = await getDocs(historicalPricesQuery);
        } catch (indexError: any) {
          // Firestore 인덱스 오류 처리
          if (indexError?.code === "failed-precondition" || indexError?.message?.includes("index") || indexError?.message?.includes("requires an index")) {
            console.error("❌ Firestore 인덱스가 필요합니다 (가격 미래 예측):", indexError);
            
            // 인덱스 생성 링크 자동 추출
            const indexUrlMatch = indexError?.message?.match(/https:\/\/console\.firebase\.google\.com[^\s\)]+/);
            const indexUrl = indexUrlMatch?.[0];
            
            if (indexUrl) {
              console.error("🔗 인덱스 생성 링크 (클릭하여 생성):", indexUrl);
              console.error("📌 위 링크를 클릭하거나 복사해서 브라우저에서 열어주세요.");
            } else {
              console.error("📌 Firebase Console에서 인덱스를 수동으로 생성해주세요.");
            }
            
            // 인덱스 오류는 치명적이지 않으므로 빈 배열로 처리
            historicalSnap = { docs: [] } as any;
          } else {
            throw indexError;
          }
        }
        const historicalPrices = historicalSnap.docs
          .map((doc) => {
            const data = doc.data();
            return typeof data.price === "number" ? data.price : null;
          })
          .filter((p): p is number => p !== null && p > 0)
          .slice(0, 30); // 최근 30개

        // 2) 가격 예측 API 호출
        const response = await fetch(
          `${FUNCTIONS_ORIGIN}/predictFuturePrice`,
          {
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
          }
        );

        if (!response.ok) {
          throw new Error("서버 응답 오류");
        }

        const data = await response.json();
        setFuturePrice(data);
      } catch (error: any) {
        console.error("📈 AI 가격 미래 예측 오류:", error);
        setFuturePrice(null);
      } finally {
        setFuturePriceLoading(false);
      }
    };

    // conditionScore와 imageQuality가 준비된 후 실행
    if (conditionScore !== null || imageQuality !== null || conditionScore === null && imageQuality === null) {
      void fetchFuturePrice();
    }
  }, [product?.id, product?.price, product?.name, product?.category, product?.description, conditionScore?.score, imageQuality?.score]);

  // 🧰 AI 구성품 분석 로드
  useEffect(() => {
    if (!product || !product.imageUrl) return;

    const fetchComponents = async () => {
      setComponentsLoading(true);
      try {
        const response = await fetch(
          `${FUNCTIONS_ORIGIN}/detectComponents`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              category: product.category || "",
              description: product.description || "",
              imageUrl: product.imageUrl || null,
            }),
          }
        );

        if (!response.ok) {
          throw new Error("서버 응답 오류");
        }

        const data = await response.json();
        setComponents(data.components || []);
        setComponentsSummary(data.summary || "");
      } catch (error: any) {
        console.error("🧰 AI 구성품 분석 오류:", error);
        setComponents([]);
        setComponentsSummary("");
      } finally {
        setComponentsLoading(false);
      }
    };

    void fetchComponents();
  }, [product?.id, product?.imageUrl, product?.category, product?.description]);

  // ⭐ AI 종합 등급 로드
  useEffect(() => {
    if (!product) return;

    // 모든 필요한 데이터가 준비될 때까지 대기
    if (conditionScore === null || imageQuality === null || fraudRisk === null || components.length === 0) {
      return; // 아직 데이터가 준비되지 않음
    }

    const fetchTotalScore = async () => {
      setTotalScoreLoading(true);
      try {
        // 최근 시세 데이터 수집 (가격 적정성 계산용)
        let historicalPrices: number[] = [];
        if (product.category) {
          try {
            const historicalPricesQuery = query(
              collection(db, "marketProducts"),
              where("category", "==", product.category),
              orderBy("createdAt", "desc")
            );

            const historicalSnap = await getDocs(historicalPricesQuery);
            historicalPrices = historicalSnap.docs
              .map((doc) => {
                const data = doc.data();
                return typeof data.price === "number" ? data.price : null;
              })
              .filter((p): p is number => p !== null && p > 0)
              .slice(0, 20); // 최근 20개
          } catch (histError) {
            console.warn("⚠️ 시세 데이터 수집 실패:", histError);
          }
        }

        const response = await fetch(
          `${FUNCTIONS_ORIGIN}/generateTotalScore`,
          {
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
          }
        );

        if (!response.ok) {
          throw new Error("서버 응답 오류");
        }

        const data = await response.json();
        setTotalScore(data);
      } catch (error: any) {
        console.error("⭐ AI 종합 등급 오류:", error);
        setTotalScore(null);
      } finally {
        setTotalScoreLoading(false);
      }
    };

    void fetchTotalScore();
  }, [product?.id, product?.price, product?.category, product?.aiOneLine, conditionScore?.score, imageQuality?.score, fraudRisk, components]);

  const timeAgo = useMemo(() => {

    if (!product?.createdAt?.toDate) return null;

    const createdDate = product.createdAt.toDate();

    return dayjs(createdDate).fromNow();

  }, [product?.createdAt]);



  const images = useMemo(() => {

    if (product?.imageUrls && product.imageUrls.length > 0) {

      return product.imageUrls;

    }

    if (product?.imageUrl) {

      return [product.imageUrl];

    }

    return [];

  }, [product?.imageUrls, product?.imageUrl]);



  // 상품이 바뀌면 첫 이미지부터

  useEffect(() => {

    setActiveIndex(0);

  }, [product?.id]);



  // 좌표 검증 및 변환 함수 (Firestore GeoPoint 지원)
  const getValidCoordinates = (product: ProductDetail): { lat: number; lng: number } | null => {
    // 1. 직접 숫자로 저장된 경우
    if (
      typeof product.latitude === "number" &&
      typeof product.longitude === "number" &&
      !isNaN(product.latitude) &&
      !isNaN(product.longitude) &&
      product.latitude >= -90 &&
      product.latitude <= 90 &&
      product.longitude >= -180 &&
      product.longitude <= 180
    ) {
      return { lat: product.latitude, lng: product.longitude };
    }

    // 2. Firestore GeoPoint 타입인 경우 (any 타입으로 접근)
    const productData = product as any;
    if (productData.latitude?.toNumber) {
      // Firestore GeoPoint의 latitude/longitude 메서드
      return {
        lat: productData.latitude.toNumber(),
        lng: productData.longitude.toNumber(),
      };
    }

    // 3. 문자열로 저장된 경우 (숫자로 변환 시도)
    const latStr = String(product.latitude ?? "");
    const lngStr = String(product.longitude ?? "");
    const latNum = parseFloat(latStr);
    const lngNum = parseFloat(lngStr);

    if (
      !isNaN(latNum) &&
      !isNaN(lngNum) &&
      latNum >= -90 &&
      latNum <= 90 &&
      lngNum >= -180 &&
      lngNum <= 180
    ) {
      return { lat: latNum, lng: lngNum };
    }

    // 4. 좌표가 없거나 유효하지 않음
    return null;
  };

  // 지도 모달 열릴 때 Google Map 초기화 (천재 버전)
  useEffect(() => {
    if (!showMap) {
      // 모달 닫힐 때는 에러도 초기화
      setMapError(null);
      return;
    }

    if (!mapRef.current) return;
    if (!product) return;

    const container = mapRef.current;
    container.innerHTML = "";
    setMapError(null);

    // 1) 원본 좌표 값 가져오기
    const rawLat = (product as any).latitude;
    const rawLng = (product as any).longitude;

    // 2) 숫자로 변환 (null, undefined, 빈 문자열 명시적 처리)
    const lat =
      rawLat !== null && rawLat !== undefined && rawLat !== ""
        ? Number(rawLat)
        : null;

    const lng =
      rawLng !== null && rawLng !== undefined && rawLng !== ""
        ? Number(rawLng)
        : null;

    console.debug("상품 좌표 원본:", { rawLat, rawLng });
    console.debug("상품 좌표 정규화:", { lat, lng });

    // 3) 좌표 없으면 지도를 띄우지 않고 에러만 보여줌
    if (
      lat === null ||
      lng === null ||
      Number.isNaN(lat) ||
      Number.isNaN(lng)
    ) {
      console.error("상품에 유효한 좌표가 없습니다.", {
        rawLat,
        rawLng,
        product,
      });
      setMapError(
        "이 상품에는 위치 정보가 없습니다. 상품 등록 시 위치를 다시 저장해 주세요."
      );
      return;
    }

    let cancelled = false;
    let map: google.maps.Map | null = null;

    // 4) 구글 지도 로드 + 마커 찍기
    loadGoogleMap()
      .then((google) => {
        if (cancelled) return;
        if (!container) return;

        map = new google.maps.Map(container, {
          center: { lat, lng },
          zoom: 16,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "greedy",
        });

        // 최신 마커 API(있으면 사용, 없으면 옛날 Marker)
        const markerLib = (google.maps as any).marker;
        if (markerLib && markerLib.AdvancedMarkerElement) {
          const { AdvancedMarkerElement } = markerLib;
          new AdvancedMarkerElement({
            map,
            position: { lat, lng },
          });
        } else {
          new google.maps.Marker({
            map,
            position: { lat, lng },
          });
        }

        console.debug("상품 위치에 마커 표시 완료:", { lat, lng });
      })
      .catch((err) => {
        console.error("구글 지도 로드 실패:", err);
        setMapError("지도를 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.");
      });

    return () => {
      cancelled = true;
    };
  }, [showMap, product]);



  // 거리 계산 (현재 위치 기준)
  const handleCalculateDistance = () => {
    if (!product) {
      setMapError("상품 정보가 없습니다.");
      return;
    }

    // 좌표 정규화 (안전한 변환)
    const rawLat = (product as any).latitude;
    const rawLng = (product as any).longitude;

    const lat =
      rawLat !== null && rawLat !== undefined && rawLat !== ""
        ? Number(rawLat)
        : null;

    const lng =
      rawLng !== null && rawLng !== undefined && rawLng !== ""
        ? Number(rawLng)
        : null;

    if (lat === null || lng === null || Number.isNaN(lat) || Number.isNaN(lng)) {
      setMapError("이 상품에는 위치 정보가 없습니다. 상품 등록 시 위치를 다시 저장해 주세요.");
      return;
    }

    if (!navigator.geolocation) {

      setMapError("현재 위치를 가져올 수 없습니다.");

      return;

    }



    setDistanceLoading(true);

    setMapError(null);



    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const d = getDistanceKm(
          pos.coords.latitude,
          pos.coords.longitude,
          lat,
          lng
        );

        setDistanceKm(d);
        setDistanceLoading(false);
      },

      (err) => {

        console.error("현재 위치 조회 실패:", err);

        setMapError("현재 위치를 가져올 수 없습니다. 위치 권한을 확인해주세요.");

        setDistanceLoading(false);

      }

    );

  };



  // Google 지도 길찾기 열기
  const handleOpenGoogleDirections = () => {
    if (!product) {
      setMapError("상품 정보가 없습니다.");
      return;
    }

    // 좌표 정규화 (안전한 변환)
    const rawLat = (product as any).latitude;
    const rawLng = (product as any).longitude;

    const lat =
      rawLat !== null && rawLat !== undefined && rawLat !== ""
        ? Number(rawLat)
        : null;

    const lng =
      rawLng !== null && rawLng !== undefined && rawLng !== ""
        ? Number(rawLng)
        : null;

    if (lat === null || lng === null || Number.isNaN(lat) || Number.isNaN(lng)) {
      setMapError("이 상품에는 위치 정보가 없습니다. 상품 등록 시 위치를 다시 저장해 주세요.");
      return;
    }

    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, "_blank");
  };



  // 로딩 상태

  if (loading) {

    return (

      <div className="w-full max-w-[720px] mx-auto px-4 py-6">

        <div className="mb-4">

          <Skeleton className="h-3 w-24 rounded-full" />

        </div>

        {/* 이미지 영역 스켈레톤 */}

        <div className="w-full mb-6">

          <Skeleton className="w-full rounded-[32px] h-[260px] sm:h-[320px]" />

        </div>

        {/* 텍스트 영역 스켈레톤 */}

        <div className="space-y-3">

          <Skeleton className="h-6 w-44 rounded-full" />

          <Skeleton className="h-5 w-32 rounded-full" />

          <Skeleton className="h-4 w-56 rounded-full" />

        </div>

        {/* 버튼 스켈레톤 */}

        <div className="mt-6 flex gap-3">

          <Skeleton className="h-11 flex-1 rounded-2xl" />

          <Skeleton className="h-11 flex-1 rounded-2xl" />

        </div>

      </div>

    );

  }



  // 💬 채팅하기 핸들러
  const handleChat = async () => {
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }

    if (!product?.sellerId && !product?.userId) {
      alert("판매자 정보가 없습니다.");
      return;
    }

    const sellerId = product.sellerId || product.userId;

    if (!sellerId) {
      alert("판매자 정보가 없습니다.");
      return;
    }

    // 본인이 본인에게 채팅 방지
    if (user.uid === sellerId) {
      alert("본인 상품에서는 채팅을 시작할 수 없습니다.");
      return;
    }

    try {
      // 채팅 방 ID 생성 규칙 (두 uid 조합)
      const chatId = [user.uid, sellerId].sort().join("_");

      const chatRef = doc(db, "chats", chatId);
      const chatSnap = await getDoc(chatRef);

      if (!chatSnap.exists()) {
        await setDoc(chatRef, {
          users: [user.uid, sellerId],
          lastMessage: "",
          updatedAt: serverTimestamp(),
          product: {
            id: product.id,
            name: product.name,
            imageUrl: product.imageUrl ?? null,
          },
        });
      }

      // 채팅 페이지로 이동
      navigate(`/app/chat/${chatId}`);
    } catch (error: any) {
      console.error("채팅방 생성 오류:", error);
      alert("채팅방 생성 중 오류가 발생했습니다.\n" + (error.message || "알 수 없는 오류"));
    }
  };

  // 에러 상태

  if (error) {

    return (

      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center px-4">

        <p className="text-lg font-semibold text-red-500">{error}</p>

        <Button variant="outline" onClick={() => navigate(-1)}>

          뒤로가기

        </Button>

      </div>

    );

  }



  // 상품 없음

  if (!product) {

    return (

      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center px-4">

        <h1 className="text-xl font-semibold text-gray-700">

          상품을 찾을 수 없습니다.

        </h1>

        <p className="text-sm text-gray-500">

          이미 삭제되었거나 존재하지 않는 상품입니다.

        </p>

        <Button variant="outline" onClick={() => navigate(-1)}>

          뒤로가기

        </Button>

      </div>

    );

  }



  // 🔎 간단 AI 분석 더미 (이전 구조 유지)

  const aiBlock = (() => {

    const aiCategory = /(축구|농구|야구|테니스|러닝|골프|헬스|운동)/.test(

      product.name

    )

      ? "스포츠 용품"

      : "일반 상품";

    const aiCondition = "상태 양호";

    const basePrice = product.price ?? 20000;

    const aiRecommendedPrice =

      Math.round((basePrice * 0.9) / 1000) * 1000 || 20000;

    const aiSummary = product.description?.trim()

      ? `${product.name}은(는) 현재 상태가 양호한 중고 상품으로 보이며, 운동 및 일상 사용에 모두 적합합니다.`

      : `${product.name}은(는) 현재 상태가 양호한 중고 상품으로, 사용 이력에 따라 실제 상태를 한번 더 확인해보는 것을 추천합니다.`;



    return (

      <div className="rounded-2xl border border-[#e5e5ea] bg-white px-4 py-4 shadow-sm">

        <h2 className="text-[15px] font-semibold text-gray-900 mb-3">

          🔎 AI 상품 분석

        </h2>

        <div className="space-y-2 text-[14px] leading-relaxed text-gray-700">

          <div>

            <span className="font-semibold text-gray-900">AI 카테고리:</span>{" "}

            {aiCategory}

          </div>

          <div>

            <span className="font-semibold text-gray-900">상태 판단:</span>{" "}

            {aiCondition}

          </div>

          <div>

            <span className="font-semibold text-gray-900">

              시세 기반 추천 가격:

            </span>{" "}

            <span className="text-[#0a84ff] font-bold">

              {aiRecommendedPrice.toLocaleString()}원

            </span>

          </div>

          <p className="text-gray-600 mt-2">{aiSummary}</p>

        </div>

      </div>

    );

  })();



  return (

    <div className="min-h-screen w-full bg-gradient-to-b from-[#f5f5f7] to-white">

      <div className="detail-view w-full px-4 pt-4 pb-10">

        {/* 상단 뒤로가기 */}

        <button

          type="button"

          onClick={() => navigate(-1)}

          className="mb-3 inline-flex items-center text-xs font-medium text-gray-500 hover:text-gray-700 transition"

        >

          <span className="mr-1 text-sm">←</span>

          <span>목록으로 돌아가기</span>

        </button>



        {/* 메인 카드 */}

        <section

          className="product-detail overflow-hidden rounded-[32px] border border-[#e5e5ea] 

          bg-white shadow-[0_26px_80px_rgba(15,23,42,0.12)]"

        >

          {/* 이미지 섹션 */}

          <div className="relative px-4 pt-6 pb-2 bg-transparent">

            <div

              className="

                mx-auto w-full max-w-[600px]

                rounded-[28px]

                overflow-hidden

                bg-gradient-to-b from-[#f5f5f7] to-white

                shadow-[0_18px_45px_rgba(0,0,0,0.1)]

                flex items-center justify-center

              "

              style={{ aspectRatio: "4 / 3" }}

            >

              {images.length > 0 ? (

                <ProductImage src={images[activeIndex]} alt={product.name} />

              ) : (

                <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">

                  이미지가 없습니다.

                </div>

              )}

            </div>



            {/* 좌우 네비게이션 */}

            {images.length > 1 && (

              <>

                <button

                  type="button"

                  className="

                    absolute left-6 top-1/2 -translate-y-1/2

                    inline-flex h-10 w-10 items-center justify-center

                    rounded-full bg-white/90 text-gray-700 shadow

                    hover:bg-white transition backdrop-blur-md

                  "

                  onClick={() =>

                    setActiveIndex((prev) =>

                      prev === 0 ? images.length - 1 : prev - 1

                    )

                  }

                >

                  ◀

                </button>

                <button

                  type="button"

                  className="

                    absolute right-6 top-1/2 -translate-y-1/2

                    inline-flex h-10 w-10 items-center justify-center

                    rounded-full bg-white/90 text-gray-700 shadow

                    hover:bg-white transition backdrop-blur-md

                  "

                  onClick={() =>

                    setActiveIndex((prev) =>

                      prev === images.length - 1 ? 0 : prev + 1

                    )

                  }

                >

                  ▶

                </button>

              </>

            )}



            {/* 하단 도트 */}

            {images.length > 1 && (

              <div

                className="

                  mt-3 flex justify-center gap-1.5

                  bg-black/25 px-3 py-1.5 rounded-full backdrop-blur-sm

                  w-max mx-auto

                "

              >

                {images.map((_, idx) => (

                  <button

                    key={idx}

                    type="button"

                    className={`h-1.5 w-1.5 rounded-full transition ${

                      idx === activeIndex ? "bg-white" : "bg-white/60"

                    }`}

                    onClick={() => setActiveIndex(idx)}

                  />

                ))}

              </div>

            )}

          </div>



          {/* 정보 섹션 */}

          <div className="space-y-6 p-6 sm:p-8">

            {/* 상단 메타 / 타이틀 / 가격 */}

            <div className="space-y-3">

              <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-gray-500">

                <span className="inline-flex items-center rounded-full bg-[#e8f0ff] px-2.5 py-0.5 text-[#0a84ff]">

                  스포츠 마켓

                </span>

                {/* 🔥 위치 보기 버튼: location/region 또는 latitude/longitude가 있으면 표시 */}
                {(product.location || product.region || 
                  (typeof product.latitude === "number" && !isNaN(product.latitude) && 
                   typeof product.longitude === "number" && !isNaN(product.longitude))) && (

                  <>

                    <span className="h-3 w-px bg-gray-300" />

                    {product.location || product.region ? (
                      <span className="truncate max-w-[140px]">
                        {product.location ?? product.region}
                      </span>
                    ) : (
                      <span className="truncate max-w-[140px] text-gray-500">
                        위치 정보
                      </span>
                    )}

                    <button

                      onClick={() => {
                        // 🔥 id가 없으면 경고
                        if (!id) {
                          console.error("❌ 수정하기 버튼: id가 undefined입니다!", { id, productId: product?.id });
                          alert("상품 ID를 찾을 수 없습니다. 페이지를 새로고침해주세요.");
                          return;
                        }
                        console.log("🔥 위치 보기 버튼 클릭:", { id, productId: product?.id });
                        setShowMap(true);
                      }}

                      className="ml-2 text-[#0a84ff] underline text-[11px]"

                    >

                      위치 보기

                    </button>

                  </>

                )}

                {timeAgo && (

                  <>

                    <span className="h-3 w-px bg-gray-300" />

                    <span>{timeAgo}</span>

                  </>

                )}

              </div>



              <h1 className="text-[22px] sm:text-[26px] font-semibold tracking-tight text-[#111111]">

                {product.name}

              </h1>



              <div className="flex items-baseline gap-2">

                <p className="text-[24px] sm:text-[28px] font-extrabold tracking-tight text-[#111111]">

                  {product.price

                    ? `${product.price.toLocaleString()}원`

                    : "가격 미정"}

                </p>

                {product.price && (

                  <span className="text-xs text-gray-500">

                    VAT 포함 · 단일가

                  </span>

                )}

              </div>

            </div>

            {/* ✏️ 수정/삭제 버튼 (판매자만 표시) */}
            {(() => {
              // 🔥 디버깅: 권한 체크 로그
              const currentUserId = user?.uid;
              const productUserId = (product as any)?.userId || (product as any)?.ownerId || (product as any)?.sellerId;
              const hasUserId = !!(product as any)?.userId || !!(product as any)?.ownerId || !!(product as any)?.sellerId;
              const isOwner = currentUserId && productUserId && (currentUserId === productUserId);
              
              console.log("🔥 수정/삭제 버튼 권한 체크:", {
                currentUserId,
                productUserId,
                hasUserId,
                isOwner,
                user: user ? { uid: user.uid, isAnonymous: user.isAnonymous } : null,
                product: {
                  userId: (product as any)?.userId,
                  ownerId: (product as any)?.ownerId,
                  sellerId: (product as any)?.sellerId,
                  id: product?.id,
                },
              });
              
              // ⚠️ 개발 모드에서 권한 불일치 시 안내 메시지
              if (process.env.NODE_ENV === 'development' && currentUserId && productUserId && !isOwner) {
                console.warn("⚠️ 권한 불일치 발견!");
                console.warn("📌 현재 로그인한 UID:", currentUserId);
                console.warn("📌 상품의 userId:", productUserId);
                console.warn("💡 해결 방법: Firestore Console에서 해당 문서의 userId를 현재 UID로 수정하세요.");
                console.warn("   Firebase Console → Firestore → marketProducts → 해당 문서 → userId 필드 수정");
              }
              
              return null; // 로그만 출력
            })()}
            {/* 🔥 개발 모드: 현재 UID 표시 (디버깅용) */}
            {process.env.NODE_ENV === 'development' && user?.uid && (
              <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-xs">
                <p className="font-semibold text-yellow-700 dark:text-yellow-300 mb-1">
                  🔍 디버깅 정보 (개발 모드)
                </p>
                <p className="text-yellow-600 dark:text-yellow-400">
                  현재 로그인 UID: <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">{user.uid}</code>
                </p>
                <p className="text-yellow-600 dark:text-yellow-400 mt-1">
                  상품 userId: <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">
                    {(product as any)?.userId || (product as any)?.ownerId || (product as any)?.sellerId || "없음"}
                  </code>
                </p>
                {user.uid !== ((product as any)?.userId || (product as any)?.ownerId || (product as any)?.sellerId) && (
                  <p className="text-red-600 dark:text-red-400 mt-1 font-semibold">
                    ⚠️ UID 불일치 → 수정/삭제 버튼이 숨겨집니다.
                  </p>
                )}
              </div>
            )}
            {user?.uid && ((product as any)?.userId || (product as any)?.ownerId || (product as any)?.sellerId) && 
             (user.uid === (product as any)?.userId || user.uid === (product as any)?.ownerId || user.uid === (product as any)?.sellerId) ? (
              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 h-10 rounded-xl text-[13px] font-semibold border-[#0a84ff] text-[#0a84ff] hover:bg-[#0a84ff] hover:text-white transition"
                  onClick={() => {
                    // 🔥 id가 없으면 경고 표시
                    if (!id) {
                      console.error("❌ 수정하기 버튼: id가 undefined입니다!", { id, productId: product?.id });
                      alert("상품 ID를 찾을 수 없습니다. 페이지를 새로고침해주세요.");
                      return;
                    }
                    console.log("🔥 수정하기 버튼 클릭:", { id, productId: product?.id });
                    navigate(`/app/market/edit/${id}`);
                  }}
                >
                  ✏️ 수정하기
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 h-10 rounded-xl text-[13px] font-semibold border-[#ff3b30] text-[#ff3b30] hover:bg-[#ff3b30] hover:text-white transition"
                  onClick={async () => {
                    if (!id || !user) return;
                    
                    const confirmed = confirm("정말로 이 상품을 삭제하시겠습니까?\n삭제된 상품은 복구할 수 없습니다.");
                    if (!confirmed) return;

                    try {
                      const productRef = doc(db, "marketProducts", id);
                      await deleteDoc(productRef);
                      alert("상품이 삭제되었습니다.");
                      navigate("/app/market");
                    } catch (error: any) {
                      console.error("상품 삭제 오류:", error);
                      alert("상품 삭제 중 오류가 발생했습니다.\n" + (error.message || "알 수 없는 오류"));
                    }
                  }}
                >
                  🗑️ 삭제하기
                </Button>
              </div>
            ) : null}

            {/* ⚠️ AI 사기 감지 경고 */}
            {fraudLoading ? (
              <div className="animate-pulse bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-sm text-gray-500 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                  AI가 사기 위험도를 분석 중...
                </div>
              </div>
            ) : fraudRisk && fraudRisk.label !== "low" ? (
              <div
                className={`p-4 rounded-xl text-sm mt-4 border ${
                  fraudRisk.label === "high"
                    ? "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300"
                    : fraudRisk.label === "medium"
                    ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300"
                    : "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300"
                }`}
              >
                <h3 className="font-semibold mb-1 flex items-center gap-2">
                  <span>⚠️</span> AI 사기 위험 분석: {fraudRisk.label.toUpperCase()}
                  {fraudRisk.label === "high" && (
                    <span className="text-xs bg-red-200 dark:bg-red-800 px-2 py-0.5 rounded-full">
                      고위험
                    </span>
                  )}
                  {fraudRisk.label === "medium" && (
                    <span className="text-xs bg-yellow-200 dark:bg-yellow-800 px-2 py-0.5 rounded-full">
                      주의
                    </span>
                  )}
                </h3>
                <p className="leading-relaxed mt-2">{fraudRisk.reason}</p>
                {fraudRisk.risk && (
                  <p className="text-xs mt-2 opacity-75">
                    위험도 점수: {Math.round(fraudRisk.risk * 100)}%
                  </p>
                )}
              </div>
            ) : null}

            {/* 📸 AI 이미지 품질 점수 */}
            {qualityLoading ? (
              <div className="animate-pulse bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-sm text-gray-500 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                  AI가 이미지 품질을 분석 중...
                </div>
              </div>
            ) : imageQuality ? (
              <div
                className={`p-4 rounded-xl text-sm mt-4 border ${
                  imageQuality.label === "high"
                    ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300"
                    : imageQuality.label === "medium"
                    ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300"
                    : "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300"
                }`}
              >
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <span>📸</span> 이미지 품질: {imageQuality.label.toUpperCase()}
                  {imageQuality.label === "high" && (
                    <span className="text-xs bg-green-200 dark:bg-green-800 px-2 py-0.5 rounded-full">
                      고품질
                    </span>
                  )}
                  {imageQuality.label === "medium" && (
                    <span className="text-xs bg-yellow-200 dark:bg-yellow-800 px-2 py-0.5 rounded-full">
                      보통
                    </span>
                  )}
                  {imageQuality.label === "low" && (
                    <span className="text-xs bg-red-200 dark:bg-red-800 px-2 py-0.5 rounded-full">
                      저품질
                    </span>
                  )}
                </h3>
                <p className="text-xs leading-relaxed mt-2">{imageQuality.reason}</p>
                {imageQuality.score && (
                  <p className="text-xs mt-2 opacity-75">
                    품질 점수: {Math.round(imageQuality.score * 100)}/100
                  </p>
                )}
              </div>
            ) : null}

            {/* 🧩 AI 상품 상태 점수 */}
            {conditionLoading ? (
              <div className="animate-pulse bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-sm text-gray-500 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                  AI가 상품 상태를 분석 중...
                </div>
              </div>
            ) : conditionScore ? (
              <div
                className={`mt-4 p-4 rounded-xl text-sm border ${
                  conditionScore.level === "상"
                    ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300"
                    : conditionScore.level === "중"
                    ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300"
                    : "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300"
                }`}
              >
                <h3 className="font-semibold mb-1 flex items-center gap-2">
                  <span>🧩</span> 상품 상태: {conditionScore.level}
                  {conditionScore.level === "상" && (
                    <span className="text-xs bg-green-200 dark:bg-green-800 px-2 py-0.5 rounded-full">
                      양호
                    </span>
                  )}
                  {conditionScore.level === "중" && (
                    <span className="text-xs bg-yellow-200 dark:bg-yellow-800 px-2 py-0.5 rounded-full">
                      보통
                    </span>
                  )}
                  {conditionScore.level === "하" && (
                    <span className="text-xs bg-red-200 dark:bg-red-800 px-2 py-0.5 rounded-full">
                      주의
                    </span>
                  )}
                </h3>
                <p className="leading-relaxed mt-2 text-xs">{conditionScore.reason}</p>
                {conditionScore.score && (
                  <p className="text-xs mt-2 opacity-75">
                    상태 점수: {Math.round(conditionScore.score * 100)}/100
                  </p>
                )}
              </div>
            ) : null}

            {/* 📈 AI 가격 미래 예측 (1주/2주 후 범위) */}
            {futurePriceLoading ? (
              <div className="animate-pulse bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-sm text-gray-500 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                  AI가 가격 변동을 예측 중...
                </div>
              </div>
            ) : futurePrice && (futurePrice.oneWeek || futurePrice.twoWeeks) ? (
              <div className="p-4 rounded-xl mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 text-sm">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <span>📈</span> AI 가격 예측
                  {futurePrice.trend === "상승" && (
                    <span className="text-xs bg-blue-200 dark:bg-blue-800 px-2 py-0.5 rounded-full">
                      상승 추세
                    </span>
                  )}
                  {futurePrice.trend === "하락" && (
                    <span className="text-xs bg-orange-200 dark:bg-orange-800 px-2 py-0.5 rounded-full">
                      하락 추세
                    </span>
                  )}
                  {futurePrice.trend === "보합" && (
                    <span className="text-xs bg-gray-200 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                      보합 추세
                    </span>
                  )}
                </h3>

                <div className="space-y-2">
                  {futurePrice.oneWeek && (
                    <div>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">
                        📅 1주 후 예상 가격 범위:
                      </p>
                      <p className="font-semibold">
                        {futurePrice.oneWeek.min.toLocaleString()}원 ~ {futurePrice.oneWeek.max.toLocaleString()}원
                      </p>
                    </div>
                  )}

                  {futurePrice.twoWeeks && (
                    <div>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">
                        📅 2주 후 예상 가격 범위:
                      </p>
                      <p className="font-semibold">
                        {futurePrice.twoWeeks.min.toLocaleString()}원 ~ {futurePrice.twoWeeks.max.toLocaleString()}원
                      </p>
                    </div>
                  )}

                  <p className="mt-2 text-xs opacity-80">
                    추세: <span className="font-semibold">{futurePrice.trend}</span>
                  </p>

                  <p className="mt-1 text-xs leading-relaxed opacity-90">
                    {futurePrice.reason}
                  </p>
                </div>
              </div>
            ) : null}

            {/* 🧰 AI 구성품 체크 */}
            {componentsLoading ? (
              <div className="animate-pulse bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4 text-sm text-gray-500 border border-indigo-200 dark:border-indigo-700">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                  AI가 구성품을 분석 중...
                </div>
              </div>
            ) : components.length > 0 ? (
              <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 mt-4">
                <h3 className="font-semibold text-indigo-700 dark:text-indigo-300 mb-3 flex items-center gap-2">
                  <span>🧰</span> 구성품 체크
                </h3>

                <ul className="space-y-2 text-sm">
                  {components.map((c, index) => (
                    <li key={`${c.name}-${index}`} className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      {c.status === "있음" && (
                        <span className="text-green-600 dark:text-green-400 font-bold">✔</span>
                      )}
                      {c.status === "없음" && (
                        <span className="text-red-600 dark:text-red-400 font-bold">✖</span>
                      )}
                      {c.status === "판단불가" && (
                        <span className="text-gray-500 dark:text-gray-400 font-bold">?</span>
                      )}
                      <span className="flex-1">{c.name}</span>
                      <span className={`text-xs ${
                        c.status === "있음" ? "text-green-600 dark:text-green-400" :
                        c.status === "없음" ? "text-red-600 dark:text-red-400" :
                        "text-gray-500 dark:text-gray-400"
                      }`}>
                        {c.status}
                      </span>
                    </li>
                  ))}
                </ul>

                {componentsSummary && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-3 leading-relaxed">
                    {componentsSummary}
                  </p>
                )}
              </div>
            ) : null}

            {/* ⭐ AI 종합 등급 (0~5점) */}
            {totalScoreLoading ? (
              <div className="animate-pulse bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 text-sm text-gray-500 border border-yellow-200 dark:border-yellow-700">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                  AI가 종합 등급을 계산 중...
                </div>
              </div>
            ) : totalScore ? (
              <div className={`p-4 rounded-xl mt-4 border ${
                totalScore.score >= 4.5
                  ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200"
                  : totalScore.score >= 3.5
                  ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200"
                  : totalScore.score >= 2.5
                  ? "bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200"
                  : totalScore.score >= 1.5
                  ? "bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700 text-orange-800 dark:text-orange-200"
                  : "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-800 dark:text-red-200"
              }`}>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <span className="text-xl">⭐</span> 종합 등급: {totalScore.score.toFixed(1)} / 5.0
                  {totalScore.score >= 4.5 && (
                    <span className="text-xs bg-yellow-200 dark:bg-yellow-800 px-2 py-0.5 rounded-full">
                      매우 좋음
                    </span>
                  )}
                  {totalScore.score >= 3.5 && totalScore.score < 4.5 && (
                    <span className="text-xs bg-blue-200 dark:bg-blue-800 px-2 py-0.5 rounded-full">
                      좋음
                    </span>
                  )}
                  {totalScore.score >= 2.5 && totalScore.score < 3.5 && (
                    <span className="text-xs bg-gray-200 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                      보통
                    </span>
                  )}
                  {totalScore.score >= 1.5 && totalScore.score < 2.5 && (
                    <span className="text-xs bg-orange-200 dark:bg-orange-800 px-2 py-0.5 rounded-full">
                      나쁨
                    </span>
                  )}
                  {totalScore.score < 1.5 && (
                    <span className="text-xs bg-red-200 dark:bg-red-800 px-2 py-0.5 rounded-full">
                      매우 나쁨
                    </span>
                  )}
                </h3>
                <p className="text-sm font-medium mb-1">{totalScore.label}</p>
                <p className="text-xs mt-1 opacity-80 leading-relaxed">{totalScore.reason}</p>
              </div>
            ) : null}

            {/* ✨ AI 상품 요약 */}
            {summaryLoading ? (
              <div className="animate-pulse bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 text-sm text-gray-500 border border-purple-100 dark:border-purple-800">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                  AI가 요약을 생성 중...
                </div>
              </div>
            ) : summary ? (
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 text-sm text-gray-800 dark:text-gray-200 border border-purple-100 dark:border-purple-800">
                <h3 className="text-purple-700 dark:text-purple-300 font-semibold mb-2 flex items-center gap-2">
                  <span>✨</span> AI 요약
                </h3>
                <p className="leading-relaxed">{summary}</p>
              </div>
            ) : null}

            {/* 설명 */}

            <div className="rounded-2xl border border-[#e5e5ea] bg-[#f5f5f7] px-4 py-3.5 text-[13px] sm:text-sm leading-relaxed text-gray-800">

              {product.description?.trim()

                ? product.description

                : "상품 설명이 없습니다."}

            </div>



            {/* ⭐ AI 판매자 신뢰도 평가 */}
            {sellerTrustLoading ? (
              <div className="mt-4 animate-pulse p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
              </div>
            ) : sellerTrust ? (
              <div
                className={`
                  mt-4 p-4 rounded-xl text-sm border
                  ${
                    sellerTrust.label === "매우 신뢰"
                      ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200"
                      : sellerTrust.label === "신뢰"
                      ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-800 dark:text-green-200"
                      : sellerTrust.label === "보통"
                      ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200"
                      : sellerTrust.label === "주의"
                      ? "bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700 text-orange-800 dark:text-orange-200"
                      : "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-800 dark:text-red-200"
                  }
                `}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-xs uppercase tracking-wide opacity-70 mb-1">
                      판매자 신뢰도
                    </div>
                    <div className="text-lg font-semibold flex items-center gap-2">
                      <span>⭐</span>
                      {sellerTrust.score.toFixed(1)} / 5.0
                    </div>
                    <div className="text-xs mt-1 font-medium">{sellerTrust.label}</div>
                  </div>

                  {/* 판매자 프로필 간단 배지 */}
                  <div className="text-right text-xs opacity-80">
                    <div className="font-medium">
                      {(product as any).sellerNickname || "판매자"}
                    </div>
                    {product.sellerId && (
                      <div className="text-[10px] opacity-60 mt-1">
                        거래 이력 확인
                      </div>
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
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
                  🔮 AI 추천 상품
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  {relatedProducts.map((item) => (
                    <ProductCard key={item.id} product={item} />
                  ))}
                </div>
              </div>
            )}

            {relatedLoading && (
              <div className="mt-6 animate-pulse">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4"></div>
                <div className="grid grid-cols-1 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  ))}
                </div>
              </div>
            )}

            {/* 🔍 AI 유사상품 추천 (의미 기반) */}
            {similarLoading ? (
              <div className="mt-8 animate-pulse">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-56 mb-4"></div>
                <div className="flex overflow-x-auto space-x-4 pb-2 sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 sm:space-x-0 sm:gap-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="min-w-[65%] sm:min-w-0 h-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  ))}
                </div>
              </div>
            ) : similarProducts.length > 0 ? (
              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <span>🔍</span> 이 상품과 비슷한 추천
                </h3>
                <div className="flex overflow-x-auto space-x-4 pb-2 sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 sm:space-x-0 sm:gap-4">
                  {similarProducts.map((item) => (
                    <div key={item.id} className="min-w-[65%] sm:min-w-0">
                      <ProductCard
                        product={item}
                        distanceKm={undefined}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}



            {/* 액션 버튼 */}

            <div className="mt-2 flex flex-col gap-3 sm:flex-row">

              <Button 
                className="flex-1 h-11 rounded-xl bg-[#0a84ff] text-white text-[14px] font-semibold shadow-[0_10px_30px_rgba(10,132,255,0.45)] hover:bg-[#0062d6]"
                onClick={handleChat}
              >

                💬 판매자와 채팅하기

              </Button>



              <Button

                variant={liked ? "default" : "outline"}

                className={`flex-1 h-11 rounded-xl text-[14px] font-semibold transition

                  ${

                    liked

                      ? "bg-[#ff3b30] text-white hover:bg-[#e02b22] border-none shadow-[0_10px_26px_rgba(255,59,48,0.4)]"

                      : "border-[#d1d1d6] text-[#0a84ff] hover:bg-[#f5f5f7]"

                  }`}

                onClick={async () => {

                  if (!id) return;

                  if (!user) {

                    alert("로그인이 필요합니다.");

                    return;

                  }

                  const favRef = doc(

                    db,

                    "users",

                    user.uid,

                    "favorites",

                    id

                  );

                  try {

                    if (liked) {

                      await deleteDoc(favRef);

                      setLiked(false);

                    } else {

                      await setDoc(favRef, {

                        name: product.name,

                        imageUrl: product.imageUrl ?? null,

                        price: product.price ?? null,

                        createdAt: serverTimestamp(),

                      });

                      setLiked(true);

                    }

                  } catch (err) {

                    console.error(

                      "즐겨찾기 처리 중 오류가 발생했습니다.",

                      err

                    );

                  }

                }}

              >

                {liked ? "❤️ 찜 해제" : "🤍 찜하기"}

              </Button>

            </div>

          </div>

        </section>

      </div>



      {/* 지도 모달 (Google Maps) */}

      {showMap && (

        <div

          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"

          onClick={() => setShowMap(false)}

        >

          <div

            className="bg-white w-[90%] max-w-[420px] rounded-2xl p-4 shadow-xl"

            onClick={(e) => e.stopPropagation()}

          >

            <h2 className="text-lg font-semibold mb-2">📍 상품 위치</h2>



            <div className="w-full h-60 rounded-xl overflow-hidden bg-gray-100">

              <div ref={mapRef} className="w-full h-full" />

            </div>



            {mapError && (

              <p className="mt-2 text-xs text-red-500">{mapError}</p>

            )}



            {distanceKm !== null && (

              <p className="mt-2 text-sm text-gray-700">

                현재 위치에서 약{" "}

                <span className="font-semibold">

                  {distanceKm.toFixed(1)}km

                </span>{" "}

                떨어져 있어요.

              </p>

            )}



            <div className="mt-3 flex flex-col gap-2">

              <Button

                variant="outline"

                className="w-full h-9 text-[13px]"

                onClick={handleCalculateDistance}

                disabled={distanceLoading}

              >

                {distanceLoading

                  ? "📏 거리 계산 중..."

                  : "📏 현재 위치와 거리 계산"}

              </Button>



              <Button

                className="w-full h-9 text-[13px] bg-[#0a84ff] text-white hover:bg-[#0062d6]"

                onClick={handleOpenGoogleDirections}

              >

                🚗 Google 지도 길찾기 열기

              </Button>



              <Button

                variant="outline"

                className="w-full h-9 text-[13px]"

                onClick={() => setShowMap(false)}

              >

                닫기

              </Button>

            </div>

          </div>

        </div>

      )}

    </div>

  );

}
