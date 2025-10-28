// VoiceMapSearch.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { STTService } from "../services/STTService";
import { TTSService } from "../services/TTSService";
import { parseQuery } from "../services/NLUService";
import { analyze } from "../services/NLUService_AI";
import { getCurrentPosition } from "../utils/geo";
import { VoiceFeedback } from "../components/VoiceFeedback";

type GMap = any;
type LatLngLiteral = { lat: number; lng: number };
type Marker = any;
type AdvMarker = any;
type PlaceResult = any;

declare global {
    interface Window {
        google: any;
    }
}

const useAdvancedMarker = () =>
    !!(window.google as any)?.maps?.marker?.AdvancedMarkerElement;

export default function VoiceMapSearch() {
    const location = useLocation();
    const mapRef = useRef<HTMLDivElement>(null);
    const map = useRef<GMap | undefined>(undefined);
    const stt = useRef<STTService | undefined>(undefined);
    const tts = useRef(new TTSService());
    const currentMarker = useRef<Marker | AdvMarker | null>(null);
    const resultMarkers = useRef<(Marker | AdvMarker)[]>([]);
    const [isListening, setListening] = useState(false);
    const [status, setStatus] = useState("지도 준비 중…");
    const [lastText, setLastText] = useState("");
    const [currentIntent, setCurrentIntent] = useState<string>("");
    const [mapsError, setMapsError] = useState<string | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    /** Google Maps API 스크립트 로드 */
    useEffect(() => {
        // 이미 로드된 경우 중복 로드 방지
        if (window.google && window.google.maps) {
            setIsLoaded(true);
            return;
        }

        // InvalidKeyMapError 전역 핸들러 설정
        if (!(window as any).gm_authFailure) {
            (window as any).gm_authFailure = () => {
                console.error("❌ Google Maps API 인증 실패 (InvalidKeyMapError)");
                const errorEvent = new CustomEvent("googlemaps-error", {
                    detail: {
                        error: "InvalidKeyMapError",
                        message: "API 키가 유효하지 않거나 도메인 제한 설정 문제"
                    }
                });
                window.dispatchEvent(errorEvent);
            };
        }

        const scriptId = "google-maps-script";
        if (document.getElementById(scriptId)) {
            // 스크립트가 이미 추가되어 있으면 로드 완료 대기
            const checkInterval = setInterval(() => {
                if (window.google && window.google.maps) {
                    clearInterval(checkInterval);
                    setIsLoaded(true);
                }
            }, 100);

            // 5초 후 타임아웃
            setTimeout(() => {
                clearInterval(checkInterval);
            }, 5000);

            return () => clearInterval(checkInterval);
        }

        const script = document.createElement("script");
        script.id = scriptId;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY
            }&libraries=places,marker,geometry`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
            console.log("✅ Google Maps API 로드 완료!");
            setIsLoaded(true);
        };
        script.onerror = () => {
            console.error("❌ Google Maps API 스크립트 로드 실패");
            setMapsError("Google Maps API를 불러올 수 없습니다.");
            setStatus("API 로드 실패");
        };

        document.body.appendChild(script);
    }, []);

    /** 지도 초기화 (isLoaded와 mapRef가 준비된 후 실행) */
    useEffect(() => {
        if (!isLoaded || !mapRef.current) return;

        // 이미 지도가 초기화되어 있으면 스킵
        if (map.current) {
            console.log("✅ 지도가 이미 초기화되어 있습니다.");
            return;
        }

        // InvalidKeyMapError 전역 이벤트 리스너 등록
        const handleInvalidKeyError = (event: CustomEvent) => {
            const errorData = event.detail;
            if (errorData?.error === "InvalidKeyMapError" || errorData?.message?.includes("InvalidKey")) {
                console.error("❌ InvalidKeyMapError 감지됨");
                setMapsError(
                    "Google Maps API 키 오류 (InvalidKeyMapError)\n\n" +
                    "가능한 원인:\n" +
                    "1. API 키가 유효하지 않음\n" +
                    "2. Maps JavaScript API가 활성화되지 않음\n" +
                    "3. API 키의 도메인 제한 설정 문제\n" +
                    "   → https://localhost:5179/* 추가 필요\n" +
                    "   → http://localhost:5179/* 추가 필요\n" +
                    "4. 결제 계정 미연동\n\n" +
                    "Google Cloud Console > API 및 서비스 > 사용자 인증 정보"
                );
                setStatus("API 키 오류");
            }
        };

        window.addEventListener("googlemaps-error" as any, handleInvalidKeyError);

        try {
            console.log("🗺️ 지도 초기화 시작...");

            // 기본 좌표 (서울) - fallback
            const defaultCenter: LatLngLiteral = { lat: 37.5665, lng: 126.978 };

            // 지도 초기화 (mapId 제거 - AdvancedMarkerElement 사용 안 함)
            map.current = new window.google.maps.Map(mapRef.current, {
                center: defaultCenter,
                zoom: 13,
                gestureHandling: "greedy",
                clickableIcons: true,
                disableDefaultUI: false,
            });

            // 지도가 완전히 로드될 때까지 기다림 (idle 이벤트)
            window.google.maps.event.addListenerOnce(map.current, "idle", () => {
                console.log("✅ 지도 완전히 로드 완료!");
                setStatus("지도 준비 완료 ✅");
                setMapsError(null);

                // 위치 권한 요청
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        (pos) => {
                            if (!map.current) return;

                            const { latitude, longitude } = pos.coords;
                            const userLocation: LatLngLiteral = { lat: latitude, lng: longitude };

                            try {
                                map.current.setCenter(userLocation);
                                map.current.setZoom(15);

                                // AdvancedMarkerElement 사용 안 함 (기본 Marker만 사용 - 더 안정적)
                                currentMarker.current = new window.google.maps.Marker({
                                    position: userLocation,
                                    map: map.current,
                                    title: "현재 위치",
                                    icon: {
                                        path: window.google.maps.SymbolPath.CIRCLE,
                                        fillColor: "#4285F4",
                                        fillOpacity: 1,
                                        strokeColor: "#fff",
                                        strokeWeight: 2,
                                        scale: 6,
                                    },
                                });

                                setStatus("현재 위치 표시 완료 📍");
                            } catch (markerError: any) {
                                console.error("❌ 마커 생성 실패:", markerError);
                                // 마커 실패해도 지도는 유지
                                map.current.setCenter(userLocation);
                                map.current.setZoom(15);
                            }
                        },
                        () => {
                            console.warn("⚠️ 위치 접근 거부됨 — 기본 좌표로 표시");
                            // 위치 권한 거부 시에도 지도는 유지 (기본 좌표 사용)
                        }
                    );
                }
            });

            // 지도 로드 타임아웃 (5초)
            setTimeout(() => {
                if (map.current) {
                    const isMapReady = map.current.getBounds() !== null;
                    if (!isMapReady) {
                        console.warn("⚠️ 지도 로드 타임아웃 - API 키 문제 가능성");
                    }
                }
            }, 5000);

        } catch (mapError: any) {
            console.error("❌ 지도 초기화 실패:", mapError);
            const errorMsg = String(mapError?.message || mapError || "알 수 없는 오류");

            if (errorMsg.includes("InvalidKey") || errorMsg.includes("InvalidKeyMapError")) {
                const detailedError =
                    "Google Maps API 키 오류 (InvalidKeyMapError)\n\n" +
                    "가능한 원인:\n" +
                    "1. API 키가 유효하지 않음\n" +
                    "2. Maps JavaScript API가 활성화되지 않음\n" +
                    "3. API 키의 도메인 제한 설정 문제\n" +
                    "   → https://localhost:5179/* 추가 필요\n" +
                    "   → http://localhost:5179/* 추가 필요\n" +
                    "4. 결제 계정 미연동\n\n" +
                    "Google Cloud Console > API 및 서비스 > 사용자 인증 정보";

                setMapsError(detailedError);
                setStatus("지도 로드 실패: API 키 오류");
            } else {
                setMapsError(errorMsg);
                setStatus(`지도 로드 실패: ${errorMsg.split("\n")[0]}`);
            }
        }

        // cleanup
        return () => {
            window.removeEventListener("googlemaps-error" as any, handleInvalidKeyError);
        };
    }, [isLoaded]);

    /** STT 바인딩 */
    useEffect(() => {
        if (stt.current) return;
        stt.current = new STTService({
            onStart: () => {
                setStatus("듣고 있어요… 🎤");
                setListening(true);
            },
            onEnd: () => {
                setListening(false);
                setStatus("듣기 종료");
            },
            onInterim: (txt) => setLastText(txt),
            onResult: (txt) => {
                setLastText(txt);
                onUserQuery(txt);
            },
            onError: (err) => setStatus(`음성 인식 오류: ${err}`),
        });
    }, []);

    const clearMarkers = useCallback(() => {
        resultMarkers.current.forEach((m) => (m as any).map = null);
        resultMarkers.current = [];
    }, []);

    const setCurrentMarker = useCallback((pos: LatLngLiteral) => {
        if (!map.current) return;

        if (currentMarker.current) {
            (currentMarker.current as any).setMap(null);
            currentMarker.current = null;
        }

        // AdvancedMarkerElement 제거 - 기본 Marker만 사용 (안정성)
        try {
            currentMarker.current = new window.google.maps.Marker({
                position: pos,
                map: map.current,
                title: "현재 위치",
                icon: {
                    path: window.google.maps.SymbolPath.CIRCLE,
                    fillColor: "#4285F4",
                    fillOpacity: 1,
                    strokeColor: "#fff",
                    strokeWeight: 2,
                    scale: 6,
                },
            });
        } catch (error: any) {
            console.error("❌ 마커 생성 실패:", error);
        }
    }, []);

    /** 현재 위치로 이동 */
    const moveToCurrent = useCallback(async () => {
        if (!map.current) {
            setStatus("지도가 아직 준비되지 않았습니다.");
            return;
        }

        try {
            setStatus("현재 위치 확인 중…");
            const pos = await getCurrentPosition();
            const here: LatLngLiteral = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
            };
            setCurrentMarker(here);
            map.current.panTo(here);
            map.current.setZoom(15);
            setStatus("현재 위치 표시 완료 📍");
        } catch (e: any) {
            const errorMsg = e instanceof Error ? e.message : String(e || "알 수 없는 오류");
            setStatus(
                `위치 접근 실패: ${errorMsg}. (HTTPS 도메인/권한을 확인하세요)`
            );
        }
    }, [setCurrentMarker]);

    /** 검색 실행 */
    const performSearch = useCallback(
        async (q: string) => {
            if (!map.current) return;
            clearMarkers();

            const parsed = parseQuery(q);
            const svc = new window.google.maps.places.PlacesService(map.current);
            const bounds = new window.google.maps.LatLngBounds();

            const addMarker = (place: PlaceResult) => {
                if (!place.geometry?.location || !map.current) return;
                const pos = {
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng(),
                };
                bounds.extend(pos);

                try {
                    // AdvancedMarkerElement 제거 - 기본 Marker만 사용 (안정성)
                    const marker = new window.google.maps.Marker({
                        position: pos,
                        map: map.current,
                        title: place.name,
                    });

                    resultMarkers.current.push(marker as any);
                } catch (error: any) {
                    console.error("❌ 검색 결과 마커 생성 실패:", error);
                }
            };

            const finish = (results?: PlaceResult[]) => {
                if (!results || !results.length) {
                    setStatus("검색 결과가 없어요 😢");
                    tts.current.speak("검색 결과를 찾지 못했습니다.");
                    return;
                }
                results.forEach(addMarker);
                map.current!.fitBounds(bounds);
                setStatus(`검색 완료: ${results.length}개 결과 ✅`);
                tts.current.speak(`가장 가까운 곳은 ${results[0].name} 입니다`);
            };

            try {
                if (parsed.intent === "search_place") {
                    // 중심은 현 지도 중심 기준
                    const loc = map.current.getCenter()!;
                    const req: any = {
                        location: loc,
                        radius: 1000,
                        keyword: parsed.keyword,
                    };
                    svc.nearbySearch(req, (res: any, status: any) => {
                        if (status !== window.google.maps.places.PlacesServiceStatus.OK || !res) {
                            setStatus(`Places 오류: ${status}`);
                            tts.current.speak("검색 중 오류가 발생했습니다.");
                            return;
                        }
                        finish(res);
                    });
                } else {
                    const req: any = {
                        query: parsed.keyword,
                        bounds: map.current.getBounds() ?? undefined,
                    };
                    svc.textSearch(req, (res: any, status: any) => {
                        if (status !== window.google.maps.places.PlacesServiceStatus.OK || !res) {
                            setStatus(`Places 오류: ${status}`);
                            tts.current.speak("검색 중 오류가 발생했습니다.");
                            return;
                        }
                        finish(res);
                    });
                }
            } catch (e: any) {
                setStatus(`검색 실패: ${e?.message ?? e}`);
            }
        },
        [clearMarkers]
    );

    /** 🧠 AI 기반 음성 명령 처리 */
    const handleVoiceCommand = useCallback(async (text: string) => {
        try {
            const { intent } = await analyze(text);
            console.log("🎯 의도:", intent);
            setCurrentIntent(intent); // 의도 상태 업데이트

            switch (intent) {
                case "지도_이동":
                    // 이미 지도 페이지에 있으므로 효과만 안내
                    tts.current.speak("지도로 이동할게요.");
                    break;

                case "현재위치":
                    await moveToCurrent();
                    tts.current.speak("현재 위치로 이동합니다.");
                    break;

                case "근처_편의점":
                    await performSearch("편의점");
                    tts.current.speak("근처 편의점을 찾아드릴게요.");
                    break;

                case "근처_축구장":
                    await performSearch("축구장");
                    tts.current.speak("주변 축구장을 표시합니다.");
                    break;

                default:
                    tts.current.speak("명령을 이해하지 못했어요. 예: '근처 편의점', '현재 위치'");
                    break;
            }
        } catch (error) {
            console.error("❌ AI 명령 처리 실패:", error);
            setCurrentIntent("오류");
            tts.current.speak("명령 처리 중 오류가 발생했습니다.");
        }
    }, [moveToCurrent, performSearch]);

    /** 음성 인식 결과 처리 */
    const onUserQuery = useCallback(
        (txt: string) => {
            setStatus(`인식됨: "${txt}"`);
            handleVoiceCommand(txt); // AI 기반 명령 처리로 변경
        },
        [handleVoiceCommand]
    );

    const toggleMic = useCallback(() => {
        if (!stt.current) {
            setStatus("이 브라우저는 Web Speech API 미지원");
            return;
        }
        if (stt.current.isRunning()) stt.current.stop();
        else stt.current.start();
    }, []);

    /** 즉시 검색 처리 (App.tsx에서 전달된 immediateQuery) */
    useEffect(() => {
        const immediateQuery = location.state?.immediateQuery;
        if (immediateQuery && map.current) {
            console.log("🚀 즉시 검색 실행:", immediateQuery);
            setStatus(`즉시 검색: ${immediateQuery}`);
            performSearch(immediateQuery);
        }
    }, [location.state, performSearch]);

    return (
        <>
            <VoiceFeedback intent={currentIntent} />
            <div
                style={{
                    padding: 16,
                    display: "grid",
                    gridTemplateColumns: "360px 1fr",
                    gap: 24,
                }}
            >
                <div>
                    <h3>📍 AI 음성 기반 Google 지도</h3>
                    <div style={{ marginBottom: 8 }}>
                        <button onClick={toggleMic} style={{ marginRight: 8 }}>
                            {isListening ? "🎙️ 말하기 종료" : "🎤 AI 말하기 시작"}
                        </button>
                        <button onClick={moveToCurrent}>📌 현재 위치로 이동</button>
                    </div>

                    <div
                        ref={mapRef}
                        style={{
                            width: 360,
                            height: 480,
                            border: "1px solid #eaeaea",
                            borderRadius: 8,
                            overflow: "hidden",
                        }}
                    />

                    <div style={{ marginTop: 8, fontSize: 14 }}>
                        <div>상태: {status}</div>
                        {lastText && <div>인식 중: "{lastText}"</div>}
                        <div style={{ marginTop: 6, color: "#666" }}>
                            예) "근처 축구장 찾아줘", "가까운 카페", "서울역 편의점"
                        </div>
                        {mapsError ? (
                            <div style={{ marginTop: 6, color: "#ef4444", fontWeight: "bold", whiteSpace: "pre-wrap" }}>
                                ❌ {mapsError}
                            </div>
                        ) : map.current ? (
                            <div style={{ marginTop: 6, color: "#1a73e8" }}>
                                ✅ Google Maps 로딩 성공
                            </div>
                        ) : null}
                    </div>
                </div>

                <div>
                    <h4>🧠 동작 설명</h4>
                    <ol>
                        <li>"AI 말하기 시작"을 누르면 STT로 음성 인식</li>
                        <li>NLU로 의도 분석 → Nearby/Text 모드 결정</li>
                        <li>Google Places API로 검색</li>
                        <li>지도에 마커 표시 + 가장 가까운 1개 TTS 안내</li>
                    </ol>
                    <p>
                        위치 접근 실패 시, <b>HTTPS 도메인/권한</b>을 확인하세요. (localhost는 허용)
                    </p>
                </div>
            </div>
        </>
    );
}
