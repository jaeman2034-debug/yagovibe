/**
 * 📍 Places 타입 정의
 */

export interface Place {
  name: string;
  address: string;
  rating: number;
  openNow: boolean | null;
  lat: number;
  lng: number;
  distanceMeters?: number; // optional (if you have origin)
  placeId?: string | null;
}
