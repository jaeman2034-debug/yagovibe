// src/utils/formatDistance.ts
export function formatDistance(km: number | null | undefined): string {
  if (km == null || km === Infinity) return "위치 정보 없음";

  if (km < 1) {
    return `약 ${Math.round(km * 1000)}m`;
  }

  if (km < 20) {
    return `약 ${km.toFixed(1)}km`;
  }

  return `${Math.round(km)}km+`;
}

