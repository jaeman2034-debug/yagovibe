import { useCallback, useEffect, useMemo, useRef, useState, memo, type ReactElement } from "react";

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
  updateDoc,
  increment,
  deleteField,
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
import { sportHubHref } from "@/utils/sportHubHref";
import {
  openGoogleDirectionsTo,
  openKakaoDirectionsTo,
  openNaverDirectionsTo,
} from "@/utils/mapDirections";
import { fetchMarketPost } from "@/services/marketService";
import type { MarketPost } from "@/features/market/types";
import { MarketListingStatusBadge } from "@/components/market/MarketListingStatusBadge";
import { normalizeMarketListingStatus } from "@/utils/marketListingStatus";
import { canTransitionMarketPostStatus } from "@/utils/marketPostStatusTransition";
import RecruitDetail from "@/features/market/components/details/RecruitDetail";
import MatchDetail from "@/features/market/components/details/MatchDetail";



dayjs.extend(relativeTime);

dayjs.locale("ko");

const MAX_STATUS_HISTORY = 20;

function isNetworkLikeFetchError(error: unknown): boolean {
  if (!error) return false;
  const msg =
    typeof error === "object" && error && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : String(error);
  return (
    msg.includes("Failed to fetch") ||
    msg.includes("NetworkError") ||
    msg.includes("Load failed") ||
    msg.includes("Network request failed")
  );
}

function isFirestorePermissionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = String((error as { code?: unknown }).code ?? "");
  const message = String((error as { message?: unknown }).message ?? "");
  return code.includes("permission-denied") || message.includes("Missing or insufficient permissions");
}


// 이미지 컴포넌트 (React.memo로 re-render 방지)

const ProductImage = memo(
  ({
    src,
    alt,
    variant = "card",
  }: {
    src: string;
    alt: string;
    variant?: "card" | "hero";
  }) => (
    <img
      src={src}
      alt={alt}
      className={
        variant === "hero"
          ? "h-full w-full object-cover select-none"
          : "h-full w-full max-h-[420px] object-contain select-none"
      }
      loading="eager"
      decoding="sync"
      draggable={false}
      width={600}
      height={450}
    />
  )
);



ProductImage.displayName = "ProductImage";

function toLocationLabel(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const rec = value as Record<string, unknown>;
    const candidates = [
      rec.address,
      rec.roadAddress,
      rec.placeName,
      rec.name,
      rec.dong,
      rec.region,
    ];
    for (const c of candidates) {
      if (typeof c === "string" && c.trim().length > 0) {
        return c.trim();
      }
    }
  }
  return null;
}

function safeText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "object") return "";
  return String(value);
}

function normalizeProductDetail(id: string, data: ProductDetail): ProductDetail {
  const safeName = typeof data.name === "string" ? data.name : "";
  const safePrice = typeof data.price === "number" && Number.isFinite(data.price) ? data.price : undefined;
  const safeStatus = typeof data.status === "string" ? data.status : "active";
  const safeRegion =
    typeof data.region === "string" || data.region === null ? data.region : null;
  const safeLocation =
    typeof data.location === "string" || data.location === null ? data.location : null;
  const safeImageUrl = typeof data.imageUrl === "string" ? data.imageUrl : null;
  const safeImageUrls = Array.isArray(data.imageUrls)
    ? data.imageUrls.filter((url): url is string => typeof url === "string" && url.trim().length > 0)
    : undefined;

  return {
    ...data,
    id,
    name: safeName,
    price: safePrice,
    status: safeStatus,
    region: safeRegion,
    location: safeLocation,
    imageUrl: safeImageUrl,
    imageUrls: safeImageUrls,
  };
}



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

  /** Firestore `market` / `marketProducts` 공통 */
  category?: string;

  status?: string;

};

/**
 * SSOT가 `market` 컬렉션일 때 ProductDetail UI 필드로 정규화
 * (equipment 등: title, authorId, images)
 */
function normalizeMarketCollectionToProductDetail(
  docId: string,
  d: Record<string, unknown>
): ProductDetail {
  const images = Array.isArray(d.images)
    ? (d.images as unknown[]).filter(
        (x): x is string => typeof x === "string" && x.length > 0
      )
    : [];
  const title = typeof d.title === "string" ? d.title : "";
  const name =
    typeof d.name === "string" && d.name.trim() ? d.name : title || "상품";
  const author =
    (typeof d.authorId === "string" && d.authorId) ||
    (typeof d.userId === "string" && d.userId) ||
    (typeof d.ownerId === "string" && d.ownerId) ||
    (typeof d.sellerId === "string" && d.sellerId) ||
    null;
  const imageUrl =
    (typeof d.imageUrl === "string" && d.imageUrl) ||
    (typeof d.thumbnailUrl === "string" && d.thumbnailUrl) ||
    images[0] ||
    null;
  let price: number | undefined;
  if (typeof d.price === "number" && Number.isFinite(d.price)) {
    price = d.price;
  } else if (typeof d.price === "string") {
    const n = Number(String(d.price).replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(n)) price = n;
  }
  const lat =
    typeof d.latitude === "number"
      ? d.latitude
      : typeof d.lat === "number"
        ? d.lat
        : null;
  const lng =
    typeof d.longitude === "number"
      ? d.longitude
      : typeof d.lng === "number"
        ? d.lng
        : null;
  return {
    id: docId,
    name,
    price,
    imageUrl,
    imageUrls: images.length ? images : undefined,
    description:
      typeof d.description === "string"
        ? d.description
        : typeof d.desc === "string"
          ? d.desc
          : undefined,
    region:
      typeof d.region === "string"
        ? d.region
        : typeof d.location === "string"
          ? d.location
          : null,
    location: typeof d.location === "string" ? d.location : null,
    createdAt: (d.createdAt as ProductDetail["createdAt"]) ?? null,
    latitude: lat,
    longitude: lng,
    userId: author,
    ownerId: author,
    sellerId: author,
    category: typeof d.category === "string" ? d.category : undefined,
    status: typeof d.status === "string" ? d.status : undefined,
  };
}



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

/** 상품 설명: 접힘 시 불릿·줄 단위로 스캔 가능하게 */
type DescriptionPreview =
  | { kind: "bullets"; items: string[]; needsToggle: boolean }
  | { kind: "text"; preview: string; needsToggle: boolean };

function buildDescriptionPreview(plain: string): DescriptionPreview {
  const lines = plain.split(/\r?\n+/).map((l) => l.trim()).filter(Boolean);
  if (lines.length >= 2) {
    const items = lines.slice(0, 3).map((l) => {
      if (/^[•・]/.test(l)) return l;
      if (/^[-*]\s/.test(l)) return `• ${l.replace(/^[-*]\s+/, "")}`;
      if (/^\d+[.)]\s/.test(l)) return `• ${l.replace(/^\d+[.)]\s+/, "")}`;
      return `• ${l}`;
    });
    return {
      kind: "bullets",
      items,
      needsToggle: lines.length > 3 || plain.length > 400,
    };
  }
  const needsToggle = plain.length > 200;
  return {
    kind: "text",
    preview: needsToggle ? `${plain.slice(0, 200)}…` : plain,
    needsToggle,
  };
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

/** `market` 문서만 있고 `marketPosts` 동기화가 없을 때 상세 분기용 */
function marketDocToMarketPost(docId: string, d: Record<string, unknown>): MarketPost {
  const images = Array.isArray(d.images)
    ? (d.images as unknown[]).filter((x): x is string => typeof x === "string" && x.length > 0)
    : [];
  const cat = typeof d.category === "string" ? d.category : "equipment";
  return {
    id: docId,
    ...(d as Omit<MarketPost, "id">),
    images: images.length ? images : [],
    category: cat as MarketPost["category"],
    sport: (typeof d.sport === "string" ? d.sport : "soccer") as MarketPost["sport"],
    title: typeof d.title === "string" ? d.title : "",
    status: (typeof d.status === "string" ? d.status : "active") as MarketPost["status"],
    authorId: typeof d.authorId === "string" ? d.authorId : String(d.userId || d.ownerId || ""),
    createdAt: d.createdAt ?? Date.now(),
  } as MarketPost;
}

type MarketListingSource = "marketProducts" | "market" | "marketPosts" | "recruitPosts";

type LoadMarketListingResult = {
  resolvedProduct: ProductDetail;
  mpResolved: MarketPost | null;
  collectionRef: MarketListingSource;
};

/**
 * `marketProducts` → `market` → `marketPosts` → `recruitPosts` 순으로 단일 id 조회
 * (허브·알림에서 `activities` 문서 id로 잘못 열린 경우는 호출 측에서 `activities.refId` 재시도)
 */
async function loadMarketListingByPostId(trimmedId: string): Promise<LoadMarketListingResult | null> {
  let snap = await getDoc(doc(db, "marketProducts", trimmedId));
  let source: "marketProducts" | "market" = "marketProducts";

  if (!snap.exists()) {
    snap = await getDoc(doc(db, "market", trimmedId));
    source = "market";
  }

  let resolvedProduct: ProductDetail | null = null;
  let mpResolved: MarketPost | null = null;
  let collectionRef: MarketListingSource = "marketProducts";

  if (!snap.exists()) {
    const mp = await fetchMarketPost(trimmedId);
    if (mp) {
      mpResolved = mp;
      collectionRef = "marketPosts";
      resolvedProduct = normalizeMarketCollectionToProductDetail(mp.id, { ...mp } as Record<string, unknown>);
    } else {
      const recruitSnap = await getDoc(doc(db, "recruitPosts", trimmedId));
      if (recruitSnap.exists()) {
        const rd = recruitSnap.data() as Record<string, unknown>;
        resolvedProduct = normalizeMarketCollectionToProductDetail(recruitSnap.id, rd);
        mpResolved = marketDocToMarketPost(recruitSnap.id, rd);
        collectionRef = "recruitPosts";
      }
    }
  } else {
    const productData = snap.data() ?? {};
    resolvedProduct =
      source === "market"
        ? normalizeMarketCollectionToProductDetail(snap.id, productData as Record<string, unknown>)
        : {
            id: snap.id,
            ...(productData as Omit<ProductDetail, "id">),
          };
    collectionRef = source;

    const mpSync = await fetchMarketPost(trimmedId);
    if (mpSync) {
      mpResolved = mpSync;
    } else if (source === "market") {
      const cat = (productData as { category?: string }).category;
      if (cat === "recruit" || cat === "match" || cat === "equipment") {
        mpResolved = marketDocToMarketPost(snap.id, productData as Record<string, unknown>);
      }
    }
  }

  if (!resolvedProduct) return null;
  return { resolvedProduct, mpResolved, collectionRef };
}

export default function ProductDetailPage() {

  const { id: paramId, postId: paramPostId, sport: hubSportParam } = useParams<{
    id?: string;
    postId?: string;
    sport?: string;
  }>();
  const id = paramId ?? paramPostId;

  const navigate = useNavigate();

  /** 마켓 리스트 단일 라우트: /sports/:sport/market */
  const goBackToMarketList = () => {
    const sid = hubSportParam?.trim();
    if (sid) {
      navigate(sportHubHref("market", sid));
      return;
    }
    navigate(-1);
  };

  const [product, setProduct] = useState<ProductDetail | null>(null);

  /** 통합 읽기 모델 — 있으면 카테고리별 전용 상세 UI */
  const [marketPost, setMarketPost] = useState<MarketPost | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [liked, setLiked] = useState(false);

  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [authReady, setAuthReady] = useState(false);

  const [activeIndex, setActiveIndex] = useState(0);

  /** 상세 조회에 성공한 Firestore 컬렉션 (삭제·일부 쓰기 경로용) */
  const productFirestoreCollectionRef = useRef<
    "marketProducts" | "market" | "marketPosts" | "recruitPosts"
  >("marketProducts");

  const [showMap, setShowMap] = useState(false);

  const mapRef = useRef<HTMLDivElement | null>(null);

  const [mapError, setMapError] = useState<string | null>(null);



  const [distanceKm, setDistanceKm] = useState<number | null>(null);

  const [distanceLoading, setDistanceLoading] = useState(false);

  /** 거리 계산·길찾기 시 출발지(현재 위치) 캐시 — Google Maps `origin`에 사용 */
  const [directionsUserOrigin, setDirectionsUserOrigin] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  /** 길찾기: 앱/지도 선택 시트 (즉시 외부 이동 금지) */
  const [showDirectionsSheet, setShowDirectionsSheet] = useState(false);

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

  /** 판매자 노출용(닉네임·완료 거래 수) — 상단 신뢰 블록 */
  const [sellerPublic, setSellerPublic] = useState<{
    nickname: string;
    successfulSales: number;
  } | null>(null);

  const [descExpanded, setDescExpanded] = useState(false);

  const [listingStatusSaving, setListingStatusSaving] = useState(false);

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

  /** AI Functions 네트워크 장애 시 동일 세션에서 반복 호출을 중단해 콘솔 노이즈를 줄인다. */
  const aiApiAvailableRef = useRef(true);
  const postToAiEndpoint = useCallback(
    async <T,>(path: string, payload: unknown, label: string): Promise<T | null> => {
      if (!aiApiAvailableRef.current) return null;
      try {
        const response = await fetch(`${FUNCTIONS_ORIGIN}${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const errorText = await response.text().catch(() => "");
          if (import.meta.env.DEV) {
            console.warn(`[ProductDetail] ${label} API 오류:`, response.status, errorText);
          }
          return null;
        }
        return (await response.json()) as T;
      } catch (error) {
        if (isNetworkLikeFetchError(error)) {
          aiApiAvailableRef.current = false;
          return null;
        }
        if (import.meta.env.DEV) {
          console.warn(`[ProductDetail] ${label} 호출 실패:`, error);
        }
        return null;
      }
    },
    []
  );



  // 상품 정보 로드

  useEffect(() => {

    let cancelled = false;

    if (!authReady) {
      setLoading(true);
      return () => {
        cancelled = true;
      };
    }

    const fetchProduct = async () => {
      setMarketPost(null);
      setError(null);

      if (!id) {
        setError("상품 ID가 올바르지 않습니다.");
        setLoading(false);
        return;
      }

      const trimmedId = id.trim();

      try {
        let loaded = await loadMarketListingByPostId(trimmedId);
        if (!loaded) {
          try {
            const actSnap = await getDoc(doc(db, "activities", trimmedId));
            if (actSnap.exists()) {
              const ad = actSnap.data() as Record<string, unknown>;
              const actRefId = typeof ad.refId === "string" ? ad.refId.trim() : "";
              if (actRefId && actRefId !== trimmedId) {
                loaded = await loadMarketListingByPostId(actRefId);
                if (import.meta.env.DEV) {
                  console.debug("[ProductDetail] activities refId hop", {
                    fromUrlId: trimmedId,
                    refId: actRefId,
                    found: !!loaded,
                  });
                }
              }
            }
          } catch (e) {
            if (import.meta.env.DEV) {
              console.debug("[ProductDetail] activities lookup skip", e);
            }
          }
        }

        const { resolvedProduct, mpResolved, collectionRef } = loaded
          ? loaded
          : {
              resolvedProduct: null as ProductDetail | null,
              mpResolved: null as MarketPost | null,
              collectionRef: "marketProducts" as const,
            };

        if (!cancelled) {
          if (import.meta.env.DEV) {
            console.debug("[ProductDetail] getDoc", {
              id: trimmedId,
              collection: collectionRef,
              exists: !!resolvedProduct,
              hasMarketPost: !!mpResolved,
              sourceHint:
                collectionRef === "recruitPosts"
                  ? "recruitPosts_only_sync_fallback"
                  : undefined,
            });
          }

          if (resolvedProduct) {
            productFirestoreCollectionRef.current = collectionRef;
            setProduct(normalizeProductDetail(resolvedProduct.id, resolvedProduct));
            setMarketPost(mpResolved);
          } else {
            productFirestoreCollectionRef.current = "marketProducts";
            setProduct(null);
            setMarketPost(null);
          }
        }
      } catch (err) {
        console.error("상품 정보를 불러오는 중 오류가 발생했습니다.", err);
        const code = (err as { code?: string } | null)?.code ?? "";
        const isPermissionDenied = code.includes("permission-denied");

        if (!cancelled) {
          setError(
            isPermissionDenied
              ? "권한이 없어 상품을 불러오지 못했습니다. 로그인 상태를 확인해주세요."
              : "상품 정보를 불러오는 중 문제가 발생했습니다."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };



    void fetchProduct();

    return () => {

      cancelled = true;

    };

  }, [authReady, id]);

  /** `marketPosts` 상세 조회수 (세션당 1회, Strict Mode 중복 완화) */
  useEffect(() => {
    if (!id || !product || !marketPost) return;
    const pid = id.trim();
    if (!pid) return;
    const key = `yago_mp_view_${pid}`;
    try {
      if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(key)) return;
    } catch {
      /* ignore */
    }
    const postRef = doc(db, "marketPosts", pid);
    void updateDoc(postRef, { viewCount: increment(1) })
      .then(() => {
        try {
          if (typeof sessionStorage !== "undefined") sessionStorage.setItem(key, "1");
        } catch {
          /* ignore */
        }
      })
      .catch(() => {
        /* 권한/필드 없음 등은 무시 */
      });
  }, [id, product, marketPost]);

  /** 모집/매칭 전용 상세일 때만 레거시 AI·추천 상태 제거 (중고 equipment는 통합 UI에서 AI 사용) */
  useEffect(() => {
    if (!marketPost || marketPost.category === "equipment") return;
    setRelatedProducts([]);
    setRelatedLoading(false);
    setSimilarProducts([]);
    setSimilarLoading(false);
    setSellerTrust(null);
    setSellerTrustLoading(false);
    setSummary("");
    setSummaryLoading(false);
    setFraudRisk(null);
    setFraudLoading(false);
    setImageQuality(null);
    setQualityLoading(false);
    setConditionScore(null);
    setConditionLoading(false);
    setFuturePrice(null);
    setFuturePriceLoading(false);
    setComponents([]);
    setComponentsSummary("");
    setComponentsLoading(false);
    setTotalScore(null);
    setTotalScoreLoading(false);
  }, [marketPost]);

  // 로그인 상태 감지

  useEffect(() => {

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {

      setUser(currentUser);
      setAuthReady(true);

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
    if (marketPost && marketPost.category !== "equipment") return;
    if (!product || !product.category) return;

    const fetchRelatedProducts = async () => {
      setRelatedLoading(true);
      try {
        // 1) 같은 카테고리의 후보 상품들 로드
        const q = query(
          collection(db, "marketProducts"),
          where("category", "==", product.category)
        );

        let snap;
        try {
          snap = await getDocs(q);
        } catch (dbError) {
          if (isFirestorePermissionError(dbError)) {
            console.warn("[ProductDetail] 연관 상품 조회 권한이 없어 추천을 건너뜁니다.");
            setRelatedProducts([]);
            return;
          }
          throw dbError;
        }
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
        const data = await postToAiEndpoint<{ related?: Array<{ id: string; score: number }> }>(
          "/getRelatedProducts",
          {
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
          },
          "getRelatedProducts"
        );
        if (!data) {
          setRelatedProducts([]);
          return;
        }
        const relatedIds = (data.related || [])
          .slice(0, 5) // 상위 5개만
          .map((r: { id: string; score: number }) => r.id);

        // 3) 점수가 높은 상품들만 필터링
        const filtered = candidates.filter((p) => relatedIds.includes(p.id));
        setRelatedProducts(filtered);
      } catch (error: any) {
        console.warn("🔮 연관 상품 추천 오류:", error);
        setRelatedProducts([]);
      } finally {
        setRelatedLoading(false);
      }
    };

    void fetchRelatedProducts();
  }, [marketPost, product?.id, product?.category, postToAiEndpoint]);

  // 🔍 AI 유사상품 추천 로드 (의미 기반)
  useEffect(() => {
    if (marketPost && marketPost.category !== "equipment") return;
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
        const data = await postToAiEndpoint<{ ranked?: Array<{ id: string }> }>(
          "/recommendSimilar",
          {
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
          },
          "recommendSimilar"
        );
        if (!data) {
          setSimilarProducts([]);
          return;
        }
        const rankedIds = (data.ranked || []).map((r: any) => r.id);

        // 4) AI가 정렬한 순서대로 상품 재배열 (상위 10개만)
        const sortedProducts = rankedIds
          .slice(0, 10)
          .map((id: string) => filtered.find((c) => c.id === id))
          .filter((p): p is MarketProduct => p !== undefined);

        // 5) 행정동 자동 변환은 나중에 필요 시 처리 (일단 그대로 사용)
        if (import.meta.env.DEV) {
          console.log(`🔍 AI 유사상품 추천: ${sortedProducts.length}개 상품 추천됨`);
        }
        setSimilarProducts(sortedProducts);
      } catch (err: any) {
        if (import.meta.env.DEV) console.warn("🔍 AI 유사상품 추천 오류:", err);
        setSimilarProducts([]);
      } finally {
        setSimilarLoading(false);
      }
    };

    void fetchSimilarProducts();
  }, [
    marketPost,
    product?.id,
    product?.name,
    product?.category,
    product?.description,
    product?.tags,
    product?.price,
    postToAiEndpoint,
  ]);

  // ⭐ AI 판매자 신뢰도 평가 로드
  useEffect(() => {
    if (marketPost && marketPost.category !== "equipment") return;
    const sellerUid = product?.sellerId || product?.userId;
    if (!product || !sellerUid) return;

    const fetchSellerTrust = async () => {
      setSellerTrustLoading(true);
      setSellerPublic(null);
      try {
        // 1) 판매자 통계 정보 불러오기
        const sellerDocRef = doc(db, "sellerProfiles", sellerUid);
        const sellerDocSnap = await getDoc(sellerDocRef);

        if (!sellerDocSnap.exists()) {
          // 판매자 프로필이 없으면 기본값 사용
          const userDocRef = doc(db, "users", sellerUid);
          const userDocSnap = await getDoc(userDocRef);

          if (!userDocSnap.exists()) {
            setSellerTrust(null);
            setSellerTrustLoading(false);
            return;
          }

          const userData = userDocSnap.data();
          const sellerInfo = {
            uid: sellerUid,
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

          setSellerPublic({
            nickname: String(sellerInfo.nickname || "판매자"),
            successfulSales: stats.successfulSales,
          });

          // 2) AI 판매자 신뢰도 평가 API 호출
          const data = await postToAiEndpoint<{
            score: number;
            label: "매우 신뢰" | "신뢰" | "보통" | "주의" | "위험";
            reason: string;
          }>(
            "/getSellerTrustScore",
            { seller: sellerInfo, stats },
            "getSellerTrustScore"
          );
          setSellerTrust(data);
          setSellerTrustLoading(false);
          return;
        }

        const sellerData = sellerDocSnap.data();

        // 2) 판매자 정보 정리
        const userDocRef = doc(db, "users", sellerUid);
        const userDocSnap = await getDoc(userDocRef);
        const userData = userDocSnap.exists() ? userDocSnap.data() : {};

        const sellerInfo = {
          uid: sellerUid,
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

        setSellerPublic({
          nickname: String(sellerInfo.nickname || "판매자"),
          successfulSales: stats.successfulSales,
        });

        // 4) AI 판매자 신뢰도 평가 API 호출
        const data = await postToAiEndpoint<{
          score: number;
          label: "매우 신뢰" | "신뢰" | "보통" | "주의" | "위험";
          reason: string;
        }>(
          "/getSellerTrustScore",
          { seller: sellerInfo, stats },
          "getSellerTrustScore"
        );
        if (!data) {
          setSellerTrust(null);
          return;
        }
        if (import.meta.env.DEV) {
          console.log(`⭐ AI 판매자 신뢰도 평가: ${data.score} / 5.0 (${data.label})`);
        }
        setSellerTrust(data);
      } catch (err: any) {
        if (import.meta.env.DEV) void err;
        setSellerTrust(null);
      } finally {
        setSellerTrustLoading(false);
      }
    };

    void fetchSellerTrust();
  }, [marketPost, product?.id, product?.sellerId, product?.userId, postToAiEndpoint]);

  useEffect(() => {
    setDescExpanded(false);
  }, [id]);

  useEffect(() => {
    setDirectionsUserOrigin(null);
    setDistanceKm(null);
  }, [id]);

  // ✨ AI 상품 요약 로드
  useEffect(() => {
    if (marketPost && marketPost.category !== "equipment") return;
    if (!product || !product.name) return;

    const fetchSummary = async () => {
      setSummaryLoading(true);
      try {
        const data = await postToAiEndpoint<{ summary?: string }>(
          "/getProductSummary",
          {
            name: product.name,
            category: product.category || "",
            description: product.description || "",
            tags: (product as any).tags || (product as any).aiTags || [],
            imageUrl: product.imageUrl || null,
          },
          "getProductSummary"
        );
        if (!data) {
          setSummary("");
          return;
        }
        setSummary(data.summary || "");
      } catch (error: any) {
        if (import.meta.env.DEV) {
          console.warn("✨ AI 상품 요약 오류:", error);
        }
        setSummary("");
      } finally {
        setSummaryLoading(false);
      }
    };

    void fetchSummary();
  }, [marketPost, product?.id, product?.name, postToAiEndpoint]);

  // ⚠️ AI 사기 감지 로드
  useEffect(() => {
    if (marketPost && marketPost.category !== "equipment") return;
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

        const data = await postToAiEndpoint<{
          risk: number;
          label: "low" | "medium" | "high";
          reason: string;
        }>(
          "/detectFraudRisk",
          {
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
          },
          "detectFraudRisk"
        );
        if (!data) {
          setFraudRisk(null);
          return;
        }
        setFraudRisk(data);
      } catch (error: any) {
        if (import.meta.env.DEV) {
          console.warn("⚠️ AI 사기 감지 오류:", error);
        }
        setFraudRisk(null);
      } finally {
        setFraudLoading(false);
      }
    };

    void fetchFraudRisk();
  }, [marketPost, product?.id, product?.name, product?.category, product?.price, postToAiEndpoint]);

  // 📸 AI 이미지 품질 점수 로드
  useEffect(() => {
    if (marketPost && marketPost.category !== "equipment") return;
    if (!product?.imageUrl) return;

    const fetchImageQuality = async () => {
      setQualityLoading(true);
      try {
        const data = await postToAiEndpoint<{
          score: number;
          label: "low" | "medium" | "high";
          reason: string;
        }>(
          "/getImageQualityScore",
          {
            imageUrl: product.imageUrl,
          },
          "getImageQualityScore"
        );
        if (!data) {
          setImageQuality(null);
          return;
        }
        setImageQuality(data);
      } catch (error: any) {
        console.warn("📸 AI 이미지 품질 분석 오류:", error);
        setImageQuality(null);
      } finally {
        setQualityLoading(false);
      }
    };

    void fetchImageQuality();
  }, [marketPost, product?.id, product?.imageUrl, postToAiEndpoint]);

  // 🧩 AI 상품 상태 점수 로드
  useEffect(() => {
    if (marketPost && marketPost.category !== "equipment") return;
    if (!product) return;

    const fetchConditionScore = async () => {
      setConditionLoading(true);
      try {
        const data = await postToAiEndpoint<{
          score: number;
          level: "상" | "중" | "하";
          reason: string;
        }>(
          "/getConditionScore",
          {
            description: product.description || "",
            imageUrl: product.imageUrl || null,
            category: product.category || "",
            tags: (product as any).tags || (product as any).aiTags || [],
          },
          "getConditionScore"
        );
        if (!data) {
          setConditionScore(null);
          return;
        }
        setConditionScore(data);
      } catch (error: any) {
        if (import.meta.env.DEV) {
          console.warn("🧩 AI 상품 상태 점수 오류:", error);
        }
        setConditionScore(null);
      } finally {
        setConditionLoading(false);
      }
    };

    void fetchConditionScore();
  }, [marketPost, product?.id, product?.imageUrl, product?.description, product?.category, postToAiEndpoint]);

  // 📈 AI 가격 미래 예측 로드 (1주/2주 후 범위)
  useEffect(() => {
    if (marketPost && marketPost.category !== "equipment") return;
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
        const data = await postToAiEndpoint<{
          oneWeek: { min: number; max: number } | null;
          twoWeeks: { min: number; max: number } | null;
          trend: "상승" | "보합" | "하락";
          reason: string;
        }>(
          "/predictFuturePrice",
          {
            name: product.name,
            category: product.category || "",
            description: product.description || "",
            price: product.price || null,
            conditionScore: conditionScore?.score || 0.5,
            imageQualityScore: imageQuality?.score || 0.5,
            historicalPrices: historicalPrices,
          },
          "predictFuturePrice"
        );
        if (!data) {
          setFuturePrice(null);
          return;
        }
        setFuturePrice(data);
      } catch (error: any) {
        if (import.meta.env.DEV) console.warn("📈 AI 가격 미래 예측 오류:", error);
        setFuturePrice(null);
      } finally {
        setFuturePriceLoading(false);
      }
    };

    // conditionScore와 imageQuality가 준비된 후 실행
    if (conditionScore !== null || imageQuality !== null || conditionScore === null && imageQuality === null) {
      void fetchFuturePrice();
    }
  }, [
    marketPost,
    product?.id,
    product?.price,
    product?.name,
    product?.category,
    product?.description,
    conditionScore?.score,
    imageQuality?.score,
    postToAiEndpoint,
  ]);

  // 🧰 AI 구성품 분석 로드
  useEffect(() => {
    if (marketPost && marketPost.category !== "equipment") return;
    if (!product || !product.imageUrl) return;

    const fetchComponents = async () => {
      setComponentsLoading(true);
      try {
        const data = await postToAiEndpoint<{
          components?: Array<{ name: string; status: "있음" | "없음" | "판단불가" }>;
          summary?: string;
        }>(
          "/detectComponents",
          {
            category: product.category || "",
            description: product.description || "",
            imageUrl: product.imageUrl || null,
          },
          "detectComponents"
        );
        if (!data) {
          setComponents([]);
          setComponentsSummary("");
          return;
        }
        setComponents(data.components || []);
        setComponentsSummary(data.summary || "");
      } catch (error: any) {
        if (import.meta.env.DEV) console.warn("🧰 AI 구성품 분석 오류:", error);
        setComponents([]);
        setComponentsSummary("");
      } finally {
        setComponentsLoading(false);
      }
    };

    void fetchComponents();
  }, [marketPost, product?.id, product?.imageUrl, product?.category, product?.description, postToAiEndpoint]);

  // ⭐ AI 종합 등급 로드
  useEffect(() => {
    if (marketPost && marketPost.category !== "equipment") return;
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

        const data = await postToAiEndpoint<{
          score: number;
          label: "매우 좋음" | "좋음" | "보통" | "나쁨" | "매우 나쁨";
          reason: string;
        }>(
          "/generateTotalScore",
          {
            conditionScore: conditionScore?.score || 0.5,
            imageQualityScore: imageQuality?.score || 0.5,
            fraud: fraudRisk,
            components: components,
            price: product.price || null,
            historicalPrices: historicalPrices,
            oneLineSummary: product.aiOneLine || "",
          },
          "generateTotalScore"
        );
        if (!data) {
          setTotalScore(null);
          return;
        }
        setTotalScore(data);
      } catch (error: any) {
        if (import.meta.env.DEV) console.warn("⭐ AI 종합 등급 오류:", error);
        setTotalScore(null);
      } finally {
        setTotalScoreLoading(false);
      }
    };

    void fetchTotalScore();
  }, [
    marketPost,
    product?.id,
    product?.price,
    product?.category,
    product?.aiOneLine,
    conditionScore?.score,
    imageQuality?.score,
    fraudRisk,
    components,
    postToAiEndpoint,
  ]);

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

  const locationLabel = useMemo(() => {
    const fromLocation = toLocationLabel(product?.location);
    if (fromLocation) return fromLocation;
    return toLocationLabel(product?.region);
  }, [product?.location, product?.region]);

  const listingStatus = useMemo(
    () => normalizeMarketListingStatus(product?.status),
    [product?.status]
  );
  const isListingSold = listingStatus === "sold";

  /** 판매자 본인: 상품 페이지에서는 새 거래 채팅을 열 수 없음 → 목록/알림으로만 진입 (handleChat과 동일 기준) */
  const viewerIsListingOwner = useMemo(() => {
    if (!user?.uid || !product) return false;
    const uid = user.uid;
    if (
      marketPost?.authorId &&
      typeof marketPost.authorId === "string" &&
      marketPost.authorId.trim() === uid
    ) {
      return true;
    }
    const p = product as { userId?: unknown; ownerId?: unknown; sellerId?: unknown };
    return p.userId === uid || p.ownerId === uid || p.sellerId === uid;
  }, [user?.uid, product, marketPost?.authorId]);

  const persistListingStatus = useCallback(
    async (nextRawStatus: string, opts?: { clearReservation?: boolean }) => {
      if (!id?.trim() || !product) return;
      const rawFrom = product.status ?? "active";
      if (!canTransitionMarketPostStatus(rawFrom, nextRawStatus)) {
        alert("이 상태로 변경할 수 없습니다.");
        return;
      }
      const pid = id.trim();
      const col = productFirestoreCollectionRef.current;
      const historyEntry = {
        from: rawFrom,
        to: nextRawStatus,
        changedAt: new Date().toISOString(),
      };
      const currentHistory = Array.isArray((product as any)?.statusHistory)
        ? ((product as any).statusHistory as unknown[])
        : [];
      const nextHistory = [...currentHistory, historyEntry].slice(-MAX_STATUS_HISTORY);
      const payload: Record<string, unknown> = {
        status: nextRawStatus,
        updatedAt: serverTimestamp(),
        lastStatusChangeAt: serverTimestamp(),
        statusHistory: nextHistory,
      };
      if (opts?.clearReservation) {
        payload.reservedBy = null;
        payload.reservedAt = null;
      }
      if (nextRawStatus === "done") {
        payload.soldAt = serverTimestamp();
      }
      if (nextRawStatus === "open" || nextRawStatus === "active") {
        payload.soldAt = deleteField();
      }

      const snapProduct: ProductDetail = { ...product };
      const snapMp: MarketPost | null = marketPost ? ({ ...marketPost } as MarketPost) : null;

      setProduct((p) => (p ? { ...p, status: nextRawStatus } : null));
      setMarketPost((mp) =>
        mp
          ? ({
              ...mp,
              status: nextRawStatus as MarketPost["status"],
              ...(opts?.clearReservation ? { reservedBy: null, reservedAt: null } : {}),
            } as MarketPost)
          : null
      );

      setListingStatusSaving(true);
      try {
        await updateDoc(doc(db, col, pid), payload);
        if (col !== "marketPosts") {
          try {
            await updateDoc(doc(db, "marketPosts", pid), payload);
          } catch {
            /* 동기 문서 없음 */
          }
        }
        if (col === "recruitPosts") {
          try {
            await updateDoc(doc(db, "market", pid), payload);
          } catch {
            /* market 없음 */
          }
        }
        if (col === "marketProducts") {
          try {
            await updateDoc(doc(db, "market", pid), payload);
          } catch {
            /* market 없음 */
          }
        }
        if (col === "market") {
          try {
            await updateDoc(doc(db, "marketProducts", pid), payload);
          } catch {
            /* marketProducts 없음 */
          }
          try {
            await updateDoc(doc(db, "recruitPosts", pid), payload);
          } catch {
            /* recruitPosts 없음 */
          }
        }
      } catch (e: unknown) {
        setProduct(snapProduct);
        setMarketPost(snapMp);
        console.error("[ProductDetail] listing status update", e);
        const msg = e instanceof Error ? e.message : "알 수 없는 오류";
        alert("상태 변경에 실패했습니다. 이전 상태로 되돌렸습니다.\n" + msg);
      } finally {
        setListingStatusSaving(false);
      }
    },
    [id, product, marketPost]
  );

  // 상품이 바뀌면 첫 이미지부터

  useEffect(() => {

    setActiveIndex(0);

  }, [product?.id]);



  // 좌표 검증 및 변환 함수 (Firestore GeoPoint · 문자열 · location 객체 — marketProducts 원본 spread 호환)
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

    const productData = product as any;

    // 2. Firestore GeoPoint (모듈 SDK: 동일 객체에 latitude / longitude 숫자)
    const latField = productData.latitude;
    if (
      latField &&
      typeof latField === "object" &&
      typeof latField.latitude === "number" &&
      typeof latField.longitude === "number"
    ) {
      const la = latField.latitude as number;
      const lo = latField.longitude as number;
      if (
        !isNaN(la) &&
        !isNaN(lo) &&
        la >= -90 &&
        la <= 90 &&
        lo >= -180 &&
        lo <= 180
      ) {
        return { lat: la, lng: lo };
      }
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

    // 4. location: { lat, lng } | { latitude, longitude } (원본 문서만 있고 평탄화 안 된 경우)
    const loc = productData.location;
    if (loc && typeof loc === "object" && !Array.isArray(loc)) {
      const la = Number(loc.lat ?? loc.latitude ?? loc.Latitude);
      const lo = Number(loc.lng ?? loc.longitude ?? loc.Longitude);
      if (
        Number.isFinite(la) &&
        Number.isFinite(lo) &&
        la >= -90 &&
        la <= 90 &&
        lo >= -180 &&
        lo <= 180
      ) {
        return { lat: la, lng: lo };
      }
    }

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

    const resolved = getValidCoordinates(product);
    console.debug("상품 좌표 정규화(getValidCoordinates):", resolved);

    if (!resolved) {
      console.error("상품에 유효한 좌표가 없습니다.", { product });
      setMapError(
        "이 상품에는 위치 정보가 없습니다. 상품 등록 시 위치를 다시 저장해 주세요."
      );
      return;
    }

    const { lat, lng } = resolved;

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

    const resolved = getValidCoordinates(product);
    if (!resolved) {
      setMapError("이 상품에는 위치 정보가 없습니다. 상품 등록 시 위치를 다시 저장해 주세요.");
      return;
    }
    const { lat, lng } = resolved;

    if (!navigator.geolocation) {

      setMapError("현재 위치를 가져올 수 없습니다.");

      return;

    }



    setDistanceLoading(true);

    setMapError(null);



    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const uLat = pos.coords.latitude;
        const uLng = pos.coords.longitude;
        setDirectionsUserOrigin({ lat: uLat, lng: uLng });
        const d = getDistanceKm(uLat, uLng, lat, lng);

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



  /** 길찾기·시트·구글 연동 — getValidCoordinates와 단일 소스 */
  const getDirectionsDestination = (): { lat: number; lng: number } | null => {
    if (!product) return null;
    return getValidCoordinates(product);
  };

  // Google 지도 길찾기 — 시트에서 "구글 지도" 선택 시에만 실행 (api=1 + destination + 캐시/일회 origin)
  const launchGoogleDirections = () => {
    const dest = getDirectionsDestination();
    if (!dest) {
      setMapError("이 상품에는 위치 정보가 없습니다. 상품 등록 시 위치를 다시 저장해 주세요.");
      return;
    }

    const openWith = (origin: { lat: number; lng: number } | null) => {
      openGoogleDirectionsTo(dest, origin);
    };

    if (directionsUserOrigin) {
      openWith(directionsUserOrigin);
      return;
    }

    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const o = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setDirectionsUserOrigin(o);
          openWith(o);
        },
        () => openWith(null),
        { enableHighAccuracy: false, timeout: 6000, maximumAge: 120_000 }
      );
      return;
    }

    openWith(null);
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
    if (listingStatus === "sold") {
      alert("판매가 완료된 상품입니다.");
      return;
    }
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }

    if (!product?.id) {
      alert("상품 정보가 없습니다.");
      return;
    }

    try {
      const {
        getOrCreateChat,
        resolveListingOwnerUid,
        getStableChatId,
        resolveTradeChatPostIdForMarketHub,
        normalizeTradeChatDocumentIdForRoute,
      } = await import("@/features/chat/services/chatService");

      const rawPostKey = String(marketPost?.id ?? product.id ?? "").trim();
      /** `getOrCreateChat`과 동일한 postId SSOT — listing·게시글 id 불일치 시 marketPosts 존재 쪽으로 통일 */
      const chatPostId = await resolveTradeChatPostIdForMarketHub(rawPostKey, product.id);
      const listingOwner = await resolveListingOwnerUid(chatPostId);
      const authorFromPost =
        typeof marketPost?.authorId === "string" ? marketPost.authorId.trim() : "";

      /** 판매자: 허브 `marketPosts.authorId` 최우선 → Firestore 단일 조회 → 레거시 상품 필드 */
      const sellerId =
        authorFromPost ||
        listingOwner ||
        (typeof product.sellerId === "string" ? product.sellerId.trim() : "") ||
        (typeof product.userId === "string" ? product.userId.trim() : "") ||
        (typeof product.ownerId === "string" ? product.ownerId.trim() : "") ||
        "";

      /** 본인 글 차단: 게시글 작성자·조회된 소유자 어느 한쪽이라도 본인이면 채팅 시작 불가 (product.ownerId 단독 신뢰 금지) */
      if (authorFromPost && user.uid === authorFromPost) {
        alert("본인 상품에서는 채팅을 시작할 수 없습니다.");
        return;
      }
      if (listingOwner && user.uid === listingOwner) {
        alert("본인 상품에서는 채팅을 시작할 수 없습니다.");
        return;
      }

      if (!sellerId) {
        alert("판매자 정보가 없습니다.");
        return;
      }

      if (user.uid === sellerId) {
        alert("본인 상품에서는 채팅을 시작할 수 없습니다.");
        return;
      }

      if (import.meta.env.DEV) {
        console.log("[CHAT DEBUG]", {
          rawPostKey,
          chatPostId,
          productDocId: product.id,
          marketPostId: marketPost?.id ?? null,
          authorFromPost: authorFromPost || null,
          listingOwner: listingOwner || null,
          sellerId,
          buyerId: user.uid,
          stableChatId: getStableChatId(chatPostId, sellerId, user.uid),
        });
      }

      const { chatId } = await getOrCreateChat({
        postId: chatPostId,
        postTitle: product.name,
        postImage: product.imageUrl ?? undefined,
        listingId: product.id,
        sport: typeof product.category === "string" ? product.category : "all",
        sellerId,
        buyerId: user.uid,
        productPrice: product.price,
        productCategory: typeof product.category === "string" ? product.category : undefined,
      });

      if (import.meta.env.DEV) {
        console.log("[CHAT DEBUG] resolved", {
          chatId,
          stableChatId: getStableChatId(chatPostId, sellerId, user.uid),
        });
      }

      navigate(`/app/chat/${normalizeTradeChatDocumentIdForRoute(chatId)}`);
    } catch (error: any) {
      console.error("채팅방 생성 오류:", error);
      alert("채팅방 생성 중 오류가 발생했습니다.\n" + (error.message || "알 수 없는 오류"));
    }
  };

  const handleToggleFavorite = async () => {
    if (!id || !product) return;
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }
    const favRef = doc(db, "users", user.uid, "favorites", id);
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
      console.error("즐겨찾기 처리 중 오류가 발생했습니다.", err);
    }
  };

  // 에러 상태

  if (error) {

    return (

      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center px-4">

        <p className="text-lg font-semibold text-red-500">{error}</p>

        <Button variant="outline" onClick={goBackToMarketList}>

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

        <Button variant="outline" onClick={goBackToMarketList}>

          뒤로가기

        </Button>

      </div>

    );

  }

  // marketPosts 통합 상세 — 모집·매칭만 전용 UI. 중고(equipment)는 아래 통합 ProductDetail(히어로·CTA·길찾기) 사용
  if (
    marketPost &&
    (marketPost.category === "recruit" || marketPost.category === "match")
  ) {
    const sportNav = (hubSportParam?.trim() || marketPost.sport || "soccer") as string;
    const shell = (inner: ReactElement) => (
      <div className="min-h-dvh bg-gray-50 pb-24">
        <div className="mx-auto w-full max-w-4xl px-4 pt-4">{inner}</div>
      </div>
    );
    if (marketPost.category === "recruit") {
      return shell(
        <RecruitDetail post={marketPost} onBack={goBackToMarketList} sport={sportNav} />
      );
    }
    return shell(
      <MatchDetail post={marketPost} onBack={goBackToMarketList} sport={sportNav} />
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

  const descriptionPlain = product.description?.trim() ?? "";
  const descPreview = buildDescriptionPreview(descriptionPlain);
  const showDescToggle =
    !!descriptionPlain && (descExpanded || descPreview.needsToggle);

  return (

    <div className="flex min-h-dvh w-full flex-col bg-gradient-to-b from-[#f5f5f7] to-white">

      <main className="detail-view w-full flex-1 px-4 pt-4 pb-6 sm:mx-auto sm:max-w-[720px] sm:px-6">

        {/* 상단 뒤로가기 */}

        <button

          type="button"

          onClick={goBackToMarketList}

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

          {/* 이미지 섹션 — 모바일 풀블리드 + 몰입 높이 */}
          <div className="relative bg-transparent pb-2 pt-4">
            <div
              className="
                relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2
                overflow-hidden rounded-none bg-gradient-to-b from-[#f5f5f7] to-white
                shadow-[0_18px_45px_rgba(0,0,0,0.1)]
                sm:left-auto sm:w-full sm:max-w-[720px] sm:translate-x-0 sm:mx-auto sm:rounded-[28px]
                min-h-[42dvh] max-h-[min(60dvh,560px)] sm:min-h-0 sm:max-h-none
                flex items-center justify-center
                sm:aspect-[4/3]
              "
            >
              {images.length > 0 ? (
                <div className="relative h-full min-h-[42dvh] w-full sm:min-h-0">
                  <div
                    className={`relative h-full w-full overflow-hidden sm:rounded-[28px] ${
                      isListingSold ? "brightness-[0.55]" : ""
                    }`}
                  >
                    <ProductImage
                      src={images[activeIndex]}
                      alt={product.name}
                      variant="hero"
                    />
                  </div>
                  {isListingSold ? (
                    <div className="pointer-events-none absolute inset-0 z-[6] flex items-center justify-center bg-black/35 sm:rounded-[28px]">
                      <span className="rounded-xl bg-black/60 px-5 py-2.5 text-lg font-bold tracking-tight text-white shadow-lg">
                        판매완료
                      </span>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="flex min-h-[42dvh] w-full items-center justify-center text-sm text-gray-400 sm:min-h-0">
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

                    absolute left-3 top-1/2 -translate-y-1/2 sm:left-6

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

                    absolute right-3 top-1/2 -translate-y-1/2 sm:right-6

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

            {/* 핵심 정보 블록: 제목 · 가격+상태 · 위치+길찾기 */}
            <div className="space-y-3 border-b border-[#e8e8ed] pb-5">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-gray-500">
                <span className="inline-flex items-center rounded-full bg-[#e8f0ff] px-2.5 py-0.5 text-[#0a84ff]">
                  스포츠 마켓
                </span>
                {timeAgo && (
                  <>
                    <span className="h-3 w-px bg-gray-300" />
                    <span>{safeText(timeAgo)}</span>
                  </>
                )}
              </div>

              <h1 className="text-xl font-semibold tracking-tight text-gray-900 sm:text-[22px]">
                {product.name}
              </h1>

              {/* 가격 + 상태 (+ VAT) 한 줄 스캔 */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="text-xl font-bold tabular-nums text-[#0a84ff] sm:text-2xl">
                  {product.price != null
                    ? `${product.price.toLocaleString()}원`
                    : "가격 미정"}
                </span>
                <MarketListingStatusBadge status={listingStatus} />
                {conditionLoading ? (
                  <span className="text-xs text-gray-400">상품 상태 분석 중…</span>
                ) : conditionScore ? (
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      conditionScore.level === "상"
                        ? "bg-emerald-50 text-emerald-800"
                        : conditionScore.level === "중"
                          ? "bg-amber-50 text-amber-900"
                          : "bg-orange-50 text-orange-900"
                    }`}
                    title="사진·설명 기반 상태 추정"
                  >
                    <span
                      className={
                        conditionScore.level === "상"
                          ? "text-emerald-500"
                          : conditionScore.level === "중"
                            ? "text-amber-500"
                            : "text-orange-500"
                      }
                    >
                      ●
                    </span>
                    {conditionScore.level === "상"
                      ? "상태 좋음"
                      : conditionScore.level === "중"
                        ? "보통"
                        : "상태 주의"}
                  </span>
                ) : null}
                {product.price != null ? (
                  <span className="text-[10px] leading-none text-gray-400 sm:text-[11px] sm:ml-0.5">
                    VAT 포함 · 단일가
                  </span>
                ) : null}
              </div>

              {(locationLabel ||
                product.region ||
                (typeof product.latitude === "number" &&
                  !Number.isNaN(product.latitude) &&
                  typeof product.longitude === "number" &&
                  !Number.isNaN(product.longitude))) ? (
                <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-3 text-sm text-gray-700">
                  <span className="min-w-0 flex-1 leading-snug">
                    <span className="text-gray-500">📍</span>{" "}
                    <span className="font-medium text-gray-800">
                      {safeText(locationLabel) || "위치 등록됨"}
                      {distanceKm != null ? ` · ${distanceKm.toFixed(1)}km` : ""}
                    </span>
                  </span>
                  {getDirectionsDestination() ? (
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        aria-label="위치 지도 보기"
                        className="inline-flex shrink-0 items-center rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 active:scale-[0.98] dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                        onClick={() => setShowMap(true)}
                      >
                        지도
                      </button>
                      <button
                        type="button"
                        aria-label="길찾기 — 지도 앱 선택"
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#0a84ff] px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/25 ring-2 ring-[#0a84ff]/20 transition hover:bg-[#0062d6] active:scale-[0.98]"
                        onClick={() => setShowDirectionsSheet(true)}
                      >
                        <span aria-hidden>🧭</span>
                        <span>길찾기</span>
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            {/* ✏️ 수정/삭제 버튼 (판매자만 표시) */}
            {user?.uid && ((product as any)?.userId || (product as any)?.ownerId || (product as any)?.sellerId) && 
             (user.uid === (product as any)?.userId || user.uid === (product as any)?.ownerId || user.uid === (product as any)?.sellerId) ? (
              <div className="mt-4 space-y-3">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 h-10 rounded-xl text-[13px] font-semibold border-[#0a84ff] text-[#0a84ff] hover:bg-[#0a84ff] hover:text-white transition"
                    onClick={() => {
                      if (!id) {
                        if (import.meta.env.DEV) {
                          console.warn("[ProductDetail] 수정하기: id 없음", { productId: product?.id });
                        }
                        alert("상품 ID를 찾을 수 없습니다. 페이지를 새로고침해주세요.");
                        return;
                      }
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
                        const col = productFirestoreCollectionRef.current;
                        const productRef = doc(db, col, id);
                        await deleteDoc(productRef);
                        const mirrorCols: string[] =
                          col === "recruitPosts"
                            ? ["market", "marketPosts", "marketProducts"]
                            : col === "market"
                              ? ["recruitPosts", "marketPosts", "marketProducts"]
                              : col === "marketPosts"
                                ? ["market", "recruitPosts", "marketProducts"]
                                : col === "marketProducts"
                                  ? ["market", "marketPosts", "recruitPosts"]
                                  : [];
                        for (const mc of mirrorCols) {
                          try {
                            await deleteDoc(doc(db, mc, id));
                          } catch {
                            /* 미러 없음 또는 이미 삭제 */
                          }
                        }
                        alert("상품이 삭제되었습니다.");
                        if (col === "marketPosts" || col === "recruitPosts") {
                          goBackToMarketList();
                        } else {
                          navigate("/app/market");
                        }
                      } catch (error: any) {
                        console.error("상품 삭제 오류:", error);
                        alert("상품 삭제 중 오류가 발생했습니다.\n" + (error.message || "알 수 없는 오류"));
                      }
                    }}
                  >
                    🗑️ 삭제하기
                  </Button>
                </div>
                {!isListingSold && (
                  <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-3 dark:border-amber-900/40 dark:bg-amber-950/25">
                    <p className="mb-2 text-xs font-semibold text-amber-900 dark:text-amber-100">
                      판매 상태 변경
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {listingStatus === "active" ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={listingStatusSaving}
                          className="rounded-lg border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
                          onClick={() => {
                            if (
                              !window.confirm(
                                "예약중으로 변경할까요?\n다른 구매자에게는 구매가 어렵다고 안내하는 것이 좋아요."
                              )
                            ) {
                              return;
                            }
                            void persistListingStatus("reserved");
                          }}
                        >
                          {listingStatusSaving ? "처리 중…" : "예약중으로"}
                        </Button>
                      ) : null}
                      {listingStatus === "reserved" ? (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={listingStatusSaving}
                            className="rounded-lg border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
                            onClick={() => {
                              if (
                                !window.confirm(
                                  "판매완료로 처리할까요?\n완료 후에는 목록에서 거래 종료로 보이고, 구매자 채팅이 제한됩니다."
                                )
                              ) {
                                return;
                              }
                              void persistListingStatus("done", { clearReservation: true });
                            }}
                          >
                            {listingStatusSaving ? "처리 중…" : "판매완료 처리"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={listingStatusSaving}
                            className="rounded-lg border-sky-500 bg-white text-sky-800 hover:bg-sky-50"
                            onClick={() => {
                              if (!window.confirm("다시 판매중으로 바꿀까요?")) {
                                return;
                              }
                              void persistListingStatus("open", { clearReservation: true });
                            }}
                          >
                            {listingStatusSaving ? "처리 중…" : "다시 판매중"}
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* 판매자 · 설명 · 신뢰도 (핵심 흐름 상단 고정) */}
            {(product.sellerId || product.userId) && (
              <div className="rounded-2xl border border-[#e5e5ea] bg-white px-4 py-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  판매자
                </p>
                <div className="mt-1 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold text-gray-900">
                      {sellerPublic?.nickname ||
                        (product as { sellerNickname?: string }).sellerNickname ||
                        "판매자"}
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                      {sellerTrustLoading ? (
                        <span className="text-gray-400">정보 불러오는 중…</span>
                      ) : sellerTrust ? (
                        <>
                          ⭐ {sellerTrust.score.toFixed(1)} · 거래{" "}
                          {sellerPublic?.successfulSales ?? 0}회
                        </>
                      ) : (
                        <>거래 {sellerPublic?.successfulSales ?? 0}회</>
                      )}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 shrink-0 rounded-xl px-3 text-[12px] font-semibold"
                    onClick={() => {
                      const sid = product.sellerId || product.userId;
                      if (sid) navigate(`/profile/${sid}`);
                    }}
                  >
                    프로필 보기 →
                  </Button>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-[#e5e5ea] bg-[#f9fafb] px-4 py-3.5">
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                상품 설명
              </h3>
              {!descriptionPlain ? (
                <p className="text-[13px] text-gray-500 sm:text-sm">상품 설명이 없습니다.</p>
              ) : descExpanded ? (
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-gray-800 sm:text-sm">
                  {descriptionPlain}
                </p>
              ) : descPreview.kind === "bullets" ? (
                <ul className="space-y-1.5 text-[13px] leading-relaxed text-gray-800 sm:text-sm">
                  {descPreview.items.map((line, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="shrink-0 text-gray-400">•</span>
                      <span className="min-w-0">{line.replace(/^•\s*/, "")}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-gray-800 sm:text-sm">
                  {descPreview.preview}
                </p>
              )}
              {showDescToggle ? (
                <button
                  type="button"
                  className="mt-3 text-sm font-bold text-[#0a84ff] hover:text-[#0062d6]"
                  onClick={() => setDescExpanded((v) => !v)}
                >
                  {descExpanded ? "접기" : "더 보기"}
                </button>
              ) : null}
            </div>

            {sellerTrust ? (
              <div
                className={`
                  mt-2 p-4 rounded-xl text-sm border
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
                <div className="mb-2">
                  <div className="text-xs uppercase tracking-wide opacity-70">
                    AI 판매자 분석
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-lg font-semibold">
                    <span>⭐</span>
                    {sellerTrust.score.toFixed(1)} / 5.0
                    <span className="text-xs font-medium opacity-90">
                      ({sellerTrust.label})
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-xs opacity-90 leading-relaxed">{sellerTrust.reason}</p>
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
                    추세: <span className="font-semibold">{safeText(futurePrice.trend)}</span>
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
                    <li key={`${safeText(c.name)}-${index}`} className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      {c.status === "있음" && (
                        <span className="text-green-600 dark:text-green-400 font-bold">✔</span>
                      )}
                      {c.status === "없음" && (
                        <span className="text-red-600 dark:text-red-400 font-bold">✖</span>
                      )}
                      {c.status === "판단불가" && (
                        <span className="text-gray-500 dark:text-gray-400 font-bold">?</span>
                      )}
                      <span className="flex-1">{safeText(c.name)}</span>
                      <span className={`text-xs ${
                        c.status === "있음" ? "text-green-600 dark:text-green-400" :
                        c.status === "없음" ? "text-red-600 dark:text-red-400" :
                        "text-gray-500 dark:text-gray-400"
                      }`}>
                        {safeText(c.status)}
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

          </div>

        </section>

      </main>

      {/* 하단 고정 CTA — BottomNav(z-50) 위에 올려 항상 보이게 */}
      <div
        className="sticky inset-x-0 bottom-16 z-[100] mt-auto shrink-0 border-t border-gray-200/90 bg-white/98 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur-md supports-[backdrop-filter]:bg-white/90"
        style={{
          paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0px))",
          paddingTop: "0.65rem",
        }}
      >
        <div className="mx-auto flex w-full max-w-[720px] items-center gap-2.5 px-4 sm:gap-3">
          <button
            type="button"
            onClick={handleToggleFavorite}
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-lg transition ${
              liked
                ? "border-red-200 bg-red-50 text-red-500"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
            aria-label={liked ? "찜 해제" : "찜하기"}
          >
            {liked ? "❤️" : "🤍"}
          </button>
          <Button
            type="button"
            disabled={isListingSold}
            className={`h-12 min-w-0 flex-1 rounded-2xl text-[15px] font-semibold shadow-none transition active:scale-[0.98] ${
              isListingSold
                ? "cursor-not-allowed bg-gray-300 text-gray-600 hover:bg-gray-300"
                : "bg-[#0a84ff] text-white hover:bg-[#0062d6]"
            }`}
            onClick={
              viewerIsListingOwner && !isListingSold
                ? () => navigate("/app/chats")
                : handleChat
            }
          >
            {isListingSold
              ? "판매 완료"
              : viewerIsListingOwner
                ? "💬 구매자 채팅 보기"
                : "💬 채팅하기"}
          </Button>
          <div className="hidden min-w-[4.5rem] shrink-0 text-right sm:block sm:min-w-[5.5rem]">
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
              가격
            </p>
            <p className="text-base font-extrabold leading-tight text-gray-900 sm:text-lg">
              {product.price != null
                ? `${product.price.toLocaleString()}원`
                : "미정"}
            </p>
          </div>
        </div>
        <div className="mx-auto mt-1 w-full max-w-[720px] px-4 text-center sm:hidden">
          <p className="text-xs font-semibold text-gray-900">
            {product.price != null
              ? `${product.price.toLocaleString()}원`
              : "가격 미정"}
          </p>
        </div>
        {viewerIsListingOwner && !isListingSold ? (
          <p className="mx-auto mt-1 w-full max-w-[720px] px-4 text-center text-[11px] text-gray-500">
            내가 올린 글이에요. 구매자 메시지는 위 버튼(채팅 목록) 또는 상단 알림에서 열 수 있어요.
          </p>
        ) : null}
        {listingStatus === "reserved" && !isListingSold ? (
          <p className="mx-auto mt-1 w-full max-w-[720px] px-4 text-center text-[11px] text-amber-800/90">
            예약 중인 상품이에요. 채팅으로 일정을 맞춰 보세요.
          </p>
        ) : null}
      </div>

      {/* 길찾기: 지도 앱 선택 (즉시 이동 없음) */}
      {showDirectionsSheet && (
        <div
          className="fixed inset-0 z-[200] flex flex-col justify-end bg-black/40"
          onClick={() => setShowDirectionsSheet(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setShowDirectionsSheet(false);
          }}
          role="presentation"
        >
          <div
            className="w-full rounded-t-2xl border-t border-gray-200 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-3 dark:border-gray-700 dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="길찾기 지도 선택"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-600" />
            <p className="mb-3 text-center text-sm font-semibold text-gray-900 dark:text-gray-100">
              열 지도를 선택하세요
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className="w-full rounded-xl bg-[#0a84ff] py-3 text-sm font-semibold text-white transition hover:bg-[#0062d6] active:scale-[0.98]"
                onClick={() => {
                  setShowDirectionsSheet(false);
                  launchGoogleDirections();
                }}
              >
                구글 지도
              </button>
              <button
                type="button"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 text-sm font-semibold text-gray-900 transition hover:bg-gray-100 active:scale-[0.98] dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700/80"
                onClick={() => {
                  const d = getDirectionsDestination();
                  if (!d || !product) {
                    setMapError("이 상품에는 위치 정보가 없습니다.");
                    setShowDirectionsSheet(false);
                    return;
                  }
                  setShowDirectionsSheet(false);
                  openKakaoDirectionsTo(d, product.name);
                }}
              >
                카카오맵
              </button>
              <button
                type="button"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 text-sm font-semibold text-gray-900 transition hover:bg-gray-100 active:scale-[0.98] dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700/80"
                onClick={() => {
                  const d = getDirectionsDestination();
                  if (!d || !product) {
                    setMapError("이 상품에는 위치 정보가 없습니다.");
                    setShowDirectionsSheet(false);
                    return;
                  }
                  setShowDirectionsSheet(false);
                  openNaverDirectionsTo(d, product.name);
                }}
              >
                네이버 지도
              </button>
              <button
                type="button"
                className="mt-1 w-full rounded-xl py-3 text-sm font-medium text-gray-600 transition hover:bg-gray-100 active:scale-[0.98] dark:text-gray-400 dark:hover:bg-gray-800"
                onClick={() => setShowDirectionsSheet(false)}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 지도 모달 (Google Maps) */}

      {showMap && (

        <div

          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/40 backdrop-blur-sm"

          onClick={() => setShowMap(false)}

        >

          <div

            className="bg-white w-[90%] max-w-[420px] rounded-2xl p-4 shadow-xl"

            onClick={(e) => e.stopPropagation()}

          >

            <h2 className="text-lg font-semibold mb-2">📍 상품 위치</h2>

            {getDirectionsDestination() ? (
              <>
                <div className="w-full h-60 rounded-xl overflow-hidden bg-gray-100">
                  <div ref={mapRef} className="w-full h-full" />
                </div>

                {mapError && <p className="mt-2 text-xs text-red-500">{mapError}</p>}

                {distanceKm !== null && (
                  <p className="mt-2 text-sm text-gray-700">
                    현재 위치에서 약{" "}
                    <span className="font-semibold">{distanceKm.toFixed(1)}km</span> 떨어져 있어요.
                  </p>
                )}

                <div className="mt-3 flex flex-col gap-2">
                  <Button
                    variant="outline"
                    className="w-full h-9 text-[13px]"
                    onClick={handleCalculateDistance}
                    disabled={distanceLoading}
                  >
                    {distanceLoading ? "📏 거리 계산 중..." : "📏 현재 위치와 거리 계산"}
                  </Button>

                  <Button
                    className="w-full h-9 text-[13px] bg-[#0a84ff] text-white hover:bg-[#0062d6]"
                    onClick={() => {
                      setShowMap(false);
                      setShowDirectionsSheet(true);
                    }}
                  >
                    🧭 길찾기 (지도 선택)
                  </Button>

                  <Button variant="outline" className="w-full h-9 text-[13px]" onClick={() => setShowMap(false)}>
                    닫기
                  </Button>
                </div>
              </>
            ) : (
              <div className="py-6 text-center">
                <div className="mb-3 text-4xl" aria-hidden>
                  📍
                </div>
                <p className="text-sm font-medium text-gray-800">
                  이 상품은 지도용 좌표(위·경도)가 등록되어 있지 않습니다.
                </p>
                <p className="mt-2 text-xs leading-relaxed text-gray-500">
                  주소만 표시된 경우 길찾기를 제공할 수 없어요. 판매자에게 직거래 장소를 문의해 보세요.
                </p>
                <Button className="mt-6 w-full h-10 text-sm" variant="outline" onClick={() => setShowMap(false)}>
                  닫기
                </Button>
              </div>
            )}

          </div>

        </div>

      )}

    </div>

  );

}
