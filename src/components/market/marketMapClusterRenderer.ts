import type { Cluster, ClusterStats, Renderer } from "@googlemaps/markerclusterer";

/**
 * 마켓 지도용 클러스터 마커 (숫자 라벨 + 다크 원형 — 기본 파란/빨 클러스터와 구분)
 */
export const marketMapClusterRenderer: Renderer = {
  render(cluster: Cluster, _stats: ClusterStats, _map: google.maps.Map) {
    const g = window.google?.maps;
    const count = cluster.count;
    const position = cluster.position;

    if (!g?.Marker) {
      return new google.maps.Marker({ position });
    }

    const scale = Math.min(46, 19 + count / 5);

    return new g.Marker({
      position,
      label: {
        text: String(count),
        color: "#ffffff",
        fontSize: "12px",
        fontWeight: "600",
      },
      icon: {
        path: g.SymbolPath.CIRCLE,
        fillColor: "#111827",
        fillOpacity: 0.92,
        strokeColor: "#ffffff",
        strokeWeight: 2,
        scale,
      },
      zIndex: 800 + Math.min(count, 120),
      opacity: 0.98,
    });
  },
};
