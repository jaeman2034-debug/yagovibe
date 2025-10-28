// ✅ LocationService.ts - 위치 관련 유틸리티

export async function getCurrentPosition(): Promise<{ lat: number; lng: number }> {
    return new Promise((resolve) => {
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
