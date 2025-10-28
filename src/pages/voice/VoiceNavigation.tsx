import { useEffect, useRef, useState } from "react";

export default function VoiceNavigation() {
    const mapRef = useRef<HTMLDivElement | null>(null);
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [destination, setDestination] = useState<string>("");
    const [recognizedText, setRecognizedText] = useState<string>("");

    // ✅ 음성 인식 시작
    const startListening = () => {
        if (!("webkitSpeechRecognition" in window)) {
            alert("이 브라우저는 음성 인식을 지원하지 않습니다.");
            return;
        }
        const recognition = new (window as any).webkitSpeechRecognition();
        recognition.lang = "ko-KR";
        recognition.interimResults = false;
        recognition.onstart = () => console.log("🎙 음성 인식 시작");
        recognition.onresult = (event: any) => {
            const text = event.results[0][0].transcript.trim();
            setRecognizedText(text);
            console.log("🎯 인식된 명령:", text);

            if (text.includes("길찾기") || text.includes("가자") || text.includes("안내")) {
                const dest = text.replace(/(길찾기|가자|안내|까지)/g, "").trim();
                setDestination(dest);
                getDirections(dest);
            } else if (text.includes("홈") || text.includes("메인")) {
                window.location.href = "/";
            } else {
                searchPlace(text);
            }
        };
        recognition.onerror = (e: any) => console.error("음성 인식 오류:", e);
        recognition.start();
    };

    // ✅ 지도 초기화
    useEffect(() => {
        const initMap = () => {
            const defaultCenter = { lat: 37.5665, lng: 126.9780 }; // 서울
            const m = new google.maps.Map(mapRef.current!, {
                zoom: 15,
                center: defaultCenter,
                mapId: "DEMO_MAP_ID", // ✅ 고급 마커 기능을 위한 mapId 추가
            });
            setMap(m);
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                    setCurrentLocation(loc);
                    new google.maps.Marker({ map: m, position: loc, title: "현재 위치" });
                    m.setCenter(loc);
                },
                (err) => console.warn("위치 접근 거부:", err)
            );
        };

        if (window.google) {
            initMap();
        } else {
            // Google Maps가 아직 로드되지 않았으면 잠시 후 다시 확인
            setTimeout(() => {
                if (window.google) {
                    initMap();
                }
            }, 100);
        }
    }, []);

    // ✅ 장소 검색 (음성 인식 시)
    const searchPlace = (keyword: string) => {
        if (!map) return;
        const service = new google.maps.places.PlacesService(map);
        const request = { query: keyword, fields: ["name", "geometry"] };
        service.findPlaceFromQuery(request, (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results && results[0]) {
                const place = results[0];
                if (place.geometry?.location) {
                    map.setCenter(place.geometry.location);
                    new google.maps.Marker({
                        map,
                        position: place.geometry.location,
                        title: place.name,
                    });
                }
            }
        });
    };

    // ✅ 경로 탐색 (Directions API)
    const getDirections = (dest: string) => {
        if (!map || !currentLocation) return;

        const directionsService = new google.maps.DirectionsService();
        const directionsRenderer = new google.maps.DirectionsRenderer();
        directionsRenderer.setMap(map);

        const request = {
            origin: currentLocation,
            destination: dest,
            travelMode: google.maps.TravelMode.DRIVING,
        };

        directionsService.route(request, (result, status) => {
            if (status === google.maps.DirectionsStatus.OK && result) {
                directionsRenderer.setDirections(result);
                const route = result.routes[0].legs[0];
                const distance = route.distance?.text || "알 수 없음";
                const duration = route.duration?.text || "알 수 없음";

                const message = `${dest}까지 ${distance}, 예상 소요시간은 ${duration}입니다.`;
                console.log("🗺️ 경로 탐색 성공:", message);
                speak(message);
            } else {
                speak("경로를 찾을 수 없습니다.");
            }
        });
    };

    // ✅ TTS 음성 안내
    const speak = (text: string) => {
        const synth = window.speechSynthesis;
        if (!synth) return alert("이 브라우저는 음성 안내를 지원하지 않습니다.");
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = "ko-KR";
        utter.rate = 1;
        synth.speak(utter);
    };

    return (
        <div style={{ padding: "10px", textAlign: "center" }}>
            <h2 className="text-2xl font-bold mb-2">🚗 AI 음성 내비게이션</h2>

            <button
                onClick={startListening}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
                🎤 {recognizedText ? "다시 말하기" : "말하기 시작"}
            </button>

            <div
                ref={mapRef}
                style={{
                    width: "100%",
                    height: "450px",
                    marginTop: "12px",
                    borderRadius: "10px",
                    overflow: "hidden",
                }}
            ></div>

            <p className="mt-3 text-gray-700">🎙 인식된 명령: {recognizedText || "—"}</p>
            <p className="text-gray-500">📍 목적지: {destination || "—"}</p>

            <button
                onClick={() => window.location.href = "/"}
                className="mt-4 bg-amber-500 text-black px-4 py-2 rounded hover:bg-amber-600"
            >
                🏠 홈으로
            </button>
        </div>
    );
}
