export type GMap = google.maps.Map;
export type GMarker = google.maps.marker.AdvancedMarkerElement | google.maps.Marker;

/** Google Maps JS API 로드 확인 (중복 로드 방지) */
export async function waitForGoogleMaps(): Promise<void> {
    return new Promise((resolve) => {
        if (window.google && window.google.maps) {
            console.log("✅ Google Maps API 이미 로드됨");
            resolve();
            return;
        }

        console.log("⏳ Google Maps API 로드 대기 중...");
        const checkInterval = setInterval(() => {
            if (window.google && window.google.maps) {
                clearInterval(checkInterval);
                console.log("✅ Google Maps API 로드 완료");
                resolve();
            }
        }, 100);

        // 15초 후 타임아웃
        setTimeout(() => {
            clearInterval(checkInterval);
            console.warn("⚠️ Google Maps API 로드 타임아웃");
            resolve();
        }, 15000);
    });
}

/** 지도 생성 */
export function createMap(el: HTMLElement, center: google.maps.LatLngLiteral, zoom = 15): GMap {
    return new google.maps.Map(el, {
        center,
        zoom,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
    });
}

/** AdvancedMarkerElement 지원 시 사용, 없으면 기본 Marker */
export function addMarker(map: GMap, position: google.maps.LatLngLiteral, title?: string): GMarker {
    const hasAdvanced = (google.maps as any).marker?.AdvancedMarkerElement;
    if (hasAdvanced) {
        const marker = new (google.maps as any).marker.AdvancedMarkerElement({
            map,
            position,
            title,
        });
        return marker as GMarker;
    } else {
        const marker = new google.maps.Marker({
            map,
            position,
            title,
        });
        return marker as GMarker;
    }
}

/** PlacesService 텍스트검색 (안전한 PlacesService 생성) */
export function textSearch(map: GMap, query: string, location?: google.maps.LatLngLiteral, radius = 1500) {
    return new Promise<google.maps.places.PlaceResult[]>((resolve) => {
        // ✅ map이 로드되지 않았다면 빈 배열 반환
        if (!map) {
            console.warn("지도가 로드되지 않았습니다.");
            resolve([]);
            return;
        }

        try {
            const service = new google.maps.places.PlacesService(map);
            const request: google.maps.places.TextSearchRequest = {
                query,
                location: location ? new google.maps.LatLng(location) : undefined,
                radius,
            };

            service.textSearch(request, (results, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                    resolve(results);
                } else {
                    console.warn(`Places 검색 실패: ${status}`);
                    resolve([]);
                }
            });
        } catch (error) {
            console.error("PlacesService 생성 오류:", error);
            resolve([]);
        }
    });
}
