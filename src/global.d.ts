declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
        speechSynthesis: SpeechSynthesis;
        kakao: any;
        Capacitor?: {
            isNativePlatform: () => boolean;
            isNativePlatform?: boolean; // 속성으로도 접근 가능하도록
            getPlatform: () => string;
        };
    }

    // Global SpeechRecognition types
    const SpeechRecognition: any;
    interface SpeechRecognitionEvent {
        results: SpeechRecognitionResultList;
    }

    interface SpeechRecognitionResultList {
        length: number;
        item(index: number): SpeechRecognitionResult;
        [index: number]: SpeechRecognitionResult;
    }

    interface SpeechRecognitionResult {
        length: number;
        item(index: number): SpeechRecognitionAlternative;
        [index: number]: SpeechRecognitionAlternative;
        isFinal: boolean;
    }

    interface SpeechRecognitionAlternative {
        transcript: string;
        confidence: number;
    }
}

export { };
