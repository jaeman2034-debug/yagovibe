/**
 * 🔥 v4 SEARCH ONLY: Text Search 함수
 * 검색 결과에서 name + geometry 확보
 */

import { normalizePlaces } from './placeNormalizer';

export async function textSearchPlaces(
  map: google.maps.Map,
  query: string
): Promise<import('@/types/search').PlaceLite[]> {
  if (!window.google?.places) {
    throw new Error('Google Places API not loaded');
  }

  const service = new window.google.maps.places.PlacesService(map);

  const res = await new Promise<google.maps.places.PlaceResult[]>((resolve, reject) => {
    service.textSearch({ query }, (results, status) => {
      if (status !== window.google.places.PlacesServiceStatus.OK || !results) {
        reject(new Error(`textSearch failed: ${status}`));
        return;
      }
      resolve(results);
    });
  });

  // ✅ 정규화 함수 사용 (name + geometry 확보)
  return normalizePlaces(res);
}
