/**
 * 🗺 Google Maps 연동
 * 음성 명령 결과로 Google Maps 실행
 */

import { Linking, Platform, Alert } from 'react-native';

/**
 * Google Maps 검색 URL 생성
 * @param query 검색어
 * @returns Google Maps URL
 */
function getGoogleMapsUrl(query: string): string {
  const encodedQuery = encodeURIComponent(query);
  return `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;
}

/**
 * Google Maps 앱 또는 웹에서 검색 실행
 * @param query 검색어 (예: "강남역 카페")
 */
export async function openGoogleMaps(query: string): Promise<void> {
  try {
    const url = getGoogleMapsUrl(query);
    
    // URL 열기 시도
    const canOpen = await Linking.canOpenURL(url);
    
    if (canOpen) {
      await Linking.openURL(url);
      console.log('🗺 Google Maps 열기 성공:', query);
    } else {
      Alert.alert('오류', 'Google Maps를 열 수 없습니다.');
    }
  } catch (error) {
    console.error('❌ Google Maps 열기 실패:', error);
    Alert.alert('오류', `지도를 열 수 없습니다: ${error}`);
  }
}
