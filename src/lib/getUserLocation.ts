/**
 * 🔥 사용자 현재 위치 획득 (실전 기준 - 실패 시 fallback)
 * 
 * 웹/모바일 모두 지원하는 위치 획득 함수
 */

export interface UserLocation {
  lat: number;
  lng: number;
}

// 🔥 개발용: 민락동 좌표 하드코딩 모드 (디버깅용)
// 환경 변수로 활성화: VITE_USE_HARDCODED_LOCATION=true
const USE_HARDCODED_LOCATION = import.meta.env.VITE_USE_HARDCODED_LOCATION === 'true';
const HARDCODED_LOCATION: UserLocation = { 
  lat: 37.742,  // 의정부시 민락동 용민로 420
  lng: 127.049 
};

/**
 * 사용자 현재 위치를 가져옵니다.
 * 
 * @returns Promise<{ lat: number; lng: number }>
 * @throws Error - Geolocation이 지원되지 않거나 사용자가 거부한 경우
 */
export function getUserLocation(): Promise<UserLocation> {
  // 🔥 개발용: 하드코딩 모드 활성화 시 즉시 반환
  if (USE_HARDCODED_LOCATION) {
    console.log('🔧 [개발 모드] 하드코딩된 위치 사용:', HARDCODED_LOCATION);
    return Promise.resolve(HARDCODED_LOCATION);
  }
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (err) => {
        // 🔥 TIMEOUT 에러 상세 로그
        if (err.code === 3) {
          console.error('❌ [Geolocation] TIMEOUT 발생:', {
            code: err.code,
            message: err.message,
            timeout: '15초 초과',
            tip: 'enableHighAccuracy: false로 변경하거나 timeout을 늘려보세요'
          });
        }
        reject(err);
      },
      {
        enableHighAccuracy: false, // 🔥 실내라면 false가 더 잘 잡힐 수 있음
        timeout: 10000,            // 🔥 10초로 설정 (TIMEOUT 방지)
        maximumAge: 60000          // 🔥 1분 이내의 과거 위치 정보 허용
      }
    );
  });
}
