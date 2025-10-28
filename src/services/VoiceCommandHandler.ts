// import { analyzeIntent } from "@/services/NLUService";
// import { handleAICommand } from "@/services/VoiceAgentCore";

// IntentResult 타입을 직접 정의
type IntentResult = {
    intent: string;
    entities?: Record<string, string>;
    confidence?: number;
};

// analyzeIntent 함수 정의
const analyzeIntent = async (text: string): Promise<IntentResult> => {
    const normalized = text.toLowerCase();

    // 간단한 패턴 매칭
    if (normalized.includes("찾아") || normalized.includes("검색") || normalized.includes("주변")) {
        return {
            intent: "find_nearby",
            entities: { target: text.replace(/찾아|검색|주변|보여|줘/g, "").trim() || "편의점" }
        };
    }

    if (normalized.includes("이동") || normalized.includes("가기") || normalized.includes("가자")) {
        return {
            intent: "move_to",
            entities: { target: text.replace(/이동|가기|가자|으로|로/g, "").trim() || "서울" }
        };
    }

    if (normalized.includes("홈")) {
        return { intent: "go_home" };
    }

    return { intent: "unknown" };
};

// VoiceCommandHandler 클래스 정의
interface VoiceCommandHandlerOptions {
    onNavigation?: (target: string) => void;
    onSearch?: (keyword: string, location?: { lat: number; lng: number }) => void;
    onRecognizedText?: (text: string) => void;
    onError?: (error: string) => void;
    onSuccess?: (message: string) => void;
}

export class VoiceCommandHandler {
    private recognition: any;
    private isListening: boolean = false;
    private options: VoiceCommandHandlerOptions;

    constructor(options: VoiceCommandHandlerOptions = {}) {
        this.options = options;
        this.initSpeechRecognition();
    }

    private initSpeechRecognition() {
        if (!("webkitSpeechRecognition" in window)) {
            this.options.onError?.("이 브라우저는 음성 인식을 지원하지 않습니다 😢");
            return;
        }

        const SpeechRecognition = (window as any).webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.lang = "ko-KR";
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.maxAlternatives = 1;

        this.recognition.onstart = () => {
            this.isListening = true;
            console.log("🎙️ 음성 인식 시작됨");
        };

        this.recognition.onend = () => {
            this.isListening = false;
            console.log("🎙️ 음성 인식 종료됨");
        };

        this.recognition.onerror = (event: any) => {
            console.error("❌ 음성 인식 오류:", event.error);
            this.isListening = false;
            if (event.error === "not-allowed") {
                this.options.onError?.("마이크 권한이 거부되었습니다. 브라우저 설정에서 마이크를 허용해주세요.");
            } else {
                this.options.onError?.(`음성 인식 오류: ${event.error}`);
            }
        };

        this.recognition.onresult = async (event: any) => {
            const transcript = event.results[0][0].transcript.trim();
            console.log("🎯 인식된 명령:", transcript);
            this.options.onRecognizedText?.(transcript);
            this.handleVoiceCommand(transcript);
        };
    }

    private async handleVoiceCommand(command: string) {
        console.log("🎯 인식된 명령:", command);

        // 🧠 간단한 AI 시스템 사용 (지도가 있는 경우만)
        try {
            // 지도가 있는 경우 AI 시스템 사용
            if (this.options.onSearch) {
                // 간단한 키워드 추출
                const lowerCommand = command.toLowerCase();
                if (lowerCommand.includes("찾아") || lowerCommand.includes("검색")) {
                    const keyword = command.replace(/(찾아|검색|보여|줘)/g, "").trim() || "편의점";
                    this.speak(`${keyword}을 찾아드릴게요.`);
                    this.options.onSearch(keyword);
                    return;
                }
            }
        } catch (aiError) {
            console.warn("⚠️ AI 시스템 처리 실패, 기존 NLU로 대체:", aiError);
        }

        // 🔄 기존 NLU 시스템 (Fallback)
        const nlu: IntentResult = await analyzeIntent(command);
        console.log("🔍 NLU 분석 결과:", nlu);

        if (!nlu || nlu.intent === "unknown") {
            console.warn(`⚠️ "${command}" 명령을 이해하지 못했습니다.`);
            this.speak(`"${command}" 명령을 이해하지 못했습니다.`);
            this.options.onError?.(`"${command}" 명령을 이해하지 못했습니다.`);
            return;
        }

        switch (nlu.intent) {
            case "find_nearby":
                const keyword = nlu.entities?.target ?? "편의점";
                this.speak(`${keyword}을 찾아드릴게요.`);
                this.options.onSearch?.(keyword);
                break;

            case "move_to":
                const place = nlu.entities?.target ?? "서울";
                this.speak(`${place}로 이동합니다.`);

                // 페이지 이동 명령인지 확인
                if (place.includes("페이지") || place.includes("홈") || place.includes("지도")) {
                    if (place.includes("홈")) {
                        this.options.onNavigation?.("/");
                    } else if (place.includes("지도")) {
                        this.options.onNavigation?.("/voice-map");
                    } else {
                        // 일반적인 페이지 이동
                        this.options.onNavigation?.("/");
                    }
                } else {
                    // 지도에서 특정 장소로 이동
                    this.options.onSuccess?.(`${place}로 이동합니다.`);
                }
                break;

            case "go_home":
                this.speak("홈 페이지로 이동합니다.");
                this.options.onNavigation?.("/");
                break;

            case "go_map":
                this.speak("지도 페이지로 이동합니다.");
                this.options.onNavigation?.("/voice-map");
                break;

            case "search_place":
                const searchTarget = nlu.entities?.target ?? "장소";
                this.speak(`${searchTarget}을 검색합니다.`);
                this.options.onSearch?.(searchTarget);
                break;

            case "get_directions":
                const destination = nlu.entities?.destination ?? "목적지";
                this.speak(`${destination}까지 길찾기를 시작합니다.`);
                this.options.onSuccess?.(`${destination}까지 길찾기 기능은 준비 중입니다.`);
                break;

            case "zoom_in":
                this.speak("지도를 확대합니다.");
                this.options.onSuccess?.("지도 확대 기능은 준비 중입니다.");
                break;

            case "zoom_out":
                this.speak("지도를 축소합니다.");
                this.options.onSuccess?.("지도 축소 기능은 준비 중입니다.");
                break;

            case "get_location":
                this.speak("현재 위치를 확인합니다.");
                this.options.onSuccess?.("현재 위치 확인 기능은 준비 중입니다.");
                break;

            default:
                console.warn(`🚫 알 수 없는 명령: ${nlu.intent}`);
                this.speak(`이 명령은 아직 지원되지 않습니다.`);
                this.options.onError?.(`이 명령은 아직 지원되지 않습니다: ${nlu.intent}`);
        }
    }

    // ✅ TTS 음성 출력
    private speak(text: string) {
        if (!text) return;

        try {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = "ko-KR";
            utterance.rate = 1.5; // 최적 속도 설정
            utterance.pitch = 1.0;
            utterance.volume = 0.8;

            // 기존 음성 중지
            window.speechSynthesis.cancel();

            // 새 음성 재생
            window.speechSynthesis.speak(utterance);

            console.log("🔊 TTS:", text);
        } catch (error) {
            console.error("❌ TTS 오류:", error);
        }
    }

    startListening() {
        if (this.recognition) {
            try {
                this.recognition.start();
            } catch (e) {
                console.error("❌ 음성 인식 시작 실패:", e);
                this.options.onError?.("음성 인식 시작에 실패했습니다.");
                this.isListening = false;
            }
        }
    }

    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    }

    getListeningStatus(): boolean {
        return this.isListening;
    }

    destroy() {
        this.stopListening();
        if (this.recognition) {
            this.recognition.onresult = null;
            this.recognition.onend = null;
            this.recognition.onerror = null;
            this.recognition = null;
        }
    }
}

// 기존 함수도 유지 (호환성을 위해)
export async function handleVoiceCommand(command: string, map: google.maps.Map) {
    console.log("🎤 인식된 명령:", command);

    const nlu: IntentResult = await analyzeIntent(command);
    console.log("🔍 NLU 분석 결과:", nlu);

    if (!nlu || nlu.intent === "unknown") {
        console.warn(`⚠️ "${command}" 명령을 이해하지 못했습니다.`);
        alert(`명령을 이해하지 못했습니다: "${command}"`);
        return;
    }

    switch (nlu.intent) {
        case "find_nearby":
            const keyword = nlu.entities?.target ?? "편의점";
            searchNearby(map, keyword);
            break;

        case "move_to":
            const place = nlu.entities?.target ?? "서울";
            moveToPlace(map, place);
            break;

        default:
            console.warn(`🚫 알 수 없는 명령: ${nlu.intent}`);
            alert(`이 명령은 아직 지원되지 않습니다: ${nlu.intent}`);
    }
}

function searchNearby(map: google.maps.Map, keyword: string) {
    console.log(`📍 주변 검색 실행: ${keyword}`);
    const service = new google.maps.places.PlacesService(map);

    if (!map.getCenter()) {
        alert("현재 위치 정보를 찾을 수 없습니다.");
        return;
    }

    service.nearbySearch(
        {
            location: map.getCenter()!,
            radius: 1500,
            keyword,
        },
        (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                results.forEach((place) => {
                    if (!place.geometry || !place.geometry.location) return;
                    new google.maps.Marker({
                        position: place.geometry.location,
                        map,
                        title: place.name,
                    });
                });
            } else {
                console.warn(`검색 실패 (${status})`);
            }
        }
    );
}

function moveToPlace(map: google.maps.Map, place: string) {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: place }, (results, status) => {
        if (status === "OK" && results && results[0]) {
            map.setCenter(results[0].geometry.location);
            new google.maps.Marker({
                map,
                position: results[0].geometry.location,
            });
        } else {
            alert(`"${place}" 위치를 찾을 수 없습니다.`);
        }
    });
}
