/**
 * 🔥 Firebase Geo 쿼리 유틸리티
 * 
 * Firestore는 위치 쿼리를 직접 지원하지 않으므로 GeoHash 전략 사용
 * geofire-common 라이브러리 활용
 */

import { 
  geohashForLocation, 
  geohashQueryBounds, 
  distanceBetween 
} from "geofire-common";
import { 
  collection, 
  query, 
  orderBy, 
  startAt, 
  endAt, 
  getDocs,
  QueryConstraint 
} from "firebase/firestore";
import type { Firestore } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { MarketProduct } from "@/types/market";

/**
 * ✅ GeoHash 생성
 * 상품 저장 시 자동으로 geohash 필드 추가
 * 
 * @param lat - 위도
 * @param lng - 경도
 * @returns GeoHash 문자열
 */
export function generateGeohash(lat: number, lng: number): string {
  return geohashForLocation([lat, lng]);
}

/**
 * ✅ 반경 기반 Geo 쿼리
 * 중심점과 반경(km) 기준으로 상품 조회
 * 
 * @param centerLat - 중심 위도
 * @param centerLng - 중심 경도
 * @param radiusKm - 반경 (km)
 * @param collectionName - 컬렉션 이름 (기본값: "market")
 * @returns Promise<MarketProduct[]>
 */
export async function queryProductsByRadius(
  centerLat: number,
  centerLng: number,
  radiusKm: number,
  collectionName: string = "market"
): Promise<MarketProduct[]> {
  try {
    // 🔥 GeoHash 쿼리 bounds 생성 (반경을 미터로 변환)
    const radiusInM = radiusKm * 1000;
    const bounds = geohashQueryBounds([centerLat, centerLng], radiusInM);

    // 🔥 여러 쿼리 병렬 실행 (GeoHash는 여러 범위로 나뉨)
    const promises = bounds.map((bound) => {
      const q = query(
        collection(db, collectionName),
        orderBy("geohash"),
        startAt(bound[0]),
        endAt(bound[1])
      );
      return getDocs(q);
    });

    // 🔥 모든 쿼리 결과 병합
    const snapshots = await Promise.all(promises);
    const matchingDocs: any[] = [];

    snapshots.forEach((snap) => {
      snap.forEach((doc) => {
        matchingDocs.push({ id: doc.id, ...doc.data() });
      });
    });

    // 🔥 GeoHash는 근사치이므로 실제 거리로 필터링 (정확도 보정)
    const filtered = matchingDocs.filter((doc) => {
      const lat = doc.latitude ?? doc.lat;
      const lng = doc.longitude ?? doc.lng;

      if (lat == null || lng == null) return false;
      if (typeof lat !== "number" || typeof lng !== "number") return false;
      if (Number.isNaN(lat) || Number.isNaN(lng)) return false;

      // 🔥 실제 거리 계산 (미터 단위)
      const distanceInM = distanceBetween(
        [centerLat, centerLng],
        [lat, lng]
      );

      // 🔥 반경 내에 있는지 확인 (미터 → km 변환)
      return distanceInM <= radiusInM;
    });

    console.log(`✅ [geoQuery] 반경 ${radiusKm}km 내 상품: ${filtered.length}개 (전체 ${matchingDocs.length}개 중)`);

    return filtered as MarketProduct[];
  } catch (error) {
    console.error("❌ [geoQuery] Geo 쿼리 실패:", error);
    return [];
  }
}

/**
 * ✅ Bounds 기반 Geo 쿼리
 * 지도 viewport bounds 기준으로 상품 조회
 * 
 * @param bounds - 지도 bounds { minLat, maxLat, minLng, maxLng }
 * @param collectionName - 컬렉션 이름 (기본값: "market")
 * @returns Promise<MarketProduct[]>
 */
export async function queryProductsByBounds(
  bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  },
  collectionName: string = "market"
): Promise<MarketProduct[]> {
  try {
    // 🔥 중심점과 반경 계산
    const centerLat = (bounds.minLat + bounds.maxLat) / 2;
    const centerLng = (bounds.minLng + bounds.maxLng) / 2;
    
    // 🔥 대각선 거리 계산 (최대 반경)
    const latDiff = bounds.maxLat - bounds.minLat;
    const lngDiff = bounds.maxLng - bounds.minLng;
    const radiusKm = Math.sqrt(latDiff ** 2 + lngDiff ** 2) * 111; // 대략적인 km 변환

    // 🔥 반경 쿼리로 가져온 후 bounds로 필터링
    const products = await queryProductsByRadius(
      centerLat,
      centerLng,
      radiusKm,
      collectionName
    );

    // 🔥 정확한 bounds 필터링
    const filtered = products.filter((product) => {
      const lat = product.latitude ?? (product as any).lat;
      const lng = product.longitude ?? (product as any).lng;

      if (lat == null || lng == null) return false;
      if (typeof lat !== "number" || typeof lng !== "number") return false;

      return (
        lat >= bounds.minLat &&
        lat <= bounds.maxLat &&
        lng >= bounds.minLng &&
        lng <= bounds.maxLng
      );
    });

    console.log(`✅ [geoQuery] Bounds 내 상품: ${filtered.length}개`);

    return filtered;
  } catch (error) {
    console.error("❌ [geoQuery] Bounds 쿼리 실패:", error);
    return [];
  }
}

/**
 * ✅ 상품 저장 시 GeoHash 자동 추가
 * 클라이언트에서 상품 저장 전에 호출
 * 
 * @param productData - 상품 데이터
 * @returns GeoHash가 추가된 상품 데이터
 */
export function addGeohashToProduct(productData: any): any {
  const lat = productData.latitude ?? productData.lat;
  const lng = productData.longitude ?? productData.lng;

  if (lat != null && lng != null && typeof lat === "number" && typeof lng === "number") {
    return {
      ...productData,
      geohash: generateGeohash(lat, lng),
    };
  }

  // 🔥 좌표가 없으면 geohash도 없음
  return productData;
}
