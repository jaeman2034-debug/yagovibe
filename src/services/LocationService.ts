// ✅ LocationService.ts - 위치 관련 유틸리티

/**
 * 현재 위치 가져오기 (웹/모바일 앱 모두 지원)
 * 
 * 모바일 앱에서는 Capacitor Geolocation Plugin 사용
 * 웹에서는 HTML5 Geolocation API 사용
 */
export async function getCurrentPosition(): Promise<{ lat: number; lng: number }> {
  if (window.Capacitor?.isNativePlatform) {
    const { Geolocation } = await import("@capacitor/geolocation");
    const position = await Geolocation.getCurrentPosition();
    return {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    };
  } else {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        // 위치 서비스가 지원되지 않으면 서울 기본값 반환
        resolve({ lat: 37.5665, lng: 126.9780 });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          // 위치 접근 실패 시 서울 기본값 반환
          resolve({ lat: 37.5665, lng: 126.9780 });
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        }
      );
    });
  }
}
