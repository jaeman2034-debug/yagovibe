import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { logVoiceEvent, logPosition, logSearchResult } from "@/lib/logging";
import { loadGoogleMapsAPI } from "@/utils/googleMapsLoader";
// ✅ Google Maps API는 중앙 집중식 로더를 통해 로드합니다

declare global {
    interface Window {
        google: any;
    }
}

export default function VoiceMap() {
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
    const [isListening, setIsListening] = useState(false);
    const [mapsLoading, setMapsLoading] = useState(true);
    const [mapsError, setMapsError] = useState<string | null>(null);
    const navigate = useNavigate();

    // 지도 초기화 함수 (mapRef 기반으로 변경)
    const initMap = () => {
        if (!window.google || !window.google.maps || !window.google.maps.Map) {
            console.error("❌ Google Maps API가 로드되지 않았습니다.");
            setMapsError("Google Maps API가 로드되지 않았습니다.");
            return;
        }

        // mapRef 대신 getElementById 사용 (기존 코드와 호환)
        const mapElement = document.getElementById("map") as HTMLElement;

        if (!mapElement) {
            console.error("⚠️ 지도 컨테이너(#map)를 찾을 수 없습니다. DOM이 아직 준비되지 않았을 수 있습니다.");
            // 약간의 지연 후 재시도
            setTimeout(() => {
                const retryElement = document.getElementById("map") as HTMLElement;
                if (retryElement) {
                    initMap();
                } else {
                    setMapsError("지도 컨테이너 요소를 찾을 수 없습니다.");
                }
            }, 100);
            return;
        }

        if (!navigator.geolocation) {
            alert("위치 정보를 가져올 수 없습니다.");
            setMapsError("위치 정보를 지원하지 않는 브라우저입니다.");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                try {
                    const { latitude, longitude } = pos.coords;

                    const mapInstance = new window.google.maps.Map(mapElement, {
                        center: { lat: latitude, lng: longitude },
                        zoom: 15,
                    });

                    setMap(mapInstance);

                    new window.google.maps.Marker({
                        position: { lat: latitude, lng: longitude },
                        map: mapInstance,
                        title: "내 위치",
                    });

                    await logPosition({ lat: latitude, lng: longitude, note: "init" });
                    setMapsError(null);
                } catch (error) {
                    console.error("❌ 지도 초기화 오류:", error);
                    const errorMsg = error instanceof Error ? error.message : String(error);

                    if (errorMsg.includes("InvalidKey") || errorMsg.includes("InvalidKeyMapError")) {
                        setMapsError(
                            "Google Maps API 키 오류 (InvalidKeyMapError)\n\n" +
                            "Google Cloud Console에서 API 키 설정을 확인하세요."
                        );
                    } else {
                        setMapsError(errorMsg);
                    }
                }
            },
            (err) => {
                console.error("❌ 위치 오류:", err);
                setMapsError("위치 권한을 허용해주세요!");
                alert("위치 권한을 허용해주세요!");
            }
        );
    };

    // Google Maps API 로드 및 지도 초기화 (중앙 집중식 로더 사용)
    useEffect(() => {
        // React.StrictMode로 인한 이중 실행 방지
        let isMounted = true;

        setMapsLoading(true);
        setMapsError(null);

        // ✅ 중앙 집중식 로더 사용
        loadGoogleMapsAPI()
            .then(() => {
                if (!isMounted) return;

                console.log("✅ Google Maps API 로드 완료!");
                setMapsLoading(false);

                // 약간의 지연 후 초기화 (DOM 완전 준비 대기)
                setTimeout(() => {
                    if (isMounted) {
                        initMap();
                    }
                }, 100);
            })
            .catch((error) => {
                if (!isMounted) return;

                console.error("❌ Google Maps API 로드 실패:", error);
                setMapsLoading(false);
                setMapsError(error.message || "Google Maps API를 불러올 수 없습니다.");
            });

        // ✅ googlemaps-error 이벤트 리스너 추가 (InvalidKeyMapError 등 처리)
        const handleGoogleMapsError = (event: CustomEvent) => {
            const errorData = event.detail;
            console.error("❌ Google Maps API 오류:", errorData);

            if (isMounted) {
                setMapsLoading(false);

                // errorData.message가 있으면 우선 사용 (이미 상세 메시지가 포함됨)
                if (errorData.message) {
                    setMapsError(errorData.message);
                } else if (errorData.error) {
                    // error 타입에 따라 메시지 결정
                    const errorStr = String(errorData.error);
                    if (errorStr.includes("InvalidKeyMapError") || errorStr.includes("InvalidKey")) {
                        setMapsError(
                            "Google Maps API 키 오류 (InvalidKeyMapError)\n\n" +
                            "가능한 원인:\n" +
                            "1. API 키가 유효하지 않음\n" +
                            "2. Maps JavaScript API가 활성화되지 않음\n" +
                            "3. API 키의 도메인 제한 설정 문제\n" +
                            "4. 결제 계정 미연동\n\n" +
                            "Google Cloud Console에서 확인:\n" +
                            "- API 및 서비스 > 사용자 인증 정보 > API 키\n" +
                            "- 도메인 제한에 localhost:5179 포함 확인"
                        );
                    } else {
                        setMapsError(`Google Maps API 오류: ${errorStr}`);
                    }
                } else {
                    setMapsError("Google Maps API 오류가 발생했습니다.");
                }
            }
        };

        window.addEventListener("googlemaps-error", handleGoogleMapsError as EventListener);

        // cleanup 함수
        return () => {
            isMounted = false;
            window.removeEventListener("googlemaps-error", handleGoogleMapsError as EventListener);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 🎙️ 음성 인식 시작
    const handleVoiceCommand = () => {
        if (!("webkitSpeechRecognition" in window)) {
            alert("이 브라우저는 음성 인식을 지원하지 않습니다.");
            return;
        }
        const recognition = new window.webkitSpeechRecognition();
        recognition.lang = "ko-KR";
        recognition.start();
        setIsListening(true);
        console.log("🎙️ 음성 인식 시작");

        recognition.onresult = async (event: any) => {
            const transcript = event.results[0][0].transcript.trim();
            console.log("🗣️ 입력:", transcript);
            await processCommand(transcript);
        };

        recognition.onend = () => {
            setIsListening(false);
            console.log("🛑 음성 인식 종료");
        };
    };

    // 🧠 명령 처리
    const processCommand = async (text: string) => {
        const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
        if (!openaiKey) return patternBasedNLU(text); // fallback

        try {
            const res = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${openaiKey}`,
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                        {
                            role: "system",
                            content:
                                "너는 지도 제어 NLU야. 사용자의 말을 intent/action으로 해석해. 가능한 intent: 지도열기, 근처검색, 위치이동, 홈이동. 결과는 예: intent=근처검색 keyword=카페",
                        },
                        { role: "user", content: text },
                    ],
                }),
            });

            const data = await res.json();
            const msg = data.choices?.[0]?.message?.content || "";
            const intent = (msg.match(/intent=([^\s]+)/)?.[1] ?? "미확인") as string;
            const keyword =
                msg.match(/keyword=([^\s]+)/)?.[1] ??
                (text.match(/편의점|식당|카페|약국|병원/)?.[0] ?? "");

            console.log("🧠 GPT NLU:", msg);
            await routeByIntent({ intent, text, keyword });
        } catch (err) {
            console.error("GPT 오류:", err);
            patternBasedNLU(text);
        }
    };

    // 🎯 패턴 기반 NLU 확장 버전
    const patternBasedNLU = async (text: string) => {
        let intent: string = "미확인";
        let keyword = "";

        if (text.match(/지도|맵|열어|보여|띄워/)) intent = "지도열기";
        else if (text.match(/현재 위치|내 위치|지금 위치|위치 이동/)) intent = "위치이동";
        else if (text.match(/홈|처음|메인/)) intent = "홈이동";
        else if (text.match(/근처|주변|가까운/)) {
            intent = "근처검색";
            keyword =
                text.match(/편의점|식당|카페|약국|병원|마트|공원|주유소/)?.[0] ?? "편의점";
        }

        await routeByIntent({ intent, text, keyword });
    };

    // 🧭 Intent 실행
    const routeByIntent = async ({
        intent,
        text,
        keyword,
    }: {
        intent: string;
        text?: string;
        keyword?: string;
    }) => {
        switch (intent) {
            case "지도열기":
                speak("지도를 열게요.");
                await logVoiceEvent({ text, intent, action: "open_map" });
                navigate("/voice-map");
                break;
            case "위치이동":
                speak("현재 위치로 이동합니다.");
                await logVoiceEvent({ text, intent, action: "recenter" });
                recenterMap();
                break;
            case "근처검색":
                speak(`근처 ${keyword}를 찾아볼게요.`);
                await logVoiceEvent({ text, intent, keyword, action: "search" });
                searchNearby(keyword ?? "편의점");
                break;
            case "홈이동":
                speak("홈으로 이동할게요.");
                await logVoiceEvent({ text, intent, action: "go_home" });
                navigate("/");
                break;
            default:
                speak("명령을 이해하지 못했습니다.");
                await logVoiceEvent({ text, intent: "미확인", action: "none" });
        }
    };

    // 📍 현재 위치로 이동
    const recenterMap = () => {
        if (!navigator.geolocation || !map) return;
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords;
                map.panTo({ lat: latitude, lng: longitude });
                console.log("📍 위치 이동 완료");
                await logPosition({ lat: latitude, lng: longitude, note: "recenter" });
            },
            () => speak("위치를 불러올 수 없습니다.")
        );
    };

    // 🗺️ 주변 검색
    const searchNearby = (query: string) => {
        if (!map) return;
        const center = map.getCenter();
        const lat = center?.lat?.();
        const lng = center?.lng?.();
        const service = new window.google.maps.places.PlacesService(map);

        service.nearbySearch(
            { location: center, radius: 1000, keyword: query },
            async (results: any, status: any) => {
                if (status === window.google.maps.places.PlacesServiceStatus.OK) {
                    markers.forEach((m) => m.setMap(null));
                    const newMarkers = results.map((place: any) =>
                        new window.google.maps.Marker({
                            position: place.geometry.location,
                            map,
                            title: place.name,
                        })
                    );
                    setMarkers(newMarkers);
                    speak(`${results.length}개의 ${query}를 찾았습니다.`);
                    await logSearchResult({ keyword: query, lat, lng, resultCount: results.length });
                } else {
                    speak(`${query}를 찾지 못했습니다.`);
                }
            }
        );
    };

    // 🔊 음성 출력
    const speak = (text: string) => {
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = "ko-KR";
        window.speechSynthesis.speak(utter);
    };

    if (mapsLoading) {
        return (
            <section className="mx-auto w-full max-w-5xl rounded-2xl bg-white px-6 py-12 text-center shadow-md">
                <div className="mb-4 animate-spin text-4xl">⏳</div>
                <p className="text-gray-600">Google Maps API 로드 중...</p>
            </section>
        );
    }

    if (mapsError) {
        return (
            <section className="mx-auto w-full max-w-5xl rounded-2xl bg-white px-6 py-10 text-center shadow-md">
                <div className="mb-4 text-6xl">❌</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">지도를 불러올 수 없습니다</h2>
                <p className="text-gray-600 mb-4">{mapsError}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    새로고침
                </button>
                <div className="mt-4 text-sm text-gray-500">
                    <p>브라우저 콘솔에서 <code className="bg-gray-100 px-2 py-1 rounded">checkGoogleMapsEnv()</code>를 실행하여</p>
                    <p>Google Maps API 키 설정을 확인하세요.</p>
                </div>
            </section>
        );
    }

    return (
        <section className="mx-auto flex w-full max-w-5xl flex-col items-center rounded-2xl bg-white px-4 py-8 shadow-md">
            <h2 className="mb-4 text-lg font-bold">📍 AI 음성 기반 Google 지도</h2>
            <div className="w-full overflow-hidden rounded-2xl shadow-md">
                <div
                    id="map"
                    className="w-full"
                    style={{
                        width: "100%",
                        height: "70vh",
                        maxHeight: "600px",
                        borderRadius: "12px",
                        overflow: "hidden",
                    }}
                ></div>
            </div>
            <div className="mt-4 flex gap-2">
                <button
                    onClick={handleVoiceCommand}
                    className={`px-4 py-2 rounded-2xl text-white shadow ${isListening ? "bg-red-500" : "bg-blue-600"}`}
                >
                    {isListening ? "🎙️ 듣는 중..." : "🧠 AI 말하기 시작"}
                </button>
                <button
                    onClick={recenterMap}
                    className="px-4 py-2 rounded-2xl bg-gray-700 text-white shadow"
                >
                    📍 현재 위치로 이동
                </button>
            </div>
        </section>
    );
}
