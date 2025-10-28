import { useEffect, useState } from "react";

export default function FacilityMap() {
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        // Kakao Maps 로드 확인
        const checkKakaoLoaded = () => {
            if (window.kakao && window.kakao.maps) {
                setIsLoaded(true);
            } else {
                setTimeout(checkKakaoLoaded, 100);
            }
        };

        checkKakaoLoaded();

        if (!isLoaded) return;

        const mapContainer = document.getElementById("facility-map");
        if (!mapContainer || !window.kakao) return;

        const { kakao } = window;
        const options = {
            center: new kakao.maps.LatLng(37.5665, 126.9780),
            level: 4,
        };
        const map = new kakao.maps.Map(mapContainer, options);

        // 마커 추가
        const marker = new kakao.maps.Marker({
            position: new kakao.maps.LatLng(37.5665, 126.9780),
        });
        marker.setMap(map);

        // 커스텀 마커 이미지 (축구장 아이콘)
        const markerImageSrc = "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_red.png";
        const markerImageSize = new kakao.maps.Size(50, 50);
        const markerImageOptions = {
            offset: new kakao.maps.Point(25, 50)
        };
        const markerImage = new kakao.maps.MarkerImage(
            markerImageSrc,
            markerImageSize,
            markerImageOptions
        );
        marker.setImage(markerImage);

        // 인포윈도우
        const infoWindow = new kakao.maps.InfoWindow({
            content: '<div style="padding:10px;font-size:14px;">서울 중앙 체육시설</div>'
        });
        infoWindow.open(map, marker);

        // 마커 클릭 이벤트
        kakao.maps.event.addListener(marker, 'click', () => {
            infoWindow.open(map, marker);
        });
    }, [isLoaded]);

    return (
        <div className="space-y-4">
            <div
                id="facility-map"
                className="w-full h-[500px] rounded-2xl border border-gray-200 shadow-lg"
            />
            {!isLoaded && (
                <div className="text-center text-gray-500 py-8">
                    지도를 로딩 중입니다...
                </div>
            )}
        </div>
    );
}
