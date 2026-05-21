/**
 * 🔥 클러스터링 훅 (supercluster 기반)
 * 
 * 지도 줌 레벨과 viewport에 따라 마커를 클러스터링합니다.
 * 클러스터 클릭 시 자동 확대 기능을 제공합니다.
 */

import { useMemo } from "react";
import Supercluster from "supercluster";
import type { MarketProduct } from "@/types/market";

type ClusterPoint = {
  type: "Feature";
  properties: {
    id: string;
    cluster?: boolean;
    cluster_id?: number;
    point_count?: number;
    product?: MarketProduct;
  };
  geometry: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
  };
};

type BBox = [number, number, number, number]; // [west, south, east, north]

export function useClusters(
  products: MarketProduct[],
  zoom: number,
  bounds: google.maps.LatLngBounds | null
): {
  clusters: ClusterPoint[];
  index: Supercluster<{ id: string; product?: MarketProduct }>;
} {
  // 🔥 supercluster 인스턴스 생성
  const index = useMemo(() => {
    const sc = new Supercluster<{ id: string; product?: MarketProduct }>({
      radius: 60, // 클러스터 반경 (픽셀)
      maxZoom: 18, // 최대 줌 레벨
      minZoom: 0, // 최소 줌 레벨
      minPoints: 2, // 최소 포인트 수 (2개 이상이면 클러스터링)
    });

    // 🔥 상품을 GeoJSON Feature로 변환
    const points: ClusterPoint[] = products
      .filter((p) => {
        const lat = p.latitude != null ? Number(p.latitude) : null;
        const lng = p.longitude != null ? Number(p.longitude) : null;
        return (
          lat != null &&
          lng != null &&
          !Number.isNaN(lat) &&
          !Number.isNaN(lng) &&
          Number.isFinite(lat) &&
          Number.isFinite(lng)
        );
      })
      .map((product) => {
        const lat = Number(product.latitude);
        const lng = Number(product.longitude);
        return {
          type: "Feature" as const,
          properties: {
            id: product.id,
            product,
          },
          geometry: {
            type: "Point" as const,
            coordinates: [lng, lat] as [number, number],
          },
        };
      });

    sc.load(points);
    return sc;
  }, [products]);

  // 🔥 현재 viewport에 맞는 클러스터 가져오기
  const clusters = useMemo(() => {
    if (!bounds) return [];

    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const bbox: BBox = [sw.lng(), sw.lat(), ne.lng(), ne.lat()];

    return index.getClusters(bbox, Math.round(zoom));
  }, [index, bounds, zoom]);

  return { clusters, index };
}
