export type LocationSource = 'default' | 'geolocation' | 'map';
// 🔥 1단계: 위치 상태를 명확히 분리 (3단계 → 5단계)
export type LocationStatus = 'INIT' | 'REQUESTING' | 'READY' | 'DENIED' | 'ERROR';
export type LocationState = {
  lat: number;
  lng: number;
  accuracy?: number;
  updatedAt: number;
  source: LocationSource;
  status: LocationStatus;
};
