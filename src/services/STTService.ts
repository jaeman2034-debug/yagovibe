// STTService.ts
export type STTCallbacks = {
    onResult?: (finalText: string) => void;
    onInterim?: (interimText: string) => void;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: string) => void;
};

export class STTService {
    private recog?: any;
    private running = false;
    private cbs: STTCallbacks = {};

    constructor(callbacks?: STTCallbacks) {
        this.cbs = callbacks ?? {};
        const SR: any =
            (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SR) {
            console.warn("Web Speech API: SpeechRecognition이 지원되지 않습니다.");
            return;
        }
        this.recog = new SR();
        this.recog.lang = "ko-KR";
        this.recog.continuous = false;
        this.recog.interimResults = true;

        this.recog.onstart = () => {
            this.running = true;
            this.cbs.onStart?.();
        };

        this.recog.onerror = (e: any) => {
            this.cbs.onError?.(e?.error ?? "unknown");
            this.stop();
        };

        this.recog.onend = () => {
            this.running = false;
            this.cbs.onEnd?.();
        };

        this.recog.onresult = (ev: any) => {
            let finalText = "";
            let interim = "";
            for (let i = ev.resultIndex || 0; i < ev.results.length; i++) {
                const res = ev.results[i];
                if (res.isFinal) finalText += res[0].transcript;
                else interim += res[0].transcript;
            }
            if (interim) this.cbs.onInterim?.(interim.trim());
            if (finalText) this.cbs.onResult?.(finalText.trim());
        };
    }

    start() {
        if (!this.recog) {
            this.cbs.onError?.("이 브라우저는 음성 인식을 지원하지 않습니다.");
            return;
        }
        if (this.running) return;
        this.recog.start();
    }

    stop() {
        if (!this.recog) return;
        try {
            this.recog.stop();
        } catch { }
    }

    isRunning() {
        return this.running;
    }
}

// 글로벌 STT 서비스
type RecognizeCb = (text: string) => void;
let callbacks: RecognizeCb[] = [];
let recognition: any | null = null;

export function onRecognized(cb: RecognizeCb) {
    callbacks.push(cb);
    return () => (callbacks = callbacks.filter((c) => c !== cb));
}

export function emitRecognized(text: string) {
    callbacks.forEach((cb) => cb(text));
}

export function initGlobalSTT() {
    if (recognition) return;
    // 브라우저 STT(Web Speech API)
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) return;
    recognition = new SR();
    recognition.lang = "ko-KR";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (e: any) => {
        const last = e.results[e.results.length - 1];
        const text = last[0].transcript.trim();
        emitRecognized(text);
    };
    recognition.onerror = () => { };
    recognition.onend = () => {
        try {
            recognition?.start();
        } catch { }
    };
    try {
        recognition.start();
    } catch { }
}
