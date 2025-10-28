// Kakao 지도 외부 링크로 검색 (메인 함수)
export async function executeMapAction(target: string) {
    console.log(`🗺️ Kakao 지도 검색 실행: ${target}`);
    const url = `https://map.kakao.com/?q=${encodeURIComponent(target)}`;
    window.open(url, "_blank");
}

// Google Maps 검색 (기존 함수)
export async function executeMapActionGoogle(map: google.maps.Map, type: string, target: string) {
    if (!map) return;

    // ✅ 안전하게 marker 네임스페이스 접근
    const markerModule = (google.maps as any).marker;
    const AdvancedMarker = markerModule?.AdvancedMarkerElement;

    if (!AdvancedMarker) {
        console.warn("⚠️ AdvancedMarkerElement is not available. Fallback to Marker.");
    }

    const MarkerClass = AdvancedMarker || google.maps.Marker;

    if (type === "move") {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ address: target }, (results, status) => {
            if (status === "OK" && results && results[0]) {
                const pos = results[0].geometry.location;
                map.setCenter(pos);

                new MarkerClass({
                    map,
                    position: pos,
                    title: target,
                });
            } else {
                alert(`'${target}' 위치를 찾을 수 없습니다.`);
            }
        });
    }

    if (type === "search") {
        const request = {
            textQuery: target,
            fields: ["displayName", "location"],
            locationBias: map.getCenter(),
            radius: 3000,
        };

        // ✅ 새로운 Places API v1 방식
        const { Place } = (google.maps as any).places;
        new Place({
            id: "search-service",
            request,
            callback: (results: any, status: any) => {
                if (status === "OK" && results?.length) {
                    results.forEach((place: any) => {
                        const pos = place.location;
                        new MarkerClass({
                            map,
                            position: pos,
                            title: place.displayName,
                        });
                    });
                } else {
                    alert(`'${target}' 관련 장소를 찾지 못했습니다.`);
                }
            },
        });
    }
}
