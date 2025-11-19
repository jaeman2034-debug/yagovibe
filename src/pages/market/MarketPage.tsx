// src/pages/market/MarketPage.tsx

import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, where, orderBy, limit, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ProductCard from "./ProductCard";
import { getDistanceKm } from "@/utils/geo";
import type { LatLng } from "@/utils/geo";
import type { MarketProduct } from "@/types/market";
import { parseMarketProduct } from "@/types/market";
import type { MarketSortMode } from "@/types/sort";
import { getSmartScore } from "@/utils/smartScore";
import { useUserLocation } from "@/hooks/useUserLocation";
import { getAddressFromLatLng } from "@/utils/getAddressFromLatLng";
import { formatDistance } from "@/utils/formatDistance";
import { getDongFromLatLng } from "@/utils/getDongFromLatLng";
import { useAuth } from "@/context/AuthProvider";

// 정렬 함수
function sortProducts(
  products: MarketProduct[],
  sortMode: MarketSortMode,
  userLoc?: LatLng
): MarketProduct[] {
  return [...products].sort((a, b) => {
    if (sortMode === "latest") {
      let aTime = 0;
      let bTime = 0;
      
      if (a.createdAt) {
        if (a.createdAt?.toDate && typeof a.createdAt.toDate === "function") {
          aTime = a.createdAt.toDate().getTime();
        } else if (typeof a.createdAt === "string") {
          aTime = new Date(a.createdAt).getTime();
        } else if (a.createdAt instanceof Date) {
          aTime = a.createdAt.getTime();
        }
      }
      
      if (b.createdAt) {
        if (b.createdAt?.toDate && typeof b.createdAt.toDate === "function") {
          bTime = b.createdAt.toDate().getTime();
        } else if (typeof b.createdAt === "string") {
          bTime = new Date(b.createdAt).getTime();
        } else if (b.createdAt instanceof Date) {
          bTime = b.createdAt.getTime();
        }
      }
      
      return bTime - aTime; // 최신순
    }

    if (sortMode === "nearest") {
      const da =
        userLoc && a.latitude != null && a.longitude != null
          ? getDistanceKm(userLoc, { lat: a.latitude, lng: a.longitude })
          : Number.POSITIVE_INFINITY;
      const db =
        userLoc && b.latitude != null && b.longitude != null
          ? getDistanceKm(userLoc, { lat: b.latitude, lng: b.longitude })
          : Number.POSITIVE_INFINITY;
      return da - db; // 가까운 순
    }

    // 스마트 추천
    if (sortMode === "smart") {
      const da =
        userLoc && a.latitude != null && a.longitude != null
          ? getDistanceKm(userLoc, { lat: a.latitude, lng: a.longitude })
          : null;
      const db =
        userLoc && b.latitude != null && b.longitude != null
          ? getDistanceKm(userLoc, { lat: b.latitude, lng: b.longitude })
          : null;
      const scoreA = getSmartScore(a, da);
      const scoreB = getSmartScore(b, db);
      return scoreB - scoreA; // 점수 높은 순
    }

    // AI 추천 피드 (recommended 모드는 이미 정렬된 상태로 받아오므로 여기서는 그대로 유지)
    if (sortMode === "recommended") {
      return 0; // 이미 AI가 정렬한 순서 유지
    }

    return 0;
  });
}

export default function MarketPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [products, setProducts] = useState<MarketProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<MarketSortMode>("latest");
  const [searchQuery, setSearchQuery] = useState(""); // 🔍 검색어 상태
  const [suggestions, setSuggestions] = useState<string[]>([]); // 🔍 검색어 추천 리스트
  const [loadingSuggest, setLoadingSuggest] = useState(false); // 🔍 추천어 로딩 상태
  const [showSuggestions, setShowSuggestions] = useState(false); // 🔍 추천어 표시 여부
  const [recommendedLoading, setRecommendedLoading] = useState(false); // 🔥 AI 추천 피드 로딩
  const [fixedQuery, setFixedQuery] = useState(""); // 🔍 오타 교정된 검색어
  const [aiSearchLoading, setAiSearchLoading] = useState(false); // 🔍 AI 검색 로딩
  const [useAISearch, setUseAISearch] = useState(false); // 🔍 AI 검색 사용 여부
  const { loc: userLoc } = useUserLocation();

  // lat,lng -> address 캐시 (API 호출 최소화)
  const addressCache = useRef<Map<string, string | null>>(new Map());
  // lat,lng -> dong 캐시 (Google Geocoding API)
  const dongCache = useRef<Map<string, string | null>>(new Map());
  const [productsWithAddress, setProductsWithAddress] = useState<MarketProduct[]>([]);

  // 행정동 자동 변환 함수
  async function fillDongNames(list: MarketProduct[]): Promise<MarketProduct[]> {
    const updated: MarketProduct[] = [];

    for (const item of list) {
      // latitude/longitude 또는 lat/lng 모두 체크 (숫자 변환 포함)
      // parseMarketProduct에서 이미 변환했지만, 혹시 모를 경우를 대비해 다시 체크
      let lat: number | null = null;
      let lng: number | null = null;

      // 1순위: MarketProduct의 latitude/longitude (이미 parseMarketProduct에서 변환됨)
      if (item.latitude != null && !Number.isNaN(item.latitude) && Number.isFinite(item.latitude)) {
        lat = typeof item.latitude === "number" ? item.latitude : Number(item.latitude);
      }
      
      if (item.longitude != null && !Number.isNaN(item.longitude) && Number.isFinite(item.longitude)) {
        lng = typeof item.longitude === "number" ? item.longitude : Number(item.longitude);
      }

      // 2순위: 원본 데이터에서 직접 모든 필드명 변형 체크 (혹시 parseMarketProduct에서 누락된 경우)
      if (lat == null || lng == null) {
        const rawItem = item as any;
        // lat 필드명 변형 모두 체크: lat, Lat, latitude, Latitude
        if (lat == null) {
          const latValue = rawItem.lat ?? rawItem.Lat ?? rawItem.latitude ?? rawItem.Latitude;
          if (latValue != null) {
            const parsedLat = typeof latValue === "number" ? latValue : Number(latValue);
            if (!Number.isNaN(parsedLat) && Number.isFinite(parsedLat)) {
              lat = parsedLat;
            }
          }
        }
        // lng 필드명 변형 모두 체크: lng, Lng, longitude, Longitude
        if (lng == null) {
          const lngValue = rawItem.lng ?? rawItem.Lng ?? rawItem.longitude ?? rawItem.Longitude;
          if (lngValue != null) {
            const parsedLng = typeof lngValue === "number" ? lngValue : Number(lngValue);
            if (!Number.isNaN(parsedLng) && Number.isFinite(parsedLng)) {
              lng = parsedLng;
            }
          }
        }
      }

      // 유효한 숫자인지 최종 확인
      if (
        lat == null ||
        lng == null ||
        Number.isNaN(lat) ||
        Number.isNaN(lng) ||
        !Number.isFinite(lat) ||
        !Number.isFinite(lng)
      ) {
        console.log(`[fillDongNames] 상품 ${item.id} 좌표 없음/무효:`, {
          name: item.name,
          latitude: item.latitude,
          longitude: item.longitude,
          lat: (item as any).lat,
          lng: (item as any).lng,
          parsedLat: lat,
          parsedLng: lng,
        });
        updated.push({ ...item, dong: null });
        continue;
      }

      // 캐시 확인
      const key = `${lat},${lng}`;
      const cached = dongCache.current.get(key);
      if (cached !== undefined) {
        updated.push({ ...item, dong: cached });
        continue;
      }

      // Google Geocoding API로 행정동 추출
      console.log(`[fillDongNames] 상품 ${item.id} 행정동 변환 중:`, { lat, lng, name: item.name });
      const dong = await getDongFromLatLng(lat, lng);
      console.log(`[fillDongNames] 상품 ${item.id} 행정동 결과:`, dong);
      dongCache.current.set(key, dong);
      updated.push({ ...item, dong });
    }

    return updated;
  }

  // 🔥 AI 추천 피드 로드
  useEffect(() => {
    if (sortMode !== "recommended" || !user) {
      return; // 추천 모드가 아니거나 로그인 안 했으면 스킵
    }

    async function loadRecommended() {
      setRecommendedLoading(true);
      setLoading(true);
      setError(null);

      try {
        // 1) 후보 상품 200개 로드
        const candidatesQuery = query(
          collection(db, "marketProducts"),
          orderBy("createdAt", "desc"),
          limit(200)
        );

        const candidatesSnap = await getDocs(candidatesQuery);
        const candidates = candidatesSnap.docs.map((docSnap) => {
          const parsed = parseMarketProduct(docSnap);
          return {
            id: parsed.id,
            ...parsed,
          };
        });

        if (candidates.length === 0) {
          setProducts([]);
          setRecommendedLoading(false);
          setLoading(false);
          return;
        }

        // 2) 사용자 프로필 정보 가져오기
        let userProfile: any = {
          uid: user.uid,
          interests: [],
          viewed: [],
          liked: [],
          categories: [],
          lat: userLoc?.lat || null,
          lng: userLoc?.lng || null,
        };

        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            userProfile = {
              ...userProfile,
              interests: Array.isArray(userData.interests) ? userData.interests : [],
              viewed: Array.isArray(userData.viewed) ? userData.viewed.slice(0, 10) : [],
              liked: Array.isArray(userData.liked) ? userData.liked.slice(0, 10) : [],
              categories: Array.isArray(userData.categories) ? userData.categories : [],
            };
          }
        } catch (userError) {
          console.warn("⚠️ 사용자 프로필 로드 실패 (기본값 사용):", userError);
        }

        // 3) AI 추천 API 호출
        const functionsOrigin = import.meta.env.VITE_FUNCTIONS_ORIGIN || 
          "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";

        const response = await fetch(
          `${functionsOrigin}/getRecommendedFeed`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user: userProfile,
              candidates: candidates,
            }),
          }
        );

        if (!response.ok) {
          throw new Error("AI 추천 서버 응답 오류");
        }

        const data = await response.json();
        const rankedIds = (data.feed || []).map((f: any) => f.id);

        // 4) AI가 정렬한 순서대로 상품 재배열
        const sortedProducts = rankedIds
          .map((id: string) => candidates.find((c) => c.id === id))
          .filter((p): p is MarketProduct => p !== undefined);

        // 5) 행정동 자동 변환
        const filled = await fillDongNames(sortedProducts);

        console.log(`🔥 AI 추천 피드: ${filled.length}개 상품 추천됨`);
        setProducts(filled);
      } catch (err: any) {
        console.error("🔥 AI 추천 피드 오류:", err);
        setError("AI 추천 피드를 불러오는 중 문제가 발생했습니다.");
        // Fallback: 최신순으로 표시
        const fallbackQuery = query(
          collection(db, "marketProducts"),
          orderBy("createdAt", "desc"),
          limit(30)
        );
        const fallbackSnap = await getDocs(fallbackQuery);
        const fallback = fallbackSnap.docs.map((docSnap) => parseMarketProduct(docSnap));
        const filled = await fillDongNames(fallback);
        setProducts(filled);
      } finally {
        setRecommendedLoading(false);
        setLoading(false);
      }
    }

    void loadRecommended();
  }, [sortMode, user, userLoc]);

  // 🔍 AI 검색 실행 (검색어 입력 시 자동 실행)
  useEffect(() => {
    if (sortMode === "recommended") {
      return; // 추천 모드는 별도 처리
    }

    if (!searchQuery.trim()) {
      setUseAISearch(false);
      setFixedQuery("");
      return; // 검색어가 없으면 AI 검색 안 함
    }

    // Debounce: 검색어 입력 후 500ms 후 AI 검색 실행
    const timer = setTimeout(() => {
      void handleAISearch(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, sortMode, userLoc]);

  // 1) Firestore에서 상품 목록 로드 + 행정동 자동 변환 (검색 포함)
  useEffect(() => {
    if (sortMode === "recommended") {
      return; // 추천 모드는 별도 처리
    }

    // AI 검색 사용 중이면 기존 로드 스킵
    if (useAISearch && searchQuery.trim()) {
      return;
    }

    async function load() {
      try {
        setLoading(true);
        setError(null);
        
        // 검색어가 있으면 keywordTokens로 필터링
        let q;
        if (searchQuery.trim()) {
          const token = searchQuery.trim().toLowerCase();
          q = query(
            collection(db, "marketProducts"),
            where("keywordTokens", "array-contains", token)
          );
        } else {
          // 검색어가 없으면 전체 로드
          q = query(collection(db, "marketProducts"));
        }
        
        const snap = await getDocs(q);
        let raw: MarketProduct[] = snap.docs.map((docSnap) => {
          const parsed = parseMarketProduct(docSnap);
          const rawData = docSnap.data();
          // 디버깅: 파싱된 데이터 확인
          console.log(`[MarketPage] 상품 ${parsed.id} 파싱 결과:`, {
            name: parsed.name,
            latitude: parsed.latitude,
            longitude: parsed.longitude,
            rawData: rawData,
          });
          // 실제 Firestore 원본 데이터를 한 줄로 출력 (첫 번째 상품만)
          if (snap.docs.indexOf(docSnap) === 0) {
            const rawJson = JSON.stringify({ id: docSnap.id, ...rawData, createdAt: rawData.createdAt?.toDate?.()?.toISOString() || rawData.createdAt || null });
            console.log(`📋 [실제 저장된 데이터 - 한 줄 버전] 상품 ${parsed.id}:`, rawJson);
            console.log(`📋 [실제 저장된 데이터 - 보기 좋은 버전] 상품 ${parsed.id}:`, JSON.stringify({ id: docSnap.id, ...rawData, createdAt: rawData.createdAt?.toDate?.()?.toISOString() || rawData.createdAt || null }, null, 2));
          }
          return parsed;
        });

        // 검색어가 있으면 searchText로 2차 필터링
        if (searchQuery.trim()) {
          const token = searchQuery.trim().toLowerCase();
          raw = raw.filter((p) => {
            const searchText = (p as any).searchText || 
                              `${p.name || ""} ${p.category || ""} ${p.description || ""}`.toLowerCase();
            return searchText.includes(token);
          });
        }
        
        console.log(`[MarketPage] 총 ${raw.length}개 상품 로드됨${searchQuery.trim() ? ` (검색: "${searchQuery}")` : ""}`);
        
        // 행정동 자동 변환
        const filled = await fillDongNames(raw);
        
        console.log(`[MarketPage] 행정동 변환 완료:`, filled.map(p => ({ id: p.id, name: p.name, dong: p.dong })));
        
        setProducts(filled);
      } catch (err) {
        console.error("상품 목록을 불러오는 중 오류:", err);
        setError("상품 목록을 불러오는 중 문제가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [searchQuery, sortMode, useAISearch]); // searchQuery, sortMode, useAISearch 변경 시 재로드

  // 🔍 검색어 추천 (Debounce 250ms)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(() => {
      fetchSuggestions(searchQuery);
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 🔍 검색어 추천 함수
  const fetchSuggestions = async (text: string) => {
    if (!text.trim() || text.trim().length < 1) {
      setSuggestions([]);
      return;
    }

    try {
      setLoadingSuggest(true);

      const functionsOrigin = import.meta.env.VITE_FUNCTIONS_ORIGIN || 
        "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";

      const response = await fetch(
        `${functionsOrigin}/getSearchSuggestions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: text }),
        }
      );

      if (!response.ok) {
        throw new Error("서버 응답 오류");
      }

      const data = await response.json();
      setSuggestions(data.suggestions || []);
      setShowSuggestions(true);
    } catch (error: any) {
      console.error("🔍 검색어 추천 오류:", error);
      setSuggestions([]);
    } finally {
      setLoadingSuggest(false);
    }
  };

  // 🔍 AI 검색 엔진 호출
  const handleAISearch = async (queryText: string) => {
    if (!queryText.trim()) {
      setUseAISearch(false);
      return;
    }

    try {
      setAiSearchLoading(true);
      setUseAISearch(true);
      setError(null);

      // 1) 후보 상품 200개 로드
      const candidatesQuery = query(
        collection(db, "marketProducts"),
        orderBy("createdAt", "desc"),
        limit(200)
      );

      const candidatesSnap = await getDocs(candidatesQuery);
      const candidates = candidatesSnap.docs.map((docSnap) => {
        const parsed = parseMarketProduct(docSnap);
        return {
          id: parsed.id,
          ...parsed,
        };
      });

      if (candidates.length === 0) {
        setProducts([]);
        setAiSearchLoading(false);
        return;
      }

      // 2) AI 검색 API 호출
      const functionsOrigin = import.meta.env.VITE_FUNCTIONS_ORIGIN || 
        "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";

      const response = await fetch(
        `${functionsOrigin}/searchProducts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: queryText,
            candidates: candidates,
            userLocation: userLoc ? { lat: userLoc.lat, lng: userLoc.lng } : null,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("AI 검색 서버 응답 오류");
      }

      const data = await response.json();
      
      // 3) 오타 교정된 검색어 표시
      if (data.fixedQuery && data.fixedQuery !== queryText.trim()) {
        setFixedQuery(data.fixedQuery);
      } else {
        setFixedQuery("");
      }

      // 4) 연관 검색어 업데이트
      if (data.suggestions && data.suggestions.length > 0) {
        setSuggestions(data.suggestions);
        setShowSuggestions(true);
      }

      // 5) AI가 정렬한 순서대로 상품 재배열
      const rankedIds = (data.ranked || []).map((r: any) => r.id);
      const sortedProducts = rankedIds
        .map((id: string) => candidates.find((c) => c.id === id))
        .filter((p): p is MarketProduct => p !== undefined);

      // 6) 행정동 자동 변환
      const filled = await fillDongNames(sortedProducts);

      console.log(`🔍 AI 검색 결과: ${filled.length}개 상품 (검색어: "${queryText}")`);
      setProducts(filled);
    } catch (err: any) {
      console.error("🔍 AI 검색 오류:", err);
      setError("AI 검색을 불러오는 중 문제가 발생했습니다.");
      setUseAISearch(false);
      // Fallback: 기존 검색 방식 사용
    } finally {
      setAiSearchLoading(false);
    }
  };

  // 2) 주소 변환 (Kakao API)
  useEffect(() => {
    if (!products || products.length === 0) {
      setProductsWithAddress([]);
      return;
    }

    const fetchAddresses = async () => {
      const updated = await Promise.all(
        products.map(async (p) => {
          // 기존 location/region이 있으면 우선 사용
          if (p.location || p.region) {
            return { ...p, address: p.location || p.region || null };
          }

          if (!p.latitude || !p.longitude) {
            return { ...p, address: null };
          }

          const key = `${p.latitude},${p.longitude}`;
          const cached = addressCache.current.get(key);
          if (cached !== undefined) {
            return { ...p, address: cached };
          }

          const addr = await getAddressFromLatLng(p.latitude, p.longitude);
          addressCache.current.set(key, addr);
          return { ...p, address: addr };
        })
      );

      setProductsWithAddress(updated);
    };

    void fetchAddresses();
  }, [products]);

  // 3) 상품별 거리 계산 (km) - 표시용
  const distanceById: Record<string, number | undefined> = useMemo(() => {
    if (!userLoc) return {};

    const map: Record<string, number> = {};
    for (const p of productsWithAddress) {
      if (p.latitude != null && p.longitude != null) {
        const lat = Number(p.latitude);
        const lng = Number(p.longitude);
        if (!Number.isNaN(lat) && !Number.isNaN(lng) && Number.isFinite(lat) && Number.isFinite(lng)) {
          const d = getDistanceKm(userLoc, { lat, lng });
          if (!Number.isNaN(d) && Number.isFinite(d)) {
            map[p.id] = d;
          }
        }
      }
    }
    return map;
  }, [productsWithAddress, userLoc]);

  // 4) 정렬 적용된 최종 리스트
  const sortedProducts = useMemo(
    () => sortProducts(productsWithAddress, sortMode, userLoc || undefined),
    [productsWithAddress, sortMode, userLoc]
  );

  return (
    <div className="content px-4 pb-24 pt-8">
      {/* 🔥 상품 등록 버튼 */}
      <div className="flex justify-end mb-4">
        <button
          className="px-4 py-2 rounded-xl bg-blue-500 text-white font-medium shadow-sm active:scale-95 transition hover:bg-blue-600"
          onClick={() => navigate("/app/market/create")}
        >
          + 상품 등록
        </button>
      </div>

      {/* 🔍 검색바 + AI 추천어 */}
      <div className="mb-4 relative">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
                setUseAISearch(false); // 검색어 변경 시 AI 검색 초기화
              }}
              onFocus={() => {
                if (suggestions.length > 0) {
                  setShowSuggestions(true);
                }
              }}
              onBlur={() => {
                // 클릭 이벤트가 먼저 발생하도록 약간의 지연
                setTimeout(() => setShowSuggestions(false), 200);
              }}
              onKeyPress={(e) => {
                if (e.key === "Enter" && searchQuery.trim()) {
                  void handleAISearch(searchQuery);
                }
              }}
              placeholder="상품명, 태그, 브랜드 검색... (AI 검색 자동 실행)"
              className="w-full rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSuggestions([]);
                  setShowSuggestions(false);
                  setFixedQuery("");
                  setUseAISearch(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs"
              >
                ✕
              </button>
            )}
          </div>
          {searchQuery.trim() && (
            <button
              onClick={() => void handleAISearch(searchQuery)}
              disabled={aiSearchLoading}
              className="px-4 py-2 rounded-xl text-sm bg-purple-600 text-white hover:bg-purple-700 active:scale-95 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
              {aiSearchLoading ? "🔍 검색 중..." : "🔍 AI 검색"}
            </button>
          )}
        </div>

        {/* 오타 교정 결과 표시 */}
        {fixedQuery && fixedQuery !== searchQuery.trim() && (
          <div className="mt-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg text-xs text-blue-700 dark:text-blue-300">
            💡 검색어 교정: "<span className="font-semibold">{searchQuery}</span>" → "<span className="font-semibold">{fixedQuery}</span>"
          </div>
        )}

        {/* 🔍 AI 추천 검색어 리스트 */}
        {showSuggestions && suggestions.length > 0 && (
          <ul className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-2 z-50 max-h-64 overflow-y-auto">
            {suggestions.map((word, index) => (
              <li
                key={`${word}-${index}`}
                onClick={() => {
                  setSearchQuery(word);
                  setSuggestions([]);
                  setShowSuggestions(false);
                  void handleAISearch(word);
                }}
                className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              >
                <span className="flex items-center gap-2">
                  <span className="text-blue-500">🔍</span>
                  {word}
                </span>
              </li>
            ))}
          </ul>
        )}

        {/* 로딩 표시 */}
        {(loadingSuggest || aiSearchLoading) && searchQuery.trim() && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-3 z-50">
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              {aiSearchLoading ? "🧠 AI가 의미 기반 검색 중..." : "AI가 검색어를 분석 중..."}
            </p>
          </div>
        )}
      </div>

      {/* AI 검색 사용 중 표시 */}
      {useAISearch && searchQuery.trim() && (
        <div className="mb-4 px-4 py-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg text-sm text-purple-700 dark:text-purple-300">
          🧠 AI 의미 기반 검색 활성화 (오타 교정, 의미 매칭, 하이브리드 스코어링)
        </div>
      )}

      {/* 상단 헤더 영역 */}
      <header className="flex flex-col gap-2 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold">🏟️ 스포츠 마켓</h1>
              <p className="text-sm text-slate-500">
                지금 등록된 최신 스포츠 용품을 둘러보세요.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSortMode("latest")}
                className={`rounded-full border px-3 py-1 text-sm ${
                  sortMode === "latest"
                    ? "border-blue-500 bg-blue-50 text-blue-600"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                최신순
              </button>
              <button
                type="button"
                onClick={() => {
                  if (userLoc) {
                    setSortMode("nearest");
                  }
                }}
                disabled={!userLoc}
                className={`rounded-full border px-3 py-1 text-sm ${
                  sortMode === "nearest"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                가까운순
              </button>
              <button
                type="button"
                onClick={() => setSortMode("smart")}
                className={`rounded-full border px-3 py-1 text-sm ${
                  sortMode === "smart"
                    ? "border-purple-500 bg-purple-50 text-purple-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                추천순
              </button>
              <button
                type="button"
                onClick={() => setSortMode("recommended")}
                disabled={!user}
                className={`rounded-full border px-3 py-1 text-sm ${
                  !user
                    ? "border-slate-200 text-slate-400 cursor-not-allowed opacity-50"
                    : sortMode === "recommended"
                    ? "border-gradient-to-r from-purple-500 to-pink-500 bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                🔥 AI 추천
              </button>
            </div>
      </header>

      {!userLoc && (sortMode === "nearest" || sortMode === "smart") && (
        <p className="mx-4 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-600">
          💡 현재 위치를 허용하면 가까운순/추천순 정렬이 더 정확해집니다.
        </p>
      )}

      {sortMode === "recommended" && !user && (
        <p className="mx-4 rounded-lg bg-yellow-50 px-3 py-2 text-xs text-yellow-600">
          🔥 AI 추천 피드를 사용하려면 로그인이 필요합니다.
        </p>
      )}

      {sortMode === "recommended" && recommendedLoading && (
        <div className="mx-4 mt-4 flex items-center justify-center gap-2 rounded-lg bg-purple-50 px-4 py-8 text-purple-600">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-500 border-t-transparent"></div>
          <span className="font-medium">🔥 AI가 맞춤 상품을 추천 중...</span>
        </div>
      )}

      {error && (
        <p className="mx-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {loading ? (
        <div className="mt-8 flex justify-center text-sm text-slate-500">
          상품을 불러오는 중입니다...
        </div>
      ) : sortedProducts.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-2 text-sm text-slate-500">
          <span>등록된 상품이 없습니다.</span>
          <span>오른쪽 아래의 마이크 버튼으로 처음 상품을 등록해 보세요.</span>
        </div>
      ) : (
        <div className="product-grid mt-2">
          {sortedProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              distanceKm={distanceById[product.id]}
              sortMode={sortMode}
            />
          ))}
        </div>
      )}
    </div>
  );
}
