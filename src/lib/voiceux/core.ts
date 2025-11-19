/**
 * Step 71: Voice UX 2.0 Core Module
 * Multi-Modal AI Extensions & Voice UX 2.0
 */

/**
 * STT (Speech-to-Text) 시작
 */
export async function startSTT(): Promise<string> {
    try {
        // 마이크 권한 요청
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // AudioContext 생성
        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        source.connect(analyser);

        // VAD (Voice Activity Detection) - 간단한 구현
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        let isSpeaking = false;
        let silenceCount = 0;
        const silenceThreshold = 10; // 무음 감지 임계값
        
        // 음성 감지 루프
        const checkVoice = () => {
            analyser.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b) / bufferLength;
            
            if (average > 30) {
                isSpeaking = true;
                silenceCount = 0;
            } else {
                silenceCount++;
                if (silenceCount > silenceThreshold && isSpeaking) {
                    // 발화 종료
                    stream.getTracks().forEach(track => track.stop());
                    return;
                }
            }
            
            if (isSpeaking) {
                requestAnimationFrame(checkVoice);
            }
        };
        
        checkVoice();

        // 실제 STT는 외부 API 연동
        const functionsOrigin = import.meta.env.VITE_FUNCTIONS_ORIGIN || 
            "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";
        
        // TODO: 실제 오디오 스트림을 서버로 전송하는 로직
        // 현재는 Web Speech API 사용 (개발용)
        return new Promise((resolve, reject) => {
            if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
                // Web Speech API가 없으면 서버 API 호출
                fetch(`${functionsOrigin}/stt`, {
                    method: 'POST',
                    body: stream as any,
                })
                    .then(res => res.json())
                    .then(data => resolve(data.text || ''))
                    .catch(reject);
                return;
            }

            const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.lang = 'ko-KR';
            recognition.continuous = false;
            recognition.interimResults = false;

            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                stream.getTracks().forEach(track => track.stop());
                resolve(transcript);
            };

            recognition.onerror = (event: any) => {
                stream.getTracks().forEach(track => track.stop());
                reject(new Error(event.error));
            };

            recognition.start();
        });
    } catch (error) {
        console.error('STT 오류:', error);
        throw error;
    }
}

/**
 * TTS (Text-to-Speech) 합성
 */
export async function synthTTS(text: string, voice?: string): Promise<void> {
    try {
        const voiceProfile = voice || localStorage.getItem('tts.voice') || 'ko-KR-Standard-A';
        
        const functionsOrigin = import.meta.env.VITE_FUNCTIONS_ORIGIN || 
            "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";
        
        const response = await fetch(`${functionsOrigin}/tts?voice=${voiceProfile}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
        });

        if (!response.ok) {
            throw new Error('TTS 실패');
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        
        return new Promise((resolve, reject) => {
            audio.onended = () => {
                URL.revokeObjectURL(url);
                resolve();
            };
            audio.onerror = reject;
            audio.play();
        });
    } catch (error) {
        console.error('TTS 오류:', error);
        // Fallback: Web Speech API
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = voiceProfile?.split('-')[0] || 'ko';
            window.speechSynthesis.speak(utterance);
        }
    }
}

/**
 * 제스처 인식 (MediaPipe Hand Pose)
 * TensorFlow.js는 선택적 의존성 (패키지 미설치 시 null 반환)
 */
export async function detectGesture(video: HTMLVideoElement | null): Promise<string | null> {
    if (!video) return null;

    try {
        // TensorFlow.js Hand Pose 모델 로드 (동적 import, 선택적)
        const handposeModule = await import('@tensorflow-models/handpose').catch(() => null);
        if (!handposeModule) {
            // 패키지가 없으면 null 반환 (앱은 정상 작동)
            return null;
        }

        await import('@tensorflow/tfjs-backend-webgl').catch(() => {
            // WebGL 백엔드 실패 시 경고만
            console.warn('TensorFlow.js WebGL 백엔드 로드 실패');
        });

        const model = await handposeModule.load();
        const predictions = await model.estimateHands(video);

        if (predictions.length === 0) {
            return null;
        }

        const hand = predictions[0];
        
        // 손가락 위치 추출
        const indexFinger = hand.annotations?.indexFinger;
        if (!indexFinger || indexFinger.length < 4) {
            return null;
        }

        const [x, y, z] = indexFinger[3];
        
        // 제스처 판단
        if (y < 100) {
            return 'raise_hand'; // 손 들기
        }
        
        if (x < 50) {
            return 'point_left'; // 왼쪽 가리키기
        }
        
        if (x > 200) {
            return 'point_right'; // 오른쪽 가리키기
        }

        // 손가락 개수로 판단
        const fingers = hand.landmarks?.length || 0;
        if (fingers === 5) {
            return 'open_hand'; // 손 펼치기
        }

        return null;
    } catch (error) {
        // 패키지가 없거나 모델 로드 실패 시 null 반환 (앱은 정상 작동)
        console.warn('제스처 인식 오류 (MediaPipe 미설치 가능):', error);
        return null;
    }
}

/**
 * 언어 자동 감지
 */
export function detectLanguage(text: string): string {
    // 간단한 언어 감지 (한국어, 영어, 일본어)
    const koreanPattern = /[가-힣]/;
    const japanesePattern = /[ひらがなカタカナ一-龯]/;
    
    if (koreanPattern.test(text)) {
        return 'ko';
    } else if (japanesePattern.test(text)) {
        return 'ja';
    } else {
        return 'en';
    }
}

/**
 * 다국어 TTS 지원
 */
export async function synthTTSMultilingual(text: string): Promise<void> {
    const lang = detectLanguage(text);
    const voiceMap: Record<string, string> = {
        ko: 'ko-KR-Standard-A',
        en: 'en-US-Standard-A',
        ja: 'ja-JP-Standard-A',
    };
    
    const voice = voiceMap[lang] || 'ko-KR-Standard-A';
    await synthTTS(text, voice);
}

/**
 * VAD (Voice Activity Detection) - 음성 활동 감지
 */
export class VADDetector {
    private analyser: AnalyserNode | null = null;
    private stream: MediaStream | null = null;
    private isDetecting = false;

    async start(onVoiceStart: () => void, onVoiceEnd: () => void): Promise<void> {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const audioCtx = new AudioContext();
            const source = audioCtx.createMediaStreamSource(this.stream);
            this.analyser = audioCtx.createAnalyser();
            this.analyser.fftSize = 2048;
            source.connect(this.analyser);

            this.isDetecting = true;
            this.detectLoop(onVoiceStart, onVoiceEnd);
        } catch (error) {
            console.error('VAD 시작 오류:', error);
            throw error;
        }
    }

    private detectLoop(onVoiceStart: () => void, onVoiceEnd: () => void): void {
        if (!this.isDetecting || !this.analyser) {
            return;
        }

        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        this.analyser.getByteFrequencyData(dataArray);

        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        const threshold = 30;

        if (average > threshold) {
            onVoiceStart();
        } else {
            onVoiceEnd();
        }

        requestAnimationFrame(() => this.detectLoop(onVoiceStart, onVoiceEnd));
    }

    stop(): void {
        this.isDetecting = false;
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        this.analyser = null;
    }
}

