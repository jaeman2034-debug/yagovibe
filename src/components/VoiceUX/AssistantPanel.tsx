import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, Hand, Volume2, MapPin, Calendar } from 'lucide-react';
import { startSTT, synthTTS, detectGesture, synthTTSMultilingual, VADDetector } from '@/lib/voiceux/core';

/**
 * Step 71: Voice UX 2.0 Assistant Panel
 * Multi-Modal AI Extensions & Voice UX 2.0
 */
export default function AssistantPanel() {
    const [text, setText] = useState('');
    const [reply, setReply] = useState('');
    const [listening, setListening] = useState(false);
    const [gesture, setGesture] = useState<string | null>(null);
    const [context, setContext] = useState<any>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const vadRef = useRef<VADDetector | null>(null);

    useEffect(() => {
        // 카메라 초기화
        if (videoRef.current) {
            navigator.mediaDevices
                .getUserMedia({ video: true, audio: false })
                .then((stream) => {
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                        streamRef.current = stream;
                    }
                })
                .catch((error) => {
                    console.warn('카메라 접근 실패:', error);
                });
        }

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
            }
            if (vadRef.current) {
                vadRef.current.stop();
            }
        };
    }, []);

    // 제스처 감지 루프
    useEffect(() => {
        if (!videoRef.current || listening) return;

        const detectLoop = async () => {
            const detectedGesture = await detectGesture(videoRef.current);
            if (detectedGesture && detectedGesture !== gesture) {
                setGesture(detectedGesture);
            }
        };

        const interval = setInterval(detectLoop, 500); // 0.5초마다 체크
        return () => clearInterval(interval);
    }, [listening, gesture]);

    async function handleVoice() {
        try {
            setListening(true);
            setText('');
            setReply('');
            setGesture(null);

            // 음성 입력
            const spoken = await startSTT();
            setText(spoken);

            // 제스처 감지
            const detectedGesture = await detectGesture(videoRef.current);
            if (detectedGesture) {
                setGesture(detectedGesture);
            }

            // NLU 처리 (Step 52/58 연동)
            // Firebase Functions NLU 엔드포인트 사용
            const nluEndpoint = import.meta.env.VITE_NLU_ENDPOINT ||
                "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net/nluHandler";

            const contextData = {
                gesture: detectedGesture,
                location: await getCurrentLocation(),
                timestamp: new Date().toISOString(),
            };

            // NLU Handler 또는 GraphCopilot 엔진 호출
            const response = await fetch(nluEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: spoken,
                    context: contextData,
                }),
            }).catch(async () => {
                // Fallback: graphCopilot 시도
                return await fetch(`${functionsOrigin}/graphCopilot`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query: spoken,
                        context: contextData,
                    }),
                });
            });

            if (!response || !response.ok) {
                throw new Error('NLU 처리 실패');
            }

            const data = await response.json();
            
            // 응답 형식 정규화 (nluHandler vs graphCopilot)
            const replyText = data.reply || data.summary || data.result || data.action || '응답을 생성할 수 없습니다.';
            setReply(replyText);
            setContext({
                intent: data.intent || data.action || null,
                location: contextData.location,
                actions: data.actions || [],
                ...data.context,
            });

            // TTS 응답
            await synthTTSMultilingual(replyText);
        } catch (error) {
            console.error('음성 처리 오류:', error);
            setReply('오류가 발생했습니다. 다시 시도해주세요.');
        } finally {
            setListening(false);
        }
    }

    async function getCurrentLocation(): Promise<{ lat: number; lng: number } | null> {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                resolve(null);
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    });
                },
                () => {
                    resolve(null);
                }
            );
        });
    }

    return (
        <div className="p-4 space-y-4">
            <h2 className="text-xl font-bold">🎤 Voice UX 2.0 Assistant</h2>

            <div className="flex flex-col items-center gap-4">
                {/* 비디오 프리뷰 */}
                <Card className="w-full max-w-md">
                    <CardContent className="p-4">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-48 rounded-xl bg-muted object-cover"
                        />
                        {gesture && (
                            <div className="mt-2 flex items-center gap-2">
                                <Hand className="w-4 h-4" />
                                <Badge variant="secondary">제스처: {gesture}</Badge>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* 음성 입력 버튼 */}
                <Button
                    size="lg"
                    onClick={handleVoice}
                    disabled={listening}
                    className="w-full max-w-md"
                >
                    {listening ? (
                        <>
                            <Mic className="w-5 h-5 mr-2 animate-pulse" />
                            듣는 중...
                        </>
                    ) : (
                        <>
                            <Mic className="w-5 h-5 mr-2" />
                            말하기
                        </>
                    )}
                </Button>

                {/* 입력 텍스트 */}
                {text && (
                    <Card className="w-full max-w-md">
                        <CardContent className="p-4">
                            <div className="text-sm font-semibold mb-2">입력:</div>
                            <div className="text-muted-foreground">{text}</div>
                        </CardContent>
                    </Card>
                )}

                {/* 응답 */}
                {reply && (
                    <Card className="w-full max-w-md">
                        <CardContent className="p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="text-sm font-semibold">응답:</div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => synthTTSMultilingual(reply)}
                                >
                                    <Volume2 className="w-4 h-4 mr-1" />
                                    재생
                                </Button>
                            </div>
                            <div className="text-muted-foreground">{reply}</div>

                            {/* 컨텍스트 정보 */}
                            {context && (
                                <div className="pt-2 border-t space-y-1 text-xs text-muted-foreground">
                                    {context.intent && (
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline">의도: {context.intent}</Badge>
                                        </div>
                                    )}
                                    {context.location && (
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-3 h-3" />
                                            위치: {context.location.lat?.toFixed(4)}, {context.location.lng?.toFixed(4)}
                                        </div>
                                    )}
                                    {context.actions && context.actions.length > 0 && (
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-3 h-3" />
                                            액션: {context.actions.length}개
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}

