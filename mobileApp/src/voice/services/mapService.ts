/**
 * 🗺 Map Service
 * Google Maps 실행 서비스
 */

import { Linking } from 'react-native';

export interface MapFilters {
  openNow?: boolean;
  parking?: boolean;
  sort?: 'NEAREST' | 'BEST_RATED' | 'DEFAULT';
}

/**
 * Google Maps 검색 열기
 */
export function openGoogleMaps(query: string, filters?: MapFilters) {
  const hints: string[] = [];
  if (filters?.openNow) hints.push('지금 영업중');
  if (filters?.parking) hints.push('주차');
  if (filters?.sort === 'NEAREST') hints.push('가까운');
  if (filters?.sort === 'BEST_RATED') hints.push('평점 높은');

  const fullQuery = [query, ...hints].join(' ');
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    fullQuery
  )}`;
  Linking.openURL(url);
}

/**
 * Google Maps 길찾기 열기
 */
export function openGoogleMapsNavigate(dest: string, fallbackQuery?: string) {
  try {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
      dest
    )}`;
    Linking.openURL(url);
  } catch (error: any) {
    console.warn('⚠️ NAVIGATE 실패, SEARCH로 전환:', error);
    if (fallbackQuery) {
      openGoogleMaps(fallbackQuery);
    } else {
      const placeName = dest.split(',')[0].trim();
      openGoogleMaps(placeName);
    }
  }
}

/**
 * Ultimate Fallback
 */
export function ultimateFallback(text: string) {
  console.log('🛡️ Ultimate Fallback 실행:', text);
  const query = text
    .replace(/찾아줘|가줘|어디야|근처|위치|안내해줘|길찾기/g, '')
    .trim() || text;
  openGoogleMaps(query);
}
