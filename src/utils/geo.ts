// geo.ts
export async function getCurrentPosition(): Promise<GeolocationPosition> {
    if (!("geolocation" in navigator)) {
        throw new Error("이 브라우저는 위치 정보를 지원하지 않습니다.");
    }
    return await new Promise((res, rej) => {
        navigator.geolocation.getCurrentPosition(res, (e) => rej(e), {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
        });
    });
}
